import { useState, useEffect } from "react";

/**
 * Public lead-intake form. Feeds the Trestle OPORD Proposal Generator.
 * One component, two surfaces: the /quote route and the landing #contact section.
 *
 * The browser POSTs only to the `quote-request` edge function (verify_jwt:false),
 * which persists the lead, emails the team, and forwards { raw_intake, source }
 * to the OPORD webhook server-side. Deterministic pricing happens downstream in
 * pricing_core.py — this form only supplies hints.
 *
 * Copy rule: never "inspection"/"inspect" for SAI services (data/documentation only).
 */

// Canonical package codes (no re_* prefixes). "" = not sure / resolved in editor.
const JOB_TYPES: { value: string; label: string }[] = [
  { value: "", label: "Not sure / other" },
  { value: "listing_lite", label: "Real estate — listing (basic)" },
  { value: "listing_pro", label: "Real estate — listing (pro)" },
  { value: "construction_progress", label: "Construction progress" },
  { value: "land_documentation", label: "Vacant land documentation" },
  { value: "thermal_documentation", label: "Thermal documentation" },
  { value: "volumetric_stockpile", label: "Volumetric / stockpile" },
  { value: "mapping_ortho", label: "Mapping / orthomosaic" },
];

const DELIVERABLES: { value: string; label: string; tip: string }[] = [
  { value: "Photos", label: "Photos", tip: "High-resolution aerial still images of your site, framed for clarity and ready to use or share." },
  { value: "Video", label: "Video", tip: "Smooth aerial video — flyovers and slow pans that show the full site and key features in motion." },
  { value: "Orthomosaic/Map", label: "Map / Ortho", tip: "A single stitched, top-down image of the whole site, scaled to real-world measurements so you can measure distances and overlay parcel or property lines." },
  { value: "3D model", label: "3D model", tip: "A navigable 3D model of the site or structure built from the captured imagery — view it from any angle." },
  { value: "Thermal", label: "Thermal", tip: "Thermal (heat-signature) imagery that documents temperature differences across a roof, surface, or area." },
  { value: "Volumetric", label: "Volumetric", tip: "Volume measurements of stockpiles, excavations, or material — calculated from the captured 3D data." },
];

const REFERRALS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "search", label: "Search" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social media" },
  { value: "outreach", label: "We reached out to you" },
  { value: "other", label: "Other" },
];

const REQUIRED = ["full_name", "email", "phone", "location", "job_description"] as const;
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const scrub = (v: string) => (v || "").trim().replace(/^("?Client Name"?|N\/A)$/i, "");

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  company: string;
  job_description: string;
  job_type: string;
  location: string;
  acreage_or_size: string;
  target_date: string;
  airspace_known: string;
  referral_source: string;
  website_hp: string;
}

const EMPTY: FormState = {
  full_name: "", email: "", phone: "", company: "", job_description: "",
  job_type: "", location: "", acreage_or_size: "", target_date: "",
  airspace_known: "", referral_source: "", website_hp: "",
};

// Compose raw_intake: prose first, then a one-line synthesis of the structured
// fields, so the OPORD parser sees everything self-contained.
function composeRawIntake(d: FormState, deliverables: string[]): string {
  const bits: string[] = [];
  const contact = [d.full_name, d.company].filter(Boolean).join(", ");
  if (contact) bits.push(`Contact: ${contact}`);
  if (d.location) bits.push(`Location: ${d.location}`);
  if (d.acreage_or_size) bits.push(`Size: ${d.acreage_or_size}`);
  if (d.job_type) bits.push(`Type: ${d.job_type}`);
  if (d.target_date) bits.push(`Target date: ${d.target_date}`);
  if (d.airspace_known) bits.push(`Airspace: ${d.airspace_known}`);
  if (deliverables.length) bits.push(`Deliverables: ${deliverables.join(", ")}`);
  const meta = bits.length ? `\n\n[${bits.join("] [")}]` : "";
  return d.job_description + meta;
}

export default function RequestQuoteForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  // Capture UTM attribution from the URL once (shareable /quote surface).
  const [utm, setUtm] = useState<Record<string, string>>({});
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = p.get(k);
      if (v) out[k] = v;
    }
    setUtm(out);
  }, []);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDeliverable = (v: string) =>
    setDeliverables((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: pretend success for bots, do nothing.
    if (form.website_hp.trim()) {
      setStatus("success");
      return;
    }

    const d: FormState = { ...form };
    (Object.keys(d) as (keyof FormState)[]).forEach((k) => {
      if (k !== "website_hp") d[k] = scrub(d[k]);
    });

    const errs = new Set<string>();
    for (const f of REQUIRED) if (!d[f]) errs.add(f);
    if (d.email && !isEmail(d.email)) errs.add("email");
    if (errs.size) {
      setBad(errs);
      return;
    }
    setBad(new Set());

    const raw_intake = composeRawIntake(d, deliverables);
    const payload = {
      raw_intake,
      source: "web_form",
      full_name: d.full_name,
      email: d.email,
      phone: d.phone,
      company: d.company,
      job_type: d.job_type,
      location: d.location,
      acreage_or_size: d.acreage_or_size,
      target_date: d.target_date || null,
      airspace_known: d.airspace_known,
      deliverable_pref: deliverables,
      referral_source: d.referral_source,
      ...utm,
    };

    setStatus("submitting");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-request`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      setStatus("success");
    } catch {
      // Never lose the lead silently (the 401 outage lesson) — keep values, offer a path.
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="fh-quote-confirmation">
        <h3>REQUEST RECEIVED</h3>
        <p>Thanks — we'll send a scoped proposal within one business day. Check your email for confirmation.</p>
      </div>
    );
  }

  const fieldClass = (name: string) => `fh-quote-field${bad.has(name) ? " fh-field-bad" : ""}`;

  return (
    <form className="fh-quote-form" onSubmit={handleSubmit} noValidate>
      {/* A. Contact */}
      <div className="fh-quote-row">
        <div className={fieldClass("full_name")}>
          <label htmlFor="q-name">Name <span className="fh-req">*</span></label>
          <input id="q-name" type="text" autoComplete="name" value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)} placeholder="Your name" />
          <span className="fh-field-err">Please enter your name.</span>
        </div>
        <div className={fieldClass("email")}>
          <label htmlFor="q-email">Email <span className="fh-req">*</span></label>
          <input id="q-email" type="email" autoComplete="email" value={form.email}
            onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
          <span className="fh-field-err">Please enter a valid email.</span>
        </div>
      </div>
      <div className="fh-quote-row">
        <div className={fieldClass("phone")}>
          <label htmlFor="q-phone">Phone <span className="fh-req">*</span></label>
          <input id="q-phone" type="tel" autoComplete="tel" value={form.phone}
            onChange={(e) => set("phone", e.target.value)} placeholder="Your phone number" />
          <span className="fh-field-err">Please enter a phone number.</span>
        </div>
        <div className="fh-quote-field">
          <label htmlFor="q-company">Company</label>
          <input id="q-company" type="text" autoComplete="organization" value={form.company}
            onChange={(e) => set("company", e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {/* B. The job */}
      <div className={fieldClass("job_description")}>
        <label htmlFor="q-desc">Describe the job <span className="fh-req">*</span></label>
        <div className="fh-quote-hint">Site, acreage, what you want captured, deadlines. The more detail, the faster we scope it.</div>
        <textarea id="q-desc" rows={5} maxLength={4000} value={form.job_description}
          onChange={(e) => set("job_description", e.target.value)}
          placeholder="e.g. I need a 250-acre roof + thermal scan of a warehouse near Norfolk base next Tuesday. Looking for an orthomosaic I can overlay parcel lines on." />
        <span className="fh-field-err">Please describe the job.</span>
      </div>
      <div className="fh-quote-row">
        <div className="fh-quote-field">
          <label htmlFor="q-type">Job type</label>
          <select id="q-type" value={form.job_type} onChange={(e) => set("job_type", e.target.value)}>
            {JOB_TYPES.map((o) => <option key={o.value || "none"} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className={fieldClass("location")}>
          <label htmlFor="q-loc">Location <span className="fh-req">*</span></label>
          <input id="q-loc" type="text" value={form.location}
            onChange={(e) => set("location", e.target.value)} placeholder="City / county or address" />
          <span className="fh-field-err">Where is the site?</span>
        </div>
      </div>
      <div className="fh-quote-row">
        <div className="fh-quote-field">
          <label htmlFor="q-size">Size</label>
          <input id="q-size" type="text" value={form.acreage_or_size}
            onChange={(e) => set("acreage_or_size", e.target.value)} placeholder="~250 acres, single roof, etc." />
        </div>
        <div className="fh-quote-field">
          <label htmlFor="q-date">Target date</label>
          <input id="q-date" type="date" value={form.target_date}
            onChange={(e) => set("target_date", e.target.value)} />
        </div>
      </div>
      <div className="fh-quote-field">
        <label htmlFor="q-air">Airspace</label>
        <select id="q-air" value={form.airspace_known} onChange={(e) => set("airspace_known", e.target.value)}>
          <option value="">Unsure / I don't know</option>
          <option value="controlled">Likely controlled (near airport/base)</option>
          <option value="open">Open / rural</option>
        </select>
      </div>

      {/* C. Optional context */}
      <div className="fh-quote-field">
        <label>Deliverables you want</label>
        <div className="fh-quote-hint">Hover any option for a short description.</div>
        <div className="fh-quote-chips">
          {DELIVERABLES.map((o) => (
            <label key={o.value} className="fh-quote-chip" data-tip={o.tip}>
              <input type="checkbox" checked={deliverables.includes(o.value)}
                onChange={() => toggleDeliverable(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="fh-quote-field">
        <label htmlFor="q-ref">How did you find us?</label>
        <select id="q-ref" value={form.referral_source} onChange={(e) => set("referral_source", e.target.value)}>
          {REFERRALS.map((o) => <option key={o.value || "none"} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Honeypot — must stay empty */}
      <div className="fh-quote-hp" aria-hidden="true">
        <label htmlFor="q-website">Website</label>
        <input id="q-website" type="text" tabIndex={-1} autoComplete="off" value={form.website_hp}
          onChange={(e) => set("website_hp", e.target.value)} />
      </div>

      {status === "error" && (
        <p className="fh-quote-error">
          Something went wrong sending your request. Please try again, or email us directly at{" "}
          <a href="mailto:info@faithandharmonyllc.com">info@faithandharmonyllc.com</a> (or call 757.843.8772).
        </p>
      )}

      <button type="submit" className="fh-btn fh-btn-primary" style={{ width: "100%", marginTop: 8 }}
        disabled={status === "submitting"}>
        {status === "submitting" ? "SENDING…" : "REQUEST MY QUOTE"}
      </button>
    </form>
  );
}
