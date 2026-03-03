# Roadmap: v1.1 Voice Bot + Automated Intake Pipeline

## Overview

The landing page converts visitors to quote requests. This milestone adds a second intake channel: a 757 phone number answered by a Vapi voice bot that qualifies callers, quotes prices, and creates requests automatically. Phase 1 builds the database and API foundation. Phase 2 configures the Vapi assistant with a system prompt trained on Sentinel packages and service area. Phase 3 connects Vapi to the app through n8n middleware. Phase 4 adds scheduling so the bot can offer available dates. Phase 5 integrates weather forecasting to flag unsafe flight conditions. Phase 6 validates the end-to-end flow and handles edge cases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Intake API and Lead Tracking** - Create leads and call_logs tables, build intake edge function that receives structured call data and creates client + request, build pricing lookup edge function for mid-call queries
- [ ] **Phase 2: Vapi Voice Bot** - Configure Vapi assistant with ElevenLabs TTS, author system prompt covering packages and service area and qualification flow, define tool schemas for mid-call API queries, provision 757 number
- [ ] **Phase 3: n8n Vapi Pipeline** - Build n8n workflow receiving Vapi end-of-call webhook, transform payload to intake API format, wire successful intakes into existing request-to-quote flow, add error notifications
- [ ] **Phase 4: Scheduling and Availability** - Create availability_slots and blackout_dates tables, build admin scheduling UI, build availability check edge function, connect bot to offer dates during calls
- [ ] **Phase 5: Weather Operations** - Integrate NWS weather API, validate flight parameters against forecasts, automate 48-hour pre-flight checks for scheduled jobs, add admin weather conditions view
- [ ] **Phase 6: Integration and Edge Cases** - Validate end-to-end call-to-invoice flow, implement edge case routing (out of area, complex jobs, payment questions), build admin call log and lead management views

## Phase Details

### Phase 1: Intake API and Lead Tracking
**Goal**: The system has an API endpoint that can receive structured call data, create or match a client, and create a quote request that feeds into the existing workflow
**Depends on**: Nothing (foundation phase)
**Requirements**: INTAKE-01, INTAKE-02, INTAKE-03, INTAKE-04
**Success Criteria** (what must be TRUE):
  1. A POST to the intake edge function with caller name, phone, email, service type, and job description creates a row in quote_requests and a row in leads
  2. A POST with a phone number matching an existing client links the lead to that client instead of creating a duplicate
  3. A GET to the pricing edge function with a service type returns the correct package name, price, and deliverables list
  4. The call_logs table stores call ID, transcript text, duration, and outcome for every processed call
  5. A lead created via the intake endpoint appears in the existing admin Quote Requests page
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Database migrations (leads table, vapi_call_logs enhancements, quote_requests source tracking)
- [ ] 01-02-PLAN.md — Pricing lookup edge function (static package data for mid-call queries)
- [ ] 01-03-PLAN.md — Intake lead edge function (client upsert, quote request, lead creation)

### Phase 2: Vapi Voice Bot
**Goal**: A caller dialing the 757 number reaches a voice bot that sounds natural, knows Sentinel packages and service area, qualifies the caller, and can look up pricing mid-conversation
**Depends on**: Phase 1 (bot needs pricing API to query)
**Requirements**: VBOT-01, VBOT-02, VBOT-03, VBOT-04, VBOT-05, VBOT-06, VBOT-07
**Success Criteria** (what must be TRUE):
  1. Calling the 757 number connects to the Vapi assistant and the caller hears an ElevenLabs voice greeting
  2. The system prompt file in the repo contains all 6 packages with correct pricing from PROJECT.md
  3. The bot asks qualifying questions: what service, where is the property, when do you need it, what type of property
  4. When asked about a service price mid-call, the bot queries the pricing API and responds with the correct amount
  5. When the caller describes a job outside service area or over $1200 commercial, the bot offers to transfer to Iron or take a callback number
**Plans**: 3 plans
**External prerequisites**: Vapi account created, ElevenLabs API key added to Vapi, 757 number provisioned in Vapi dashboard

### Phase 3: n8n Vapi Pipeline
**Goal**: When a Vapi call ends, n8n automatically processes the call data and creates a request in the system without manual intervention
**Depends on**: Phase 1 (intake API), Phase 2 (Vapi sends webhooks)
**Requirements**: INTAKE-05, MWARE-01, MWARE-02, MWARE-03, MWARE-04
**Success Criteria** (what must be TRUE):
  1. Vapi end-of-call webhook arrives at an n8n webhook node and the workflow executes
  2. The n8n workflow extracts caller name, phone, service type, job description, and preferred date from the Vapi payload
  3. The workflow calls the intake edge function and receives a success response with the created request ID
  4. A failed intake (API error or missing required fields) triggers an admin notification
  5. A successfully created request shows the correct status to enter the quote workflow
**Plans**: 2 plans

### Phase 4: Scheduling and Availability
**Goal**: The bot can check and offer available dates during calls, and the admin manages availability through a calendar interface
**Depends on**: Phase 1 (database foundation)
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05
**Success Criteria** (what must be TRUE):
  1. The availability_slots table has default weekly slots (e.g., Monday through Friday 8am to 5pm) that the admin can override per date
  2. The blackout_dates table allows blocking specific dates with a reason (weather, holiday, maintenance)
  3. The admin scheduling page shows a week view with current availability and allows adding or removing slots and blackout dates
  4. A GET to the availability edge function with a service type and date range returns only open dates that are not blacked out
  5. The Vapi bot can call the availability endpoint mid-conversation and tell the caller which dates are open
**Plans**: 3 plans

### Phase 5: Weather Operations
**Goal**: The system checks weather forecasts against flight parameters and alerts the admin when scheduled jobs face unsafe conditions
**Depends on**: Phase 4 (needs scheduled jobs to check against)
**Requirements**: WTHR-01, WTHR-02, WTHR-03, WTHR-04
**Success Criteria** (what must be TRUE):
  1. The system fetches NWS forecast data for the Hampton Roads area (Norfolk station) and parses wind speed, precipitation probability, visibility, and cloud ceiling
  2. Flight parameters are configurable: max sustained wind, max gust, max precipitation probability, min visibility, min cloud ceiling
  3. A scheduled check (n8n cron or edge function) runs daily and flags any job in the next 48 hours with conditions outside safe parameters
  4. The admin weather view shows current conditions and a 48-hour forecast with pass/fail indicators against flight parameters
**Plans**: 3 plans

### Phase 6: Integration and Edge Cases
**Goal**: The complete pipeline works end-to-end and handles real-world edge cases gracefully
**Depends on**: All previous phases
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04
**Success Criteria** (what must be TRUE):
  1. A test call through the full pipeline (dial 757 number, talk to bot, hang up) results in a request visible in admin within 60 seconds
  2. An out-of-service-area caller receives a polite decline with a suggestion to search for local providers
  3. The admin call log page shows recent calls with: timestamp, caller name, duration, outcome (qualified, declined, transferred), and a link to the transcript
  4. The admin leads page shows bot-sourced leads with qualification status and whether they converted to a quote
**Plans**: 3 plans

## Progress

**Execution Order:**
Phases execute in numeric order: 1 > 2 > 3 > 4 > 5 > 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Intake API and Lead Tracking | 0/3 | Not started | — |
| 2. Vapi Voice Bot | 0/3 | Not started | — |
| 3. n8n Vapi Pipeline | 0/2 | Not started | — |
| 4. Scheduling and Availability | 0/3 | Not started | — |
| 5. Weather Operations | 0/3 | Not started | — |
| 6. Integration and Edge Cases | 0/3 | Not started | — |
