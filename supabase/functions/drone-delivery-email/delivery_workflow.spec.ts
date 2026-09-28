// End-to-end handler tests for the report workflow and caller checks
// (Codex full audit F1, F3, F4). The fake client answers every query the
// handler makes, including job_reports and storage signing, so a report lookup
// that silently fails cannot pass these tests.
//
//   deno test --no-check supabase/functions/drone-delivery-email/delivery_workflow.spec.ts

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.190.0/testing/asserts.ts";

import { handleDeliveryRequest, makeAuthorizer } from "./delivery.ts";

const JOB_ID = "7d7c64df-5091-4ada-98a8-c74bbe67d6ab";
const JOB = {
  id: JOB_ID,
  clients: { id: "c1", name: "Pat Trustee", email: "pat@example.com" },
  drone_packages: { name: "Roof Inspection" },
  processing_templates: { path_code: "R", display_name: "Roof Condition" },
  site_address: "20279 Brewers Neck Blvd, Carrollton, VA",
};
const APPROVED = [{
  id: "r1", status: "final", generated_document_id: "d1",
  generated_documents: {
    file_name: "Sentinel_CCAME_roof_inspection_2026-09-27.pdf",
    file_path: "job-reports/j1/abc123-Sentinel_CCAME_roof_inspection_2026-09-27.pdf",
    metadata: { source: "sentinel-reports", report_complete: true },
  },
}];

// deno-lint-ignore no-explicit-any
function fakeSupabase(opts: { job?: any; deliverables?: any[]; reports?: any[] } = {}) {
  // deno-lint-ignore no-explicit-any
  const log = { tables: [] as string[], updates: [] as any[], signed: [] as string[] };
  const rows: Record<string, unknown> = {
    drone_jobs: opts.job ?? JOB,
    drone_deliverables: opts.deliverables ?? [],
    drone_assets: [],
    job_reports: opts.reports ?? [],
  };
  const client = {
    from(table: string) {
      log.tables.push(table);
      // deno-lint-ignore no-explicit-any
      let mode = "select", payload: any = null;
      const result = () => {
        if (mode === "update") {
          log.updates.push({ table, payload });
          return { data: null, error: null };
        }
        return { data: rows[table], error: null };
      };
      // deno-lint-ignore no-explicit-any
      const b: any = {
        select: () => b, eq: () => b, in: () => b, not: () => b, order: () => b,
        limit: () => Promise.resolve(result()),
        // deno-lint-ignore no-explicit-any
        update: (p: any) => { mode = "update"; payload = p; return b; },
        single: () => Promise.resolve(result()),
        // deno-lint-ignore no-explicit-any
        then: (ok: any, err: any) => Promise.resolve(result()).then(ok, err),
      };
      return b;
    },
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: (path: string, _ttl: number) => {
          log.signed.push(path);
          return Promise.resolve({ data: { signedUrl: `https://signed.example/${path}` }, error: null });
        },
      }),
    },
  };
  return { client, log };
}

function fakeResend() {
  // deno-lint-ignore no-explicit-any
  const sent: any[] = [];
  return {
    sent,
    // deno-lint-ignore no-explicit-any
    resend: { emails: { send: (p: any) => { sent.push(p); return Promise.resolve({ data: { id: "e1" }, error: null }); } } },
  };
}

function req(body: unknown, auth?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = auth;
  return new Request("https://edge.local/drone-delivery-email", {
    method: "POST", headers, body: JSON.stringify(body),
  });
}

const ALLOW = () => Promise.resolve({ ok: true, caller: "test" });

// --- caller checks -----------------------------------------------------------

function authorizer(users: Record<string, { id: string; admin: boolean }>) {
  return makeAuthorizer({
    trustedKeys: ["service-key-123", undefined, ""],
    getUser: (jwt) => {
      if (jwt === "throws") return Promise.reject(new Error("network"));
      const u = users[jwt];
      return Promise.resolve({ data: { user: u ? { id: u.id } : null }, error: u ? null : { message: "bad jwt" } });
    },
    isAdmin: (id) => Promise.resolve({
      data: Object.values(users).some((u) => u.id === id && u.admin), error: null,
    }),
  });
}

Deno.test("a request with no bearer token is refused before anything is read", async () => {
  const { client, log } = fakeSupabase({ reports: APPROVED });
  const { resend, sent } = fakeResend();
  const res = await handleDeliveryRequest(req({ job_id: JOB_ID }),
    { supabase: client, resend, authorize: authorizer({}) });
  assertEquals(res.status, 401);
  assertEquals(log.tables.length, 0);
  assertEquals(log.signed.length, 0);
  assertEquals(sent.length, 0);
});

Deno.test("no caller check wired up means every request is refused", async () => {
  const { client, log } = fakeSupabase({ reports: APPROVED });
  const { resend } = fakeResend();
  const res = await handleDeliveryRequest(req({ job_id: JOB_ID }, "Bearer anything"),
    { supabase: client, resend });
  assertEquals(res.status, 401);
  assertEquals(log.tables.length, 0);
});

Deno.test("the caller check: pipeline key, admin, non-admin, bad token, failing lookup", async () => {
  const check = authorizer({ "admin-jwt": { id: "u1", admin: true }, "staff-jwt": { id: "u2", admin: false } });
  const as = (h?: string) => check(req({}, h));
  assertEquals((await as("Bearer service-key-123")).ok, true);
  assertEquals((await as("Bearer admin-jwt")).ok, true);
  assertEquals((await as("Bearer staff-jwt")).status, 403);
  assertEquals((await as("Bearer forged")).status, 401);
  assertEquals((await as("Bearer throws")).status, 401);
  assertEquals((await as("Basic service-key-123")).status, 401);
  assertEquals((await as("Bearer ")).status, 401);
});

Deno.test("an empty trusted key never matches an empty or missing token", async () => {
  const check = makeAuthorizer({
    trustedKeys: ["", undefined],
    getUser: () => Promise.resolve({ data: { user: null }, error: { message: "no" } }),
    isAdmin: () => Promise.resolve({ data: false }),
  });
  assertEquals((await check(req({}, "Bearer "))).ok, false);
});

// --- report delivery ---------------------------------------------------------

Deno.test("a job whose only deliverable is the approved report is delivered", async () => {
  const { client, log } = fakeSupabase({ reports: APPROVED });
  const { resend, sent } = fakeResend();
  const res = await handleDeliveryRequest(req({ job_id: JOB_ID }),
    { supabase: client, resend, authorize: ALLOW });
  assertEquals(res.status, 200);
  assertEquals(sent.length, 1);
  assertStringIncludes(sent[0].html, "https://signed.example/job-reports/j1/abc123-Sentinel_CCAME");
  assertStringIncludes(sent[0].html, "Download the report (PDF)");
  assert(log.updates.some((u) => u.table === "drone_jobs" && u.payload.status === "delivered"));
});

Deno.test("the approved report link reaches the email alongside other deliverables", async () => {
  const { client } = fakeSupabase({
    reports: APPROVED,
    deliverables: [{ id: "d1", name: "Orthomosaic", download_url: "https://drive.example/f",
      file_count: 3, total_size_bytes: 3_000_000 }],
  });
  const { resend, sent } = fakeResend();
  const res = await handleDeliveryRequest(req({ job_id: JOB_ID }),
    { supabase: client, resend, authorize: ALLOW });
  assertEquals(res.status, 200);
  assertStringIncludes(sent[0].html, "https://signed.example/job-reports/j1/");
});

Deno.test("nothing to deliver is still refused when there is no approved report either", async () => {
  const { client } = fakeSupabase({ reports: [] });
  const { resend, sent } = fakeResend();
  const res = await handleDeliveryRequest(req({ job_id: JOB_ID }),
    { supabase: client, resend, authorize: ALLOW });
  assertEquals(res.status, 400);
  assertEquals(sent.length, 0);
});
