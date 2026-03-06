import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Server,
  Megaphone,
  Camera,
  ClipboardList,
  Activity,
  Users,
  Target,
  Briefcase,
  FileText,
  MessageSquare,
  FileOutput,
  Settings,
  ChevronDown,
  FolderKanban,
  Plus,
  Route,
  ExternalLink,
  Inbox,
  Satellite,
  CalendarDays,
  Cloud,
  Phone,
  Wrench,
  TicketCheck,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface NavCategory {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navCategories: NavCategory[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/apps", label: "Apps", icon: Server },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/tickets", label: "Tickets", icon: TicketCheck },
    ],
  },
  {
    label: "Missions",
    icon: Camera,
    items: [
      { href: "/admin/jobs/new", label: "New Job", icon: Plus },
      { href: "/admin/drone-jobs", label: "Jobs", icon: ClipboardList },
      { href: "/admin/clients", label: "Clients", icon: Users },
      { href: "/admin/pipeline", label: "Pipeline", icon: Activity },
      { href: "/admin/pilots", label: "Pilots", icon: Users },
      { href: "/pilot", label: "Pilot Portal", icon: Target },
      { href: "/admin/processing-templates", label: "Templates", icon: Route },
      { href: "/admin/land-monitor", label: "Land Monitor", icon: Satellite },
      { href: "/admin/accessories", label: "Accessories", icon: Wrench },
    ],
  },
  {
    label: "Quotes",
    icon: FileText,
    items: [
      { href: "/admin/quote-requests", label: "Quote Requests", icon: Inbox },
      { href: "/admin/call-logs", label: "Call Logs", icon: Phone },
      { href: "/admin/leads", label: "Leads", icon: Target },
    ],
  },
  {
    label: "Operations",
    icon: Briefcase,
    items: [
      { href: "/admin/weather", label: "Weather", icon: Cloud },
      { href: "/admin/scheduling", label: "Scheduling", icon: CalendarDays },
      { href: "/admin/service-requests", label: "Requests", icon: FileText },
      { href: "/admin/proposals", label: "Proposals", icon: ClipboardList },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "People",
    icon: Users,
    items: [
      { href: "/admin/people", label: "Directory", icon: Users },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare },
    ],
  },
];

// Standalone links (not dropdowns)
const documentsLink = { href: "/admin/documents", label: "Documents", icon: FileOutput };
const settingsLink = { href: "/admin/settings", label: "Settings", icon: Settings };

export default function AdminNav() {
  const location = useLocation();

  const isCategoryActive = (category: NavCategory) => {
    return category.items.some(item => location.pathname === item.href);
  };

  const isItemActive = (href: string) => location.pathname === href;

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary mr-2">
              Sentinel
            </Link>
            <a
              href="https://www.faithandharmonyllc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Faith & Harmony LLC website"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <nav className="flex gap-1">
              {navCategories.map((category) => (
                <DropdownMenu key={category.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isCategoryActive(category) ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                    >
                      <category.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{category.label}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {category.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          to={item.href}
                          className={`flex items-center gap-2 w-full ${isItemActive(item.href) ? "bg-accent" : ""}`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}

              {/* Documents - standalone link */}
              <Link to={documentsLink.href}>
                <Button
                  variant={isItemActive(documentsLink.href) ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <documentsLink.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{documentsLink.label}</span>
                </Button>
              </Link>

              {/* Settings - standalone link */}
              <Link to={settingsLink.href}>
                <Button
                  variant={isItemActive(settingsLink.href) ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <settingsLink.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{settingsLink.label}</span>
                </Button>
              </Link>
            </nav>
          </div>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
