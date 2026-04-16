import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { readSession } from "@/lib/session";

export default async function WorkspacePage() {
  const user = await readSession();

  if (!user) {
    redirect("/");
  }

  const userLabel = user.name ?? user.email;
  const userInitial = userLabel.charAt(0).toUpperCase();

  return (
    <main className="workspace-page">
      <aside className="workspace-sidebar">
        <div className="sidebar-header">
          <p className="eyebrow">Workspace</p>
          <h1>Singular Platform</h1>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          <button className="nav-item nav-item-active" type="button">
            Trustworthiness
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{userInitial}</div>
            <div>
              <p className="user-name">{userLabel}</p>
              <p className="user-email">{user.email}</p>
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="secondary-button" type="button">
              Settings
            </button>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-header">
          <p className="eyebrow">Trustworthiness</p>
          <h2>Bienvenidos</h2>
        </div>
      </section>
    </main>
  );
}
