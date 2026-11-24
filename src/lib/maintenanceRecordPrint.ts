// Per-aircraft maintenance record, print/PDF view (Adam decision 2026-11-22 #0,
// part 3). Builds one self-contained HTML document on the approved Sentinel
// Aerial Inspections letterhead (vault agent-office/templates/sai-letterhead.html,
// tokens #E85D26 / Bebas Neue / Geist). Company details come from
// cowork-context/business-facts.md only.
//
// This is a MAINTENANCE RECORD. It must never say or imply certification,
// airworthiness or compliance, so the letterhead's "FAA Part 107 Certified"
// tagline and "FAA Part 107" footer badge are left off on purpose.
//
// Layout: the letterhead header and footer sit in a table <thead>/<tfoot>,
// which Chrome repeats on every printed page; page numbers come from the
// @page bottom-right margin box. Rows never split across pages.
import type { Aircraft, MaintenanceLogEntry } from '@/types/fleet';
import { eventTypeLabel, formatFlightHours, formatNextDue, orUnknown } from '@/lib/maintenanceRecord';
import { newestPerTypeAndComponent } from '@/lib/maintenanceQuarterly';

export const RECORD_TITLE = 'Aircraft Maintenance Record';
export const NOT_A_CERTIFICATION =
  'This is a maintenance record of work logged in the company CRM. It is not a certification, ' +
  'an airworthiness determination or a statement of regulatory compliance.';
export const EMPTY_HISTORY = 'No maintenance recorded for this aircraft in this reporting period.';
export const NO_NEXT_DUE = 'No next-due date or flight-hour threshold is recorded.';

/** From cowork-context/business-facts.md (company, city, phone, email, website). */
export const SAI_LETTERHEAD = {
  company: 'Sentinel Aerial Inspections',
  tagline: 'Veteran-Owned',
  legalName: 'Faith &amp; Harmony LLC (DBA)',
  cityState: 'Chesapeake, Virginia',
  phone: '757.843.8772',
  email: 'info@faithandharmonyllc.com',
  website: 'sentinelaerialinspections.com',
};

export interface ReportingPeriod {
  /** YYYY-MM-DD, inclusive */
  from: string;
  /** YYYY-MM-DD, inclusive */
  to: string;
}

export interface MaintenanceRecordInput {
  aircraft: Pick<Aircraft, 'id' | 'model' | 'serial_number' | 'nickname' | 'faa_registration' | 'firmware_version' | 'status'>;
  entries: MaintenanceLogEntry[];
  period: ReportingPeriod;
  /** YYYY-MM-DD the record was generated */
  generatedOn: string;
  /** URL or path of the SAI crest image */
  crestSrc: string;
  /** Banner text for sample/test output, e.g. "TEST DATA - NOT A REAL AIRCRAFT" */
  testBanner?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const esc = (v: string | null | undefined) => escapeHtml(orUnknown(v ?? null));
const day = (iso: string) => iso.slice(0, 10);

/** Entries for this aircraft inside the period, oldest first. TEST rows only when the record is a labelled test. */
export function entriesInPeriod(input: MaintenanceRecordInput): MaintenanceLogEntry[] {
  const { aircraft, entries, period, testBanner } = input;
  return entries
    .filter(
      (e) =>
        (e.aircraft_id === aircraft.id || (e.equipment_type === 'aircraft' && e.equipment_id === aircraft.id)) &&
        (testBanner ? true : !e.is_test) &&
        day(e.performed_at) >= period.from &&
        day(e.performed_at) <= period.to
    )
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
}

/**
 * Next-due items across the aircraft's whole history (not only the period),
 * soonest date first. Only the newest entry per event type + component counts
 * (same rule as the quarterly view): a newer entry supersedes the older one's
 * schedule.
 */
export function nextDueItems(input: MaintenanceRecordInput): MaintenanceLogEntry[] {
  const { aircraft, entries, testBanner } = input;
  const history = entries
    .filter(
      (e) =>
        (e.aircraft_id === aircraft.id || (e.equipment_type === 'aircraft' && e.equipment_id === aircraft.id)) &&
        (testBanner ? true : !e.is_test)
    )
    .sort((a, b) => b.performed_at.localeCompare(a.performed_at));
  return newestPerTypeAndComponent(history)
    .filter(
      (e) => formatNextDue({ next_due_date: e.next_due_date, next_due_flight_hours: e.next_due_flight_hours ?? null }) !== 'not set'
    )
    .sort((a, b) => (a.next_due_date ?? '9999').localeCompare(b.next_due_date ?? '9999'));
}

const CSS = `
@page {
  size: letter;
  margin: 0.5in 0.75in 0.6in 0.75in;
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-family: 'Geist', 'Segoe UI', sans-serif; font-size: 8pt; color: #64607a;
  }
  @bottom-left {
    content: "${RECORD_TITLE}";
    font-family: 'Geist', 'Segoe UI', sans-serif; font-size: 8pt; color: #64607a;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Geist', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; line-height: 1.45; color: #1a1a1a; background: #fff; }
table.page { width: 100%; border-collapse: collapse; }
table.page > thead > tr > td, table.page > tfoot > tr > td { padding: 0; }
.letterhead-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 4px solid #e85d26; margin-bottom: 10px; }
.letterhead-brand { display: flex; align-items: center; gap: 12px; }
.letterhead-logo { height: 50px; width: auto; }
.letterhead-company { font-family: 'Bebas Neue', 'Geist', sans-serif; font-size: 21pt; color: #0f0f0f; letter-spacing: 0.5px; text-transform: uppercase; }
.letterhead-tagline { font-size: 8.5pt; color: #e85d26; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px; }
.letterhead-contact { text-align: right; font-size: 8.5pt; color: #3a3a3a; line-height: 1.6; }
.letterhead-contact strong { color: #0f0f0f; }
.letterhead-footer { border-top: 2px solid #e85d26; margin-top: 12px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64607a; }
.test-banner { background: #8b1a1a; color: #fff; text-align: center; padding: 5px; font-size: 9pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
.doc-title-block { border-left: 5px solid #e85d26; padding-left: 14px; margin-bottom: 14px; }
.doc-type { font-size: 9pt; color: #e85d26; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px; }
.doc-title { font-family: 'Bebas Neue', 'Geist', sans-serif; font-size: 24pt; color: #0f0f0f; line-height: 1.15; }
.doc-subtitle { font-size: 10.5pt; color: #64607a; }
.notice { background: #fff3ec; border-left: 4px solid #e85d26; padding: 8px 12px; margin: 0 0 14px 0; font-size: 9pt; }
.metadata-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; background: #faf8f3; border: 1px solid #d9d0c4; border-left: 4px solid #e85d26; padding: 10px 16px; margin-bottom: 16px; font-size: 9pt; break-inside: avoid; }
.metadata-grid .row { display: flex; justify-content: space-between; border-bottom: 1px dotted #d0ccc4; padding: 2px 0; }
.metadata-grid .label { color: #64607a; font-weight: 600; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px; }
.metadata-grid .value { color: #0f0f0f; font-weight: 500; text-align: right; }
h2 { font-family: 'Bebas Neue', 'Geist', sans-serif; font-weight: 400; font-size: 15pt; color: #0f0f0f; border-bottom: 1px solid #e85d26; padding-bottom: 3px; margin: 12px 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; break-after: avoid; }
table.data { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 8.5pt; margin: 6px 0 10px 0; }
table.data th { background: #0f0f0f; color: #fff; padding: 6px 5px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.4px; }
table.data td { padding: 5px 5px; border-bottom: 1px solid #d9d0c4; vertical-align: top; overflow-wrap: break-word; }
table.data td.nw { white-space: nowrap; }
table.data tr { break-inside: avoid; page-break-inside: avoid; }
table.data tbody tr:nth-child(even) td { background: #faf8f3; }
.empty { font-style: italic; color: #64607a; padding: 8px 0; }
.signature { margin-top: 10px; break-inside: avoid; page-break-inside: avoid; }
.signature .lines { display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 24px; margin-top: 26px; }
.signature .line { border-top: 1px solid #0f0f0f; padding-top: 4px; font-size: 8.5pt; color: #64607a; }
`;

function metaRow(label: string, value: string) {
  return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

export function buildMaintenanceRecordHtml(input: MaintenanceRecordInput): string {
  const { aircraft, period, generatedOn, crestSrc, testBanner } = input;
  const L = SAI_LETTERHEAD;
  const history = entriesInPeriod(input);
  const due = nextDueItems(input);
  const name = aircraft.nickname ? `${esc(aircraft.model)} (${escapeHtml(aircraft.nickname)})` : esc(aircraft.model);

  const historyHtml = history.length
    ? `<table class="data"><thead><tr>
        <th style="width:12%">Date</th><th style="width:12%">Type</th><th style="width:12%">Component</th>
        <th style="width:9%">Hours</th><th style="width:22%">Work and results</th><th style="width:11%">Performed by</th>
        <th style="width:11%">Open issues</th><th style="width:11%">Next due</th>
      </tr></thead><tbody>${history
        .map(
          (e) => `<tr>
        <td class="nw">${day(e.performed_at)}</td>
        <td>${escapeHtml(eventTypeLabel(e.maintenance_type))}</td>
        <td>${esc(e.component_id)}</td>
        <td class="nw">${formatFlightHours(e.flight_hours_at_service ?? null)}</td>
        <td>${esc(e.description)}${e.results ? `<br><em>Result:</em> ${escapeHtml(e.results)}` : ''}${
          e.evidence_url ? `<br><em>Evidence:</em> ${escapeHtml(e.evidence_url)}` : ''
        }</td>
        <td>${esc(e.performed_by_name)}</td>
        <td>${escapeHtml(orUnknown(e.open_issues ?? null, 'none recorded'))}</td>
        <td>${formatNextDue({ next_due_date: e.next_due_date, next_due_flight_hours: e.next_due_flight_hours ?? null })}</td>
      </tr>`
        )
        .join('')}</tbody></table>`
    : `<p class="empty">${EMPTY_HISTORY}</p>`;

  const dueHtml = due.length
    ? `<table class="data"><thead><tr><th style="width:18%">Next due</th><th style="width:16%">Type</th><th style="width:16%">Component</th><th>From the record dated</th></tr></thead><tbody>${due
        .map(
          (e) => `<tr><td>${formatNextDue({ next_due_date: e.next_due_date, next_due_flight_hours: e.next_due_flight_hours ?? null })}</td>
        <td>${escapeHtml(eventTypeLabel(e.maintenance_type))}</td><td>${esc(e.component_id)}</td><td>${day(e.performed_at)}</td></tr>`
        )
        .join('')}</tbody></table>`
    : `<p class="empty">${NO_NEXT_DUE}</p>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${RECORD_TITLE} - ${name} - Sentinel Aerial Inspections</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body>
<table class="page">
<thead><tr><td>
  <div class="letterhead-header">
    <div class="letterhead-brand">
      <img src="${escapeHtml(crestSrc)}" alt="Sentinel Aerial Inspections" class="letterhead-logo">
      <div><div class="letterhead-company">${L.company}</div><div class="letterhead-tagline">${L.tagline}</div></div>
    </div>
    <div class="letterhead-contact"><strong>${L.legalName}</strong><br>${L.cityState}<br>${L.phone} &middot; ${L.email}<br>${L.website}</div>
  </div>
  ${testBanner ? `<div class="test-banner">${escapeHtml(testBanner)}</div>` : ''}
</td></tr></thead>
<tfoot><tr><td>
  <div class="letterhead-footer">
    <div>Sentinel Aerial Inspections &mdash; a DBA of Faith &amp; Harmony LLC &middot; Maintenance record, not a certification</div>
    <div>Generated ${escapeHtml(generatedOn)}</div>
  </div>
</td></tr></tfoot>
<tbody><tr><td>
  <div class="doc-title-block">
    <div class="doc-type">Maintenance record</div>
    <div class="doc-title">${RECORD_TITLE}</div>
    <div class="doc-subtitle">${name} &middot; Reporting period ${escapeHtml(period.from)} to ${escapeHtml(period.to)}</div>
  </div>
  <div class="notice">${NOT_A_CERTIFICATION}</div>
  <div class="metadata-grid">
    ${metaRow('Aircraft', name)}
    ${metaRow('Serial number', esc(aircraft.serial_number))}
    ${metaRow('FAA registration', esc(aircraft.faa_registration))}
    ${metaRow('Firmware', esc(aircraft.firmware_version))}
    ${metaRow('Fleet status', esc(aircraft.status))}
    ${metaRow('Reporting period', `${escapeHtml(period.from)} to ${escapeHtml(period.to)}`)}
    ${metaRow('Entries in period', String(history.length))}
    ${metaRow('Generated', escapeHtml(generatedOn))}
  </div>
  <h2>Dated maintenance history</h2>
  ${historyHtml}
  <h2>Next due</h2>
  ${dueHtml}
  <div class="signature">
    <h2>Review</h2>
    <p>Reviewed against the source records listed above. Unknown values are shown as "unknown" and were not estimated.</p>
    <div class="lines">
      <div class="line">Reviewed by (name)</div>
      <div class="line">Signature</div>
      <div class="line">Date</div>
    </div>
  </div>
</td></tr></tbody>
</table>
</body></html>`;
}
