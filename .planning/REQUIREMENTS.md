# Requirements: v1.1 Voice Bot + Automated Intake Pipeline

**Defined:** 2026-03-03
**Core Value:** A prospective client can call a 757 number, get qualified by a voice bot, receive pricing, and have their request automatically created in the system without Iron fielding the call.

## v1.1 Requirements

### Intake Pipeline

- [x] **INTAKE-01**: Leads table stores caller info, qualification status, source channel, and links to call log
- [x] **INTAKE-02**: Call logs table stores Vapi call ID, transcript, duration, sentiment, and outcome
- [x] **INTAKE-03**: Edge function receives structured call data from n8n and creates or matches a client record plus a quote request
- [x] **INTAKE-04**: Edge function returns package pricing and deliverables for mid-call bot queries
- [x] **INTAKE-05**: Bot-created requests feed into existing quote request to invoice workflow without manual re-entry

### Voice Bot

- [x] **VBOT-01**: Vapi assistant configured with ElevenLabs TTS voice and natural conversation flow
- [x] **VBOT-02**: 757 area code phone number provisioned and connected to Vapi assistant
- [x] **VBOT-03**: System prompt covers all 6 service packages with pricing and deliverables
- [x] **VBOT-04**: System prompt includes Hampton Roads service area and surrounding coverage (MD, Northern NC)
- [x] **VBOT-05**: Bot qualifies callers by service type, location, timeline, and property type
- [x] **VBOT-06**: Bot routes edge cases to Iron (out of service area, commercial inspections over $1200, payment disputes, existing client follow-ups)
- [x] **VBOT-07**: Bot queries pricing and availability mid-conversation via Vapi tool calls

### Middleware

- [x] **MWARE-01**: n8n workflow receives Vapi end-of-call webhook with call summary and extracted fields
- [x] **MWARE-02**: n8n transforms Vapi payload into intake API format and calls edge function
- [x] **MWARE-03**: Failed intakes trigger admin notification via existing messaging or email
- [x] **MWARE-04**: Successful qualified intakes trigger the request-to-quote flow automatically

### Scheduling

- [ ] **SCHED-01**: Availability slots table with day-of-week defaults and date-specific overrides
- [ ] **SCHED-02**: Blackout dates table for weather holds, holidays, and maintenance days
- [ ] **SCHED-03**: Admin UI page for managing weekly availability and blackout dates
- [ ] **SCHED-04**: Edge function returns available dates for a service type and date range
- [ ] **SCHED-05**: Bot offers available dates during call and captures preferred date

### Weather Operations

- [ ] **WTHR-01**: Weather API integration fetching 48-hour forecasts for Hampton Roads
- [ ] **WTHR-02**: Flight parameter validation: max wind (sustained and gusts), precipitation probability, visibility minimum, cloud ceiling minimum
- [ ] **WTHR-03**: Automated check runs against scheduled jobs and flags unsafe conditions
- [ ] **WTHR-04**: Admin weather view showing current conditions and upcoming forecast against flight parameters

### Integration

- [ ] **INTG-01**: End-to-end flow works: phone call to bot to webhook to n8n to intake to request to invoice
- [ ] **INTG-02**: Edge cases route correctly: out of area declines politely, complex jobs offer callback, payment questions redirect
- [ ] **INTG-03**: Admin call log page showing recent calls with transcript, outcome, and linked request
- [ ] **INTG-04**: Admin leads page showing bot-sourced leads with qualification status and conversion tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Outbound calling | Inbound intake only for v1.1 |
| SMS or chat bot | Phone voice only for v1.1 |
| Custom voice cloning | Use existing ElevenLabs catalog voices |
| Multi-language support | English only for Hampton Roads market |
| Real-time availability on landing page | Future milestone |
| Admin portal redesign | Existing pages extended, not rebuilt |
| Pilot portal changes | Not affected by intake pipeline |
| Landing page changes | v1.0 complete, no modifications needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTAKE-01 | Phase 1: Intake API and Lead Tracking | Complete |
| INTAKE-02 | Phase 1: Intake API and Lead Tracking | Complete |
| INTAKE-03 | Phase 1: Intake API and Lead Tracking | Complete |
| INTAKE-04 | Phase 1: Intake API and Lead Tracking | Complete |
| INTAKE-05 | Phase 3: n8n Vapi Pipeline | Complete |
| VBOT-01 | Phase 2: Vapi Voice Bot | Complete |
| VBOT-02 | Phase 2: Vapi Voice Bot | Complete |
| VBOT-03 | Phase 2: Vapi Voice Bot | Complete |
| VBOT-04 | Phase 2: Vapi Voice Bot | Complete |
| VBOT-05 | Phase 2: Vapi Voice Bot | Complete |
| VBOT-06 | Phase 2: Vapi Voice Bot | Complete |
| VBOT-07 | Phase 2: Vapi Voice Bot | Complete |
| MWARE-01 | Phase 3: n8n Vapi Pipeline | Complete |
| MWARE-02 | Phase 3: n8n Vapi Pipeline | Complete |
| MWARE-03 | Phase 3: n8n Vapi Pipeline | Complete |
| MWARE-04 | Phase 3: n8n Vapi Pipeline | Complete |
| SCHED-01 | Phase 4: Scheduling and Availability | Pending |
| SCHED-02 | Phase 4: Scheduling and Availability | Pending |
| SCHED-03 | Phase 4: Scheduling and Availability | Pending |
| SCHED-04 | Phase 4: Scheduling and Availability | Pending |
| SCHED-05 | Phase 4: Scheduling and Availability | Pending |
| WTHR-01 | Phase 5: Weather Operations | Pending |
| WTHR-02 | Phase 5: Weather Operations | Pending |
| WTHR-03 | Phase 5: Weather Operations | Pending |
| WTHR-04 | Phase 5: Weather Operations | Pending |
| INTG-01 | Phase 6: Integration and Edge Cases | Pending |
| INTG-02 | Phase 6: Integration and Edge Cases | Pending |
| INTG-03 | Phase 6: Integration and Edge Cases | Pending |
| INTG-04 | Phase 6: Integration and Edge Cases | Pending |

**Coverage:**
- v1.1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
