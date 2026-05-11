import { NextResponse } from "next/server";
import { generateAgileKeyResultDraftInBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = await generateAgileKeyResultDraftInBackend({
      existingKeyResults: Array.isArray(body?.existingKeyResults) ? body.existingKeyResults : [],
      idea: typeof body?.idea === "string" ? body.idea : "",
      objective: body?.objective ?? null,
      projectId: typeof body?.projectId === "string" ? body.projectId : "",
      projectName: typeof body?.projectName === "string" ? body.projectName : ""
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No fue posible generar el Key Result con IA." },
      { status: 502 }
    );
  }
}
