# Command Center Sync Contract

The command center uses a split-authority model:

| System | Owns |
| --- | --- |
| Supabase CRM | Status, priority, owner, deadline, dependencies, approval, completion, and operational history |
| Obsidian vault | Reports, procedures, evidence, source notes, and long-form context |

The vault may propose new work and publish department health updates. It cannot update the lifecycle fields of an existing CRM work item. A proposal always enters the CRM with `status: inbox` and no owner. An admin reviews it before moving it through the workflow.

## Security boundary

`command-center-sync` is a server-to-server Supabase Edge Function. Requests require both:

1. The project's anon JWT in `Authorization` and `apikey` headers.
2. A fresh HMAC-SHA256 signature in `x-command-center-signature` over `<timestamp>.<exact request body>`.

The timestamp in `x-command-center-timestamp` must be within five minutes of the server time. The payload is limited to 1 MB and 250 proposed records. The Supabase service-role key exists only inside the Edge Function and must never be placed in the vault, browser, or local sync script.

Configure `COMMAND_CENTER_SYNC_SECRET` as a Supabase function secret and as a protected local environment variable. Do not commit it.

## Vault input

The script reads JSON files from:

`C:/Users/redle.SOULAAN/obsidian-dev/agent-office/command-center/inbox`

Work proposals end in `.work.json`:

```json
{
  "title": "Follow up on crane inspection quote",
  "description": "Confirm scope and send the approved quote.",
  "item_type": "task",
  "department": "revenue",
  "priority": "high",
  "due_at": "2026-07-29T21:00:00.000Z"
}
```

Department reports end in `.department.json`:

```json
{
  "department": "revenue",
  "health": "watch",
  "objective": "Convert qualified inspection demand",
  "summary": "One qualified quote needs an owner decision.",
  "blockers": ["Scope confirmation is outstanding"],
  "report_path": "projects/faith-and-harmony/reports/revenue-2026-07-27.md",
  "reported_at": "2026-07-27T18:00:00.000Z"
}
```

Allowed work fields are `source_ref`, `title`, `description`, `item_type`, `department`, `priority`, and `due_at`. Allowed department fields are `source_ref`, `department`, `health`, `objective`, `summary`, `blockers`, `report_path`, and `reported_at`. Any other field rejects the entire request. In particular, `status`, `owner_id`, `completed_at`, and approval fields are not accepted.

When `source_ref` is omitted, the script derives a stable reference from the filename, such as `obsidian:command-center/inbox/follow-up-crane.work.json`. Rename a file only when it should be treated as a new proposal.

## Run the sync

Dry run is the default:

```powershell
npm run command-center:sync
```

After reviewing `generated/status.md`, apply the proposed inserts explicitly:

```powershell
npm run command-center:sync -- --apply
```

Optional flags are `--input <dir>`, `--output <dir>`, `--source <obsidian|agent>`, and `--url <supabase-url>`.

Each successful request writes `status.json` and `status.md` under:

`C:/Users/redle.SOULAAN/obsidian-dev/agent-office/command-center/generated`

Generated files are output only. Do not feed them back into the inbox.

## Idempotency and conflicts

The pair of `source_system` and `source_ref` is unique in both destination tables.

- The same reference and same title or summary is skipped.
- The same reference with different content is reported as a conflict and is not overwritten.
- A dry run calculates inserts, skips, and conflicts but does not insert work or department updates.
- Every accepted request records a `sync_runs` audit row. Failed Edge Function operations attempt to record a failed run as well.

Resolve a conflict in the owning system. For CRM lifecycle changes, use the CRM. For incorrect vault content, correct the source file. If the content represents genuinely new work, create a new file or assign a new explicit `source_ref`.

## Stale runs, retry, and recovery

The request timestamp protects against replay, not scheduling drift. Use `sync_runs.completed_at` and the generated status timestamp to detect an overdue sync. Never retry a 401 or 403 automatically; verify the function secret, anon key, JWT configuration, and clock first.

Network and 5xx failures may be retried after inspection. Stable source references make retry safe: already inserted rows are skipped and remaining rows can be applied. If an insert partially completed before a later operation failed, the next dry run shows what remains. Review that dry run before applying again.

