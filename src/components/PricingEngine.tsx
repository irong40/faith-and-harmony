import { useState, useMemo, useCallback } from "react";

const INITIAL_ASSETS = [
  { id: "m4e", name: "DJI Matrice 4E", purchasePrice: 15000, lifeYears: 3, targetMissionsPerWeek: 5 },
  { id: "m3e", name: "DJI Mavic 3 Enterprise", purchasePrice: 4999, lifeYears: 3, targetMissionsPerWeek: 3 },
  { id: "mini4", name: "DJI Mini 4 Pro", purchasePrice: 959, lifeYears: 2, targetMissionsPerWeek: 8 },
  { id: "drtk2", name: "D-RTK 2 Mobile Station", purchasePrice: 3500, lifeYears: 5, targetMissionsPerWeek: 3 },
  { id: "tb65_set", name: "TB65 Battery Set (x2)", purchasePrice: 1800, lifeYears: 2, targetMissionsPerWeek: 5 },
  { id: "workstation", name: "i9/RTX 4090 Processing Rig", purchasePrice: 4500, lifeYears: 5, targetMissionsPerWeek: 10 },
];

const INITIAL_RATES = {
  planning: 75,
  execution: 150,
  processing: 100,
  mileageRate: 0.67,
};

const INITIAL_SOFTWARE = [
  { id: "adobe", name: "Adobe Creative Cloud", monthlyCost: 55, perProject: false },
  { id: "mipmap", name: "MipMap Desktop", monthlyCost: 30, perProject: false },
  { id: "supabase", name: "Supabase Pro", monthlyCost: 25, perProject: false },
  { id: "n8n", name: "n8n Cloud", monthlyCost: 24, perProject: false },
  { id: "aloft", name: "Aloft LAANC", monthlyCost: 0, perProject: true, flatFee: 0 },
];

function calcDepreciation(asset) {
  const weeksPerYear = 52;
  const totalMissions = asset.targetMissionsPerWeek * weeksPerYear * asset.lifeYears;
  if (totalMissions === 0) return 0;
  return asset.purchasePrice / totalMissions;
}

function calcSoftwarePerMission(software, totalMonthlyMissions) {
  if (totalMonthlyMissions === 0) return 0;
  return software.reduce((sum, s) => {
    if (s.perProject) return sum + (s.flatFee || 0);
    return sum + s.monthlyCost / totalMonthlyMissions;
  }, 0);
}

const Tab = ({ active, label, onClick, icon }) => (
  <button
    onClick={onClick}
    style={{
      padding: "12px 24px",
      background: active ? "#1a1a2e" : "transparent",
      color: active ? "#e8dcc8" : "#6b6b7b",
      border: "none",
      borderBottom: active ? "2px solid #c9a227" : "2px solid transparent",
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13px",
      fontWeight: active ? 700 : 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}
  >
    <span style={{ fontSize: "16px" }}>{icon}</span>
    {label}
  </button>
);

const Field = ({ label, value, onChange, type = "number", min = 0, step = 1, prefix, suffix, small }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: small ? "0 0 auto" : 1 }}>
    <label style={{ fontSize: "11px", color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif" }}>
      {label}
    </label>
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      {prefix && <span style={{ color: "#c9a227", fontSize: "14px", fontFamily: "'DM Mono', monospace" }}>{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        min={min}
        step={step}
        style={{
          background: "#12121e",
          border: "1px solid #2a2a3e",
          borderRadius: "6px",
          color: "#e8dcc8",
          padding: "8px 12px",
          fontSize: "14px",
          fontFamily: "'DM Mono', monospace",
          width: small ? "80px" : "100%",
          outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#c9a227")}
        onBlur={(e) => (e.target.style.borderColor = "#2a2a3e")}
      />
      {suffix && <span style={{ color: "#6b6b7b", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>{suffix}</span>}
    </div>
  </div>
);

const Stat = ({ label, value, accent, large, sub }) => (
  <div style={{ textAlign: "center", padding: large ? "20px" : "12px" }}>
    <div style={{ fontSize: "11px", color: "#6b6b7b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>
      {label}
    </div>
    <div style={{
      fontSize: large ? "32px" : "22px",
      fontWeight: 700,
      color: accent ? "#c9a227" : "#e8dcc8",
      fontFamily: "'DM Mono', monospace",
      lineHeight: 1.1,
    }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: "11px", color: "#5a5a6a", marginTop: "4px", fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
  </div>
);

const Card = ({ children, style }) => (
  <div style={{
    background: "#16162a",
    border: "1px solid #2a2a3e",
    borderRadius: "10px",
    padding: "20px",
    ...style,
  }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: "12px",
    color: "#c9a227",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 700,
    marginBottom: "12px",
    fontFamily: "'DM Sans', sans-serif",
    borderBottom: "1px solid #1e1e32",
    paddingBottom: "8px",
  }}>
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "6px 0" }}>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        background: checked ? "#c9a227" : "#2a2a3e",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        background: checked ? "#1a1a2e" : "#5a5a6a",
        position: "absolute",
        top: "2px",
        left: checked ? "18px" : "2px",
        transition: "all 0.2s",
      }} />
    </div>
    <span style={{ fontSize: "13px", color: "#c0c0d0", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
  </label>
);

const fmt = (n) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fmtInt = (n) => "$" + Math.round(n).toLocaleString();

export default function PricingEngine() {
  const [tab, setTab] = useState("quote");
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [rates, setRates] = useState(INITIAL_RATES);
  const [software, setSoftware] = useState(INITIAL_SOFTWARE);
  const [markupPct, setMarkupPct] = useState(25);

  const [selectedAssets, setSelectedAssets] = useState(["m4e", "tb65_set", "workstation"]);
  const [hours, setHours] = useState({ planning: 1, execution: 1.5, processing: 1 });
  const [distance, setDistance] = useState(25);
  const [rushMultiplier, setRushMultiplier] = useState(1);
  const [jobName, setJobName] = useState("");

  const updateAsset = useCallback((id, field, val) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: val } : a)));
  }, []);

  const totalMonthlyMissions = useMemo(() => {
    const maxWeekly = Math.max(...assets.map((a) => a.targetMissionsPerWeek), 1);
    return maxWeekly * 4.33;
  }, [assets]);

  const quote = useMemo(() => {
    const assetCost = assets
      .filter((a) => selectedAssets.includes(a.id))
      .reduce((sum, a) => sum + calcDepreciation(a), 0);

    const laborCost =
      hours.planning * rates.planning +
      hours.execution * rates.execution +
      hours.processing * rates.processing;

    const travelCost = distance * 2 * rates.mileageRate;

    const softwareCost = calcSoftwarePerMission(software, totalMonthlyMissions);

    const subtotal = laborCost + travelCost + softwareCost + assetCost;
    const equipmentMarkup = assetCost * (markupPct / 100);
    const totalQuote = (subtotal + equipmentMarkup) * rushMultiplier;

    const totalHours = hours.planning + hours.execution + hours.processing;
    const netProfit = totalQuote - assetCost - travelCost - softwareCost;
    const effectiveRate = totalHours > 0 ? netProfit / totalHours : 0;

    return {
      assetCost,
      laborCost,
      travelCost,
      softwareCost,
      equipmentMarkup,
      subtotal,
      totalQuote,
      totalHours,
      netProfit,
      effectiveRate,
      rushApplied: rushMultiplier > 1,
    };
  }, [assets, selectedAssets, hours, rates, distance, software, totalMonthlyMissions, markupPct, rushMultiplier]);

  const depreciationTable = useMemo(() => assets.map((a) => ({
    ...a,
    perMission: calcDepreciation(a),
    annualMissions: a.targetMissionsPerWeek * 52,
    totalMissions: a.targetMissionsPerWeek * 52 * a.lifeYears,
  })), [assets]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e0e1a",
      color: "#e8dcc8",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />

      <div style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "24px 20px",
      }}>
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "26px",
              fontWeight: 900,
              color: "#c9a227",
              margin: 0,
              letterSpacing: "0.02em",
            }}>
              SENTINEL
            </h1>
            <span style={{ fontSize: "13px", color: "#5a5a6a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Mission Pricing Engine
            </span>
          </div>
          <div style={{ height: "2px", background: "linear-gradient(90deg, #c9a227 0%, transparent 60%)", marginTop: "8px" }} />
        </div>

        <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #1e1e32", marginBottom: "24px" }}>
          <Tab active={tab === "config"} label="Configuration" onClick={() => setTab("config")} icon="&#9881;" />
          <Tab active={tab === "quote"} label="Quote Builder" onClick={() => setTab("quote")} icon="&#9998;" />
          <Tab active={tab === "results"} label="Results" onClick={() => setTab("results")} icon="&#9670;" />
        </div>

        {tab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card>
              <SectionLabel>Asset Registry</SectionLabel>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                      {["Asset", "Purchase Price", "Life (yrs)", "Target/wk", "Per Mission"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#6b6b7b", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {depreciationTable.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #1a1a2e" }}>
                        <td style={{ padding: "10px", color: "#c0c0d0", fontWeight: 500 }}>{a.name}</td>
                        <td style={{ padding: "10px" }}>
                          <input
                            type="number"
                            value={a.purchasePrice}
                            onChange={(e) => updateAsset(a.id, "purchasePrice", parseFloat(e.target.value) || 0)}
                            style={{ background: "#12121e", border: "1px solid #2a2a3e", borderRadius: "4px", color: "#c9a227", padding: "4px 8px", width: "90px", fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "10px" }}>
                          <input
                            type="number"
                            value={a.lifeYears}
                            onChange={(e) => updateAsset(a.id, "lifeYears", parseFloat(e.target.value) || 1)}
                            min={1}
                            style={{ background: "#12121e", border: "1px solid #2a2a3e", borderRadius: "4px", color: "#e8dcc8", padding: "4px 8px", width: "50px", fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "10px" }}>
                          <input
                            type="number"
                            value={a.targetMissionsPerWeek}
                            onChange={(e) => updateAsset(a.id, "targetMissionsPerWeek", parseFloat(e.target.value) || 0)}
                            min={0}
                            style={{ background: "#12121e", border: "1px solid #2a2a3e", borderRadius: "4px", color: "#e8dcc8", padding: "4px 8px", width: "50px", fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "10px", fontFamily: "'DM Mono', monospace", color: a.perMission > 10 ? "#e07a5f" : "#7ecba1" }}>
                          {fmt(a.perMission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Card>
                <SectionLabel>Labor Rates (per hour)</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <Field label="Planning" value={rates.planning} onChange={(v) => setRates((r) => ({ ...r, planning: v }))} prefix="$" suffix="/hr" />
                  <Field label="Execution (Flight)" value={rates.execution} onChange={(v) => setRates((r) => ({ ...r, execution: v }))} prefix="$" suffix="/hr" />
                  <Field label="Processing" value={rates.processing} onChange={(v) => setRates((r) => ({ ...r, processing: v }))} prefix="$" suffix="/hr" />
                  <Field label="Mileage Rate" value={rates.mileageRate} onChange={(v) => setRates((r) => ({ ...r, mileageRate: v }))} prefix="$" suffix="/mi" step={0.01} />
                </div>
              </Card>

              <Card>
                <SectionLabel>Software Overhead</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {software.map((s, i) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a1a2e" }}>
                      <span style={{ fontSize: "13px", color: "#c0c0d0" }}>{s.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#6b6b7b", fontSize: "11px" }}>$</span>
                        <input
                          type="number"
                          value={s.perProject ? s.flatFee : s.monthlyCost}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSoftware((prev) => prev.map((sw, j) => j === i ? { ...sw, ...(s.perProject ? { flatFee: val } : { monthlyCost: val }) } : sw));
                          }}
                          style={{ background: "#12121e", border: "1px solid #2a2a3e", borderRadius: "4px", color: "#e8dcc8", padding: "4px 6px", width: "60px", fontFamily: "'DM Mono', monospace", fontSize: "12px", outline: "none" }}
                        />
                        <span style={{ color: "#5a5a6a", fontSize: "11px" }}>{s.perProject ? "/job" : "/mo"}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: "12px", padding: "10px", background: "#12121e", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "#6b6b7b", marginBottom: "4px" }}>Software per mission (est.)</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: "#c9a227", fontSize: "16px" }}>
                      {fmt(calcSoftwarePerMission(software, totalMonthlyMissions))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <SectionLabel>Markup and Margin</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <Field label="Equipment Markup %" value={markupPct} onChange={setMarkupPct} suffix="%" small />
                <div style={{ flex: 1, padding: "10px", background: "#12121e", borderRadius: "6px", fontSize: "12px", color: "#8a8a9a", lineHeight: 1.5 }}>
                  This markup applies on top of the per mission depreciation cost for selected equipment. It covers wear, insurance, and profit margin on gear usage. A 25% markup on $19.23 depreciation adds $4.81 to the client quote.
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === "quote" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card>
              <SectionLabel>Mission Details</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", alignItems: "end" }}>
                <Field label="Job / Client Name" value={jobName} onChange={setJobName} type="text" />
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rush Job</label>
                  <select
                    value={rushMultiplier}
                    onChange={(e) => setRushMultiplier(parseFloat(e.target.value))}
                    style={{
                      background: "#12121e",
                      border: "1px solid #2a2a3e",
                      borderRadius: "6px",
                      color: rushMultiplier > 1 ? "#e07a5f" : "#e8dcc8",
                      padding: "8px 12px",
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value={1}>Standard</option>
                    <option value={1.25}>+25% (48hr)</option>
                    <option value={1.5}>+50% (24hr)</option>
                    <option value={2}>+100% (Same Day)</option>
                  </select>
                </div>
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Card>
                <SectionLabel>Equipment Selection</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {assets.map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Toggle
                        checked={selectedAssets.includes(a.id)}
                        onChange={(v) => {
                          setSelectedAssets((prev) =>
                            v ? [...prev, a.id] : prev.filter((id) => id !== a.id)
                          );
                        }}
                        label={a.name}
                      />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: selectedAssets.includes(a.id) ? "#c9a227" : "#3a3a4a" }}>
                        {fmt(calcDepreciation(a))}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "16px", padding: "10px", background: "#12121e", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#6b6b7b" }}>Equipment total</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: "#c9a227", fontSize: "16px", fontWeight: 700 }}>
                    {fmt(quote.assetCost)}
                  </span>
                </div>
              </Card>

              <Card>
                <SectionLabel>Labor Hours</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#8a8a9a" }}>Planning</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#c0c0d0" }}>{hours.planning}h @ {fmt(rates.planning)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={0.25}
                      value={hours.planning}
                      onChange={(e) => setHours((h) => ({ ...h, planning: parseFloat(e.target.value) }))}
                      style={{ width: "100%", accentColor: "#c9a227" }}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#8a8a9a" }}>Execution (Flight)</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#c0c0d0" }}>{hours.execution}h @ {fmt(rates.execution)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={0.25}
                      value={hours.execution}
                      onChange={(e) => setHours((h) => ({ ...h, execution: parseFloat(e.target.value) }))}
                      style={{ width: "100%", accentColor: "#c9a227" }}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#8a8a9a" }}>Processing</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#c0c0d0" }}>{hours.processing}h @ {fmt(rates.processing)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={0.25}
                      value={hours.processing}
                      onChange={(e) => setHours((h) => ({ ...h, processing: parseFloat(e.target.value) }))}
                      style={{ width: "100%", accentColor: "#c9a227" }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: "16px", padding: "10px", background: "#12121e", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#6b6b7b" }}>Labor total</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: "#c9a227", fontSize: "16px", fontWeight: 700 }}>
                    {fmt(quote.laborCost)}
                  </span>
                </div>
              </Card>
            </div>

            <Card>
              <SectionLabel>Travel</SectionLabel>
              <div style={{ display: "flex", alignItems: "end", gap: "20px" }}>
                <Field label="One way distance (miles)" value={distance} onChange={setDistance} suffix="mi" />
                <div style={{ padding: "10px", background: "#12121e", borderRadius: "6px", flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#6b6b7b" }}>{distance * 2} mi round trip @ {fmt(rates.mileageRate)}/mi</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: "#c9a227", fontSize: "16px", fontWeight: 700 }}>
                    {fmt(quote.travelCost)}
                  </span>
                </div>
              </div>
            </Card>

            <Card style={{ background: "#1a1a2e", border: "1px solid #c9a22740" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", textAlign: "center" }}>
                <Stat label="Labor" value={fmt(quote.laborCost)} />
                <Stat label="Travel" value={fmt(quote.travelCost)} />
                <Stat label="Equipment" value={fmt(quote.assetCost + quote.equipmentMarkup)} sub={`${markupPct}% markup applied`} />
                <Stat label="Software" value={fmt(quote.softwareCost)} />
              </div>
              <div style={{ height: "1px", background: "#c9a22730", margin: "16px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {quote.rushApplied && (
                    <span style={{ fontSize: "12px", color: "#e07a5f", fontWeight: 700, background: "#e07a5f15", padding: "4px 10px", borderRadius: "4px" }}>
                      RUSH {rushMultiplier}x APPLIED
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#6b6b7b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                    Client Quote
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: 900, color: "#c9a227", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>
                    {fmtInt(quote.totalQuote)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === "results" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #1e1e35 100%)", border: "1px solid #c9a22740" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                <Stat label="Client Quote" value={fmtInt(quote.totalQuote)} accent large />
                <Stat label="Net Profit" value={fmtInt(quote.netProfit)} large sub={`${quote.totalHours}h total labor`} />
                <Stat
                  label="Effective Hourly Rate"
                  value={fmt(quote.effectiveRate)}
                  large
                  accent={quote.effectiveRate >= 100}
                  sub={quote.effectiveRate >= 100 ? "Above target" : "Below $100/hr target"}
                />
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Card>
                <SectionLabel>Cost Breakdown</SectionLabel>
                {[
                  { label: "Labor (Planning)", value: hours.planning * rates.planning, pct: (hours.planning * rates.planning / quote.totalQuote) * 100 },
                  { label: "Labor (Execution)", value: hours.execution * rates.execution, pct: (hours.execution * rates.execution / quote.totalQuote) * 100 },
                  { label: "Labor (Processing)", value: hours.processing * rates.processing, pct: (hours.processing * rates.processing / quote.totalQuote) * 100 },
                  { label: "Travel", value: quote.travelCost, pct: (quote.travelCost / quote.totalQuote) * 100 },
                  { label: "Equipment Depreciation", value: quote.assetCost, pct: (quote.assetCost / quote.totalQuote) * 100 },
                  { label: "Equipment Markup", value: quote.equipmentMarkup, pct: (quote.equipmentMarkup / quote.totalQuote) * 100 },
                  { label: "Software Overhead", value: quote.softwareCost, pct: (quote.softwareCost / quote.totalQuote) * 100 },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #1a1a2e" }}>
                    <div style={{ flex: 1, fontSize: "12px", color: "#8a8a9a" }}>{row.label}</div>
                    <div style={{ width: "100px", height: "6px", background: "#12121e", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(row.pct, 100)}%`, background: row.label.includes("Markup") ? "#c9a227" : "#4a7c6f", borderRadius: "3px", transition: "width 0.3s" }} />
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#c0c0d0", width: "70px", textAlign: "right" }}>
                      {fmt(row.value)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#5a5a6a", width: "40px", textAlign: "right" }}>
                      {row.pct.toFixed(0)}%
                    </div>
                  </div>
                ))}
              </Card>

              <Card>
                <SectionLabel>Profitability Check</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: quote.effectiveRate >= 100 ? "#7ecba115" : "#e07a5f15",
                    border: `1px solid ${quote.effectiveRate >= 100 ? "#7ecba130" : "#e07a5f30"}`,
                  }}>
                    <div style={{ fontSize: "12px", color: quote.effectiveRate >= 100 ? "#7ecba1" : "#e07a5f", fontWeight: 700, marginBottom: "6px" }}>
                      {quote.effectiveRate >= 150 ? "STRONG MARGIN" : quote.effectiveRate >= 100 ? "HEALTHY MARGIN" : quote.effectiveRate >= 75 ? "THIN MARGIN" : "BELOW TARGET"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8a8a9a", lineHeight: 1.5 }}>
                      Your effective rate of {fmt(quote.effectiveRate)}/hr accounts for all overhead including equipment depreciation, travel, and software costs. {quote.effectiveRate < 100 ? "Consider increasing hours billed, reducing travel distance, or raising rates." : "This job covers your costs and generates healthy profit."}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ padding: "12px", background: "#12121e", borderRadius: "6px" }}>
                      <div style={{ fontSize: "10px", color: "#6b6b7b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Profit Margin</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", color: "#e8dcc8" }}>
                        {quote.totalQuote > 0 ? ((quote.netProfit / quote.totalQuote) * 100).toFixed(0) : 0}%
                      </div>
                    </div>
                    <div style={{ padding: "12px", background: "#12121e", borderRadius: "6px" }}>
                      <div style={{ fontSize: "10px", color: "#6b6b7b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Cost to Revenue</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", color: "#e8dcc8" }}>
                        {fmt(quote.totalQuote - quote.netProfit)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "#6b6b7b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                      Equipment Selected
                    </div>
                    {assets.filter((a) => selectedAssets.includes(a.id)).map((a) => (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", color: "#8a8a9a" }}>
                        <span>{a.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(calcDepreciation(a))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {jobName && (
              <Card style={{ background: "#12121e" }}>
                <div style={{ fontSize: "11px", color: "#5a5a6a", marginBottom: "8px" }}>QUOTE SUMMARY</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#c9a227", marginBottom: "4px" }}>{jobName}</div>
                <div style={{ fontSize: "12px", color: "#6b6b7b" }}>
                  {quote.totalHours}h total labor across {selectedAssets.length} assets, {distance * 2}mi round trip
                  {quote.rushApplied && ` with ${rushMultiplier}x rush premium`}
                </div>
              </Card>
            )}
          </div>
        )}

        <div style={{ marginTop: "32px", textAlign: "center", fontSize: "11px", color: "#3a3a4a", letterSpacing: "0.05em" }}>
          Sentinel Aerial Inspections. Veteran Owned. Hampton Roads, Virginia.
        </div>
      </div>
    </div>
  );
}
