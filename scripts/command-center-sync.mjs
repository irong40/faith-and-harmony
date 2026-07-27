#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_VAULT_ROOT = "C:/Users/redle.SOULAAN/obsidian-dev";
const DEFAULT_INPUT = join(DEFAULT_VAULT_ROOT, "agent-office", "command-center", "inbox");
const DEFAULT_OUTPUT = join(DEFAULT_VAULT_ROOT, "agent-office", "command-center", "generated");

const WORK_FIELDS = new Set([
  "source_ref", "title", "description", "item_type", "department", "priority", "due_at",
]);
const DEPARTMENT_FIELDS = new Set([
  "source_ref", "department", "health", "objective", "summary", "blockers", "report_path", "reported_at",
]);

function stripEnvQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function readEnvValue(names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name].trim();
  }
  for (const filename of [".env", ".env.local"]) {
    let contents;
    try {
      contents = await readFile(join(REPO_ROOT, filename), "utf8");
    } catch {
      continue;
    }
    for (const name of names) {
      const line = contents.split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
      if (line) return stripEnvQuotes(line.slice(line.indexOf("=") + 1));
    }
  }
  return "";
}

function assertAllowedFields(data, allowed, filename) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${filename} must contain one JSON object`);
  }
  const unexpected = Object.keys(data).filter((key) => !allowed.has(key));
  if (unexpected.length) throw new Error(`${filename}: ${unexpected.join(", ")} is not allowed`);
}

function sourceRef(filename) {
  return `obsidian:command-center/inbox/${filename.replaceAll("\\", "/")}`;
}

export function signRequest(rawBody, timestamp, secret) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function buildPayload(entries, { mode = "dry_run", source = "obsidian" } = {}) {
  if (mode !== "dry_run" && mode !== "apply") throw new Error("mode must be dry_run or apply");
  if (source !== "obsidian" && source !== "agent") throw new Error("source must be obsidian or agent");

  const workItems = [];
  const departmentUpdates = [];
  for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.endsWith(".work.json")) {
      assertAllowedFields(entry.data, WORK_FIELDS, entry.name);
      workItems.push({ source_ref: sourceRef(entry.name), ...entry.data });
    } else if (entry.name.endsWith(".department.json")) {
      assertAllowedFields(entry.data, DEPARTMENT_FIELDS, entry.name);
      departmentUpdates.push({ source_ref: sourceRef(entry.name), ...entry.data });
    } else {
      throw new Error(`${entry.name} must end in .work.json or .department.json`);
    }
  }

  return { mode, source, work_items: workItems, department_updates: departmentUpdates };
}

export function renderStatusMarkdown(status) {
  const response = status.response ?? {};
  const mode = response.mode === "apply" ? "Apply" : "Dry run";
  const conflicts = Array.isArray(response.conflicts) ? response.conflicts.length : 0;
  return `# Command Center Sync\n\n` +
    `Generated: ${status.generated_at}\n\n` +
    `Mode: ${mode}\n\n` +
    `| Result | Count |\n| --- | ---: |\n` +
    `| Would apply | ${response.wouldApply ?? 0} |\n` +
    `| Applied | ${response.applied ?? 0} |\n` +
    `| Skipped | ${response.skipped ?? 0} |\n` +
    `| Conflicts | ${conflicts} |\n\n` +
    `Input: ${status.input_directory}\n`;
}

async function readEntries(inputDirectory) {
  const filenames = (await readdir(inputDirectory))
    .filter((filename) => filename.endsWith(".work.json") || filename.endsWith(".department.json"));
  return Promise.all(filenames.map(async (name) => ({
    name,
    data: JSON.parse(await readFile(join(inputDirectory, name), "utf8")),
  })));
}

function parseArguments(argv) {
  const options = { mode: "dry_run", source: "obsidian", input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, url: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.mode = "apply";
    else if (argument === "--input") options.input = resolve(argv[++index]);
    else if (argument === "--output") options.output = resolve(argv[++index]);
    else if (argument === "--url") options.url = argv[++index];
    else if (argument === "--source") options.source = argv[++index];
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

function usage() {
  return [
    "Usage: npm run command-center:sync -- [--apply] [options]",
    "",
    "Defaults to a dry run. Add --apply only after reviewing the dry-run result.",
    "Options: --input <dir> --output <dir> --source <obsidian|agent> --url <supabase-url>",
  ].join("\n");
}

async function writeStatus(outputDirectory, status) {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(outputDirectory, "status.json"), `${JSON.stringify(status, null, 2)}\n`, "utf8"),
    writeFile(join(outputDirectory, "status.md"), renderStatusMarkdown(status), "utf8"),
  ]);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const [supabaseUrl, anonKey, syncSecret] = await Promise.all([
    options.url ? Promise.resolve(options.url) : readEnvValue(["VITE_SUPABASE_URL", "SUPABASE_URL"]),
    readEnvValue(["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]),
    readEnvValue(["COMMAND_CENTER_SYNC_SECRET"]),
  ]);
  if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL is missing from env/.env");
  if (!anonKey) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY is missing from env/.env");
  if (!syncSecret) throw new Error("COMMAND_CENTER_SYNC_SECRET is missing from env/.env");

  const entries = await readEntries(options.input);
  const payload = buildPayload(entries, options);
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = signRequest(rawBody, timestamp, syncSecret);
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/command-center-sync`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": "application/json",
      "x-command-center-signature": signature,
      "x-command-center-timestamp": timestamp,
    },
    body: rawBody,
  });
  const result = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) throw new Error(`Sync request failed (${response.status}): ${result.error ?? "Unknown error"}`);

  const status = {
    generated_at: new Date().toISOString(),
    input_directory: options.input.replaceAll("\\", "/"),
    response: result,
  };
  await writeStatus(options.output, status);
  console.log(`${options.mode === "apply" ? "Apply" : "Dry run"} complete: ${result.wouldApply ?? 0} proposed, ${result.applied ?? 0} applied, ${result.skipped ?? 0} skipped.`);
  console.log(`Status written to ${join(options.output, "status.md")}`);
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

