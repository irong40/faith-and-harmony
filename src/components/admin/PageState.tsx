import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// PageState — the three states every data view needs.
//
// RULE: anything with a known shape loads as a Skeleton, never a spinner. A
// spinner throws away the layout we already know and causes the content jump
// that reads as flicker. Loader2 is reserved for inside a disabled button,
// where there is no shape to preserve.
// ---------------------------------------------------------------------------

export type LoadingVariant = "list" | "table" | "cards" | "stats" | "form" | "detail";

export interface LoadingStateProps {
  variant?: LoadingVariant;
  /** Number of repeated units (rows / cards / fields). */
  rows?: number;
  className?: string;
  /** Screen-reader announcement while the shape is being filled. */
  label?: string;
}

export function LoadingState({
  variant = "list",
  rows = 5,
  className,
  label = "Loading",
}: LoadingStateProps) {
  const count = Math.max(1, rows);

  return (
    <div
      className={cn("w-full", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>

      {variant === "list" && (
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {variant === "table" && (
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-b-0">
              {Array.from({ length: 4 }).map((__, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      )}

      {variant === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-6">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      )}

      {variant === "stats" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-6">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      )}

      {variant === "form" && (
        <div className="space-y-6">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {variant === "detail" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  /** Usually a <Button> that creates the first record. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed shadow-none", className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        {Icon && (
          <div className="mb-4 rounded-full bg-muted p-4">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
}

export interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

function messageOf(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}

export function ErrorState({
  error,
  onRetry,
  title = "Couldn't load this",
  className,
}: ErrorStateProps) {
  const message = messageOf(error);

  return (
    <Card className={cn("border-destructive/30 shadow-none", className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Something went wrong fetching this data.
        </p>
        {message && (
          <p className="mt-3 max-w-md break-all rounded bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground">
            {message}
          </p>
        )}
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-6 gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
