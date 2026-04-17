import { redirect } from "next/navigation";
import { WorkspaceShellContent } from "@/components/workspace-shell-content";
import { readSession } from "@/lib/session";

export default async function WorkspacePage() {
  const user = await readSession();

  if (!user) {
    redirect("/");
  }

  const userLabel = user.name ?? user.email;
  const userInitial = userLabel.charAt(0).toUpperCase();

  return (
    <main className="workspace-shell">
      <aside className="workspace-rail" aria-label="Primary">
        <div className="workspace-rail-brand">
          <div className="workspace-rail-logo" aria-hidden="true">
            S
          </div>
        </div>

        <nav className="workspace-rail-nav">
          <button
            className="workspace-rail-link is-active"
            title="Monthly Trustworthiness"
            type="button"
          >
            <span className="workspace-rail-link-icon" aria-hidden="true">
              TW
            </span>
            <span className="workspace-rail-link-label">Monthly</span>
          </button>
        </nav>

        <div className="workspace-rail-footer">
          <div className="workspace-rail-user-badge" aria-hidden="true">
            {userInitial}
          </div>
        </div>
      </aside>

      <WorkspaceShellContent
        userInitial={userInitial}
        userLabel={userLabel}
        userRole={user.role ?? "Sin role"}
      />
    </main>
  );
}
