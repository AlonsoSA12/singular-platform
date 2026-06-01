import { NextResponse } from "next/server";
import { saveTrustworthinessAssistantProposalInBackend } from "@/lib/trustworthiness";
import { readSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const { recordId } = await context.params;
    const body = (await request.json()) as {
      agentId?: string;
      agentVersion?: string;
      confirmedByUser?: boolean;
      context?: {
        end?: string;
        meetingsCount?: number;
        participantEmail?: string;
        recordId?: string;
        start?: string;
      };
      proposal?: {
        credibilityPoints?: number;
        feedback?: string;
        groupThinkingPoints?: number;
        intimacyPoints?: number;
        reliabilityPoints?: number;
      };
      ratingStatus?: "Pending" | "Done";
      twSuggestion?: Record<string, unknown>;
    };

    if (!body.confirmedByUser) {
      return NextResponse.json(
        { message: "Debes confirmar explícitamente antes de guardar." },
        { status: 400 }
      );
    }

    if (!body.proposal || !body.context || !body.twSuggestion) {
      return NextResponse.json(
        { message: "Falta la propuesta o el contexto del asistente." },
        { status: 400 }
      );
    }

    if (body.ratingStatus !== "Pending" && body.ratingStatus !== "Done") {
      return NextResponse.json(
        { message: "El status debe ser Pending o Done." },
        { status: 400 }
      );
    }

    const participantEmail = body.context.participantEmail?.trim().toLowerCase();
    const start = body.context.start?.trim();
    const end = body.context.end?.trim();

    if (!participantEmail || !start || !end) {
      return NextResponse.json(
        { message: "El contexto del chat está incompleto." },
        { status: 400 }
      );
    }

    const payload = await saveTrustworthinessAssistantProposalInBackend(
      recordId,
      session.email,
      {
        agentId: body.agentId ?? "",
        agentVersion: body.agentVersion ?? "",
        confirmedByUser: true,
        context: {
          end,
          meetingsCount: body.context.meetingsCount ?? -1,
          participantEmail,
          recordId: body.context.recordId ?? "",
          start
        },
        proposal: {
          credibilityPoints: body.proposal.credibilityPoints ?? 0,
          feedback: body.proposal.feedback ?? "",
          groupThinkingPoints: body.proposal.groupThinkingPoints ?? 0,
          intimacyPoints: body.proposal.intimacyPoints ?? 0,
          reliabilityPoints: body.proposal.reliabilityPoints ?? 0
        },
        ratingStatus: body.ratingStatus,
        twSuggestion: body.twSuggestion
      }
    );

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible guardar la propuesta del asistente.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
