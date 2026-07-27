import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";

export interface AdminNavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matches: readonly string[];
  destinations: readonly AdminNavigationDestination[];
}

export interface AdminNavigationDestination {
  label: string;
  href: string;
}

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  {
    label: "Command Center",
    href: "/admin/command-center",
    icon: LayoutDashboard,
    matches: ["/admin/command-center", "/admin/dashboard", "/admin/mission-control"],
    destinations: [
      { label: "Command center", href: "/admin/command-center" },
      { label: "Mission control", href: "/admin/mission-control" },
    ],
  },
  {
    label: "Work",
    href: "/admin/work",
    icon: BriefcaseBusiness,
    matches: ["/admin/work", "/admin/projects", "/admin/service-requests"],
    destinations: [
      { label: "Company work", href: "/admin/work" },
      { label: "Projects", href: "/admin/projects" },
      { label: "Service requests", href: "/admin/service-requests" },
    ],
  },
  {
    label: "Revenue",
    href: "/admin/quote-requests",
    icon: CircleDollarSign,
    matches: [
      "/admin/quote-requests",
      "/admin/leads",
      "/admin/call-logs",
      "/admin/proposals",
      "/admin/invoices",
      "/admin/clients",
      "/admin/contracts",
      "/admin/pricing",
    ],
    destinations: [
      { label: "Quote requests", href: "/admin/quote-requests" },
      { label: "Leads", href: "/admin/leads" },
      { label: "Call logs", href: "/admin/call-logs" },
      { label: "Proposals", href: "/admin/proposals" },
      { label: "Invoices", href: "/admin/invoices" },
      { label: "Clients", href: "/admin/clients" },
      { label: "Contracts", href: "/admin/contracts" },
      { label: "Pricing", href: "/admin/pricing" },
    ],
  },
  {
    label: "Operations",
    href: "/admin/drone-jobs",
    icon: Building2,
    matches: [
      "/admin/drone-jobs",
      "/admin/jobs",
      "/admin/scheduling",
      "/admin/weather",
      "/admin/pilots",
      "/admin/processing-templates",
      "/admin/accessories",
      "/admin/jobs/new",
    ],
    destinations: [
      { label: "Missions", href: "/admin/drone-jobs" },
      { label: "New mission", href: "/admin/jobs/new" },
      { label: "Schedule", href: "/admin/scheduling" },
      { label: "Weather", href: "/admin/weather" },
      { label: "Pilots", href: "/admin/pilots" },
      { label: "Processing templates", href: "/admin/processing-templates" },
      { label: "Accessories", href: "/admin/accessories" },
    ],
  },
  {
    label: "Governance",
    href: "/admin/governance",
    icon: ShieldCheck,
    matches: ["/admin/governance"],
    destinations: [
      { label: "Governance overview", href: "/admin/governance" },
    ],
  },
  {
    label: "Library",
    href: "/admin/documents",
    icon: BookOpenText,
    matches: ["/admin/documents", "/admin/reports"],
    destinations: [
      { label: "Documents", href: "/admin/documents" },
      { label: "Reports", href: "/admin/reports" },
    ],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    matches: ["/admin/settings", "/admin/people", "/admin/messages"],
    destinations: [
      { label: "Settings", href: "/admin/settings" },
      { label: "People", href: "/admin/people" },
      { label: "Messages", href: "/admin/messages" },
    ],
  },
] as const;

export const ADMIN_DETAIL_ROUTES = [
  "/admin/drone-jobs/:id",
  "/admin/drone-jobs/:id/delivery",
  "/admin/reports/new",
  "/admin/reports/:id/edit",
] as const;

export function listAdminDestinations(): AdminNavigationDestination[] {
  return ADMIN_NAVIGATION.flatMap((item) => [...item.destinations]);
}

export function isAdminDestinationActive(item: AdminNavigationItem, pathname: string): boolean {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

export function findAdminDestination(item: AdminNavigationItem, pathname: string): AdminNavigationDestination {
  return [...item.destinations]
    .sort((left, right) => right.href.length - left.href.length)
    .find((destination) => pathname === destination.href || pathname.startsWith(`${destination.href}/`))
    ?? item.destinations[0];
}
