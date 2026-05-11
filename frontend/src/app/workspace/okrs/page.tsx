import { redirect } from "next/navigation";
import { ClientOkrsMock } from "@/components/client-okrs-mock";
import { WorkspacePageFrame } from "@/components/workspace-page-frame";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { readSession } from "@/lib/session";
import { getWorkspaceUserPresentation } from "@/lib/workspace-user";

export default async function WorkspaceOkrsPage() {
  const user = await readSession();

  if (!user) {
    redirect("/");
  }

  const workspaceUser = getWorkspaceUserPresentation(user);

  return (
    <WorkspacePageFrame
      actions={
        <WorkspaceSettings
          userInitial={workspaceUser.userInitial}
          userLabel={workspaceUser.userLabel}
          userRole={workspaceUser.userRole}
          variant="header"
        />
      }
      eyebrow="Workspace"
      mainClassName="client-okrs-workspace-main"
      subtitle="Projects, Objectives, Key Projects and Key Results"
      title="OKRs"
    >
      <ClientOkrsMock syncProjectInUrl />
    </WorkspacePageFrame>
  );
}
