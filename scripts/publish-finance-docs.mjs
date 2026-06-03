#!/usr/bin/env node
/**
 * PERMANENT finance-document publisher (runs at every monthly close).
 *
 * Scans the finance-officer's monthly-package output, publishes any P&L not yet
 * in the governance Document Library, logs it to governance_log, and (if a
 * sidecar actuals.json exists) upserts that month into financial_actuals — which
 * powers on-demand P&L generation and variance vs budget_baselines.
 *
 * Idempotent: safe to run every close. Already-published months are skipped
 * (governance_log dedupe); storage uses upsert; financial_actuals upserts on month.
 *
 * Runs as the final step of the finance-officer monthly close. Backfills all
 * existing months on its first run.
 *
 * Service key: read once from env SUPABASE_SERVICE_ROLE_KEY or .env (gitignored).
 *   Set it ONE time; every future close reuses it. Get it from
 *   Supabase > FaithandHarmonyAPP > Project Settings > API > service_role.
 *
 * Usage: node scripts/publish-finance-docs.mjs [--dry-run]
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { basename } from "node:path";

const SUPABASE_URL = "https://qjpujskwqaehxnqypxzu.supabase.co";
const BUCKET = "governance";
const AGENT = "financial_analyst";
const FIN = "I:/My Drive/Sentinel Aerial Inspections S1 Department/HR/AOPStuff-Consolidated";
const PKG = `${FIN}/11-Other-Orgs/S1/Finance/monthly-package`;
const DRY = process.argv.includes("--dry-run");

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  for (const f of [".env", ".env.local"]) {
    if (!existsSync(f)) continue;
    const line = readFileSync(f, "utf8").split(/\r?\n/).find((l) => /^SUPABASE_SERVICE_ROLE_KEY=/.test(l));
    if (line) return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** Discover finance docs to publish: monthly P&Ls + annual P&L. */
function discover() {
  const docs = [];
  if (existsSync(PKG)) {
    for (const dir of readdirSync(PKG)) {                       // dir = YYYY-MM
      const m = /^(\d{4})-(\d{2})$/.exec(dir);
      if (!m) continue;
      const reports = `${PKG}/${dir}/reports`;
      if (!existsSync(reports)) continue;
      for (const f of readdirSync(reports)) {
        if (!/pl.*\.pdf$/i.test(f) && !/_pl\.pdf$/i.test(f) && !/p&l/i.test(f)) continue;
        const title = `P&L — ${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
        docs.push({ p: `${reports}/${f}`, month: dir, title });
      }
      // optional structured numbers for financial_actuals
      const actuals = `${PKG}/${dir}/actuals.json`;
      if (existsSync(actuals)) docs.find((d) => d.month === dir) && (docs.find((d) => d.month === dir).actuals = actuals);
    }
  }
  const annual = `${FIN}/Drone_Business_Docs/Financial/ANNUAL_PL_STATEMENT_2025.pdf`;
  if (existsSync(annual)) docs.push({ p: annual, month: "2025-12", title: "Annual P&L Statement — 2025" });
  return docs.sort((a, b) => a.month.localeCompare(b.month));
}

async function alreadyLogged(headers, docUrl) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/governance_log?document_url=eq.${encodeURIComponent(docUrl)}&select=id`, { headers });
  if (!r.ok) return false;
  return (await r.json()).length > 0;
}

async function main() {
  const docs = discover();
  if (!docs.length) { console.log("No finance documents found to publish."); return; }
  const key = serviceKey();
  if (!key && !DRY) { console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY not set (env or .env). Aborting."); process.exit(1); }
  const headers = key ? { Authorization: `Bearer ${key}`, apikey: key } : {};

  let published = 0, skipped = 0;
  for (const d of docs) {
    const objectPath = `${AGENT}/${d.month}/${basename(d.p)}`;
    const docUrl = `${BUCKET}/${objectPath}`;
    if (DRY) { console.log(`would publish  ${docUrl}  [${d.title}]${d.actuals ? "  (+financial_actuals)" : ""}`); continue; }

    if (await alreadyLogged(headers, docUrl)) { console.log(`skip (already published)  ${docUrl}`); skipped++; continue; }

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/pdf", "x-upsert": "true" },
      body: readFileSync(d.p),
    });
    if (!up.ok) { console.error(`UPLOAD FAIL ${objectPath}: ${up.status} ${await up.text()}`); continue; }

    const fy = Number(d.month.slice(0, 4)), q = Math.ceil(Number(d.month.slice(5, 7)) / 3);
    await fetch(`${SUPABASE_URL}/rest/v1/governance_log`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ agent_name: "financial_analyst", event_type: "generation", summary: `Published ${d.title}`, document_url: docUrl, quarter: `Q${q}`, fiscal_year: fy }),
    });

    if (d.actuals) {
      const row = { month: `${d.month}-01`, ...JSON.parse(readFileSync(d.actuals, "utf8")) };
      await fetch(`${SUPABASE_URL}/rest/v1/financial_actuals`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(row),
      });
    }
    console.log(`PUBLISHED  ${docUrl}${d.actuals ? "  (+financial_actuals)" : ""}`);
    published++;
  }
  console.log(DRY ? "\nDry run complete." : `\nDone. published=${published} skipped=${skipped}. View: /admin/governance?tab=documents`);
}
main();
