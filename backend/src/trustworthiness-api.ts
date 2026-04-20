import { TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS } from "./airtable.js";

export type UpdateTrustworthinessBody = {
  credibilityAiJson?: string | null;
  credibilityPoints?: number | null;
  feedback?: string;
  groupThinkingAiJson?: string | null;
  groupThinkingPoints?: number | null;
  intimacyAiJson?: string | null;
  intimacyPoints?: number | null;
  ratingStatus?: "Pending" | "Done";
  reliabilityAiJson?: string | null;
  reliabilityPoints?: number | null;
};

export type SuggestionBody = {
  end?: string;
  participantEmail?: string;
  start?: string;
};

export type FeedbackSuggestionBody = {
  evaluatedName?: string;
  existingFeedback?: string | null;
  pillars?: Record<
    "reliability" | "intimacy" | "groupThinking" | "credibility",
    {
      aiSuggestion?: unknown;
      meaning?: string;
      points?: number;
    }
  >;
  projectContext?: string | null;
  roleLabel?: string | null;
};

export type AssistantSessionBody = {
  end?: string;
  evaluatedName?: string;
  existingFeedback?: string | null;
  participantEmail?: string;
  projectContext?: string | null;
  roleLabel?: string | null;
  start?: string;
};

export type AssistantMessageBody = {
  evaluatedName?: string;
  history?: Array<{
    content?: string;
    role?: "assistant" | "user";
  }>;
  meetings?: Array<{
    actionItems?: string[];
    coachingAnalysis?: string | null;
    coachingSummary?: string | null;
    meetingDatetime?: string | null;
    meetingId?: string;
    metricsScores?: Record<string, number | null>;
    title?: string;
    topics?: string[];
    transcriptSummary?: string | null;
  }>;
  projectContext?: string | null;
  prompt?: string;
  proposal?: {
    credibilityPoints?: number;
    feedback?: string;
    groupThinkingPoints?: number;
    intimacyPoints?: number;
    reliabilityPoints?: number;
  };
  roleLabel?: string | null;
  suggestion?: Record<string, unknown>;
};

export type AssistantSaveBody = {
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

export type TrustworthinessSuggestionStage =
  keyof typeof TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS;

export const trustworthinessSuggestionStageLabels =
  TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS;
export const trustworthinessTextEncoder = new TextEncoder();

export function getPathSegments(request: Request) {
  const { pathname } = new URL(request.url);

  return pathname.split("/").filter(Boolean);
}

export function getPathSegmentFromEnd(request: Request, indexFromEnd: number) {
  const segments = getPathSegments(request);

  return segments.at(-(indexFromEnd + 1)) ?? "";
}

export function getTrimmedQueryParam(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key)?.trim();
}

export function getNormalizedEmailParam(searchParams: URLSearchParams, key: string) {
  return getTrimmedQueryParam(searchParams, key)?.toLowerCase();
}

export function badRequestResponse(message: string) {
  return Response.json(
    {
      ok: false,
      message
    },
    { status: 400 }
  );
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function getErrorStatus(message: string) {
  if (message === "No autorizado para editar esta evaluación.") {
    return 403;
  }

  if (message === "Solo se pueden editar evaluaciones con status Pending.") {
    return 409;
  }

  if (
    message === "No se encontró la evaluación solicitada." ||
    message === "No se encontró una reunión válida para este contexto."
  ) {
    return 404;
  }

  if (
    message.includes("obligatorio") ||
    message.includes("debe") ||
    message.includes("No hay reuniones suficientes") ||
    message.includes("Hay reuniones, pero no hay evidencia textual suficiente") ||
    message.includes("no corresponde") ||
    message.includes("otro talento") ||
    message.includes("cantidad válida") ||
    message.includes("puntaje válido") ||
    message.includes("meaning suficiente")
  ) {
    return 400;
  }

  return 500;
}

export function trustworthinessErrorResponse(error: unknown, fallbackMessage: string) {
  const message = getErrorMessage(error, fallbackMessage);

  return Response.json(
    {
      ok: false,
      message
    },
    { status: getErrorStatus(message) }
  );
}
