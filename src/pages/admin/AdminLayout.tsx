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
    // Flex column, not plain block: the shell owns the viewport height so a
    // full-height page (ReportBuilder's 3-pane editor) can claim exactly the
    // space left under the nav with `flex-1`. Pages that just flow keep their
    // intrinsic height — flex items do not grow unless they ask to.
    <div className="flex min-h-screen flex-col bg-background">
      <AdminNav />
      <ErrorBoundary key={boundaryKey(pathname, search)}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
