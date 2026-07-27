import { assertEquals, assert } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  isFreshSyncTimestamp,
  signSyncBody,
  validateSyncPayload,
  verifySyncSignature,
} from "../_shared/command-center-sync.ts";

Deno.test("command center sync rejects stale timestamps", () => {
  assertEquals(isFreshSyncTimestamp("1000", 1_000_000, 1000), false);
});

Deno.test("command center sync verifies signed bodies", async () => {
  const body = JSON.stringify({ mode: "dry_run" });
  const signature = await signSyncBody(body, "1000", "secret");
  assert(await verifySyncSignature(body, "1000", signature, "secret"));
});

Deno.test("command center sync rejects lifecycle field injection", () => {
  const result = validateSyncPayload({
    mode: "apply",
    source: "agent",
    work_items: [{ source_ref: "x", title: "x", department: "executive", status: "done" }],
    department_updates: [],
  });
  assertEquals(result.valid, false);
});
