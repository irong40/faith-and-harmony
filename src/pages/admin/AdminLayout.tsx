import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminNav from "./components/AdminNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/admin/PageState";

// Route-level fallback. The nav stays mounted above it, so this only has to
// stand in for the page body — skeleton, never a spinner, so the layout does
// not collapse and jump when the chunk lands.
function RouteFallback() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-8">
        <LoadingState variant="list" rows={4} label="Loading page" />
      </div>
    </main>
  );
}

/**
 * Query params that switch which VIEW is rendered, as opposed to params that
 * filter the view that is already on screen.
 *
 * This distinction is the whole point. `?tab=` picks a different component
 * tree — /admin/calendar?tab=weather is WeatherOperations, /admin/calendar is
 * Scheduling — so a crash in one is unrelated to its sibling and the boundary
 * must reset when it changes. `?delivery=ready`, `?pilot=`, `?conversation=`,
 * `?status=` and friends only narrow what the SAME component shows; keying on
 * them would tear down and refetch the page on every filter keystroke, and
 * would also wipe the error fallback the instant the user touched a filter,
 * hiding the crash instead of surfacing it.
 *
 * Add to this list only when a param genuinely swaps the rendered view.
 */
const VIEW_SWITCHING_PARAMS = ["tab"] as const;

/**
 * The identity of the currently rendered view: pathname plus any view-switching
 * params, in a fixed order so `?tab=weather&pilot=x` and `?pilot=x&tab=weather`
 * produce the same key.
 *
 * Exported for the spec — this is the piece with the actual logic in it.
 */
export function boundaryKey(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  const view = VIEW_SWITCHING_PARAMS.map((name) => `${name}=${params.get(name) ?? ""}`).join("&");
  return `${pathname}?${view}`;
}

/**
 * AdminLayout — the persistent admin shell.
 *
 * The ErrorBoundary key is load-bearing. ErrorBoundary has no resetKeys and its
 * only recovery path is window.location.reload(), so without a key a crash on
 * one route would survive client-side navigation and every subsequent page
 * would render the error fallback.
 *
 * Keying on pathname alone was not enough once this redesign moved whole pages
 * behind `?tab=` (/admin/calendar?tab=weather, /admin/clients?tab=messages):
 * those siblings share a pathname, so a crash in Weather Ops persisted into
 * Scheduling with no remount. See `boundaryKey` for why the key is NOT the
 * whole search string.
 */
export default function AdminLayout() {
  const { pathname, search } = useLocation();

  return (
    // `h-screen`, NOT `min-h-screen`. This is the whole trick and it is easy to
    // undo by accident.
    //
    // `min-h-screen` sets a FLOOR, not a bound: children are free to grow past
    // the viewport, so a `flex-1` child resolves against an unbounded parent,
    // grows to fit its content, and any `overflow-y-auto` inside it never
    // engages — the pane gets taller instead of scrolling. That is what shipped:
    // ReportBuilder's 3-pane chain was correct all the way down
    // (min-h-0 / flex-1 / overflow-y-auto) and still produced a 6567px document
    // in a 911px viewport, with zero internally-scrolling panes and the Save
    // button 2888px above the fold. Verified in a browser 2026-07-28; jsdom
    // cannot catch this, because jsdom performs no layout and every class in
    // the chain was already right.
    //
    // With `h-screen overflow-hidden` the shell is bounded, so the scroll
    // container below is bounded too, and `flex-1` finally means "exactly the
    // space under the nav".
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AdminNav />
      <ErrorBoundary key={boundaryKey(pathname, search)}>
        <Suspense fallback={<RouteFallback />}>
          {/* The app's scroll container. The BODY no longer scrolls — verified
              safe: nothing in src/ calls window.scrollTo or reads
              document.body.scrollTop, and the only in-page `sticky` is a
              horizontal table column (Pipeline's Actions), which is unaffected.
              Ordinary flowing pages scroll in here exactly as before. A page
              that wants the full height asks with `flex-1` and gets a real
              bound — ReportBuilder is currently the only one. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </div>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
