import { NextResponse } from "next/server";
import { analyzeAgilePortfolioInBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projects = Array.isArray(body?.projects) ? body.projects : [];

    if (projects.length === 0) {
      return NextResponse.json({ message: "La lista de Projects es obligatoria." }, { status: 400 });
    }

    const payload = await analyzeAgilePortfolioInBackend({
      generatedFor: typeof body?.generatedFor === "string" ? body.generatedFor : "",
      portfolioScore: typeof body?.portfolioScore === "number" ? body.portfolioScore : null,
      projects
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No fue posible generar el Portfolio Analysis." },
      { status: 502 }
    );
  }
}
