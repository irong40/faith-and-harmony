import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runbookPath = new URL(
  "../../docs/runbooks/substack-review-publishing.md",
  import.meta.url,
);

test("browser publishing runbook preserves every publication gate", async () => {
  const runbook = await readFile(runbookPath, "utf8");

  for (const required of [
    "supported Substack connector or write API",
    "existing signed-in Chrome session",
    "Dr. Adam O. Pierce",
    "headline, subtitle, article body, Notes teaser, and subscribe call",
    "normalized content hash",
    "Public",
    "All subscribers",
    "Immediately",
    "stop before the final Publish control",
    "press the final Publish control exactly once",
    "Posts page",
    "RSS feed",
    "before any retry",
    "public URL, title, content fingerprint, and RSS entry",
    "verified link email",
  ]) {
    assert.ok(runbook.includes(required), `Missing runbook requirement: ${required}`);
  }

  for (const stopCondition of [
    "authentication is missing",
    "profile identity is wrong or uncertain",
    "approved version is stale",
    "change request exists",
    "editor content differs",
    "audience controls are ambiguous",
    "timing controls are ambiguous",
    "Substack interface has changed",
    "publication result is uncertain",
  ]) {
    assert.ok(runbook.includes(stopCondition), `Missing fail-closed condition: ${stopCondition}`);
  }
});
