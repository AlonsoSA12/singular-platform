import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  createTrustworthinessSuggestion,
  findUserByEmail,
  getCoachingInputLogTranscript,
  listCoachingInputLogs,
  listTrustworthinessRecords,
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
  feedback?: string;
  groupThinkingPoints?: number | null;
  intimacyPoints?: number | null;
  reliabilityPoints?: number | null;
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
      ...(Object.prototype.hasOwnProperty.call(request.body, "feedback")
        ? { "Feedback": request.body.feedback ?? "" }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "groupThinkingPoints")
        ? { "Group Thinking Points": request.body.groupThinkingPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "intimacyPoints")
        ? { "Intimacy Points": request.body.intimacyPoints ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(request.body, "reliabilityPoints")
        ? { "Reliability Points": request.body.reliabilityPoints ?? null }
        : {})
    };
    const record = await updateTrustworthinessRecord(request.params.recordId, evaluatorEmail, fields);

    return reply.send({
      ok: true,
      record
    });
  });

  return app;
}
