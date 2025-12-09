import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ShoppingCart, FileText, Package } from "lucide-react";

const navItems = [
  { href: "/admin/service-requests", label: "Service Requests", icon: FileText },
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
        </div>
      </div>
    </header>
  );
}
