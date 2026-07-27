# Faith and Harmony Command Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fragmented admin landing experience with a responsive company command center and a secure work-management system that makes owner actions, department health, company work, business signals, and activity visible in one place.

**Architecture:** Add admin-only Supabase work-management tables as the operational authority, expose them through typed repository functions and TanStack Query hooks, and render them inside a reusable nested admin shell. Existing CRM pages remain reachable during progressive consolidation. Obsidian remains the authority for reports, procedures, evidence, and long-form notes. A guarded service-role bridge imports proposed work and exports generated status snapshots without allowing both systems to own the same lifecycle fields.

**Tech Stack:** React 18, TypeScript, Vite, React Router 6, TanStack Query, Supabase Postgres and RLS, shadcn UI, Tailwind CSS, Vitest, Testing Library

---

## Delivery rules

- Follow red, green, refactor for every application behavior.
- Create a new Supabase migration. Never edit an applied migration.
- Use Supabase as the authority for status, priority, owner, deadline, dependencies, approval, and completion.
- Use Obsidian for reports, notes, evidence, procedures, and long-form context.
- Keep existing CRM routes working until their replacement is verified.
- Do not deploy or push migrations until the local quality gates pass and the migration list has been checked.

### Task 1. Add the work-management database foundation

**Files:**
- Create: `supabase/migrations/20260727200000_command_center_work_management.sql`
- Create: `src/types/command-center.ts`
- Test: `src/types/command-center.spec.ts`

**Step 1. Write the failing type and lifecycle tests**

Add tests for the supported work item types, statuses, priorities, departments, terminal statuses, and owner-action statuses.

**Step 2. Run the focused test and confirm red**

Run `npm test -- src/types/command-center.spec.ts`.

Expected result is failure because the command center domain module does not exist.

**Step 3. Add the domain types and helpers**

Define `WorkItem`, `WorkItemEvent`, `WorkItemComment`, `WorkItemLink`, `DepartmentUpdate`, `SyncRun`, `WorkItemFilters`, `CreateWorkItemInput`, and `UpdateWorkItemInput`. Add immutable arrays and pure helpers for terminal and action-needed status checks.

**Step 4. Run the focused test and confirm green**

Run `npm test -- src/types/command-center.spec.ts`.

**Step 5. Add the migration**

Create `work_items`, `work_item_events`, `work_item_comments`, `work_item_links`, `department_updates`, and `sync_runs`. Use check constraints instead of Postgres enums. Add indexes for status, department, owner, due date, source reference, and event time. Add update triggers, optimistic version increments, admin policies, service-role policies, and append-only event rules.

**Step 6. Validate the migration text and quality gates**

Run `rg -n 'ENABLE ROW LEVEL SECURITY|has_role|service_role|version|work_item_events' supabase/migrations/20260727200000_command_center_work_management.sql` and `npm run typecheck`.

**Step 7. Commit**

Commit with `feat(command-center): add work management schema`.

### Task 2. Add the work repository and query hooks

**Files:**
- Create: `src/lib/command-center/work-items.ts`
- Create: `src/lib/command-center/work-items.spec.ts`
- Create: `src/hooks/useWorkItems.ts`
- Create: `src/hooks/useWorkItems.spec.ts`

**Step 1. Write failing repository tests**

Test filter serialization, stable ordering, create payload normalization, lifecycle update payloads, and error propagation using a small injected Supabase-like client.

**Step 2. Run the repository test and confirm red**

Run `npm test -- src/lib/command-center/work-items.spec.ts`.

**Step 3. Implement the repository**

Add `listWorkItems`, `getWorkItem`, `createWorkItem`, `updateWorkItem`, `addWorkItemComment`, and `listWorkItemActivity`. Keep database calls isolated behind injectable functions.

**Step 4. Run repository tests and confirm green**

Run `npm test -- src/lib/command-center/work-items.spec.ts`.

**Step 5. Write failing hook tests**

Test query keys, query invalidation after mutations, optimistic status changes, rollback after failure, and visible errors.

**Step 6. Implement the TanStack Query hooks**

Add list, detail, create, update, and comment hooks with scoped keys and invalidation.

**Step 7. Run focused tests and commit**

Run `npm test -- src/lib/command-center/work-items.spec.ts src/hooks/useWorkItems.spec.ts` and commit with `feat(command-center): add work item data layer`.

### Task 3. Build the nested admin shell and consolidated navigation

**Files:**
- Create: `src/components/admin/shell/AdminShell.tsx`
- Create: `src/components/admin/shell/AdminSidebar.tsx`
- Create: `src/components/admin/shell/AdminHeader.tsx`
- Create: `src/components/admin/shell/AdminShellContext.tsx`
- Create: `src/components/admin/shell/admin-navigation.ts`
- Create: `src/components/admin/shell/AdminShell.spec.tsx`
- Modify: `src/pages/admin/components/AdminNav.tsx`
- Modify: `src/index.css`

**Step 1. Write failing shell tests**

Verify the seven approved navigation groups, active route state, mobile menu label, command center link, notification access, and suppression of the legacy top navigation inside the shell.

**Step 2. Run the shell test and confirm red**

Run `npm test -- src/components/admin/shell/AdminShell.spec.tsx`.

**Step 3. Implement the shell**

Use the existing sidebar primitives and an outlet-based layout. Group legacy destinations beneath the seven approved sections. Keep route names operational and concise.

**Step 4. Apply the visual system**

Use a deep plum rail, warm paper canvas, low-contrast borders, brass action accents, sans-serif UI headings, mono IDs and metrics, strong focus rings, and reduced-motion support.

**Step 5. Make legacy AdminNav context-aware**

Return null when a page renders under `AdminShell`. Preserve the old header only outside the nested shell during migration.

**Step 6. Run the shell tests and commit**

Run `npm test -- src/components/admin/shell/AdminShell.spec.tsx`, `npm run typecheck`, and commit with `feat(admin): add consolidated command center shell`.

### Task 4. Add command center routes and safe redirects

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.spec.tsx`
- Create: `src/pages/admin/CommandCenter.tsx`
- Create: `src/pages/admin/Work.tsx`

**Step 1. Write failing routing tests**

Verify `/admin`, `/admin/dashboard`, and the authenticated admin root resolve to `/admin/command-center`. Verify `/admin/work` renders in the shell and a representative legacy route remains available.

**Step 2. Run the routing test and confirm red**

Run `npm test -- src/App.spec.tsx`.

**Step 3. Convert admin routing to a protected nested route**

Mount `AdminShell` once, add command center and work routes, redirect the two old entry paths, and keep all current admin pages nested beneath the shell.

**Step 4. Add temporary page landmarks**

Add accessible page titles and loading-safe page containers to establish the route contract before dashboard widgets.

**Step 5. Run the routing test and commit**

Run `npm test -- src/App.spec.tsx`, `npm run typecheck`, and commit with `feat(admin): route admins through command center`.

### Task 5. Build the owner decision queue

**Files:**
- Create: `src/components/admin/command-center/ActionQueue.tsx`
- Create: `src/components/admin/command-center/ActionQueue.spec.tsx`
- Create: `src/components/admin/command-center/WorkItemDrawer.tsx`
- Create: `src/components/admin/command-center/WorkItemDrawer.spec.tsx`
- Modify: `src/pages/admin/CommandCenter.tsx`

**Step 1. Write failing action queue tests**

Verify overdue, blocked, waiting, approval, risk, and sync-failure items sort by urgency. Verify empty, loading, and failed widget states remain isolated.

**Step 2. Run focused tests and confirm red**

Run `npm test -- src/components/admin/command-center/ActionQueue.spec.tsx`.

**Step 3. Implement the queue**

Show explicit reason, owner, due context, source, and one primary action per row. Use semantic labels in addition to color.

**Step 4. Write failing drawer tests**

Verify create, edit, status transition, approval, comment, link, and validation behavior. Verify failed mutations retain user input and show retry guidance.

**Step 5. Implement the drawer and connect the queue**

Use React Hook Form and Zod. Keep status changes visible in the event timeline.

**Step 6. Run tests and commit**

Run both component specs and commit with `feat(command-center): add owner action workflow`.

### Task 6. Add department health and company work views

**Files:**
- Create: `src/lib/command-center/departments.ts`
- Create: `src/lib/command-center/departments.spec.ts`
- Create: `src/hooks/useDepartmentUpdates.ts`
- Create: `src/components/admin/command-center/DepartmentHealth.tsx`
- Create: `src/components/admin/command-center/DepartmentHealth.spec.tsx`
- Create: `src/components/admin/work/WorkBoard.tsx`
- Create: `src/components/admin/work/WorkBoard.spec.tsx`
- Create: `src/components/admin/work/WorkFilters.tsx`
- Modify: `src/pages/admin/CommandCenter.tsx`
- Modify: `src/pages/admin/Work.tsx`

**Step 1. Write failing department tests**

Verify department status ordering, stale-report detection, missing-report state, objective display, and blocker count.

**Step 2. Implement the department data layer and cards**

Load latest updates per department and show healthy, watch, blocked, and stale states.

**Step 3. Write failing work view tests**

Verify grouped status columns, filters, keyboard-accessible status movement, empty columns, and update rollback.

**Step 4. Implement the work board and list controls**

Provide board and compact list modes with department, type, status, priority, owner, source, and due-date filters.

**Step 5. Run tests and commit**

Run all Task 6 specs and commit with `feat(command-center): add department and company work views`.

### Task 7. Add business pulse and recent activity

**Files:**
- Create: `src/lib/command-center/business-pulse.ts`
- Create: `src/lib/command-center/business-pulse.spec.ts`
- Create: `src/hooks/useBusinessPulse.ts`
- Create: `src/components/admin/command-center/BusinessPulse.tsx`
- Create: `src/components/admin/command-center/BusinessPulse.spec.tsx`
- Create: `src/components/admin/command-center/RecentActivity.tsx`
- Create: `src/components/admin/command-center/RecentActivity.spec.tsx`
- Modify: `src/pages/admin/CommandCenter.tsx`

**Step 1. Write failing aggregation tests**

Verify lead, quote, job, delivery, invoice, governance, and work-item signals normalize into a stable summary without inventing missing data.

**Step 2. Implement pulse aggregation and hook**

Use existing live CRM tables. Return independent result objects so one failed source does not blank the page.

**Step 3. Write failing widget tests**

Verify values, labels, links to source pages, partial failures, empty states, and chronological activity.

**Step 4. Implement both widgets and run tests**

Run all Task 7 specs.

**Step 5. Commit**

Commit with `feat(command-center): add business pulse and activity`.

### Task 8. Add the guarded Obsidian sync contract

**Files:**
- Create: `supabase/functions/command-center-sync/index.ts`
- Create: `supabase/functions/command-center-sync/index.spec.ts`
- Create: `scripts/command-center-sync.mjs`
- Create: `scripts/command-center-sync.spec.ts`
- Create: `docs/command-center-sync-contract.md`
- Modify: `package.json`

**Step 1. Write failing contract tests**

Verify signed requests, idempotency by source reference, allow-listed fields, dry-run behavior, conflict reporting, and rejection of attempts to overwrite CRM-owned lifecycle fields from Obsidian.

**Step 2. Implement the edge function**

Allow agents to propose tasks and post department updates. Use service role only inside the function. Never expose the key to the browser.

**Step 3. Implement the local vault bridge**

Read structured proposal files from the configured vault path and write generated CRM status snapshots to a generated folder. Default to dry run and require an explicit apply flag.

**Step 4. Document field ownership and recovery**

Describe input shape, output shape, idempotency, sync runs, stale detection, retry, and conflict behavior.

**Step 5. Run tests and commit**

Run the two sync specs and commit with `feat(command-center): add guarded vault sync`.

### Task 9. Consolidate legacy destinations without breaking workflows

**Files:**
- Modify: `src/components/admin/shell/admin-navigation.ts`
- Modify: `src/pages/admin/Dashboard.tsx`
- Modify: `src/pages/admin/SentinelPricing.tsx`
- Test: `src/components/admin/shell/AdminShell.spec.tsx`
- Test: `src/App.spec.tsx`

**Step 1. Write failing compatibility tests**

Verify every existing admin route appears beneath one approved navigation section or is intentionally hidden as a detail-only route. Verify old dashboard links return to command center.

**Step 2. Complete the navigation map**

Place routes under Work, Revenue, Operations, Governance, Library, and Settings. Keep detail routes available without promoting them in the rail.

**Step 3. Run compatibility tests and commit**

Run the shell and app specs and commit with `refactor(admin): consolidate legacy destinations`.

### Task 10. Verify accessibility, responsiveness, and all quality gates

**Files:**
- Modify as required by findings
- Update: `docs/plans/2026-07-27-faith-harmony-command-center-design.md`

**Step 1. Run focused command center tests**

Run `npm test -- src/types/command-center.spec.ts src/lib/command-center src/hooks/useWorkItems.spec.ts src/components/admin/shell src/components/admin/command-center src/components/admin/work src/App.spec.tsx`.

**Step 2. Run full repository gates**

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.

Expected result is all tests passing, lint with no errors, typecheck passing, and production build passing.

**Step 3. Inspect the responsive UI**

Run the app locally. Verify desktop at 1440 by 900, tablet at 1024 by 768, and mobile at 390 by 844. Check keyboard navigation, visible focus, labels, contrast, overflow, empty states, partial failures, and reduced motion.

**Step 4. Verify database readiness**

Run `supabase migration list` against the configured project before any push. Confirm the new timestamp has no conflict. Do not modify live data during this check.

**Step 5. Record evidence and commit**

Update the design document with screenshots or evidence paths and unresolved production risks. Commit with `test(command-center): verify redesign`.

### Task 11. Update project knowledge and prepare the production handoff

**Files:**
- Update: `C:/Users/redle.SOULAAN/obsidian-dev/projects/faith-and-harmony/Faith and Harmony.md`
- Create: `C:/Users/redle.SOULAAN/obsidian-dev/decisions/ADR-XXX-command-center-field-ownership.md`
- Update: `C:/Users/redle.SOULAAN/obsidian-dev/last-session.md`

**Step 1. Record the accepted authority split**

Document Supabase lifecycle ownership, Obsidian knowledge ownership, the guarded sync boundary, and the progressive consolidation strategy.

**Step 2. Record implementation status and verification evidence**

Add the branch, commits, migration status, test results, production status, and remaining rollout steps.

**Step 3. Finish the development branch workflow**

Use the finishing-a-development-branch skill. Present merge, pull request, retain, or discard options only after all verified implementation work is complete.
