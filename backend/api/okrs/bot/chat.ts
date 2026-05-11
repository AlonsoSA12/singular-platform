import { createOkrBotReply, type OkrBotAction } from "../../../src/okrs/bot-assistant.js";

type OkrBotMessageBody = {
  action?: OkrBotAction;
  activeProposal?: {
    draft?: unknown;
    operation?: "create" | "edit";
    targetType?: "key_project" | "key_result" | "objective";
  };
  collaboratorEmail?: string;
  conversationHistory?: Array<{
    role?: "assistant" | "user";
    text?: string;
  }>;
  memoryLimit?: number;
  message?: string;
  objectiveId?: string;
  projectId?: string;
  projectName?: string;
  targetLabel?: string;
  targetId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OkrBotMessageBody;
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return Response.json(
        {
          ok: false,
          message: "El projectId es obligatorio."
        },
        { status: 400 }
      );
    }

    const payload = await createOkrBotReply({
      action: body.action,
      activeProposal: body.activeProposal,
      collaboratorEmail: body.collaboratorEmail?.trim().toLowerCase(),
      conversationHistory: body.conversationHistory,
      memoryLimit: body.memoryLimit,
      message: body.message,
      objectiveId: body.objectiveId,
      projectId,
      projectName: body.projectName,
      targetLabel: body.targetLabel,
      targetId: body.targetId
    });

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "No fue posible consultar el OKR Bot."
      },
      { status: 500 }
    );
  }
}
