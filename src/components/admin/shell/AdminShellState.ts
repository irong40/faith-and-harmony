import { createContext, useContext } from "react";

export const AdminShellContext = createContext(false);

export function useAdminShell(): boolean {
  return useContext(AdminShellContext);
}
