import { Link, useLocation } from "react-router-dom";
import { ExternalLink, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ADMIN_NAVIGATION, isAdminDestinationActive } from "./admin-navigation";

export default function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/70">
      <SidebarHeader className="px-3 pb-3 pt-4">
        <Link
          to="/admin/command-center"
          className="group/brand flex min-w-0 items-center gap-3 rounded-lg outline-none ring-sidebar-ring focus-visible:ring-2"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-sidebar-primary/35 bg-sidebar-primary/10 font-mono text-[11px] font-bold tracking-[0.12em] text-sidebar-primary">
            F&H
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              Faith & Harmony
            </span>
            <span className="block truncate text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/55">
              Company command
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="opacity-60" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">
            Company
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Company navigation">
              <SidebarMenu className="gap-1.5">
                {ADMIN_NAVIGATION.map((item) => {
                  const active = isAdminDestinationActive(item, pathname);
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="h-10 rounded-lg px-2.5 text-sidebar-foreground/75 transition-colors data-[active=true]:bg-sidebar-primary/15 data-[active=true]:text-sidebar-primary"
                      >
                        <Link to={item.href} aria-current={active ? "page" : undefined}>
                          <item.icon className="size-[18px]" strokeWidth={1.8} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <div className="rounded-lg border border-sidebar-border/70 bg-black/10 p-3 group-data-[collapsible=icon]:hidden">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-sidebar-primary">
            <Sparkles className="size-3.5" />
            One operating picture
          </div>
          <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
            Decisions, work, revenue, and operations in one view.
          </p>
        </div>
        <a
          href="https://www.faithandharmonyllc.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/55 outline-none ring-sidebar-ring transition-colors hover:text-sidebar-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Public website</span>
        </a>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
