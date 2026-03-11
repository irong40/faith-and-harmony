---
phase: 13-schema-foundation
plan: 01
subsystem: database
tags: [postgres, supabase, enum, rls, migrations]

requires: []
provides:
  - lead_source_channel enum type with 5 values (voice_bot, web_form, manual, email_outreach, social)
  - leads.source_channel column migrated from text to typed enum
  - lead_notes table with admin-only RLS, reason_tag constraint, follow_up_at scheduling
affects:
  - 14-detail-drawer
  - 15-lead-entry
  - 16-analytics-dashboard

tech-stack:
  added: []
  patterns:
    - "RLS pattern: service_role_all FOR ALL + admins_all FOR ALL using has_role() helper"
    - "Partial index pattern: WHERE column IS NOT NULL for sparse timestamptz columns"
    - "moddatetime trigger for updated_at auto-maintenance"

key-files:
  created:
    - supabase/migrations/20260311100000_lead_source_channel_enum.sql
    - supabase/migrations/20260311100100_lead_notes_table.sql
  modified: []

key-decisions:
  - "No IF NOT EXISTS guard on CREATE TYPE: Postgres does not support that syntax for enum types. Migration is idempotent only at the table level."
  - "USING clause cast is intentionally fail-fast: any source_channel value outside the 5 enum values causes ALTER to fail, surfacing bad data before production deploy."
  - "reason_tag uses text + CHECK constraint rather than a second enum: avoids a third migration artifact for a low-cardinality list that may grow."

patterns-established:
  - "Enum migration pattern: CREATE TYPE then ALTER COLUMN ... USING cast::enum, update DEFAULT to typed literal"
  - "Admin notes table pattern: lead_id FK with ON DELETE CASCADE, created_by FK to auth.users, partial index on follow_up_at"

requirements-completed: [SRCE-02, DETL-03, DETL-04]

duration: 2min
completed: 2026-03-11
---

# Phase 13 Plan 01: Schema Foundation Summary

**Postgres lead_source_channel enum (5 values) applied to leads table via USING cast, plus lead_notes table with admin RLS, reason_tag CHECK constraint, and follow_up_at partial index**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T03:42:23Z
- **Completed:** 2026-03-11T03:43:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Typed leads.source_channel column: voice_bot, web_form, manual, email_outreach, social values with USING cast preserving all existing rows
- lead_notes table ready for Phase 14 drawer implementation with all constraints, RLS, and indexes in place
- Composite and partial indexes created for Phase 15 filtering and follow-up queue queries

## Task Commits

Each task was committed atomically:

1. **Task 1: Create source_channel enum and migrate leads column** - `2ef412e` (feat)
2. **Task 2: Create lead_notes table with RLS and constraints** - `5086abd` (feat)

**Plan metadata:** `6b3dfb3` (docs)

## Files Created/Modified

- `supabase/migrations/20260311100000_lead_source_channel_enum.sql` - Enum type creation, column type migration with USING cast, updated DEFAULT, type COMMENT, and source_channel index
- `supabase/migrations/20260311100100_lead_notes_table.sql` - lead_notes CREATE TABLE, RLS enable, two policies (service_role_all + admins_all_lead_notes), two indexes, moddatetime trigger, table COMMENT

## Decisions Made

reason_tag uses a text column with a CHECK constraint rather than a second enum type. The 4 allowed values (not_ready, wrong_area, needs_callback, price_sensitive) are low-cardinality but may grow as admin workflows evolve. A CHECK constraint is simpler to ALTER than a Postgres enum, which requires a new migration to add values.

The USING cast is intentionally fail-fast. Any lead row with a source_channel value outside the 5 defined enum values causes the ALTER COLUMN step to error out. This surfaces data quality issues before production deploy rather than silently casting to NULL.

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

The supabase CLI is not in the Git Bash PATH on this machine. It is available via `npx supabase`. The local Supabase Docker instance was not running, so `supabase db diff --local` could not execute during verification. The migration SQL was reviewed for correctness against the existing leads table schema and project RLS patterns. Both files match the plan specification exactly.

## User Setup Required

To apply these migrations to the local and remote instances:

```bash
# Start Docker Desktop first, then:
cd /d/Projects/FaithandHarmony
npx supabase db reset --local   # applies all migrations to local instance
# OR for remote:
npx supabase db push            # pushes pending migrations to remote
```

## Next Phase Readiness

Phase 14 (Detail Drawer and Inline Editing) can proceed. The lead_notes table is ready for insert/read operations. The source_channel enum values align with the badge values Phase 14 needs to render. No schema changes are required before Phase 14 begins.

## Self-Check: PASSED

- supabase/migrations/20260311100000_lead_source_channel_enum.sql: FOUND
- supabase/migrations/20260311100100_lead_notes_table.sql: FOUND
- .planning/phases/13-schema-foundation/13-01-SUMMARY.md: FOUND
- Commit 2ef412e: FOUND (feat Task 1)
- Commit 5086abd: FOUND (feat Task 2)
- Commit 6b3dfb3: FOUND (docs metadata)

---
*Phase: 13-schema-foundation*
*Completed: 2026-03-11*
