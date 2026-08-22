import { createHash } from "node:crypto";
import path from "node:path";

export class DraftValidationError extends Error {
  constructor(errors) {
    super(`Substack draft validation failed: ${errors.join("; ")}`);
    this.name = "DraftValidationError";
    this.errors = errors;
  }
}

function normalizeLines(value) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontMatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    throw new DraftValidationError(["YAML front matter is required"]);
  }
  const end = markdown.indexOf("\n---\n", 4);
  if (end < 0) {
    throw new DraftValidationError(["YAML front matter is not closed"]);
  }
  const source = markdown.slice(4, end);
  const scalar = (key) => {
    const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return match ? unquote(match[1]) : "";
  };
  const sources = [];
  const lines = source.split("\n");
  const sourceIndex = lines.findIndex((line) => /^sources:\s*$/.test(line));
  if (sourceIndex >= 0) {
    for (const line of lines.slice(sourceIndex + 1)) {
      const match = line.match(/^\s+-\s+(.+)$/);
      if (match) {
        sources.push(unquote(match[1]));
        continue;
      }
      if (line.trim() && !/^\s/.test(line)) break;
    }
  }
  return {
    title: scalar("title"),
    subtitle: scalar("subtitle"),
    status: scalar("status"),
    sources,
    body: markdown.slice(end + 5),
  };
}

function topLevelSections(body) {
  const headings = [...body.matchAll(/^# ([^#\n].*)$/gm)];
  const sections = new Map();
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const name = heading[1].trim();
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    sections.set(name, body.slice(start, end).trim());
  }
  return sections;
}

function requireSection(sections, name) {
  const section = sections.get(name);
  if (!section) {
    throw new DraftValidationError([`${name} section is required`]);
  }
  return section;
}

function plainWords(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?(?:\[([^\]]*)\])\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~]/g, " ");
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

function contentHash(parsed) {
  const normalized = [
    `headline:${parsed.selectedHeadline.trim()}`,
    `subtitle:${parsed.subtitle.trim()}`,
    `article:${normalizeLines(parsed.articleMarkdown).trim()}`,
    `teaser:${normalizeLines(parsed.notesTeaser).trim()}`,
    `subscribe:${normalizeLines(parsed.subscribeCall).trim()}`,
  ].join("\n\u0000\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function parseSubstackDraft(markdown, sourcePath) {
  const normalized = normalizeLines(markdown);
  const frontMatter = parseFrontMatter(normalized);
  const sections = topLevelSections(frontMatter.body);
  const headlineOptions = requireSection(sections, "Headline options");
  requireSection(sections, "Selected subtitle");
  const articleWithSubscribe = requireSection(sections, "Article");
  const notesTeaser = requireSection(sections, "Substack Notes teaser");
  requireSection(sections, "Verification notes");

  const subscribeMatch = articleWithSubscribe.match(
    /^(?<article>[\s\S]*?)^## Subscribe\s*$\n+(?<subscribe>[\s\S]*)$/m,
  );
  if (!subscribeMatch?.groups) {
    throw new DraftValidationError(["Subscribe section is required inside Article"]);
  }

  const articleMarkdown = subscribeMatch.groups.article.trim();
  const subscribeCall = subscribeMatch.groups.subscribe.trim();
  const draftId = path.basename(sourcePath, path.extname(sourcePath));
  const headlineCount = (
    headlineOptions.match(/^\d+\.\s+\*\*.+\*\*\s*$/gm) ?? []
  ).length;

  const parsed = {
    draftId,
    selectedHeadline: frontMatter.title,
    subtitle: frontMatter.subtitle,
    articleMarkdown,
    notesTeaser,
    subscribeCall,
    sourcePath: path.resolve(sourcePath),
    sources: frontMatter.sources,
    status: frontMatter.status,
    headlineCount,
    wordCount: plainWords(articleMarkdown).length,
    fullMarkdown: normalized,
  };

  return { ...parsed, contentHash: contentHash(parsed) };
}

export function packageSubstackDraft(
  markdown,
  sourcePath,
  options = {},
) {
  const minWords = options.minWords ?? 900;
  const maxWords = options.maxWords ?? 1400;
  const parsed = parseSubstackDraft(markdown, sourcePath);
  const errors = [];

  if (!parsed.selectedHeadline) errors.push("A selected headline is required");
  if (!parsed.subtitle) errors.push("A selected subtitle is required");
  if (parsed.headlineCount < 3) errors.push("Three headline options are required");
  if (!parsed.sources.length) errors.push("At least one evidence source is required");
  if (parsed.status !== "draft") errors.push("The source status must be draft");
  if (parsed.fullMarkdown.includes("[VERIFY]")) {
    errors.push("Resolve every [VERIFY] marker before review");
  }
  if (parsed.wordCount < minWords) {
    errors.push(`The article must contain at least ${minWords} words`);
  }
  if (parsed.wordCount > maxWords) {
    errors.push(`The article must contain no more than ${maxWords} words`);
  }

  const publishingText = [
    parsed.selectedHeadline,
    parsed.subtitle,
    parsed.articleMarkdown,
    parsed.notesTeaser,
    parsed.subscribeCall,
  ].join("\n");
  if (publishingText.includes("—")) {
    errors.push("Remove every em dash from publishing content");
  }
  if (/\bnot\b[^.!?\n]{0,100},?\s+(?:it is|it's)\b/i.test(publishingText)) {
    errors.push("Remove the banned contrast construction");
  }

  const openingParagraph = parsed.articleMarkdown
    .split(/\n{2,}/)
    .find((paragraph) => paragraph.trim() && !paragraph.trim().startsWith("#")) ?? "";
  const firstSentence = openingParagraph.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0] ?? openingParagraph;
  if (firstSentence.includes("?")) {
    errors.push("Replace the rhetorical question opening");
  }

  if (errors.length) throw new DraftValidationError(errors);

  const {
    fullMarkdown: _fullMarkdown,
    headlineCount: _headlineCount,
    status: _status,
    ...reviewPackage
  } = parsed;
  return reviewPackage;
}
