#!/usr/bin/env node
/**
 * PERMANENT finance-document publisher (runs at every monthly close).
 *
 * Discovers the finance-officer's monthly P&Ls + annual P&L and publishes any new
 * one to the governance Document Library, visible at /admin/governance?tab=documents.
 *
 * Uploads go through the `governance-upload` edge function, which holds the service
 * role natively (Supabase-provided). This script needs only:
 *   - VITE_SUPABASE_PUBLISHABLE_KEY  (already in .env)
 *   - GOVERNANCE_UPLOAD_SECRET       (guard secret, in .env; NOT a Supabase key)
 * No Supabase service-role key is ever stored on this machine.
 *
 * Idempotent for new months (storage upsert). Backfills existing months on first run.
 * Usage: node scripts/publish-finance-docs.mjs [--dry-run]
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { basename } from "node:path";

const SUPABASE_URL = "https://qjpujskwqaehxnqypxzu.supabase.co";
const FN_URL = `${SUPABASE_URL}/functions/v1/governance-upload`;
const FIN = "I:/My Drive/Sentinel Aerial Inspections S1 Department/HR/AOPStuff-Consolidated";
const PKG = `${FIN}/11-Other-Orgs/S1/Finance/monthly-package`;
const DRY = process.argv.includes("--dry-run");
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function envVal(name) {
  if (process.env[name]) return process.env[name].trim();
  for (const f of [".env", ".env.local"]) {
    if (!existsSync(f)) continue;
    const line = readFileSync(f, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

function discover() {
  const docs = [];
  if (existsSync(PKG)) {
    for (const dir of readdirSync(PKG)) {
      const m = /^(\d{4})-(\d{2})$/.exec(dir);
      if (!m) continue;
      const reports = `${PKG}/${dir}/reports`;
      if (!existsSync(reports)) continue;
      for (const f of readdirSync(reports)) {
        if (!/pl.*\.pdf$/i.test(f)) continue;
        docs.push({ p: `${reports}/${f}`, month: dir, title: `P&L — ${MONTHS[+m[2] - 1]} ${m[1]}` });
      }
    }
  }
  const annual = `${FIN}/Drone_Business_Docs/Financial/ANNUAL_PL_STATEMENT_2025.pdf`;
  if (existsSync(annual)) docs.push({ p: annual, month: "2025-12", title: "Annual P&L Statement — 2025" });
  return docs.sort((a, b) => a.month.localeCompare(b.month));
}

async function main() {
  const docs = discover();
  if (!docs.length) return console.log("No finance documents found.");
  const guard = envVal("GOVERNANCE_UPLOAD_SECRET");
  const anon = envVal("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!DRY && (!guard || !anon)) { console.error("ERROR: GOVERNANCE_UPLOAD_SECRET / VITE_SUPABASE_PUBLISHABLE_KEY missing in .env."); process.exit(1); }

  let ok = 0, fail = 0;
  for (const d of docs) {
    const path = `financial_analyst/${d.month}/${basename(d.p)}`;
    if (DRY) { console.log(`would publish  governance/${path}  [${d.title}]`); continue; }
    const fiscal_year = +d.month.slice(0, 4), quarter = `Q${Math.ceil(+d.month.slice(5, 7) / 3)}`;
    const contentBase64 = readFileSync(d.p).toString("base64");
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anon, Authorization: `Bearer ${anon}`, "x-gov-secret": guard },
      body: JSON.stringify({ path, contentBase64, title: d.title, month: d.month, fiscal_year, quarter }),
    });
    if (res.ok) { console.log(`PUBLISHED  governance/${path}`); ok++; }
    else { console.error(`FAIL  ${path}: ${res.status} ${await res.text()}`); fail++; }
  }
  console.log(DRY ? "\nDry run complete." : `\nDone. published=${ok} failed=${fail}. View: /admin/governance?tab=documents`);
}
main();
