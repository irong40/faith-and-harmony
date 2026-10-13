import {
  assert,
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type DecisionResult,
  handleInspectionReview,
  type InspectionReviewDependencies,
  parseRuntimeSecretKeys,
  REVIEWED_BY,
  secureEqual,
  sha256Hex,
} from "./handler.ts";
import {
  buildReviewEmail,
  type EmailPayload,
  type ReviewRun,
  STATUTORY_PHOTOGRAMMETRY_NOTE,
} from "./email.ts";

const SERVICE_KEY = "service-role-secret";
const SECRET_KEY = "sb_secret_abcdefghijklmnop";
const BASE_URL = "https://example.supabase.co";
const FN_URL = `${BASE_URL}/functions/v1/inspection-review`;
const NOW = new Date("2026-10-13T15:00:00.000Z");
const TOKEN = "raw-token_-AbC123";
const RUN_ID = "11111111-1111-4111-8111-111111111111";

// Copied byte for byte from Sortie
// sortie/services/reports/generator.py STATUTORY_PHOTOGRAMMETRY_NOTE (line 2715).
// If either side changes, this test must fail until both agree again.
const PYTHON_STATUTORY_NOTE =
  "Any determination of topography or contours, or any depiction of physical improvements, property lines or boundaries is for general information only and shall not be used for the design, modification, or construction of improvements to real property or for flood plain determination.";

async function run(overrides: Partial<ReviewRun> = {}): Promise<ReviewRun> {
  return {
    id: RUN_ID,
    run_key: "cemetery/hampton/20261013/abcd1234",
    profile: "cemetery",
    status: "awaiting_review",
    expected_detections: 107,
    documented_extent_m2: 12345.6,
    created_at: "2026-10-13T14:00:00.000Z",
    code_version: "0123456789ab",
    e3_summary: null,
    outputs: {
      files: {
        kml: { path: "C:\\out\\cemetery_site.kml", sha256: "a".repeat(64) },
        csv: { path: "/out/cemetery_site.csv", sha256: "b".repeat(64) },
      },
    },
    review_token_hash: await sha256Hex(TOKEN),
    review_token_expires_at: "2026-10-20T15:00:00.000Z",
    ...overrides,
  };
}

type Calls = {
  sent: EmailPayload[];
  marks: { id: string; sentAt: string }[];
  decisions: { id: string; status: string; reviewedBy: string }[];
  compares: [string, string][];
  logs: string[];
  lookups: string[];
};

function deps(
  stored: ReviewRun | null,
  overrides: Partial<InspectionReviewDependencies> = {},
): { deps: InspectionReviewDependencies; calls: Calls } {
  const calls: Calls = {
    sent: [],
    marks: [],
    decisions: [],
    compares: [],
    logs: [],
    lookups: [],
  };
  // Stateful fake of the database: a decision changes the stored status, so
  // a second click sees the closed run exactly as the real table would.
  let current = stored;
  const value: InspectionReviewDependencies = {
    serviceRoleKey: SERVICE_KEY,
    secretKeys: [SECRET_KEY],
    functionsBaseUrl: BASE_URL,
    now: () => NOW,
    loadRunById: (id) =>
      Promise.resolve(current && current.id === id ? current : null),
    loadRunByTokenHash: (hash) => {
      calls.lookups.push(hash);
      return Promise.resolve(
        current && current.review_token_hash === hash ? current : null,
      );
    },
    sendEmail: (payload) => {
      calls.sent.push(payload);
      return Promise.resolve({ id: "email-123" });
    },
    markEmailSent: (input) => {
      calls.marks.push(input);
      return Promise.resolve();
    },
    decide: (input): Promise<DecisionResult> => {
      calls.decisions.push(input);
      if (!current || current.status !== "awaiting_review") {
        return Promise.resolve({ kind: "stale" });
      }
      current = { ...current, status: input.status };
      return Promise.resolve({ kind: "ok" });
    },
    logError: (message) => calls.logs.push(message),
    secureEqual: (left, right) => {
      calls.compares.push([left, right]);
      return secureEqual(left, right);
    },
    ...overrides,
  };
  return { deps: value, calls };
}

function sendRequest(
  body: unknown,
  headers: Record<string, string> = {
    Authorization: `Bearer ${SERVICE_KEY}`,
  },
): Request {
  return new Request(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function sendBody(token = TOKEN) {
  return { action: "send", run_id: RUN_ID, token };
}

function decisionRequest(token: string, decision: string): Request {
  return new Request(
    `${FN_URL}?token=${encodeURIComponent(token)}&decision=${decision}`,
    { method: "GET" },
  );
}

function assertPlainText(response: Response): void {
  assertStringIncludes(
    response.headers.get("Content-Type") ?? "",
    "text/plain",
  );
}

// ─── statutory note ──────────────────────────────────────────────────────

Deno.test("statutory note equals the Sortie Python constant byte for byte", () => {
  assertEquals(STATUTORY_PHOTOGRAMMETRY_NOTE, PYTHON_STATUTORY_NOTE);
  const bytes = (s: string) => Array.from(new TextEncoder().encode(s));
  assertEquals(bytes(STATUTORY_PHOTOGRAMMETRY_NOTE), bytes(PYTHON_STATUTORY_NOTE));
});

// ─── send: auth ──────────────────────────────────────────────────────────

Deno.test("send: missing auth is 401 and nothing is loaded or sent", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(sendRequest(sendBody(), {}), d);
  assertEquals(response.status, 401);
  assertEquals(calls.sent.length, 0);
  assertEquals(calls.marks.length, 0);
});

Deno.test("send: wrong bearer key is 401", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(
    sendRequest(sendBody(), { Authorization: `Bearer ${SERVICE_KEY}x` }),
    d,
  );
  assertEquals(response.status, 401);
  assertEquals(calls.sent.length, 0);
});

Deno.test("send: an empty configured service key never authorizes 'Bearer '", async () => {
  const { deps: d, calls } = deps(await run(), { serviceRoleKey: "", secretKeys: [] });
  // Fetch Headers trim trailing whitespace, so a real Request can never carry
  // exactly "Bearer ". Override the headers to reach the guard directly.
  const request = sendRequest(sendBody(), {});
  Object.defineProperty(request, "headers", {
    value: new Map([["Authorization", "Bearer "]]),
  });
  const response = await handleInspectionReview(request, d);
  assertEquals(response.status, 401);
  assertEquals(calls.sent.length, 0);
});

Deno.test("send: a registered sb_secret_ apikey is accepted", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(
    sendRequest(sendBody(), { apikey: SECRET_KEY }),
    d,
  );
  assertEquals(response.status, 200);
  assertEquals(calls.sent.length, 1);
});

Deno.test("send: an unregistered sb_secret_ apikey is 401", async () => {
  const { deps: d } = deps(await run());
  const response = await handleInspectionReview(
    sendRequest(sendBody(), { apikey: "sb_secret_not_registered" }),
    d,
  );
  assertEquals(response.status, 401);
});

Deno.test("parseRuntimeSecretKeys keeps only sb_secret_ string values", () => {
  assertEquals(
    parseRuntimeSecretKeys(
      JSON.stringify({ a: SECRET_KEY, b: "sb_publishable_x", c: "sb_secret_", d: 5 }),
    ),
    [SECRET_KEY],
  );
  assertEquals(parseRuntimeSecretKeys("not json"), []);
  assertEquals(parseRuntimeSecretKeys(""), []);
});

// ─── send: run state ─────────────────────────────────────────────────────

Deno.test("send: a token whose hash does not match is 403", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(
    sendRequest(sendBody("some-other-token")),
    d,
  );
  assertEquals(response.status, 403);
  assertEquals(calls.sent.length, 0);
});

Deno.test("send: a run with no stored token is 403", async () => {
  const { deps: d, calls } = deps(
    await run({ review_token_hash: null, review_token_expires_at: null }),
  );
  const response = await handleInspectionReview(sendRequest(sendBody()), d);
  assertEquals(response.status, 403);
  assertEquals(calls.sent.length, 0);
});

for (const status of ["uploading", "approved", "rejected", "failed"]) {
  Deno.test(`send: run in '${status}' is 409`, async () => {
    const { deps: d, calls } = deps(await run({ status }));
    const response = await handleInspectionReview(sendRequest(sendBody()), d);
    assertEquals(response.status, 409);
    assertEquals(calls.sent.length, 0);
  });
}

Deno.test("send: an expired token is 410 and no email goes out", async () => {
  const { deps: d, calls } = deps(
    await run({ review_token_expires_at: "2026-10-13T14:59:59.000Z" }),
  );
  const response = await handleInspectionReview(sendRequest(sendBody()), d);
  assertEquals(response.status, 410);
  assertEquals(calls.sent.length, 0);
});

Deno.test("send: unknown run is 404", async () => {
  const { deps: d } = deps(null);
  const response = await handleInspectionReview(sendRequest(sendBody()), d);
  assertEquals(response.status, 404);
});

Deno.test("send: a bad body or unknown action is 400", async () => {
  const { deps: d } = deps(await run());
  for (
    const body of [
      { action: "send", run_id: RUN_ID },
      { action: "send", token: TOKEN },
      { action: "approve", run_id: RUN_ID, token: TOKEN },
      "nope",
    ]
  ) {
    const response = await handleInspectionReview(sendRequest(body), d);
    assertEquals(response.status, 400, JSON.stringify(body));
  }
});

Deno.test("send: success emails Adam both links and the note, then marks it sent", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(sendRequest(sendBody()), d);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { email_id: "email-123" });

  assertEquals(calls.sent.length, 1);
  const email = calls.sent[0];
  assertEquals(email.to, "dradamopierce@gmail.com");
  assertEquals(
    email.subject,
    "Inspection run ready for review: cemetery cemetery/hampton/20261013/abcd1234",
  );
  const approve = `${FN_URL}?token=${encodeURIComponent(TOKEN)}&amp;decision=approve`;
  const reject = `${FN_URL}?token=${encodeURIComponent(TOKEN)}&amp;decision=reject`;
  assertStringIncludes(email.html, `href="${approve}"`);
  assertStringIncludes(email.html, `href="${reject}"`);
  assertStringIncludes(email.html, STATUTORY_PHOTOGRAMMETRY_NOTE);
  assertStringIncludes(email.html, "54.1-402(C)");
  assertStringIncludes(email.html, "Each link works once and expires");
  assertStringIncludes(email.html, "2026-10-20 15:00 UTC");
  assertStringIncludes(email.html, "cemetery_site.kml");
  assertStringIncludes(email.html, "a".repeat(64));
  assertStringIncludes(email.html, "107");
  assertStringIncludes(email.text, STATUTORY_PHOTOGRAMMETRY_NOTE);
  assertStringIncludes(email.text, `${FN_URL}?token=${encodeURIComponent(TOKEN)}&decision=approve`);

  assertEquals(calls.marks, [{ id: RUN_ID, sentAt: NOW.toISOString() }]);
});

Deno.test("send: a provider rejection is 502 and the run is not marked sent", async () => {
  const { deps: d, calls } = deps(await run(), {
    sendEmail: () => Promise.resolve(null),
  });
  const response = await handleInspectionReview(sendRequest(sendBody()), d);
  assertEquals(response.status, 502);
  assertEquals(calls.marks.length, 0);
});

// ─── GET: signed-link decision ───────────────────────────────────────────

Deno.test("GET: unknown token is 404 'Review link not found' as text/plain", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(decisionRequest("nope", "approve"), d);
  assertEquals(response.status, 404);
  assertPlainText(response);
  assertStringIncludes(await response.text(), "Review link not found");
  assertEquals(calls.decisions.length, 0);
});

Deno.test("GET: missing token is 404 and never looks up an empty hash", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(
    new Request(`${FN_URL}?decision=approve`),
    d,
  );
  assertEquals(response.status, 404);
  assertPlainText(response);
  assertEquals(calls.decisions.length, 0);
  assertEquals(calls.lookups.length, 0);
});

Deno.test("GET: a loaded run whose stored hash differs is treated as not found", async () => {
  // Defence in depth: never trust the lookup alone; compare the stored hash.
  const other = await run({ review_token_hash: "f".repeat(64) });
  const { deps: d, calls } = deps(other, {
    loadRunByTokenHash: () => Promise.resolve(other),
  });
  const response = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  assertEquals(response.status, 404);
  assertEquals(calls.decisions.length, 0);
});

Deno.test("GET: an unknown decision is 400", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(decisionRequest(TOKEN, "maybe"), d);
  assertEquals(response.status, 400);
  assertPlainText(response);
  assertEquals(calls.decisions.length, 0);
});

Deno.test("GET: expired link is 410 and nothing is decided", async () => {
  const { deps: d, calls } = deps(
    await run({ review_token_expires_at: "2026-10-13T15:00:00.000Z" }),
  );
  const response = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  assertEquals(response.status, 410);
  assertPlainText(response);
  assertEquals(calls.decisions.length, 0);
});

Deno.test("GET: approve patches approved + reviewed_by and answers text/plain", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  assertEquals(response.status, 200);
  assertPlainText(response);
  assertStringIncludes((await response.text()).toLowerCase(), "approved");
  assertEquals(calls.decisions, [{
    id: RUN_ID,
    status: "approved",
    reviewedBy: "dradamopierce@gmail.com (signed link)",
  }]);
  assertEquals(REVIEWED_BY, "dradamopierce@gmail.com (signed link)");
});

Deno.test("GET: second click is 409 'already approved' and decides nothing", async () => {
  const { deps: d, calls } = deps(await run());
  const first = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  assertEquals(first.status, 200);
  const second = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  assertEquals(second.status, 409);
  assertPlainText(second);
  assertStringIncludes(await second.text(), "already approved");
  assertEquals(calls.decisions.length, 1);
});

Deno.test("GET: reject after approve is 409 and says the run was approved", async () => {
  const { deps: d, calls } = deps(await run());
  await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  const response = await handleInspectionReview(decisionRequest(TOKEN, "reject"), d);
  assertEquals(response.status, 409);
  assertStringIncludes(await response.text(), "already approved");
  assertEquals(calls.decisions.length, 1);
});

Deno.test("GET: reject path records rejected", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(decisionRequest(TOKEN, "reject"), d);
  assertEquals(response.status, 200);
  assertPlainText(response);
  assertStringIncludes((await response.text()).toLowerCase(), "rejected");
  assertEquals(calls.decisions[0].status, "rejected");
  const again = await handleInspectionReview(decisionRequest(TOKEN, "reject"), d);
  assertEquals(again.status, 409);
  assertStringIncludes(await again.text(), "already rejected");
});

for (const status of ["uploading", "failed"]) {
  Deno.test(`GET: a run in '${status}' is 409 and nothing is decided`, async () => {
    const { deps: d, calls } = deps(await run({ status }));
    const response = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
    assertEquals(response.status, 409);
    assertPlainText(response);
    assertEquals(calls.decisions.length, 0);
  });
}

Deno.test("GET: a database guard refusal is 409 with the guard's message", async () => {
  const { deps: d } = deps(await run(), {
    decide: () =>
      Promise.resolve({
        kind: "refused",
        message: "inspection run x: awaiting_review -> approved is not an allowed transition",
      }),
  });
  const response = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  assertEquals(response.status, 409);
  assertPlainText(response);
  assertStringIncludes(await response.text(), "is not an allowed transition");
});

Deno.test("GET: a lost race (optimistic update matched no row) is 409", async () => {
  const { deps: d } = deps(await run(), {
    decide: () => Promise.resolve({ kind: "stale" }),
  });
  const response = await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  assertEquals(response.status, 409);
  assertPlainText(response);
});

// ─── method, escaping, constant time ─────────────────────────────────────

for (const method of ["PUT", "DELETE", "PATCH", "OPTIONS"]) {
  Deno.test(`${method} is 405`, async () => {
    const { deps: d } = deps(await run());
    const response = await handleInspectionReview(
      new Request(FN_URL, { method }),
      d,
    );
    assertEquals(response.status, 405);
  });
}

Deno.test("email escapes every interpolated value (run_key with <script>)", async () => {
  const hostile = await run({
    run_key: `<script>alert("x")</script>`,
    profile: `cemetery"><img src=x>`,
    code_version: "<b>v</b>",
    outputs: {
      files: { kml: { path: "/o/<evil>.kml", sha256: "<sha>" } },
    },
  });
  const email = buildReviewEmail(hostile, `t"<>&'`, BASE_URL);
  assertFalse(email.html.includes("<script>"));
  assertFalse(email.html.includes("<img"));
  assertFalse(email.html.includes("<evil>"));
  assertFalse(email.html.includes("<sha>"));
  assertFalse(email.html.includes("<b>v</b>"));
  assertStringIncludes(email.html, "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  // The token is URL-encoded inside the href, then HTML-escaped
  // (encodeURIComponent keeps ', which the HTML escape turns into &#039;).
  assertStringIncludes(
    email.html,
    `href="${BASE_URL}/functions/v1/inspection-review?token=t%22%3C%3E%26&#039;&amp;decision=approve"`,
  );
});

Deno.test("secureEqual compares exactly", () => {
  assert(secureEqual("abc", "abc"));
  assertFalse(secureEqual("abc", "abd"));
  assertFalse(secureEqual("abc", "abcd"));
  assertFalse(secureEqual("", "a"));
  assert(secureEqual("", ""));
});

Deno.test("send uses the constant-time helper for the auth header and the token hash", async () => {
  const { deps: d, calls } = deps(await run());
  const response = await handleInspectionReview(sendRequest(sendBody()), d);
  assertEquals(response.status, 200);
  const stored = await sha256Hex(TOKEN);
  assert(
    calls.compares.some(([a, b]) =>
      a === `Bearer ${SERVICE_KEY}` && b === `Bearer ${SERVICE_KEY}`
    ),
    "auth header not compared with secureEqual",
  );
  assert(
    calls.compares.some(([a, b]) => a === stored && b === stored),
    "token hash not compared with secureEqual",
  );
});

Deno.test("GET uses the constant-time helper for the token hash", async () => {
  const { deps: d, calls } = deps(await run());
  await handleInspectionReview(decisionRequest(TOKEN, "approve"), d);
  const stored = await sha256Hex(TOKEN);
  assert(calls.compares.some(([a, b]) => a === stored && b === stored));
});

Deno.test("sha256Hex matches the Python hashlib digest Sortie stores", async () => {
  // hashlib.sha256(b"abc").hexdigest()
  assertEquals(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
