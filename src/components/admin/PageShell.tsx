import { Fragment, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ---------------------------------------------------------------------------
// PageShell — the single admin page frame.
//
// Every admin page renders exactly one of these. It owns the <main> container,
// the width scale, the title/description block and the actions/toolbar slots so
// that heading sizes, gutters and vertical rhythm stop drifting page-to-page.
// ---------------------------------------------------------------------------

export type PageShellWidth = "narrow" | "default" | "wide" | "full";

export interface Crumb {
  label: string;
  /** Omit on the final crumb — it renders as the current page. */
  href?: string;
}

export interface PageShellProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Rendered only when there is more than one crumb — a lone crumb is noise. */
  breadcrumbs?: Crumb[];
  /** Primary page actions, right-aligned next to the title. */
  actions?: ReactNode;
  /** Filters / search / tabs row, rendered under the header block. */
  toolbar?: ReactNode;
  width?: PageShellWidth;
  className?: string;
  children?: ReactNode;
}

const WIDTH_CLASS: Record<PageShellWidth, string> = {
  narrow: "max-w-2xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "",
};

export default function PageShell({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  toolbar,
  width = "default",
  className,
  children,
}: PageShellProps) {
  // A single crumb is just the page title repeated — only show a real trail.
  const showCrumbs = Array.isArray(breadcrumbs) && breadcrumbs.length > 1;

  return (
    <main className={cn("container mx-auto px-4 py-8", WIDTH_CLASS[width], className)}>
      {showCrumbs && (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${i}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />}
            {/* Locked heading scale — do not override per page. */}
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {toolbar && <div className="mt-6">{toolbar}</div>}

      <div className="mt-6">{children}</div>
    </main>
  );
}

export { PageShell };
