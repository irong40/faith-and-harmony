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

/** An older job in the same matter that is also still blocked. Shown, never hidden. */
export interface OfficeCallEarlier {
  id: string;
  title: string;
  needs: string;
  since: string | null;
}

/**
 * A question Adam asked and what the office answered (added 2026-10-04). `by`
 * is "COO" or the roster name of the employee who found the answer.
 */
export interface OfficeAnswer {
  q: string;
  a: string;
  by: string;
  at: string;
}

/**
 * A plain-language version of a call, written by the COO (call_cards.py,
 * added 2026-11-05: Adam could not tell how to answer calls written for
 * agents). Each option's `reply` is sent as his reply when he clicks it.
 */
export interface OfficeCallCard {
  ask: string;
  why: string;
  recommend: string;
  kind: "decision" | "action" | "info";
  steps: string[];
  options: { label: string; reply: string }[];
  /** True when the answer is a fact he has to type. */
  needs_text: boolean;
}

/**
 * One MATTER that is blocked on Adam or held for him, built live from the
 * queue by the desktop sync (lib/office_calls.py). Several jobs about the same
 * thing are one call: `id` is the newest of them, `earlier` the rest.
 */
export interface OfficeCall {
  id: string;
  title: string;
  /** What Adam has to do or decide, in the job's own words. */
  needs: string;
  /** True when the job only needs his Release. */
  held: boolean;
  assignee: string;
  /** When the job last changed. A reply older than this no longer answers it. */
  since: string | null;
  /** The instruction sheet the job points him at, if it names one. */
  sheet: string;
  /** The Outbrief item this matter belongs to, if any. */
  decision: number | null;
  /** Queued jobs that cannot start until this is answered. */
  unblocks: number;
  earlier: OfficeCallEarlier[];
  /** His reply as the office recorded it. Null while open. */
  reply: { text: string; at: string; job: string } | null;
  /**
   * Questions he asked on this call, with the office's answers, oldest first.
   * An answered question leaves the call open. Absent on a snapshot from a
   * sync older than 2026-10-04.
   */
  asked?: OfficeAnswer[];
  /** The plain-language card. Absent until the COO has written one. */
  card?: OfficeCallCard;
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
  /** Absent on a snapshot from a sync older than 2026-10-03. */
  calls?: OfficeCall[];
  /** Answers to questions that were not about a call, newest first. */
  answers?: OfficeAnswer[];
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
    jobs?: { total?: number; archived?: number; by_status?: Record<string, number>; stale_scheduled?: number };
    leads?: { total?: number; new_7d?: number };
    quotes?: { by_status?: Record<string, number>; accepted_without_job?: number };
    billing?: { payments_total?: number; payments_pending?: number; delivered_unbilled?: number };
    drip?: { by_status?: Record<string, number>; last_sent?: string | null };
  };
  activity?: { at: string; text: string }[];
  /** FlyGuys missions near base (2026-10-17). Absent on a snapshot from an older sync. */
  marketplace?: OfficeMarketplace;
  /** Open escalation files in agent-office/escalations. */
  escalations?: OfficeEscalation[];
}

export interface OfficeEscalation {
  file: string;
  title: string;
  updated: string | null;
  /** high | medium | low, as the file states it. Anything else reads as low. */
  severity: string;
}

/** FAA authorization verdict DroneSniper computed for the capture altitude. */
export type AirspaceLevel = "NONE" | "EASY_LAANC" | "DRONEZONE" | "SKIP" | "UNKNOWN";
/** open: nothing sent · interested: sent, no answer · lost: "Mission Not Assigned" email · possible_award: another FlyGuys email names it. */
/** mission_email: a FlyGuys email names the mission but does not read like an assignment; read it. */
/** unknown: a send may or may not have reached FlyGuys (never retried automatically). rejected: FlyGuys said it is no longer open. */
/** declined: Adam pressed "Not for me". Nothing was sent to FlyGuys; the office only recorded it. */
export type MissionStatus = "open" | "interested" | "lost" | "possible_award" | "mission_email" | "unknown" | "rejected" | "declined";

export interface OfficeMission {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  miles: number | null;
  acres: string | number | null;
  capture: string | null;
  due: string | null;
  deviation: string;
  flyguys_airspace: string;
  airspace_level: AirspaceLevel;
  airspace_text: string;
  /** When DroneSniper last ran the airspace screen for this mission. */
  airspace_checked_at?: string | null;
  lat: string | number | null;
  lng: string | number | null;
  status: MissionStatus;
  interest_at: string | null;
  outcome_subject: string | null;
  outcome_at: string | null;
  /** Interest was sent and the mission has since left the sourcing map (assigned missions leave it). */
  off_map?: boolean;
  /** Extra FlyGuys columns (2026-10-17). Optional: a snapshot from an older sync has none of them. */
  deviation_detail?: string | null;
  /** FlyGuys mission coordinator named on the mission. */
  mc?: string | null;
  /** Street number as FlyGuys publishes it (the map gives the number, not the street). */
  address?: string | null;
  zip?: string | null;
  /** FlyGuys' own status, e.g. "Pilot Sourcing". */
  mission_status?: string | null;
}

export interface OfficeMarketplace {
  source?: string;
  /** "ok", or UNKNOWN/ERROR text when the desktop could not read the mission feed. */
  status: string;
  pulled_at?: string | null;
  total_open?: number | null;
  /** "ok", "never", or AUTHFAIL/ERROR text from the FlyGuys email check. */
  outcomes_status?: string | null;
  outcomes_checked_at?: string | null;
  missions: OfficeMission[];
}

export type OfficeMessageKind = "answer" | "directive" | "release" | "interest" | "decline";

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
  "content-manager": ["CM", "Content manager"],
  "content-writer": ["WR", "Content writer"],
  "seo-analyst": ["SEO", "Search specialist"],
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
/** A snapshot older than this missed a sync run (the sync runs every 5 minutes; 12 covers one miss). */
export const SNAPSHOT_FRESH_MS = 12 * 60_000;

export function freshness(updatedAt: string | null, now: number = Date.now()): { tone: Tone; text: string } {
  if (!updatedAt) return { tone: "idle", text: "Waiting for the first status" };
  const mins = (now - new Date(updatedAt).getTime()) / 60000;
  if (mins <= SNAPSHOT_FRESH_MS / 60000) return { tone: "good", text: `Live. Office reported ${ago(updatedAt, now)}` };
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
  if (m.ledger_line && /^(UNKNOWN|SKIPPED)/.test(m.ledger_line)) return { tone: "warn", text: m.ledger_line };
  if (m.picked_up_at) return { tone: "good", text: `Received by the office ${ago(m.picked_up_at, now)}` };
  return { tone: "idle", text: "Sent. The office collects it within 5 minutes." };
}

export function messageLabel(m: OfficeMessage): string {
  if (m.kind === "directive") return isCallReply(m) ? "Reply on a call" : "To the COO";
  if (m.kind === "release") return "Released job";
  if (m.kind === "interest") return "FlyGuys interest";
  if (m.kind === "decline") return "FlyGuys: not for me";
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

// ---------------------------------------------------------------------------
// Calls: what is blocked on Adam right now.
//
// A reply is an ordinary directive whose body starts "RE job <id>:". The
// planner on the desktop reads the job that id names and plans the next step.
// No new message kind and no new column: the database grant stays as it is.
// ---------------------------------------------------------------------------

export function replyBody(jobId: string, text: string): string {
  return `RE job ${jobId}: ${text.trim()}`;
}

export function isCallReply(m: OfficeMessage): boolean {
  return m.kind === "directive" && m.body.startsWith("RE job ");
}

/**
 * The newest message that answers this call: a reply to any job in the matter
 * sent after the job last changed, or a Release for a held one. A reply sent
 * BEFORE the job last changed answered an earlier ask, not the one on screen.
 */
export function pendingReply(messages: OfficeMessage[], call: OfficeCall): OfficeMessage | null {
  const ids = [call.id, ...(call.earlier ?? []).map((e) => e.id)];
  // A question the office has answered no longer stands in for a reply: the
  // call is open again from the moment of that answer.
  const since = Math.max(call.since ? new Date(call.since).getTime() : 0, lastAnswerAt(call));
  return (
    messages.find((m) => {
      if (m.kind === "release") return call.held && ids.includes(m.body);
      if (m.kind !== "directive" || new Date(m.created_at).getTime() <= since) return false;
      return ids.some((id) => m.body.startsWith(`RE job ${id}:`));
    }) ?? null
  );
}

/**
 * Open calls and answered ones. A call whose Outbrief decision is still open
 * is left out of both: that decision's own card is already asking, and one
 * matter must not ask twice.
 */
export function splitCalls(
  calls: OfficeCall[],
  openDecisions: OfficeDecision[],
  messages: OfficeMessage[]
): { open: OfficeCall[]; answered: OfficeCall[] } {
  const asked = new Set(openDecisions.map((d) => d.n));
  const open: OfficeCall[] = [];
  const answered: OfficeCall[] = [];
  for (const c of calls) {
    if (c.decision != null && asked.has(c.decision)) continue;
    (c.reply || pendingReply(messages, c) ? answered : open).push(c);
  }
  return { open, answered };
}

/** When the office last answered a question on this call, in ms. 0 when it never has. */
export function lastAnswerAt(call: OfficeCall): number {
  let latest = 0;
  for (const a of call.asked ?? []) {
    const t = new Date(a.at).getTime();
    if (!Number.isNaN(t) && t > latest) latest = t;
  }
  return latest;
}

/** A reply that ends in a question mark is a question: the office answers it, and the call stays open. */
export function isQuestion(text: string | null | undefined): boolean {
  return /\?\s*$/.test(text ?? "");
}

/** "COO", or the employee's plain title when a roster employee found the answer. */
export function answeredBy(by: string | null | undefined): string {
  if (!by) return "COO";
  return ROLE[by] ? ROLE[by][1] : by;
}

export function replyText(call: OfficeCall, pending: OfficeMessage | null): string {
  if (call.reply) return call.reply.text;
  if (!pending) return "";
  return pending.kind === "release" ? "Released to run" : pending.body.replace(/^RE job [^:]+:\s*/, "");
}

/** "blocked 8 h ago · 3 jobs wait behind this · follows decision #10" */
export function callMeta(call: OfficeCall, now: number = Date.now()): string {
  const parts = [`${call.held ? "held" : "blocked"} ${ago(call.since, now)}`];
  if (call.unblocks) parts.push(`${call.unblocks} ${call.unblocks === 1 ? "job waits" : "jobs wait"} behind this`);
  if (call.decision != null) parts.push(`follows decision #${call.decision}`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------- marketplace

export function airspaceTone(level: string): { tone: Tone; label: string } {
  if (level === "NONE") return { tone: "good", label: "No authorization" };
  if (level === "EASY_LAANC") return { tone: "info", label: "Easy LAANC" };
  if (level === "DRONEZONE") return { tone: "warn", label: "DroneZone" };
  if (level === "SKIP") return { tone: "crit", label: "Skip" };
  return { tone: "idle", label: "Airspace unknown" };
}

export function missionStatusTone(status: MissionStatus): { tone: Tone; label: string } {
  if (status === "interested") return { tone: "info", label: "Interest sent" };
  if (status === "lost") return { tone: "idle", label: "Not assigned" };
  if (status === "possible_award") return { tone: "warn", label: "Possible award" };
  if (status === "mission_email") return { tone: "warn", label: "Mission email: review" };
  if (status === "unknown") return { tone: "warn", label: "Delivery unknown: check the app" };
  if (status === "rejected") return { tone: "idle", label: "No longer open" };
  if (status === "declined") return { tone: "idle", label: "Not for me" };
  return { tone: "hold", label: "Open" };
}

/**
 * An interest message naming this mission that the office has not refused or
 * failed. While the snapshot still lists the mission as open, such a message
 * keeps it out of Open, from the press until the desktop's own snapshot
 * reports the new status. Without that, a refresh between the office writing
 * "INTEREST SENT" and the next snapshot reopened it (Codex re-review). The
 * desktop also refuses any mission it has ever sent, so this is the second lock.
 */
export function interestPending(messages: OfficeMessage[], missionId: string): OfficeMessage | null {
  return (
    messages.find(
      (m) =>
        m.kind === "interest" &&
        m.body.split(/[\s,]+/).includes(missionId) &&
        !/^(REFUSED|FAILED)/.test(m.ledger_line ?? "")
    ) ?? null
  );
}

/**
 * Missions the office named as NOT declined in its result line. One decline
 * press can carry several missions, and the desktop answers per mission:
 *   "DECLINED 333333: marked not for me. ... NOT declined 111111: interest was
 *    already sent; withdraw it in the FlyGuys Pilots app"
 * Every id listed after "NOT declined" (up to the colon) was refused.
 */
export function notDeclinedIds(ledgerLine: string | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const m of (ledgerLine ?? "").matchAll(/NOT declined\s+([\d,\s]+)/g)) {
    for (const id of m[1].split(/[\s,]+/)) if (id) ids.add(id);
  }
  return ids;
}

/**
 * A "Not for me" message that still declines this mission: it names the
 * mission, the office did not refuse or fail the whole press, and the result
 * line does not list this mission as NOT declined. Nothing goes to FlyGuys.
 */
export function declinePending(messages: OfficeMessage[], missionId: string): OfficeMessage | null {
  return (
    messages.find(
      (m) =>
        m.kind === "decline" &&
        m.body.split(/[\s,]+/).includes(missionId) &&
        !/^(REFUSED|FAILED)/.test(m.ledger_line ?? "") &&
        !notDeclinedIds(m.ledger_line).has(missionId)
    ) ?? null
  );
}

/**
 * What a pending message does to a mission the snapshot still lists as open.
 * Interest ALWAYS wins over a decline, whatever the order of the presses: once
 * interest may have reached FlyGuys, the page must not file the mission as
 * declined (Codex 2026-10-17). A decline counts only with no interest pending.
 */
export function missionPending(messages: OfficeMessage[], missionId: string): OfficeMessage | null {
  return interestPending(messages, missionId) ?? declinePending(messages, missionId);
}

/** Groups for the page: what needs a decision, what is waiting on FlyGuys, what is closed. */
export function splitMissions(missions: OfficeMission[], messages: OfficeMessage[]) {
  const byMiles = (a: OfficeMission, b: OfficeMission) => (a.miles ?? 9999) - (b.miles ?? 9999);
  // Only an OPEN mission is held back by a pending message: once the snapshot
  // reports a status, the snapshot wins (Codex re-review).
  const pend = (m: OfficeMission) => (m.status === "open" ? missionPending(messages, m.id) : null);
  const open = missions.filter((m) => m.status === "open" && !pend(m)).sort(byMiles);
  const waiting = missions
    .filter((m) => m.status === "interested" || m.status === "unknown" || pend(m)?.kind === "interest")
    .sort(byMiles);
  const award = missions.filter((m) => m.status === "possible_award" || m.status === "mission_email").sort(byMiles);
  const lost = missions.filter((m) => m.status === "lost" || m.status === "rejected").sort(byMiles);
  const declined = missions.filter((m) => m.status === "declined" || pend(m)?.kind === "decline").sort(byMiles);
  return { open, waiting, award, lost, declined };
}

export type MissionTab = "new" | "waiting" | "attention" | "declined" | "closed";

/**
 * The marketplace table's tabs. Needs attention = anything Adam must look at in
 * the FlyGuys app: a possible award, a mission email, or a send whose delivery
 * is unknown. Waiting = interest sent and nothing back yet.
 */
export function missionTabs(missions: OfficeMission[], messages: OfficeMessage[]): Record<MissionTab, OfficeMission[]> {
  const { open, waiting, award, lost, declined } = splitMissions(missions, messages);
  return {
    new: open,
    waiting: waiting.filter((m) => m.status !== "unknown"),
    attention: [...award, ...waiting.filter((m) => m.status === "unknown")],
    declined,
    closed: lost,
  };
}

/** Clear on the airspace SCREEN (Class G or easy LAANC). A screen, not a clearance: the real KML is checked before flight. */
export function flyableNow(m: OfficeMission): boolean {
  return m.airspace_level === "NONE" || m.airspace_level === "EASY_LAANC";
}

// ---------------------------------------------------------------- inbox

export type InboxKind = "decision" | "call" | "mission" | "escalation";

export interface InboxItem {
  key: string;
  kind: InboxKind;
  title: string;
  tone: Tone;
  /** Who raised it, plain words. */
  from: string;
  /** When it started waiting. Null when the source does not say. */
  at: string | null;
  decision?: OfficeDecision;
  call?: OfficeCall;
  mission?: OfficeMission;
  escalation?: OfficeEscalation;
}

const TONE_RANK: Record<Tone, number> = { crit: 0, warn: 1, hold: 2, info: 3, good: 4, idle: 5 };

export function escalationTone(severity: string | null | undefined): Tone {
  const s = (severity ?? "").toLowerCase();
  if (s === "high" || s === "critical") return "crit";
  if (s === "medium") return "warn";
  return "idle";
}

/**
 * One queue for everything that needs Adam: open decisions, open calls,
 * missions he must check in the FlyGuys app, and escalation files. Most urgent
 * first, then oldest first, so nothing old sinks under new noise.
 */
export function buildInbox(input: {
  decisions: OfficeDecision[];
  calls: OfficeCall[];
  missions: OfficeMission[];
  escalations: OfficeEscalation[];
  outbriefDate?: string | null;
}): InboxItem[] {
  const items: InboxItem[] = [
    ...input.decisions.map((d): InboxItem => ({
      key: `decision-${d.n}`,
      kind: "decision",
      title: d.title,
      tone: d.deadline ? "crit" : "warn",
      from: "COO, Outbrief",
      at: input.outbriefDate ?? null,
      decision: d,
    })),
    ...input.calls.map((c): InboxItem => ({
      key: `call-${c.id}`,
      kind: "call",
      title: c.card?.ask || c.title,
      tone: c.unblocks > 0 ? "crit" : c.held ? "hold" : "warn",
      from: c.assignee ? roleOf(c.assignee)[1] : "COO",
      at: c.since,
      call: c,
    })),
    ...input.missions.map((m): InboxItem => ({
      key: `mission-${m.id}`,
      kind: "mission",
      title:
        m.status === "unknown"
          ? `FlyGuys ${m.id}${m.city ? `, ${m.city}` : ""}: delivery of your interest is unknown`
          : `FlyGuys ${m.id}${m.city ? `, ${m.city}` : ""}: ${missionStatusTone(m.status).label}`,
      tone: m.status === "possible_award" ? "crit" : "warn",
      from: "Marketplace",
      at: m.outcome_at ?? m.interest_at,
      mission: m,
    })),
    ...input.escalations.map((e): InboxItem => ({
      key: `escalation-${e.file}`,
      kind: "escalation",
      title: e.title,
      tone: escalationTone(e.severity),
      from: "Escalations",
      at: e.updated,
      escalation: e,
    })),
  ];
  const t = (iso: string | null) => {
    const n = iso ? new Date(iso).getTime() : NaN;
    return Number.isNaN(n) ? Infinity : n;
  };
  return items.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone] || t(a.at) - t(b.at));
}

// ---------------------------------------------------------------- office floor
//
// Presence is live: every agent checks in to office_presence when it starts a
// job, after each step and when it finishes (cron-agents/lib/presence.py, called
// by the dispatcher, the scheduler and the Claude Code subagent hook). The page
// subscribes to those rows, so a desk lights up without waiting for a snapshot.

export interface OfficePresence {
  agent: string;
  kind: "specialist" | "automation";
  state: "working" | "idle";
  source: "dispatcher" | "session" | "scheduler";
  job_id: string | null;
  title: string | null;
  step: string | null;
  machine: string | null;
  started_at: string | null;
  updated_at: string;
  finished_at: string | null;
  outcome: string | null;
}

export interface OfficePresenceEvent {
  id: number;
  at: string;
  agent: string;
  event: "start" | "step" | "done";
  job_id: string | null;
  text: string | null;
}

export type DeskState = "working" | "stale" | "recent" | "quiet" | "never";

/** A working check-in older than this reads "may have stopped": a crashed run never checks out. */
export const STALE_WORKING_MS = 3 * 3600_000;
const RECENT_MS = 6 * 3600_000;

function latest(...isos: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestT = -Infinity;
  for (const iso of isos) {
    const n = iso ? new Date(iso).getTime() : NaN;
    if (!Number.isNaN(n) && n > bestT) {
      bestT = n;
      best = iso as string;
    }
  }
  return best;
}

/**
 * Where a desk's state came from. "live": the agent's own presence row.
 * "snapshot": no presence row (none yet, or the presence read failed or never
 * loaded), so the 5-minute snapshot's team entry decides (QA 2026-10-17).
 */
export type DeskSource = "live" | "snapshot";

export function deskState(
  presence: OfficePresence | undefined,
  employee: OfficeEmployee | undefined,
  now: number = Date.now(),
  /** When the snapshot holding `employee` was pushed. Its `doing` counts only while fresh. */
  snapshotAt: string | null = null
): { state: DeskState; tone: Tone; label: string; source: DeskSource } {
  if (presence) {
    if (presence.state === "working") {
      const age = now - new Date(presence.updated_at).getTime();
      if (age <= STALE_WORKING_MS) return { state: "working", tone: "good", label: "Working now", source: "live" };
      return {
        state: "stale",
        tone: "warn",
        label: `No check-in for ${ago(presence.updated_at, now).replace(" ago", "")}, may have stopped`,
        source: "live",
      };
    }
  } else if (employee?.doing) {
    // A dispatcher job the snapshot saw in progress. Without this a desk running
    // one read "No work recorded" whenever presence had no row for it. Only a
    // FRESH snapshot counts: once the desktop stops syncing, the job may have
    // ended long ago, so it reads "may have stopped" and is not counted as
    // working (Codex 2026-10-17).
    const t = snapshotAt ? new Date(snapshotAt).getTime() : NaN;
    if (!Number.isNaN(t) && now - t <= SNAPSHOT_FRESH_MS) {
      return { state: "working", tone: "good", label: "Working (5-minute snapshot)", source: "snapshot" };
    }
    return {
      state: "stale",
      tone: "warn",
      label: Number.isNaN(t) ? "May have stopped (snapshot age unknown)" : `May have stopped (snapshot from ${ago(snapshotAt, now)})`,
      source: "snapshot",
    };
  }
  const source: DeskSource = presence ? "live" : "snapshot";
  const last = latest(presence?.finished_at, presence?.updated_at, employee?.last_done_at);
  if (!last) return { state: "never", tone: "idle", label: "No work recorded", source };
  const age = now - new Date(last).getTime();
  if (age < RECENT_MS) return { state: "recent", tone: "info", label: `Active ${ago(last, now)}`, source };
  return { state: "quiet", tone: "idle", label: `Last active ${ago(last, now)}`, source };
}

/**
 * The ids a marketplace press may send: those still in New, and for interest
 * only from a current feed. A decline sends nothing to FlyGuys, so it does not
 * need the feed. Empty = send nothing. The page's buttons are also disabled on
 * a stale feed; this is the guard that holds even if a button is not.
 */
export function missionSendIds(kind: "interest" | "decline", ids: string[], openIds: Set<string>, feedOk: boolean): string[] {
  if (kind === "interest" && !feedOk) return [];
  return ids.filter((id) => openIds.has(id));
}

/** The check-ins for the desk's current job, oldest first; without one, the desk's last 10. */
export function deskTimeline(events: OfficePresenceEvent[], agent: string, jobId: string | null | undefined): OfficePresenceEvent[] {
  const mine = events.filter((e) => e.agent === agent).sort((a, b) => a.at.localeCompare(b.at));
  if (jobId) {
    const job = mine.filter((e) => e.job_id === jobId);
    if (job.length) return job;
  }
  return mine.slice(-10);
}

/** Rooms on the floor. Desks are roster names; anyone not listed goes to "Other". */
export const DEPARTMENTS: [room: string, members: string[]][] = [
  ["Operations & engineering", ["engineering-devops-automator", "engineering-photo-processor", "testing-qa-specialist", "sai-ops", "sai-analysis-specialist"]],
  ["Business", ["bd-contracts-officer", "finance-officer", "technical-writer", "office-manager", "marketing-reviewer"]],
  ["Security & compliance", ["ciso-officer", "compliance-audit-officer"]],
  ["Content studio", ["content-manager", "content-writer", "seo-analyst", "topic-researcher", "source-validator", "video-producer", "part107-quiz-writer"]],
];

export interface FloorRoom {
  room: string;
  desks: string[];
}

/**
 * Specialist rooms from the roster plus anyone who checked in without being on
 * it, then a room for scheduled automations (presence rows of kind automation).
 * Empty rooms are dropped.
 */
export function floorRooms(teamNames: string[], presence: OfficePresence[]): FloorRoom[] {
  const automations = presence.filter((p) => p.kind === "automation").map((p) => p.agent).sort();
  const people = [...new Set([...teamNames, ...presence.filter((p) => p.kind !== "automation").map((p) => p.agent)])];
  const placed = new Set<string>();
  const rooms: FloorRoom[] = DEPARTMENTS.map(([room, members]) => {
    const desks = members.filter((m) => people.includes(m));
    desks.forEach((d) => placed.add(d));
    return { room, desks };
  });
  rooms.push({ room: "Other", desks: people.filter((p) => !placed.has(p)).sort() });
  rooms.push({ room: "Scheduled automations", desks: automations });
  return rooms.filter((r) => r.desks.length > 0);
}

/** Two-letter desk monogram: "engineering-devops-automator" -> "DA". */
export function initials(name: string): string {
  const words = name.split("-").filter((w) => !["engineering", "officer", "specialist"].includes(w));
  return (words.length ? words : name.split("-"))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export interface OfficePresenceData {
  presence: OfficePresence[];
  /** Oldest first. Last 14 days, at most 500 check-ins. */
  events: OfficePresenceEvent[];
}

/** The page keeps at most this many check-ins (14 days of them, usually far fewer). */
export const PRESENCE_LOG_LIMIT = 500;

/** Pure: fold one Realtime change into the cached presence data. */
export function applyPresenceChange(
  old: OfficePresenceData,
  table: "office_presence" | "office_presence_log",
  eventType: string,
  row: Record<string, unknown> | null | undefined,
  oldRow?: Record<string, unknown> | null
): OfficePresenceData {
  if (table === "office_presence") {
    if (eventType === "DELETE") {
      const agent = (oldRow?.agent ?? row?.agent) as string | undefined;
      return agent ? { ...old, presence: old.presence.filter((p) => p.agent !== agent) } : old;
    }
    if (!row?.agent) return old;
    const next = row as unknown as OfficePresence;
    return { ...old, presence: [...old.presence.filter((p) => p.agent !== next.agent), next] };
  }
  if (eventType !== "INSERT" || !row) return old;
  const ev = row as unknown as OfficePresenceEvent;
  if (old.events.some((e) => e.id === ev.id)) return old;
  return { ...old, events: [...old.events, ev].slice(-PRESENCE_LOG_LIMIT) };
}

