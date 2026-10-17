import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { LayoutDashboard, Radar, RefreshCw, ScrollText } from "lucide-react";
import PageShell from "@/components/admin/PageShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/PageState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useOffice, useOfficePresence, useSendOfficeMessage, type OfficeMessageInput } from "@/hooks/useOffice";
import {
  ago,
  airspaceTone,
  answeredBy,
  automationTone,
  boardColumns,
  buildInbox,
  callMeta,
  countPairs,
  deskState,
  deskTimeline,
  escalationTone,
  flyableNow,
  floorRooms,
  freshness,
  initials,
  isAccessNotGranted,
  isQuestion,
  messageLabel,
  messageStatus,
  missionStatusTone,
  missionTabs,
  pendingAnswer,
  pendingReply,
  releaseSent,
  replyBody,
  replyText,
  ROLE,
  roleOf,
  sortAutomations,
  splitCalls,
  splitDecisions,
  type DeskState,
  type InboxItem,
  type InboxKind,
  type MissionTab,
  type OfficeAnswer,
  type OfficeCall,
  type OfficeDecision,
  type OfficeEmployee,
  type OfficeEscalation,
  type OfficeJob,
  type OfficeMarketplace,
  type OfficeMessage,
  type OfficeMessageKind,
  type OfficeMission,
  type OfficePresence,
  type OfficePresenceEvent,
  type OfficeSnapshot,
  type Tone,
} from "@/lib/office";

// ---------------------------------------------------------------------------
// Office — what the agents are doing, and what needs Adam's call.
//
// Read path: one snapshot row the desktop sync pushes every 5 minutes.
// Write path: rows in office_inbox (answer, directive, release, interest, decline) that the same
// sync collects. This page never reaches the agents directly, so everything it
// shows is "as of the last report" and says how old that report is. The one
// exception is the office floor: presence rows the agents write as they work,
// followed live (useOfficePresence).
//
// Layout (2026-10-17 redesign): one view at a time, chosen in the toolbar and
// kept in ?view= so a view can be linked. Inbox merges everything that needs
// Adam into one queue with a detail pane; the rest each get their own view.
// ---------------------------------------------------------------------------

const TONE: Record<Tone, string> = {
  good: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  crit: "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400",
  info: "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-400",
  hold: "border-violet-600/30 bg-violet-600/10 text-violet-700 dark:text-violet-400",
  // Not bg-muted: in this theme muted is a dark slate, and muted-foreground on
  // it is unreadable. An idle pill is an outline.
  idle: "border-border bg-transparent text-muted-foreground",
};

const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  crit: "text-red-700 dark:text-red-400",
  info: "text-blue-700 dark:text-blue-400",
  hold: "text-violet-700 dark:text-violet-400",
  idle: "text-muted-foreground",
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  crit: "bg-red-500",
  info: "bg-blue-500",
  hold: "bg-violet-500",
  idle: "bg-muted-foreground/40",
};

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn("shrink-0 font-medium", TONE[tone])}>
      {children}
    </Badge>
  );
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Unknown error.";
}

function clock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : format(d, "MMM d, h:mm a");
}

function Section({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ value, label, tone, onClick }: { value: number; label: string; tone: Tone; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={cn("text-3xl font-bold tabular-nums", tone === "idle" ? "" : TONE_TEXT[tone])}>{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </button>
  );
}

type Send = ReturnType<typeof useSendOfficeMessage>;


// -------------------------------------------------------
// Marketplace (2026-10-17): FlyGuys missions near base, as a table. Pressing
// "I'm interested" writes an `interest` row; the desktop sync sends Adam's
// name and email to FlyGuys and writes the result back. "Not for me" writes a
// `decline` row: nothing goes to FlyGuys, the office only records it so the
// mission leaves New. Outcomes come from FlyGuys email ("Mission Not
// Assigned", or any other mail naming the mission, shown for review).
// -------------------------------------------------------

const MISSION_TABS: { key: MissionTab; label: string; empty: string }[] = [
  { key: "new", label: "New", empty: "No open missions near you that you have not already answered." },
  { key: "waiting", label: "Waiting on FlyGuys", empty: "No interest is waiting on an answer." },
  { key: "attention", label: "Needs attention", empty: "Nothing to check in the FlyGuys app." },
  { key: "declined", label: "Declined", empty: "You have not declined any mission." },
  { key: "closed", label: "Closed", empty: "No mission has closed yet." },
];

function MissionNotes({ mission }: { mission: OfficeMission }) {
  return (
    <>
      {mission.outcome_subject && (
        <p className="mt-1 whitespace-normal break-words text-xs">
          <span className="font-medium">FlyGuys: </span>
          {mission.outcome_subject}
          {mission.outcome_at ? ` (${ago(mission.outcome_at)})` : ""}
        </p>
      )}
      {mission.status === "possible_award" && (
        <p className="mt-1 whitespace-normal text-xs font-medium text-amber-700 dark:text-amber-400">
          Check the FlyGuys Pilots app and confirm within 24 hours, or it may be reassigned.
        </p>
      )}
      {mission.status === "mission_email" && (
        <p className="mt-1 whitespace-normal text-xs font-medium text-amber-700 dark:text-amber-400">
          FlyGuys emailed about this mission. Read it: if it is an assignment, confirm in the app within 24 hours.
        </p>
      )}
      {mission.status === "unknown" && (
        <p className="mt-1 whitespace-normal text-xs font-medium text-amber-700 dark:text-amber-400">
          The office cannot tell whether FlyGuys received your interest. Check the FlyGuys Pilots app. It is never resent automatically.
        </p>
      )}
      {mission.off_map && (
        <p className="mt-1 whitespace-normal text-xs text-muted-foreground">No longer on the sourcing map (assigned missions leave it).</p>
      )}
    </>
  );
}

function mapLink(m: OfficeMission): string | null {
  return m.lat && m.lng ? `https://www.google.com/maps?q=${m.lat},${m.lng}` : null;
}

function placeOf(m: OfficeMission): string {
  return [m.city, m.state].filter(Boolean).join(", ") || `Job ${m.id}`;
}

/** One mission in full, for the inbox detail pane. */
function MissionDetail({ mission }: { mission: OfficeMission }) {
  const air = airspaceTone(mission.airspace_level);
  const st = missionStatusTone(mission.status);
  const map = mapLink(mission);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={st.tone}>{st.label}</Pill>
        <Pill tone={air.tone}>{air.label}</Pill>
      </div>
      <h3 className="text-base font-semibold leading-snug">
        FlyGuys {mission.id} · {placeOf(mission)} · {mission.miles ?? "?"} mi
      </h3>
      <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Acres</dt>
        <dd>{mission.acres ?? "?"}</dd>
        <dt className="text-muted-foreground">Capture / due</dt>
        <dd>
          {mission.capture ?? "?"} / {mission.due ?? "?"}
        </dd>
        {mission.mc && (
          <>
            <dt className="text-muted-foreground">Coordinator</dt>
            <dd>{mission.mc}</dd>
          </>
        )}
        {mission.interest_at && (
          <>
            <dt className="text-muted-foreground">Interest sent</dt>
            <dd>{clock(mission.interest_at)}</dd>
          </>
        )}
      </dl>
      <MissionNotes mission={mission} />
      <p className="break-words text-xs">{mission.airspace_text}</p>
      {map && (
        <a href={map} target="_blank" rel="noreferrer" className="inline-block text-xs underline">
          Open the map
        </a>
      )}
    </div>
  );
}

function Marketplace({ market, messages, send }: { market: OfficeMarketplace; messages: OfficeMessage[]; send: Send }) {
  const [tab, setTab] = useState<MissionTab>("new");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<OfficeMessageKind | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const tabs = missionTabs(market.missions ?? [], messages);
  const open = tabs.new;
  const lastSend = messages.find((m) => m.kind === "interest");
  const feedOk = market.status === "ok";
  // Only missions still in New can be sent: a refresh that moved a selected
  // mission to Waiting (interest already sent) must not send it again.
  const openIds = new Set(open.map((m) => m.id));
  const live = picked.filter((id) => openIds.has(id));
  const rows = tabs[tab];
  const isNew = tab === "new";

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  // mutateAsync, not mutate with per-call callbacks: the page shares one
  // mutation with answers and releases, and a second send replaces the first
  // call's callbacks, which left this button stuck on "Sending" (Codex 2026-10-17).
  const sendMissions = async (kind: "interest" | "decline", ids: string[]) => {
    const go = ids.filter((id) => openIds.has(id));
    // A decline sends nothing to FlyGuys, so only interest needs a current feed.
    if (!go.length || busy || (kind === "interest" && !feedOk)) return;
    setBusy(kind);
    setFailed(null);
    try {
      await send.mutateAsync({ kind, body: go.join(",") });
      setPicked((p) => p.filter((id) => !go.includes(id)));
    } catch (error) {
      setFailed(`Not sent. ${errorText(error)}`);
    } finally {
      setBusy(null);
    }
  };
  const pickFlyable = () =>
    setPicked((p) => [...new Set([...p.filter((id) => openIds.has(id)), ...open.filter(flyableNow).map((m) => m.id)])]);

  const meta = [
    market.source ?? "FlyGuys",
    market.pulled_at ? `pulled ${ago(market.pulled_at)}` : null,
    market.total_open != null ? `${market.total_open} open nationwide` : null,
    feedOk ? `${(market.missions ?? []).length} near you` : "missions unknown",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section title="Marketplace jobs" meta={meta}>
      {market.status !== "ok" && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 text-sm">
          {market.status}. This is not "no missions": the desktop could not read the mission feed.
        </p>
      )}
      {market.outcomes_status && market.outcomes_status !== "ok" && market.outcomes_status !== "never" && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 text-sm">
          FlyGuys email check: {market.outcomes_status}. Award and Not Assigned updates are unknown until it clears.
        </p>
      )}

      <Card>
        <div className="flex flex-wrap gap-1 border-b p-2" role="tablist" aria-label="Mission lists">
          {MISSION_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                t.key === "attention" && tabs.attention.length > 0 && tab !== t.key && "text-amber-700 dark:text-amber-400"
              )}
            >
              {t.label} <span className="font-mono tabular-nums">{tabs[t.key].length}</span>
            </button>
          ))}
        </div>

        {isNew && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-2">
            <p className="mr-auto text-xs text-muted-foreground">
              {live.length} selected · {open.filter(flyableNow).length} of {open.length} clear on the airspace screen
            </p>
            <Button size="sm" variant="ghost" onClick={pickFlyable} disabled={!feedOk || !open.some(flyableNow)}>
              Select airspace-clear
            </Button>
            {live.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
                Clear
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => sendMissions("decline", live)} disabled={!live.length || !!busy}>
              {busy === "decline" ? "Saving" : `Not for me${live.length ? ` (${live.length})` : ""}`}
            </Button>
            <Button size="sm" onClick={() => sendMissions("interest", live)} disabled={!feedOk || !live.length || !!busy}>
              {busy === "interest" ? "Sending" : `I'm interested${live.length ? ` (${live.length})` : ""}`}
            </Button>
          </div>
        )}
        {failed && (
          <p role="alert" className="border-b p-2 text-xs text-destructive">
            {failed}
          </p>
        )}

        {rows.length === 0 ? (
          isNew && !feedOk ? null : (
            <p className="p-6 text-center text-sm text-muted-foreground">{MISSION_TABS.find((t) => t.key === tab)?.empty}</p>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {isNew && <th className="w-8 p-2" aria-label="Select" />}
                  <th className="p-2 font-medium">Mission</th>
                  <th className="p-2 text-right font-medium">Mi</th>
                  <th className="p-2 text-right font-medium">Acres</th>
                  <th className="p-2 font-medium">Airspace</th>
                  <th className="p-2 font-medium">Capture / due</th>
                  <th className="p-2 font-medium">FlyGuys review</th>
                  <th className="p-2 font-medium">{isNew ? "" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const air = airspaceTone(m.airspace_level);
                  const st = missionStatusTone(m.status);
                  const map = mapLink(m);
                  const selected = picked.includes(m.id);
                  return (
                    <tr key={m.id} className={cn("border-b align-top last:border-0", selected && "bg-primary/5")}>
                      {isNew && (
                        <td className="p-2">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={selected}
                            onChange={() => toggle(m.id)}
                            aria-label={`Select mission ${m.id}`}
                          />
                        </td>
                      )}
                      <td className="min-w-[12rem] p-2">
                        <p className="font-medium">{placeOf(m)}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{m.id}</span>
                          {m.address || m.zip ? ` · ${[m.address, m.zip].filter(Boolean).join(" ")}` : ""}
                          {m.mc ? ` · ${m.mc}` : ""}
                          {m.mission_status ? ` · ${m.mission_status}` : ""}
                        </p>
                        {map && (
                          <a href={map} target="_blank" rel="noreferrer" className="text-xs underline">
                            Map
                          </a>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono tabular-nums">{m.miles ?? "?"}</td>
                      <td className="p-2 text-right font-mono tabular-nums">{m.acres ?? "?"}</td>
                      <td className="min-w-[9rem] p-2">
                        <Pill tone={air.tone}>{air.label}</Pill>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.flyguys_airspace ? `FlyGuys: ${m.flyguys_airspace}` : ""}
                          {m.airspace_checked_at ? `${m.flyguys_airspace ? " · " : ""}screened ${ago(m.airspace_checked_at)}` : ""}
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-2 font-mono text-xs">
                        {m.capture ?? "?"}
                        <br />
                        {m.due ?? "?"}
                      </td>
                      <td className="min-w-[8rem] p-2 text-xs">
                        {m.deviation && m.deviation !== "None" ? m.deviation : "None"}
                        {m.deviation_detail ? <span className="block text-muted-foreground">{m.deviation_detail}</span> : null}
                      </td>
                      <td className="min-w-[10rem] p-2">
                        {isNew ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={!feedOk || !!busy}
                              onClick={() => sendMissions("interest", [m.id])}
                              aria-label={`I'm interested in mission ${m.id}`}
                            >
                              Interested
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              disabled={!!busy}
                              onClick={() => sendMissions("decline", [m.id])}
                              aria-label={`Not for me: mission ${m.id}`}
                            >
                              Not for me
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Pill tone={st.tone}>{st.label}</Pill>
                            <MissionNotes mission={m} />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        I'm interested sends your name, email and the SAI note to FlyGuys; the office sends it within 5 minutes.
        {lastSend ? ` Last send: ${lastSend.ledger_line ?? "waiting for the office to collect it"}.` : ""} Not for me
        sends nothing to FlyGuys.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Authorization is an FAA-data SCREEN at the capture altitude on a generous circle around the site, not a clearance: check the real KML before flight.
        Temporary flight restrictions are not included: check B4UFLY on the day.
      </p>
    </Section>
  );
}

// -------------------------------------------------------
// One open decision: Yes, No, or Adam's own words.
// -------------------------------------------------------
function OpenDecision({ decision, date, send }: { decision: OfficeDecision; date: string | null; send: Send }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const isNew = decision.tag.toUpperCase().startsWith("NEW");

  const answer = (text: string) => {
    setBusy(true);
    setFailed(null);
    send.mutate(
      { kind: "answer", body: text, digestDate: date, item: decision.n },
      {
        // On success the decision leaves the open list, so this component
        // unmounts and there is no state left to reset.
        onError: (error) => {
          setBusy(false);
          setFailed(`Not sent. ${errorText(error)} Check "Sent to the office" before trying again.`);
        },
      }
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 font-mono text-sm font-semibold text-muted-foreground">#{decision.n}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug">{decision.title}</h3>
            <Pill tone={isNew ? "info" : "warn"}>{isNew ? "New" : "Waiting"}</Pill>
          </div>
          {decision.recommendation && (
            <p className="mt-2 text-sm">
              <span className="font-medium">COO recommends: </span>
              {decision.recommendation}
            </p>
          )}
          {decision.deadline && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium">Deadline: </span>
              {decision.deadline}
            </p>
          )}
          {decision.tag && !isNew && <p className="mt-1 font-mono text-xs text-muted-foreground">{decision.tag}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy} onClick={() => answer("yes")}>
              Yes
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => answer("no")}>
              No
            </Button>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={600}
              placeholder="Or answer in your own words"
              aria-label={`Your answer to decision ${decision.n}`}
              className="h-9 min-w-[12rem] flex-1"
              disabled={busy}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !note.trim()}
              onClick={() => answer(note.trim())}
            >
              Send
            </Button>
          </div>
          {busy && <p className="mt-2 text-xs text-muted-foreground">Sending</p>}
          {failed && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {failed}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ClosedDecision({ decision, pending }: { decision: OfficeDecision; pending: OfficeMessage | null }) {
  return (
    <div className="rounded-lg border bg-foreground/5 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground">#{decision.n}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-snug">{decision.title}</h3>
          <p className="mt-1 text-sm">
            <span className="font-medium">You answered: </span>
            {decision.answer || pending?.body}
          </p>
          {!decision.answer && pending && (
            <p className="mt-1 text-xs text-muted-foreground">{messageStatus(pending).text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// A question Adam asked and the office's answer. Added 2026-10-04: before
// this a question got no answer and the call read as answered.
// -------------------------------------------------------
function AnswerList({ answers }: { answers: OfficeAnswer[] }) {
  return (
    <ul className={cn("space-y-3 rounded-md border p-3", TONE.info)}>
      {answers.map((qa) => (
        <li key={qa.at} className="text-sm text-foreground">
          <p className="break-words">
            <span className="font-medium">You asked: </span>
            {qa.q}
          </p>
          <p className="mt-1 break-words">
            <span className="font-medium">{answeredBy(qa.by)} answered: </span>
            {qa.a}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{ago(qa.at)}</p>
        </li>
      ))}
    </ul>
  );
}

// -------------------------------------------------------
// One matter blocked on Adam, live from the queue. Added 2026-10-03: before
// this, a job that blocked after the morning Outbrief showed only on the board.
// His reply goes to the planner as a directive that names the job.
// -------------------------------------------------------
function OpenCall({ call, send }: { call: OfficeCall; send: Send }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const who = call.assignee ? roleOf(call.assignee)[1] : "COO";

  const post = (input: OfficeMessageInput) => {
    setBusy(true);
    setFailed(null);
    send.mutate(input, {
      // On success the call moves to Answered, so this component unmounts and
      // there is no state left to reset.
      onError: (error) => {
        setBusy(false);
        setFailed(`Not sent. ${errorText(error)} Check "Sent to the office" before trying again.`);
      },
    });
  };
  const reply = (text: string) => post({ kind: "directive", body: replyBody(call.id, text) });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug">{call.title}</h3>
        <Pill tone={call.held ? "hold" : "warn"}>{call.held ? "Held" : "Blocked"}</Pill>
      </div>
      {call.needs && (
        <p className="mt-2 break-words text-sm">
          <span className="font-medium">{call.held ? "Held: " : "Needs: "}</span>
          {call.needs}
        </p>
      )}
      {call.sheet && <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Sheet: {call.sheet}</p>}
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {who} · {callMeta(call)}
      </p>
      {call.earlier.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Earlier asks in this matter ({call.earlier.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {call.earlier.map((e) => (
              <li key={e.id} className="break-words text-xs">
                <span className="font-medium">{e.title}: </span>
                {e.needs || "no detail recorded"}
              </li>
            ))}
          </ul>
        </details>
      )}
      {(call.asked ?? []).length > 0 && (
        <div className="mt-3">
          <AnswerList answers={call.asked ?? []} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {call.held ? (
          <Button size="sm" disabled={busy} onClick={() => post({ kind: "release", body: call.id })}>
            Release this job
          </Button>
        ) : (
          <>
            <Button size="sm" disabled={busy} onClick={() => reply("done")}>
              Mark as done
            </Button>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={600}
              placeholder="Or type your answer, or a question"
              aria-label={`Your reply on ${call.title}`}
              className="h-9 min-w-[12rem] flex-1"
              disabled={busy}
            />
            <Button size="sm" variant="outline" disabled={busy || !note.trim()} onClick={() => reply(note)}>
              Send reply
            </Button>
          </>
        )}
      </div>
      {busy && <p className="mt-2 text-xs text-muted-foreground">Sending</p>}
      {failed && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {failed}
        </p>
      )}
    </div>
  );
}

function AnsweredCall({ call, pending }: { call: OfficeCall; pending: OfficeMessage | null }) {
  const received = Boolean(call.reply || pending?.picked_up_at);
  const text = replyText(call, pending);
  // A question is not a reply: the office answers it and this call comes back open.
  const asking = !call.held && isQuestion(text);
  return (
    <div className="rounded-lg border bg-foreground/5 p-3">
      <h3 className="text-sm font-medium leading-snug">{call.title}</h3>
      <p className="mt-1 break-words text-sm">
        <span className="font-medium">{asking ? "You asked: " : "You replied: "}</span>
        {text}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {!received
          ? "Sent. The office collects it within 5 minutes."
          : asking
            ? "Received. The COO answers from the job's record, usually within a few minutes. This call comes back with the answer."
            : "Received by the office. It plans the next step right away."}
      </p>
    </div>
  );
}

// -------------------------------------------------------
// Tell the COO: a directive, plus everything sent so far.
// -------------------------------------------------------
function TellTheCoo({ messages, answers, send }: { messages: OfficeMessage[]; answers: OfficeAnswer[]; send: Send }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setFailed(null);
    send.mutate(
      { kind: "directive", body },
      {
        onSuccess: () => {
          setText("");
          setBusy(false);
        },
        onError: (error) => {
          setBusy(false);
          setFailed(`Not sent. ${errorText(error)}`);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tell the COO</CardTitle>
        <p className="text-sm text-muted-foreground">
          Say what you want done, or ask a question. The COO turns work into a job for the right employee, and answers
          a question here.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={3000}
            rows={4}
            placeholder="Example: find out why LinkedIn has not posted since September 18 and fix it."
            aria-label="Message to the COO"
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy || !text.trim()}>
              {busy ? "Sending" : "Send to the COO"}
            </Button>
            <p className="text-xs text-muted-foreground">Collected within 5 minutes, then planned and started right away.</p>
          </div>
          {failed && (
            <p role="alert" className="text-xs text-destructive">
              {failed}
            </p>
          )}
        </form>

        {answers.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-sm font-semibold">Answers from the office</h3>
            <AnswerList answers={answers} />
          </>
        )}

        <h3 className="mb-2 mt-6 text-sm font-semibold">Sent to the office</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-3">
            {messages.slice(0, 8).map((m) => {
              const status = messageStatus(m);
              return (
                <li key={m.id} className="border-l-2 border-border pl-3">
                  <p className="font-mono text-xs text-muted-foreground">
                    {messageLabel(m)} · {clock(m.created_at)}
                  </p>
                  <p className="break-words text-sm">{m.body}</p>
                  <p className={cn("text-xs", TONE_TEXT[status.tone])}>{status.text}</p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------
// One job on the board. Held jobs carry the Release button.
// -------------------------------------------------------
function JobCard({ job, messages, send }: { job: OfficeJob; messages: OfficeMessage[]; send: Send }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const sent = releaseSent(messages, job.id);
  const who = job.assignee ? roleOf(job.assignee)[1] : "COO";

  const release = () => {
    setBusy(true);
    setFailed(null);
    send.mutate(
      { kind: "release", body: job.id },
      {
        onSuccess: () => setBusy(false),
        onError: (error) => {
          setBusy(false);
          setFailed(`Not sent. ${errorText(error)}`);
        },
      }
    );
  };

  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-sm font-medium leading-snug">{job.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {who}
        {job.deadline && !job.deadline.startsWith("9999") ? ` · due ${job.deadline}` : ""} · {ago(job.updated)}
      </p>
      {job.status === "blocked" && job.detail && (
        <p className="mt-2 break-words text-xs">
          <span className="font-medium">Needs: </span>
          {job.detail}
        </p>
      )}
      {job.status === "held" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={sent || busy} onClick={release}>
            {sent ? "Release sent" : busy ? "Sending" : "Release to run"}
          </Button>
          {failed && (
            <span role="alert" className="text-xs text-destructive">
              {failed}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, detail }: { value: ReactNode; label: string; detail?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}


// -------------------------------------------------------
// The office floor (2026-10-17): one desk per employee, grouped by room, with
// live presence. A desk shows "Working now" from the agent's own check-in, not
// from the 5-minute snapshot, and the desk panel shows the job's step log.
// -------------------------------------------------------

const RING: Record<Tone, string> = {
  good: "ring-emerald-500",
  warn: "ring-amber-500",
  crit: "ring-red-500",
  info: "ring-blue-500",
  hold: "ring-violet-500",
  idle: "ring-border",
};

function deskName(name: string): string {
  return ROLE[name] ? ROLE[name][1] : name.replace(/-/g, " ");
}

function Avatar({ name, tone, working, big }: { name: string; tone: Tone; working: boolean; big?: boolean }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center", big ? "h-12 w-12" : "h-10 w-10")} aria-hidden="true">
      {working && <span className="absolute inset-0 rounded-full bg-emerald-500/40 motion-safe:animate-ping" />}
      <span
        className={cn(
          "relative grid h-full w-full place-items-center rounded-full bg-muted font-semibold text-foreground ring-2 ring-offset-2 ring-offset-background",
          big ? "text-base" : "text-sm",
          RING[tone]
        )}
      >
        {initials(name)}
      </span>
    </span>
  );
}

interface DeskInfo {
  name: string;
  presence?: OfficePresence;
  employee?: OfficeEmployee;
  state: ReturnType<typeof deskState>;
}

function Desk({ desk, selected, onSelect }: { desk: DeskInfo; selected: boolean; onSelect: () => void }) {
  const { presence: p, employee: e, state } = desk;
  const working = state.state === "working" || state.state === "stale";
  const now = working ? p?.title : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${deskName(desk.name)}: ${state.label}`}
      className={cn(
        "flex min-w-0 gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary ring-1 ring-primary",
        state.state === "never" && "border-dashed bg-transparent",
        state.state === "working" && "border-emerald-600/40"
      )}
    >
      <Avatar name={desk.name} tone={state.tone} working={state.state === "working"} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold capitalize">{deskName(desk.name)}</span>
        <span className={cn("block text-xs font-medium", TONE_TEXT[state.tone])}>{state.label}</span>
        <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
          {now ?? (e?.last_done ? `Last: ${e.last_done}` : p?.title ? `Last: ${p.title}` : "Nothing yet")}
        </span>
        {working && p?.step && (
          <span className="mt-1 line-clamp-2 block rounded bg-emerald-600/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
            {p.step}
          </span>
        )}
        {e && (
          <span className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span>{e.queued} queued</span>
            {e.blocked > 0 && <span className="font-medium text-red-700 dark:text-red-400">{e.blocked} blocked</span>}
            {e.held > 0 && <span>{e.held} held</span>}
            <span>{e.done_7d} done this week</span>
          </span>
        )}
      </span>
    </button>
  );
}

function DeskPanel({ desk, events, onClose }: { desk: DeskInfo; events: OfficePresenceEvent[]; onClose: () => void }) {
  const { presence: p, employee: e, state } = desk;
  const working = state.state === "working" || state.state === "stale";
  const timeline = deskTimeline(events, desk.name, p?.job_id);
  return (
    <Card className="lg:sticky lg:top-4">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={desk.name} tone={state.tone} working={state.state === "working"} big />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold capitalize">{deskName(desk.name)}</h3>
            <p className={cn("text-xs font-medium", TONE_TEXT[state.tone])}>{state.label}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close desk">
            Close
          </Button>
        </div>
        {e?.does && <p className="text-sm text-muted-foreground">{e.does}</p>}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {working ? "On the desk now" : "Last job"}
          </p>
          {p?.title ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[
                  p.source === "session" ? "called from a chat session" : p.source === "scheduler" ? "scheduled run" : "COO dispatcher",
                  p.machine,
                  p.started_at ? `started ${ago(p.started_at)}` : null,
                  !working && p.finished_at ? `finished ${ago(p.finished_at)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {working && p.step && <p className="mt-2 text-xs">{p.step}</p>}
              {!working && p.outcome && <p className="mt-2 break-words text-xs">Outcome: {p.outcome}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {e?.last_done ? `Last finished ${e.last_done}, ${ago(e.last_done_at)}.` : "No check-in on record yet."}
            </p>
          )}
        </div>

        {timeline.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-ins</p>
            <ol className="space-y-0">
              {timeline.map((ev) => (
                <li key={ev.id} className="relative grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 border-l-2 pb-3 pl-3 text-sm">
                  <span
                    className={cn(
                      "absolute -left-[5px] top-1.5 h-2 w-2 rounded-full",
                      ev.event === "done" ? "bg-muted-foreground" : "bg-emerald-500"
                    )}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{clock(ev.at).replace(/^\w+ \d+, /, "")}</span>
                  <span className="break-words">
                    <span className="font-medium">{ev.event === "start" ? "Started" : ev.event === "done" ? "Finished" : "Step"}</span>
                    {ev.text ? `: ${ev.text}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {e && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              [e.queued, "queued"],
              [e.held, "held"],
              [e.blocked, "blocked"],
              [e.done_7d, "done 7d"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-md bg-muted/40 p-2">
                <p className="font-mono text-lg tabular-nums">{v}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        )}
        {e && <p className="font-mono text-xs text-muted-foreground">{e.lessons} notebook lessons</p>}
      </CardContent>
    </Card>
  );
}

function Floor({
  team,
  dispatcher,
}: {
  team: OfficeEmployee[];
  dispatcher: OfficeSnapshot["dispatcher"];
}) {
  const presenceQuery = useOfficePresence();
  const [selected, setSelected] = useState<string | null>(null);
  const presence = presenceQuery.data?.presence ?? [];
  const events = presenceQuery.data?.events ?? [];
  const byAgent = new Map(presence.map((p) => [p.agent, p]));
  const byName = new Map(team.map((t) => [t.name, t]));
  const info = (name: string): DeskInfo => {
    const p = byAgent.get(name);
    const e = byName.get(name);
    return { name, presence: p, employee: e, state: deskState(p, e) };
  };
  const rooms = floorRooms(team.map((t) => t.name), presence);
  const all = rooms.flatMap((r) => r.desks.map(info));
  const count = (s: DeskState) => all.filter((d) => d.state.state === s).length;
  const current = selected ? info(selected) : null;

  return (
    <Section
      title="The office floor"
      meta={`${all.length} desks · ${count("working")} working now · ${count("recent")} active today · ${count("never")} never used`}
    >
      {presenceQuery.error && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 text-sm">
          Live presence is unavailable ({errorText(presenceQuery.error)}). Desks show the last snapshot only.
        </p>
      )}
      <div className={cn("grid items-start gap-4", current && "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]")}>
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-semibold text-muted-foreground">COO</p>
                <h3 className="text-sm font-semibold">Chief operating officer · dispatcher</h3>
              </div>
              <Pill tone={dispatcher?.running ? "info" : "idle"}>{dispatcher?.running ? "Running a pass" : "Standby"}</Pill>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-medium">Last pass: </span>
              {dispatcher?.last_pass_at
                ? `${dispatcher.last_pass_at} on ${dispatcher.last_pass_day}. ${dispatcher.last_outcome}`
                : "none recorded today"}
            </p>
            {!!dispatcher?.paused?.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Paused by kill switch: </span>
                {dispatcher.paused.join(", ")}
              </p>
            )}
          </div>
          {rooms.map((r) => (
            <section key={r.room} aria-label={r.room} className="rounded-xl border bg-muted/20 p-3">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.room}</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {r.desks.map((name) => (
                  <Desk
                    key={name}
                    desk={info(name)}
                    selected={selected === name}
                    onSelect={() => setSelected((s) => (s === name ? null : name))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        {current && <DeskPanel desk={current} events={events} onClose={() => setSelected(null)} />}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Desks update live as agents check in: COO dispatcher jobs, specialists called from a chat session, and scheduled
        automations. A desk that stops checking in for 3 hours is shown as possibly stopped.
      </p>
    </Section>
  );
}

// -------------------------------------------------------
// Inbox: one queue for everything that needs Adam.
// -------------------------------------------------------

const INBOX_FILTERS: { key: InboxKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "decision", label: "Decisions" },
  { key: "call", label: "Calls" },
  { key: "mission", label: "Marketplace" },
  { key: "escalation", label: "Escalations" },
];

const KIND_LABEL: Record<InboxKind, string> = {
  decision: "Decision",
  call: "Call",
  mission: "Marketplace",
  escalation: "Escalation",
};

function EscalationDetail({ escalation }: { escalation: OfficeEscalation }) {
  const tone = escalationTone(escalation.severity);
  return (
    <div className="space-y-3">
      <Pill tone={tone}>{escalation.severity || "low"}</Pill>
      <h3 className="text-base font-semibold leading-snug">{escalation.title}</h3>
      <p className="break-all font-mono text-xs text-muted-foreground">agent-office/escalations/{escalation.file}</p>
      <p className="text-sm text-muted-foreground">
        Raised {ago(escalation.updated)}. Escalations are read-only here: to act on one, tell the COO below.
      </p>
    </div>
  );
}

function Inbox({
  items,
  date,
  messages,
  send,
  answered,
  answers,
  emptyText,
}: {
  answers: OfficeAnswer[];
  items: InboxItem[];
  date: string | null;
  messages: OfficeMessage[];
  send: Send;
  answered: ReactNode;
  emptyText: string;
}) {
  const [filter, setFilter] = useState<InboxKind | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const list = items.filter((i) => (filter === "all" || i.kind === filter) && (!q || i.title.toLowerCase().includes(q)));
  const current = list.find((i) => i.key === selected) ?? list[0] ?? null;
  const count = (k: InboxKind | "all") => (k === "all" ? items.length : items.filter((i) => i.kind === k).length);

  return (
    <Section title="Inbox" meta={`${items.length} items need you · most urgent first, oldest first within each`}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter the inbox">
              {INBOX_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    filter === f.key ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label} {count(f.key)}
                </button>
              ))}
            </div>
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search the inbox"
              className="h-8 w-full sm:ml-auto sm:w-40"
            />
          </div>
          {list.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{items.length ? "Nothing matches." : emptyText}</p>
          ) : (
            <ul className="max-h-[36rem] divide-y overflow-y-auto" aria-label="Items that need you">
              {list.map((i) => (
                <li key={i.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(i.key)}
                    aria-current={current?.key === i.key}
                    className={cn(
                      "grid w-full grid-cols-[4px_minmax(0,1fr)_auto] gap-3 p-3 text-left hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      current?.key === i.key && "bg-accent/60"
                    )}
                  >
                    <span className={cn("rounded-full", TONE_DOT[i.tone])} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-medium leading-snug">{i.title}</span>
                      <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span className={TONE_TEXT[i.tone]}>{KIND_LABEL[i.kind]}</span>
                        <span>{i.from}</span>
                        {i.call?.unblocks ? <span>unblocks {i.call.unblocks}</span> : null}
                      </span>
                    </span>
                    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {i.at ? ago(i.at).replace(" ago", "") : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="min-w-0" aria-label="Selected item">
          {!current ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : current.decision ? (
            <OpenDecision key={current.key} decision={current.decision} date={date} send={send} />
          ) : current.call ? (
            <OpenCall key={current.key} call={current.call} send={send} />
          ) : (
            <Card>
              <CardContent className="p-4">
                {current.mission ? <MissionDetail mission={current.mission} /> : current.escalation ? <EscalationDetail escalation={current.escalation} /> : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {answered}
      <div className="mt-6">
        <TellTheCoo messages={messages} answers={answers} send={send} />
      </div>
    </Section>
  );
}

// -------------------------------------------------------
// Main page
// -------------------------------------------------------

type View = "inbox" | "marketplace" | "floor" | "board" | "business" | "health";
const VIEWS: { key: View; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "marketplace", label: "Marketplace" },
  { key: "floor", label: "Office floor" },
  { key: "board", label: "Work board" },
  { key: "business", label: "Business" },
  { key: "health", label: "Health" },
];

export default function Office() {
  const { data, error, isLoading, isFetching, refetch } = useOffice();
  const send = useSendOfficeMessage();
  const [params, setParams] = useSearchParams();
  const view: View = VIEWS.some((v) => v.key === params.get("view")) ? (params.get("view") as View) : "inbox";
  const go = (v: View) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v === "inbox") n.delete("view");
        else n.set("view", v);
        return n;
      },
      { replace: true }
    );

  // Re-render every 30s so "3 min ago" and the live/stale indicator keep
  // moving between polls. The value itself is never read.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const fresh = freshness(data?.updatedAt ?? null);
  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      {data && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[fresh.tone])} aria-hidden="true" />
          {fresh.text}
        </span>
      )}
      <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
        <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        Refresh
      </Button>
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/admin/reports/office">
          <ScrollText className="h-4 w-4" />
          Meeting minutes
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/admin">
          <LayoutDashboard className="h-4 w-4" />
          Mission Control
        </Link>
      </Button>
    </div>
  );

  const shell = (children: ReactNode, toolbar?: ReactNode) => (
    <PageShell
      title="Office"
      description="What the agents are doing, and what needs your call."
      icon={Radar}
      width="wide"
      actions={actions}
      toolbar={toolbar}
    >
      {children}
    </PageShell>
  );

  if (isLoading) return shell(<LoadingState variant="stats" rows={4} label="Loading the office" />);

  // Only a FIRST load that fails takes over the page. If a later refresh fails
  // (phone lost signal), the last good status stays up with a notice, and the
  // freshness indicator already says how old it is.
  if (error && !data) {
    return shell(
      isAccessNotGranted(error) ? (
        <EmptyState
          icon={Radar}
          title="Office access is not turned on yet"
          description="The database rule that lets an admin read the office has not been applied. Nothing is wrong with your login. Until it is applied, the office is still reachable from the Sentinel Office page in Claude."
          action={
            <Button asChild variant="outline">
              <Link to="/admin">Go to Mission Control</Link>
            </Button>
          }
        />
      ) : (
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load the office" />
      )
    );
  }

  const snapshot = data?.snapshot ?? null;
  const messages = data?.messages ?? [];

  if (!snapshot) {
    return shell(
      <EmptyState
        icon={Radar}
        title="The office has not reported yet"
        description="The desktop sync pushes a status every 5 minutes. If this stays empty, the desktop is off or the sync task is paused."
      />
    );
  }

  const outbrief = snapshot.outbrief;
  const decisions = outbrief?.decisions ?? [];
  const { open, closed } = splitDecisions(decisions, outbrief?.date, messages);
  // `earlier` is filled in here so a snapshot from an older sync cannot break the page.
  const calls = (snapshot.calls ?? []).map((c) => ({ ...c, earlier: c.earlier ?? [] }));
  const { open: openCalls, answered: answeredCalls } = splitCalls(calls, open, messages);
  const waitingOnYou = open.length + openCalls.length;
  const team = snapshot.team ?? [];
  const jobs = snapshot.jobs ?? [];
  const columns = boardColumns(jobs);
  const waiting = columns.find((c) => c.key === "waiting")?.jobs.length ?? 0;
  const doing = columns.find((c) => c.key === "doing")?.jobs.length ?? 0;
  const dispatcher = snapshot.dispatcher;
  const automations = sortAutomations(snapshot.automations?.results ?? []);
  const failing = automations.filter((a) => a.level === "RED").length;
  const warning = automations.filter((a) => a.level === "WARN").length;
  const crm = snapshot.crm;
  const stuck = outbrief?.stuck ?? [];
  const activity = snapshot.activity ?? [];
  const quoteTotal = Object.values(crm?.quotes?.by_status ?? {}).reduce((n, v) => n + v, 0);
  const market = snapshot.marketplace;
  const marketTabs = market ? missionTabs(market.missions ?? [], messages) : null;
  const inbox = buildInbox({
    decisions: open,
    calls: openCalls,
    missions: marketTabs?.attention ?? [],
    escalations: snapshot.escalations ?? [],
    outbriefDate: outbrief?.date ?? null,
  });
  const emptyText = decisions.length
    ? `Nothing is waiting on your call. All ${decisions.length} decisions in the Outbrief of ${outbrief?.date} are answered.`
    : `The Outbrief of ${outbrief?.date ?? "today"} had no decisions for you.`;

  const badge: Partial<Record<View, number>> = {
    inbox: inbox.length,
    marketplace: marketTabs?.new.length,
    board: waiting,
    health: failing,
  };
  const toolbar = (
    <div className="-mx-1 overflow-x-auto px-1" >
      <div className="flex w-max gap-1 rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Office views">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => go(v.key)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === v.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v.label}
            {badge[v.key] ? (
              <span
                className={cn(
                  "rounded-full px-1.5 font-mono text-xs tabular-nums",
                  v.key === "health" ? "bg-red-600/15 text-red-700 dark:text-red-400" : "bg-foreground/10"
                )}
              >
                {badge[v.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );

  const answered =
    closed.length + answeredCalls.length > 0 ? (
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          Answered ({closed.length + answeredCalls.length})
        </summary>
        <div className="mt-3 space-y-2">
          {answeredCalls.map((c) => (
            <AnsweredCall key={c.id} call={c} pending={pendingReply(messages, c)} />
          ))}
          {closed.map((d) => (
            <ClosedDecision key={d.n} decision={d} pending={pendingAnswer(messages, outbrief?.date, d.n)} />
          ))}
        </div>
      </details>
    ) : null;

  return shell(
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Could not refresh just now ({errorText(error)}). Showing the last status that loaded.
        </p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile value={waitingOnYou} label={waitingOnYou === 1 ? "call waiting on you" : "calls waiting on you"} tone={waitingOnYou ? "warn" : "good"} onClick={() => go("inbox")} />
        <Tile value={waiting} label={waiting === 1 ? "job held or blocked" : "jobs held or blocked"} tone={waiting ? "warn" : "good"} onClick={() => go("board")} />
        <Tile value={doing} label={doing === 1 ? "job in progress" : dispatcher?.running && !doing ? "dispatcher is starting a pass" : "jobs in progress"} tone={doing ? "info" : "idle"} onClick={() => go("floor")} />
        <Tile value={failing} label={`automations failing${warning ? `, ${warning} warning` : ""}`} tone={failing ? "crit" : warning ? "warn" : "good"} onClick={() => go("health")} />
      </div>

      {view === "inbox" && (
        <>
          <Inbox
            items={inbox}
            date={outbrief?.date ?? null}
            messages={messages}
            send={send}
            answered={answered}
            answers={snapshot.answers ?? []}
            emptyText={emptyText}
          />
        </>
      )}

      {view === "marketplace" &&
        (market ? (
          <Marketplace market={market} messages={messages} send={send} />
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            The office has not reported marketplace missions yet.
          </p>
        ))}

      {view === "floor" && <Floor team={team} dispatcher={dispatcher} />}

      {view === "board" && (
        <Section title="The board" meta={`${jobs.length} jobs`}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((col) => (
              <div key={col.key} className="rounded-lg border bg-foreground/5 p-3">
                <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
                  {col.label}
                  <Badge variant="secondary">{col.jobs.length}</Badge>
                </h3>
                {col.jobs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">{col.empty}</p>
                ) : (
                  <div className="space-y-2">
                    {col.jobs.slice(0, 14).map((j) => (
                      <JobCard key={j.id} job={j} messages={messages} send={send} />
                    ))}
                    {col.jobs.length > 14 && <p className="text-xs text-muted-foreground">and {col.jobs.length - 14} more</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {view === "business" && (
        <Section title="The business" meta={crm?.generated_at ? `CRM snapshot from ${ago(crm.generated_at)}` : undefined}>
          {!crm?.jobs ? (
            <p className="text-sm text-muted-foreground">No CRM snapshot yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                value={`$${Number(crm.billing?.payments_total ?? 0).toLocaleString()}`}
                label="Payments recorded"
                detail={crm.billing?.payments_pending ? `${crm.billing.payments_pending} pending` : "none pending"}
              />
              <Stat value={crm.billing?.delivered_unbilled ?? 0} label="Delivered, not billed" detail="jobs delivered with no payment on record" />
              <Stat
                value={crm.jobs.total ?? 0}
                label="Drone jobs"
                detail={[countPairs(crm.jobs.by_status), crm.jobs.archived ? `${crm.jobs.archived} archived` : ""].filter(Boolean).join(" · ")}
              />
              <Stat value={crm.jobs.stale_scheduled ?? 0} label="Scheduled in the past" detail="jobs still marked scheduled" />
              <Stat value={crm.leads?.total ?? 0} label="Leads" detail={`${crm.leads?.new_7d ?? 0} new in 7 days`} />
              <Stat value={quoteTotal} label="Quotes" detail={countPairs(crm.quotes?.by_status)} />
              <Stat value={crm.quotes?.accepted_without_job ?? 0} label="Accepted, no job" detail="accepted quotes with no job created" />
              <Stat
                value={crm.drip?.by_status?.skipped ?? 0}
                label="Drip emails failed"
                detail={crm.drip?.last_sent ? `last sent ${ago(crm.drip.last_sent)}` : "none has ever sent"}
              />
            </div>
          )}
        </Section>
      )}

      {view === "health" && (
        <>
          <Section title="Automations" meta={`${automations.length} watched · checked ${ago(snapshot.automations?.checked_at)}`}>
            {automations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No automation has reported.</p>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {automations.map((a) => {
                  const t = automationTone(a.level);
                  return (
                    <div key={a.name} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                      <Pill tone={t.tone}>{t.label}</Pill>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{a.name}</p>
                        <p className="break-words text-xs">{a.message}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          last success {ago(a.last_success)} · last run {ago(a.last_run)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="What's stuck" meta={`${stuck.length} items · from the ${outbrief?.date ?? ""} Outbrief`}>
              {stuck.length === 0 ? (
                <p className="text-sm text-muted-foreground">The COO reported nothing stuck.</p>
              ) : (
                <ul className="space-y-2">
                  {stuck.map((s, i) => (
                    <li key={i} className="break-words rounded-lg border bg-card p-3 text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Last 24 hours" meta={`${activity.length} office commits`}>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commits in the last 24 hours.</p>
              ) : (
                <ul className="space-y-2">
                  {activity.slice(0, 30).map((a, i) => (
                    <li key={i} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{clock(a.at)}</span>
                      <span className="break-words">{a.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </>,
    toolbar
  );
}
