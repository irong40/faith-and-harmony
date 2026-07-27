# Faith and Harmony Command Center Redesign

Date 2026-07-27

Status Approved

## Purpose

Replace the current mission focused admin home with a company command center that supports full work management across Faith and Harmony LLC. The command center gives Adam one place to see company health, direct departments, manage tasks, approve decisions, resolve blockers, and open supporting records.

The redesign keeps the current React, Vite, Supabase, Tailwind, and shadcn stack. It reorganizes and extends the working CRM instead of replacing it.

## Evidence from the current system

The production and repository review identified these issues.

1. `/admin/` returns a 404 instead of opening the admin home.

2. The admin application exposes about 28 routes and nine top navigation areas.

3. The current dashboard emphasizes missions and team activity even though the system primarily serves one owner operator.

4. The dashboard does not place approvals, overdue decisions, failed automations, open quotes, payments, or compliance exposure at the top.

5. Quote Requests lacks next action, follow up date, qualification, and conversion context.

6. Governance lists pending obligations without distinguishing overdue or urgent work.

7. Existing accepted decisions require a smaller system focused on revenue, operations, delivery, payment, and governance.

## Goals

1. Make the command center the default admin experience.

2. Support tasks, approvals, decisions, risks, and blockers across departments.

3. Surface work that needs Adam before passive metrics.

4. Preserve working mission, quote, report, document, contract, and client workflows.

5. Reduce navigation depth and remove duplicate entry points.

6. Connect structured CRM work to detailed Obsidian context without allowing two systems to overwrite the same fields.

7. Provide clear loading, empty, stale, error, and synchronization states.

8. Keep all data changes auditable.

## Non goals

1. Replace Supabase or migrate the frontend framework.

2. Rebuild removed employee management features.

3. Move long form operating documents into database text fields.

4. Allow unrestricted bidirectional edits to every task field.

5. Replace Square, AirData, Google Calendar, WebODM, or the Obsidian vault.

6. Delete existing routes before redirects and production usage confirm they are safe to retire.

## Chosen product approach

Use progressive consolidation.

The first release adds the command center, work model, and new navigation while preserving current operational routes. Later releases merge duplicate CRM surfaces only after usage and production data confirm the replacement path.

A visual refresh alone was rejected because it would preserve the current information architecture. A command center layered over every existing page was rejected because it would leave duplicate work systems underneath it.

## Primary user

Adam is the primary administrator, operator, and decision maker. Department agents and directors report status and proposed work. Adam can create, assign, reorder, approve, reject, and complete work inside the CRM.

The design must remain usable if additional human administrators or directors are added later, but the first release does not rebuild employee management.

## Information architecture

The admin shell uses a collapsible navigation rail on desktop and a sheet on smaller screens.

The top level sections are listed below.

1. Command Center

2. Work

3. Revenue

4. Operations

5. Governance

6. Library

7. Settings

The header contains global search, create work, synchronization health, notifications, and the current account menu.

The new default route is `/admin/command-center`.

Both `/admin/` and `/admin/dashboard` redirect to `/admin/command-center`.

Existing operational routes remain valid during consolidation.

## Command center layout

The command center prioritizes action over reporting.

### Needs your action

This section appears first and contains approvals, decisions, blocked work, overdue work, failed synchronization, failed automations, and compliance deadlines that require Adam.

Each row shows the request, department, owner, age, urgency, supporting context, and the available action.

### Department health

The first department set contains Finance, Operations, Business Development, Marketing, Security, and Compliance.

Each department panel shows the director, current objective, health, active work count, overdue count, blockers, last report time, and latest update.

Health is derived from explicit department status plus overdue and blocked work. The interface never infers healthy status from missing data. Missing or stale reports display an unknown state.

### Company work

The home page shows a focused list of active work. The full Work section provides board, list, and timeline views.

Default filters emphasize work assigned to Adam, work waiting for approval, overdue work, and cross department blockers.

### Business pulse

Revenue and operations remain visible but secondary. The first set contains open quote value, quotes awaiting follow up, active jobs, pending deliveries, outstanding payment value, contract opportunities, and overdue compliance items.

Each metric links to the underlying filtered page.

### Recent activity

The activity stream combines work events, decisions, comments, synchronization events, generated documents, and meaningful CRM status changes.

## Work management model

One work item model supports five types.

1. Task

2. Approval

3. Decision

4. Risk

5. Blocker

Each work item contains the following operational fields.

1. Stable UUID

2. Title and description

3. Type and department

4. Status and priority

5. Owner and creator

6. Due date and completed time

7. Source system and source reference

8. Parent item and dependency links

9. Linked CRM records and Obsidian documents

10. Approval state when applicable

11. Created, updated, and synchronized times

12. Monotonic version for safe updates

Selecting an item opens a side panel with summary, fields, comments, links, dependencies, and history. Complex records may open a dedicated page. Routine changes stay inline.

## Status model

The first release uses these statuses.

1. Inbox

2. Planned

3. In progress

4. Waiting

5. Blocked

6. Needs approval

7. Done

8. Cancelled

Status transitions create audit events. Approval work cannot move directly from Needs approval to Done without an approval event.

## Data architecture

The first release uses six new tables created through a new Supabase migration.

1. `work_items`

2. `work_item_events`

3. `work_item_comments`

4. `work_item_links`

5. `department_updates`

6. `sync_runs`

`work_item_events` is append only for normal application roles. It records creation, field changes, status transitions, approvals, synchronization, and links.

`work_item_links` uses a typed target with a stable identifier. Supported targets include CRM routes, job IDs, client IDs, quote IDs, contract IDs, report IDs, document paths, and external URLs.

Department definitions begin as an application registry rather than a new department table. This avoids administrative schema before the department set becomes dynamic.

All new tables use RLS. Admin roles can manage all command center records. Guarded service functions can synchronize agent records. Anonymous and pilot roles receive no command center access.

## Source ownership and synchronization

Supabase owns structured operational state.

This includes status, priority, department, assignee, deadline, dependencies, approvals, and completion.

Obsidian owns reports, evidence, research, procedures, meeting notes, and long form context.

Either environment can propose a new work item. An Obsidian proposal uses structured frontmatter and enters the CRM through a guarded synchronization endpoint. Supabase assigns the permanent UUID. After import, Supabase owns the operational lifecycle.

The local synchronization script writes generated status mirrors back to a dedicated vault folder. Generated mirrors are not hand edited.

Every record carries a source reference and version. A stale update cannot overwrite a newer Supabase version. Conflicts create a visible review item and a failed sync event.

The web application does not write directly to the local vault. A scheduled local bridge performs both import and export.

## Revenue consolidation

The first release changes navigation without deleting revenue data.

Quote Requests becomes the intake authority. Leads and Service Requests remain reachable during migration but leave primary navigation after their required data is represented in intake and activity history.

Call logs become linked activity instead of a standalone top level workflow.

Proposals, clients, contracts, and payment records remain separate entities linked from the revenue pipeline.

## Operations organization

Operations contains Jobs, Weather, Reports, Delivery, and operational setup.

Pilots, aircraft, accessories, processing templates, and scheduling move under operational setup or settings. They no longer compete with daily work in the main navigation.

## Visual system

The interface keeps the Faith and Harmony plum identity and warm neutral background.

Use a clean sans serif for interface text. Reserve monospace for job numbers, stable IDs, dates, and financial figures.

Use green, amber, red, and blue only for state and risk. Neutral records do not receive decorative status colors.

Use spacing and surface tone before borders and shadows. Cards exist only where containment communicates hierarchy.

Every interactive control includes hover, pressed, keyboard focus, disabled, and loading states.

Tables use sticky headers when useful. Data cells use tabular figures. Dense views remain readable on a standard laptop and collapse into lists on small screens.

## Error and stale state handling

Each dashboard area handles failure independently. One failed query does not blank the command center.

1. Loading uses shape matched skeletons.

2. Empty states explain how records enter the section and provide the next action.

3. Query failures show an inline retry and preserve unaffected sections.

4. Mutation failures roll back optimistic state and explain what did not save.

5. Stale department updates show their age and unknown health.

6. Failed sync runs appear in Needs your action.

7. Offline writes remain out of the first release unless the existing PWA queue can support the record safely.

## Testing strategy

Use test driven development for domain behavior and meaningful component interactions.

1. Unit tests cover status transitions, urgency, health calculation, filters, conflict detection, and link parsing.

2. Component tests cover command center loading, empty, error, action, and navigation states.

3. Database tests cover constraints, RLS, version checks, and append only audit events.

4. Synchronization fixture tests cover import, export, idempotency, stale updates, malformed frontmatter, and conflicts.

5. Browser tests cover the desktop navigation, smaller screens, keyboard use, task creation, approval, and route redirects.

6. Every implementation unit runs tests, lint, typecheck, and production build before completion.

7. Production verification confirms the deployed route, authenticated queries, RLS behavior, and a controlled end to end work item.

## Delivery sequence

### Phase 1 Foundation

Add the schema, domain types, command center route, route redirects, shell, navigation, and read only command center queries.

### Phase 2 Work management

Add create, edit, status transitions, assignments, dependencies, comments, approvals, decisions, audit history, board, list, and item panel.

### Phase 3 Obsidian synchronization

Add guarded synchronization, local import and export, stable IDs, version checks, generated mirrors, conflict handling, and synchronization health.

### Phase 4 CRM consolidation

Unify revenue intake, simplify secondary navigation, redirect confirmed duplicate pages, and remove only dead surfaces proven safe to retire.

### Phase 5 Production verification

Run all gates, browser verification, database policy checks, and a controlled production work item before calling the redesign complete.

## Rollout controls

The command center launches behind an admin feature flag until its queries, task mutations, and navigation pass production verification.

Existing routes stay accessible during the first release. The old dashboard redirects only after the new command center works in production.

Database changes use new migration files. Applied migrations are never edited. Migration versions must be checked against production before push.

The current bulk delete branch remains outside this worktree and outside the redesign scope.

## Success criteria

1. `/admin/` opens the command center instead of a 404.

2. Adam can identify every item needing his action without opening another page.

3. Adam can create, assign, prioritize, reorder, approve, reject, and complete work.

4. Each department shows current health, work, blockers, and report freshness.

5. Revenue, operations, and compliance metrics link to their source records.

6. Obsidian proposals import once and receive stable CRM IDs.

7. CRM status mirrors return to the vault without creating edit conflicts.

8. Failed synchronization and stale reporting are visible.

9. Existing mission, quote, report, document, and contract flows continue to work.

10. Tests, lint, typecheck, build, browser verification, and production verification pass.
