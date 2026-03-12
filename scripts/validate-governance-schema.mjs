/**
 * Governance Schema Validation Script
 *
 * Validates all Phase 1 schema requirements (SCHM-01 through SCHM-08)
 * by querying the local Supabase PostgreSQL database directly.
 *
 * Usage:
 *   node scripts/validate-governance-schema.mjs              # Run all 8 checks
 *   node scripts/validate-governance-schema.mjs --schema-only # Skip seed data checks (7, 8)
 *
 * Exit code 0 if all run checks pass, 1 if any fail.
 */

import pg from 'pg';

const { Client } = pg;

const SCHEMA_ONLY = process.argv.includes('--schema-only');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

let passed = 0;
let failed = 0;
let skipped = 0;

function report(check, name, ok, details) {
  if (ok) {
    console.log(`PASS  ${check}: ${name}`);
    passed++;
  } else {
    console.log(`FAIL  ${check}: ${name}`);
    if (details) console.log(`      ${details}`);
    failed++;
  }
}

function skip(check, name) {
  console.log(`SKIP  ${check}: ${name} (--schema-only)`);
  skipped++;
}

async function getColumns(table) {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  return res.rows.map(r => r.column_name);
}

async function checkSCHM01() {
  const cols = await getColumns('compliance_obligations');
  const expected = [
    'id', 'created_at', 'updated_at', 'obligation_name', 'category',
    'description', 'due_date', 'recurrence', 'status', 'owner',
    'source_document', 'notes', 'completed_at'
  ];
  const ok = expected.every(c => cols.includes(c)) && cols.length === 13;
  report('SCHM-01', 'compliance_obligations table (13 columns)', ok,
    ok ? null : `Found ${cols.length} columns: ${cols.join(', ')}`);
}

async function checkSCHM02() {
  const cols = await getColumns('governance_log');
  const expected = [
    'id', 'created_at', 'agent_name', 'event_type', 'summary',
    'document_url', 'data_snapshot', 'quarter', 'fiscal_year'
  ];
  const hasNoUpdatedAt = !cols.includes('updated_at');
  const hasAll = expected.every(c => cols.includes(c)) && cols.length === 9;
  const ok = hasAll && hasNoUpdatedAt;
  report('SCHM-02', 'governance_log table (9 columns, no updated_at)', ok,
    ok ? null : `Found ${cols.length} columns: ${cols.join(', ')}${!hasNoUpdatedAt ? ' (has updated_at!)' : ''}`);
}

async function checkSCHM03() {
  const cols = await getColumns('governance_decisions');
  const expected = [
    'id', 'created_at', 'updated_at', 'decision_date', 'title',
    'context', 'outcome', 'action_items', 'participants', 'quarter', 'fiscal_year'
  ];
  const ok = expected.every(c => cols.includes(c)) && cols.length === 11;
  report('SCHM-03', 'governance_decisions table (11 columns)', ok,
    ok ? null : `Found ${cols.length} columns: ${cols.join(', ')}`);
}

async function checkSCHM04() {
  const cols = await getColumns('financial_actuals');
  const expectedCount = 16;

  // Check UNIQUE constraint on month
  const idxRes = await client.query(
    `SELECT indexdef FROM pg_indexes
     WHERE tablename = 'financial_actuals' AND indexdef ILIKE '%unique%' AND indexdef ILIKE '%month%'`
  );
  const hasUniqueMonth = idxRes.rowCount > 0;
  const ok = cols.length === expectedCount && hasUniqueMonth;
  report('SCHM-04', `financial_actuals table (${expectedCount} columns, UNIQUE month)`, ok,
    ok ? null : `Found ${cols.length} columns, unique month constraint: ${hasUniqueMonth}`);
}

async function checkSCHM05() {
  const res = await client.query(
    `SELECT public FROM storage.buckets WHERE id = 'governance'`
  );
  const ok = res.rowCount === 1 && res.rows[0].public === false;
  report('SCHM-05', 'governance storage bucket (private)', ok,
    ok ? null : res.rowCount === 0 ? 'Bucket not found' : `public=${res.rows[0].public}`);
}

async function checkSCHM06() {
  const tables = [
    'compliance_obligations',
    'governance_log',
    'governance_decisions',
    'financial_actuals',
    'budget_baselines'
  ];

  let allOk = true;
  const details = [];

  for (const table of tables) {
    const res = await client.query(
      `SELECT policyname FROM pg_policies WHERE tablename = $1`,
      [table]
    );
    const policies = res.rows.map(r => r.policyname);
    const hasServiceRole = policies.some(p => p.includes('service_role'));
    const hasAdmin = policies.some(p => p.includes('admin'));

    if (!hasServiceRole || !hasAdmin) {
      allOk = false;
      details.push(`${table}: missing ${!hasServiceRole ? 'service_role' : ''} ${!hasAdmin ? 'admin' : ''} policy (found: ${policies.join(', ')})`);
    }
  }

  report('SCHM-06', 'RLS policies on all 5 governance tables', allOk,
    allOk ? null : details.join('; '));
}

async function checkSCHM07() {
  if (SCHEMA_ONLY) { skip('SCHM-07', 'compliance_obligations seed data (12 rows)'); return; }
  const res = await client.query(`SELECT count(*)::int AS cnt FROM public.compliance_obligations`);
  const ok = res.rows[0].cnt === 12;
  report('SCHM-07', 'compliance_obligations seed data (12 rows)', ok,
    ok ? null : `Found ${res.rows[0].cnt} rows, expected 12`);
}

async function checkSCHM08() {
  if (SCHEMA_ONLY) { skip('SCHM-08', 'budget_baselines FY2026 row'); return; }
  const res = await client.query(
    `SELECT count(*)::int AS cnt FROM public.budget_baselines WHERE fiscal_year = 2026`
  );
  const ok = res.rows[0].cnt === 1;
  report('SCHM-08', 'budget_baselines FY2026 row', ok,
    ok ? null : `Found ${res.rows[0].cnt} rows, expected 1`);
}

async function main() {
  console.log('Governance Schema Validation');
  console.log('============================');
  if (SCHEMA_ONLY) console.log('Mode: schema-only (skipping seed data checks)\n');
  else console.log('Mode: full validation\n');

  try {
    await client.connect();
  } catch (err) {
    console.error(`Cannot connect to database: ${err.message}`);
    console.error('Make sure Supabase is running locally (npx supabase start)');
    process.exit(1);
  }

  await checkSCHM01();
  await checkSCHM02();
  await checkSCHM03();
  await checkSCHM04();
  await checkSCHM05();
  await checkSCHM06();
  await checkSCHM07();
  await checkSCHM08();

  await client.end();

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
