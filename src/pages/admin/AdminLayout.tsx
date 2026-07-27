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
 * AdminLayout — the persistent admin shell.
 *
 * `key={location.pathname}` on the ErrorBoundary is load-bearing. ErrorBoundary
 * has no resetKeys and its only recovery path is window.location.reload(), so
 * without a key a crash on one route would survive client-side navigation and
 * every subsequent page would render the error fallback. Remounting per path
 * gives each route a clean boundary.
 */
export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
