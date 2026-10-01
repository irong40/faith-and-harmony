import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { LayoutDashboard, Radar, RefreshCw } from "lucide-react";
import PageShell from "@/components/admin/PageShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/PageState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useOffice, useSendOfficeMessage } from "@/hooks/useOffice";
import {
  ago,
  automationTone,
  boardColumns,
  countPairs,
  employeeState,
  freshness,
  isAccessNotGranted,
  messageLabel,
  messageStatus,
  pendingAnswer,
  releaseSent,
  roleOf,
  sortAutomations,
  splitDecisions,
  type OfficeDecision,
  type OfficeJob,
  type OfficeMessage,
  type Tone,
} from "@/lib/office";

// ---------------------------------------------------------------------------
// Office — what the agents are doing, and what needs Adam's call.
//
// Read path: one snapshot row the desktop sync pushes every 5 minutes.
// Write path: rows in office_inbox (answer, directive, release) that the same
// sync collects. This page never reaches the agents directly, so everything it
// shows is "as of the last report" and says how old that report is.
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

function Tile({ value, label, tone }: { value: number; label: string; tone: Tone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("text-3xl font-bold tabular-nums", tone === "idle" ? "" : TONE_TEXT[tone])}>{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

type Send = ReturnType<typeof useSendOfficeMessage>;

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
// Tell the COO: a directive, plus everything sent so far.
// -------------------------------------------------------
function TellTheCoo({ messages, send }: { messages: OfficeMessage[]; send: Send }) {
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
          Say what you want done. The COO turns it into a job and assigns it to the right employee.
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
            <p className="text-xs text-muted-foreground">Collected within 5 minutes. Planned on the next intake run.</p>
          </div>
          {failed && (
            <p role="alert" className="text-xs text-destructive">
              {failed}
            </p>
          )}
        </form>

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
// Main page
// -------------------------------------------------------
export default function Office() {
  const { data, error, isLoading, isFetching, refetch } = useOffice();
  const send = useSendOfficeMessage();

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
        <Link to="/admin">
          <LayoutDashboard className="h-4 w-4" />
          Mission Control
        </Link>
      </Button>
    </div>
  );

  const shell = (children: ReactNode) => (
    <PageShell
      title="Office"
      description="What the agents are doing, and what needs your call."
      icon={Radar}
      width="wide"
      actions={actions}
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
  const busyCount = team.filter((t) => t.doing || t.queued).length;
  const quoteTotal = Object.values(crm?.quotes?.by_status ?? {}).reduce((n, v) => n + v, 0);

  return shell(
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Could not refresh just now ({errorText(error)}). Showing the last status that loaded.
        </p>
      )}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile value={open.length} label={open.length === 1 ? "decision waiting on you" : "decisions waiting on you"} tone={open.length ? "warn" : "good"} />
        <Tile value={waiting} label={waiting === 1 ? "job held or blocked" : "jobs held or blocked"} tone={waiting ? "warn" : "good"} />
        <Tile value={doing} label={doing === 1 ? "job in progress" : dispatcher?.running && !doing ? "dispatcher is starting a pass" : "jobs in progress"} tone={doing ? "info" : "idle"} />
        <Tile value={failing} label={`automations failing${warning ? `, ${warning} warning` : ""}`} tone={failing ? "crit" : warning ? "warn" : "good"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section
          title="Your calls"
          meta={`Outbrief of ${outbrief?.date ?? "?"} · ${open.length} open, ${closed.length} answered`}
        >
          {open.length > 0 ? (
            <div className="space-y-3">
              {open.map((d) => (
                <OpenDecision key={d.n} decision={d} date={outbrief?.date ?? null} send={send} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {decisions.length
                ? `Nothing is waiting on your call. All ${decisions.length} decisions in the Outbrief of ${outbrief?.date} are answered.`
                : `The Outbrief of ${outbrief?.date ?? "today"} had no decisions for you.`}
            </p>
          )}
          {closed.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Answered ({closed.length})
              </summary>
              <div className="mt-3 space-y-2">
                {closed.map((d) => (
                  <ClosedDecision key={d.n} decision={d} pending={pendingAnswer(messages, outbrief?.date, d.n)} />
                ))}
              </div>
            </details>
          )}
        </Section>

        <div className="mb-8">
          <TellTheCoo messages={messages} send={send} />
        </div>
      </div>

      <Section title="The team" meta={`${team.length} employees · ${busyCount} with work · ${team.length - busyCount} without`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-semibold text-muted-foreground">COO</p>
                <h3 className="text-sm font-semibold">Chief operating officer</h3>
              </div>
              <Pill tone={dispatcher?.running ? "info" : "idle"}>{dispatcher?.running ? "Running" : "Standby"}</Pill>
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
          {team.map((t) => {
            const [code, title] = roleOf(t.name);
            const state = employeeState(t);
            return (
              <div key={t.name} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-muted-foreground">{code}</p>
                    <h3 className="text-sm font-semibold">{title}</h3>
                  </div>
                  <Pill tone={state.tone}>{state.label}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.does}</p>
                <div className="mt-2 space-y-1 text-sm">
                  {t.doing && (
                    <p>
                      <span className="font-medium">Working on: </span>
                      {t.doing}
                    </p>
                  )}
                  {t.queued > 0 && (
                    <p>
                      <span className="font-medium">Queued: </span>
                      {t.queued} {t.queued === 1 ? "job" : "jobs"}
                    </p>
                  )}
                  {t.held > 0 && (
                    <p>
                      <span className="font-medium">Held for your release: </span>
                      {t.held} {t.held === 1 ? "job" : "jobs"}
                    </p>
                  )}
                  {t.blocked > 0 && (
                    <p>
                      <span className="font-medium">Blocked on you: </span>
                      {t.blocked} {t.blocked === 1 ? "job" : "jobs"}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t.last_done ? `Last finished: ${t.last_done} (${ago(t.last_done_at)})` : "No finished jobs this week."}
                  </p>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {t.done_7d} done in 7 days · {t.lessons} notebook lessons
                </p>
              </div>
            );
          })}
        </div>
      </Section>

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
                  {col.jobs.length > 14 && (
                    <p className="text-xs text-muted-foreground">and {col.jobs.length - 14} more</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Automations"
          meta={`${automations.length} watched · checked ${ago(snapshot.automations?.checked_at)}`}
        >
          {automations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No automation has reported.</p>
          ) : (
            <div className="space-y-2">
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

        <Section title="The business" meta={crm?.generated_at ? `CRM snapshot from ${ago(crm.generated_at)}` : undefined}>
          {!crm?.jobs ? (
            <p className="text-sm text-muted-foreground">No CRM snapshot yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat
                value={`$${Number(crm.billing?.payments_total ?? 0).toLocaleString()}`}
                label="Payments recorded"
                detail={crm.billing?.payments_pending ? `${crm.billing.payments_pending} pending` : "none pending"}
              />
              <Stat value={crm.billing?.delivered_unbilled ?? 0} label="Delivered, not billed" detail="jobs delivered with no payment on record" />
              <Stat value={crm.jobs.total ?? 0} label="Drone jobs" detail={countPairs(crm.jobs.by_status)} />
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
      </div>

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
  );
}
