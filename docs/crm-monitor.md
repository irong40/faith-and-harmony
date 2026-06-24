# CRM State Monitor

Gives observability over the business and feeds the agent workforce live CRM
context (the office agents have no direct database access — they read the file
this produces).

## Pieces

| Piece | Where | What |
|---|---|---|
| `crm_state_snapshot()` | DB function (migration `20260624130000`) | Read-only RPC returning the whole business state as JSON. `service_role` only. |
| `crm-snapshot` | Edge function | Holds the service role, returns the snapshot JSON. Guarded by `x-snapshot-secret`. |
| `scripts/crm-state-snapshot.mjs` | Repo script | Calls the function, writes `business-state.md` + `.json` with derived **alerts**. |
| `business-state.{md,json}` | `obsidian-dev/agent-office/crm/` | The artifact agents + you read. Regenerated each run. |

## What it reports / alerts on

Jobs by status, **stale scheduled jobs**, leads (+ new/7d), quotes & **accepted-without-job**,
**payments / delivered-but-unbilled**, drip queue health, and n8n heartbeat age. The script
derives an **Alerts** section (uninvoiced revenue, dropped customers, stale board, drip
failures, dead automations) so a glance tells you if anything is silently broken.

## One-time setup (2 steps)

1. **Set the guard secret** (a random string), in two places so they match:
   - Supabase: project → Edge Functions → `crm-snapshot` → add env var `CRM_SNAPSHOT_SECRET`.
   - Local `.env`: add `CRM_SNAPSHOT_SECRET=<same value>`.
2. **Schedule it** (Windows Task Scheduler, daily ~6:30 AM ET):
   ```
   schtasks /create /tn "CRM Snapshot" /tr "node D:\Projects\FaithandHarmony\scripts\crm-state-snapshot.mjs" /sc daily /st 06:30 /sd 2026-06-24
   ```
   (run with the repo as working dir so `.env` is found).

Then run once to confirm: `npm run crm:snapshot` (or `node scripts/crm-state-snapshot.mjs --dry-run` to print without writing).

## Changing what's tracked

Edit the `crm_state_snapshot()` SQL (new migration) — the function and script need
no change for new top-level keys, though the markdown layout in the script only renders
the sections it knows about.
