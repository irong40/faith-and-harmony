import { describe, expect, it } from "vitest";
import { archivePatch, isArchived, jobsInView, type Archivable } from "./jobArchive";

type Row = Archivable & { id: string };

const live: Row = { id: "a", archived_at: null };
const legacy: Row = { id: "b" }; // a row fetched before the column existed in the select
const archived: Row = { id: "c", archived_at: "2026-10-02T12:45:10Z" };

describe("isArchived", () => {
  it("treats NULL and a missing column as live", () => {
    expect(isArchived(live)).toBe(false);
    expect(isArchived(legacy)).toBe(false);
    expect(isArchived(archived)).toBe(true);
  });
});

describe("jobsInView", () => {
  it("shows only live jobs by default", () => {
    expect(jobsInView([live, legacy, archived], false).map((j) => j.id)).toEqual(["a", "b"]);
  });
  it("shows only archived jobs in the archive view, never a mix", () => {
    expect(jobsInView([live, legacy, archived], true).map((j) => j.id)).toEqual(["c"]);
  });
});

describe("archivePatch", () => {
  it("stamps the time and a reason when archiving, and touches nothing else", () => {
    const patch = archivePatch(true, "Test record.", new Date("2026-10-02T12:00:00Z"));
    expect(patch).toEqual({ archived_at: "2026-10-02T12:00:00.000Z", archive_reason: "Test record." });
    expect(Object.keys(patch)).toEqual(["archived_at", "archive_reason"]);
  });
  // Restoring must not leave a stale reason behind, and must not set a status:
  // the job comes back exactly as it was.
  it("clears both columns when restoring", () => {
    expect(archivePatch(false)).toEqual({ archived_at: null, archive_reason: null });
  });
});
