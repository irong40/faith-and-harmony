// The approved engine report travels with the delivery email, and nothing else
// does: no draft, no unapproved report, no failure path that blocks a delivery.
//
//   deno test --no-check supabase/functions/drone-delivery-email/report_link.spec.ts

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.190.0/testing/asserts.ts";

import { BRAND, buildEmailHtml, findApprovedReport, REPORT_LINK_TTL_SECONDS } from "./delivery.ts";

// deno-lint-ignore no-explicit-any
function fakeSupabase(rows: any[] | null, opts: { storage?: boolean; signError?: boolean } = {}) {
  // deno-lint-ignore no-explicit-any
  const calls: Record<string, any[]> = { eq: [], not: [], signed: [] };
  const builder = {
    select() { return builder; },
    // deno-lint-ignore no-explicit-any
    eq(col: string, val: any) { calls.eq.push([col, val]); return builder; },
    // deno-lint-ignore no-explicit-any
    not(col: string, op: string, val: any) { calls.not.push([col, op, val]); return builder; },
    order() { return builder; },
    limit() { return Promise.resolve({ data: rows, error: null }); },
  };
  const client = {
    from(_t: string) { return builder; },
    storage: opts.storage === false ? undefined : {
      from(bucket: string) {
        return {
          createSignedUrl(path: string, ttl: number) {
            calls.signed.push([bucket, path, ttl]);
            return Promise.resolve(opts.signError
              ? { data: null, error: { message: "nope" } }
              : { data: { signedUrl: `https://signed/${path}` }, error: null });
          },
        };
      },
    },
  };
  return { client, calls };
}

const APPROVED = [{
  id: "r1", status: "final", generated_document_id: "d1",
  generated_documents: {
    file_name: "Sentinel_CCAME_roof_inspection_2026-09-27.pdf",
    file_path: "job-reports/j1/Sentinel_CCAME_roof_inspection_2026-09-27.pdf",
    metadata: { report_complete: true, source: "sentinel-reports" },
  },
}];

Deno.test("an approved engine report is linked from the private bucket", async () => {
  const { client, calls } = fakeSupabase(APPROVED);
  const report = await findApprovedReport(client, "j1");
  assert(report);
  assertEquals(report.fileName, "Sentinel_CCAME_roof_inspection_2026-09-27.pdf");
  assertEquals(calls.signed[0][0], "generated-documents");
  assertEquals(calls.signed[0][2], REPORT_LINK_TTL_SECONDS);
  // Only approved (final) reports that point at an engine PDF are considered,
  // and only this job's: the job filter is what keeps one client's private
  // report out of another client's email.
  assert(calls.eq.some(([c, v]) => c === "job_id" && v === "j1"), "job filter missing");
  assert(calls.eq.some(([c, v]) => c === "status" && v === "final"));
  assert(calls.not.some(([c, op]) => c === "generated_document_id" && op === "is"));
});

Deno.test("a report the engine marked as a draft is never linked", async () => {
  const draft = [{ ...APPROVED[0], generated_documents: {
    ...APPROVED[0].generated_documents, metadata: { report_complete: false } } }];
  const { client, calls } = fakeSupabase(draft);
  assertEquals(await findApprovedReport(client, "j1"), null);
  assertEquals(calls.signed.length, 0);
});

// Shape of the legacy row in production (2026-09-28): the retired print path
// logged a file_path, uploaded nothing, and wrote no engine metadata.
const LEGACY_FINAL = {
  id: "r0", status: "final", generated_document_id: "d0",
  generated_documents: {
    file_name: "re_aerial_photography-report.pdf",
    file_path: "reports/re_aerial_photography-report.pdf",
    metadata: { report_id: "r0" },
  },
};

Deno.test("a legacy print-path row is never linked", async () => {
  const { client, calls } = fakeSupabase([LEGACY_FINAL]);
  assertEquals(await findApprovedReport(client, "j1"), null);
  assertEquals(calls.signed.length, 0);
});

Deno.test("a newer legacy row does not hide the approved engine report", async () => {
  const { client } = fakeSupabase([LEGACY_FINAL, APPROVED[0]]);
  const report = await findApprovedReport(client, "j1");
  assert(report);
  assertEquals(report.fileName, "Sentinel_CCAME_roof_inspection_2026-09-27.pdf");
});

Deno.test("a draft_ file name blocks the link in any case, even marked complete", async () => {
  const renamed = [{ ...APPROVED[0], generated_documents: {
    ...APPROVED[0].generated_documents, file_name: "draft_Sentinel_CCAME.pdf" } }];
  assertEquals(await findApprovedReport(fakeSupabase(renamed).client, "j1"), null);
});

Deno.test("missing engine metadata is a no", async () => {
  const bare = [{ ...APPROVED[0], generated_documents: {
    ...APPROVED[0].generated_documents, metadata: { source: "sentinel-reports" } } }];
  assertEquals(await findApprovedReport(fakeSupabase(bare).client, "j1"), null);
});

Deno.test("no approved report, no link", async () => {
  const { client } = fakeSupabase([]);
  assertEquals(await findApprovedReport(client, "j1"), null);
});

Deno.test("a signing failure or a client without storage means no link, not an error", async () => {
  assertEquals(await findApprovedReport(fakeSupabase(APPROVED, { signError: true }).client, "j1"), null);
  assertEquals(await findApprovedReport(fakeSupabase(APPROVED, { storage: false }).client, "j1"), null);
  // deno-lint-ignore no-explicit-any
  const broken: any = { from() { throw new Error("boom"); } };
  assertEquals(await findApprovedReport(broken, "j1"), null);
});

const BASE_ARGS = {
  emailSubject: "s", siteLabel: "CCAME", jobTypeLabel: "Roof", clientFirstName: "Pat",
  primaryUrl: "https://drive.example/f", deliverables: [],
  stats: { source: "none" as const, deliverableCount: null, fileCount: null, photoCount: null,
    videoCount: null, totalSizeBytes: null, totalSizeMB: null, totalSizeLabel: null },
};

Deno.test("the email carries the report button only when there is a report", () => {
  const withReport = buildEmailHtml({ ...BASE_ARGS,
    report: { fileName: "R.pdf", url: "https://signed/R.pdf" } });
  assertStringIncludes(withReport, "Download the report (PDF)");
  assertStringIncludes(withReport, "https://signed/R.pdf");
  const without = buildEmailHtml({ ...BASE_ARGS });
  assert(!without.includes("Download the report"));
});

Deno.test("the email wears the one layout's brand", () => {
  assertEquals(BRAND.sky, "#e85d26");
  assertEquals(BRAND.navy, "#0f0f0f");
  const html = buildEmailHtml({ ...BASE_ARGS });
  assert(!html.includes("#3b82f6") && !html.includes("#2563eb"), "old blue left in the email");
});

Deno.test("a file name from disk cannot inject markup into the email", () => {
  const html = buildEmailHtml({ ...BASE_ARGS,
    report: { fileName: "<img src=x onerror=alert(1)>.pdf", url: "https://signed/R.pdf" } });
  assert(!html.includes("<img src=x"), "file name rendered as markup");
  assertStringIncludes(html, "&lt;img src=x onerror=alert(1)&gt;.pdf");
});
