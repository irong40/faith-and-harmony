#!/usr/bin/env node
/**
 * BD Intelligence ETL loader (Phase 1).
 *
 * Reads the scout captures and the decision ledger, then upserts every
 * opportunity into public.bd_opportunities (conflict key: notice_id).
 *
 *   Rich source : <VAULT>/agent-office/cron-agents/logs/sam-scout-*.json   (SAM.gov, full fields)
 *   Decisions   : <VAULT>/agent-office/proposals/pipeline.json             (all sources)
 *
 * SAM records are the base rows (real codes + geography). pipeline.json
 * decisions are merged onto them by solicitation number; any pipeline entry
 * with no SAM match (older, or eVA/Bonfire/grants) becomes a lean row tagged
 * by source. The full SAM object is retained in `raw` for Phase 2 enrichment.
 *
 * Usage (from repo root):  node scripts/bd-load-opportunities.mjs
 * Idempotent — safe to re-run (nightly). Reads keys from .env.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// --- Source locations (override with env if the vault moves) ----------------
const VAULT = process.env.BD_VAULT ||
  'C:\\Users\\redle.SOULAAN\\obsidian-dev\\agent-office';
const LOGS_DIR = join(VAULT, 'cron-agents', 'logs');
const PIPELINE_JSON = join(VAULT, 'proposals', 'pipeline.json');

// --- Minimal .env reader (handles KEY="quoted" values) ----------------------
function loadEnv() {
  const p = join(REPO_ROOT, '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// --- Helpers ---------------------------------------------------------------
const clean = (s) => {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
};

function mapSource(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('sam')) return 'sam.gov';
  if (s.includes('eva')) return 'eva';
  if (s.includes('bonfire')) return 'bonfire';
  if (s.includes('grant')) return 'grants.gov';
  return 'other';
}

// Transform a raw SAM.gov opportunity object into a bd_opportunities row.
function fromSam(o) {
  const pop = o.placeOfPerformance || {};
  const parent = clean(o.fullParentPathName);
  const agency = parent ? parent.split('.')[0] : clean(o.organizationType);
  return {
    notice_id: clean(o.noticeId) || clean(o.solicitationNumber),
    source: 'sam.gov',
    solicitation_number: clean(o.solicitationNumber),
    title: clean(o.title) || '(untitled)',
    agency,
    sub_agency: parent && parent.includes('.') ? parent : null,
    description: clean(o.description),
    naics_code: clean(o.naicsCode),
    psc_code: clean(o.classificationCode),
    set_aside: clean(o.typeOfSetAsideDescription),
    estimated_value: null,
    response_deadline: clean(o.responseDeadLine),
    posted_date: clean(o.postedDate),
    // When it entered our pipeline. Real date so week/month/year windows and the
    // annual "reviewed N in <year>" count are meaningful (not all "today").
    // A pipeline.json match overrides this with the actual bd-evaluate date.
    evaluated_date: clean(o.postedDate),
    place_city: clean(pop?.city?.name),
    place_state: clean(pop?.state?.code),
    place_zip: clean(pop?.zip),
    ui_link: clean(o.uiLink),
    outcome: 'pending',
    raw: o,
  };
}

// Transform a pipeline.json ledger entry into a lean bd_opportunities row.
function fromPipeline(p) {
  return {
    notice_id: clean(p.id),
    source: mapSource(p.source),
    solicitation_number: clean(p.id),
    title: clean(p.title) || '(untitled)',
    agency: clean(p.agency),
    set_aside: clean(p.naics_setaside), // mixed set-aside text in the ledger
    response_deadline: p.close ? `${p.close}T23:59:59Z` : null,
    screen: clean(p.screen),
    decision: clean(p.decision),
    rationale: clean(p.rationale),
    evaluated_by: clean(p.evaluated_by),
    evaluated_date: clean(p.evaluated_date),
    submitted_at: p.submitted ? clean(p.submitted) : null,
    outcome: clean(p.outcome) === 'won' || clean(p.outcome) === 'lost'
      ? clean(p.outcome) : 'pending',
    raw: p,
  };
}

// Attach a matching pipeline decision onto a SAM base row.
function mergeDecision(row, p) {
  row.screen = clean(p.screen);
  row.decision = clean(p.decision);
  row.rationale = clean(p.rationale);
  row.evaluated_by = clean(p.evaluated_by);
  row.evaluated_date = clean(p.evaluated_date);
  if (p.submitted) row.submitted_at = clean(p.submitted);
  const oc = clean(p.outcome);
  if (oc === 'won' || oc === 'lost') row.outcome = oc;
  return row;
}

// --- Load rich SAM records (dedup by noticeId, later logs win) --------------
const richByNotice = new Map();
if (existsSync(LOGS_DIR)) {
  const logFiles = readdirSync(LOGS_DIR)
    .filter((f) => /^sam-scout-.*\.json$/.test(f))
    .sort(); // date-sorted; later overwrites earlier
  for (const f of logFiles) {
    let doc;
    try { doc = JSON.parse(readFileSync(join(LOGS_DIR, f), 'utf8')); }
    catch (e) { console.warn(`skip ${f}: ${e.message}`); continue; }
    const opps = doc.all || doc.new || [];
    for (const o of opps) {
      const row = fromSam(o);
      if (row.notice_id) richByNotice.set(row.notice_id, row);
    }
  }
}
console.log(`Rich SAM records: ${richByNotice.size} (from ${LOGS_DIR})`);

// --- Load pipeline decisions -----------------------------------------------
let pipeline = [];
if (existsSync(PIPELINE_JSON)) {
  try { pipeline = JSON.parse(readFileSync(PIPELINE_JSON, 'utf8')); }
  catch (e) { console.warn(`pipeline.json parse failed: ${e.message}`); }
}
console.log(`Pipeline decisions: ${pipeline.length}`);

// Index SAM rows by solicitation_number and notice_id for decision merge.
const richBySolicitation = new Map();
for (const row of richByNotice.values()) {
  if (row.solicitation_number) richBySolicitation.set(row.solicitation_number, row);
}

const matchedPipelineIds = new Set();
for (const p of pipeline) {
  const id = clean(p.id);
  if (!id) continue;
  const hit = richBySolicitation.get(id) || richByNotice.get(id);
  if (hit) { mergeDecision(hit, p); matchedPipelineIds.add(id); }
}

// pipeline-only rows (no SAM match — older or non-SAM sources)
const pipelineOnly = pipeline
  .filter((p) => clean(p.id) && !matchedPipelineIds.has(clean(p.id)))
  .map(fromPipeline)
  .filter((r) => r.notice_id);

// --- Assemble + dedup by notice_id -----------------------------------------
const byNotice = new Map();
for (const row of richByNotice.values()) byNotice.set(row.notice_id, row);
for (const row of pipelineOnly) if (!byNotice.has(row.notice_id)) byNotice.set(row.notice_id, row);
const rows = [...byNotice.values()];

console.log(`Upserting ${rows.length} rows (${richByNotice.size} SAM + ${pipelineOnly.length} pipeline-only)...`);

// --- Upsert in chunks ------------------------------------------------------
const CHUNK = 200;
let done = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const batch = rows.slice(i, i + CHUNK);
  const { error } = await supabase
    .from('bd_opportunities')
    .upsert(batch, { onConflict: 'notice_id' });
  if (error) { console.error('Upsert failed:', error.message); process.exit(1); }
  done += batch.length;
  console.log(`  ...${done}/${rows.length}`);
}

const { count } = await supabase
  .from('bd_opportunities')
  .select('*', { count: 'exact', head: true });
console.log(`Done. bd_opportunities now holds ${count} rows.`);
