import { redirect } from "next/navigation";
import { OkrBotWorkspace } from "@/components/okr-bot/okr-bot-workspace";
import { WorkspacePageFrame } from "@/components/workspace-page-frame";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { readSession } from "@/lib/session";
import { getWorkspaceUserPresentation } from "@/lib/workspace-user";

export default async function WorkspaceOkrBotPage() {
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
      mainClassName="client-okrs-workspace-main okr-bot-workspace-main"
      subtitle="Assistant workspace for Objective, Key Result and Key Project proposals"
      title="OKR Bot"
    >
      <OkrBotWorkspace />
    </WorkspacePageFrame>
  );
}
