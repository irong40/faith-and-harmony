# Drone Job Flow

> How a drone job actually moves from quote to delivered. Verified against the
> codebase and the live database (2026-06-23). The job lifecycle runs on **edge
> functions + Postgres triggers** — **not** the n8n "pipeline" (that path is dead;
> see [Dead pipeline](#dead-pipeline-do-not-rely-on-it)).

## TL;DR

You drive the job through the stages with a few clicks; the system handles the
scoring/payment/delivery plumbing; and the **actual photo processing happens by
hand in WebODM, off-platform**.

```
Quote accepted ──(auto)──┐
                         ├─► JOB ─► schedule ─► upload link ─► QA ─► WebODM ─► invoice ─► deliver ─► portal
New Job (manual) ────────┘        (you)        (you)        (run)  (you,     (you)      (auto on    (customer)
                                                                    off-app)             payment)
```

## Stage by stage

| # | Stage | Mechanism | Who acts |
|---|-------|-----------|----------|
| 1 | **Job created** — from accepted quote | DB trigger `trg_quote_accepted` → `create_drone_job_from_quote()` RPC | system |
| 1b| **Job created** — manually | New Job / Job Intake page | you |
| 1c| Job number `DJ-####` assigned | DB trigger `set_drone_job_number` (BEFORE INSERT) | system |
| 2 | **Schedule** — set date/time (+ pilot/aircraft) | Edit dialog; trigger `auto_advance_status` flips `intake → scheduled` when a `scheduled_date` is saved | you |
| 2b| Add to Google Calendar | `google-calendar-sync` edge fn (needs Google connected) | you |
| 3 | **Upload link** → field uploads photos | `drone-job-token` edge fn → `/drone-upload/:token` → storage; status → `uploaded` | you → pilot |
| 4 | **QA** | `drone-qa-analyze` (per asset) + `drone-batch-qa` → sets `qa_score`, status → `qa` / `revision` / `review_pending` | you click, system scores |
| 5 | **Processing** | **Manual in WebODM (off-platform).** App shows the preset/profile only. "Mark Processing Complete" → status `complete` | you |
| 6 | **Invoice** | `create-balance-invoice` (Square), Billing tab | you |
| 7 | **Delivery** | Payment → `square-webhook` auto-fires `drone-delivery-email`; or click "Send Delivery". Sends via Resend, sets status `delivered`, mints portal token | auto or you |
| 7b| Billing rows on delivery | DB trigger `trg_drone_job_delivered` inserts `deposit` + `balance` rows in `payments` (quote-origin jobs only) | system |
| 8 | **Customer views/downloads** | `/my-jobs/:token` portal | customer |

### Automatic vs manual

- **Automatic (system):** quote→job creation, job numbering, `intake→scheduled`
  flip, QA scoring, payment→delivery, delivered→billing rows, portal link.
- **Manual (you):** scheduling, generating the upload link, running QA,
  **processing in WebODM**, sending the invoice, (optionally) sending delivery.

## Status values

`intake → scheduled → captured → uploaded → qa → complete → delivered`
(plus `revision`, `review_pending` branches off QA; `paid`, `photos_delivered`,
`failed`, `cancelled` as terminal/side states). Statuses can also be set manually
on the job detail page.

## Dead pipeline (do NOT rely on it)

An n8n "processing pipeline" exists in code/DB but **has never run** and is not
part of the real flow. Confirmed via live DB on 2026-06-23:

- `processing_jobs`: 1 row (an April seed), never used in production.
- `processing_steps`: **0 rows** — the n8n orchestrator has never written to this DB.
- `delivery_log`: **0 rows** — the n8n delivery workflow (wf3) has never run.
- The one delivered job went through `drone-delivery-email` (Resend), not n8n.

Removed (2026-06-23): the pipeline UI (`src/components/pipeline/*`, `Pipeline*`
admin pages, `usePipeline`, `PipelineRealtimeContext`, `types/pipeline`), the
`pipeline-trigger` / `pipeline-resume` / `pipeline-manual-edit-complete` edge
function source, and n8n backups `wf1`/`wf2`. The Processing tab now reflects the
real manual WebODM flow.

### Cleanup status

1. ✅ **RESOLVED 2026-06-24** — `on_drone_job_created_notify_n8n` (dead trycloudflare
   tunnel), `trg_drone_job_ingested` + `on_drone_job_ingested`, `trg_processing_complete`
   + `on_processing_complete`, and the dead `v_recent_pipeline_errors` view were all
   dropped (migration `20260624120000_drop_dead_pipeline_triggers.sql`). Auto-calendar-
   on-create is gone; use the manual "Add to Calendar" button.
2. ⚠️ **OPEN — `trg_drone_job_delivered`** — works, but creates a **deposit** invoice
   row at *delivery* time (deposits are normally upfront), and `create-deposit-invoice`
   isn't called from the app, so those rows may sit unprocessed. Flagged for the finance
   officer. Left in place pending billing review.
3. ⚠️ **OPEN — live n8n + deployed edge functions.** The live n8n still holds `wf1`/`wf2`/`wf3`
   (disable in the n8n UI), and `pipeline-trigger` / `pipeline-resume` / `pipeline-manual-edit-complete`
   are still deployed in Supabase (undeploy). Repo deletes don't touch those. Env vars
   `N8N_WEBHOOK_URL` / `N8N_PROCESSING_WEBHOOK_URL` are unused by anything live.
   Note: the n8n **heartbeat** workflow is alive (pinged 1 min before this audit) — it was
   specific pipeline workflows/tunnels that were dead, not n8n itself.

### Email sending (added 2026-06-24)

- The drip pipeline was sending from **`quotes@sentinelaerialinspections.com`**, an
  **unverified Resend domain** → every send failed and was wrongly marked terminal
  `skipped` (93 emails, 0 ever sent). Fixed by switching the SAI brand `from_email` to the
  **verified** `quotes@faithandharmonyllc.com` (display name "Sentinel Aerial Inspections"
  preserved) and changing `process-drip` to leave failed sends `pending` (retryable).
- ⚠️ **The delivery email (`drone-delivery-email`) still sends from
  `deliveries@sentinelaerialinspections.com`** (same unverified domain) yet flips the job
  to `delivered` regardless — so delivery emails may be **silently failing**. Either verify
  `sentinelaerialinspections.com` in Resend (DNS SPF/DKIM) — which also lets the drip go
  fully on-brand — or switch delivery to the verified domain.
