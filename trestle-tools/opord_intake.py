"""
Trestle - OPORD Intake (LOCAL Ollama parser, Flet-free)
=======================================================
Turns raw unstructured intake text into a 5-paragraph OPORD draft and writes it
to public.opord_proposals. Runs entirely on the local machine:

  * Drafting prose  -> local Ollama (mistral:7b, format=json)   [no cloud, no per-job cost]
  * Pricing/totals  -> pricing_core (deterministic Python)      [never the LLM]
  * Persistence     -> Supabase service-role client

No Flet, no Anthropic, no subscription in the job path. If Ollama is down,
ingest() raises and you can still create/edit proposals by hand in the editor.

Entry points:
  parse_intake(raw)            -> guardrailed OPORD dict
  ingest(raw, source, **meta)  -> inserts a draft, returns new id
  regenerate(proposal_id)      -> re-parses the stored raw_intake, updates the row
  serve(port)                  -> tiny stdlib HTTP endpoint for n8n / web form / Vapi

CLI:
  python opord_intake.py "Client needs a 250-acre roof thermal scan near Norfolk base next Tuesday"
  python opord_intake.py serve            # POST {raw_intake, source} with header x-sentinel-key
"""

import os
import re
import json
import urllib.request

from pricing_core import (
    AIRSPACE_FEES, PROCESSING_FEES, HALF_DAY_FACTOR, FULL_DAY_MIN,
    snap_day_rate, money, get_client, load_supabase_env,
)

PROPOSAL_BUCKET = os.environ.get("PROPOSAL_BUCKET", "generated-documents")
SIGNED_URL_TTL  = int(os.environ.get("PROPOSAL_URL_TTL", "604800"))  # 7 days

OLLAMA_URL     = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL   = os.environ.get("OPORD_MODEL", "mistral:7b")   # per standing rule: mistral:7b for format=json
OLLAMA_TIMEOUT = int(os.environ.get("OPORD_TIMEOUT", "180"))

TABLE  = "opord_proposals"
PHASES = ["Mobilize", "Capture", "Process", "Deliver"]

# Standard boilerplate used when the model leaves paragraph 5 empty (it is the same
# for every SAI mission, so a deterministic default is safer than a blank).
DEFAULT_COMMAND_SIGNAL = (
    "PIC Authority: Adam O. Pierce (FAA Part 107) retains final launch/recovery and go/no-go authority. "
    "Client POC: to be confirmed. Reporting: SITREP at mobilize, capture-complete, and delivery. "
    "Insurance: $1M aviation liability; certificate of insurance available on request."
)

SYSTEM_PROMPT = (
    "You are an FAA Part 107 drone operations planner for Sentinel Aerial Inspections "
    "(veteran-owned, Hampton Roads VA). Convert the client's RAW REQUEST into a US Army "
    "5-paragraph OPORD for a commercial drone proposal.\n"
    "Rules:\n"
    "- Write specific professional prose for situation, mission, execution.intent, "
    "execution.coordinating, sustainment, command_signal.\n"
    "- mission must be ONE sentence: who / what / when / where / why.\n"
    "- execution.phases MUST be exactly these 4 in order: Mobilize, Capture, Process, Deliver. "
    "Fill each phase's detail. Do not add or remove phases.\n"
    "- airspace_fee_type: near a military base/installation, towered airport, or controlled "
    "airspace -> \"laanc\". In or adjacent to restricted/prohibited/zero-grid airspace "
    "(e.g., directly at a Naval base) -> \"caps\". Otherwise -> \"none\".\n"
    "- processing_tier one of none|basic|pro|enterprise. Thermal/volumetric/3D analysis -> at least \"pro\".\n"
    "- If a header value is unknown, use null. Do NOT echo placeholder text like \"Client Name\".\n"
    "- Suggest pricing only; never compute totals.\n"
    "Return ONLY JSON with keys: header{client_name,project_location,proposal_date,pilot_in_command,"
    "aircraft}, situation, mission, execution{intent,phases[{phase,detail}],deliverables[],coordinating}, "
    "sustainment, command_signal, pricing_suggestion{day_rate,half_day,airspace_fee_type,processing_tier}."
)


# ---------------------------------------------------------------------------
# coercion helpers (small models return inconsistent shapes)
# ---------------------------------------------------------------------------
def _s(v):
    if v is None:
        return None
    if isinstance(v, str):
        return v.strip() or None
    if isinstance(v, (int, float, bool)):
        return str(v)
    if isinstance(v, list):
        return "; ".join(x for x in (_s(i) for i in v) if x) or None
    if isinstance(v, dict):
        return "; ".join(f"{k}: {x}" for k, x in ((k, _s(val)) for k, val in v.items()) if x) or None
    return str(v)


def _iso_date(v):
    if isinstance(v, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", v.strip()):
        return v.strip()
    return None


def _as_bool(v):
    if isinstance(v, str):
        return v.strip().lower() in ("true", "yes", "1", "y", "half", "half_day")
    return bool(v)


# --- deterministic pricing floors (do not trust the model to get these right) ---
_TIER_ORDER = ["none", "basic", "pro", "enterprise"]
# advanced analysis that always warrants >= Pro processing
_ADVANCED_KW = ("thermal", "volumetric", "stockpile", "photogrammetry", "lidar",
                "change detection", "3d", "3-d")
# controlled-airspace cues -> at least LAANC; restricted/zero-grid -> CAPS
_CONTROLLED_KW = ("naval", "navy", "air force", "afb", "military", "air base", "airport",
                  "airfield", "control tower", "class b", "class c", "class d")
_RESTRICTED_KW = ("restricted airspace", "prohibited", "zero grid", "zero-grid", "no-fly")


def _kw_hit(text, words):
    return any(re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", text) for w in words)


def _min_tier(current, floor):
    return current if _TIER_ORDER.index(current) >= _TIER_ORDER.index(floor) else floor


def apply_pricing_rules(raw: str, suggestion: dict) -> dict:
    """Enforce pricing floors from the raw intent in Python. The model may raise a tier,
    never drop below what the job obviously needs. Returns a new suggestion dict."""
    text = (raw or "").lower()
    sug = dict(suggestion)
    if _kw_hit(text, _ADVANCED_KW):
        sug["processing_tier"] = _min_tier(sug.get("processing_tier", "none"), "pro")
    if sug.get("airspace_fee_type", "none") == "none":
        if _kw_hit(text, _RESTRICTED_KW):
            sug["airspace_fee_type"] = "caps"
        elif _kw_hit(text, _CONTROLLED_KW):
            sug["airspace_fee_type"] = "laanc"
    return sug


# ---------------------------------------------------------------------------
# parse + guardrails
# ---------------------------------------------------------------------------
def _ollama_generate(raw: str, model: str = None) -> dict:
    body = json.dumps({
        "model": model or OLLAMA_MODEL, "format": "json", "stream": False,
        "options": {"temperature": 0.1},
        "prompt": SYSTEM_PROMPT + "\n\nRAW REQUEST:\n" + raw + "\n\nJSON:",
    }).encode()
    req = urllib.request.Request(OLLAMA_URL + "/api/generate", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
        out = json.load(resp)
    return json.loads(out["response"])


def _guardrail(parsed: dict) -> dict:
    parsed = dict(parsed) if isinstance(parsed, dict) else {}

    hdr = parsed.get("header") if isinstance(parsed.get("header"), dict) else {}
    if (_s(hdr.get("client_name")) or "").lower() in ("client name", "client", "name"):
        hdr["client_name"] = None
    parsed["header"] = hdr

    ex = parsed.get("execution") if isinstance(parsed.get("execution"), dict) else {}
    detail = {p.get("phase"): p.get("detail") for p in (ex.get("phases") or []) if isinstance(p, dict)}
    ex["phases"] = [{"phase": n, "detail": (_s(detail.get(n)) or "")} for n in PHASES]
    if not isinstance(ex.get("deliverables"), list):
        ex["deliverables"] = [d for d in [_s(ex.get("deliverables"))] if d]
    parsed["execution"] = ex

    ps = parsed.get("pricing_suggestion") if isinstance(parsed.get("pricing_suggestion"), dict) else {}
    if ps.get("airspace_fee_type") not in ("none", "laanc", "caps"):
        ps["airspace_fee_type"] = "none"
    if ps.get("processing_tier") not in ("none", "basic", "pro", "enterprise"):
        ps["processing_tier"] = "none"
    ps["day_rate"] = snap_day_rate(ps.get("day_rate"))
    ps["half_day"] = _as_bool(ps.get("half_day"))
    parsed["pricing_suggestion"] = ps
    return parsed


def parse_intake(raw: str, model: str = None) -> dict:
    """Raw text -> validated OPORD dict (LLM for prose, deterministic guardrails for structure).
    `model` overrides the default local model (e.g. 'qwen3:14b' for sharper prose)."""
    if not (raw or "").strip():
        raise ValueError("empty raw intake")
    parsed = _guardrail(_ollama_generate(raw, model=model))
    parsed["pricing_suggestion"] = apply_pricing_rules(raw, parsed["pricing_suggestion"])
    parsed["_generated_by"] = model or OLLAMA_MODEL
    return parsed


# ---------------------------------------------------------------------------
# deterministic pricing + rendering (NO LLM)
# ---------------------------------------------------------------------------
def compute_pricing(suggestion: dict) -> dict:
    day = snap_day_rate(suggestion.get("day_rate") or FULL_DAY_MIN)
    half = bool(suggestion.get("half_day"))
    af_type = suggestion.get("airspace_fee_type", "none")
    tier = suggestion.get("processing_tier", "none")
    field_charge = round(day * HALF_DAY_FACTOR, 2) if half else day
    airspace = AIRSPACE_FEES.get(af_type, 0.0)
    processing = PROCESSING_FEES.get(tier, 0.0)
    return {
        "day_rate": day, "half_day": half,
        "airspace_fee_type": af_type, "airspace_fee": airspace,
        "processing_tier": tier, "processing_fee": processing,
        "field_charge": field_charge,
        "total_investment": round(field_charge + airspace + processing, 2),
    }


def _render_execution(ex: dict) -> str:
    lines = []
    intent = _s(ex.get("intent"))
    if intent:
        lines += [f"Intent (End State): {intent}", ""]
    for i, p in enumerate(ex.get("phases", []), 1):
        lines.append(f"Phase {i} - {p.get('phase')}: {_s(p.get('detail')) or 'TBD'}")
    deliv = [d for d in (_s(x) for x in (ex.get('deliverables') or [])) if d]
    if deliv:
        lines += ["", "Deliverables: " + "; ".join(deliv)]
    coord = _s(ex.get("coordinating"))
    if coord:
        lines += ["", f"Coordinating Instructions: {coord}"]
    return "\n".join(lines)


def _render_sustainment(logistics, pricing: dict) -> str:
    af_label = {"none": None, "laanc": "LAANC authorization",
                "caps": "CAPS / Zero-Grid manual authorization"}[pricing["airspace_fee_type"]]
    rate_word = "Half Day Rate" if pricing["half_day"] else "Full Day Rate"
    inv = f"Investment: {rate_word} {money(pricing['field_charge'])}"
    if pricing["airspace_fee"]:
        inv += f" + {af_label} {money(pricing['airspace_fee'])}"
    if pricing["processing_fee"]:
        inv += f" + {pricing['processing_tier'].title()} data processing {money(pricing['processing_fee'])}"
    inv += "."
    parts = []
    if logistics:
        parts.append("Logistics: " + logistics)
    parts.append(inv)
    parts.append(f"Total Project Investment: {money(pricing['total_investment'])}.")
    return "\n\n".join(parts)


def build_opord_row(parsed: dict, raw: str, source: str) -> dict:
    hdr = parsed.get("header", {}) or {}
    ex = parsed.get("execution", {}) or {}
    pricing = compute_pricing(parsed.get("pricing_suggestion", {}) or {})
    location = _s(hdr.get("project_location"))
    return {
        "source": source,
        "raw_intake": raw,
        "title": f"Aerial Survey - {location}" if location else "Drone Proposal (draft)",
        "client_name": _s(hdr.get("client_name")),
        "project_location": location,
        "proposal_date": _iso_date(hdr.get("proposal_date")),
        "pilot_in_command": _s(hdr.get("pilot_in_command")) or "Adam O. Pierce (Part 107, PIC)",
        "aircraft": _s(hdr.get("aircraft")),
        "situation": _s(parsed.get("situation")),
        "mission": _s(parsed.get("mission")),
        "execution": _render_execution(ex),
        "sustainment": _render_sustainment(_s(parsed.get("sustainment")), pricing),
        "command_signal": _s(parsed.get("command_signal")) or DEFAULT_COMMAND_SIGNAL,
        "execution_phases": ex.get("phases", []),
        "deliverables": ex.get("deliverables", []),
        "day_rate": pricing["day_rate"], "half_day": pricing["half_day"],
        "airspace_fee_type": pricing["airspace_fee_type"], "airspace_fee": pricing["airspace_fee"],
        "processing_tier": pricing["processing_tier"], "processing_fee": pricing["processing_fee"],
        "total_investment": pricing["total_investment"],
        "status": "draft",
        "opord_json": parsed,
    }


_CONTENT_FIELDS = (
    "title", "client_name", "project_location", "proposal_date", "pilot_in_command", "aircraft",
    "situation", "mission", "execution", "sustainment", "command_signal",
    "execution_phases", "deliverables",
    "day_rate", "half_day", "airspace_fee_type", "airspace_fee",
    "processing_tier", "processing_fee", "total_investment", "opord_json",
)


# ---------------------------------------------------------------------------
# Supabase entry points
# ---------------------------------------------------------------------------
def ingest(raw: str, source: str = "manual", model: str = None, **meta) -> str:
    row = build_opord_row(parse_intake(raw, model=model), raw, source)
    row.update({k: v for k, v in meta.items() if v is not None})
    res = get_client().table(TABLE).insert(row).execute()
    return res.data[0]["id"] if getattr(res, "data", None) else None


def regenerate(proposal_id: str, model: str = None) -> str:
    sb = get_client()
    cur = sb.table(TABLE).select("raw_intake,source").eq("id", proposal_id).single().execute().data
    raw = cur.get("raw_intake") or ""
    row = build_opord_row(parse_intake(raw, model=model), raw, cur.get("source") or "manual")
    sb.table(TABLE).update({k: row[k] for k in _CONTENT_FIELDS}).eq("id", proposal_id).execute()
    return proposal_id


# ---------------------------------------------------------------------------
# Finalize -> client PDF (reportlab) -> Supabase Storage -> signed URL
# ---------------------------------------------------------------------------
def render_pdf_bytes(row: dict) -> bytes:
    """Render a client-facing OPORD proposal PDF. Internal cost data is never included."""
    import html
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    ss = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=ss["Title"], fontName="Times-Bold", fontSize=16)
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], fontName="Times-Bold", fontSize=12, spaceBefore=12, spaceAfter=2)
    body = ParagraphStyle("body", parent=ss["BodyText"], fontName="Times-Roman", fontSize=10.5, leading=15)

    def esc(t):
        return html.escape(t or "").replace("\n", "<br/>")

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.7 * inch, bottomMargin=0.7 * inch)
    flow = [Paragraph("OPERATIONS ORDER &mdash; PROJECT PROPOSAL", h1), Spacer(1, 6)]

    hdr = [["Client", row.get("client_name") or "", "Location", row.get("project_location") or ""],
           ["Date", str(row.get("proposal_date") or ""), "PIC", row.get("pilot_in_command") or ""],
           ["Aircraft", row.get("aircraft") or "", "", ""]]
    tbl = Table(hdr, colWidths=[0.9 * inch, 2.6 * inch, 0.9 * inch, 2.6 * inch])
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"), ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Times-Bold"), ("FONTNAME", (2, 0), (2, -1), "Times-Bold"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    flow += [tbl, Spacer(1, 8)]

    for title, txt in [("1. Situation", row.get("situation")),
                       ("2. Mission", row.get("mission")),
                       ("3. Execution", row.get("execution")),
                       ("4. Sustainment (Investment & Logistics)", row.get("sustainment")),
                       ("5. Command & Signal", row.get("command_signal"))]:
        flow.append(Paragraph(title, h2))
        flow.append(Paragraph(esc(txt), body))

    flow.append(Spacer(1, 12))
    flow.append(Paragraph(f"<b>Total Project Investment: {money(row.get('total_investment'))}</b>",
                          ParagraphStyle("tot", parent=body, fontSize=13)))
    flow.append(Spacer(1, 16))
    flow.append(Paragraph("Sentinel Aerial Inspections &mdash; Faith &amp; Harmony LLC &mdash; "
                          "Veteran Owned, Hampton Roads VA",
                          ParagraphStyle("foot", parent=body, fontSize=8, textColor=colors.grey)))
    doc.build(flow)
    return buf.getvalue()


def finalize(proposal_id: str, sign_ttl: int = None) -> str:
    """Render the PDF, upload to Supabase Storage, store a signed URL, mark finalized.
    Returns the signed download URL."""
    from datetime import datetime, timezone
    sb = get_client()
    row = sb.table(TABLE).select("*").eq("id", proposal_id).single().execute().data
    pdf = render_pdf_bytes(row)
    path = f"opord/{proposal_id}.pdf"
    store = sb.storage.from_(PROPOSAL_BUCKET)
    try:
        store.upload(path, pdf, {"content-type": "application/pdf", "upsert": "true"})
    except Exception:
        store.update(path, pdf, {"content-type": "application/pdf"})  # already exists
    signed = store.create_signed_url(path, sign_ttl or SIGNED_URL_TTL)
    url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("url")
    if url and url.startswith("/"):
        base, _ = load_supabase_env()
        url = base.rstrip("/") + url
    sb.table(TABLE).update({"status": "finalized", "pdf_url": url,
                            "finalized_at": datetime.now(timezone.utc).isoformat()}
                           ).eq("id", proposal_id).execute()
    return url


# ---------------------------------------------------------------------------
# tiny stdlib webhook server (n8n / web form / Vapi POST here)
# ---------------------------------------------------------------------------
def serve(host: str = "0.0.0.0", port: int = 8787):
    from http.server import BaseHTTPRequestHandler, HTTPServer
    secret = os.environ.get("SENTINEL_API_KEY", "")

    class Handler(BaseHTTPRequestHandler):
        def _json(self, code, obj):
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(obj).encode())

        def do_POST(self):
            if secret and self.headers.get("x-sentinel-key") != secret:
                return self._json(401, {"error": "unauthorized"})
            try:
                n = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(n) or b"{}")
                raw = data.get("raw_intake") or data.get("text") or ""
                pid = ingest(raw, data.get("source", "n8n_webhook"))
                self._json(200, {"proposal_id": pid})
            except Exception as ex:
                self._json(500, {"error": str(ex)})

        def log_message(self, *a):
            pass

    print(f"OPORD intake listening on http://{host}:{port}  (model={OLLAMA_MODEL})")
    HTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        serve()
    elif len(sys.argv) > 1:
        print(json.dumps(parse_intake(" ".join(sys.argv[1:])), indent=2))
    else:
        print("usage: python opord_intake.py 'raw intake text'   |   python opord_intake.py serve")
