"""
Trestle - Mission Costing & Quoting Engine  (Hybrid Value-Based)  [Flet UI]
==========================================================================
Internal admin screen. ALL pricing logic + Supabase persistence now live in
pricing_core.py (Flet-free) so backends can reuse them without a UI library.
This file is only the Flet presentation layer.

Run:  pip install flet supabase
      python mission_costing_engine.py
"""

import flet as ft
from pricing_core import (
    LABOR_RATE_DEFAULT, FULL_DAY_MIN, FULL_DAY_MAX, FULL_DAY_STEP,
    QuoteMode, CostInputs, compute_internal, build_quote,
    build_costing_row, persist_costing, money, day_rate_steps,
)


class CostingEngineView:
    def __init__(self, page: ft.Page):
        self.page = page

        self.labor_hours = ft.TextField(label="Labor hours", value="1.5", width=150,
                                        keyboard_type=ft.KeyboardType.NUMBER, on_change=self._recalc)
        self.labor_rate = ft.TextField(label="Loaded rate $/hr", value=f"{LABOR_RATE_DEFAULT:.0f}",
                                       width=150, keyboard_type=ft.KeyboardType.NUMBER, on_change=self._recalc)
        self.direct_expenses = ft.TextField(label="Direct expenses $", value="40", width=160,
                                            keyboard_type=ft.KeyboardType.NUMBER, on_change=self._recalc)

        self.mission_type = ft.Dropdown(
            label="Mission type", width=260, value="residential",
            options=[
                ft.dropdown.Option("residential", "Residential / Standard"),
                ft.dropdown.Option("commercial", "Commercial - Unstructured (perimeter, etc.)"),
                ft.dropdown.Option("advanced", "Advanced Data Analysis"),
            ],
            on_change=self._on_type_change,
        )

        self.sw_laanc = ft.Switch(label="LAANC Authorization Required  (+$75)", value=False, on_change=self._recalc)
        self.sw_caps  = ft.Switch(label="CAPS / Zero-Grid Manual Authorization Required  (+$250)", value=False, on_change=self._recalc)

        self.sw_day_rate = ft.Switch(label="Day Rate Pricing", value=False, visible=False, on_change=self._on_type_change)
        self.full_day_rate = ft.Dropdown(
            label="Full Day Rate", width=200, value=f"{FULL_DAY_MIN:.0f}", visible=False,
            options=[ft.dropdown.Option(f"{r:.0f}", money(r)) for r in day_rate_steps()],
            on_change=self._recalc,
        )

        # persistence inputs
        self.mission_name = ft.TextField(label="Mission / client name", width=300)
        self.mission_id = ft.TextField(label="drone_jobs UUID (optional)", width=340,
                                       hint_text="link this costing to an existing job")
        self.save_btn = ft.FilledButton("Save to Supabase", icon=ft.Icons.CLOUD_UPLOAD, on_click=self._save)
        self.save_status = ft.Text("", size=12, italic=True)

        self.internal_col = ft.Column(spacing=4)
        self.client_col = ft.Column(spacing=8)

        self.internal_panel = ft.Container(
            content=ft.Column([
                ft.Row([ft.Icon(ft.Icons.LOCK, color=ft.Colors.RED_300, size=18),
                        ft.Text("INTERNAL BREAK-EVEN COSTS  -  FOR OUR EYES ONLY",
                                weight=ft.FontWeight.BOLD, color=ft.Colors.RED_200, size=13)]),
                ft.Divider(height=8, color=ft.Colors.RED_900),
                self.internal_col,
            ]),
            bgcolor=ft.Colors.with_opacity(0.12, ft.Colors.RED),
            border=ft.border.all(1, ft.Colors.RED_400),
            border_radius=10, padding=16, expand=True,
        )
        self.client_panel = ft.Container(
            content=ft.Column([
                ft.Row([ft.Icon(ft.Icons.SELL, color=ft.Colors.GREEN_300, size=18),
                        ft.Text("CLIENT-FACING QUOTE", weight=ft.FontWeight.BOLD,
                                color=ft.Colors.GREEN_200, size=13)]),
                ft.Divider(height=8, color=ft.Colors.GREEN_900),
                self.client_col,
            ]),
            bgcolor=ft.Colors.with_opacity(0.12, ft.Colors.GREEN),
            border=ft.border.all(1, ft.Colors.GREEN_400),
            border_radius=10, padding=16, expand=True,
        )

    def _num(self, tf: ft.TextField) -> float:
        try:
            return float(str(tf.value).strip() or 0)
        except ValueError:
            return 0.0

    def _resolve_mode(self) -> QuoteMode:
        t = self.mission_type.value
        if t == "advanced":
            return QuoteMode.VALUE_TIERED
        if t == "commercial" and self.sw_day_rate.value:
            return QuoteMode.COMMERCIAL_DAY
        return QuoteMode.STANDARD

    def _on_type_change(self, e=None):
        is_commercial = self.mission_type.value == "commercial"
        self.sw_day_rate.visible = is_commercial
        self.full_day_rate.visible = is_commercial and self.sw_day_rate.value
        self._recalc()

    def _gather(self) -> CostInputs:
        return CostInputs(
            labor_hours=self._num(self.labor_hours),
            labor_rate=self._num(self.labor_rate),
            direct_expenses=self._num(self.direct_expenses),
            laanc_required=self.sw_laanc.value,
            caps_required=self.sw_caps.value,
            is_residential=self.mission_type.value == "residential",
            mode=self._resolve_mode(),
            full_day_rate=float(self.full_day_rate.value or FULL_DAY_MIN),
        )

    def _recalc(self, e=None):
        inp = self._gather()
        internal = compute_internal(inp)
        quote = build_quote(inp, internal)

        def line(lbl, val, bold=False):
            return ft.Row([ft.Text(lbl, size=12, color=ft.Colors.GREY_300),
                           ft.Text(money(val), size=12,
                                   weight=ft.FontWeight.BOLD if bold else None, color=ft.Colors.WHITE)],
                          alignment=ft.MainAxisAlignment.SPACE_BETWEEN)

        self.internal_col.controls = [
            line(f"Labor  ({inp.labor_hours:g} hr x {money(inp.labor_rate)}/hr)", internal.labor_cost),
            line("Direct expenses", internal.direct_expenses),
            line("Base cost", internal.base_cost, bold=True),
            line("+ Overhead (20%)", internal.overhead),
            line("+ Depreciation (10%)", internal.depreciation),
            ft.Divider(height=6, color=ft.Colors.RED_900),
            line("BREAK-EVEN FLOOR", internal.break_even_floor, bold=True),
            line("Legacy cost-plus reference (+40%)", internal.cost_plus_reference),
        ]

        rows = []
        if quote.mode == QuoteMode.VALUE_TIERED:
            rows.append(ft.Text("Value-Based Package Recommendation", size=13,
                                weight=ft.FontWeight.BOLD, color=ft.Colors.WHITE))
            for name, total, desc in quote.tiers:
                rows.append(ft.Container(
                    content=ft.Column([
                        ft.Row([ft.Text(name, weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_100),
                                ft.Text(money(total), weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_100)],
                               alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                        ft.Text(desc, size=11, color=ft.Colors.GREY_300)]),
                    bgcolor=ft.Colors.with_opacity(0.10, ft.Colors.GREEN), border_radius=8, padding=10))
            if quote.airspace_fees:
                rows.append(ft.Text(f"(includes {money(quote.airspace_fees)} airspace authorization)",
                                    size=11, italic=True, color=ft.Colors.GREY_400))
        elif quote.mode == QuoteMode.COMMERCIAL_DAY:
            rows.append(ft.Text("Day-Rate Pricing  (hourly margin hidden)", size=13,
                                weight=ft.FontWeight.BOLD, color=ft.Colors.WHITE))
            for lbl, amt in quote.line_items:
                rows.append(ft.Row([ft.Text(lbl, color=ft.Colors.GREY_200), ft.Text(money(amt), color=ft.Colors.WHITE)],
                                   alignment=ft.MainAxisAlignment.SPACE_BETWEEN))
            rows.append(ft.Divider(height=6, color=ft.Colors.GREEN_900))
            rows.append(ft.Row([ft.Text("Full day (billed)", weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_100),
                                ft.Text(money(quote.full_day_total), weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_100)],
                               alignment=ft.MainAxisAlignment.SPACE_BETWEEN))
            rows.append(ft.Row([ft.Text("Half day (billed)", color=ft.Colors.GREEN_100),
                                ft.Text(money(quote.half_day_total), color=ft.Colors.GREEN_100)],
                               alignment=ft.MainAxisAlignment.SPACE_BETWEEN))
        else:
            for lbl, amt in quote.line_items:
                rows.append(ft.Row([ft.Text(lbl, color=ft.Colors.GREY_200), ft.Text(money(amt), color=ft.Colors.WHITE)],
                                   alignment=ft.MainAxisAlignment.SPACE_BETWEEN))
            rows.append(ft.Divider(height=6, color=ft.Colors.GREEN_900))
            rows.append(ft.Row([ft.Text("RECOMMENDED QUOTE", weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_100),
                                ft.Text(money(quote.recommended_quote), weight=ft.FontWeight.BOLD, size=16,
                                        color=ft.Colors.GREEN_100)],
                               alignment=ft.MainAxisAlignment.SPACE_BETWEEN))
            if quote.margin_pct_over_breakeven is not None:
                rows.append(ft.Text(f"{quote.margin_pct_over_breakeven:,.0f}% over break-even floor",
                                    size=11, italic=True, color=ft.Colors.GREY_400))

        for w in quote.warnings:
            rows.append(ft.Container(
                content=ft.Row([ft.Icon(ft.Icons.WARNING_AMBER, color=ft.Colors.AMBER, size=18),
                                ft.Text(w, size=12, color=ft.Colors.AMBER_100, expand=True)]),
                bgcolor=ft.Colors.with_opacity(0.15, ft.Colors.AMBER), border_radius=8, padding=10))

        self.client_col.controls = rows
        self.page.update()

    def _save(self, e):
        inp = self._gather()
        internal = compute_internal(inp)
        quote = build_quote(inp, internal)
        label = next((o.text for o in self.mission_type.options if o.key == self.mission_type.value),
                     self.mission_type.value)
        row = build_costing_row(inp, internal, quote,
                                mission_name=(self.mission_name.value or "").strip() or None,
                                mission_id=(self.mission_id.value or "").strip() or None,
                                service_type=label)
        self.save_status.value = "Saving…"
        self.save_status.color = ft.Colors.GREY_400
        self.page.update()
        try:
            new_id = persist_costing(row)
            self.save_status.value = f"Saved to mission_costings  (id {new_id})"
            self.save_status.color = ft.Colors.GREEN_300
        except Exception as ex:
            self.save_status.value = f"Save failed: {ex}"
            self.save_status.color = ft.Colors.RED_300
        self.page.update()

    def build(self) -> ft.Control:
        inputs = ft.Container(
            content=ft.Column([
                ft.Text("Mission Costing & Quoting Engine", size=20, weight=ft.FontWeight.BOLD),
                ft.Text("Hybrid Value-Based pricing  -  internal floor stays internal.",
                        size=12, color=ft.Colors.GREY_400),
                ft.Divider(),
                ft.Text("Manual Inputs", weight=ft.FontWeight.BOLD),
                ft.Row([self.labor_hours, self.labor_rate, self.direct_expenses], wrap=True),
                ft.Row([self.mission_type, self.sw_day_rate, self.full_day_rate], wrap=True,
                       vertical_alignment=ft.CrossAxisAlignment.CENTER),
                ft.Container(height=4),
                ft.Text("Airspace Authorization", weight=ft.FontWeight.BOLD),
                self.sw_laanc,
                self.sw_caps,
                ft.Divider(),
                ft.Text("Save Quote", weight=ft.FontWeight.BOLD),
                ft.Row([self.mission_name, self.mission_id], wrap=True),
                ft.Row([self.save_btn, self.save_status], vertical_alignment=ft.CrossAxisAlignment.CENTER),
            ], spacing=10),
            padding=16,
        )
        panels = ft.ResponsiveRow([
            ft.Container(self.internal_panel, col={"sm": 12, "md": 6}),
            ft.Container(self.client_panel,  col={"sm": 12, "md": 6}),
        ], run_spacing=12, spacing=12)
        return ft.Column([inputs, ft.Divider(thickness=2), panels], scroll=ft.ScrollMode.AUTO)


def main(page: ft.Page):
    page.title = "Trestle - Mission Costing & Quoting Engine"
    page.theme_mode = ft.ThemeMode.DARK
    page.padding = 20
    view = CostingEngineView(page)
    page.add(view.build())
    view._recalc()


if __name__ == "__main__":
    ft.app(target=main)
