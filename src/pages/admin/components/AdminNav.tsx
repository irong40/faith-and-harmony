import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  LayoutDashboard, 
  Server, 
  Megaphone,
  Camera,
  ClipboardList,
  BarChart3,
  Target,
  Briefcase,
  FileText,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  FileOutput,
  ChevronDown
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
    ],
  },
  {
    label: "Drone",
    icon: Camera,
    items: [
      { href: "/admin/drone-jobs", label: "Drone Jobs", icon: ClipboardList },
      { href: "/admin/drone-crm", label: "CRM", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    icon: Briefcase,
    items: [
      { href: "/admin/service-requests", label: "Requests", icon: FileText },
      { href: "/admin/proposals", label: "Proposals", icon: ClipboardList },
      { href: "/admin/offerings", label: "Offerings", icon: Package },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/drone-leads", label: "Leads", icon: Target },
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

// Standalone link (not a dropdown)
const documentsLink = { href: "/admin/documents", label: "Documents", icon: FileOutput };

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
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
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
                          className={`flex items-center gap-2 w-full ${
                            isItemActive(item.href) ? "bg-accent" : ""
                          }`}
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
            </nav>
          </div>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
