"""
Trestle - Pricing Core (Flet-FREE, importable by any backend)
=============================================================
Pure-Python pricing logic + Supabase helpers shared by:
  * mission_costing_engine.py  (Flet admin UI)
  * proposal_editor.py         (Flet OPORD editor)
  * opord_intake.py            (HEADLESS Ollama intake / webhook - no UI deps)

Deliberately imports NO UI library so a job can be priced and persisted on a
server, in a cron, or behind an n8n webhook without Flet installed.
"""

import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

# ---------------------------------------------------------------------------
# BUSINESS CONSTANTS  (single source of truth for the whole platform)
# ---------------------------------------------------------------------------
LABOR_RATE_DEFAULT   = 85.00
OVERHEAD_RATE        = 0.20
DEPRECIATION_RATE    = 0.10
COST_PLUS_MARKUP     = 0.40

LAANC_FEE            = 75.00
CAPS_FEE             = 250.00

RESIDENTIAL_MIN_CALLOUT = 350.00

HALF_DAY_FACTOR      = 0.65
FULL_DAY_MIN         = 1500.00
FULL_DAY_MAX         = 3000.00
FULL_DAY_STEP        = 250.00

VALUE_TIERS = [
    ("Basic",      800.00,  "Raw data, Orthomosaic, Point Cloud"),
    ("Pro",        1800.00, "Basic + Measurements, Annotations, CAD exports"),
    ("Enterprise", 3500.00, "Pro + Change detection, Custom reporting, Priority turnaround"),
]

# Convenience maps derived from the constants above
AIRSPACE_FEES   = {"none": 0.0, "laanc": LAANC_FEE, "caps": CAPS_FEE}
PROCESSING_FEES = {name.lower(): price for (name, price, _d) in VALUE_TIERS}
PROCESSING_FEES["none"] = 0.0
PROCESSING_DESC = {name.lower(): desc for (name, _p, desc) in VALUE_TIERS}


def money(v) -> str:
    try:
        return f"${float(v):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def snap_day_rate(v) -> float:
    """Snap an arbitrary day rate into the valid $250-step range so UI dropdowns match.
    Defensive: non-numeric input (small-model noise like 'Rate per day') -> FULL_DAY_MIN."""
    try:
        v = float(v)
    except (TypeError, ValueError):
        v = FULL_DAY_MIN
    v = _clamp(v, FULL_DAY_MIN, FULL_DAY_MAX)
    return round(round(v / FULL_DAY_STEP) * FULL_DAY_STEP, 2)


def day_rate_steps():
    steps, r = [], FULL_DAY_MIN
    while r <= FULL_DAY_MAX:
        steps.append(r)
        r += FULL_DAY_STEP
    return steps


# ---------------------------------------------------------------------------
# COST-PLUS + HYBRID VALUE-BASED engine (deterministic)
# ---------------------------------------------------------------------------
class QuoteMode(str, Enum):
    STANDARD       = "standard"
    COMMERCIAL_DAY = "commercial_day"
    VALUE_TIERED   = "value_tiered"


@dataclass
class CostInputs:
    labor_hours: float = 0.0
    labor_rate: float = LABOR_RATE_DEFAULT
    direct_expenses: float = 0.0
    laanc_required: bool = False
    caps_required: bool = False
    is_residential: bool = True
    mode: QuoteMode = QuoteMode.STANDARD
    full_day_rate: float = FULL_DAY_MIN


@dataclass
class InternalBreakdown:
    labor_cost: float
    direct_expenses: float
    base_cost: float
    overhead: float
    depreciation: float
    break_even_floor: float
    cost_plus_reference: float


@dataclass
class ClientQuote:
    mode: QuoteMode
    line_items: list
    airspace_fees: float = 0.0
    recommended_quote: Optional[float] = None
    full_day_total: Optional[float] = None
    half_day_total: Optional[float] = None
    tiers: Optional[list] = None
    floor_applied: bool = False
    warnings: list = field(default_factory=list)
    margin_pct_over_breakeven: Optional[float] = None


def compute_internal(inp: CostInputs) -> InternalBreakdown:
    labor_cost   = inp.labor_hours * inp.labor_rate
    base_cost    = labor_cost + inp.direct_expenses
    overhead     = base_cost * OVERHEAD_RATE
    depreciation = base_cost * DEPRECIATION_RATE
    break_even   = base_cost + overhead + depreciation
    cost_plus    = break_even * (1 + COST_PLUS_MARKUP)
    return InternalBreakdown(labor_cost, inp.direct_expenses, base_cost, overhead,
                             depreciation, break_even, cost_plus)


def _airspace(inp: CostInputs):
    fees, items = 0.0, []
    if inp.laanc_required:
        fees += LAANC_FEE
        items.append(("LAANC Authorization", LAANC_FEE))
    if inp.caps_required:
        fees += CAPS_FEE
        items.append(("CAPS / Zero-Grid Manual Authorization", CAPS_FEE))
    return fees, items


def build_quote(inp: CostInputs, internal: InternalBreakdown) -> ClientQuote:
    fees, fee_items = _airspace(inp)

    if inp.mode == QuoteMode.VALUE_TIERED:
        tiers = [(name, base + fees, desc) for (name, base, desc) in VALUE_TIERS]
        warnings = []
        if internal.break_even_floor > tiers[0][1]:
            warnings.append("Internal break-even exceeds the Basic tier - confirm scope before quoting Basic.")
        return ClientQuote(mode=inp.mode, line_items=fee_items, airspace_fees=fees,
                           tiers=tiers, recommended_quote=None, warnings=warnings)

    if inp.mode == QuoteMode.COMMERCIAL_DAY:
        full = _clamp(inp.full_day_rate, FULL_DAY_MIN, FULL_DAY_MAX)
        half = round(full * HALF_DAY_FACTOR, 2)
        warnings = []
        if full < internal.break_even_floor:
            warnings.append("Full-day rate is BELOW the internal break-even floor.")
        return ClientQuote(mode=inp.mode,
                           line_items=[("Full Day Rate", full), ("Half Day Rate (65%)", half)] + fee_items,
                           airspace_fees=fees, full_day_total=full + fees, half_day_total=half + fees,
                           recommended_quote=full + fees, warnings=warnings)

    base_quote = internal.cost_plus_reference
    subtotal   = base_quote + fees
    line_items = [("Service (value/cost-plus base)", round(base_quote, 2))] + fee_items
    floor_applied, recommended, warnings = False, subtotal, []
    if inp.is_residential and subtotal < RESIDENTIAL_MIN_CALLOUT:
        warnings.append(f"Calculated quote ${subtotal:,.2f} is under the ${RESIDENTIAL_MIN_CALLOUT:,.0f} "
                        f"residential minimum. Recommended quote bumped to the floor.")
        recommended, floor_applied = RESIDENTIAL_MIN_CALLOUT, True
    margin_over = None
    if internal.break_even_floor > 0:
        margin_over = (recommended - internal.break_even_floor) / internal.break_even_floor * 100.0
    return ClientQuote(mode=inp.mode, line_items=line_items, airspace_fees=fees,
                       recommended_quote=round(recommended, 2), floor_applied=floor_applied,
                       warnings=warnings, margin_pct_over_breakeven=margin_over)


# ---------------------------------------------------------------------------
# SUPABASE HELPERS  (service-role; internal tools only)
# ---------------------------------------------------------------------------
DEFAULT_ENV_PATH = r"D:\Projects\FaithandHarmony\processing-server\.env"


def load_supabase_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        return url, key
    env_path = os.environ.get("TRESTLE_SUPABASE_ENV", DEFAULT_ENV_PATH)
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k == "SUPABASE_URL" and not url:
                    url = v
                elif k == "SUPABASE_SERVICE_ROLE_KEY" and not key:
                    key = v
    return url, key


def get_client():
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase package not installed - run: pip install supabase") from exc
    url, key = load_supabase_env()
    if not url or not key:
        raise RuntimeError("Supabase URL / service-role key not found. Set SUPABASE_URL + "
                           "SUPABASE_SERVICE_ROLE_KEY, or point TRESTLE_SUPABASE_ENV at an .env with them.")
    return create_client(url, key)


def build_costing_row(inp: CostInputs, internal: InternalBreakdown, quote: ClientQuote,
                      mission_name: Optional[str], mission_id: Optional[str],
                      service_type: Optional[str]) -> dict:
    full_rate = half_rate = None
    if quote.mode == QuoteMode.COMMERCIAL_DAY:
        full_rate = _clamp(inp.full_day_rate, FULL_DAY_MIN, FULL_DAY_MAX)
        half_rate = round(full_rate * HALF_DAY_FACTOR, 2)
    tiers_json = None
    if quote.mode == QuoteMode.VALUE_TIERED and quote.tiers:
        tiers_json = [{"name": n, "total": t, "deliverables": d} for (n, t, d) in quote.tiers]
    return {
        "mission_name": (mission_name or None),
        "mission_id": (mission_id or None),
        "service_type": service_type,
        "pilot_rate": inp.labor_rate, "pilot_hours": inp.labor_hours,
        "vo_rate": 0, "vo_hours": 0,
        "editing_fee": 0, "travel_gas": 0, "travel_hotel": 0, "travel_rental": 0,
        "meals": 0, "equipment_rental": 0, "insurance_premium": 0,
        "expenses_subtotal": inp.direct_expenses,
        "overhead_pct": OVERHEAD_RATE * 100, "overhead_amount": round(internal.overhead, 2),
        "depreciation_pct": DEPRECIATION_RATE * 100, "depreciation_amount": round(internal.depreciation, 2),
        "admin_cost_pct": 0, "admin_cost_amount": 0,
        "total_expenses": round(internal.break_even_floor, 2),
        "margin_pct": COST_PLUS_MARKUP * 100,
        "profit_amount": round(internal.cost_plus_reference - internal.break_even_floor, 2),
        "total_charge": round(internal.cost_plus_reference, 2),
        "tax_estimate": 0,
        "surcharge_warning": bool(quote.floor_applied or quote.warnings),
        "status": "draft",
        "notes": ("; ".join(quote.warnings) or None),
        "quote_mode": quote.mode.value,
        "is_residential": inp.is_residential,
        "laanc_required": inp.laanc_required, "laanc_fee": (LAANC_FEE if inp.laanc_required else 0),
        "caps_required": inp.caps_required, "caps_fee": (CAPS_FEE if inp.caps_required else 0),
        "airspace_fees": quote.airspace_fees,
        "break_even_floor": round(internal.break_even_floor, 2),
        "min_callout_floor": RESIDENTIAL_MIN_CALLOUT,
        "min_callout_applied": quote.floor_applied,
        "recommended_quote": quote.recommended_quote,
        "full_day_rate": full_rate, "half_day_rate": half_rate,
        "value_tiers": tiers_json,
    }


def persist_costing(row: dict) -> Optional[str]:
    res = get_client().table("mission_costings").insert(row).execute()
    return res.data[0]["id"] if getattr(res, "data", None) else None
