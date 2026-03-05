# Pitfalls Research

**Domain:** Adding billing flow, watermarking, accessories CRUD, offline queueing, PWA icons, and standalone deployment to existing drone operations platform
**Researched:** 2026-03-05
**Confidence:** HIGH (Square billing), HIGH (offline sync), HIGH (Vercel deployment), MEDIUM (watermarking), HIGH (PWA icons)

---

## Critical Pitfalls

### Pitfall 1: Square Invoice Created but Supabase Record Insert Fails (Orphaned Invoice)

**What goes wrong:**
The `create-deposit-invoice` edge function creates and publishes a Square invoice, then tries to insert a row into the `payments` table. If that Supabase insert fails (connection timeout, RLS misconfiguration, constraint violation), the customer receives a live Square invoice email with a payment link, but the app has no record of it. When the customer pays, the `square-webhook` handler cannot find a matching payment row and silently drops the event. The payment is collected but never acknowledged, no receipt is sent, and the job status never advances.

**Why it happens:**
The existing `create-deposit-invoice` function already logs this risk (line 234: "RECONCILIATION NEEDED") but has no automated recovery. The function returns a 500 with the Square invoice ID, but no one monitors that error in production. The two-phase write (Square API then Supabase) is not transactional. Network hiccups between Supabase edge function and Supabase database are rare but real.

**How to avoid:**
Insert the `payments` row in `pending` status BEFORE calling the Square API. Use the Supabase row ID as part of the Square idempotency key. If the Square API call fails, delete the pending row (or mark it `failed`). This reverses the failure mode: a Supabase row without a Square invoice is safe (just retry), while a Square invoice without a Supabase row is dangerous (money collected with no tracking). Add a daily reconciliation edge function that queries Square's List Invoices API and cross-references against the `payments` table to catch any orphans.

**Warning signs:**
Payments table row count is lower than Square dashboard invoice count. Customer reports paying but receiving no receipt or deliverables. Edge function logs contain "RECONCILIATION NEEDED" entries.

**Phase to address:**
Billing flow phase. Reverse the write order before going live with any deposit invoices.

---

### Pitfall 2: Offline Flight Log Sync Silently Drops Data After Max Retries

**What goes wrong:**
The sync engine processes the IndexedDB queue and encounters a flight log insert that fails (RLS error, schema mismatch, missing foreign key). After 5 retries (`MAX_RETRIES = 5`), the item is removed from the queue with a `console.error` and no user notification. The pilot thinks the flight log was recorded. It was permanently deleted from the local queue without ever reaching Supabase.

**Why it happens:**
The current `processQueue()` function in `sync-engine.ts` (line 121-125) removes items that exceed max retries. There is no dead letter queue, no persistent error log the pilot can see, and no admin notification. The `SyncStatusIndicator` component only shows the current sync status and pending count. Once the item is removed, the pending count drops and the UI shows "synced" even though data was lost.

**How to avoid:**
Add a dead letter store in IndexedDB (`STORES.DEAD_LETTER`). When an item exceeds max retries, move it to the dead letter store instead of deleting it. Show a persistent warning badge in the pilot UI when dead letter items exist. Add an admin endpoint that lists dead letter items across all pilots. Make the dead letter items retrievable and retryable from the admin portal after the root cause is fixed (usually a schema mismatch or missing RLS policy).

**Warning signs:**
Flight log count in Supabase is lower than the pilot's actual flight count. Sync status shows "idle" with 0 pending but console logs contain "exceeded max retries" messages. Pilot sees no error indication after the brief sync error state resolves.

**Phase to address:**
Offline queueing phase. Add dead letter store before integrating any new sync actions.

---

### Pitfall 3: Balance Invoice Created Before Deliverables Are Actually Ready

**What goes wrong:**
The billing flow sends a "balance due" email with watermarked preview thumbnails and a Square payment link. If this email fires automatically when the job status changes to "delivered" but the actual processed images are not yet uploaded to storage, the email contains broken image links or placeholder thumbnails. The client receives a payment demand with no proof of work. They do not pay.

**Why it happens:**
Job status transitions and file uploads are separate operations. A status change to "delivered" might be triggered before the pilot or processing pipeline finishes uploading all deliverables. The watermarked preview generation depends on source images being in Supabase Storage. If the balance email is wired to a database trigger on status change, it races against the upload pipeline.

**How to avoid:**
Do not trigger the balance email on job status change alone. Gate the balance email on two conditions: (1) job status is "delivered" AND (2) at least one deliverable file exists in the expected storage path. Better yet, make the balance invoice creation a manual admin action or a separate "ready for billing" status that the admin sets after verifying deliverables are uploaded and watermarked previews are generated. The preview generation and balance email should be a single edge function that reads images, watermarks them, attaches to email, and sends.

**Warning signs:**
Balance due emails contain broken image tags. Clients reply asking "where are the photos?" Storage bucket for the job is empty when the balance email fires.

**Phase to address:**
Billing flow phase (balance invoice step). This gate check must be in place before wiring balance emails to any automated trigger.

---

### Pitfall 4: Watermarked Previews Expose Full Resolution Through URL Manipulation

**What goes wrong:**
Watermarked preview thumbnails are generated as separate files stored alongside the originals in Supabase Storage. The URL pattern is predictable (e.g., `/deliverables/{job_id}/preview_001.jpg` next to `/deliverables/{job_id}/full_001.jpg`). A client who receives preview URLs can guess the full resolution URLs and download them before paying the balance.

**Why it happens:**
Supabase Storage buckets default to either fully public or fully private. If the bucket is public (so preview URLs work without auth), all files in the bucket are public. If previews and originals share the same bucket or path structure, the originals are also accessible.

**How to avoid:**
Store originals and previews in separate storage buckets or separate path prefixes with different access policies. Originals go in a private bucket accessible only via service role key. Previews go in a public bucket (or use signed URLs with short expiry). Generate watermarked previews server-side in an edge function and store them in the preview bucket only. Never put originals in a public bucket. When the balance is paid, generate signed URLs for the originals with a 24-hour expiry and include them in the delivery email. Alternatively, move originals to a public path only after payment confirmation and delete them after 7 days.

**Warning signs:**
Previews and originals are in the same storage bucket. Preview URLs contain a path segment that differs from originals by only a prefix (preview_ vs full_). No RLS or bucket policy restricts access to originals.

**Phase to address:**
Watermarking and delivery phase. Storage bucket architecture must be decided before any file upload logic is built.

---

### Pitfall 5: Standalone Vercel Deployment Breaks Shared Supabase Auth Session

**What goes wrong:**
The app currently runs at one domain (e.g., `faithandharmony.vercel.app`). After deploying the pilot PWA separately at `trestle.sentinelaerial.com`, the Supabase auth session cookie is scoped to the original domain. Pilots who log in at the original domain and then navigate to `trestle.sentinelaerial.com` are not authenticated. If the pilot PWA and admin portal share the same Supabase project but live on different domains, auth sessions do not transfer.

**Why it happens:**
Supabase stores auth tokens in `localStorage` keyed by the Supabase project URL. The tokens themselves are valid across domains (JWT validation happens server-side), but `localStorage` is domain-scoped by browser security policy. A pilot who logs in at `app.domain.com` has tokens stored there, not at `trestle.domain.com`. The pilot PWA at the subdomain starts with no session.

**How to avoid:**
This is actually not a problem IF pilots log in directly at `trestle.sentinelaerial.com`. The issue only arises if you expect cross-domain session sharing. For this project, the pilot PWA should have its own login page at `trestle.sentinelaerial.com/login` and pilots authenticate there directly. Do not try to share sessions across domains. Make sure the Supabase client in the standalone deployment uses the same Supabase project URL and anon key but authenticates independently. Update the Supabase auth redirect URLs in the dashboard to include both domains.

**Warning signs:**
Pilot lands on `trestle.sentinelaerial.com` and sees a login screen despite being logged in at the main domain. Supabase auth dashboard does not list the new subdomain in allowed redirect URLs. Password reset or magic link emails contain the wrong domain's callback URL.

**Phase to address:**
Deployment phase. Add subdomain to Supabase auth redirect URLs before the first pilot tests the standalone deployment.

---

### Pitfall 6: PWA Icon Replacement Causes Stale Cache and Broken Home Screen Icons

**What goes wrong:**
Production PNG icons replace the SVG placeholders. The service worker's precache manifest includes the icon files with content-hash revisions. On the next deployment, the service worker detects changed revisions and precaches new icons. But devices that already installed the PWA to their home screen cached the old icons at the OS level. The home screen icon does not update. The old SVG placeholder (or its PNG rendering) persists until the user removes and re-adds the PWA.

**Why it happens:**
PWA icons are cached at the OS level when the user installs the app to home screen. Unlike service worker caches, OS-level icon caches are not controlled by the web app. Android updates PWA icons periodically (24-72 hours after manifest change detected), but iOS never updates them without a full remove-and-reinstall. The current `vite-plugin-pwa` config includes icons in the precache manifest, but that only controls service worker cache, not the OS icon cache.

**How to avoid:**
Accept this as a known PWA limitation. Do not use a different filename for the new icons (keep `pwa-192x192.png` and `pwa-512x512.png`). This way, the manifest URLs stay the same and the OS is more likely to pick up the content change on Android. Inform pilots that they may need to remove and re-add the PWA on iOS to see the new icon. Do not change icon filenames or add new icon entries to the manifest, as that creates a manifest diff that some browsers interpret as a "new app" and prompt re-installation. Test on the pilot's actual device (likely Android) before declaring complete.

**Warning signs:**
Home screen icon still shows the old SVG-rendered placeholder after deployment. Manifest comparison between old and new builds shows different icon `src` paths (bad) instead of same paths with different content (good).

**Phase to address:**
PWA icons phase. This is a test-on-device verification step, not a code fix.

---

### Pitfall 7: IndexedDB Schema Version Mismatch After Adding New Stores

**What goes wrong:**
The dead letter store (from Pitfall 2 fix) or any new IndexedDB object store requires bumping `DB_VERSION` from 1 to 2 in `db.ts`. If the version bump is deployed but the `onupgradeneeded` handler does not account for upgrading from v1 to v2 (only creates new stores, does not recreate existing ones), existing pilot devices with v1 databases hit the upgrade path. If the upgrade handler has a bug, the database open fails silently and all offline functionality breaks. The pilot sees an empty mission list and cannot log flights.

**Why it happens:**
IndexedDB version upgrades are destructive if mishandled. The `onupgradeneeded` handler runs once per version transition. The current handler (db.ts lines 34-48) uses `if (!db.objectStoreNames.contains(...))` guards, which is correct for idempotent upgrades. But developers often forget to test the upgrade path from v1 to v2 and only test fresh installs (which always work because all stores are created from scratch).

**How to avoid:**
Always test the upgrade path on a device that has v1 data in IndexedDB. Create a test script that populates v1 stores with sample data, then loads the v2 code and verifies (1) the upgrade handler runs, (2) existing data is preserved, (3) new stores are created, and (4) all queries work. Keep the `if (!db.objectStoreNames.contains(...))` pattern for each new store. Never delete and recreate existing stores in an upgrade handler.

**Warning signs:**
`indexedDB.open()` promise rejects on devices that had the old version. Console shows "VersionError" or "AbortError" related to IndexedDB. Offline features work on fresh installs but break on existing pilot devices.

**Phase to address:**
Offline queueing phase. Test upgrade path before deploying any IndexedDB schema changes.

---

### Pitfall 8: Square Sandbox vs Production Environment Switch Breaks All Existing Invoice References

**What goes wrong:**
Development and testing use Square sandbox (`connect.squareupsandbox.com`). When switching to production (`connect.squareup.com`), all existing `square_invoice_id` values in the `payments` table are sandbox IDs. The production webhook handler receives production event IDs that do not match any sandbox IDs in the database. No payments are ever confirmed. Meanwhile, if the old sandbox webhook URL is still registered, sandbox events continue arriving and being processed against stale data.

**Why it happens:**
Square sandbox and production are completely separate environments with separate IDs, separate webhooks, and separate customers. There is no migration path. The `SQUARE_ENVIRONMENT` env var in the edge function controls which API base URL is used, but existing database rows created during sandbox testing carry sandbox IDs that are meaningless in production.

**How to avoid:**
Before switching to production: (1) truncate or archive all sandbox payment rows from the `payments` table, (2) update all environment variables in Supabase dashboard (access token, location ID, webhook signature key, environment flag), (3) register the production webhook URL in Square's production dashboard (separate from sandbox dashboard), (4) deregister or disable the sandbox webhook subscription, (5) run one test deposit invoice through production before going live with real clients. Never mix sandbox and production data in the same `payments` table rows.

**Warning signs:**
`SQUARE_ENVIRONMENT` is still "sandbox" in production edge function config. `payments` table contains rows with sandbox `square_invoice_id` values. Production webhook events return "no matching payment" in edge function logs.

**Phase to address:**
Billing flow phase (go-live cutover). Create a production cutover checklist as part of the deployment phase.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Watermark images client-side with Canvas API | No edge function needed | Client can disable JS, inspect network tab for unwatermarked source, and watermark quality varies by device | Never for payment-gated content |
| Store originals and previews in the same storage bucket | Simpler file management | Clients can guess original URLs from preview URLs; one access policy for both | Never |
| Skip dead letter queue for failed sync items | Simpler sync engine | Permanent silent data loss for flight logs that fail to sync | Never |
| Use same PWA icon file as maskable and regular purpose | One fewer asset to maintain | Maskable icons need extra padding (safe zone); regular icons do not. Using one for both means the regular icon has too much padding or the maskable icon gets clipped | Only if the design accounts for both by having content within the inner 80% circle |
| Hard-code 50% deposit calculation in the edge function | Matches current business rule | Any deposit percentage change requires edge function redeployment | Acceptable for now (business says fixed 50%) but add the percentage to a config table for future flexibility |
| Deploy to Vercel without custom domain first, add domain later | Faster initial deployment | PWA manifest and service worker cache the `.vercel.app` domain; changing to `trestle.sentinelaerial.com` later forces all pilots to reinstall the PWA | Never. Configure the custom domain before any pilot installs the PWA |
| Use `compatible_aircraft` as a free-text comma-separated string | Flexible input | No referential integrity; typos create ghost aircraft; cannot query "all accessories for Matrice 4E" reliably | Only in MVP. Migrate to a junction table or validated enum before fleet grows |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Square Invoices API | Using API version from 2024 (`2024-01-18` in current code) when newer versions have breaking changes or new required fields | Pin `Square-Version` header and test before upgrading; current version works but check Square changelog before adding balance invoice support |
| Square webhook | Returning non-200 status codes for unhandled event types | Always return 200 for events you do not process (current code does this correctly); Square retries non-200 responses up to 18 times over 3 days |
| Square webhook | Not verifying webhook signature in sandbox because "it's just testing" | Always verify (current code does this correctly); skipping in sandbox means production verification code is untested |
| Supabase Storage | Using `createSignedUrl` with default 1-hour expiry for deliverable download links | Set expiry based on use case: 15 minutes for preview thumbnails in balance email, 24 hours for final delivery links; too short = broken links, too long = content leakage |
| Supabase Storage | Uploading watermarked previews from the browser (client-side) | Generate watermarks server-side in an edge function; client-side watermarking leaks the unwatermarked source in the upload request |
| Resend email | Embedding base64-encoded images directly in the email body | Use hosted image URLs in emails; base64 images bloat email size and many email clients block them; link to Supabase Storage signed URLs instead |
| Vercel SPA | Not including `vercel.json` with SPA rewrite for the subdomain project | Both the main domain and subdomain need their own `vercel.json` with `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` |
| Vercel subdomain | Setting `scope` in PWA manifest to `/` while only the pilot portal routes matter | Set `scope` to `/pilot` and `start_url` to `/pilot` for the standalone pilot PWA to prevent the PWA from capturing navigation to admin routes |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Watermarking full-resolution drone images (20-50 MB each) in an edge function | Edge function times out (Supabase 150-second wall clock limit) or runs out of memory (150 MB on free, 256 MB on Pro) | Resize images to preview dimensions (800-1200px width) BEFORE watermarking; never watermark the full-resolution file | Any image over 10 MB |
| Service worker precaches all static assets including aerial portfolio images | PWA install takes 30+ seconds on mobile data; storage quota exceeded on low-end devices | Exclude portfolio images from precache; use runtime caching with `NetworkFirst` for images | When total precache exceeds 20 MB |
| IndexedDB sync queue grows unbounded during extended offline periods | `getAll()` on the sync queue returns thousands of items; UI freezes during sync attempt | Process queue in batches of 10-20 items; add a queue size cap with oldest-first eviction after warning the user | After 100+ items in queue during multi-day offline |
| Loading all accessories in a single query for the fleet overview | Acceptable now with <50 items; will not scale if accessories are per-mission tracked with usage history | Add pagination to accessories query; index on `status` and `type` columns | After 200+ accessory records (unlikely near-term but design for it) |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Square access token in client-side environment variable (VITE_ prefix exposes to browser) | Token grants full Square API access: read transactions, issue refunds, create invoices | Square tokens must only exist in Supabase edge function environment variables, never in `VITE_*` vars |
| Watermarked preview URLs are permanent (no expiry) | Once shared, previews circulate indefinitely; client forwards to competitors as "good enough" quality | Use signed URLs with 48-hour expiry for preview thumbnails; regenerate if client requests extension |
| No RLS policy on accessories table for pilot role | Pilots can read all accessories (acceptable) but might also update or delete (not acceptable for shared fleet) | Add RLS: pilots can SELECT all accessories; only admin can INSERT, UPDATE, DELETE |
| Balance payment link in email is a permanent Square URL | Link can be reused after payment for dispute claims or forwarded to wrong person | Square invoice URLs become inactive after payment; verify this behavior in sandbox. No action needed if Square handles it (it does) |
| PWA installed on pilot's personal device stores offline data with no encryption | If device is lost, mission data, client addresses, and flight logs are accessible | IndexedDB data is sandboxed to the origin and requires unlocking the device; acceptable risk for this scale. Add a "clear local data" button in pilot settings for device decommissioning |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Balance due email has no preview thumbnails, just a payment link | Client does not trust the request; feels like a phishing email; delays payment | Include 2-3 inline watermarked preview thumbnails so the client sees their actual property photos before paying |
| Sync status indicator only shows while actively syncing (disappears when idle) | Pilot has no confidence that data was saved; checks and rechecks | Show a persistent "last synced: 3 min ago" timestamp, not just a spinner during sync |
| No confirmation after flight log is queued offline | Pilot submits flight log, nothing visible happens (no toast, no status change) | Show an immediate toast: "Flight log saved offline. Will sync when connected." and add a visual badge to the mission card |
| Accessories list has no search or filter | Pilot scrolls through all accessories to find the right ND filter for the Matrice | Add type filter (already have categories) and a search input; pilot is often in the field with gloves, keep touch targets large |
| PWA update prompt appears during active mission logging | Pilot taps "Update" mid-flight-log and loses unsaved form data | Defer update prompt until pilot is on the dashboard (no active form); use `registerType: "prompt"` (already configured) but suppress during form entry |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Deposit invoice flow:** Reverse the write order (Supabase row first, then Square API call). Simulate a Square API failure after Supabase insert and confirm cleanup works. Simulate a Supabase insert failure after Square publish and confirm the edge function logs contain reconciliation data.
- [ ] **Balance invoice flow:** Trigger a balance email for a job with zero uploaded deliverables. Confirm the email is blocked (not sent with broken images).
- [ ] **Watermarked previews:** Download a preview image and inspect EXIF data. Confirm no GPS coordinates from the original are retained. Attempt to access the original file URL from the preview URL pattern. Confirm access is denied.
- [ ] **Offline flight log sync:** Put the device in airplane mode. Submit a flight log. Close the browser entirely. Reopen. Confirm the flight log is still in the sync queue. Go online. Confirm it syncs successfully and appears in Supabase.
- [ ] **Offline sync failure path:** Submit a flight log with a deliberately invalid payload (wrong column name). Let sync fail 5 times. Confirm the item appears in a dead letter queue, NOT silently deleted. Confirm the pilot UI shows a warning.
- [ ] **PWA icons:** Install the PWA on an Android device. Verify the home screen icon is the production icon, not the SVG placeholder. Check both the home screen icon and the splash screen.
- [ ] **Standalone Vercel deployment:** Navigate to `trestle.sentinelaerial.com`. Confirm the login page loads. Log in as pilot. Confirm auth works. Navigate to `trestle.sentinelaerial.com/admin`. Confirm it redirects to login or shows unauthorized (admin routes should not be accessible on the pilot subdomain, or should work if intended).
- [ ] **Supabase auth redirect URLs:** Check Supabase dashboard auth settings. Confirm `trestle.sentinelaerial.com` is in the allowed redirect URLs list. Test password reset flow from the subdomain.
- [ ] **Square production cutover:** Confirm `SQUARE_ENVIRONMENT` is "production" in edge function config. Confirm production webhook URL is registered in Square production dashboard. Confirm sandbox webhook is deregistered. Confirm no sandbox `square_invoice_id` values exist in the `payments` table.
- [ ] **Accessories CRUD:** Delete an accessory that is referenced by a `mission_equipment.accessory_ids` array. Confirm the deletion either cascades (removes from array) or is blocked (foreign key constraint). Currently `accessory_ids` is a UUID array with no foreign key enforcement, so deletion will leave orphaned IDs in mission records.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orphaned Square invoice (paid but no Supabase record) | MEDIUM | Query Square List Invoices API for the affected time window; manually create the `payments` row with `status: paid`; send the delayed receipt email; verify deliverables were not auto-released (they should not have been without the Supabase record) |
| Silent flight log data loss from sync queue | HIGH | Data is permanently lost if no dead letter queue exists. Recovery requires the pilot to re-enter the flight log from memory or paper records. If dead letter queue exists: fix the root cause, then retry the dead letter items |
| Client downloaded unwatermarked originals before payment | HIGH | Cannot un-download files. Revoke the storage URL immediately. Contact client. Consider it a business loss. Fix storage bucket policies to prevent recurrence |
| PWA installed with SVG placeholder icons | LOW | Inform pilots to remove and reinstall the PWA. On Android, the icon may self-update within 72 hours. On iOS, removal and reinstallation is the only path |
| Auth redirect URL missing for subdomain | LOW | Add the URL to Supabase auth dashboard. No data loss; pilots just cannot log in until fixed. Takes 30 seconds to resolve |
| Sandbox data in production payments table | MEDIUM | Archive or delete all rows where `square_invoice_id` matches sandbox format. No real client data is affected since sandbox invoices were never sent to real clients. Re-run any production invoices that were blocked by the stale data |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Orphaned Square invoice | Billing flow (deposit) | Write order reversed; Square API failure simulation passes; reconciliation function exists |
| Silent sync data loss | Offline queueing | Dead letter store exists; pilot UI shows warning; admin can view dead letter items |
| Balance email before deliverables ready | Billing flow (balance) | Balance email blocked when no deliverables exist in storage; tested with empty storage path |
| Watermarked preview URL exposes originals | Watermarking/delivery | Originals in private bucket; preview URL pattern does not reveal original path; access test fails |
| Auth session not shared across domains | Deployment | Pilot logs in directly at subdomain; Supabase redirect URLs updated; tested end-to-end |
| PWA icon cache stale | PWA icons | Tested on physical device; filenames unchanged; manifest diff is content-only |
| IndexedDB schema upgrade breaks | Offline queueing | Upgrade from v1 to v2 tested on device with existing data; all stores accessible post-upgrade |
| Square sandbox to production cutover | Deployment | Production checklist completed; sandbox data archived; production webhook registered and tested |
| Accessories orphaned IDs in mission_equipment | Accessories CRUD | Deletion handler cleans up `accessory_ids` arrays or blocks deletion; tested with referenced accessory |

---

## Sources

- Square Invoices API documentation: https://developer.squareup.com/docs/invoices-api/overview
- Square webhooks best practices: https://developer.squareup.com/docs/webhooks/best-practices
- Square idempotency patterns: https://developer.squareup.com/docs/build-basics/common-api-patterns/idempotency
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase edge function limits (150s wall clock, 150MB memory free tier): https://supabase.com/docs/guides/functions/limits
- IndexedDB upgrade handling (MDN): https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/upgradeneeded_event
- PWA icon caching behavior (web.dev): https://web.dev/learn/pwa/update
- Vite PWA plugin configuration: https://vite-pwa-org.netlify.app/guide/
- Vercel SPA deployment with rewrites: https://vercel.com/docs/projects/project-configuration#rewrites
- Supabase auth redirect URL configuration: https://supabase.com/docs/guides/auth/redirect-urls
- Service worker precache size limits: https://developer.chrome.com/docs/workbox/modules/workbox-precaching
- Existing codebase: `src/lib/sync/db.ts`, `src/lib/sync/sync-engine.ts`, `supabase/functions/create-deposit-invoice/index.ts`, `supabase/functions/square-webhook/index.ts`

---

*Pitfalls research for: v2.0 billing, equipment, offline sync, PWA icons, and standalone deployment added to F&H drone operations platform*
*Researched: 2026-03-05*
