---
phase: 03-n8n-vapi-pipeline
plan: 01
subsystem: infra
tags: [n8n, vapi, webhook, resend, supabase-edge-functions]

requires:
  - phase: 01-intake-api-and-lead-tracking
    provides: intake-lead edge function with x-webhook-secret auth and REQUIRED_FIELDS contract
  - phase: 02-vapi-voice-bot
    provides: Vapi assistant needing analysisPlan configuration for structured data extraction

provides:
  - n8n-workflows/wf5-vapi-intake-pipeline.json: importable 11-node workflow connecting Vapi to intake-lead
  - vapi/analysis-plan.json: Vapi assistant analysisPlan config for post-call structured data extraction

affects:
  - 03-02 (n8n import and activation)
  - 02 (Vapi assistant needs analysisPlan applied from analysis-plan.json)

tech-stack:
  added: []
  patterns:
    - "Parallel ACK pattern: Webhook -> Respond Accepted fires immediately while processing continues"
    - "continueOnFail on HTTP Request nodes allows downstream IF nodes to check status on 4xx/5xx"
    - "Code node with null-safe fallbacks for Vapi structuredData extraction"
    - "Direct Resend API call from n8n for admin failure notifications (no Supabase dependency in error path)"

key-files:
  created:
    - n8n-workflows/wf5-vapi-intake-pipeline.json
    - vapi/analysis-plan.json
  modified: []

key-decisions:
  - "Parallel connection from Vapi Webhook to both Respond Accepted and Filter End of Call enables immediate ACK while processing continues (matches wf1 pattern)"
  - "Extract Fields Code node validates required fields and sets _can_proceed boolean before HTTP call"
  - "Build Error Email Code node handles both validation failure path and API failure path via shared Send Admin Alert node"
  - "Object.fromEntries filter strips internal _can_proceed and _validation_errors from intake-lead payload"

patterns-established:
  - "Check Valid IF node gates on _can_proceed before calling external APIs"
  - "Resend called directly from n8n to avoid Supabase dependency in failure notification path"

requirements-completed: [INTAKE-05, MWARE-01, MWARE-02, MWARE-03, MWARE-04]

duration: 15min
completed: 2026-03-03
---

# Phase 3 Plan 01: n8n Vapi Intake Pipeline Artifacts Summary

**11-node n8n workflow and Vapi analysisPlan config that pipe end-of-call webhooks through structured data extraction into the intake-lead edge function with Resend admin alerts on failure**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-03T00:00:00Z
- **Completed:** 2026-03-03T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created importable wf5-vapi-intake-pipeline.json with all 11 required nodes and correct connection graph
- Vapi analysisPlan configuration with 9 structured fields, required array matching intake-lead contract, and service_type enum matching canonical package_type values
- Both verification scripts pass: all nodes present, headerAuth configured, continueOnFail set, all connections wired correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wf5 n8n workflow JSON** - `2fd2c01` (feat)
2. **Task 2: Create Vapi analysisPlan configuration** - `b5a0f8c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `n8n-workflows/wf5-vapi-intake-pipeline.json` - Complete importable n8n workflow with 11 nodes: Vapi Webhook (headerAuth), Respond Accepted (immediate ACK), Filter End of Call (type gate), Skip (non-EOCR path), Extract Fields (structuredData extraction with fallbacks), Check Valid (required field gate), Call Intake Lead (POST to edge function with continueOnFail), Check Status (statusCode < 300 check), Log Success, Build Error Email, Send Admin Alert (Resend API)
- `vapi/analysis-plan.json` - Vapi assistant analysisPlan with structuredDataSchema covering caller_name, caller_phone, caller_email, service_type (enum), job_description, property_address, preferred_date, qualification_status (enum), sentiment (enum)

## Decisions Made

- Parallel connection from Vapi Webhook to both Respond Accepted and Filter End of Call: this matches wf1's established pattern and ensures the HTTP ACK fires immediately without blocking on any processing work
- Build Error Email node handles both validation failures (from Check Valid FALSE branch) and API failures (from Check Status FALSE branch), routing both to the same Send Admin Alert node
- Internal fields (_can_proceed, _validation_errors) stripped from Call Intake Lead payload via Object.fromEntries filter expression rather than manually excluding in the Code node

## Deviations from Plan

None - plan executed exactly as written. Both artifacts match spec requirements. Verification scripts confirm all 11 nodes, correct connections, and valid configuration values.

## Issues Encountered

None. Both files were already created in a prior session (per STATE.md "Plan 03-01 artifacts complete"). This execution confirmed the files meet all spec requirements via automated verification and committed the untracked files.

## User Setup Required

**External services require manual configuration before this workflow can run.**

After importing wf5-vapi-intake-pipeline.json into n8n:

1. Create a Generic Credential of type "Header Auth" in n8n with name "X-Vapi-Secret" and the shared secret value
2. Assign that credential to the Vapi Webhook node
3. In Vapi dashboard, set the assistant's server URL to `https://<tunnel-url>/webhook/vapi-intake` with the matching secret header
4. Apply the analysisPlan from vapi/analysis-plan.json to the Vapi assistant via dashboard or PATCH API call
5. Activate the workflow in n8n

Environment variables required in n8n container:
- `SUPABASE_URL` (already set for other workflows)
- `INTAKE_WEBHOOK_SECRET` (added per STATE.md notes)
- `RESEND_API_KEY` (added per STATE.md notes)

## Next Phase Readiness

- wf5 JSON is ready to import into n8n
- analysisPlan is ready to apply to the Vapi assistant
- Plan 03-02 (n8n import and test) is the next step
- STATE.md notes a prior n8n workflow execution error after the Extract Fields node: investigate during 03-02

---
*Phase: 03-n8n-vapi-pipeline*
*Completed: 2026-03-03*
