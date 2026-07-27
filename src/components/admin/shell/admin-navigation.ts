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
}

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  {
    label: "Command Center",
    href: "/admin/command-center",
    icon: LayoutDashboard,
    matches: ["/admin/command-center", "/admin/dashboard"],
  },
  {
    label: "Work",
    href: "/admin/work",
    icon: BriefcaseBusiness,
    matches: ["/admin/work", "/admin/projects", "/admin/service-requests"],
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
    ],
  },
  {
    label: "Governance",
    href: "/admin/governance",
    icon: ShieldCheck,
    matches: ["/admin/governance"],
  },
  {
    label: "Library",
    href: "/admin/documents",
    icon: BookOpenText,
    matches: ["/admin/documents", "/admin/reports"],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    matches: ["/admin/settings", "/admin/people", "/admin/messages"],
  },
] as const;

export function isAdminDestinationActive(item: AdminNavigationItem, pathname: string): boolean {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}
