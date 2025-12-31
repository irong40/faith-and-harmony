import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ShoppingCart, FileText, Package, ClipboardList, MessageSquare, LayoutDashboard, Target, Building2, BarChart3 } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/service-requests", label: "Requests", icon: FileText },
  { href: "/admin/proposals", label: "Proposals", icon: ClipboardList },
  { href: "/admin/drone-jobs", label: "Drone Jobs", icon: ClipboardList },
  { href: "/admin/drone-packages", label: "Packages", icon: Package },
  { href: "/admin/drone-crm", label: "CRM", icon: BarChart3 },
  { href: "/admin/drone-leads", label: "Leads", icon: Target },
  { href: "/admin/drone-clients", label: "Clients", icon: Building2 },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
];

export default function AdminNav() {
  const location = useLocation();

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
            <nav className="flex gap-2">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={location.pathname === item.href ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
