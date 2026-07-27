import type { ReactNode } from "react";
import { AdminShellContext } from "./AdminShellState";

export function AdminShellContextProvider({ children }: { children: ReactNode }) {
  return (
    <AdminShellContext.Provider value>
      {children}
    </AdminShellContext.Provider>
  );
}
