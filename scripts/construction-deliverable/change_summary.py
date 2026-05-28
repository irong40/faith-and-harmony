"""Generate the AI change-summary bullets for a site visit.

For each cardinal direction (N,E,S,W), send the previous + current photo
to Claude for a 1-2 sentence per-direction observation. Then send the four
observations back to Claude for the final 3-5 bullet summary, written to
site_visits.change_summary and to a deliverables/.../change_summary.txt.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Optional

from anthropic import Anthropic
from PIL import Image
from supabase import Client, create_client


CARDINALS = ("N", "E", "S", "W")
MODEL = "claude-sonnet-4-20250514"
STORAGE_BUCKET = "deliverables"
MAX_IMAGE_EDGE = 1568  # Claude's recommended max for vision

PER_DIRECTION_PROMPT = (
    "You are a construction progress analyst reviewing aerial drone "
    "photography. Compare the two images: the first is from a previous "
    "site visit, the second is from the current visit. Both show the "
    "{direction} view of the construction site.\n\n"
    "Identify specific, visible changes: new structures, framing "
    "progress, roofing, grading, equipment presence, material staging, "
    "landscaping, or demolition. Be concrete. Do not speculate about "
    "work that is not visible. If no meaningful change is visible, say "
    "so.\n\n"
    "Respond with 1-2 sentences describing changes visible from this angle."
)

SUMMARY_PROMPT = (
    "You are writing a construction progress summary for a client "
    "deliverable. Below are observations from four cardinal directions "
    "comparing the current site visit to the previous one.\n\n"
    "{observations}\n\n"
    "Write exactly 3-5 bullet points summarizing the most significant "
    "visible changes across the entire site. Each bullet should be one "
    "sentence, concrete, and free of speculation. Use plain language "
    "suitable for a property owner or general contractor. Output only "
    "the bullets, each prefixed with '- '."
)


def get_supabase() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def get_anthropic() -> Anthropic:
    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def fetch_visit(sb: Client, visit_id: str) -> dict:
    return sb.table("site_visits").select("*").eq("id", visit_id).single().execute().data


def fetch_previous_visit(sb: Client, site_id: str, visit_number: int) -> Optional[dict]:
    res = (
        sb.table("site_visits").select("*")
        .eq("site_id", site_id)
        .lt("visit_number", visit_number)
        .order("visit_number", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def fetch_cardinal_assets(sb: Client, job_id: str) -> dict[str, dict]:
    res = (
        sb.table("drone_assets")
        .select("id,storage_path,cardinal_direction_tag")
        .eq("job_id", job_id)
        .in_("cardinal_direction_tag", list(CARDINALS))
        .execute()
    )
    by_dir: dict[str, dict] = {}
    for row in res.data or []:
        if row["cardinal_direction_tag"] not in by_dir:
            by_dir[row["cardinal_direction_tag"]] = row
    return by_dir


def download_b64(sb: Client, storage_path: str) -> Optional[str]:
    parts = storage_path.split("/", 1)
    if len(parts) == 2 and parts[0] in ("drone-assets", "drone_assets", "raw", "raw-uploads"):
        bucket, path = parts[0], parts[1]
    else:
        bucket, path = "drone-assets", storage_path
    try:
        data = sb.storage.from_(bucket).download(path)
    except Exception as exc:
        print(f"WARN: download failed for {bucket}/{path}: {exc}", file=sys.stderr)
        return None
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def observe_direction(
    client: Anthropic, direction: str, prev_b64: str, curr_b64: str
) -> str:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PER_DIRECTION_PROMPT.format(direction=direction)},
                    {"type": "image", "source": {
                        "type": "base64", "media_type": "image/jpeg", "data": prev_b64,
                    }},
                    {"type": "image", "source": {
                        "type": "base64", "media_type": "image/jpeg", "data": curr_b64,
                    }},
                ],
            }
        ],
    )
    return "".join(block.text for block in msg.content if block.type == "text").strip()


def summarize(client: Anthropic, observations: dict[str, str]) -> list[str]:
    obs_text = "\n".join(f"{d}: {t}" for d, t in observations.items() if t)
    msg = client.messages.create(
        model=MODEL,
        max_tokens=600,
        messages=[{"role": "user", "content": SUMMARY_PROMPT.format(observations=obs_text)}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    bullets: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith(("-", "•", "*")):
            bullets.append(line.lstrip("-•* ").strip())
    return bullets


def upload_text(sb: Client, local_path: Path, site_id: str, visit_id: str) -> str:
    remote_path = f"{site_id}/{visit_id}/change_summary.txt"
    with local_path.open("rb") as fh:
        sb.storage.from_(STORAGE_BUCKET).upload(
            remote_path,
            fh.read(),
            file_options={"content-type": "text/plain", "upsert": "true"},
        )
    return f"{STORAGE_BUCKET}/{remote_path}"


def generate(site_id: str, visit_id: str, output_dir: Optional[Path] = None) -> Path:
    sb = get_supabase()
    current = fetch_visit(sb, visit_id)
    previous = fetch_previous_visit(sb, site_id, current["visit_number"])
    out_dir = output_dir or Path(tempfile.gettempdir()) / f"deliverable_{visit_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "change_summary.txt"

    if not previous:
        bullets = ["Baseline visit — no prior data available for comparison."]
        observations: dict[str, str] = {}
    else:
        client = get_anthropic()
        cur_assets = fetch_cardinal_assets(sb, current["job_id"])
        prev_assets = fetch_cardinal_assets(sb, previous["job_id"])
        observations = {}
        for direction in CARDINALS:
            if direction not in cur_assets or direction not in prev_assets:
                continue
            prev_b64 = download_b64(sb, prev_assets[direction]["storage_path"])
            curr_b64 = download_b64(sb, cur_assets[direction]["storage_path"])
            if not prev_b64 or not curr_b64:
                continue
            try:
                observations[direction] = observe_direction(client, direction, prev_b64, curr_b64)
            except Exception as exc:
                print(f"WARN: per-direction call failed for {direction}: {exc}", file=sys.stderr)

        bullets = summarize(client, observations) if observations else [
            "No comparable cardinal photo pairs available — visual change summary skipped."
        ]

    out_path.write_text("\n".join(f"- {b}" for b in bullets), encoding="utf-8")

    sb.table("site_visits").update({
        "change_summary": {"bullets": bullets, "observations": observations}
    }).eq("id", visit_id).execute()

    upload_text(sb, out_path, site_id, visit_id)
    print(f"change_summary: {out_path}")
    print(json.dumps({"bullets": bullets}, indent=2))
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site_id", required=True)
    parser.add_argument("--visit_id", required=True)
    parser.add_argument("--output_dir", default=None)
    args = parser.parse_args()
    generate(
        args.site_id,
        args.visit_id,
        Path(args.output_dir) if args.output_dir else None,
    )


if __name__ == "__main__":
    main()
