import { NextResponse } from "next/server";
import { sendOkrBotMessageInBackend, type OkrBotChatInput } from "@/lib/okrs";
import { readSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as OkrBotChatInput;
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json({ message: "El projectId es obligatorio." }, { status: 400 });
    }

    const payload = await sendOkrBotMessageInBackend({
      action: body.action,
      activeProposal: body.activeProposal,
      collaboratorEmail: session.email,
      conversationHistory: body.conversationHistory,
      memoryLimit: body.memoryLimit,
      message: body.message,
      objectiveId: body.objectiveId,
      projectId,
      projectName: body.projectName,
      targetLabel: body.targetLabel,
      targetId: body.targetId
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar el OKR Bot.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
