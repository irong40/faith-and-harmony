import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../../supabase/migrations/20260822130000_substack_review_queue_rpc.sql",
  import.meta.url,
);

test("queue migration exposes service-role-only atomic operations", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const name of [
    "enqueue_substack_review_version",
    "rotate_substack_review_token",
    "next_substack_review_action",
    "mark_substack_review_published",
    "mark_substack_review_verification_failed",
    "record_substack_review_email_failure",
  ]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${name}`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}`, "i"));
  }

  assert.match(sql, /security definer/gi);
  assert.match(sql, /for update/gi);
  assert.match(sql, /substack_review_events/gi);
  assert.match(sql, /status = 'superseded'/gi);
  assert.match(sql, /current_setting\('app\.substack_review_token_rotation'/i);
});
