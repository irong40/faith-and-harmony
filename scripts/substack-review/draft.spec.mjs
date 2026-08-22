import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DraftValidationError,
  packageSubstackDraft,
  parseSubstackDraft,
} from "./draft.mjs";

const validFixtureUrl = new URL("./fixtures/valid-draft.md", import.meta.url);
const unverifiedFixtureUrl = new URL("./fixtures/unverified-draft.md", import.meta.url);

const validDraft = await readFile(validFixtureUrl, "utf8");
const unverifiedDraft = await readFile(unverifiedFixtureUrl, "utf8");

function withArticle(markdown, article) {
  return markdown.replace(
    /# Article\r?\n[\s\S]*?\r?\n## Subscribe/,
    `# Article\n\n${article}\n\n## Subscribe`,
  );
}

test("parses the current Substack draft format", () => {
  const parsed = parseSubstackDraft(validDraft, "C:\\drafts\\field-report.md");

  assert.equal(parsed.draftId, "field-report");
  assert.equal(parsed.selectedHeadline, "The Drone Stayed on the Ground");
  assert.equal(
    parsed.subtitle,
    "What an abandoned test taught me about mission planning.",
  );
  assert.match(parsed.articleMarkdown, /I evaluated four locations/);
  assert.doesNotMatch(parsed.articleMarkdown, /Subscribe for/);
  assert.equal(
    parsed.subscribeCall,
    "Subscribe for the next Sentinel Aerial Inspections field report.",
  );
  assert.match(parsed.notesTeaser, /Four locations/);
  assert.equal(parsed.sources.length, 2);
  assert.ok(parsed.wordCount > 20);
});

test("packages a complete draft with a stable normalized content hash", () => {
  const first = packageSubstackDraft(validDraft, "C:\\drafts\\field-report.md", {
    minWords: 20,
    maxWords: 200,
  });
  const second = packageSubstackDraft(
    validDraft.replaceAll("\n", "\r\n"),
    "C:\\drafts\\field-report.md",
    { minWords: 20, maxWords: 200 },
  );

  assert.equal(first.contentHash.length, 64);
  assert.equal(first.contentHash, second.contentHash);
});

test("blocks every unresolved verification marker", () => {
  assert.throws(
    () => packageSubstackDraft(unverifiedDraft, "C:\\drafts\\unverified.md", {
      minWords: 1,
      maxWords: 200,
    }),
    (error) => {
      assert.ok(error instanceof DraftValidationError);
      assert.ok(error.errors.some((message) => message.includes("[VERIFY]")));
      return true;
    },
  );
});

test("enforces the default 900 to 1400 article word range", () => {
  const tooShort = withArticle(validDraft, Array(899).fill("field").join(" "));
  const tooLong = withArticle(validDraft, Array(1401).fill("field").join(" "));

  assert.throws(() => packageSubstackDraft(tooShort, "C:\\drafts\\short.md"), /at least 900 words/);
  assert.throws(() => packageSubstackDraft(tooLong, "C:\\drafts\\long.md"), /no more than 1400 words/);
});

test("requires evidence sources", () => {
  const withoutSources = validDraft.replace(
    /sources:\r?\n(?:  - .*\r?\n)+/,
    "sources:\n",
  );

  assert.throws(
    () => packageSubstackDraft(withoutSources, "C:\\drafts\\no-sources.md", {
      minWords: 20,
      maxWords: 200,
    }),
    /at least one evidence source/i,
  );
});

test("blocks em dashes and the banned contrast construction", () => {
  const emDash = validDraft.replace("different operating constraint", "different operating constraint — one I missed");
  const contrast = validDraft.replace(
    "The result was zero flights",
    "The result was not a failure, it is a planning result",
  );

  assert.throws(
    () => packageSubstackDraft(emDash, "C:\\drafts\\dash.md", {
      minWords: 20,
      maxWords: 200,
    }),
    /em dash/,
  );
  assert.throws(
    () => packageSubstackDraft(contrast, "C:\\drafts\\contrast.md", {
      minWords: 20,
      maxWords: 200,
    }),
    /banned contrast construction/,
  );
});

test("blocks a rhetorical question opening", () => {
  const rhetorical = validDraft.replace(
    "I evaluated four locations for a controlled field test.",
    "Have you ever wondered why a drone stays grounded?",
  );

  assert.throws(
    () => packageSubstackDraft(rhetorical, "C:\\drafts\\question.md", {
      minWords: 20,
      maxWords: 200,
    }),
    /rhetorical question/,
  );
});

test("requires every publishing section", () => {
  const missingTeaser = validDraft.replace(/# Substack Notes teaser[\s\S]*?# Verification notes/, "# Verification notes");

  assert.throws(
    () => packageSubstackDraft(missingTeaser, "C:\\drafts\\missing.md", {
      minWords: 20,
      maxWords: 200,
    }),
    /Substack Notes teaser/,
  );
});
