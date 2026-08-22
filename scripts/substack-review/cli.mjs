#!/usr/bin/env node

import {
  claimApprovedVersion,
  enqueueDraft,
  getNextAction,
  markPublished,
  markVerificationFailed,
} from "./queue.mjs";

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const name = value.slice(2);
    if (name === "json") {
      flags.json = true;
      continue;
    }
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${name}`);
    flags[name] = next;
    index += 1;
  }
  return { command, flags };
}

function safeClaim(version) {
  if (!version) return null;
  return {
    id: version.id,
    draft_id: version.draft_id,
    version: version.version,
    status: version.status,
    selected_headline: version.selected_headline,
    subtitle: version.subtitle,
    source_path: version.source_path,
    content_hash: version.content_hash,
  };
}

async function run() {
  const { command, flags } = parseArguments(process.argv.slice(2));
  let result;
  switch (command) {
    case "enqueue":
      result = await enqueueDraft(flags.file);
      break;
    case "next":
      result = await getNextAction();
      break;
    case "claim":
      result = safeClaim(await claimApprovedVersion(flags.worker));
      break;
    case "published":
      result = await markPublished(flags.id, flags.url, flags["rss-guid"]);
      break;
    case "verification-failed":
      result = await markVerificationFailed(flags.id, flags.message);
      break;
    default:
      throw new Error(
        "Command must be enqueue, next, claim, published, or verification-failed",
      );
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Substack review command failed: ${message}\n`);
  process.exitCode = 1;
});
