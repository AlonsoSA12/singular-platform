import type { AuthenticatedUser } from "@/lib/types";

export type WorkspaceUserPresentation = {
  userInitial: string;
  userLabel: string;
  userRole: string;
};

export function getWorkspaceUserPresentation(
  user: AuthenticatedUser
): WorkspaceUserPresentation {
  const userLabel = user.name ?? user.email;

  return {
    userInitial: userLabel.charAt(0).toUpperCase(),
    userLabel,
    userRole: user.role ?? "Sin role"
  };
}
