import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await readSession();
  if (session) {
    redirect("/workspace");
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="hero-panel">
          <p className="eyebrow">Singular Barcelo</p>
          <h2>Arquitectura inicial para una entrada simple, segura y desacoplada.</h2>
          <p>
            El backend valida usuarios contra Airtable. El frontend mantiene la sesion y
            expone un espacio de trabajo minimo para evolucionar el producto.
          </p>
          <div className="hero-grid">
            <div>
              <span>Frontend</span>
              <strong>Next.js</strong>
            </div>
            <div>
              <span>Backend</span>
              <strong>Fastify</strong>
            </div>
            <div>
              <span>Source of truth</span>
              <strong>Airtable</strong>
            </div>
          </div>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
