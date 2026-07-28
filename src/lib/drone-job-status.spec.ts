import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { Constants } from '@/integrations/supabase/types';

/**
 * Regression pins for the `drone_job_status` enum spelling.
 *
 * Background: three PostgREST filters shipped as `.neq('status', 'canceled')`
 * (one L). The live enum value is `cancelled` (two Ls), so Postgres rejected
 * the literal with 22P02 and PostgREST returned HTTP 400 — pullMissions,
 * usePilotMissions and PortfolioFlights all failed at runtime in production.
 * A one-character typo produced a total query failure with no type error,
 * because the value was passed as a bare string.
 *
 * Verified against the live database on 2026-07-28:
 *   GET /rest/v1/drone_jobs?status=neq.canceled  -> 400 22P02
 *   GET /rest/v1/drone_jobs?status=neq.cancelled -> 200
 * and 6 live drone_jobs rows hold the value `cancelled`.
 */

const ENUM_VALUES: readonly string[] = Constants.public.Enums.drone_job_status;

// Built at runtime so this spec never contains the bad literal itself — the
// source scan below would otherwise flag its own file.
const BAD = 'cancel' + 'ed';
const GOOD = 'cancel' + 'led';

const REPO_ROOT = resolve(__dirname, '..', '..');
const SCAN_ROOTS = [join(REPO_ROOT, 'src'), join(REPO_ROOT, 'supabase', 'functions')];
const SCAN_EXTENSIONS = ['.ts', '.tsx'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

/**
 * `retainers.status` is a separate domain: a plain `text` column whose CHECK
 * constraint is ('active', 'paused', 'canceled') — one L — per
 * supabase/migrations/20260220120000_retainers.sql. It is NOT the
 * drone_job_status enum and must keep the one-L spelling.
 */
const ALLOWLIST = new Set(['src/pages/admin/SentinelPricing.tsx']);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // directory absent in this checkout
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (SCAN_EXTENSIONS.some(ext => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

describe('drone_job_status enum spelling', () => {
  it('the generated schema uses the two-L spelling', () => {
    expect(ENUM_VALUES).toContain(GOOD);
  });

  it('the one-L spelling is NOT a member of the enum', () => {
    // Passing it to PostgREST yields 22P02 / HTTP 400, not an empty result set.
    expect(ENUM_VALUES).not.toContain(BAD);
  });

  it('keeps the sortie contract: drone_job_status uses `complete`, never `completed`', () => {
    expect(ENUM_VALUES).toContain('complete');
    expect(ENUM_VALUES).not.toContain('completed');
  });

  it('keeps the sortie contract: photogrammetry_status uses `completed`, never `complete`', () => {
    const photogrammetry: readonly string[] = Constants.public.Enums.photogrammetry_status;
    expect(photogrammetry).toContain('completed');
    expect(photogrammetry).not.toContain('complete');
  });
});

describe('no source file reintroduces the one-L drone job status', () => {
  const files = SCAN_ROOTS.flatMap(root => walk(root));
  // Match the literal only when it is a quoted string, so English prose such as
  // "your shoot does not get canceled" in marketing copy is not flagged.
  const quoted = new RegExp(`['"\`]${BAD}['"\`]`);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('has zero occurrences outside the retainers allowlist', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const rel = toPosix(relative(REPO_ROOT, file));
      if (rel === toPosix(relative(REPO_ROOT, __filename))) continue; // this spec
      if (ALLOWLIST.has(rel)) continue;

      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (quoted.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }

    expect(offenders, `drone_job_status is "${GOOD}" (two Ls). PostgREST rejects "${BAD}" with 22P02 / HTTP 400.`).toEqual([]);
  });
});

describe('the three call sites that failed in production', () => {
  const CALL_SITES = [
    'src/lib/sync/sync-engine.ts',
    'src/hooks/usePilotMissions.ts',
    'src/pages/pilot/PortfolioFlights.tsx',
  ];

  it.each(CALL_SITES)('%s filters status with the valid enum value', file => {
    const source = readFileSync(join(REPO_ROOT, file), 'utf8');
    expect(source).toMatch(new RegExp(`\\.neq\\(\\s*['"]status['"]\\s*,\\s*['"]${GOOD}['"]\\s*\\)`));
    expect(source).not.toMatch(new RegExp(`['"]${BAD}['"]`));
  });
});
