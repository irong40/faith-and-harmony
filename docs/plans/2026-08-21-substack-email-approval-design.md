# Substack Email Approval Workflow Design

Date: August 21, 2026

Status: Approved

Owner: Dr. Adam O. Pierce

## Purpose

This workflow turns each scheduled Sentinel Aerial Inspections Substack draft into a controlled review and publishing process.

The system emails the draft to `dradamopierce@gmail.com`. Dr. Pierce can request revisions or open a secure approval page. A revision creates a new version and a new review email. An approval requires a second confirmation before the local publisher opens Substack and publishes the exact approved version.

The workflow publishes only after explicit approval. It never treats opening an email, loading an image, or following the first link as approval.

## Goals

1. Send every scheduled draft to Dr. Pierce for review.

2. Provide clear actions for requesting changes and approving publication.

3. Require a separate confirmation before publication.

4. Bind approval to one exact draft version and content hash.

5. Publish immediately to the public Substack and email all subscribers after approval.

6. Verify the live post and RSS feed before reporting success.

7. Send a final email with the verified live link.

8. Fail closed whenever identity, content, session, or publication state is uncertain.

## Non goals

1. The system will not bypass Substack login or use an unofficial write API.

2. The system will not publish from the first link in an email.

3. The system will not publish a draft with unresolved `[VERIFY]` markers.

4. The system will not accept approval from any address other than `dradamopierce@gmail.com`.

5. The system will not interpret change request text as workflow instructions, credentials, or authority to publish.

6. The first end to end test will not press the final Substack Publish control.

## Approved workflow

The existing Monday and Thursday draft automation creates or updates a local Markdown draft.

The workflow then follows this sequence.

`Draft -> Validate -> Email -> Review -> Confirm -> Publish -> Verify -> Notify`

### Review email

The review email contains the selected headline, subtitle, full article preview, Substack Notes teaser, draft identifier, version number, and an explicit publication notice.

The notice states that confirmation will publish the post publicly and email all Substack subscribers immediately.

The email contains two actions.

1. `Approve and Publish` opens the secure review page. It does not change workflow state.

2. `Request Changes` opens the same secure review page with the change request form selected. It does not change workflow state.

Resend sends the email to `dradamopierce@gmail.com`. The Gmail connector is not required because Gmail is the destination rather than the sending service.

### Secure review page

The Faith and Harmony Vercel app hosts `/substack/review/:token`.

The page requires Supabase authentication through Google. The returned authenticated email must equal `dradamopierce@gmail.com` after case normalization. Any other account receives no draft content and no workflow access.

The raw token remains in the browser link. The database stores only its SHA 256 hash. The initial page load performs no write.

After authentication, the page calls the review Edge Function to load the active version. The Edge Function validates the user, token hash, expiry, version status, and content hash before returning the article.

### Request changes

Dr. Pierce enters revision notes and submits them.

The Edge Function records the notes as editorial data, changes the active version to `changes_requested`, and writes an audit event. The submission cannot select a publishing action.

The local review worker checks for change requests every fifteen minutes. It updates the canonical Markdown draft, reruns article checks, creates the next immutable version, invalidates every earlier token, and sends a new review email.

The article checks cover evidence markers, required deliverables, length, voice constraints, and content hash generation. Any unresolved `[VERIFY]` marker blocks the new review email until the evidence gap is resolved or the wording is removed.

### Approval and confirmation

Selecting `Approve and Publish` on the review page reveals a separate confirmation screen.

The screen repeats the headline, version, content hash prefix, and publication effect. The only publishing action is a POST request from the `Confirm Publish` control.

The Edge Function validates the authenticated email, token hash, expiry, active status, version number, and content hash again. It atomically changes the version from `pending_review` to `approved` and writes an audit event.

A duplicate click returns the existing approved state. It does not create a second publication request.

### Browser publication

The local publisher checks approved versions every fifteen minutes. It claims one version atomically and changes it to `publishing` before opening Substack.

The publisher uses the existing signed in Substack browser session and performs these actions.

1. Open the Substack dashboard.

2. Create a new article.

3. Insert the exact approved headline, subtitle, body, teaser, and subscribe call.

4. Read the editor content back and compare it with the approved content.

5. Select public publication.

6. Select delivery to all subscribers.

7. Select immediate publication.

8. Press the final Publish control once.

The publisher stops before the final action when the account session has expired, the editor content differs, the approved version is stale, a change request exists, the audience controls are ambiguous, or Substack has changed the relevant interface.

If the final click returns an uncertain result, the publisher inspects the Substack Posts page and public RSS feed before any retry. It never repeats the final click blindly.

### Verification and notification

After publication, the worker verifies the public post title, a deterministic content fingerprint, and the RSS entry.

Successful verification changes the version to `published`, stores the public URL and timestamp, writes an audit event, and emails the verified link to `dradamopierce@gmail.com`.

Failed verification changes the version to `verification_failed` and sends an alert. The worker does not retry publication until it can prove that no matching live post exists.

## System components

### React review page

The existing Vite application owns the review interface. It adds a public route that withholds content until authentication and Edge Function validation succeed.

The page supports these states.

1. Authentication required.

2. Wrong Google account.

3. Loading active review.

4. Pending review.

5. Changes requested.

6. Confirmation required.

7. Approved and queued.

8. Publishing.

9. Published.

10. Expired, superseded, or invalid.

### Supabase data model

`substack_review_versions` stores one immutable content version per draft.

Important fields include the version identifier, stable draft identifier, version number, status, selected headline, subtitle, article Markdown, Notes teaser, subscribe call, source file path, content hash, token hash, review address, expiry, revision notes, approval identity and time, publication claim data, verified URL, and error details.

A unique constraint on draft identifier and version prevents duplicate versions. A unique constraint on token hash prevents link reuse across versions.

`substack_review_events` stores append only audit events. Each event records the version, event type, actor identity, safe metadata, and timestamp.

Direct browser access to both tables is denied. The Edge Function uses the service role only after authenticating and authorizing the caller.

### Review Edge Function

`substack-review` provides four actions.

1. `load` returns an authorized active review.

2. `request_changes` records editorial notes and closes the current approval path.

3. `approve` performs the final state transition after confirmation.

4. `worker_status` supports a service authenticated local worker without exposing article data publicly.

The function derives the human actor from the verified Supabase JWT. It never trusts an email, user identifier, status, version, or content hash supplied by the browser.

### Review email Edge Function

`send-substack-review-email` accepts only a service authenticated request. It loads the active database version and creates the email from stored content. The caller cannot supply replacement article HTML.

The function uses the existing Resend secret and the approved destination. It records the provider message identifier and send time only after Resend accepts the message.

### Local review worker

The local worker connects to Supabase with the service role from the existing secure local environment. It never writes credentials into source control.

The worker performs revision processing, browser publication, verification, and status updates. Single claim fields and compare and set updates prevent two worker runs from processing the same version.

The Codex scheduled task wakes the worker every fifteen minutes. The existing Monday and Thursday content task remains responsible for evidence based draft creation and traction tracking.

## State model

Valid status progression follows these paths.

`pending_review -> changes_requested -> superseded`

`pending_review -> approved -> publishing -> published`

`publishing -> verification_failed`

`pending_review -> expired`

Only the Edge Function can change `pending_review` to `changes_requested` or `approved`.

Only the service authenticated worker can create versions, supersede old versions, claim publication, record verification, or record worker errors.

## Security controls

1. Email links use a high entropy random token.

2. The database stores only the SHA 256 token hash.

3. Tokens expire and become invalid when a new version exists.

4. Every human action requires a valid Supabase session for the exact approved email.

5. Approval requires a second screen and a POST request.

6. The approval transaction checks the active version and content hash.

7. Direct table access from the browser is denied.

8. Service operations require a separate worker secret or service role credential.

9. Revision notes are stored and displayed as plain text.

10. Audit events exclude raw tokens, credentials, and full article bodies.

11. Publication claims prevent concurrent workers.

12. The browser publisher compares editor content before publication.

13. The publisher verifies Posts and RSS before retrying an uncertain final action.

## Test plan

The first test uses a dummy article and stops before the final Substack Publish control.

Automated tests cover token hashing, token expiry, exact email enforcement, wrong account rejection, email scanner safe GET behavior, duplicate confirmation, stale version rejection, revision invalidation, immutable content hashes, worker claim concurrency, and legal state transitions.

Page tests cover authentication, wrong account, review rendering, change submission, confirmation, approved status, and invalid links.

Email tests cover the destination, required article fields, action links, publication warning, safe escaping, and provider failure handling.

The browser dry run verifies Substack login detection, editor insertion, editor parity, audience controls, immediate timing, and the stop before final publish rule.

The activation test verifies one real approved post from draft creation through the final live link email. That test requires Dr. Pierce's separate approval for deployment, database migration, credentials, and the live publication.

## Deployment boundaries

Implementation can create and test the migration, app code, Edge Functions, worker, and automation definition locally.

Activation requires these explicit operations.

1. Apply the new Supabase migration.

2. Deploy the two Edge Functions.

3. Enable or confirm Google authentication in Supabase.

4. Deploy the Vercel app.

5. Configure the worker secret and review base URL.

6. Update and enable the fifteen minute Codex automation.

7. Complete the Substack browser dry run.

No activation operation occurs without Dr. Pierce's approval.

## Operational ownership

Supabase owns current approval state and the audit trail.

The Obsidian vault owns editorial source material, scheduled content context, and long form operating notes.

The local Markdown file remains the canonical editable draft. A database version is the immutable review and approval snapshot.

Substack owns the public post. The public post and RSS feed provide publication evidence.
