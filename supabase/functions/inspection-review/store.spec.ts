// The supabase-js wiring that index.ts hands to the handler. A recording fake
// client stands in for PostgREST, so these tests pin the exact filters the
// real calls carry: dropping the optimistic .eq('status','awaiting_review')
// from decide or markEmailSent must turn a test red.
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createRunStore, RUN_COLUMNS } from "./store.ts";

type Call = { table: string; op: string; args: unknown[] };
type Outcome = { data?: unknown; error?: { message: string } | null };

// Every builder method records itself and returns the builder; awaiting the
// builder (or maybeSingle()) resolves to the scripted outcome.
function fakeClient(outcome: Outcome = {}) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const record = (op: string, args: unknown[]) => calls.push({ table, op, args });
      const result = { data: outcome.data ?? null, error: outcome.error ?? null };
      const builder: Record<string, unknown> = {};
      for (const op of ["select", "update", "eq"]) {
        builder[op] = (...args: unknown[]) => {
          record(op, args);
          return builder;
        };
      }
      builder.maybeSingle = () => {
        record("maybeSingle", []);
        return Promise.resolve(result);
      };
      builder.then = (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject);
      return builder;
    },
  };
  return { client, calls };
}

const ID = "11111111-1111-4111-8111-111111111111";

function filters(calls: Call[]): unknown[][] {
  return calls.filter((c) => c.op === "eq").map((c) => c.args);
}

Deno.test("store.decide: updates status + reviewed_by only where still awaiting_review", async () => {
  const { client, calls } = fakeClient({ data: [{ id: ID, status: "approved" }] });
  const result = await createRunStore(client).decide({
    id: ID,
    status: "approved",
    reviewedBy: "dradamopierce@gmail.com (signed link)",
  });
  assertEquals(result, { kind: "ok" });
  assertEquals(calls.every((c) => c.table === "inspection_runs"), true);
  assertEquals(
    calls.find((c) => c.op === "update")?.args,
    [{ status: "approved", reviewed_by: "dradamopierce@gmail.com (signed link)" }],
  );
  assertEquals(filters(calls), [["id", ID], ["status", "awaiting_review"]]);
  // .select() after the update is what makes PostgREST return the changed rows.
  assertEquals(calls.at(-1)?.op, "select");
});

Deno.test("store.decide: no row matched is stale, a database error is refused", async () => {
  const stale = fakeClient({ data: [] });
  assertEquals(
    await createRunStore(stale.client).decide({ id: ID, status: "rejected", reviewedBy: "x" }),
    { kind: "stale" },
  );
  const refused = fakeClient({ error: { message: "inspection run x is closed" } });
  assertEquals(
    await createRunStore(refused.client).decide({ id: ID, status: "rejected", reviewedBy: "x" }),
    { kind: "refused", message: "inspection run x is closed" },
  );
});

Deno.test("store.markEmailSent: stamps review_email_sent_at only while awaiting_review", async () => {
  const { client, calls } = fakeClient();
  await createRunStore(client).markEmailSent({ id: ID, sentAt: "2026-10-13T15:00:00.000Z" });
  assertEquals(
    calls.find((c) => c.op === "update")?.args,
    [{ review_email_sent_at: "2026-10-13T15:00:00.000Z" }],
  );
  assertEquals(filters(calls), [["id", ID], ["status", "awaiting_review"]]);
});

Deno.test("store.markEmailSent: a database error is thrown to the caller", async () => {
  const { client } = fakeClient({ error: { message: "boom" } });
  await assertRejects(() =>
    createRunStore(client).markEmailSent({ id: ID, sentAt: "2026-10-13T15:00:00.000Z" })
  );
});

Deno.test("store.loadRunById / loadRunByTokenHash: select the run columns by one key", async () => {
  const row = { id: ID, run_key: "k" };
  const byId = fakeClient({ data: row });
  assertEquals(await createRunStore(byId.client).loadRunById(ID), row);
  assertEquals(byId.calls.find((c) => c.op === "select")?.args, [RUN_COLUMNS]);
  assertEquals(filters(byId.calls), [["id", ID]]);

  const byHash = fakeClient({ data: null });
  assertEquals(await createRunStore(byHash.client).loadRunByTokenHash("ab".repeat(32)), null);
  assertEquals(filters(byHash.calls), [["review_token_hash", "ab".repeat(32)]]);
  for (const column of ["status", "review_token_hash", "review_token_expires_at", "outputs"]) {
    assertEquals(RUN_COLUMNS.split(",").includes(column), true, column);
  }
});

Deno.test("store.load*: a database error is thrown, never read as 'not found'", async () => {
  const { client } = fakeClient({ error: { message: "boom" } });
  await assertRejects(() => createRunStore(client).loadRunById(ID));
  await assertRejects(() => createRunStore(client).loadRunByTokenHash("x"));
});
