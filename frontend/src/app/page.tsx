import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await readSession();
  if (session) {
    redirect("/workspace");
  }

  return (
    <main className="ss-login-page">
      <section className="ss-login-shell" aria-label="Singular Stories sign in">
        <div className="ss-login-hero-copy">
          <h1>
            <span>
              Where <strong>top talent</strong>
            </span>
            <span>
              meets <strong>ambitious projects</strong>
            </span>
          </h1>
          <p>The operating system for elite development teams</p>
        </div>

        <LoginForm />

        <p className="ss-login-help">
          Need help? Contact{" "}
          <a href="mailto:support@singularagency.co">support@singularagency.co</a>
        </p>
      </section>

      <img
        alt="Singular Stories"
        className="ss-login-logo"
        height={35}
        src="/images/logo-dark.png"
        width={140}
      />
    </main>
  );
}
