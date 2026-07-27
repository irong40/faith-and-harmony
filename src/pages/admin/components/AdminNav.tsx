import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Building2,
  CalendarDays,
  Camera,
  ClipboardList,
  DollarSign,
  ExternalLink,
  FileOutput,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Plane,
  Plus,
  Route as RouteIcon,
  Settings as SettingsIcon,
  Target,
  Users,
  Wrench,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

// ---------------------------------------------------------------------------
// AdminNav — four areas, one active-section row.
//
// Two matching rules, and they are not the same rule:
//   * AREAS match by PREFIX, so /admin/missions/:id keeps "Missions" lit.
//   * SECTIONS match EXACTLY, including any query string they declare. Two
//     sections can now share a pathname (/admin/clients vs
//     /admin/clients?tab=messages), so the most specific match wins — without
//     that, "Directory" and "Messages" would both light up on the Messages tab.
// ---------------------------------------------------------------------------

type Icon = ComponentType<{ className?: string }>;

interface NavItem {
  /** May carry a query string, e.g. "/admin/clients?tab=messages". */
  href: string;
  label: string;
  icon: Icon;
}

interface NavArea {
  key: string;
  label: string;
  icon: Icon;
  /** Where the area button itself navigates. */
  href: string;
  sections: NavItem[];
}

const AREAS: NavArea[] = [
  {
    key: "pipeline",
    label: "Pipeline",
    icon: Inbox,
    href: "/admin/pipeline",
    sections: [
      { href: "/admin/pipeline", label: "Quote Requests", icon: Inbox },
      { href: "/admin/pipeline/leads", label: "Leads", icon: Target },
      { href: "/admin/service-requests", label: "Service Requests", icon: ClipboardList },
    ],
  },
  {
    key: "missions",
    label: "Missions",
    icon: Camera,
    href: "/admin/missions",
    sections: [
      { href: "/admin/missions", label: "All Missions", icon: ClipboardList },
      { href: "/admin/missions/new", label: "New Mission", icon: Plus },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/admin/pilots", label: "Pilots", icon: Users },
    ],
  },
  {
    key: "clients",
    label: "Clients",
    icon: Users,
    href: "/admin/clients",
    sections: [
      { href: "/admin/clients", label: "Directory", icon: Building2 },
      { href: "/admin/clients?tab=messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
    href: "/admin/reports",
    sections: [
      { href: "/admin/reports", label: "Reports", icon: FileText },
      { href: "/admin/documents", label: "Documents", icon: FileOutput },
    ],
  },
];

const HOME: NavItem = { href: "/admin", label: "Dashboard", icon: LayoutDashboard };

const SETTINGS_ITEMS: NavItem[] = [
  { href: "/admin/settings", label: "Integrations", icon: SettingsIcon },
  { href: "/admin/settings/pricing", label: "Pricing & Billing", icon: DollarSign },
  { href: "/admin/settings/templates", label: "Processing Templates", icon: RouteIcon },
  { href: "/admin/settings/accessories", label: "Accessories", icon: Wrench },
  { href: "/admin/settings/fleet", label: "Fleet Inventory", icon: Plane },
  { href: "/pilot", label: "Pilot Portal", icon: Target },
];

/** Splits "/admin/clients?tab=messages" into path and query halves. */
function parseHref(href: string): { path: string; query: URLSearchParams | null } {
  const i = href.indexOf("?");
  if (i === -1) return { path: href, query: null };
  return { path: href.slice(0, i), query: new URLSearchParams(href.slice(i + 1)) };
}

/** Prefix match — `/admin/missions` stays active on `/admin/missions/123`. */
export function isPathActive(pathname: string, href: string): boolean {
  const { path } = parseHref(href);
  return pathname === path || pathname.startsWith(path + "/");
}

/**
 * How many of a section's declared query params the current URL satisfies, or
 * -1 when the pathname does not match at all.
 */
export function sectionScore(pathname: string, search: string, href: string): number {
  const { path, query } = parseHref(href);
  if (pathname !== path) return -1;
  if (!query) return 0;
  const have = new URLSearchParams(search);
  let score = 0;
  for (const [key, value] of query.entries()) {
    if (have.get(key) !== value) return -1;
    score += 1;
  }
  return score;
}

/**
 * The single active section href, or null. Highest score wins, so
 * `/admin/clients?tab=messages` beats the bare `/admin/clients` when the tab
 * param is present, and loses to it when it is not.
 */
export function activeSectionHref(
  pathname: string,
  search: string,
  sections: NavItem[]
): string | null {
  let best: { href: string; score: number } | null = null;
  for (const section of sections) {
    const score = sectionScore(pathname, search, section.href);
    if (score < 0) continue;
    if (!best || score > best.score) best = { href: section.href, score };
  }
  return best?.href ?? null;
}

export function findActiveArea(pathname: string): NavArea | undefined {
  return AREAS.find((area) =>
    area.sections.some((section) => isPathActive(pathname, section.href))
  );
}

export default function AdminNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { pathname, search } = location;
  const activeArea = useMemo(() => findActiveArea(pathname), [pathname]);
  // Dashboard IS /admin, so it must match exactly — a prefix test would keep it
  // lit on every page in the portal.
  const homeActive = pathname === HOME.href;
  const settingsActive = pathname.startsWith("/admin/settings");

  // Radix does not close a Sheet when the router navigates underneath it.
  // Both sheets are sheets of LINKS, so this is what makes them dismiss.
  useEffect(() => {
    setMobileOpen(false);
    setSettingsOpen(false);
  }, [pathname, search]);

  const sections = activeArea?.sections ?? [];
  const activeSection = useMemo(
    () => activeSectionHref(pathname, search, sections),
    [pathname, search, sections]
  );
  const activeSettingsItem = useMemo(
    () => activeSectionHref(pathname, search, SETTINGS_ITEMS),
    [pathname, search]
  );

  const sectionClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-accent font-medium text-accent-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="container mx-auto px-4">
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 — brand, areas, settings launcher, notifications           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex h-14 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {/* Mobile drawer trigger — CSS breakpoint, not a JS media hook, so
                there is no desktop-nav flash on first paint. */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto p-0">
                <SheetHeader className="border-b px-6 py-4 text-left">
                  <SheetTitle>Sentinel Admin</SheetTitle>
                  <SheetDescription className="sr-only">
                    Primary navigation
                  </SheetDescription>
                </SheetHeader>

                <nav className="px-3 py-4" aria-label="Primary">
                  <Link
                    to={HOME.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      homeActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    )}
                    aria-current={homeActive ? "page" : undefined}
                  >
                    <HOME.icon className="h-4 w-4 shrink-0" />
                    {HOME.label}
                  </Link>

                  {AREAS.map((area) => {
                    const areaActive = activeArea?.key === area.key;
                    return (
                      <div key={area.key} className="mt-5">
                        <Link
                          to={area.href}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                            areaActive
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          <area.icon className="h-4 w-4 shrink-0" />
                          {area.label}
                        </Link>
                        <div className="mt-1 space-y-0.5 border-l border-border pl-3 ml-4">
                          {area.sections.map((section) => {
                            const isActive =
                              areaActive && activeSection === section.href;
                            return (
                              <Link
                                key={section.href}
                                to={section.href}
                                className={sectionClass(isActive)}
                                aria-current={isActive ? "page" : undefined}
                              >
                                <section.icon className="h-4 w-4 shrink-0" />
                                {section.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-5 border-t pt-4">
                    <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Settings
                    </p>
                    {SETTINGS_ITEMS.map((item) => {
                      const isActive = activeSettingsItem === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={sectionClass(isActive)}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                    <a
                      href="https://www.faithandharmonyllc.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Faith &amp; Harmony LLC
                    </a>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            <Link
              to={HOME.href}
              className="mr-1 flex shrink-0 items-center gap-2 px-2 text-sm font-semibold text-primary"
            >
              Sentinel
            </Link>

            {/* Desktop areas */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              <Link to={HOME.href}>
                <Button
                  variant={homeActive ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                  aria-current={homeActive ? "page" : undefined}
                >
                  <HOME.icon className="h-4 w-4" />
                  {HOME.label}
                </Button>
              </Link>

              {AREAS.map((area) => {
                const areaActive = activeArea?.key === area.key;
                return (
                  <Link key={area.key} to={area.href}>
                    <Button
                      variant={areaActive ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      aria-current={areaActive ? "page" : undefined}
                    >
                      <area.icon className="h-4 w-4" />
                      {area.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <a
              href="https://www.faithandharmonyllc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:text-primary md:inline-flex"
              title="Faith &amp; Harmony LLC website"
              aria-label="Faith and Harmony LLC website (opens in a new tab)"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            {/* Settings launcher — a sheet of LINKS to real routes, not a
                content drawer. /admin/settings has to stay mountable because
                Google OAuth redirects the whole browser back to it. */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant={settingsActive ? "default" : "ghost"}
                  size="icon"
                  aria-label="Open settings menu"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto p-0">
                <SheetHeader className="border-b px-6 py-4 text-left">
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Integrations, pricing, processing and fleet setup.
                  </SheetDescription>
                </SheetHeader>
                <nav className="px-3 py-4" aria-label="Settings">
                  {SETTINGS_ITEMS.map((item) => {
                    const isActive = activeSettingsItem === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={sectionClass(isActive)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <NotificationBell />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 — sections of the active area (hidden when there are none)  */}
        {/* ---------------------------------------------------------------- */}
        {sections.length > 0 && (
          <div className="-mx-4 border-t border-border/60 px-4">
            <nav
              className="flex items-center gap-1 overflow-x-auto py-1.5"
              aria-label={`${activeArea?.label ?? ""} sections`}
            >
              {sections.map((section) => {
                const isActive = activeSection === section.href;
                return (
                  <Link
                    key={section.href}
                    to={section.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <section.icon className="h-3.5 w-3.5" />
                    {section.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
