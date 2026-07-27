import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import { AdminShellContextProvider } from "./AdminShellContext";

export default function AdminShell() {
  return (
    <AdminShellContextProvider>
      <SidebarProvider defaultOpen>
        <AdminSidebar />
        <SidebarInset className="command-center-canvas min-w-0">
          <AdminHeader />
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminShellContextProvider>
  );
}
