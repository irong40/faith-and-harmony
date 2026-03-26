import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings,
  Save,
  FileOutput,
  AlertTriangle,
  CheckCircle2,
  Calculator,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCostingSettings, useUpdateCostingSettings } from "@/hooks/useCostingSettings";
import { useSaveMissionCosting } from "@/hooks/useMissionCostings";
import {
  calculateMissionCost,
  compareToPackage,
  findNearestPackage,
  costingToLineItems,
  PACKAGES,
  type CostingInputs,
  type CostingSettings,
} from "@/lib/mission-costing";

// ── Currency formatter ───────────────────────────────────────────────

const fmt = (n: number) =>
  "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ── Number input helper ──────────────────────────────────────────────

function NumField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="flex items-center gap-1.5 mt-1">
        {prefix && (
          <span className="text-sm font-mono text-muted-foreground">{prefix}</span>
        )}
        <Input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 text-sm font-mono"
        />
        {suffix && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ── Stat display ─────────────────────────────────────────────────────

function Stat({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: string;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <div className="text-center py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-bold ${large ? "text-2xl" : "text-lg"} ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function PricingEngine() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settingsRow } = useCostingSettings();
  const updateSettings = useUpdateCostingSettings();
  const saveCosting = useSaveMissionCosting();

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    overhead_pct: 20,
    depreciation_pct: 10,
    admin_cost_pct: 5,
    default_margin_pct: 40,
    tax_rate_pct: 6,
  });

  // Mission details
  const [missionName, setMissionName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");

  // Stage 1: Direct Expenses
  const [inputs, setInputs] = useState<CostingInputs>({
    pilotRate: 150,
    pilotHours: 2,
    voRate: 50,
    voHours: 0,
    editingFee: 75,
    travelGas: 30,
    travelHotel: 0,
    travelRental: 0,
    meals: 25,
    equipmentRental: 0,
    insurancePremium: 50,
  });

  // Stage 3: Margin slider
  const [marginPct, setMarginPct] = useState(40);

  // Derive settings from DB or defaults
  const settings: CostingSettings = useMemo(
    () => ({
      overheadPct: settingsRow?.overhead_pct ?? 20,
      depreciationPct: settingsRow?.depreciation_pct ?? 10,
      adminCostPct: settingsRow?.admin_cost_pct ?? 5,
    }),
    [settingsRow]
  );

  const taxRatePct = settingsRow?.tax_rate_pct ?? 6;

  // Auto-calculate all stages
  const result = useMemo(
    () => calculateMissionCost(inputs, settings, marginPct, taxRatePct),
    [inputs, settings, marginPct, taxRatePct]
  );

  // Package comparison
  const comparison = useMemo(() => {
    if (serviceType && PACKAGES[serviceType]) {
      return compareToPackage(result.totalCharge, serviceType);
    }
    return findNearestPackage(result.totalCharge);
  }, [result.totalCharge, serviceType]);

  // Update a single input field
  const setField = <K extends keyof CostingInputs>(key: K, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  // Open settings dialog with current values
  const openSettings = () => {
    if (settingsRow) {
      setSettingsForm({
        overhead_pct: settingsRow.overhead_pct,
        depreciation_pct: settingsRow.depreciation_pct,
        admin_cost_pct: settingsRow.admin_cost_pct,
        default_margin_pct: settingsRow.default_margin_pct,
        tax_rate_pct: settingsRow.tax_rate_pct,
      });
    }
    setSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    updateSettings.mutate(settingsForm, {
      onSuccess: () => setSettingsOpen(false),
    });
  };

  // Save costing draft
  const handleSaveDraft = () => {
    saveCosting.mutate({
      missionName,
      serviceType,
      inputs,
      settings,
      result,
      marginPct,
      comparedPackage: comparison?.packageCode,
      packagePrice: comparison?.packagePrice,
      surchargeWarning: comparison?.surchargeRequired,
      notes,
    });
  };

  // Convert to quote line items (for QuoteBuilder integration)
  const handleConvertToQuote = () => {
    const lineItems = costingToLineItems(inputs, result, settings, marginPct);
    // Store in sessionStorage for QuoteBuilder to pick up
    sessionStorage.setItem(
      "costing-to-quote",
      JSON.stringify({
        lineItems,
        total: result.totalCharge,
        deposit: Math.round(result.totalCharge * 0.5 * 100) / 100,
        missionName,
        serviceType,
      })
    );
    toast({
      title: "Quote prepared",
      description: "Navigating to Quote Requests — open any request and create a quote.",
    });
    navigate("/admin/quote-requests");
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Mission Cost Calculator
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cost-plus pricing engine. Your floor, not your ceiling.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openSettings} className="gap-1.5">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* ── Mission Details ───────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Job / Client Name</Label>
              <Input
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="Hampton Roads Roofing — 123 Main St"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue placeholder="Select package to compare" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PACKAGES).map(([code, pkg]) => (
                    <SelectItem key={code} value={code}>
                      {pkg.name} ({fmt(pkg.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          STAGE 1: DIRECT EXPENSES (Manual Inputs)
          ══════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Stage 1 — Direct Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Pilot Labor */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Pilot Labor</Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Beginner: $75–250/hr | Advanced: $275–450/hr
            </p>
            <div className="grid grid-cols-3 gap-3">
              <NumField
                label="Hourly Rate"
                value={inputs.pilotRate}
                onChange={(v) => setField("pilotRate", v)}
                prefix="$"
                suffix="/hr"
              />
              <NumField
                label="Hours"
                value={inputs.pilotHours}
                onChange={(v) => setField("pilotHours", v)}
                step={0.25}
                suffix="hrs"
              />
              <div className="flex items-end">
                <div className="bg-muted rounded-md px-3 py-1.5 w-full text-center">
                  <div className="text-[10px] text-muted-foreground">Subtotal</div>
                  <div className="text-sm font-mono font-bold">{fmt(result.pilotLabor)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Observer */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Visual Observer (VO)</Label>
            <div className="grid grid-cols-3 gap-3">
              <NumField
                label="Hourly Rate"
                value={inputs.voRate}
                onChange={(v) => setField("voRate", v)}
                prefix="$"
                suffix="/hr"
              />
              <NumField
                label="Hours"
                value={inputs.voHours}
                onChange={(v) => setField("voHours", v)}
                step={0.25}
                suffix="hrs"
              />
              <div className="flex items-end">
                <div className="bg-muted rounded-md px-3 py-1.5 w-full text-center">
                  <div className="text-[10px] text-muted-foreground">Subtotal</div>
                  <div className="text-sm font-mono font-bold">{fmt(result.voLabor)}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Editing & Staff */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <NumField
              label="Editing / Staff"
              value={inputs.editingFee}
              onChange={(v) => setField("editingFee", v)}
              prefix="$"
            />
            <NumField
              label="Equipment Rentals"
              value={inputs.equipmentRental}
              onChange={(v) => setField("equipmentRental", v)}
              prefix="$"
            />
            <NumField
              label="Insurance Premium"
              value={inputs.insurancePremium}
              onChange={(v) => setField("insurancePremium", v)}
              prefix="$"
            />
          </div>

          <Separator />

          {/* Travel & Logistics */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Travel & Logistics</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumField
                label="Gas / Mileage"
                value={inputs.travelGas}
                onChange={(v) => setField("travelGas", v)}
                prefix="$"
              />
              <NumField
                label="Hotel"
                value={inputs.travelHotel}
                onChange={(v) => setField("travelHotel", v)}
                prefix="$"
              />
              <NumField
                label="Rental Car"
                value={inputs.travelRental}
                onChange={(v) => setField("travelRental", v)}
                prefix="$"
              />
            </div>
          </div>

          {/* Meals */}
          <NumField
            label="Meals / Per Diem"
            value={inputs.meals}
            onChange={(v) => setField("meals", v)}
            prefix="$"
            className="max-w-xs"
          />

          {/* Expenses Subtotal */}
          <div className="bg-muted/50 border rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-semibold">Expenses Subtotal</span>
            <span className="text-xl font-mono font-bold">{fmt(result.expensesSubtotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          RED LINE DIVIDER
          ══════════════════════════════════════════════════════════ */}
      <div className="relative py-2">
        <Separator className="bg-red-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
            Auto-Calculated Below — Break-Even Floor
          </Badge>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          STAGE 2: INDIRECT COSTS (Auto-Calculated, Read-Only)
          ══════════════════════════════════════════════════════════ */}
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Stage 2 — Indirect Operational Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background rounded-lg p-4 border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Overhead ({settings.overheadPct}%)
              </div>
              <div className="text-lg font-mono font-bold">{fmt(result.overheadAmount)}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Software, rent, indirect support
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Depreciation ({settings.depreciationPct}%)
              </div>
              <div className="text-lg font-mono font-bold">
                {fmt(result.depreciationAmount)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Drone hardware replacement fund
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Administrative ({settings.adminCostPct}%)
              </div>
              <div className="text-lg font-mono font-bold">
                {fmt(result.adminCostAmount)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                LAANC, proposals, planning
              </p>
            </div>
          </div>

          <div className="mt-4 bg-background border-2 border-amber-500/30 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">Break-Even Floor</span>
              <p className="text-[10px] text-muted-foreground">
                True cost — lose money below this
              </p>
            </div>
            <span className="text-2xl font-mono font-bold text-amber-500">
              {fmt(result.totalExpenses)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          STAGE 3: MARGIN & FINAL QUOTE (Auto-Calculated)
          ══════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Stage 3 — Margin & Final Quote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Margin slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Target Profit Margin</Label>
              <Badge variant="outline" className="font-mono">
                {marginPct}%
              </Badge>
            </div>
            <Slider
              value={[marginPct]}
              onValueChange={([v]) => setMarginPct(v)}
              min={30}
              max={60}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>30% (conservative)</span>
              <span>60% (premium)</span>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <Stat label="Profit Amount" value={fmt(result.profitAmount)} />
            <Stat
              label="Total Charge to Client"
              value={fmt(result.totalCharge)}
              accent
              large
            />
            <Stat label={`Tax Est. (${taxRatePct}%)`} value={fmt(result.taxEstimate)} />
          </div>

          {/* Package Comparison */}
          {comparison && (
            <div
              className={`rounded-lg p-4 flex items-start gap-3 ${
                comparison.surchargeRequired
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-green-500/10 border border-green-500/30"
              }`}
            >
              {comparison.surchargeRequired ? (
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div
                  className={`text-sm font-semibold ${
                    comparison.surchargeRequired ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {comparison.surchargeRequired
                    ? "SURCHARGE REQUIRED"
                    : "WITHIN PACKAGE"}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {comparison.message}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notes ─────────────────────────────────────────────── */}
      <div>
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Job-specific notes, special requirements..."
          rows={2}
          className="mt-1 text-sm"
        />
      </div>

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={saveCosting.isPending}
          className="gap-1.5"
        >
          <Save className="h-4 w-4" />
          {saveCosting.isPending ? "Saving..." : "Save Draft"}
        </Button>
        <Button onClick={handleConvertToQuote} className="gap-1.5">
          <FileOutput className="h-4 w-4" />
          Convert to Quote
        </Button>
      </div>

      {/* ── Settings Dialog ───────────────────────────────────── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Costing Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <NumField
              label="Overhead %"
              value={settingsForm.overhead_pct}
              onChange={(v) =>
                setSettingsForm((f) => ({ ...f, overhead_pct: v }))
              }
              suffix="%"
              step={0.5}
            />
            <NumField
              label="Equipment Depreciation %"
              value={settingsForm.depreciation_pct}
              onChange={(v) =>
                setSettingsForm((f) => ({ ...f, depreciation_pct: v }))
              }
              suffix="%"
              step={0.5}
            />
            <NumField
              label="Administrative Cost %"
              value={settingsForm.admin_cost_pct}
              onChange={(v) =>
                setSettingsForm((f) => ({ ...f, admin_cost_pct: v }))
              }
              suffix="%"
              step={0.5}
            />
            <NumField
              label="Default Profit Margin %"
              value={settingsForm.default_margin_pct}
              onChange={(v) =>
                setSettingsForm((f) => ({ ...f, default_margin_pct: v }))
              }
              suffix="%"
              step={1}
              min={30}
            />
            <NumField
              label="Tax Rate %"
              value={settingsForm.tax_rate_pct}
              onChange={(v) =>
                setSettingsForm((f) => ({ ...f, tax_rate_pct: v }))
              }
              suffix="%"
              step={0.1}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
