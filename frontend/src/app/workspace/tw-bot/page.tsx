import { redirect } from "next/navigation";
import { TwBotWorkspace } from "@/components/tw-bot/tw-bot-workspace";
import { WorkspacePageFrame } from "@/components/workspace-page-frame";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { readSession } from "@/lib/session";
import { getWorkspaceUserPresentation } from "@/lib/workspace-user";

export default async function WorkspaceTwBotPage() {
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
      mainClassName="client-okrs-workspace-main okr-bot-workspace-main tw-bot-workspace-main"
      subtitle="Trustworthiness evaluation assistant"
      title="TW Bot"
    >
      <TwBotWorkspace />
    </WorkspacePageFrame>
  );
}
