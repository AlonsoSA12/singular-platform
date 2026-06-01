"use client";

import { createContext, useContext } from "react";
import type { WorkspaceUserPresentation } from "@/lib/workspace-user";

const WorkspaceUserContext = createContext<WorkspaceUserPresentation | null>(null);

type WorkspaceUserProviderProps = {
  children: React.ReactNode;
  value: WorkspaceUserPresentation;
};

export function WorkspaceUserProvider({
  children,
  value
}: WorkspaceUserProviderProps) {
  return <WorkspaceUserContext.Provider value={value}>{children}</WorkspaceUserContext.Provider>;
}

export function useWorkspaceUser() {
  const value = useContext(WorkspaceUserContext);

  if (!value) {
    throw new Error("useWorkspaceUser must be used within WorkspaceUserProvider.");
  }

  return value;
}
