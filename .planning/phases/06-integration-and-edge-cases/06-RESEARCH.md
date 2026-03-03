# Phase 6: Integration and Edge Cases - Research

**Researched:** 2026-03-03
**Domain:** End-to-end voice pipeline validation, admin call log and lead management UI, Vapi edge case routing
**Confidence:** HIGH (project codebase is fully readable; Vapi docs confirmed; admin page patterns are established)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-01 | End-to-end flow works: phone call to bot to webhook to n8n to intake to request to invoice | Full pipeline already built in Phases 1-3. Phase 6 validates it, fixes any integration gaps, and confirms the 60-second SLA from call-end to visible request. |
| INTG-02 | Edge cases route correctly: out of area declines politely, complex jobs offer callback, payment questions redirect | Vapi `endedReason` enum confirmed. Routing logic lives in the bot system prompt (Phase 2). Phase 6 verifies the system prompt handles all three edge cases and that declined/transferred calls populate `vapi_call_logs.outcome` and `leads.qualification_status` correctly. |
| INTG-03 | Admin call log page showing recent calls with transcript, outcome, and linked request | New admin page. Data lives in `vapi_call_logs` (transcript, outcome, duration_seconds, started_at, ended_at, call_id) linked to `leads` (caller_name, caller_phone, qualification_status) and `quote_requests` (via leads.quote_request_id). Follow QuoteRequests.tsx table pattern. |
| INTG-04 | Admin leads page showing bot-sourced leads with qualification status and whether they converted to a quote | New admin page. Data in `leads` table with joins to `quote_requests` (to show conversion). Filter by `source_channel = 'voice_bot'`. Qualification status badge + quote conversion indicator. Follow Clients.tsx pagination pattern. |
</phase_requirements>

---

## Summary

Phase 6 is primarily a validation and admin UI phase, not a new-infrastructure phase. All core systems (vapi_call_logs, leads, intake-lead edge function, n8n pipeline, quote_requests) were built in Phases 1 through 3. What Phase 6 adds is (1) two new admin pages that surface the voice pipeline data to Iron, (2) verification that the full pipeline works end-to-end within the 60-second SLA, and (3) confirmation that edge case calls (out of area, complex/commercial, payment disputes) result in the correct `outcome` and `qualification_status` values in the database.

The two new admin pages follow the established project pattern exactly. The call log page mirrors QuoteRequests.tsx: a filterable table with a detail dialog showing the transcript. The leads page mirrors Clients.tsx: a paginated, searchable table with badge status indicators. Both pages query Supabase directly via `@tanstack/react-query`, use `shadcn/ui` Table and Badge components, and require no new dependencies. The only routing additions needed are two new entries in AdminNav.tsx (under a "Voice" or expanded "Quotes" category) and two new routes in App.tsx.

The integration gap most likely to surface is that `vapi_call_logs` rows may not have an admin RLS policy. The table was created with `service_role` only access. Admin-facing pages query with the anon/authenticated Supabase client, which will get denied. A migration adding `admins_read_vapi_call_logs` and `admins_read_leads` policies is required before the UI can query these tables. The `leads` table migration already includes an admin read policy, but `vapi_call_logs` does not.

**Primary recommendation:** Build the two admin pages using the QuoteRequests.tsx and Clients.tsx patterns exactly. Fix the `vapi_call_logs` RLS gap in a migration first. Test the full pipeline with a real or simulated call before marking INTG-01 complete.

---

## Standard Stack

### Core (already in project, no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.56.2 | Fetch call logs and leads from Supabase | Already used in all admin pages. Provides caching, loading states, refetch on demand. |
| @supabase/supabase-js | ^2.86.0 | Query vapi_call_logs and leads tables | Already used everywhere. Anon client for admin-authenticated reads. |
| shadcn/ui (Table, Badge, Dialog, Button, ScrollArea) | current | Admin page UI components | Already used in QuoteRequests.tsx, Clients.tsx, DroneJobs.tsx. |
| lucide-react | ^0.462.0 | Icons: Phone, Clock, User, CheckCircle, XCircle, ArrowRight, FileText | Already used throughout admin pages. |
| date-fns | ^3.6.0 | Format call timestamps (startedAt, endedAt) | Already used in QuoteRequests.tsx, Dashboard.tsx. |
| react-router-dom | ^6.26.2 | New routes for /admin/call-logs and /admin/leads | Already used in App.tsx. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-scroll-area | current | Transcript viewer inside Dialog | Already in project. Full transcript text can be long. ScrollArea keeps the dialog bounded. |
| zod | ^3.23.8 | Type validation if edge function response types need guarding | Already in project. Use only if needed for type narrowing. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Table with Dialog for transcript | Separate transcript detail page (/admin/call-logs/:id) | Detail page requires a route + back navigation. Dialog is faster to build, sufficient for this MVP. Use Dialog for Phase 6. |
| Direct Supabase query for call log data | Vapi API to fetch call transcript | Vapi API requires an API key credential call from the client, adds a dependency. DB already has the transcript from the n8n webhook. Query DB. |

**Installation:** No new packages. All dependencies present.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
  pages/admin/
    CallLogs.tsx              # New: /admin/call-logs
    Leads.tsx                 # New: /admin/leads
  components/admin/
    CallTranscriptDialog.tsx  # New: shows full transcript + messages_json in a Dialog

supabase/
  migrations/
    20260303200000_vapi_call_logs_admin_rls.sql   # Add admin read RLS to vapi_call_logs
```

### Pattern 1: Call Logs Page (follows QuoteRequests.tsx)

**What:** A filterable table of recent calls. Filters: outcome (all / qualified / declined / transferred / abandoned). Columns: timestamp, caller name, phone, duration, outcome badge, linked request link, transcript button.
**When to use:** INTG-03 requires this exact layout.

```typescript
// Source: follows D:/Projects/FaithandHarmony/src/pages/admin/QuoteRequests.tsx pattern

// Data shape for the call log list
type CallLogRow = {
  id: string;
  call_id: string;
  caller_number: string | null;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  outcome: string | null;       // qualified | declined | transferred | voicemail | abandoned
  transcript: string | null;
  summary: string | null;
  lead_id: string | null;
  // joined from leads:
  leads: {
    caller_name: string;
    caller_phone: string;
    quote_request_id: string | null;
  } | null;
};

// React Query fetch
const { data: callLogs = [], isLoading } = useQuery({
  queryKey: ['vapi-call-logs', outcomeFilter],
  queryFn: async () => {
    let query = supabase
      .from('vapi_call_logs')
      .select(`
        id, call_id, caller_number, duration_seconds,
        started_at, ended_at, outcome, transcript, summary, lead_id,
        leads ( caller_name, caller_phone, quote_request_id )
      `)
      .order('started_at', { ascending: false })
      .limit(100);

    if (outcomeFilter !== 'all') {
      query = query.eq('outcome', outcomeFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CallLogRow[];
  },
});
```

### Pattern 2: Transcript Viewer Dialog

**What:** A Dialog containing the full transcript text inside a ScrollArea. Shows the summary at the top, then the full transcript, and a link to the linked quote request if one exists.
**When to use:** When admin clicks the transcript icon in the call log table row.

```typescript
// Source: follows D:/Projects/FaithandHarmony/src/pages/admin/QuoteRequests.tsx Dialog pattern

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";

function CallTranscriptDialog({
  callLog,
  onClose,
}: {
  callLog: CallLogRow | null;
  onClose: () => void;
}) {
  if (!callLog) return null;

  const durationMin = Math.floor((callLog.duration_seconds || 0) / 60);
  const durationSec = (callLog.duration_seconds || 0) % 60;

  return (
    <Dialog open={!!callLog} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Call: {callLog.leads?.caller_name ?? callLog.caller_number ?? 'Unknown'}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-3 flex gap-4">
          <span>Duration: {durationMin}m {durationSec}s</span>
          {callLog.outcome && (
            <Badge className={OUTCOME_COLORS[callLog.outcome] ?? "bg-gray-400 text-white"}>
              {callLog.outcome}
            </Badge>
          )}
          {callLog.leads?.quote_request_id && (
            <Link
              to="/admin/quote-requests"
              className="text-primary underline"
            >
              View Quote Request
            </Link>
          )}
        </div>

        {callLog.summary && (
          <div className="mb-3 p-3 bg-muted rounded-md text-sm">
            <p className="font-medium mb-1">Summary</p>
            <p className="text-muted-foreground">{callLog.summary}</p>
          </div>
        )}

        <ScrollArea className="flex-1 border rounded-md p-4">
          <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {callLog.transcript ?? 'No transcript available.'}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 3: Leads Page (follows Clients.tsx with source filter)

**What:** A paginated, searchable table of bot-sourced leads. Filters: qualification status (all / qualified / declined / transferred / pending). Shows whether the lead converted to a quote request.
**When to use:** INTG-04 requires this layout.

```typescript
// Source: follows D:/Projects/FaithandHarmony/src/pages/admin/Clients.tsx pattern

type LeadRow = {
  id: string;
  created_at: string;
  caller_name: string;
  caller_phone: string;
  caller_email: string | null;
  source_channel: string;
  qualification_status: string;
  call_id: string | null;
  client_id: string | null;
  quote_request_id: string | null;
  // joined from quote_requests:
  quote_requests: {
    id: string;
    status: string;
  } | null;
};

// React Query fetch with pagination
const { data, isLoading, refetch } = useQuery({
  queryKey: ['leads', page, search, statusFilter],
  queryFn: async () => {
    let query = supabase
      .from('leads')
      .select(`
        id, created_at, caller_name, caller_phone, caller_email,
        source_channel, qualification_status, call_id, client_id, quote_request_id,
        quote_requests ( id, status )
      `, { count: 'exact' })
      .eq('source_channel', 'voice_bot')   // INTG-04: bot-sourced only
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(`caller_name.ilike.%${search}%,caller_phone.ilike.%${search}%`);
    }
    if (statusFilter !== 'all') {
      query = query.eq('qualification_status', statusFilter);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { leads: data as LeadRow[], total: count || 0 };
  },
  staleTime: 2 * 60 * 1000,
});
```

### Pattern 4: Outcome Badge Color Map

**What:** Consistent badge colors for call outcomes and lead qualification statuses across both pages.
**When to use:** In both CallLogs.tsx and Leads.tsx.

```typescript
// Source: follows STATUS_COLORS pattern in QuoteRequests.tsx

const OUTCOME_COLORS: Record<string, string> = {
  qualified:    "bg-green-600 text-white",
  declined:     "bg-red-500 text-white",
  transferred:  "bg-blue-500 text-white",
  voicemail:    "bg-slate-500 text-white",
  abandoned:    "bg-gray-400 text-white",
  pending:      "bg-amber-500 text-white",
};

// qualification_status uses the same set
const QUAL_STATUS_COLORS = OUTCOME_COLORS;
```

### Pattern 5: AdminNav Update

**What:** Add the two new pages to AdminNav.tsx dropdown categories. Add them under the existing "Quotes" category or create a new "Voice" category.
**When to use:** Required before the pages are reachable from the nav.

```typescript
// Source: D:/Projects/FaithandHarmony/src/pages/admin/components/AdminNav.tsx
// Add to navCategories array. Option A: extend existing Quotes category.

{
  label: "Quotes",
  icon: FileText,
  items: [
    { href: "/admin/quote-requests", label: "Quote Requests", icon: Inbox },
    { href: "/admin/call-logs",      label: "Call Logs",     icon: Phone },
    { href: "/admin/leads",          label: "Leads",         icon: Target },
  ],
},
```

Import `Phone` from `lucide-react` (not yet imported in AdminNav). `Target` is already imported.

### Pattern 6: App.tsx Route Registration

**What:** Register the two new admin routes in App.tsx following the existing lazy-load pattern.
**When to use:** Required before the pages render.

```typescript
// Source: D:/Projects/FaithandHarmony/src/App.tsx lazy import pattern

const CallLogs = lazy(() => import("./pages/admin/CallLogs"));
const Leads    = lazy(() => import("./pages/admin/Leads"));

// In the Routes block, after QuoteRequests route:
<Route path="/admin/call-logs" element={<AdminRoute><CallLogs /></AdminRoute>} />
<Route path="/admin/leads"     element={<AdminRoute><Leads /></AdminRoute>} />
```

### Pattern 7: RLS Migration for vapi_call_logs Admin Read

**What:** The `vapi_call_logs` table was created with `service_role` only access. Admin users querying with the standard Supabase client (anon + JWT) will get a 403. A migration must add an admin read policy before the UI can display call logs.
**When to use:** This migration MUST run before any UI development on CallLogs.tsx is validated.

```sql
-- Source: follows 20260303100000_create_leads_table.sql pattern
-- Add admin read access to vapi_call_logs (matches admins_read_leads pattern)

CREATE POLICY "admins_read_vapi_call_logs" ON public.vapi_call_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### Anti-Patterns to Avoid

- **Building a transcript fetch from Vapi API on the client:** The transcript already lives in `vapi_call_logs.transcript`. Query the DB. Calling Vapi's API from the browser adds an API key exposure risk and a network round-trip.
- **Showing all leads regardless of source_channel:** The leads table accepts web and manual sources too. INTG-04 specifically says "bot-sourced leads." Filter on `source_channel = 'voice_bot'` in the query.
- **Linking to a quote request by ID in the URL:** There is no per-record quote request route like `/admin/quote-requests/:id`. The existing QuoteRequests page is a list view. Link to `/admin/quote-requests` and tell admin to search. Or add a visual indicator ("View in Quote Requests") that navigates to the list. Do not build a detail route for this phase.
- **Displaying duration_seconds as a raw integer:** Format as "Xm Ys" (e.g., "2m 34s"). Raw seconds like "154" is not readable at a glance.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transcript formatting | Custom markdown or HTML renderer | `<pre className="whitespace-pre-wrap">` inside ScrollArea | Vapi transcript is plain text. No markdown. Pre tag with wrap is sufficient. |
| Call duration formatting | Custom duration utility | Inline `Math.floor(sec/60) + "m " + (sec%60) + "s"` | One-liner. No library needed. |
| Pagination | Custom pagination component | Copy Clients.tsx pagination block (Previous/Next buttons) | Already exists, tested, consistent UI. |
| RLS for new pages | Custom API layer or serverless function | Supabase `has_role()` RLS policy (already used in leads table) | All existing tables use this exact pattern. Consistent. |
| Outcome status logic | Custom n8n or edge function to compute outcome | Read `vapi_call_logs.outcome` column (set by n8n in Phase 3) | n8n already writes outcome to the DB in Phase 3. The admin page just reads it. |

**Key insight:** Phase 6 is a display phase. The data pipeline writes everything. The admin pages are read-only surfaces over data that already exists.

---

## Common Pitfalls

### Pitfall 1: vapi_call_logs Has No Admin RLS Policy

**What goes wrong:** The CallLogs admin page returns 0 rows or throws a permission error. The Supabase client silently returns an empty array (RLS denies the query without throwing to the client).
**Why it happens:** The original `vapi_call_logs` migration (`20260301191812_vapi_call_logs.sql`) created a single `service_role_all` policy. Admin JWT tokens do not match `auth.role() = 'service_role'`.
**How to avoid:** Create the RLS migration (Pattern 7 above) before writing any UI code. Verify with a manual Supabase query in the dashboard using an admin JWT.
**Warning signs:** `useQuery` returns `data = []` with no error even though rows exist in the DB.

### Pitfall 2: leads.quote_request_id Is Null for Declined Calls

**What goes wrong:** The "converted to quote" indicator on the Leads page shows no conversion for declined calls, even though the lead record exists. This is correct behavior but can be confused with a data bug.
**Why it happens:** The `intake-lead` edge function only creates a `quote_request` for qualified intakes. Declined calls create a `leads` row with `qualification_status: 'declined'` but `quote_request_id: null`.
**How to avoid:** Render "No quote" text (not an error state) when `quote_request_id` is null. The column being null is a valid state for declined leads.
**Warning signs:** "Missing data" confusion during testing. Verify against actual declined test calls.

### Pitfall 3: vapi_call_logs.started_at Is Null for Some Rows

**What goes wrong:** Sorting by `started_at` descending shows null-started_at rows at the top or throws a client-side sort error.
**Why it happens:** The `started_at` column is nullable. Some test calls or early integrations may not have populated this field.
**How to avoid:** Fall back to `created_at` for display when `started_at` is null. Use `started_at ?? created_at` for the timestamp column. Order by `created_at` as the reliable fallback sort key.
**Warning signs:** Null timestamps displayed as "Invalid Date" by date-fns format().

### Pitfall 4: The 60-Second SLA Includes n8n Processing Time

**What goes wrong:** A test call ends. The admin checks Quote Requests after 30 seconds and sees nothing. Conclusion: the pipeline is broken. Actual issue: n8n processing takes 5-20 seconds after Vapi fires the webhook, plus edge function latency.
**Why it happens:** The SLA of 60 seconds is end-to-end: call hangup to visible request. Vapi fires the webhook within seconds of call end. n8n processes the webhook. The intake edge function inserts the quote_request row. The admin page caches data for 5 minutes by default (staleTime in React Query).
**How to avoid:** During end-to-end testing, add a manual Refresh button on the Quote Requests page (already present) and use it. Set `staleTime: 0` or `refetchInterval: 10000` during initial testing to catch fresh data. Revert to production staleTime after validation.
**Warning signs:** SLA test appears to fail but a manual refresh reveals the request was created on time.

### Pitfall 5: Joining vapi_call_logs to leads via lead_id vs call_id

**What goes wrong:** The query joins `vapi_call_logs` to `leads` via `lead_id` (the FK on `vapi_call_logs`), but some rows have `lead_id = null` because the `intake-lead` update that sets `lead_id` is a best-effort fire-and-forget. Calls that fail intake may have `lead_id = null` but still have a transcript.
**Why it happens:** The `intake-lead` edge function does a non-fatal update of `vapi_call_logs.lead_id` after inserting the lead. If the call log row was not yet created when n8n processed the intake, `lead_id` stays null.
**How to avoid:** In the CallLogs page, display the lead join data if present but treat it as optional. Show caller_number from `vapi_call_logs.caller_number` as the fallback identifier when `leads` is null.
**Warning signs:** Some call log rows showing "Unknown Caller" but having a valid transcript.

### Pitfall 6: Edge Case Routing Depends on Phase 2 System Prompt

**What goes wrong:** INTG-02 validation reveals out-of-area callers are not declined politely because the Phase 2 system prompt did not include the Hampton Roads service area boundaries or the transfer/decline flow.
**Why it happens:** Phase 6 is the validation phase but cannot retroactively fix Phase 2 prompt content. If the Phase 2 system prompt is incomplete, INTG-02 will fail validation and require a Phase 2 system prompt update before Phase 6 is marked complete.
**How to avoid:** Before writing any Phase 6 code, manually test the bot with an out-of-service-area scenario and a payment dispute scenario. Verify the bot responds correctly. If it does not, update the system prompt (Phase 2 artifact) first.
**Warning signs:** During end-to-end testing, out-of-area test calls result in `qualification_status: 'pending'` instead of `declined` or `transferred`.

---

## Code Examples

### Full CallLogs.tsx Page Skeleton

```typescript
// Source: adapted from QuoteRequests.tsx pattern
// D:/Projects/FaithandHarmony/src/pages/admin/CallLogs.tsx

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Phone, RefreshCw, FileText } from "lucide-react";
import { format } from "date-fns";

const OUTCOME_COLORS: Record<string, string> = {
  qualified:   "bg-green-600 text-white",
  declined:    "bg-red-500 text-white",
  transferred: "bg-blue-500 text-white",
  voicemail:   "bg-slate-500 text-white",
  abandoned:   "bg-gray-400 text-white",
  pending:     "bg-amber-500 text-white",
};

const OUTCOME_FILTERS = ["All", "qualified", "declined", "transferred", "voicemail", "abandoned"];

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CallLogs() {
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selectedLog, setSelectedLog] = useState<CallLogRow | null>(null);
  const queryClient = useQueryClient();

  const { data: callLogs = [], isLoading } = useQuery({
    queryKey: ["vapi-call-logs", outcomeFilter],
    queryFn: async () => {
      let query = supabase
        .from("vapi_call_logs")
        .select(`
          id, call_id, caller_number, duration_seconds,
          started_at, ended_at, outcome, transcript, summary, lead_id,
          leads ( caller_name, caller_phone, quote_request_id )
        `)
        .order("started_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (outcomeFilter !== "All") {
        query = query.eq("outcome", outcomeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallLogRow[];
    },
  });

  // ... (table render follows QuoteRequests.tsx structure)
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Call Logs</h1>
              <p className="text-sm text-muted-foreground">
                Voice bot calls from the 757 line
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["vapi-call-logs"] })}
            className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Outcome filter bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {OUTCOME_FILTERS.map((f) => (
            <Button key={f} variant={outcomeFilter === f ? "default" : "outline"}
              size="sm" onClick={() => setOutcomeFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading call logs...</div>
        ) : callLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No calls found.</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Transcript</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {log.started_at
                        ? format(new Date(log.started_at), "MMM d, h:mm a")
                        : "Unknown"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.leads?.caller_name ?? log.caller_number ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.leads?.caller_phone ?? log.caller_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(log.duration_seconds)}
                    </TableCell>
                    <TableCell>
                      {log.outcome ? (
                        <Badge className={OUTCOME_COLORS[log.outcome] ?? "bg-gray-400 text-white"}>
                          {log.outcome}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.leads?.quote_request_id ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Linked
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.transcript ? (
                        <Button variant="ghost" size="sm" className="gap-1"
                          onClick={() => setSelectedLog(log)}>
                          <FileText className="h-3.5 w-3.5" /> View
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No transcript</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Transcript dialog */}
      {selectedLog && (
        <CallTranscriptDialog callLog={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
```

### RLS Migration for vapi_call_logs

```sql
-- Source: follows 20260303100000_create_leads_table.sql RLS pattern
-- File: supabase/migrations/20260303200000_vapi_call_logs_admin_rls.sql

-- Admin read policy for vapi_call_logs (matches leads table pattern)
CREATE POLICY "admins_read_vapi_call_logs" ON public.vapi_call_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### End-to-End Test Checklist (INTG-01)

```
Manual validation script:

1. Call 757 number
2. Respond to bot: name, service type (Listing Pro), property address in Hampton Roads, preferred date
3. Hang up (or let bot conclude call)
4. Start timer

Within 60 seconds:
  [ ] n8n execution log shows wf5 ran successfully
  [ ] vapi_call_logs row exists with call_id, transcript, outcome = 'qualified'
  [ ] leads row exists linked to vapi_call_logs via lead_id
  [ ] quote_requests row exists with source = 'voice_bot', status = 'new'
  [ ] Admin Quote Requests page (refreshed) shows the new request

Edge case: Out-of-area call (caller says "I'm in Richmond VA"):
  [ ] Bot responds with polite decline + suggestion to search for local providers
  [ ] vapi_call_logs.outcome = 'declined'
  [ ] leads.qualification_status = 'declined'
  [ ] No quote_request created (leads.quote_request_id = null)
```

---

## Existing Infrastructure to Build On

This phase builds ON these. Do not recreate them.

| What Exists | Location | How Phase 6 Uses It |
|-------------|----------|---------------------|
| `vapi_call_logs` table | DB (from 20260301191812 + 20260303100001) | Primary data source for CallLogs.tsx |
| `leads` table | DB (from 20260303100000) | Primary data source for Leads.tsx |
| `intake-lead` edge function | `supabase/functions/intake-lead/` | Already writes to both tables on each call |
| `leads` admin RLS policy | 20260303100000 (`admins_read_leads`) | Already exists, Leads page works without migration |
| QuoteRequests.tsx | `src/pages/admin/QuoteRequests.tsx` | Template for CallLogs.tsx |
| Clients.tsx | `src/pages/admin/Clients.tsx` | Template for Leads.tsx |
| AdminNav.tsx | `src/pages/admin/components/AdminNav.tsx` | Add new nav items here |
| App.tsx | `src/App.tsx` | Add new lazy routes here |
| `qualification_status` values | leads table | qualified, declined, transferred, pending |
| `outcome` values | vapi_call_logs table | qualified, declined, transferred, voicemail, abandoned |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual admin call review (Iron listens to recording) | vapi_call_logs.transcript in admin UI | Iron reads full transcript in 30 seconds instead of listening to full call |
| Lead data in voice notes or CRM | leads table linked to quote_requests | Bot-sourced leads are in the same system as web leads |
| No visibility into declined calls | outcome + qualification_status columns | Iron can see why calls were declined and follow up if needed |

---

## Open Questions

1. **Does vapi_call_logs.outcome get set by n8n or by the Vapi analysisPlan?**
   - What we know: The `intake-lead` edge function sets `outcome` on the vapi_call_logs row using `qualification_status` from the n8n payload (which comes from `sd.qualification_status` in the Vapi analysisPlan). This requires n8n to run the intake workflow.
   - What's unclear: For calls where n8n fails or for calls that are too short for intake (voicemails, hangups), `outcome` stays null. The CallLogs page must handle null outcome gracefully.
   - Recommendation: Show a neutral badge ("Unknown") for null outcome rather than hiding those rows. They still have transcripts and are useful for debugging.

2. **Should the leads page link directly to the quote request record?**
   - What we know: There is no `/admin/quote-requests/:id` detail route. The QuoteRequests page is a flat list view.
   - What's unclear: Whether Iron wants a direct link to the specific quote request row or just to the Quote Requests page.
   - Recommendation: Add a "View in Quote Requests" link that navigates to `/admin/quote-requests` and opens the browser. The URL does not need the specific record ID for Phase 6. If a detail view is needed, it should be scoped to a separate phase or the QuoteRequests page should be updated to support deep-linking.

3. **Is call recording URL (vapi_call_logs.recording_url) in scope for Phase 6?**
   - What we know: The vapi_call_logs table has a `recording_url` column. Vapi can store call recordings.
   - What's unclear: Whether this column is populated (depends on Vapi recording settings in Phase 2) and whether Iron wants to play recordings from the admin UI.
   - Recommendation: Include recording_url in the CallLogs data fetch but do not build a media player for Phase 6. Show a simple external link icon if recording_url is non-null. The success criteria do not mention recording playback.

---

## Sources

### Primary (HIGH confidence)

- `D:/Projects/FaithandHarmony/supabase/migrations/20260303100000_create_leads_table.sql` - leads table schema, RLS policies, indexes
- `D:/Projects/FaithandHarmony/supabase/migrations/20260303100001_vapi_call_logs_phase1.sql` - vapi_call_logs added columns: sentiment, outcome, lead_id
- `D:/Projects/FaithandHarmony/supabase/migrations/20260301191812_vapi_call_logs.sql` - original vapi_call_logs schema: call_id, transcript, duration_seconds, started_at, ended_at, summary, messages_json
- `D:/Projects/FaithandHarmony/supabase/functions/intake-lead/index.ts` - how vapi_call_logs.lead_id and outcome are set post-intake
- `D:/Projects/FaithandHarmony/src/pages/admin/QuoteRequests.tsx` - template for CallLogs.tsx (table, filter bar, Dialog pattern)
- `D:/Projects/FaithandHarmony/src/pages/admin/Clients.tsx` - template for Leads.tsx (pagination, search, badge pattern)
- `D:/Projects/FaithandHarmony/src/pages/admin/components/AdminNav.tsx` - nav structure to extend
- `D:/Projects/FaithandHarmony/src/App.tsx` - lazy route registration pattern
- `D:/Projects/FaithandHarmony/.planning/phases/03-n8n-vapi-pipeline/03-RESEARCH.md` - Vapi payload paths, n8n workflow structure, analysisPlan schema
- `https://docs.vapi.ai/api-reference/calls/get` - Call object: id, startedAt, endedAt, endedReason, analysis.summary, analysis.structuredData, artifact.transcript
- `https://docs.vapi.ai/calls/call-ended-reason` - Complete endedReason enum (customer-ended-call, assistant-ended-call, voicemail, silence-timed-out, customer-did-not-answer, etc.)

### Secondary (MEDIUM confidence)

- `https://docs.vapi.ai/server-url/events` - end-of-call-report webhook structure: `{ message: { type, endedReason, call, artifact: { transcript, messages, recording } } }`
- `https://docs.vapi.ai/assistants/call-analysis` - analysis.summary, analysis.structuredData, analysis.successEvaluation available on call object post-call

### Tertiary (LOW confidence)

- Timing of vapi_call_logs row creation (n8n vs Vapi direct): inferred from Phase 1 and Phase 3 research. Verify during end-to-end testing.
- 60-second SLA feasibility: depends on n8n processing latency in production. Estimated 5-15 seconds typical. Not stress-tested.

---

## Metadata

**Confidence breakdown:**
- Admin page patterns: HIGH - direct code read of QuoteRequests.tsx, Clients.tsx, AdminNav.tsx, App.tsx
- Database schema: HIGH - direct read of all relevant migrations
- Vapi call object / webhook payload: MEDIUM - confirmed via official Vapi docs; specific field names verified against Phase 3 research which cites community verification
- RLS gap identification: HIGH - direct read of original vapi_call_logs migration confirms no admin read policy
- 60-second SLA: MEDIUM - theoretical based on understanding the pipeline; needs empirical validation in testing

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (admin page patterns are stable; Vapi API could change key names)
