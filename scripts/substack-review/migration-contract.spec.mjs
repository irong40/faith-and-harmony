import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260822120000_substack_review_workflow.sql",
  import.meta.url,
);

async function migrationSql() {
  return readFile(migrationUrl, "utf8");
}

test("migration creates private version and audit tables", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create table public\.substack_review_versions/i);
  assert.match(sql, /create table public\.substack_review_events/i);
  assert.match(
    sql,
    /alter table public\.substack_review_versions enable row level security/i,
  );
  assert.match(
    sql,
    /alter table public\.substack_review_events enable row level security/i,
  );
  assert.match(sql, /to service_role/i);
  assert.doesNotMatch(sql, /create policy[\s\S]*?to authenticated/i);
  assert.match(sql, /revoke all on public\.substack_review_versions from anon, authenticated/i);
  assert.match(sql, /revoke all on public\.substack_review_events from anon, authenticated/i);
});

test("migration binds a unique token and version to one draft", async () => {
  const sql = await migrationSql();

  assert.match(sql, /token_hash text not null unique/i);
  assert.match(sql, /unique \(draft_id, version\)/i);
  assert.match(
    sql,
    /create unique index substack_review_one_open_version[\s\S]*?where status in \([\s\S]*?'pending_review'[\s\S]*?'approved'[\s\S]*?'publishing'[\s\S]*?'verification_failed'/i,
  );
});

test("migration claims one approved publication atomically", async () => {
  const sql = await migrationSql();

  assert.match(
    sql,
    /create or replace function public\.claim_substack_review_publication\(worker_id text\)/i,
  );
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public, pg_temp/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /set status = 'publishing'/i);
  assert.match(
    sql,
    /revoke all on function public\.claim_substack_review_publication\(text\) from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.claim_substack_review_publication\(text\) to service_role/i,
  );
});

test("migration prevents reviewed content mutation and illegal status changes", async () => {
  const sql = await migrationSql();

  assert.match(
    sql,
    /create or replace function public\.enforce_substack_review_version_update\(\)/i,
  );
  assert.match(sql, /reviewed content is immutable/i);
  assert.match(sql, /illegal substack review status transition/i);
  assert.match(
    sql,
    /create trigger enforce_substack_review_version_update/i,
  );
});

test("migration keeps the audit table append only", async () => {
  const sql = await migrationSql();

  assert.match(
    sql,
    /create policy substack_review_events_service_insert[\s\S]*?for insert to service_role/i,
  );
  assert.match(
    sql,
    /create policy substack_review_events_service_select[\s\S]*?for select to service_role/i,
  );
  assert.doesNotMatch(
    sql,
    /create policy substack_review_events_service_(update|delete)/i,
  );
});
