import { Navigate, Route, useLocation, useParams } from "react-router-dom";

// ---------------------------------------------------------------------------
// adminRedirects — PERMANENT infrastructure, not a bookmark grace period.
//
// `notifications.link` holds STORED ROWS written by five edge functions. Those
// rows are already in the database and are rendered verbatim by
// NotificationBell.tsx via `<Link to={notif.link}>`. A row written in March is
// still clickable in December, so a route we retire today must keep resolving
// forever — there is no expiry after which it is safe to drop these.
//
// Three consequences that must not be "cleaned up" later:
//   1. Search and hash MUST survive the hop. Stored links include query strings
//      (e.g. /admin/messages?conversation=<uuid>); dropping `?conversation=`
//      lands the user on a generic list with no error and no clue why.
//   2. Some targets are now TABS, so the target itself carries a query string
//      (/admin/clients?tab=messages). Those merge with — never replace — the
//      incoming search, or the stored `?conversation=` is lost on the way in.
//   3. Redirects sit at the TOP level of <Routes>, not inside the /admin
//      layout, so the hop happens before ProtectedRoute mounts. One navigation,
//      no auth round-trip, no layout flash.
// ---------------------------------------------------------------------------

type RouteParams = Readonly<Record<string, string | undefined>>;

/**
 * Target may be a plain path (optionally carrying its own `?query`), or a
 * function of the matched route params for renames that have to carry an id
 * across — `/admin/drone-jobs/:id/delivery` -> `/admin/missions/:id/delivery`.
 */
export type RedirectTarget = string | ((params: RouteParams) => string);

export interface AdminRedirect {
  /** Route path. A trailing `/*` also matches the bare parent path. */
  from: string;
  to: RedirectTarget;
}

/**
 * Merges a target's own query string onto the incoming one.
 *
 * When the target has no query the incoming string is passed through BYTE FOR
 * BYTE — re-serialising through URLSearchParams would re-encode values and
 * reorder nothing useful, and these strings are read by other code.
 * Target keys win, because the target's `?tab=` IS the redirect's intent.
 */
export function mergeSearch(incoming: string, targetSearch: string): string {
  if (!targetSearch) return incoming;
  const merged = new URLSearchParams(incoming);
  new URLSearchParams(targetSearch).forEach((value, key) => merged.set(key, value));
  const out = merged.toString();
  return out ? `?${out}` : "";
}

/** Splits "/admin/clients?tab=messages" into its pathname and search halves. */
export function splitTarget(target: string): { pathname: string; search: string } {
  const i = target.indexOf("?");
  if (i === -1) return { pathname: target, search: "" };
  return { pathname: target.slice(0, i), search: target.slice(i) };
}

/** Pure resolver — exported so the spec can assert without mounting a router. */
export function resolveRedirect(
  to: RedirectTarget,
  params: RouteParams,
  incomingSearch: string
): { pathname: string; search: string } {
  const target = typeof to === "function" ? to(params) : to;
  const { pathname, search } = splitTarget(target);
  return { pathname, search: mergeSearch(incomingSearch, search) };
}

/**
 * Replays the current search + hash onto a new pathname.
 *
 * `replace` is deliberate: the retired URL must not sit in history, or Back
 * from the destination bounces straight through the redirect again.
 */
export function PreserveRedirect({ to }: { to: RedirectTarget }) {
  const { search, hash } = useLocation();
  const params = useParams();
  const resolved = resolveRedirect(to, params, search);
  return <Navigate to={{ pathname: resolved.pathname, search: resolved.search, hash }} replace />;
}

/** Carries the remainder of a renamed path prefix onto its new prefix. */
function splatOnto(prefix: string) {
  return (params: RouteParams) => {
    const rest = params["*"];
    return rest ? `${prefix}/${rest}` : prefix;
  };
}

/** Retired path -> live path. Keep sorted by source for review sanity. */
export const ADMIN_REDIRECTS: ReadonlyArray<AdminRedirect> = [
  // --- slice 2 wave A: cut modules -----------------------------------------
  { from: "/admin/contracts", to: "/admin" },
  { from: "/admin/governance", to: "/admin" },

  // --- slice 2 wave B: dead-table pages ------------------------------------
  // `invoices` and the admin `projects` table do not exist live; both audiences
  // were really looking for mission state.
  { from: "/admin/invoices", to: "/admin/missions" },
  { from: "/admin/projects", to: "/admin/missions" },
  // Proposal *creation* survives as ProposalForm inside service-requests; the
  // list view's job is now done by the pipeline.
  { from: "/admin/proposals", to: "/admin/pipeline" },

  // --- slice 2 wave C: directory merged into clients ------------------------
  { from: "/admin/people", to: "/admin/clients" },

  // --- slice 3: consolidation + the route rename ---------------------------
  // Accessories now lives under settings.
  { from: "/admin/accessories", to: "/admin/settings/accessories" },
  // Call logs are the third tab of Leads. Without `?tab=calls` a stored link
  // would land on Leads' default tab and the call the notification is about
  // would not be on screen.
  { from: "/admin/call-logs", to: "/admin/pipeline/leads?tab=calls" },
  // Dashboard is the /admin index — the old path stays a real, stored URL.
  { from: "/admin/dashboard", to: "/admin" },
  // drone-jobs -> missions. Splat so /:id and /:id/delivery come along; the
  // trailing `/*` also matches the bare list path.
  { from: "/admin/drone-jobs/*", to: splatOnto("/admin/missions") },
  { from: "/admin/jobs/new", to: "/admin/missions/new" },
  { from: "/admin/leads", to: "/admin/pipeline/leads" },
  // Five edge functions write /admin/messages?conversation=<uuid>. The uuid is
  // the whole point of the link, so it has to survive alongside `?tab=`.
  { from: "/admin/messages", to: "/admin/clients?tab=messages" },
  { from: "/admin/pricing", to: "/admin/settings/pricing" },
  { from: "/admin/processing-templates", to: "/admin/settings/templates" },
  { from: "/admin/quote-requests", to: "/admin/pipeline" },
  { from: "/admin/scheduling", to: "/admin/calendar" },
  { from: "/admin/weather", to: "/admin/calendar?tab=weather" },
];

/**
 * React Router v6 accepts an ARRAY of <Route> children but not a wrapping
 * fragment, so this returns the array and callers spread it:
 *   <Routes>{...adminRedirectRoutes()}</Routes>
 */
export function adminRedirectRoutes() {
  return ADMIN_REDIRECTS.map(({ from, to }) => (
    <Route key={from} path={from} element={<PreserveRedirect to={to} />} />
  ));
}

export default adminRedirectRoutes;
