# Requirements: v2.0 Billing, Equipment, and Production Readiness

**Defined:** 2026-03-05
**Core Value:** A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.

## v2.0 Requirements

### Billing

- [ ] **BILL-01**: Deposit amount is fixed at 50% of package price in quote creation
- [ ] **BILL-02**: Admin can trigger balance invoice creation via Square after job processing completes
- [ ] **BILL-03**: Watermarked preview thumbnails are generated during the processing pipeline and stored separately from originals
- [ ] **BILL-04**: Client receives balance due email with 2 to 3 watermarked preview thumbnails and Square payment link
- [ ] **BILL-05**: Square webhook processes balance payment confirmation and triggers receipt and delivery
- [ ] **BILL-06**: Client receives receipt email after balance payment clears
- [ ] **BILL-07**: Full resolution deliverables release automatically after balance payment confirmed
- [ ] **BILL-08**: Admin payments panel shows deposit and balance status per job with paid, pending, and overdue states

### Equipment

- [ ] **EQUIP-01**: Admin can create, edit, and delete accessories with type, name, serial number, and status
- [ ] **EQUIP-02**: Admin can assign compatible aircraft to each accessory
- [ ] **EQUIP-03**: Mission equipment selection filters accessories by selected aircraft compatibility

### Offline

- [ ] **SYNC-01**: Failed sync items move to a dead letter store after max retries instead of being deleted
- [ ] **SYNC-02**: Pilot sees persistent warning when dead letter items exist
- [ ] **SYNC-03**: Offline flight log queueing works end to end (log offline, auto-sync on reconnect, data appears in Supabase)
- [ ] **SYNC-04**: Sync engine uses try/catch fallback pattern instead of navigator.onLine checks

### Deployment

- [ ] **DEPLOY-01**: Production PWA icons with Sentinel branding replace SVG placeholders (same filenames for cache compatibility)
- [ ] **DEPLOY-02**: Trestle deployed as standalone Vercel project at trestle.sentinelaerial.com
- [ ] **DEPLOY-03**: Supabase auth redirect URLs include trestle.sentinelaerial.com
- [ ] **DEPLOY-04**: Square production environment configured with production webhook registration

## Future Requirements

### Billing (v2.x)

- **BILL-09**: Overdue payment reminder emails sent automatically via cron
- **BILL-10**: Payment history and ledger view in admin
- **BILL-11**: Customer portal shows balance status on token-based delivery page

### Equipment (v2.x)

- **EQUIP-04**: Accessory maintenance logging via existing maintenance_log table

### Offline (v2.x)

- **SYNC-05**: Sync status indicator with pending count badge and last sync timestamp

## Out of Scope

| Feature | Reason |
|---------|--------|
| Client login portal | Single pilot operation, clients interact via email only |
| Configurable deposit percentage | Fixed 50% is simple and predictable for both parties |
| Real-time payment notifications via WebSocket | Square webhooks fire within seconds, no practical benefit |
| On-demand watermark generation | Generate during pipeline, serve static files, avoid edge function memory limits |
| Partial payment tracking | Two-invoice model (deposit + balance) is deliberately simple |
| Multi-currency | Hampton Roads local business, USD only |
| Outbound calling | v1.1 scope, inbound only |
| Voice bot changes | v1.1 complete |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BILL-01 | — | Pending |
| BILL-02 | — | Pending |
| BILL-03 | — | Pending |
| BILL-04 | — | Pending |
| BILL-05 | — | Pending |
| BILL-06 | — | Pending |
| BILL-07 | — | Pending |
| BILL-08 | — | Pending |
| EQUIP-01 | — | Pending |
| EQUIP-02 | — | Pending |
| EQUIP-03 | — | Pending |
| SYNC-01 | — | Pending |
| SYNC-02 | — | Pending |
| SYNC-03 | — | Pending |
| SYNC-04 | — | Pending |
| DEPLOY-01 | — | Pending |
| DEPLOY-02 | — | Pending |
| DEPLOY-03 | — | Pending |
| DEPLOY-04 | — | Pending |

**Coverage:**
- v2.0 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 after initial definition*
