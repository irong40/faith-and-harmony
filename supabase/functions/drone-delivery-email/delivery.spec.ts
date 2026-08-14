// Tests for the drone-delivery-email edge function.
//
// Co-located Deno tests, matching the process-drip/templates.spec.ts pattern:
// the logic lives in a sibling module so the suite can exercise it without
// index.ts calling serve() and binding a port.
//
// Run from the repo root:
//   deno test --no-check supabase/functions/drone-delivery-email/delivery.spec.ts

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.190.0/testing/asserts.ts";

import {
  type AssetRow,
  buildEmailHtml,
  computeDeliveryStats,
  type DeliverableRow,
  formatSizeLabel,
  handleDeliveryRequest,
  renderStatsHtml,
} from "./delivery.ts";

// ---------------------------------------------------------------------------
// Fixtures — the real DJ-2026-0005 rows, read from the live project
// (job 7d7c64df-5091-4ada-98a8-c74bbe67d6ab, delivered 2026-08-14).
// ---------------------------------------------------------------------------

const DJ_2026_0005: DeliverableRow[] = [
  {
    id: "c258e81a-0c62-49e2-b258-e956d4dd6a13",
    name: "Survey Report",
    description: "Property survey report (PDF)",
    download_url: "https://drive.google.com/drive/folders/1mZHeYwg_DyL5fq67e0U_0J75U1ITS5_8",
    file_count: 1,
    total_size_bytes: 1975432,
  },
  {
    id: "a1d24f10-7805-42a7-8024-9ecbc5ed5e1c",
    name: "Orthomosaic and Elevation Models",
    description: "Orthophoto, DSM and DTM as GeoTIFF",
    download_url: "https://drive.google.com/drive/folders/1mZHeYwg_DyL5fq67e0U_0J75U1ITS5_8",
    file_count: 3,
    total_size_bytes: 169206248,
  },
  {
    id: "40b51ef7-a643-4c77-b0fb-d71f28a4a806",
    name: "Point Cloud",
    description: "Georeferenced classified point cloud (LAZ)",
    download_url: "https://drive.google.com/drive/folders/1mZHeYwg_DyL5fq67e0U_0J75U1ITS5_8",
    file_count: 1,
    total_size_bytes: 17941148,
  },
];

const DJ_2026_0005_TOTAL_BYTES = 189122828; // 1975432 + 169206248 + 17941148

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

interface Fixtures {
  // deno-lint-ignore no-explicit-any
  job?: any;
  // deno-lint-ignore no-explicit-any
  jobError?: any;
  deliverables?: DeliverableRow[];
  assets?: AssetRow[];
  // deno-lint-ignore no-explicit-any
  updateError?: any;
}

function makeSupabase(fx: Fixtures) {
  const tablesQueried: string[] = [];
  // deno-lint-ignore no-explicit-any
  const updates: any[] = [];

  // deno-lint-ignore no-explicit-any
  function resolve(state: { table: string; mode: string; payload?: any }): any {
    if (state.table === "drone_jobs" && state.mode === "update") {
      updates.push(state.payload);
      return { data: null, error: fx.updateError ?? null };
    }
    if (state.table === "drone_jobs") {
      return { data: fx.job ?? null, error: fx.jobError ?? null };
    }
    if (state.table === "drone_deliverables") {
      return { data: fx.deliverables ?? [], error: null };
    }
    if (state.table === "drone_assets") {
      return { data: fx.assets ?? [], error: null };
    }
    return { data: null, error: null };
  }

  const client = {
    from(table: string) {
      tablesQueried.push(table);
      // deno-lint-ignore no-explicit-any
      const state: { table: string; mode: string; payload?: any } = { table, mode: "select" };
      const builder = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        in() {
          return builder;
        },
        limit() {
          return builder;
        },
        // deno-lint-ignore no-explicit-any
        update(payload: any) {
          state.mode = "update";
          state.payload = payload;
          return builder;
        },
        single() {
          return Promise.resolve(resolve(state));
        },
        // deno-lint-ignore no-explicit-any
        then(onOk: any, onErr: any) {
          return Promise.resolve(resolve(state)).then(onOk, onErr);
        },
      };
      return builder;
    },
  };

  return { client, tablesQueried, updates };
}

// deno-lint-ignore no-explicit-any
function makeResend(result: { data?: any; error?: any }) {
  // deno-lint-ignore no-explicit-any
  const sent: any[] = [];
  const resend = {
    emails: {
      // deno-lint-ignore no-explicit-any
      send(payload: any) {
        sent.push(payload);
        return Promise.resolve(result);
      },
    },
  };
  return { resend, sent };
}

const BASE_JOB = {
  id: "7d7c64df-5091-4ada-98a8-c74bbe67d6ab",
  clients: { id: "c1", name: "Dana Whitfield", email: "dana@example.com" },
  drone_packages: { name: "Land Survey" },
  processing_templates: { path_code: "B", display_name: "Land Survey / Ortho" },
  site_address: "1420 Blue Heron Rd, Chesapeake, VA",
  delivery_drive_url: "https://drive.google.com/drive/folders/1mZHeYwg_DyL5fq67e0U_0J75U1ITS5_8",
};

/**
 * Assert no tile rendered a zero value.
 *
 * Note this deliberately matches the rendered tile VALUE (`>0MB</div>`) rather
 * than a bare `includes("0MB")` — "180MB" contains the substring "0MB", so the
 * naive check fails against correct output.
 */
function assertNoZeroTile(html: string) {
  assert(!/>0MB<\/div>/.test(html), "rendered a literal 0MB tile");
  assert(!/>0<\/div>/.test(html), "rendered a zero-value tile");
}

function request(body: unknown): Request {
  return new Request("https://edge.local/drone-delivery-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ===========================================================================
// computeDeliveryStats — totals come from drone_deliverables
// ===========================================================================

Deno.test("computeDeliveryStats sums file_count and total_size_bytes from drone_deliverables", () => {
  const stats = computeDeliveryStats(DJ_2026_0005);

  assertEquals(stats.source, "deliverables");
  assertEquals(stats.deliverableCount, 3);
  assertEquals(stats.fileCount, 1 + 3 + 1);
  assertEquals(stats.totalSizeBytes, DJ_2026_0005_TOTAL_BYTES);
  // drone_deliverables carries no type split — we do not invent one
  assertEquals(stats.photoCount, null);
  assertEquals(stats.videoCount, null);
});

Deno.test("DJ-2026-0005 shape (3 rows, 5 files, 180.4MB) renders the expected tile values", () => {
  const stats = computeDeliveryStats(DJ_2026_0005);

  assertEquals(stats.totalSizeMB, 180); // 189122828 / 1048576 = 180.35
  assertEquals(stats.totalSizeLabel, "180MB");

  const html = renderStatsHtml(stats);
  assertStringIncludes(html, ">3</div>");
  assertStringIncludes(html, "Deliverables");
  assertStringIncludes(html, ">5</div>");
  assertStringIncludes(html, "Files");
  assertStringIncludes(html, ">180MB</div>");
  // the regression under test: this job used to email all zeros
  assertNoZeroTile(html);
});

Deno.test("computeDeliveryStats returns nothing known when there are no deliverables and no assets", () => {
  const stats = computeDeliveryStats([], []);

  assertEquals(stats.source, "none");
  assertEquals(stats.deliverableCount, null);
  assertEquals(stats.fileCount, null);
  assertEquals(stats.photoCount, null);
  assertEquals(stats.videoCount, null);
  assertEquals(stats.totalSizeBytes, null);
  assertEquals(stats.totalSizeMB, null);
  assertEquals(stats.totalSizeLabel, null);
  assertEquals(renderStatsHtml(stats), "");
});

Deno.test("unknown totals render nothing rather than zeros", () => {
  // every count null — the producer never populated them
  const nullCounts: DeliverableRow[] = [
    { id: "d1", name: "Ortho", description: null, download_url: null, file_count: null, total_size_bytes: null },
  ];
  const stats = computeDeliveryStats(nullCounts, []);
  assertEquals(stats.source, "none");
  assertEquals(renderStatsHtml(stats), "");
});

Deno.test("formatSizeLabel never produces a 0MB string", () => {
  assertEquals(formatSizeLabel(null), null); // unknown
  assertEquals(formatSizeLabel(0), null); // known zero, still not worth a tile
  assertEquals(formatSizeLabel(-1), null);
  assertEquals(formatSizeLabel(1024), "<1MB"); // real but tiny, not rounded to 0MB
  assertEquals(formatSizeLabel(500 * 1024), "<1MB");
  assertEquals(formatSizeLabel(1024 * 1024), "1MB");
  assertEquals(formatSizeLabel(DJ_2026_0005_TOTAL_BYTES), "180MB");
});

// ===========================================================================
// Precedence between drone_deliverables and drone_assets
// ===========================================================================

Deno.test("drone_deliverables takes precedence over drone_assets when it carries numbers", () => {
  const assets: AssetRow[] = [
    { id: "a1", file_type: "image/jpeg", file_size: 1000 },
  ];
  const stats = computeDeliveryStats(DJ_2026_0005, assets);

  assertEquals(stats.source, "deliverables");
  assertEquals(stats.totalSizeBytes, DJ_2026_0005_TOTAL_BYTES);
  assertEquals(stats.photoCount, null);
});

Deno.test("falls back to drone_assets when deliverables carry no numbers", () => {
  const nullCounts: DeliverableRow[] = [
    { id: "d1", name: "Raw Frames", description: null, download_url: null, file_count: null, total_size_bytes: null },
  ];
  const assets: AssetRow[] = [
    { id: "a1", file_type: "image/jpeg", file_size: 2 * 1024 * 1024 },
    { id: "a2", file_type: "image/jpeg", file_size: 3 * 1024 * 1024 },
    { id: "a3", file_type: "video/mp4", file_size: 5 * 1024 * 1024 },
  ];
  const stats = computeDeliveryStats(nullCounts, assets);

  assertEquals(stats.source, "assets");
  assertEquals(stats.photoCount, 2);
  assertEquals(stats.videoCount, 1);
  assertEquals(stats.totalSizeBytes, 10 * 1024 * 1024);
  assertEquals(stats.totalSizeLabel, "10MB");

  const html = renderStatsHtml(stats);
  assertStringIncludes(html, "Photos");
  assertStringIncludes(html, "Videos");
});

Deno.test("a known-zero size still suppresses the size tile but keeps real counts", () => {
  const zeroBytes: DeliverableRow[] = [
    { id: "d1", name: "Report", description: null, download_url: null, file_count: 2, total_size_bytes: 0 },
  ];
  const stats = computeDeliveryStats(zeroBytes);

  assertEquals(stats.source, "deliverables");
  assertEquals(stats.totalSizeBytes, 0);
  assertEquals(stats.totalSizeLabel, null);

  const html = renderStatsHtml(stats);
  assertStringIncludes(html, ">2</div>");
  assertNoZeroTile(html);
  assert(!html.includes("Total"), "no size tile when size is zero");
});

// ===========================================================================
// Rendered email
// ===========================================================================

Deno.test("a job with deliverables renders the stats block with correct numbers", () => {
  const stats = computeDeliveryStats(DJ_2026_0005);
  const html = buildEmailHtml({
    emailSubject: "subject",
    siteLabel: "1420 Blue Heron Rd",
    jobTypeLabel: "Land Survey / Ortho",
    clientFirstName: "Dana",
    deliverables: DJ_2026_0005,
    stats,
    year: 2026,
  });

  assertStringIncludes(html, "Stats Row");
  assertStringIncludes(html, ">3</div>");
  assertStringIncludes(html, ">5</div>");
  assertStringIncludes(html, ">180MB</div>");
});

Deno.test("a job with no deliverables and no assets renders no stats block at all", () => {
  const stats = computeDeliveryStats([], []);
  const html = buildEmailHtml({
    emailSubject: "subject",
    siteLabel: "1420 Blue Heron Rd",
    jobTypeLabel: "Land Survey / Ortho",
    clientFirstName: "Dana",
    primaryUrl: "https://drive.google.com/drive/folders/abc",
    deliverables: [],
    stats,
    year: 2026,
  });

  assert(!html.includes("Stats Row"), "stats block must be absent entirely");
  assert(!html.includes("0MB"), "must never render a literal 0MB");
  assertNoZeroTile(html);
  // the email is still useful — the CTA survives
  assertStringIncludes(html, "View Your Deliverables");
});

// ===========================================================================
// handleDeliveryRequest — end to end through the handler
// ===========================================================================

Deno.test("handler emails DJ-2026-0005 stats and marks the job delivered", async () => {
  const { client, updates, tablesQueried } = makeSupabase({
    job: BASE_JOB,
    deliverables: DJ_2026_0005,
  });
  const { resend, sent } = makeResend({ data: { id: "4bfd37f8-e580-4dfe-94c0-727bc870f0c9" }, error: null });

  const res = await handleDeliveryRequest(
    request({ job_id: BASE_JOB.id }),
    { supabase: client, resend },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.stats.source, "deliverables");
  assertEquals(body.stats.deliverable_count, 3);
  assertEquals(body.stats.file_count, 5);
  assertEquals(body.stats.total_size_bytes, DJ_2026_0005_TOTAL_BYTES);
  assertEquals(body.stats.total_size_mb, 180);

  // the email actually carried the numbers
  assertStringIncludes(sent[0].html, ">180MB</div>");
  assertNoZeroTile(sent[0].html);

  // job marked delivered
  assertEquals(updates.length, 1);
  assertEquals(updates[0].status, "delivered");
  assertEquals(updates[0].delivery_status, "sent");

  // drone_assets is not queried when deliverables already carry the numbers
  assert(
    !tablesQueried.includes("drone_assets"),
    "should not scan drone_assets on the Sortie path",
  );
});

Deno.test("handler renders no stats block when neither deliverables nor assets exist", async () => {
  const { client, tablesQueried } = makeSupabase({
    job: BASE_JOB,
    deliverables: [],
    assets: [],
  });
  const { resend, sent } = makeResend({ data: { id: "email_1" }, error: null });

  const res = await handleDeliveryRequest(
    request({ job_id: BASE_JOB.id }),
    { supabase: client, resend },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.stats.source, "none");
  assertEquals(body.stats.total_size_mb, null);
  assertEquals(body.stats.photo_count, null);

  assert(!sent[0].html.includes("Stats Row"), "no stats block");
  assert(!sent[0].html.includes("0MB"), "never a literal 0MB");
  assertNoZeroTile(sent[0].html);

  // the fallback path WAS consulted before giving up
  assert(tablesQueried.includes("drone_assets"), "assets fallback should be attempted");
});

Deno.test("handler falls back to drone_assets for producers that populate it", async () => {
  const { client } = makeSupabase({
    job: BASE_JOB,
    deliverables: [],
    assets: [
      { id: "a1", file_type: "image/jpeg", file_size: 4 * 1024 * 1024 },
      { id: "a2", file_type: "video/mp4", file_size: 6 * 1024 * 1024 },
    ],
  });
  const { resend, sent } = makeResend({ data: { id: "email_2" }, error: null });

  const res = await handleDeliveryRequest(
    request({ job_id: BASE_JOB.id }),
    { supabase: client, resend },
  );
  const body = await res.json();

  assertEquals(body.stats.source, "assets");
  assertEquals(body.stats.photo_count, 1);
  assertEquals(body.stats.video_count, 1);
  assertEquals(body.stats.total_size_mb, 10);
  assertStringIncludes(sent[0].html, ">10MB</div>");
});

Deno.test("a failed Resend send returns 502 and does NOT mark the job delivered", async () => {
  const { client, updates } = makeSupabase({
    job: BASE_JOB,
    deliverables: DJ_2026_0005,
  });
  // resend@2 resolves with { error } instead of throwing — the regression guard
  const { resend } = makeResend({ data: null, error: { name: "validation_error", message: "domain not verified" } });

  const res = await handleDeliveryRequest(
    request({ job_id: BASE_JOB.id }),
    { supabase: client, resend },
  );
  const body = await res.json();

  assertEquals(res.status, 502);
  assertEquals(body.error, "email send failed");
  assertEquals(body.details, "domain not verified");
  assertEquals(updates.length, 0, "job must NOT be marked delivered when the send failed");
});

Deno.test("handler requires job_id", async () => {
  const { client } = makeSupabase({ job: BASE_JOB });
  const { resend } = makeResend({ data: { id: "x" }, error: null });

  const res = await handleDeliveryRequest(request({}), { supabase: client, resend });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "job_id is required");
});

Deno.test("handler 404s when the job is missing", async () => {
  const { client } = makeSupabase({ job: null, jobError: { message: "no rows" } });
  const { resend } = makeResend({ data: { id: "x" }, error: null });

  const res = await handleDeliveryRequest(request({ job_id: "nope" }), { supabase: client, resend });
  assertEquals(res.status, 404);
});
