import { NextResponse } from "next/server";
import { getTrustworthinessAssistantConfigFromBackend } from "@/lib/trustworthiness";
import { readSession } from "@/lib/session";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const config = await getTrustworthinessAssistantConfigFromBackend();

    return NextResponse.json({
      config,
      ok: true
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible leer la configuracion del agente.";

    return NextResponse.json({ message, ok: false }, { status: 502 });
  }
}
