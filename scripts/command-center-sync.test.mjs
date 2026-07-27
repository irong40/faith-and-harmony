import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  buildPayload,
  renderStatusMarkdown,
  signRequest,
} from "./command-center-sync.mjs";

test("signRequest signs the exact timestamp and body", () => {
  const body = JSON.stringify({ mode: "dry_run" });
  const timestamp = "1785182400000";
  const expected = createHmac("sha256", "test-secret")
    .update(`${timestamp}.${body}`)
    .digest("hex");

  assert.equal(signRequest(body, timestamp, "test-secret"), expected);
});

test("buildPayload separates work and department files with stable source refs", () => {
  const payload = buildPayload([
    {
      name: "follow-up-crane.work.json",
      data: {
        title: "Follow up on crane inspection quote",
        item_type: "task",
        department: "revenue",
        priority: "high",
      },
    },
    {
      name: "revenue.department.json",
      data: {
        department: "revenue",
        health: "watch",
        summary: "One qualified quote needs a decision.",
        reported_at: "2026-07-27T18:00:00.000Z",
      },
    },
  ], { mode: "apply" });

  assert.equal(payload.mode, "apply");
  assert.equal(payload.source, "obsidian");
  assert.equal(payload.work_items[0].source_ref, "obsidian:command-center/inbox/follow-up-crane.work.json");
  assert.equal(payload.department_updates[0].source_ref, "obsidian:command-center/inbox/revenue.department.json");
});

test("buildPayload rejects operational lifecycle fields", () => {
  assert.throws(
    () => buildPayload([
      {
        name: "unsafe.work.json",
        data: {
          title: "Unsafe proposal",
          item_type: "task",
          department: "operations",
          priority: "normal",
          status: "done",
        },
      },
    ]),
    /status is not allowed/,
  );
});

test("renderStatusMarkdown summarizes the run without exposing credentials", () => {
  const markdown = renderStatusMarkdown({
    generated_at: "2026-07-27T18:00:00.000Z",
    input_directory: "C:/vault/command-center/inbox",
    response: { mode: "dry_run", applied: 0, wouldApply: 2, skipped: 1, conflicts: [] },
  });

  assert.match(markdown, /Dry run/);
  assert.match(markdown, /Would apply \| 2/);
  assert.match(markdown, /Applied \| 0/);
  assert.doesNotMatch(markdown, /secret|authorization/i);
});
