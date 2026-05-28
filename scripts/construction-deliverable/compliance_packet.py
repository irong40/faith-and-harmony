"""Assemble the per-visit compliance PDF.

Combines a generated cover page (site + flight log) with currently-valid
static compliance documents (Part 107 cert, aircraft registration, COI)
and the per-visit LAANC authorization screenshot.
"""
from __future__ import annotations

import argparse
import io
import os
import sys
import tempfile
from datetime import date
from pathlib import Path
from typing import Optional

from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.lib import colors
from supabase import Client, create_client


STORAGE_BUCKET = "deliverables"
COMPLIANCE_BUCKET = "compliance"  # static docs live here
LAANC_DEFAULT_BUCKET = "compliance"

PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".heic"}


def get_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def fetch_visit(sb: Client, visit_id: str) -> dict:
    return sb.table("site_visits").select("*").eq("id", visit_id).single().execute().data


def fetch_site(sb: Client, site_id: str) -> dict:
    return sb.table("construction_sites").select("*").eq("id", site_id).single().execute().data


def fetch_valid_compliance_docs(sb: Client) -> list[dict]:
    today = date.today().isoformat()
    res = sb.table("compliance_documents").select("*").execute()
    docs: list[dict] = []
    for row in res.data or []:
        if row.get("valid_until") and row["valid_until"] < today:
            continue
        docs.append(row)
    order = {"part107_cert": 0, "aircraft_registration": 1, "insurance_coi": 2}
    docs.sort(key=lambda d: order.get(d["document_type"], 99))
    return docs


def build_cover(site: dict, visit: dict, out_path: Path) -> Path:
    doc = SimpleDocTemplate(
        str(out_path), pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph(
            "<b>Sentinel Aerial Inspections — Flight Compliance Record</b>",
            styles["Title"],
        ),
        Spacer(1, 0.3 * inch),
        Paragraph(f"<b>Site:</b> {site.get('name','')}", styles["Normal"]),
        Paragraph(f"<b>Address:</b> {site.get('address','')}", styles["Normal"]),
        Paragraph(f"<b>Visit Number:</b> {visit.get('visit_number','')}", styles["Normal"]),
        Paragraph(f"<b>Visit Date:</b> {visit.get('visit_date','')}", styles["Normal"]),
        Spacer(1, 0.3 * inch),
        Paragraph("<b>Flight Log</b>", styles["Heading2"]),
    ]
    rows = [
        ["Date", visit.get("visit_date", "")],
        ["Start Time", visit.get("flight_start_time", "") or "—"],
        ["Duration (min)", visit.get("flight_duration_minutes", "") or "—"],
        ["Aircraft Serial", visit.get("aircraft_serial", "")],
        ["Pilot", visit.get("pilot_name", "")],
    ]
    table = Table(rows, colWidths=[2 * inch, 4 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(table)
    doc.build(story)
    return out_path


def storage_download(sb: Client, storage_path: str, default_bucket: str) -> Optional[bytes]:
    parts = storage_path.split("/", 1)
    if len(parts) == 2 and "/" in storage_path and parts[0] in (
        "compliance", "drone-assets", "drone_assets", "raw", "raw-uploads", "deliverables",
    ):
        bucket, path = parts[0], parts[1]
    else:
        bucket, path = default_bucket, storage_path
    try:
        return sb.storage.from_(bucket).download(path)
    except Exception as exc:
        print(f"WARN: download failed for {bucket}/{path}: {exc}", file=sys.stderr)
        return None


def image_bytes_to_pdf(data: bytes, out_path: Path) -> Path:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img.save(out_path, "PDF", resolution=150.0)
    return out_path


def merge_pdfs(parts: list[Path], out_path: Path) -> Path:
    writer = PdfWriter()
    for p in parts:
        try:
            reader = PdfReader(str(p))
            for page in reader.pages:
                writer.add_page(page)
        except Exception as exc:
            print(f"WARN: skipping unreadable PDF {p}: {exc}", file=sys.stderr)
    with out_path.open("wb") as fh:
        writer.write(fh)
    return out_path


def upload(sb: Client, local_path: Path, site_id: str, visit_id: str) -> str:
    remote_path = f"{site_id}/{visit_id}/compliance_packet.pdf"
    with local_path.open("rb") as fh:
        sb.storage.from_(STORAGE_BUCKET).upload(
            remote_path,
            fh.read(),
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )
    return f"{STORAGE_BUCKET}/{remote_path}"


def generate(site_id: str, visit_id: str, output_dir: Optional[Path] = None) -> Path:
    sb = get_client()
    site = fetch_site(sb, site_id)
    visit = fetch_visit(sb, visit_id)
    out_dir = output_dir or Path(tempfile.gettempdir()) / f"deliverable_{visit_id}"
    out_dir.mkdir(parents=True, exist_ok=True)

    cover_path = out_dir / "_cover.pdf"
    build_cover(site, visit, cover_path)
    parts: list[Path] = [cover_path]

    for doc in fetch_valid_compliance_docs(sb):
        data = storage_download(sb, doc["storage_path"], COMPLIANCE_BUCKET)
        if not data:
            continue
        ext = Path(doc["storage_path"]).suffix.lower()
        tmp = out_dir / f"_doc_{doc['id']}{ext}"
        tmp.write_bytes(data)
        if ext in PDF_EXTENSIONS:
            parts.append(tmp)
        elif ext in IMAGE_EXTENSIONS:
            pdf_path = tmp.with_suffix(".pdf")
            image_bytes_to_pdf(data, pdf_path)
            parts.append(pdf_path)
        else:
            print(f"WARN: skipping unsupported compliance doc type {ext}", file=sys.stderr)

    if visit.get("laanc_authorization"):
        data = storage_download(sb, visit["laanc_authorization"], LAANC_DEFAULT_BUCKET)
        if data:
            ext = Path(visit["laanc_authorization"]).suffix.lower()
            tmp = out_dir / f"_laanc{ext}"
            tmp.write_bytes(data)
            if ext in PDF_EXTENSIONS:
                parts.append(tmp)
            elif ext in IMAGE_EXTENSIONS:
                pdf_path = tmp.with_suffix(".pdf")
                image_bytes_to_pdf(data, pdf_path)
                parts.append(pdf_path)

    out_path = out_dir / "compliance_packet.pdf"
    merge_pdfs(parts, out_path)
    upload(sb, out_path, site_id, visit_id)
    print(f"compliance_packet: {out_path}")
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
