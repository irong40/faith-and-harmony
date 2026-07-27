import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ADMIN_NAVIGATION, isAdminDestinationActive } from "./admin-navigation";

export default function AdminHeader() {
  const { pathname } = useLocation();
  const section = ADMIN_NAVIGATION.find((item) => isAdminDestinationActive(item, pathname));

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-border/70 bg-card/90 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger
        aria-label="Open company navigation"
        title="Open company navigation"
        className="size-9 rounded-lg"
      />
      <Separator orientation="vertical" className="mx-3 h-5" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Company command center
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {section?.label ?? "Administration"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button asChild size="sm" className="hidden gap-2 shadow-sm sm:flex">
          <Link to="/admin/work?create=1">
            <Plus className="size-4" />
            New work
          </Link>
        </Button>
        <NotificationBell />
      </div>
    </header>
  );
}
