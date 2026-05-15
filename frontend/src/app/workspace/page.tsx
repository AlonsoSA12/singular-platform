import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import {
  getWorkspaceModuleHref,
  readWorkspaceModuleCookie,
  WORKSPACE_LAST_VIEW_COOKIE
} from "@/lib/workspace-navigation";

export default async function WorkspacePage() {
  const user = await readSession();

  if (!user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const requestedModule = readWorkspaceModuleCookie(
    cookieStore.get(WORKSPACE_LAST_VIEW_COOKIE)?.value
  );

  redirect(getWorkspaceModuleHref(requestedModule));
}
