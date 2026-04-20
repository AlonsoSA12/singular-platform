import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  createTrustworthinessAssistantReply,
  createTrustworthinessAssistantSession,
  createTrustworthinessFeedback,
  createTrustworthinessSuggestion,
  findUserByEmail,
  getCoachingInputLogTranscript,
  listCoachingInputLogs,
  listTrustworthinessRecords,
  saveTrustworthinessAssistantProposal,
  TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS,
  updateTrustworthinessRecord
} from "../src/airtable.js";
import { appConfig } from "../src/config.js";

type ValidateEmailBody = {
  email?: string;
};

type TrustworthinessQuery = {
  evaluatorEmail?: string;
  period?: string | string[];
};

type CoachingInputLogQuery = {
  activeEmail?: string;
  end?: string;
  participantEmail?: string;
  period?: string | string[];
  start?: string;
};

type UpdateTrustworthinessParams = {
  recordId: string;
};

type UpdateTrustworthinessBody = {
  credibilityPoints?: number | null;
  credibilityAiJson?: string | null;
  feedback?: string;
  groupThinkingPoints?: number | null;
  groupThinkingAiJson?: string | null;
  intimacyPoints?: number | null;
  intimacyAiJson?: string | null;
  ratingStatus?: "Pending" | "Done";
  reliabilityPoints?: number | null;
  reliabilityAiJson?: string | null;
};

type CoachingTranscriptParams = {
  recordId: string;
};

type TrustworthinessSuggestionParams = {
  recordId: string;
};

type TrustworthinessSuggestionBody = {
  end?: string;
  participantEmail?: string;
  start?: string;
};

type FeedbackSuggestionBody = {
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

type AssistantSessionBody = {
  end?: string;
  evaluatedName?: string;
  existingFeedback?: string | null;
  participantEmail?: string;
  projectContext?: string | null;
  roleLabel?: string | null;
  start?: string;
};

type AssistantMessageBody = {
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

type AssistantSaveBody = {
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

type TrustworthinessSuggestionStreamEvent =
  | {
      label: string;
      stage: keyof typeof TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS;
      type: "stage";
    }
  | {
      data: Record<string, unknown>;
      type: "result";
    }
  | {
      message: string;
      stage: keyof typeof TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS | null;
      type: "error";
    };

export function buildServer() {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: [appConfig.frontendUrl],
    credentials: true
  });

  app.get("/health", async () => {
    return {
      ok: true,
      service: "singular-platform-api"
    };
  });

  app.post<{ Body: ValidateEmailBody }>("/auth/validate-email", async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();

    if (!email) {
      return reply.code(400).send({
        ok: false,
        message: "El email es obligatorio."
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return reply.code(401).send({
        ok: false,
        message: "Email no autorizado."
      });
    }

    return reply.send({
      ok: true,
      user
    });
  });

  app.get<{ Querystring: TrustworthinessQuery }>("/trustworthiness", async (request, reply) => {
    const periodQuery = request.query.period;
    const evaluatorEmail = request.query.evaluatorEmail?.trim().toLowerCase();
    const selectedPeriods = Array.isArray(periodQuery)
      ? periodQuery
      : periodQuery
        ? [periodQuery]
        : [];

    if (!evaluatorEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del evaluator es obligatorio."
      });
    }

    const payload = await listTrustworthinessRecords(selectedPeriods, evaluatorEmail);

    return reply.send({
      ok: true,
      ...payload
    });
  });

  app.get<{ Querystring: CoachingInputLogQuery }>(
    "/trustworthiness/coaching-context",
    async (request, reply) => {
      const periodQuery = request.query.period;
      const activeEmail = request.query.activeEmail?.trim().toLowerCase();
      const participantEmail = request.query.participantEmail?.trim().toLowerCase();
      const start = request.query.start?.trim();
      const end = request.query.end?.trim();
      const selectedPeriods = Array.isArray(periodQuery)
        ? periodQuery
        : periodQuery
          ? [periodQuery]
          : [];

      if (!participantEmail) {
        return reply.code(400).send({
          ok: false,
          message: "El email del talento es obligatorio."
        });
      }

      const payload = await listCoachingInputLogs(
        selectedPeriods,
        participantEmail,
        activeEmail,
        start && end ? { start, end } : undefined
      );

      return reply.send({
        ok: true,
        ...payload
      });
    }
  );

  app.get<{
    Params: CoachingTranscriptParams;
    Querystring: CoachingInputLogQuery;
  }>("/trustworthiness/coaching-context/:recordId/transcript", async (request, reply) => {
    const activeEmail = request.query.activeEmail?.trim().toLowerCase();
    const participantEmail = request.query.participantEmail?.trim().toLowerCase();
    const start = request.query.start?.trim();
    const end = request.query.end?.trim();

    if (!participantEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del talento es obligatorio."
      });
    }

    if (!start || !end) {
      return reply.code(400).send({
        ok: false,
        message: "El rango total start/end es obligatorio."
      });
    }

    const transcript = await getCoachingInputLogTranscript(
      request.params.recordId,
      participantEmail,
      activeEmail,
      { start, end }
    );

    return reply.send({
      ok: true,
      ...transcript
    });
  });

  app.post<{
    Body: TrustworthinessSuggestionBody;
    Params: TrustworthinessSuggestionParams;
    Querystring: { activeEmail?: string; evaluatorEmail?: string };
  }>("/trustworthiness/:recordId/suggestion", async (request, reply) => {
    const activeEmail = request.query.activeEmail?.trim().toLowerCase();
    const evaluatorEmail = request.query.evaluatorEmail?.trim().toLowerCase();
    const participantEmail = request.body.participantEmail?.trim().toLowerCase();
    const start = request.body.start?.trim();
    const end = request.body.end?.trim();

    if (!evaluatorEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del evaluator es obligatorio."
      });
    }

    if (!participantEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del talento es obligatorio."
      });
    }

    if (!start || !end) {
      return reply.code(400).send({
        ok: false,
        message: "El rango total start/end es obligatorio."
      });
    }

    const suggestion = await createTrustworthinessSuggestion(
      request.params.recordId,
      participantEmail,
      activeEmail,
      { start, end }
    );

    return reply.send({
      ok: true,
      evaluatorEmail,
      ...suggestion
    });
  });

  app.post<{
    Body: TrustworthinessSuggestionBody;
    Params: TrustworthinessSuggestionParams;
    Querystring: { activeEmail?: string; evaluatorEmail?: string };
  }>("/trustworthiness/:recordId/suggestion/stream", async (request, reply) => {
    reply.hijack();

    const response = reply.raw;
    let currentStage: keyof typeof TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS | null =
      "validating_evaluation_data";

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders?.();

    const writeEvent = (event: TrustworthinessSuggestionStreamEvent) => {
      response.write(`${JSON.stringify(event)}\n`);
    };

    const writeStage = (
      stage: keyof typeof TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS
    ) => {
      currentStage = stage;
      writeEvent({
        label: TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS[stage],
        stage,
        type: "stage"
      });
    };

    try {
      const activeEmail = request.query.activeEmail?.trim().toLowerCase();
      const evaluatorEmail = request.query.evaluatorEmail?.trim().toLowerCase();
      const participantEmail = request.body.participantEmail?.trim().toLowerCase();
      const start = request.body.start?.trim();
      const end = request.body.end?.trim();

      writeStage("validating_evaluation_data");

      if (!evaluatorEmail) {
        throw new Error("El email del evaluator es obligatorio.");
      }

      if (!participantEmail) {
        throw new Error("El email del talento es obligatorio.");
      }

      if (!start || !end) {
        throw new Error("El rango total start/end es obligatorio.");
      }

      const suggestion = await createTrustworthinessSuggestion(
        request.params.recordId,
        participantEmail,
        activeEmail,
        { start, end },
        writeStage
      );

      writeEvent({
        data: {
          ok: true,
          evaluatorEmail,
          ...suggestion
        },
        type: "result"
      });
    } catch (error) {
      writeEvent({
        message:
          error instanceof Error
            ? error.message
            : "No fue posible generar la sugerencia TW.",
        stage: currentStage,
        type: "error"
      });
    } finally {
      response.end();
    }
  });

  app.post<{
    Body: AssistantSessionBody;
    Params: TrustworthinessSuggestionParams;
    Querystring: { activeEmail?: string; evaluatorEmail?: string };
  }>("/trustworthiness/:recordId/assistant/session", async (request, reply) => {
    const activeEmail = request.query.activeEmail?.trim().toLowerCase();
    const evaluatorEmail = request.query.evaluatorEmail?.trim().toLowerCase();
    const participantEmail = request.body.participantEmail?.trim().toLowerCase();
    const evaluatedName = request.body.evaluatedName?.trim();
    const start = request.body.start?.trim();
    const end = request.body.end?.trim();

    if (!evaluatorEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del evaluator es obligatorio."
      });
    }

    if (!participantEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del talento es obligatorio."
      });
    }

    if (!evaluatedName) {
      return reply.code(400).send({
        ok: false,
        message: "El nombre del talento es obligatorio."
      });
    }

    if (!start || !end) {
      return reply.code(400).send({
        ok: false,
        message: "El rango total start/end es obligatorio."
      });
    }

    const session = await createTrustworthinessAssistantSession({
      activeSessionEmail: activeEmail,
      end,
      evaluatedName,
      evaluatorEmail,
      existingFeedback: request.body.existingFeedback ?? null,
      participantEmail,
      projectContext: request.body.projectContext ?? null,
      recordId: request.params.recordId,
      roleLabel: request.body.roleLabel ?? null,
      start
    });

    return reply.send({
      ok: true,
      ...session
    });
  });

  app.post<{
    Body: AssistantMessageBody;
    Params: TrustworthinessSuggestionParams;
  }>("/trustworthiness/:recordId/assistant/message", async (request, reply) => {
    const prompt = request.body.prompt?.trim();
    const evaluatedName = request.body.evaluatedName?.trim();

    if (!prompt) {
      return reply.code(400).send({
        ok: false,
        message: "El prompt del usuario es obligatorio."
      });
    }

    if (!evaluatedName) {
      return reply.code(400).send({
        ok: false,
        message: "El nombre del talento es obligatorio."
      });
    }

    if (!request.body.proposal || !request.body.suggestion || !request.body.meetings) {
      return reply.code(400).send({
        ok: false,
        message: "Falta contexto para continuar con el asistente."
      });
    }

    const assistantReply = await createTrustworthinessAssistantReply({
      evaluatedName,
      history: Array.isArray(request.body.history)
        ? request.body.history
            .filter(
              (message): message is { content: string; role: "assistant" | "user" } =>
                (message.role === "assistant" || message.role === "user") &&
                typeof message.content === "string" &&
                message.content.trim().length > 0
            )
            .map((message) => ({
              content: message.content.trim(),
              role: message.role
            }))
        : [],
      meetings: Array.isArray(request.body.meetings)
        ? request.body.meetings.map((meeting) => ({
            actionItems: Array.isArray(meeting.actionItems) ? meeting.actionItems : [],
            coachingAnalysis:
              typeof meeting.coachingAnalysis === "string" ? meeting.coachingAnalysis : null,
            coachingSummary:
              typeof meeting.coachingSummary === "string" ? meeting.coachingSummary : null,
            meetingDatetime:
              typeof meeting.meetingDatetime === "string" ? meeting.meetingDatetime : null,
            meetingId:
              typeof meeting.meetingId === "string" ? meeting.meetingId : "unknown-meeting",
            metricsScores:
              meeting.metricsScores && typeof meeting.metricsScores === "object"
                ? meeting.metricsScores
                : {},
            title: typeof meeting.title === "string" ? meeting.title : "Reunión sin título",
            topics: Array.isArray(meeting.topics) ? meeting.topics : [],
            transcriptSummary:
              typeof meeting.transcriptSummary === "string" ? meeting.transcriptSummary : null
          }))
        : [],
      projectContext: request.body.projectContext ?? null,
      prompt,
      proposal: {
        credibilityPoints: request.body.proposal.credibilityPoints ?? 0,
        feedback: request.body.proposal.feedback ?? "",
        groupThinkingPoints: request.body.proposal.groupThinkingPoints ?? 0,
        intimacyPoints: request.body.proposal.intimacyPoints ?? 0,
        reliabilityPoints: request.body.proposal.reliabilityPoints ?? 0
      },
      roleLabel: request.body.roleLabel ?? null,
      suggestion: request.body.suggestion
    });

    return reply.send({
      ok: true,
      ...assistantReply
    });
  });

  app.post<{
    Body: AssistantSaveBody;
    Params: TrustworthinessSuggestionParams;
    Querystring: { evaluatorEmail?: string };
  }>("/trustworthiness/:recordId/assistant/save", async (request, reply) => {
    const evaluatorEmail = request.query.evaluatorEmail?.trim().toLowerCase();

    if (!evaluatorEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del evaluator es obligatorio."
      });
    }

    const record = await saveTrustworthinessAssistantProposal(
      request.params.recordId,
      evaluatorEmail,
      {
        agentId: request.body.agentId,
        agentVersion: request.body.agentVersion,
        confirmedByUser: request.body.confirmedByUser,
        context: request.body.context,
        proposal: request.body.proposal
          ? {
              credibilityPoints: request.body.proposal.credibilityPoints ?? 0,
              feedback: request.body.proposal.feedback ?? "",
              groupThinkingPoints: request.body.proposal.groupThinkingPoints ?? 0,
              intimacyPoints: request.body.proposal.intimacyPoints ?? 0,
              reliabilityPoints: request.body.proposal.reliabilityPoints ?? 0
            }
          : undefined,
        ratingStatus: request.body.ratingStatus,
        twSuggestion: request.body.twSuggestion
      }
    );

    return reply.send({
      ok: true,
      record
    });
  });

  app.patch<{
    Body: UpdateTrustworthinessBody;
    Params: UpdateTrustworthinessParams;
    Querystring: { evaluatorEmail?: string };
  }>("/trustworthiness/:recordId", async (request, reply) => {
    const evaluatorEmail = request.query.evaluatorEmail?.trim().toLowerCase();

    if (!evaluatorEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del evaluator es obligatorio."
      });
    }

    const fields = {
      ...(Object.prototype.hasOwnProperty.call(request.body, "credibilityPoints")
        ? { "Credibility Points": request.body.credibilityPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "credibilityAiJson")
        ? { "Credibility AI JSON": request.body.credibilityAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "feedback")
        ? { "Feedback": request.body.feedback ?? "" }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "groupThinkingPoints")
        ? { "Group Thinking Points": request.body.groupThinkingPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "groupThinkingAiJson")
        ? { "Group Thinking Points AI JSON": request.body.groupThinkingAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "intimacyPoints")
        ? { "Intimacy Points": request.body.intimacyPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "intimacyAiJson")
        ? { "Intimacy AI JSON": request.body.intimacyAiJson ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "ratingStatus")
        ? { "Rating Status": request.body.ratingStatus }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "reliabilityPoints")
        ? { "Reliability Points": request.body.reliabilityPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "reliabilityAiJson")
        ? { "Reliability AI JSON": request.body.reliabilityAiJson ?? null }
        : {})
    };
    const record = await updateTrustworthinessRecord(request.params.recordId, evaluatorEmail, fields);

    return reply.send({
      ok: true,
      record
    });
  });

  app.post<{
    Body: FeedbackSuggestionBody;
    Params: UpdateTrustworthinessParams;
    Querystring: { evaluatorEmail?: string };
  }>("/trustworthiness/:recordId/feedback-suggestion", async (request, reply) => {
    const evaluatorEmail = request.query.evaluatorEmail?.trim().toLowerCase();

    if (!evaluatorEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del evaluator es obligatorio."
      });
    }

    if (!request.body.evaluatedName?.trim()) {
      return reply.code(400).send({
        ok: false,
        message: "El nombre del talento es obligatorio para generar feedback."
      });
    }

    if (!request.body.pillars) {
      return reply.code(400).send({
        ok: false,
        message: "Los pilares son obligatorios para generar feedback."
      });
    }

    const feedback = await createTrustworthinessFeedback(request.params.recordId, evaluatorEmail, {
      evaluatedName: request.body.evaluatedName.trim(),
      existingFeedback: request.body.existingFeedback ?? null,
      pillars: {
        credibility: {
          aiSuggestion: request.body.pillars.credibility?.aiSuggestion,
          meaning: request.body.pillars.credibility?.meaning ?? "",
          points: request.body.pillars.credibility?.points ?? 0
        },
        groupThinking: {
          aiSuggestion: request.body.pillars.groupThinking?.aiSuggestion,
          meaning: request.body.pillars.groupThinking?.meaning ?? "",
          points: request.body.pillars.groupThinking?.points ?? 0
        },
        intimacy: {
          aiSuggestion: request.body.pillars.intimacy?.aiSuggestion,
          meaning: request.body.pillars.intimacy?.meaning ?? "",
          points: request.body.pillars.intimacy?.points ?? 0
        },
        reliability: {
          aiSuggestion: request.body.pillars.reliability?.aiSuggestion,
          meaning: request.body.pillars.reliability?.meaning ?? "",
          points: request.body.pillars.reliability?.points ?? 0
        }
      },
      projectContext: request.body.projectContext ?? null,
      roleLabel: request.body.roleLabel ?? null
    });

    return reply.send({
      feedback,
      ok: true
    });
  });

  return app;
}
