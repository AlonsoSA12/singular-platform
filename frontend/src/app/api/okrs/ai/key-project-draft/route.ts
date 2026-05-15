import { NextResponse } from "next/server";
import { generateAgileKeyProjectDraftInBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = await generateAgileKeyProjectDraftInBackend({
      existingKeyProjects: Array.isArray(body?.existingKeyProjects) ? body.existingKeyProjects : [],
      existingKeyResults: Array.isArray(body?.existingKeyResults) ? body.existingKeyResults : [],
      idea: typeof body?.idea === "string" ? body.idea : "",
      objectives: Array.isArray(body?.objectives) ? body.objectives : [],
      projectId: typeof body?.projectId === "string" ? body.projectId : "",
      projectName: typeof body?.projectName === "string" ? body.projectName : "",
      selectedKeyResult: body?.selectedKeyResult ?? null
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No fue posible generar el Key Project con IA." },
      { status: 502 }
    );
  }
}
