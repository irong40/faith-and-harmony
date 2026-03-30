/**
 * Compliance Sentinel Validation Script
 *
 * Validates prerequisites and workflow behavior for the Compliance Sentinel agent.
 *
 * Usage:
 *   node scripts/validate-compliance-sentinel.mjs --dry-run   # Check prerequisites only
 *   node scripts/validate-compliance-sentinel.mjs --full       # Verify actual workflow results
 *
 * Exit code 0 if all run checks pass, 1 if any fail.
 */

import pg from 'pg';

const { Client } = pg;

const DRY_RUN = process.argv.includes('--dry-run');
const FULL = process.argv.includes('--full');

if (!DRY_RUN && !FULL) {
  console.error('Usage: node validate-compliance-sentinel.mjs --dry-run | --full');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
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
  console.log(`SKIP  ${check}: ${name} (--dry-run mode)`);
  skipped++;
}

// --- Dry-run checks (prerequisites) ---

async function checkTableExists(check, tableName, minRows) {
  try {
    const res = await client.query(
      `SELECT count(*)::int AS cnt FROM public.${tableName}`
    );
    const count = res.rows[0].cnt;
    const ok = count >= minRows;
    report(check, `${tableName} exists with >= ${minRows} rows`, ok,
      ok ? null : `Found ${count} rows, expected >= ${minRows}`);
  } catch (err) {
    report(check, `${tableName} exists`, false, err.message);
  }
}

async function checkObligationsTable() {
  await checkTableExists('DRY-01', 'compliance_obligations', 12);
}

async function checkGovernanceLogTable() {
  try {
    const res = await client.query(
      `SELECT count(*)::int AS cnt FROM public.governance_log`
    );
    report('DRY-02', 'governance_log table exists', true);
  } catch (err) {
    report('DRY-02', 'governance_log table exists', false, err.message);
  }
}

async function checkSeedDataFields() {
  try {
    const res = await client.query(`
      SELECT id, obligation_name, due_date, recurrence, status
      FROM public.compliance_obligations
    `);
    const rows = res.rows;
    let allValid = true;
    const issues = [];

    for (const row of rows) {
      if (!row.due_date) {
        allValid = false;
        issues.push(`${row.obligation_name}: missing due_date`);
      }
      if (!row.recurrence) {
        allValid = false;
        issues.push(`${row.obligation_name}: missing recurrence`);
      }
      const validStatuses = ['pending', 'in_progress', 'complete', 'overdue', 'waived'];
      if (!validStatuses.includes(row.status)) {
        allValid = false;
        issues.push(`${row.obligation_name}: invalid status '${row.status}'`);
      }
    }

    report('DRY-03', 'All obligations have valid due_date, recurrence, status', allValid,
      allValid ? null : issues.join('; '));
  } catch (err) {
    report('DRY-03', 'Seed data field validation', false, err.message);
  }
}

// --- Full checks (workflow results) ---

async function checkLogEntries() {
  if (DRY_RUN) { skip('FULL-01', 'governance_log has compliance_sentinel entries'); return; }
  try {
    const res = await client.query(`
      SELECT count(*)::int AS cnt
      FROM public.governance_log
      WHERE agent_name = 'compliance_sentinel'
    `);
    const ok = res.rows[0].cnt >= 1;
    report('FULL-01', 'governance_log has >= 1 compliance_sentinel entry', ok,
      ok ? null : `Found ${res.rows[0].cnt} entries`);
  } catch (err) {
    report('FULL-01', 'governance_log compliance_sentinel entries', false, err.message);
  }
}

async function checkLogDataSnapshot() {
  if (DRY_RUN) { skip('FULL-02', 'governance_log entries have non-null data_snapshot'); return; }
  try {
    const res = await client.query(`
      SELECT count(*)::int AS total,
             count(data_snapshot)::int AS with_snapshot
      FROM public.governance_log
      WHERE agent_name = 'compliance_sentinel'
    `);
    const { total, with_snapshot } = res.rows[0];
    const ok = total > 0 && total === with_snapshot;
    report('FULL-02', 'All compliance_sentinel log entries have data_snapshot', ok,
      ok ? null : `${with_snapshot}/${total} entries have data_snapshot`);
  } catch (err) {
    report('FULL-02', 'governance_log data_snapshot check', false, err.message);
  }
}

async function checkLogEventTypes() {
  if (DRY_RUN) { skip('FULL-03', 'governance_log event_types are valid'); return; }
  try {
    const res = await client.query(`
      SELECT DISTINCT event_type
      FROM public.governance_log
      WHERE agent_name = 'compliance_sentinel'
    `);
    const validTypes = ['reminder', 'status_change', 'summary_generated'];
    const foundTypes = res.rows.map(r => r.event_type);
    const allValid = foundTypes.every(t => validTypes.includes(t));
    const ok = foundTypes.length > 0 && allValid;
    report('FULL-03', 'Log event_types are valid (reminder/status_change/summary_generated)', ok,
      ok ? null : `Found types: ${foundTypes.join(', ')}`);
  } catch (err) {
    report('FULL-03', 'governance_log event_type check', false, err.message);
  }
}

async function checkAutoRenewal() {
  if (DRY_RUN) { skip('FULL-04', 'Auto-renewal creates pending obligation for completed recurring'); return; }
  try {
    const res = await client.query(`
      SELECT obligation_name, recurrence
      FROM public.compliance_obligations
      WHERE status = 'complete'
        AND recurrence NOT IN ('one_time', 'as_needed')
    `);
    const completed = res.rows;

    if (completed.length === 0) {
      report('FULL-04', 'Auto-renewal check (no completed recurring obligations to verify)', true);
      return;
    }

    let allRenewed = true;
    const issues = [];

    for (const ob of completed) {
      const pendingRes = await client.query(`
        SELECT count(*)::int AS cnt
        FROM public.compliance_obligations
        WHERE obligation_name = $1
          AND status = 'pending'
          AND due_date > CURRENT_DATE
      `, [ob.obligation_name]);

      if (pendingRes.rows[0].cnt === 0) {
        allRenewed = false;
        issues.push(`${ob.obligation_name} (${ob.recurrence}): no pending future occurrence`);
      }
    }

    report('FULL-04', 'Completed recurring obligations have pending next occurrence', allRenewed,
      allRenewed ? null : issues.join('; '));
  } catch (err) {
    report('FULL-04', 'Auto-renewal check', false, err.message);
  }
}

async function checkStorageObjects() {
  if (DRY_RUN) { skip('FULL-05', 'Storage objects for compliance PDF'); return; }
  try {
    const res = await client.query(`
      SELECT count(*)::int AS cnt
      FROM storage.objects
      WHERE name LIKE 'compliance/%'
    `);
    const ok = res.rows[0].cnt >= 1;
    report('FULL-05', 'Storage has compliance PDF files', ok,
      ok ? null : `Found ${res.rows[0].cnt} files matching compliance/%`);
  } catch (err) {
    report('FULL-05', 'Storage objects check', false, err.message);
  }
}

// --- Main ---

async function main() {
  console.log('Compliance Sentinel Validation');
  console.log('==============================');
  console.log(`Mode: ${DRY_RUN ? 'dry-run (prerequisites only)' : 'full (workflow results)'}\n`);

  try {
    await client.connect();
  } catch (err) {
    console.error(`Cannot connect to database: ${err.message}`);
    console.error('Set DATABASE_URL or ensure Supabase is running locally (npx supabase start)');
    process.exit(1);
  }

  // Dry-run checks (always run)
  await checkObligationsTable();
  await checkGovernanceLogTable();
  await checkSeedDataFields();

  // Full checks (only in --full mode)
  await checkLogEntries();
  await checkLogDataSnapshot();
  await checkLogEventTypes();
  await checkAutoRenewal();
  await checkStorageObjects();

  await client.end();

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
