import type { AuthenticatedUser } from "@/lib/types";

export type WorkspaceUserPresentation = {
  userEmail: string;
  userInitial: string;
  userLabel: string;
  userRole: string;
};

export function getWorkspaceUserPresentation(
  user: AuthenticatedUser
): WorkspaceUserPresentation {
  const userLabel = user.name ?? user.email;

  return {
    userEmail: user.email,
    userInitial: userLabel.charAt(0).toUpperCase(),
    userLabel,
    userRole: user.role ?? "Sin role"
  };
}
