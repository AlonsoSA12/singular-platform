import { analyzeAgilePortfolio } from "../../src/okrs/ai-portfolio-analysis.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projects = Array.isArray(body?.projects) ? body.projects : [];

    if (projects.length === 0) {
      return Response.json(
        {
          ok: false,
          message: "La lista de Projects es obligatoria."
        },
        { status: 400 }
      );
    }

    const payload = await analyzeAgilePortfolio({
      generatedFor: typeof body?.generatedFor === "string" ? body.generatedFor : "",
      portfolioScore: typeof body?.portfolioScore === "number" ? body.portfolioScore : null,
      projects
    });

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "No fue posible generar el Portfolio Analysis."
      },
      { status: 500 }
    );
  }
}
