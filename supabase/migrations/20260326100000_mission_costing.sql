-- Mission Costing & Quoting Engine
-- Migration: 20260326100000_mission_costing
-- Description: Adds costing_settings (configurable percentages) and mission_costings
--   (per-mission cost calculations) tables for the cost-plus pricing engine.
-- Date: 2026-03-26

-- ============================================================================
-- Table: costing_settings (single-row config, admin-editable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS costing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  overhead_pct numeric(5,2) NOT NULL DEFAULT 20.00,
  depreciation_pct numeric(5,2) NOT NULL DEFAULT 10.00,
  admin_cost_pct numeric(5,2) NOT NULL DEFAULT 5.00,
  default_margin_pct numeric(5,2) NOT NULL DEFAULT 40.00,
  tax_rate_pct numeric(5,2) NOT NULL DEFAULT 6.00,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE costing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_costing_settings"
  ON costing_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default row
INSERT INTO costing_settings (overhead_pct, depreciation_pct, admin_cost_pct, default_margin_pct, tax_rate_pct)
VALUES (20.00, 10.00, 5.00, 40.00, 6.00);

-- ============================================================================
-- Table: mission_costings (one row per costing exercise)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mission_costings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  mission_name text,
  service_type text,

  -- Stage 1: Direct Expenses (manual inputs)
  pilot_rate numeric(10,2) NOT NULL DEFAULT 0,
  pilot_hours numeric(6,2) NOT NULL DEFAULT 0,
  vo_rate numeric(10,2) NOT NULL DEFAULT 0,
  vo_hours numeric(6,2) NOT NULL DEFAULT 0,
  editing_fee numeric(10,2) NOT NULL DEFAULT 0,
  travel_gas numeric(10,2) NOT NULL DEFAULT 0,
  travel_hotel numeric(10,2) NOT NULL DEFAULT 0,
  travel_rental numeric(10,2) NOT NULL DEFAULT 0,
  meals numeric(10,2) NOT NULL DEFAULT 0,
  equipment_rental numeric(10,2) NOT NULL DEFAULT 0,
  insurance_premium numeric(10,2) NOT NULL DEFAULT 50,
  expenses_subtotal numeric(10,2) NOT NULL DEFAULT 0,

  -- Stage 2: Indirect Costs (stored for audit trail)
  overhead_pct numeric(5,2) NOT NULL DEFAULT 20.00,
  overhead_amount numeric(10,2) NOT NULL DEFAULT 0,
  depreciation_pct numeric(5,2) NOT NULL DEFAULT 10.00,
  depreciation_amount numeric(10,2) NOT NULL DEFAULT 0,
  admin_cost_pct numeric(5,2) NOT NULL DEFAULT 5.00,
  admin_cost_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_expenses numeric(10,2) NOT NULL DEFAULT 0,

  -- Stage 3: Margin & Final Quote
  margin_pct numeric(5,2) NOT NULL DEFAULT 40.00,
  profit_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_charge numeric(10,2) NOT NULL DEFAULT 0,
  tax_estimate numeric(10,2) NOT NULL DEFAULT 0,

  -- Package comparison
  compared_package text,
  package_price numeric(10,2),
  surcharge_warning boolean NOT NULL DEFAULT false,

  -- Lifecycle
  converted_to_quote_id uuid REFERENCES quotes(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized', 'converted')),
  notes text
);

ALTER TABLE mission_costings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_mission_costings"
  ON mission_costings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER set_mission_costings_updated_at
  BEFORE UPDATE ON mission_costings
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime('updated_at');
