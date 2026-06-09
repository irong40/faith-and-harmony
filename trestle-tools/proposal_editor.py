"""
Trestle - Automated OPORD Proposal Generator (Editor UI)
========================================================
Flet editor for AI-ingested proposals written in the US Army 5-paragraph
OPORD format.  Left column lists draft proposals from Supabase; the main
workspace is an editable form with live pricing calculators.

Reuses pricing constants + Supabase client from pricing_core.py, and the local
intake/finalize logic from opord_intake.py (keep all three in the same folder).

Backend table: public.opord_proposals  (migration: create_opord_proposals_table)
Intake:        local Ollama parse (opord_intake.py) -> insert. No cloud LLM.

Run:  pip install flet supabase
      python proposal_editor.py
"""

import flet as ft

# --- reuse the single source of truth from the Flet-free core ----------------
from pricing_core import (
    LAANC_FEE, CAPS_FEE, VALUE_TIERS,
    FULL_DAY_MIN, FULL_DAY_MAX, FULL_DAY_STEP, HALF_DAY_FACTOR,
    get_client as _get_client,
)

TABLE = "opord_proposals"

AIRSPACE_FEES = {"none": 0.0, "laanc": LAANC_FEE, "caps": CAPS_FEE}
AIRSPACE_LABELS = {"none": "None", "laanc": f"LAANC (+${LAANC_FEE:.0f})", "caps": f"CAPS / Zero-Grid (+${CAPS_FEE:.0f})"}
# VALUE_TIERS = [("Basic",800,desc),("Pro",1800,desc),("Enterprise",3500,desc)]
PROCESSING_FEES = {name.lower(): price for (name, price, _desc) in VALUE_TIERS}
PROCESSING_FEES["none"] = 0.0
PROCESSING_DESC = {name.lower(): desc for (name, _p, desc) in VALUE_TIERS}


def money(v) -> str:
    try:
        return f"${float(v):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def day_rate_steps():
    steps, r = [], FULL_DAY_MIN
    while r <= FULL_DAY_MAX:
        steps.append(r)
        r += FULL_DAY_STEP
    return steps


class ProposalEditor:
    def __init__(self, page: ft.Page):
        self.page = page
        self.current_id = None

        # ---- LEFT: draft list ----------------------------------------------
        self.draft_list = ft.ListView(expand=True, spacing=4, padding=4)
        self.left = ft.Container(
            width=300,
            content=ft.Column([
                ft.Row([ft.Text("Draft Proposals", weight=ft.FontWeight.BOLD, size=15),
                        ft.IconButton(ft.Icons.REFRESH, tooltip="Reload", on_click=lambda e: self.load_drafts())],
                       alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                ft.Divider(),
                self.draft_list,
            ]),
            padding=8, bgcolor=ft.Colors.with_opacity(0.04, ft.Colors.WHITE),
            border_radius=8,
        )

        # ---- HEADER fields --------------------------------------------------
        self.f_client_name = ft.TextField(label="Client Name", expand=True)
        self.f_location    = ft.TextField(label="Project Location", expand=True)
        self.f_date        = ft.TextField(label="Date (YYYY-MM-DD)", width=180)
        self.f_pic         = ft.TextField(label="Pilot in Command", expand=True)
        self.f_aircraft    = ft.TextField(label="Aircraft", expand=True)

        # ---- 5 OPORD paragraph editors -------------------------------------
        def para(label):
            return ft.TextField(label=label, multiline=True, min_lines=4, max_lines=12,
                                expand=True, text_size=13)
        self.f_situation = para("1. SITUATION  (problem, site, airspace, access)")
        self.f_mission   = para("2. MISSION  (who/what/when/where/why)")
        self.f_execution = para("3. EXECUTION  (intent, phases, deliverables, coordination)")
        self.f_sustain   = para("4. SUSTAINMENT  (logistics + investment)")
        self.f_command   = para("5. COMMAND & SIGNAL  (PIC authority, POC, reporting, insurance)")

        # ---- SUSTAINMENT pricing calculators -------------------------------
        self.dd_day = ft.Dropdown(
            label="Fieldwork Day Rate", width=190, value=f"{FULL_DAY_MIN:.0f}",
            options=[ft.dropdown.Option(f"{r:.0f}", money(r)) for r in day_rate_steps()],
            on_change=self._recompute,
        )
        self.sw_half = ft.Switch(label=f"Half day ({HALF_DAY_FACTOR*100:.0f}%)", value=False, on_change=self._recompute)
        self.dd_airspace = ft.Dropdown(
            label="Airspace Authorization", width=220, value="none",
            options=[ft.dropdown.Option(k, v) for k, v in AIRSPACE_LABELS.items()],
            on_change=self._recompute,
        )
        self.dd_tier = ft.Dropdown(
            label="Data Processing Tier", width=240, value="none",
            options=[ft.dropdown.Option("none", "None")] +
                    [ft.dropdown.Option(name.lower(), f"{name} ({money(price)})") for (name, price, _d) in VALUE_TIERS],
            on_change=self._recompute,
        )
        self.total_text = ft.Text("Total Project Investment: $0.00", size=18,
                                  weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_300)

        # ---- actions --------------------------------------------------------
        # All options are LOCAL Ollama models (no cloud / no Claude). Heavier = sharper prose, slower.
        self.dd_model = ft.Dropdown(
            label="AI model (local)", width=230, value="mistral:7b",
            options=[
                ft.dropdown.Option("mistral:7b", "Fast (mistral:7b)"),
                ft.dropdown.Option("qwen3:14b", "Stronger (qwen3:14b)"),
                ft.dropdown.Option("qwen3:32b", "Strongest (qwen3:32b)"),
            ],
        )
        self.status = ft.Text("", size=12, italic=True)
        self.pdf_link = ft.TextField(label="Client PDF link (signed, valid 7 days)",
                                     read_only=True, visible=False, width=640, text_size=12)
        self.actions = ft.Row([
            ft.FilledButton("Save Draft", icon=ft.Icons.SAVE, on_click=self._save),
            self.dd_model,
            ft.OutlinedButton("Regenerate with AI", icon=ft.Icons.AUTO_AWESOME, on_click=self._regenerate),
            ft.FilledButton("Generate Client PDF / Finalize", icon=ft.Icons.PICTURE_AS_PDF,
                            on_click=self._finalize,
                            style=ft.ButtonStyle(bgcolor=ft.Colors.BLUE_700)),
        ], wrap=True, vertical_alignment=ft.CrossAxisAlignment.CENTER)

    # ----------------------------------------------------------------------
    # data access
    # ----------------------------------------------------------------------
    def _sb(self):
        return _get_client()

    def load_drafts(self):
        self.draft_list.controls.clear()
        try:
            res = (self._sb().table(TABLE)
                   .select("id,title,client_name,status,total_investment,updated_at")
                   .in_("status", ["draft", "in_review"])
                   .order("updated_at", desc=True).execute())
            for r in res.data or []:
                self.draft_list.controls.append(
                    ft.ListTile(
                        title=ft.Text(r.get("title") or "(untitled)", size=13, weight=ft.FontWeight.W_600),
                        subtitle=ft.Text(f"{r.get('client_name') or '-'}  -  {money(r.get('total_investment'))}", size=11),
                        trailing=ft.Container(
                            ft.Text(r.get("status", ""), size=10, color=ft.Colors.AMBER_200),
                            padding=4),
                        dense=True,
                        on_click=lambda e, pid=r["id"]: self.select(pid),
                    )
                )
            self._set_status(f"Loaded {len(res.data or [])} draft(s).", ok=True)
        except Exception as ex:
            self._set_status(f"Load failed: {ex}", ok=False)
        self.page.update()

    def select(self, pid):
        try:
            r = self._sb().table(TABLE).select("*").eq("id", pid).single().execute().data
        except Exception as ex:
            self._set_status(f"Open failed: {ex}", ok=False)
            self.page.update()
            return
        self.current_id = pid
        self.f_client_name.value = r.get("client_name") or ""
        self.f_location.value    = r.get("project_location") or ""
        self.f_date.value        = str(r.get("proposal_date") or "")
        self.f_pic.value         = r.get("pilot_in_command") or ""
        self.f_aircraft.value    = r.get("aircraft") or ""
        self.f_situation.value   = r.get("situation") or ""
        self.f_mission.value     = r.get("mission") or ""
        self.f_execution.value   = r.get("execution") or ""
        self.f_sustain.value     = r.get("sustainment") or ""
        self.f_command.value     = r.get("command_signal") or ""
        self.dd_day.value        = f"{float(r.get('day_rate') or FULL_DAY_MIN):.0f}"
        self.sw_half.value       = bool(r.get("half_day"))
        self.dd_airspace.value   = r.get("airspace_fee_type") or "none"
        self.dd_tier.value       = r.get("processing_tier") or "none"
        self._recompute()
        self._set_status(f"Editing draft {pid[:8]}...", ok=True)
        self.page.update()

    # ----------------------------------------------------------------------
    # pricing
    # ----------------------------------------------------------------------
    def _compute_total(self):
        day = float(self.dd_day.value or 0)
        if self.sw_half.value:
            day = round(day * HALF_DAY_FACTOR, 2)
        airspace = AIRSPACE_FEES.get(self.dd_airspace.value, 0.0)
        processing = PROCESSING_FEES.get(self.dd_tier.value, 0.0)
        return day, airspace, processing, day + airspace + processing

    def _recompute(self, e=None):
        day, airspace, processing, total = self._compute_total()
        self.total_text.value = (
            f"Total Project Investment: {money(total)}    "
            f"(Field {money(day)} + Airspace {money(airspace)} + Processing {money(processing)})"
        )
        self.page.update()

    # ----------------------------------------------------------------------
    # actions
    # ----------------------------------------------------------------------
    def _payload(self):
        day, airspace, processing, total = self._compute_total()
        return {
            "client_name": self.f_client_name.value or None,
            "project_location": self.f_location.value or None,
            "proposal_date": (self.f_date.value or None),
            "pilot_in_command": self.f_pic.value or None,
            "aircraft": self.f_aircraft.value or None,
            "situation": self.f_situation.value or None,
            "mission": self.f_mission.value or None,
            "execution": self.f_execution.value or None,
            "sustainment": self.f_sustain.value or None,
            "command_signal": self.f_command.value or None,
            "day_rate": float(self.dd_day.value or 0),
            "half_day": bool(self.sw_half.value),
            "airspace_fee_type": self.dd_airspace.value,
            "airspace_fee": airspace,
            "processing_tier": self.dd_tier.value,
            "processing_fee": processing,
            "total_investment": total,
        }

    def _save(self, e):
        if not self.current_id:
            self._set_status("Select a draft first.", ok=False); self.page.update(); return
        try:
            self._sb().table(TABLE).update(self._payload()).eq("id", self.current_id).execute()
            self._set_status("Draft saved.", ok=True)
            self.load_drafts()
        except Exception as ex:
            self._set_status(f"Save failed: {ex}", ok=False)
            self.page.update()

    def _regenerate(self, e):
        """Re-parse the stored raw intake locally via Ollama (mistral:7b). No cloud, no Claude."""
        if not self.current_id:
            self._set_status("Select a draft first.", ok=False); self.page.update(); return
        model = self.dd_model.value or "mistral:7b"
        self._set_status(f"Regenerating locally with Ollama ({model})...", ok=True); self.page.update()
        try:
            import opord_intake                      # local, Flet-free intake module
            opord_intake.regenerate(self.current_id, model=model)
            self.select(self.current_id)             # reload the freshly parsed fields
            self._set_status(f"Regenerated from raw intake (local, {model}).", ok=True)
        except Exception as ex:
            self._set_status(f"Regenerate failed: {ex}", ok=False)
            self.page.update()

    def _finalize(self, e):
        if not self.current_id:
            self._set_status("Select a draft first.", ok=False); self.page.update(); return
        self._set_status("Saving, rendering PDF, uploading to Storage...", ok=True); self.page.update()
        try:
            # persist edits first, then render PDF + upload + sign (headless module)
            self._sb().table(TABLE).update(self._payload()).eq("id", self.current_id).execute()
            import opord_intake
            url = opord_intake.finalize(self.current_id)
            self.pdf_link.value = url or ""
            self.pdf_link.visible = bool(url)
            self._set_status("Finalized. Signed client PDF link ready (valid 7 days).", ok=True)
            self.load_drafts()
        except Exception as ex:
            self._set_status(f"Finalize failed: {ex}", ok=False)
            self.page.update()

    # ----------------------------------------------------------------------
    def _set_status(self, msg, ok=True):
        self.status.value = msg
        self.status.color = ft.Colors.GREEN_300 if ok else ft.Colors.RED_300

    def build(self) -> ft.Control:
        header = ft.Column([
            ft.Text("Header", weight=ft.FontWeight.BOLD),
            ft.Row([self.f_client_name, self.f_location]),
            ft.Row([self.f_date, self.f_pic, self.f_aircraft]),
        ], spacing=8)

        sustainment_calc = ft.Container(
            content=ft.Column([
                ft.Text("Investment Calculator", weight=ft.FontWeight.BOLD),
                ft.Row([self.dd_day, self.sw_half, self.dd_airspace, self.dd_tier], wrap=True,
                       vertical_alignment=ft.CrossAxisAlignment.CENTER),
                self.total_text,
            ], spacing=10),
            bgcolor=ft.Colors.with_opacity(0.10, ft.Colors.GREEN),
            border=ft.border.all(1, ft.Colors.GREEN_400), border_radius=10, padding=14,
        )

        workspace = ft.Container(
            expand=True,
            content=ft.Column([
                ft.Text("OPORD Proposal Editor", size=20, weight=ft.FontWeight.BOLD),
                header, ft.Divider(),
                self.f_situation, self.f_mission, self.f_execution,
                self.f_sustain, sustainment_calc, self.f_command,
                ft.Divider(),
                self.actions, self.status, self.pdf_link,
            ], spacing=12, scroll=ft.ScrollMode.AUTO),
            padding=16,
        )

        return ft.Row([self.left, ft.VerticalDivider(width=1), workspace], expand=True)


def main(page: ft.Page):
    page.title = "Trestle - OPORD Proposal Generator"
    page.theme_mode = ft.ThemeMode.DARK
    page.padding = 12
    editor = ProposalEditor(page)
    page.add(editor.build())
    editor.load_drafts()


if __name__ == "__main__":
    ft.app(target=main)
