import { redirect } from "next/navigation";
import { OkrsWorkspaceDataProvider } from "@/components/okrs-workspace-data-context";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceUserProvider } from "@/components/workspace-user-context";
import { readSession } from "@/lib/session";
import { getWorkspaceUserPresentation } from "@/lib/workspace-user";

export default async function WorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await readSession();

  if (!user) {
    redirect("/");
  }

  const workspaceUser = getWorkspaceUserPresentation(user);

  return (
    <WorkspaceUserProvider value={workspaceUser}>
      <OkrsWorkspaceDataProvider>
        <WorkspaceShell userInitial={workspaceUser.userInitial}>{children}</WorkspaceShell>
      </OkrsWorkspaceDataProvider>
    </WorkspaceUserProvider>
  );
}
