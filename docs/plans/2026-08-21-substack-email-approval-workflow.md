# Substack Email Approval Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a secure email review workflow that versions each Sentinel Aerial Inspections Substack draft, accepts revision requests, requires an authenticated confirmation, publishes the exact approved version through the logged in Substack browser, verifies the live result, and emails the public link.

**Architecture:** The Faith and Harmony React app hosts the review page. Supabase stores immutable versions and audit events, while authenticated Edge Functions control human review actions and Resend email delivery. A deterministic local command line worker packages Markdown drafts and manages queue state. A Codex heartbeat handles editorial revisions and the browser portion after the deterministic worker reports the next allowed action.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Supabase Postgres, Supabase Auth with Google, Supabase Edge Functions on Deno, Resend, Node.js scripts, Codex heartbeat automation, and Chrome control.

---

## Preconditions and fixed decisions

1. Work in `D:\Projects\FaithandHarmony-substack-review` on `feat/substack-approval-workflow`.

2. Preserve all changes in `D:\Projects\FaithandHarmony`. They belong to other work.

3. Use `dradamopierce@gmail.com` as the only human reviewer.

4. Use Resend to deliver messages to Gmail. Do not require the Gmail connector.

5. Do not apply migrations, deploy functions, deploy Vercel, update active automations, send a real review email, or publish to Substack until Dr. Pierce approves activation.

6. The first browser test uses a dummy article and stops before the final Substack Publish control.

7. The local Supabase reset is already known to fail on unrelated historic migrations. Do not treat that failure as evidence about this feature and do not repair it in this branch.

8. Follow @test-driven-development for every code task and @verification-before-completion before reporting implementation complete.

## Task 1: Add the review domain contract

**Files:**

1. Create `supabase/functions/substack-review/domain.ts`

2. Create `supabase/functions/substack-review/domain.spec.ts`

**Step 1: Write the failing domain tests**

Cover exact reviewer normalization, legal state transitions, illegal transitions, token hashing, content hashing, token expiry, stale version detection, and confirmation idempotency.

```ts
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  APPROVED_REVIEW_EMAIL,
  assertTransition,
  hashReviewToken,
  normalizeEmail,
} from "./domain.ts";

Deno.test("normalizes and accepts only the approved reviewer", () => {
  assertEquals(normalizeEmail(" DrAdamOPierce@GMAIL.com "), APPROVED_REVIEW_EMAIL);
});

Deno.test("rejects pending review to published", () => {
  assertRejects(
    () => Promise.resolve(assertTransition("pending_review", "published")),
    Error,
    "Illegal review transition",
  );
});

Deno.test("hashes a token without returning the raw token", async () => {
  const digest = await hashReviewToken("raw-secret-token");
  assertEquals(digest.length, 64);
  assertEquals(digest.includes("raw-secret-token"), false);
});
```

**Step 2: Run the tests and verify failure**

Run:

```powershell
deno test supabase/functions/substack-review/domain.spec.ts
```

Expected: FAIL because `domain.ts` does not exist.

**Step 3: Implement the minimal domain module**

Define these exported values and functions.

```ts
export const APPROVED_REVIEW_EMAIL = "dradamopierce@gmail.com";

export type ReviewStatus =
  | "pending_review"
  | "changes_requested"
  | "superseded"
  | "approved"
  | "publishing"
  | "published"
  | "verification_failed"
  | "expired";

const LEGAL_TRANSITIONS: Readonly<Record<ReviewStatus, readonly ReviewStatus[]>> = {
  pending_review: ["changes_requested", "approved", "expired", "superseded"],
  changes_requested: ["superseded"],
  superseded: [],
  approved: ["publishing", "superseded"],
  publishing: ["published", "verification_failed"],
  published: [],
  verification_failed: ["publishing"],
  expired: [],
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function assertTransition(from: ReviewStatus, to: ReviewStatus): void {
  if (!LEGAL_TRANSITIONS[from].includes(to)) {
    throw new Error(`Illegal review transition: ${from} to ${to}`);
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const hashReviewToken = sha256Hex;
export const hashReviewContent = sha256Hex;
```

Add pure helpers for `isExpired`, `isActiveVersion`, and idempotent approval result selection.

**Step 4: Run the tests and verify success**

Run:

```powershell
deno test supabase/functions/substack-review/domain.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add -- supabase/functions/substack-review/domain.ts supabase/functions/substack-review/domain.spec.ts
git commit -m "feat: add Substack review domain rules"
```

## Task 2: Create the approval schema and atomic database operations

**Files:**

1. Create `supabase/migrations/20260821150000_substack_review_workflow.sql`

2. Create `scripts/substack-review/migration-contract.spec.mjs`

**Step 1: Write a failing migration contract test**

The Node test reads the migration and asserts that it includes both tables, row level security, service role policies, no authenticated table policy, unique draft version and token hash constraints, the publication claim function, and revoked public execution.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = new URL(
  "../../supabase/migrations/20260821150000_substack_review_workflow.sql",
  import.meta.url,
);

test("migration keeps review tables private", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /alter table public\.substack_review_versions enable row level security/i);
  assert.match(sql, /to service_role/i);
  assert.doesNotMatch(sql, /to authenticated/i);
  assert.match(sql, /revoke all on function public\.claim_substack_review_publication/i);
});
```

**Step 2: Run the test and verify failure**

Run:

```powershell
node --test scripts/substack-review/migration-contract.spec.mjs
```

Expected: FAIL because the migration does not exist.

**Step 3: Write the migration**

Create `substack_review_versions` with these required columns.

```sql
create table public.substack_review_versions (
  id uuid primary key default gen_random_uuid(),
  draft_id text not null,
  version integer not null check (version > 0),
  status text not null default 'pending_review' check (
    status in (
      'pending_review', 'changes_requested', 'superseded', 'approved',
      'publishing', 'published', 'verification_failed', 'expired'
    )
  ),
  selected_headline text not null,
  subtitle text not null,
  article_markdown text not null,
  notes_teaser text not null,
  subscribe_call text not null,
  source_path text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  review_email text not null check (lower(review_email) = 'dradamopierce@gmail.com'),
  expires_at timestamptz not null,
  requested_changes text,
  requested_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  claimed_at timestamptz,
  claimed_by text,
  published_at timestamptz,
  published_url text,
  rss_guid text,
  provider_message_id text,
  review_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_id, version)
);
```

Create `substack_review_events` with version identifier, event type, actor email, safe metadata JSON, and timestamp. Make the table append only by exposing insert and select to the service role while granting no update or delete policy.

Enable row level security on both tables. Grant direct table access only to `service_role`. Revoke all access from `anon` and `authenticated`.

Add a partial unique index so one draft has at most one row in `pending_review`, `approved`, `publishing`, or `verification_failed`.

Add `claim_substack_review_publication(worker_id text)` as a security definer function. It selects one approved row with `for update skip locked`, changes it to `publishing`, records claim identity and time, and returns the claimed row. Set a fixed search path. Revoke execution from public, anon, and authenticated. Grant execution only to service role.

Add an update trigger that permits only legal status changes and prevents mutation of reviewed content fields after insert. Permit `requested_changes`, approval fields, claim fields, publication fields, email delivery fields, and error fields only for their matching transitions.

**Step 4: Run the static migration test**

Run:

```powershell
node --test scripts/substack-review/migration-contract.spec.mjs
```

Expected: PASS.

Do not run `supabase db reset` because the repository has unrelated replay failures.

**Step 5: Commit**

```powershell
git add -- supabase/migrations/20260821150000_substack_review_workflow.sql scripts/substack-review/migration-contract.spec.mjs
git commit -m "feat: add Substack review workflow schema"
```

## Task 3: Build the authenticated human review Edge Function

**Files:**

1. Create `supabase/functions/substack-review/handler.ts`

2. Create `supabase/functions/substack-review/handler.spec.ts`

3. Create `supabase/functions/substack-review/index.ts`

4. Modify `supabase/config.toml`

**Step 1: Write failing handler tests**

Use injected `authenticate`, `findVersionByTokenHash`, `updateVersion`, and `appendEvent` dependencies. Test these cases.

1. Missing JWT returns 401.

2. Invalid JWT returns 401.

3. A valid user with the wrong email returns 403 before loading article content.

4. An expired token returns 410.

5. A superseded token returns 409.

6. `load` returns only the active version.

7. `request_changes` trims text, rejects blank text, stores it as data, and does not approve.

8. `approve` rejects missing confirmation.

9. `approve` rejects a stale version or content hash.

10. A duplicate approval returns the existing approved status without another event.

11. Unsupported methods and actions fail safely.

**Step 2: Run the tests and verify failure**

Run:

```powershell
deno test supabase/functions/substack-review/handler.spec.ts
```

Expected: FAIL because the handler does not exist.

**Step 3: Implement the handler**

Expose one injectable entry point.

```ts
export type ReviewAction =
  | { action: "load"; token: string }
  | { action: "request_changes"; token: string; changes: string }
  | {
      action: "approve";
      token: string;
      version: number;
      content_hash: string;
      confirm_publish: true;
    };

export async function handleSubstackReview(
  req: Request,
  deps: ReviewDependencies,
): Promise<Response> {
  // Handle OPTIONS, require POST, authenticate the JWT, require the exact
  // reviewer email, hash the token, load the version, validate expiry and
  // active state, then perform the selected action.
}
```

The real adapter creates a user scoped Supabase client to call `auth.getUser()` and a service role client for the private tables. Derive identity only from `auth.getUser()`.

Use compare and set updates. Approval must include filters for row identifier, `pending_review` status, version, and content hash. If zero rows update, reload and return either the idempotent approved result or a conflict.

Add `[functions.substack-review] verify_jwt = true` to `supabase/config.toml`. The function must still validate the user in code.

**Step 4: Run the tests**

Run:

```powershell
deno test supabase/functions/substack-review/domain.spec.ts supabase/functions/substack-review/handler.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add -- supabase/functions/substack-review supabase/config.toml
git commit -m "feat: add secure Substack review actions"
```

## Task 4: Build the review and publication email service

**Files:**

1. Create `supabase/functions/send-substack-review-email/template.ts`

2. Create `supabase/functions/send-substack-review-email/template.spec.ts`

3. Create `supabase/functions/send-substack-review-email/handler.ts`

4. Create `supabase/functions/send-substack-review-email/handler.spec.ts`

5. Create `supabase/functions/send-substack-review-email/index.ts`

6. Modify `supabase/config.toml`

**Step 1: Write failing template and handler tests**

Test review email destination, headline, subtitle, full preview, draft identifier, version, both links, explicit public and subscriber delivery warning, HTML escaping, raw token exclusion from logs, published link email, Resend failure handling, and database update only after a successful send.

**Step 2: Run the tests and verify failure**

Run:

```powershell
deno test supabase/functions/send-substack-review-email
```

Expected: FAIL because the files do not exist.

**Step 3: Implement the email templates**

Use one builder for review mail and one for verified publication mail.

```ts
const REVIEW_TO = "dradamopierce@gmail.com";

export function buildReviewEmail(
  version: ReviewEmailVersion,
  rawToken: string,
  reviewBaseUrl: string,
): EmailPayload {
  const base = `${reviewBaseUrl}/substack/review/${encodeURIComponent(rawToken)}`;
  return {
    to: REVIEW_TO,
    subject: `Review Substack draft: ${version.selected_headline}`,
    html: renderReviewHtml(version, {
      approveUrl: `${base}?intent=approve`,
      changesUrl: `${base}?intent=changes`,
    }),
  };
}
```

Escape every draft field before inserting it into HTML. Render article Markdown as safe plain text paragraphs for the first version. Do not introduce a permissive Markdown HTML renderer.

**Step 4: Implement the service authenticated handler**

Require `Authorization: Bearer <service role key>` and compare the full value to the environment service role key. Reject all other callers. Accept only `{ action: "review", version_id, token }` or `{ action: "published", version_id }`.

For review mail, hash the supplied raw token and prove it matches the stored token hash. Load all email content from the database row. Never accept article content from the request.

For publication mail, require stored `published` status and `published_url`.

Use Resend. Record the provider message identifier and timestamp only after a successful send. Return 502 when Resend returns an error.

Add `[functions.send-substack-review-email] verify_jwt = false` to config because the handler performs exact service credential validation itself.

**Step 5: Run the tests**

Run:

```powershell
deno test supabase/functions/send-substack-review-email
```

Expected: PASS.

**Step 6: Commit**

```powershell
git add -- supabase/functions/send-substack-review-email supabase/config.toml
git commit -m "feat: send Substack review workflow emails"
```

## Task 5: Add the secure review page

**Files:**

1. Create `src/lib/substackReview.ts`

2. Create `src/lib/substackReview.spec.ts`

3. Create `src/pages/SubstackReview.tsx`

4. Create `src/pages/SubstackReview.spec.tsx`

5. Modify `src/App.tsx`

**Step 1: Write failing API helper tests**

Test token extraction, safe intent parsing, exact reviewer comparison, request payloads, session headers, and error mapping for 401, 403, 409, and 410.

**Step 2: Run the helper tests and verify failure**

Run:

```powershell
npm test -- src/lib/substackReview.spec.ts
```

Expected: FAIL because the module does not exist.

**Step 3: Implement the API helper**

Use the existing typed Supabase client and invoke `substack-review`. Do not query the private tables from the browser.

```ts
export const REVIEW_EMAIL = "dradamopierce@gmail.com" as const;

export async function loadSubstackReview(token: string) {
  return invokeReview({ action: "load", token });
}

export async function requestSubstackChanges(token: string, changes: string) {
  return invokeReview({ action: "request_changes", token, changes });
}

export async function approveSubstackReview(input: ApproveInput) {
  return invokeReview({ ...input, action: "approve", confirm_publish: true });
}
```

**Step 4: Write failing page tests**

Mock auth and API functions. Cover signed out Google button, wrong account rejection, hidden content before authorization, pending review display, request changes form, separate confirmation screen, exact version and hash display, duplicate approved state, published link, expired state, and no state mutation on initial render.

**Step 5: Run the page tests and verify failure**

Run:

```powershell
npm test -- src/pages/SubstackReview.spec.tsx
```

Expected: FAIL because the page does not exist.

**Step 6: Implement the page**

Add a Google sign in control using Supabase OAuth.

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: window.location.href,
    queryParams: {
      login_hint: REVIEW_EMAIL,
      prompt: "select_account",
    },
  },
});
```

After authentication, reject any user whose normalized email differs from the approved reviewer. Do not render the draft for that user.

Require the reviewer to select `Approve and Publish`, view the confirmation state, and then press `Confirm Publish`. Display the warning that confirmation publishes immediately and emails all subscribers.

Render change request text as a controlled plain text field. Disable repeat submissions while a request is pending.

Add a lazy route in `src/App.tsx` before the catch all route.

```tsx
<Route
  path="/substack/review/:token"
  element={<ErrorBoundary><SubstackReview /></ErrorBoundary>}
/>
```

Do not wrap this route in `ProtectedRoute` because the page owns the Google sign in and wrong account states.

**Step 7: Run page and route tests**

Run:

```powershell
npm test -- src/lib/substackReview.spec.ts src/pages/SubstackReview.spec.tsx src/routes/adminRedirects.spec.tsx
```

Expected: PASS.

**Step 8: Commit**

```powershell
git add -- src/lib/substackReview.ts src/lib/substackReview.spec.ts src/pages/SubstackReview.tsx src/pages/SubstackReview.spec.tsx src/App.tsx
git commit -m "feat: add authenticated Substack review page"
```

## Task 6: Package and validate local Markdown drafts

**Files:**

1. Create `scripts/substack-review/draft.mjs`

2. Create `scripts/substack-review/draft.spec.mjs`

3. Create `scripts/substack-review/fixtures/valid-draft.md`

4. Create `scripts/substack-review/fixtures/unverified-draft.md`

**Step 1: Write failing parser tests**

Use the current local draft structure with YAML front matter and sections named `Headline options`, `Selected subtitle`, `Article`, `Subscribe`, `Substack Notes teaser`, and `Verification notes`.

Test selected headline extraction, subtitle extraction, article extraction, teaser extraction, subscribe call extraction, word count, unresolved `[VERIFY]` detection, required source metadata, banned em dash detection, banned rhetorical opening detection, stable normalized content hash, and refusal to package an invalid draft.

**Step 2: Run the tests and verify failure**

Run:

```powershell
node --test scripts/substack-review/draft.spec.mjs
```

Expected: FAIL because the parser does not exist.

**Step 3: Implement the parser and validator**

Do not add a YAML package. Parse only the small front matter keys needed by the worker. Keep the source path and source list for provenance.

Return this shape.

```js
{
  draftId,
  selectedHeadline,
  subtitle,
  articleMarkdown,
  notesTeaser,
  subscribeCall,
  sourcePath,
  contentHash,
  wordCount,
  sources,
}
```

Normalize line endings before hashing. Hash only the fields that will be published, in a fixed order with field labels. Do not hash verification notes or mutable file metadata.

Validation must block packaging when the draft has unresolved `[VERIFY]`, lacks sources, falls outside 900 to 1400 article words, omits required sections, contains an em dash, or contains a known prohibited construction from the editorial runbook.

**Step 4: Run the tests**

Run:

```powershell
node --test scripts/substack-review/draft.spec.mjs
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add -- scripts/substack-review/draft.mjs scripts/substack-review/draft.spec.mjs scripts/substack-review/fixtures
git commit -m "feat: validate Substack review drafts"
```

## Task 7: Build the deterministic local queue client

**Files:**

1. Create `scripts/substack-review/queue.mjs`

2. Create `scripts/substack-review/queue.spec.mjs`

3. Create `scripts/substack-review/cli.mjs`

4. Modify `package.json`

**Step 1: Write failing queue tests**

Inject a fake Supabase client and email sender. Cover creating version one, superseding the previous review before creating a new version, random token generation, token hash storage, raw token delivery only to the email call, refusal to package unresolved verification markers, listing one next action, atomic publication claim, duplicate claim protection, recording success, recording verification failure, and refusing to mark published without a valid HTTPS Substack URL.

**Step 2: Run the tests and verify failure**

Run:

```powershell
node --test scripts/substack-review/queue.spec.mjs
```

Expected: FAIL because the client does not exist.

**Step 3: Implement the queue module**

Use `@supabase/supabase-js`, `node:crypto`, and the draft module. Read credentials only from `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables.

Use `randomBytes(32).toString("base64url")` for review tokens. Store only the SHA 256 digest.

Create these operations.

```js
export async function enqueueDraft(filePath, deps) {}
export async function getNextAction(deps) {}
export async function claimApprovedVersion(workerId, deps) {}
export async function markPublished(versionId, url, rssGuid, deps) {}
export async function markVerificationFailed(versionId, message, deps) {}
```

`enqueueDraft` must supersede any open version for the same draft and insert the new version in one database function or one transaction exposed by a security definer RPC. If the migration needs a new RPC to guarantee this, add it as a new migration file. Never edit an already applied migration during later activation work.

After insertion, invoke `send-substack-review-email` with the new version identifier and raw token. If sending fails, keep the version in `pending_review`, store the error, and make the next worker run retry only the email. Do not generate another version.

**Step 4: Implement the command line interface**

Supported commands follow.

```powershell
node scripts/substack-review/cli.mjs enqueue --file <absolute-markdown-path>
node scripts/substack-review/cli.mjs next --json
node scripts/substack-review/cli.mjs claim --worker <identifier> --json
node scripts/substack-review/cli.mjs published --id <uuid> --url <https-url> --rss-guid <guid>
node scripts/substack-review/cli.mjs verification-failed --id <uuid> --message <text>
```

Print machine readable JSON to standard output and operational diagnostics to standard error. Never print raw tokens, service keys, or full article bodies.

Add package scripts.

```json
{
  "substack:review": "node scripts/substack-review/cli.mjs",
  "test:substack-review": "node --test scripts/substack-review/*.spec.mjs"
}
```

**Step 5: Run the tests**

Run:

```powershell
node --test scripts/substack-review/*.spec.mjs
```

Expected: PASS.

**Step 6: Commit**

```powershell
git add -- scripts/substack-review/queue.mjs scripts/substack-review/queue.spec.mjs scripts/substack-review/cli.mjs package.json
git commit -m "feat: add Substack review queue worker"
```

## Task 8: Add the browser publishing runbook and dry run gate

**Files:**

1. Create `docs/runbooks/substack-review-publishing.md`

2. Create `scripts/substack-review/browser-contract.spec.mjs`

**Step 1: Write a failing runbook contract test**

The test asserts that the runbook contains all required stop conditions, the exact audience and timing choices, editor parity, one final click, uncertain result verification, Posts inspection, RSS inspection, and the mandatory dry run stop.

**Step 2: Run the test and verify failure**

Run:

```powershell
node --test scripts/substack-review/browser-contract.spec.mjs
```

Expected: FAIL because the runbook does not exist.

**Step 3: Write the browser runbook**

Use @chrome:control-chrome. Before each run, query for a supported Substack connector or write API. Use Chrome only when no supported publisher exists.

The runbook must require these steps.

1. Claim one approved version through the queue client.

2. Select Chrome because the workflow depends on the existing Substack session.

3. Ask Dr. Pierce to sign in in Chrome if authentication is missing. Stop after one authentication failure.

4. Open the Substack dashboard and confirm the profile is Dr. Adam O. Pierce.

5. Create a post and insert the approved fields.

6. Read the editor content and compare its normalized content hash with the approved hash.

7. Select public, all subscribers, and immediate publication.

8. In dry run mode, stop and report readiness before the final Publish control.

9. In live mode, press the final control once.

10. If the result is uncertain, inspect Posts and RSS before any retry.

11. Verify the public URL, title, content fingerprint, and RSS entry.

12. Record success or verification failure with the queue client.

13. Confirm that the verified link email was accepted by Resend.

List every fail closed condition from the approved design.

**Step 4: Run the contract test**

Run:

```powershell
node --test scripts/substack-review/browser-contract.spec.mjs
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add -- docs/runbooks/substack-review-publishing.md scripts/substack-review/browser-contract.spec.mjs
git commit -m "docs: add guarded Substack browser publishing runbook"
```

## Task 9: Run local quality gates

**Files:**

1. Modify only files needed to correct failures caused by this feature.

**Step 1: Run Substack unit tests**

```powershell
deno test supabase/functions/substack-review supabase/functions/send-substack-review-email
node --test scripts/substack-review/*.spec.mjs
npm test -- src/lib/substackReview.spec.ts src/pages/SubstackReview.spec.tsx src/routes/adminRedirects.spec.tsx
```

Expected: PASS.

**Step 2: Run application gates**

```powershell
npm run typecheck
npm run lint
npm run build
```

Expected: Build PASS. Typecheck and lint must be classified against the baseline because the repository records preexisting failures. No new error may point to a feature file.

**Step 3: Review the diff**

```powershell
git diff origin/dev...HEAD --check
git diff origin/dev...HEAD --stat
git status --short --branch
```

Expected: No whitespace errors and no unrelated files.

**Step 4: Commit any test only correction**

```powershell
git add -- <exact-corrected-files>
git commit -m "fix: harden Substack approval workflow"
```

## Task 10: Prepare activation without changing live systems

**Files:**

1. Create `docs/runbooks/substack-review-activation.md`

2. Modify `C:\Users\redle.SOULAAN\obsidian-dev\projects\sentinel-aerial\substack-content-automation.md`

3. Modify `C:\Users\redle.SOULAAN\obsidian-dev\last-session.md`

**Step 1: Write the activation checklist**

Include exact commands and expected results for these approval gated operations.

1. Run `supabase migration list` and confirm there is no timestamp conflict.

2. Review `supabase db push --dry-run` output.

3. Apply only the new migration after explicit approval.

4. Deploy `substack-review` and `send-substack-review-email` after explicit approval.

5. Confirm Google authentication is enabled and the production redirect URL includes the review route origin.

6. Confirm `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUBSTACK_REVIEW_BASE_URL`, and approved sender identity exist without printing their values.

7. Deploy the Vercel app after explicit approval.

8. Verify the production review route and wrong account behavior.

9. Create the fifteen minute review worker heartbeat in paused state.

10. Update the existing Monday and Thursday automation so a valid draft is enqueued after creation.

11. Run the dummy browser test and stop before final Publish.

12. Ask for separate approval before the first live post.

**Step 2: Draft the automation definitions**

Preserve the existing automation schedule and traction rules. Add packaging and enqueueing only after local draft validation passes. Keep the existing rule that publication requires secure approval.

Create a second heartbeat with this schedule.

```text
RRULE:FREQ=MINUTELY;INTERVAL=15
```

The worker prompt must run `next --json`, process one action, and return a quiet heartbeat when no action exists. For changes, it must treat the request as editorial data, update the canonical Markdown, validate, enqueue a new version, and send another review email. For approval, it must follow the browser runbook.

Use `codex_app__automation_update`. Do not edit the automation TOML by hand.

**Step 3: Update the Obsidian operating record**

Record the approved architecture, repository branch, local verification status, inactive deployment state, and remaining approval gates. Preserve the earlier draft only rule as history and state that secure approval supersedes it only after activation.

**Step 4: Commit repository documentation**

```powershell
git add -- docs/runbooks/substack-review-activation.md
git commit -m "docs: add Substack approval activation checklist"
```

Do not commit Obsidian vault files to the application repository.

## Task 11: Activation after explicit approval

**Files:**

1. No new source files expected.

**Step 1: Recheck live migration state**

Run `supabase migration list` against project `qjpujskwqaehxnqypxzu`. Stop on authentication failure or timestamp conflict.

**Step 2: Apply the migration and verify live schema**

Apply only after Dr. Pierce approves. Query the live database for tables, row level security, grants, constraints, and function execution privileges. State that verification came from live Supabase.

**Step 3: Deploy the Edge Functions and verify authentication**

Deploy only after approval. Verify missing JWT, wrong user, invalid token, and service email authentication failures before any success path.

**Step 4: Deploy the Vercel app and verify the review page**

Deploy only after approval. Test the production route, Google authentication, exact account rejection, initial GET safety, and mobile layout.

**Step 5: Create or update automations**

Use `codex_app__automation_update`. Keep the new fifteen minute worker paused until the browser dry run passes.

**Step 6: Run the dummy end to end test**

Create a dummy version, send one review email to Dr. Pierce, test wrong account, expired token, reused token, revision invalidation, duplicate click, and logout. Approve the dummy record, open Substack, insert it, verify parity and audience controls, and stop before the final Publish control.

Delete or expire the dummy database row through a reversible status change. Do not publish it.

**Step 7: Enable the worker**

Enable the fifteen minute heartbeat only after the dummy test passes and Dr. Pierce approves activation.

**Step 8: First live publication**

Enqueue the selected real draft only after it has no unresolved `[VERIFY]` markers. Dr. Pierce reviews and confirms through the page. The worker publishes once, verifies the post and RSS, records the live URL, and sends the verified link email.

**Step 9: Final evidence**

Report the live database checks, deployed function versions, Vercel deployment URL, automation identifiers and schedules, dummy dry run stop evidence, first live post URL if authorized, RSS verification, and email provider message identifiers. Do not claim any live result without direct evidence.
