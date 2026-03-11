# Requirements: Faith & Harmony Operations Platform

**Defined:** 2026-03-10
**Core Value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.

## v2.1 Requirements

Requirements for the Leads Admin Upgrade milestone. Each maps to roadmap phases.

### Lead Conversion

- [ ] **CONV-01**: Admin can one-click convert a qualified lead into a new client and quote request
- [ ] **CONV-02**: Admin can link a lead to an existing client when a match is found
- [ ] **CONV-03**: Admin can bulk select multiple qualified leads and convert them all at once

### Lead Details

- [ ] **DETL-01**: Admin can click a lead row to open a detail drawer showing call transcript and summary
- [ ] **DETL-02**: Admin can play the Vapi call recording directly in the detail drawer
- [x] **DETL-03**: Admin can add notes to a lead with reason tags (not ready, wrong area, needs callback, price sensitive)
- [x] **DETL-04**: Admin can set a follow-up date on a lead and see overdue follow-ups highlighted
- [ ] **DETL-05**: Admin can view a timeline of all activity on a lead (status changes, notes, conversion)

### Lead Entry & Sources

- [ ] **SRCE-01**: Admin can manually create a lead via a form (name, phone, email, source, notes)
- [x] **SRCE-02**: Leads page shows all source channels (voice_bot, web_form, manual, email_outreach, social) with source badges
- [ ] **SRCE-03**: Admin can filter leads by source channel

### Inline Editing

- [ ] **EDIT-01**: Admin can change a lead's qualification status directly from the table row without opening the detail drawer

### Analytics

- [ ] **ANLY-01**: Leads page shows conversion rate stat card with week/month/all-time toggle
- [ ] **ANLY-02**: Leads page shows leads by source breakdown
- [ ] **ANLY-03**: Leads page shows average response time (lead creation to first note or status change)
- [ ] **ANLY-04**: Leads page shows total revenue from converted leads (joined through client to jobs)

## Future Requirements

Deferred to future milestones.

### Automation

- **AUTO-01**: Leads with follow-up dates trigger automated email reminders via n8n
- **AUTO-02**: New leads from web form auto-create lead records via edge function
- **AUTO-03**: Converted leads auto-enter the post-delivery email drip sequence

### Pipeline View

- **PIPE-01**: Kanban board view with drag-and-drop pipeline stages
- **PIPE-02**: Configurable pipeline stages beyond qualification status

## Out of Scope

| Feature | Reason |
|---------|--------|
| CRM integration (HubSpot, Salesforce) | Overkill for single-operator business |
| Lead scoring / AI qualification | Manual qualification is sufficient at current volume |
| Email sending from leads page | Email outreach handled by n8n drip sequences |
| SMS / text message integration | Phone calls via Vapi are primary communication |
| Lead assignment to multiple pilots | Single pilot operation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONV-01 | Phase 15 | Pending |
| CONV-02 | Phase 15 | Pending |
| CONV-03 | Phase 15 | Pending |
| DETL-01 | Phase 14 | Pending |
| DETL-02 | Phase 14 | Pending |
| DETL-03 | Phase 14 | Complete |
| DETL-04 | Phase 14 | Complete |
| DETL-05 | Phase 14 | Pending |
| SRCE-01 | Phase 15 | Pending |
| SRCE-02 | Phase 14 | Complete |
| SRCE-03 | Phase 15 | Pending |
| EDIT-01 | Phase 14 | Pending |
| ANLY-01 | Phase 16 | Pending |
| ANLY-02 | Phase 16 | Pending |
| ANLY-03 | Phase 16 | Pending |
| ANLY-04 | Phase 16 | Pending |

**Coverage:**
- v2.1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after roadmap creation (v2.1 phases 13-16 assigned)*
