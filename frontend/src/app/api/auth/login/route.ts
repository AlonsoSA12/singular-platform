import { NextResponse } from "next/server";
import { validateEmailAgainstBackend } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "El email es obligatorio." },
        { status: 400 }
      );
    }

    const user = await validateEmailAgainstBackend(email);
    await createSession(user);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible iniciar sesion.";

    const status =
      message === "Email no autorizado." || message === "El email es obligatorio."
        ? 401
        : 502;

    return NextResponse.json({ message }, { status });
  }
}
