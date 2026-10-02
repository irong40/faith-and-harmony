// ---------------------------------------------------------------------------
// Office — types and pure helpers for /admin/office.
//
// The agent office runs on Adam's desktop. Every 5 minutes a sync script pushes
// one status snapshot into `office_snapshot` and collects whatever Adam typed
// into `office_inbox`. This page only reads that snapshot and writes messages;
// it never talks to the agents directly. Everything here is pure so the rules
// (what counts as open, stale, waiting) are tested without a browser.
// ---------------------------------------------------------------------------

export type Tone = "good" | "warn" | "crit" | "info" | "hold" | "idle";

export interface OfficeDecision {
  n: number;
  title: string;
  tag: string;
  recommendation: string;
  deadline: string;
  source: string;
  /** Adam's answer as recorded in the office ledger. Empty while open. */
  answer: string;
}

export interface OfficeJob {
  id: string;
  title: string;
  /** queued | in-progress | held | blocked | done */
  status: string;
  detail: string;
  assignee: string;
  deadline: string;
  updated: string | null;
}

export interface OfficeEmployee {
  name: string;
  does: string;
  doing: string;
  queued: number;
  held: number;
  blocked: number;
  done_7d: number;
  last_done: string;
  last_done_at: string | null;
  lessons: number;
}

export interface OfficeAutomation {
  name: string;
  level: string;
  message: string;
  last_run: string | null;
  last_success: string | null;
}

export interface OfficeSnapshot {
  generated_at?: string;
  outbrief?: {
    date: string | null;
    summary?: string;
    decisions: OfficeDecision[];
    stuck?: string[];
  };
  team?: OfficeEmployee[];
  jobs?: OfficeJob[];
  dispatcher?: {
    running: boolean;
    last_pass_at: string;
    last_pass_day: string;
    last_outcome: string;
    paused?: string[];
  };
  automations?: { checked_at: string | null; overall: string; results: OfficeAutomation[] };
  crm?: {
    generated_at?: string;
    jobs?: { total?: number; by_status?: Record<string, number>; stale_scheduled?: number };
    leads?: { total?: number; new_7d?: number };
    quotes?: { by_status?: Record<string, number>; accepted_without_job?: number };
    billing?: { payments_total?: number; payments_pending?: number; delivered_unbilled?: number };
    drip?: { by_status?: Record<string, number>; last_sent?: string | null };
  };
  activity?: { at: string; text: string }[];
}

export type OfficeMessageKind = "answer" | "directive" | "release";

export interface OfficeMessage {
  id: string;
  created_at: string;
  kind: OfficeMessageKind;
  digest_date: string | null;
  item: number | null;
  body: string;
  picked_up_at: string | null;
  ledger_line: string | null;
}

/** Short code and plain title for each roster employee. Unknown names fall back to the raw name. */
export const ROLE: Record<string, [code: string, title: string]> = {
  "engineering-devops-automator": ["OPS", "Systems and pipelines"],
  "bd-contracts-officer": ["BD", "Grants and contracts"],
  "finance-officer": ["FIN", "Finance"],
  "ciso-officer": ["SEC", "Security"],
  "compliance-audit-officer": ["CMP", "Compliance"],
  "testing-qa-specialist": ["QA", "Quality checks"],
  "technical-writer": ["DOC", "Technical writer"],
  "office-manager": ["PAULA", "Office manager"],
  "video-producer": ["VID", "Video producer"],
  "part107-quiz-writer": ["QUIZ", "Part 107 quiz writer"],
  "marketing-reviewer": ["MKT", "Marketing reviewer"],
};

export function roleOf(name: string): [string, string] {
  return ROLE[name] ?? [name.slice(0, 5).toUpperCase(), name];
}

/** "3 min ago", "2 h ago", "4 d ago". Never throws on a bad or missing date. */
export function ago(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "unknown";
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/**
 * How much to trust what is on screen. The sync runs every 5 minutes, so 12
 * minutes covers one missed run. Past 90 the desktop is off or asleep, and the
 * page says so instead of showing old numbers as if they were live.
 */
export function freshness(updatedAt: string | null, now: number = Date.now()): { tone: Tone; text: string } {
  if (!updatedAt) return { tone: "idle", text: "Waiting for the first status" };
  const mins = (now - new Date(updatedAt).getTime()) / 60000;
  if (mins <= 12) return { tone: "good", text: `Live. Office reported ${ago(updatedAt, now)}` };
  if (mins <= 90) return { tone: "warn", text: `Office last reported ${ago(updatedAt, now)}` };
  return { tone: "crit", text: `Office silent since ${ago(updatedAt, now)}. The desktop may be off or asleep.` };
}

/** The newest message answering one Outbrief item, sent but maybe not yet in the ledger. */
export function pendingAnswer(messages: OfficeMessage[], date: string | null | undefined, n: number): OfficeMessage | null {
  return messages.find((m) => m.kind === "answer" && m.digest_date === date && m.item === n) ?? null;
}

/**
 * A decision is closed once the ledger holds an answer OR a message answering
 * it has been sent. Without the second half, a tapped Yes would sit in "open"
 * for up to 5 minutes and invite a second tap.
 */
export function splitDecisions(
  decisions: OfficeDecision[],
  date: string | null | undefined,
  messages: OfficeMessage[]
): { open: OfficeDecision[]; closed: OfficeDecision[] } {
  const open: OfficeDecision[] = [];
  const closed: OfficeDecision[] = [];
  for (const d of decisions) (d.answer || pendingAnswer(messages, date, d.n) ? closed : open).push(d);
  return { open, closed };
}

export function employeeState(t: OfficeEmployee): { tone: Tone; label: string } {
  if (t.doing) return { tone: "info", label: "Working" };
  if (t.queued) return { tone: "good", label: "Up next" };
  if (t.held) return { tone: "hold", label: "Held" };
  if (t.blocked) return { tone: "warn", label: "Blocked" };
  return { tone: "idle", label: "Idle" };
}

export interface BoardColumn {
  key: "todo" | "doing" | "waiting" | "done";
  label: string;
  empty: string;
  jobs: OfficeJob[];
}

const COLUMNS: { key: BoardColumn["key"]; label: string; statuses: string[]; empty: string }[] = [
  { key: "todo", label: "To do", statuses: ["queued"], empty: "Nothing queued." },
  { key: "doing", label: "Doing", statuses: ["in-progress"], empty: "No job is running right now." },
  { key: "waiting", label: "Waiting on you", statuses: ["held", "blocked"], empty: "Nothing is waiting on you." },
  { key: "done", label: "Done this week", statuses: ["done"], empty: "No finished jobs yet." },
];

/** Four columns, newest first inside each. A job with an unknown status is left off the board. */
export function boardColumns(jobs: OfficeJob[]): BoardColumn[] {
  return COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
    empty: c.empty,
    jobs: jobs
      .filter((j) => c.statuses.includes(j.status))
      .sort((a, b) => String(b.updated ?? "").localeCompare(String(a.updated ?? ""))),
  }));
}

/** True once a Release for this job is in the message list, so the button cannot be tapped twice. */
export function releaseSent(messages: OfficeMessage[], jobId: string): boolean {
  return messages.some((m) => m.kind === "release" && m.body === jobId);
}

const LEVEL_RANK: Record<string, number> = { RED: 0, WARN: 1, OK: 2 };

/** Failing first, then warnings, then healthy. */
export function sortAutomations(results: OfficeAutomation[]): OfficeAutomation[] {
  return [...results].sort((a, b) => (LEVEL_RANK[a.level] ?? 3) - (LEVEL_RANK[b.level] ?? 3));
}

export function automationTone(level: string): { tone: Tone; label: string } {
  if (level === "RED") return { tone: "crit", label: "Failing" };
  if (level === "WARN") return { tone: "warn", label: "Warning" };
  return { tone: "good", label: "OK" };
}

/** What happened to a message after it was sent. The office writes REFUSED or FAILED when it would not act. */
export function messageStatus(m: OfficeMessage, now: number = Date.now()): { tone: Tone; text: string } {
  if (m.ledger_line && /^(REFUSED|FAILED)/.test(m.ledger_line)) return { tone: "crit", text: m.ledger_line };
  if (m.picked_up_at) return { tone: "good", text: `Received by the office ${ago(m.picked_up_at, now)}` };
  return { tone: "idle", text: "Sent. The office collects it within 5 minutes." };
}

export function messageLabel(m: OfficeMessage): string {
  if (m.kind === "directive") return "To the COO";
  if (m.kind === "release") return "Released job";
  return `Answer to #${m.item}`;
}

/** {"sent": 2, "draft": 1} -> "2 sent, 1 draft" */
export function countPairs(o: Record<string, number> | undefined): string {
  return Object.entries(o ?? {})
    .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`)
    .join(", ");
}

/**
 * Postgres says 42501 when the signed-in user has no grant on the table. That
 * is the state before the office access rule is applied, and it needs its own
 * message: "try again" would never work.
 */
export function isAccessNotGranted(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === "42501" || (typeof e.message === "string" && /permission denied/i.test(e.message));
}
