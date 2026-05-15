import cors from "@fastify/cors";
import Fastify from "fastify";
import { analyzeAgileKeyResultSentiments } from "../src/okrs/ai-key-result-sentiment.js";
import { analyzeAgileObjectiveHealth } from "../src/okrs/ai-objective-health.js";
import { analyzeAgilePortfolio } from "../src/okrs/ai-portfolio-analysis.js";
import {
  generateAgileKeyProjectDraft,
  generateAgileKeyResultEditDraft,
  generateAgileKeyResultDraft,
  generateAgileObjectiveDraft
} from "../src/okrs/ai-drafts.js";
import { createAgileKeyProject, listAgileKeyProjectsForProject } from "../src/okrs/airtable-key-projects.js";
import { listAgileKeyResultHistoryBulk } from "../src/okrs/airtable-key-result-history.js";
import { createAgileKeyResult, updateAgileKeyResult } from "../src/okrs/airtable-key-results.js";
import { createAgileObjective, listAgileObjectivesForProject } from "../src/okrs/airtable-objectives.js";
import { listAgileProjectsForCollaborator } from "../src/okrs/airtable-projects.js";
import { createOkrBotReply, type OkrBotAction } from "../src/okrs/bot-assistant.js";
import {
  createSingularAgileKeyProject,
  listSingularAgileKeyProjectsByIds,
  updateSingularAgileKeyProject
} from "../src/singular-agile/key-projects.js";
import {
  listSingularAgileKeyResultHistoryBulk,
  updateSingularAgileKeyResultHistory
} from "../src/singular-agile/key-result-history.js";
import {
  createSingularAgileKeyResult,
  updateSingularAgileKeyResult
} from "../src/singular-agile/key-results.js";
import {
  createSingularAgileObjective,
  updateSingularAgileObjective
} from "../src/singular-agile/objectives.js";
import { createTrustworthinessAssistantReply, streamTrustworthinessAssistantMessage } from "../src/trustworthiness/assistant-reply.js";
import { createTrustworthinessAssistantSession } from "../src/trustworthiness/assistant-session.js";
import { findUserByEmail, listTrustworthinessRecords } from "../src/trustworthiness/airtable-records.js";
import { saveTrustworthinessAssistantProposal, updateTrustworthinessRecord } from "../src/trustworthiness/airtable-update.js";
import { getCoachingInputLogTranscript, listCoachingInputLogs } from "../src/trustworthiness/coaching-logs.js";
import {
  createTrustworthinessFeedback,
  createTrustworthinessSuggestion,
  streamTrustworthinessSuggestion
} from "../src/trustworthiness/suggestions.js";
import { TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS } from "../src/trustworthiness/types.js";
import { appConfig, getAssistantRuntimeConfig } from "../src/config.js";
import type { AssistantStreamMessageBody } from "../src/trustworthiness-api.js";

type ValidateEmailBody = {
  email?: string;
};

type TrustworthinessQuery = {
  evaluatorEmail?: string;
  period?: string | string[];
};

type AgileProjectsQuery = {
  collaboratorEmail?: string;
};

const agileProjectsCache = new Map<
  string,
  {
    expiresAt: number;
    payload?: Awaited<ReturnType<typeof listAgileProjectsForCollaborator>>;
    promise?: ReturnType<typeof listAgileProjectsForCollaborator>;
  }
>();
const agileProjectsCacheTtlMs = 30_000;

type AgileObjectivesQuery = {
  projectId?: string;
};

type AgileKeyProjectsQuery = {
  projectId?: string;
};

type SingularAgileKeyProjectsQuery = {
  recordIds?: string;
};

type AgileKeyResultHistoryBulkBody = {
  keyResultIds?: string[];
};

type AgileKeyResultSentimentsBody = {
  keyResults?: Array<{
    code?: string;
    currentValue?: number | null;
    id?: string;
    initialValue?: number | null;
    metric?: string;
    progress?: number | null;
    status?: string;
    targetDate?: string;
    targetValue?: number | null;
    title?: string;
  }>;
};

type AgileObjectiveHealthBody = {
  keyProjects?: unknown[];
  objectives?: unknown[];
  project?: {
    id?: string;
    name?: string;
  };
};

type AgilePortfolioAnalysisBody = {
  generatedFor?: string;
  portfolioScore?: number | null;
  projects?: unknown[];
};

type AgileObjectiveDraftBody = {
  existingObjectives?: unknown[];
  idea?: string;
  keyProjects?: unknown[];
  projectId?: string;
  projectName?: string;
};

type AgileKeyResultDraftBody = {
  existingKeyResults?: unknown[];
  idea?: string;
  objective?: unknown;
  projectId?: string;
  projectName?: string;
};

type AgileKeyResultEditDraftBody = {
  currentKeyResult?: unknown;
  editInstructions?: string;
  keyResultHistory?: unknown[];
  objective?: unknown;
  projectId?: string;
  projectName?: string;
  siblingKeyResults?: unknown[];
};

type AgileKeyProjectDraftBody = {
  existingKeyProjects?: unknown[];
  existingKeyResults?: unknown[];
  idea?: string;
  objectives?: unknown[];
  projectId?: string;
  projectName?: string;
  selectedKeyResult?: unknown;
};

type CreateAgileObjectiveBody = {
  aiSuggestedKeyResults?: string;
  description?: string;
  explanation?: string;
  metric?: string;
  objective?: string;
  priority?: string;
  projectId?: string;
  quarter?: string;
  status?: "Achieved" | "In Progress" | "Pending Review" | "Underachieved";
  targetDate?: string;
  type?: string;
};

type CreateAgileKeyResultBody = {
  currentValue?: number | null;
  explanation?: string;
  initialValue?: number | null;
  keyResult?: string;
  metric?: string;
  objectiveId?: string;
  projectId?: string;
  quarter?: string;
  status?: "Done" | "In progress" | "Todo";
  targetDate?: string;
  targetValue?: number | null;
};

type UpdateAgileKeyResultBody = CreateAgileKeyResultBody & {
  recordId?: string;
};

type CreateAgileKeyProjectBody = {
  dontShowInSingularStories?: boolean;
  epicStory?: string;
  justification?: string;
  name?: string;
  projectId?: string;
  status?: "Active" | "Archived" | "Suggested by Resource";
  totalStories?: number | null;
};

type CreateSingularAgileKeyProjectBody = Record<string, unknown>;

type CreateSingularAgileKeyResultBody = Record<string, unknown>;

type UpdateSingularAgileKeyResultBody = Record<string, unknown> & {
  recordId?: string;
};

type UpdateSingularAgileKeyProjectBody = Record<string, unknown> & {
  recordId?: string;
};

type CreateSingularAgileObjectiveBody = Record<string, unknown>;

type UpdateSingularAgileObjectiveBody = Record<string, unknown> & {
  recordId?: string;
};

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
  existingFeedback?: string | null;
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
  meetings?: AssistantMessageBody["meetings"];
  participantEmail?: string;
  proposal?: AssistantMessageBody["proposal"];
  projectContext?: string | null;
  roleLabel?: string | null;
  start?: string;
  suggestion?: Record<string, unknown>;
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
      delta: string;
      type: "decision_trace_delta";
    }
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

  app.get("/trustworthiness/assistant/config", async () => {
    return {
      ok: true,
      config: getAssistantRuntimeConfig()
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

  app.get<{ Querystring: AgileProjectsQuery }>("/okrs/projects", async (request, reply) => {
    const collaboratorEmail = request.query.collaboratorEmail?.trim().toLowerCase();

    if (!collaboratorEmail) {
      return reply.code(400).send({
        ok: false,
        message: "El email del collaborator es obligatorio."
      });
    }

    const cachedEntry = agileProjectsCache.get(collaboratorEmail);
    const now = Date.now();

    if (cachedEntry && cachedEntry.expiresAt > now) {
      const payload = cachedEntry.payload ?? (await cachedEntry.promise);

      return reply.send({
        ok: true,
        ...payload
      });
    }

    const promise = listAgileProjectsForCollaborator(collaboratorEmail);
    agileProjectsCache.set(collaboratorEmail, {
      expiresAt: now + agileProjectsCacheTtlMs,
      promise
    });

    const payload = await promise;
    agileProjectsCache.set(collaboratorEmail, {
      expiresAt: Date.now() + agileProjectsCacheTtlMs,
      payload
    });

    return reply.send({
      ok: true,
      ...payload
    });
  });

  app.get<{ Querystring: AgileObjectivesQuery }>("/okrs/objectives", async (request, reply) => {
    const projectId = request.query.projectId?.trim();

    if (!projectId) {
      return reply.code(400).send({
        ok: false,
        message: "El projectId es obligatorio."
      });
    }

    const payload = await listAgileObjectivesForProject(projectId);

    return reply.send({
      ok: true,
      ...payload
    });
  });

  app.post<{ Body: CreateAgileObjectiveBody }>("/okrs/objectives", async (request, reply) => {
    const payload = await createAgileObjective({
      aiSuggestedKeyResults: request.body.aiSuggestedKeyResults,
      description: request.body.description,
      explanation: request.body.explanation,
      metric: request.body.metric,
      objective: request.body.objective ?? "",
      priority: request.body.priority,
      projectId: request.body.projectId ?? "",
      quarter: request.body.quarter,
      status: request.body.status,
      targetDate: request.body.targetDate,
      type: request.body.type
    });

    return reply.code(201).send({
      ok: true,
      ...payload
    });
  });

  app.post<{ Body: CreateAgileKeyResultBody }>("/okrs/key-results", async (request, reply) => {
    const payload = await createAgileKeyResult({
      currentValue: request.body.currentValue,
      explanation: request.body.explanation,
      initialValue: request.body.initialValue,
      keyResult: request.body.keyResult ?? "",
      metric: request.body.metric,
      objectiveId: request.body.objectiveId ?? "",
      projectId: request.body.projectId ?? "",
      quarter: request.body.quarter,
      status: request.body.status,
      targetDate: request.body.targetDate,
      targetValue: request.body.targetValue
    });

    return reply.code(201).send({
      ok: true,
      ...payload
    });
  });

  app.patch<{ Body: UpdateAgileKeyResultBody }>("/okrs/key-results", async (request, reply) => {
    const payload = await updateAgileKeyResult({
      currentValue: request.body.currentValue,
      explanation: request.body.explanation,
      initialValue: request.body.initialValue,
      keyResult: request.body.keyResult,
      metric: request.body.metric,
      objectiveId: request.body.objectiveId,
      projectId: request.body.projectId ?? "",
      quarter: request.body.quarter,
      recordId: request.body.recordId ?? "",
      status: request.body.status,
      targetDate: request.body.targetDate,
      targetValue: request.body.targetValue
    });

    return reply.send({
      ok: true,
      ...payload
    });
  });

  app.post<{ Body: AgileKeyResultHistoryBulkBody }>("/okrs/key-result-history/bulk", async (request, reply) => {
    const keyResultIds = Array.isArray(request.body.keyResultIds) ? request.body.keyResultIds : [];

    if (keyResultIds.length === 0) {
      return reply.code(400).send({
        ok: false,
        message: "La lista de Key Results es obligatoria."
      });
    }

    const payload = await listAgileKeyResultHistoryBulk(keyResultIds);

    return reply.send({
      ok: true,
      ...payload
    });
  });

  app.post<{ Body: AgileKeyResultSentimentsBody }>("/okrs/key-result-sentiments", async (request, reply) => {
    const keyResults = Array.isArray(request.body.keyResults) ? request.body.keyResults : [];

    if (keyResults.length === 0) {
      return reply.code(400).send({
        ok: false,
        message: "La lista de Key Results es obligatoria."
      });
    }

    const payload = await analyzeAgileKeyResultSentiments(
      keyResults
        .filter((keyResult) => keyResult.id)
        .map((keyResult) => ({
          code: keyResult.code,
          currentValue: keyResult.currentValue,
          id: keyResult.id ?? "",
          initialValue: keyResult.initialValue,
          metric: keyResult.metric,
          progress: keyResult.progress,
          status: keyResult.status,
          targetDate: keyResult.targetDate,
          targetValue: keyResult.targetValue,
          title: keyResult.title ?? keyResult.id ?? "Key Result"
        }))
    );

    return reply.send(payload);
  });

  app.post<{ Body: AgileObjectiveHealthBody }>("/okrs/objective-health-analysis", async (request, reply) => {
    const objectives = Array.isArray(request.body.objectives) ? request.body.objectives : [];

    if (objectives.length === 0) {
      return reply.code(400).send({
        ok: false,
        message: "La lista de Objectives es obligatoria."
      });
    }

    const payload = await analyzeAgileObjectiveHealth({
      keyProjects: Array.isArray(request.body.keyProjects) ? request.body.keyProjects : [],
      objectives: objectives as Parameters<typeof analyzeAgileObjectiveHealth>[0]["objectives"],
      project:
        request.body.project && typeof request.body.project === "object"
          ? {
              id: request.body.project.id ?? "",
              name: request.body.project.name ?? ""
            }
          : undefined
    });

    return reply.send(payload);
  });

  app.post<{ Body: AgilePortfolioAnalysisBody }>("/okrs/portfolio-analysis", async (request, reply) => {
    const projects = Array.isArray(request.body.projects) ? request.body.projects : [];

    if (projects.length === 0) {
      return reply.code(400).send({
        ok: false,
        message: "La lista de Projects es obligatoria."
      });
    }

    const payload = await analyzeAgilePortfolio({
      generatedFor: request.body.generatedFor ?? "",
      portfolioScore: typeof request.body.portfolioScore === "number" ? request.body.portfolioScore : null,
      projects: projects as Parameters<typeof analyzeAgilePortfolio>[0]["projects"]
    });

    return reply.send(payload);
  });

  app.post<{ Body: AgileObjectiveDraftBody }>("/okrs/ai/objective-draft", async (request, reply) => {
    const payload = await generateAgileObjectiveDraft({
      existingObjectives: Array.isArray(request.body.existingObjectives) ? request.body.existingObjectives : [],
      idea: request.body.idea ?? "",
      keyProjects: Array.isArray(request.body.keyProjects) ? request.body.keyProjects : [],
      projectId: request.body.projectId ?? "",
      projectName: request.body.projectName ?? ""
    });

    return reply.send(payload);
  });

  app.post<{ Body: AgileKeyResultDraftBody }>("/okrs/ai/key-result-draft", async (request, reply) => {
    const payload = await generateAgileKeyResultDraft({
      existingKeyResults: Array.isArray(request.body.existingKeyResults) ? request.body.existingKeyResults : [],
      idea: request.body.idea ?? "",
      objective: request.body.objective ?? null,
      projectId: request.body.projectId ?? "",
      projectName: request.body.projectName ?? ""
    });

    return reply.send(payload);
  });

  app.post<{ Body: AgileKeyResultEditDraftBody }>("/okrs/ai/key-result-edit-draft", async (request, reply) => {
    const payload = await generateAgileKeyResultEditDraft({
      currentKeyResult: request.body.currentKeyResult ?? null,
      editInstructions: request.body.editInstructions ?? "",
      keyResultHistory: Array.isArray(request.body.keyResultHistory) ? request.body.keyResultHistory : [],
      objective: request.body.objective ?? null,
      projectId: request.body.projectId ?? "",
      projectName: request.body.projectName ?? "",
      siblingKeyResults: Array.isArray(request.body.siblingKeyResults) ? request.body.siblingKeyResults : []
    });

    return reply.send(payload);
  });

  app.post<{ Body: AgileKeyProjectDraftBody }>("/okrs/ai/key-project-draft", async (request, reply) => {
    const payload = await generateAgileKeyProjectDraft({
      existingKeyProjects: Array.isArray(request.body.existingKeyProjects) ? request.body.existingKeyProjects : [],
      existingKeyResults: Array.isArray(request.body.existingKeyResults) ? request.body.existingKeyResults : [],
      idea: request.body.idea ?? "",
      objectives: Array.isArray(request.body.objectives) ? request.body.objectives : [],
      projectId: request.body.projectId ?? "",
      projectName: request.body.projectName ?? "",
      selectedKeyResult: request.body.selectedKeyResult ?? null
    });

    return reply.send(payload);
  });

  app.get<{ Querystring: AgileKeyProjectsQuery }>("/okrs/key-projects", async (request, reply) => {
    const projectId = request.query.projectId?.trim();

    if (!projectId) {
      return reply.code(400).send({
        ok: false,
        message: "El projectId es obligatorio."
      });
    }

    const payload = await listAgileKeyProjectsForProject(projectId);

    return reply.send({
      ok: true,
      ...payload
    });
  });

  app.post<{ Body: CreateAgileKeyProjectBody }>("/okrs/key-projects", async (request, reply) => {
    const payload = await createAgileKeyProject({
      dontShowInSingularStories: request.body.dontShowInSingularStories,
      epicStory: request.body.epicStory,
      justification: request.body.justification,
      name: request.body.name ?? "",
      projectId: request.body.projectId ?? "",
      status: request.body.status,
      totalStories: request.body.totalStories
    });

    return reply.code(201).send({
      ok: true,
      ...payload
    });
  });

  app.post<{ Body: CreateSingularAgileKeyProjectBody }>("/singular-agile/key-projects", async (request, reply) => {
    const payload = await createSingularAgileKeyProject(request.body);

    return reply.code(payload.created ? 201 : payload.status === "validation_failed" ? 400 : 500).send(payload);
  });

  app.get<{ Querystring: SingularAgileKeyProjectsQuery }>("/singular-agile/key-projects", async (request) => {
    const recordIds = request.query.recordIds?.split(",").map((recordId) => recordId.trim()).filter(Boolean) ?? [];

    return listSingularAgileKeyProjectsByIds(recordIds);
  });

  app.post<{ Body: CreateSingularAgileKeyResultBody }>("/singular-agile/key-results", async (request, reply) => {
    const payload = await createSingularAgileKeyResult(request.body);

    return reply.code(payload.created ? 201 : payload.status === "validation_failed" ? 400 : 500).send(payload);
  });

  app.patch<{ Body: UpdateSingularAgileKeyResultBody }>("/singular-agile/key-results", async (request, reply) => {
    const { recordId, ...fields } = request.body;
    const payload = await updateSingularAgileKeyResult(recordId, fields);

    return reply.code(payload.updated ? 200 : payload.status === "validation_failed" ? 400 : 500).send(payload);
  });

  app.patch<{ Body: UpdateSingularAgileKeyProjectBody }>("/singular-agile/key-projects", async (request, reply) => {
    const { recordId, ...fields } = request.body;
    const payload = await updateSingularAgileKeyProject(recordId, fields);

    return reply.code(payload.updated ? 200 : payload.status === "validation_failed" ? 400 : 500).send(payload);
  });

  app.post<{ Body: AgileKeyResultHistoryBulkBody }>(
    "/singular-agile/key-result-history/bulk",
    async (request, reply) => {
      const keyResultIds = Array.isArray(request.body.keyResultIds) ? request.body.keyResultIds : [];

      if (keyResultIds.length === 0) {
        return reply.code(400).send({
          ok: false,
          message: "La lista de Key Results es obligatoria."
        });
      }

      const payload = await listSingularAgileKeyResultHistoryBulk(keyResultIds);

      return reply.send({
        ok: true,
        ...payload
      });
    }
  );

  app.patch<{ Body: Record<string, unknown> }>("/singular-agile/key-result-history", async (request, reply) => {
    const { recordId, ...fields } = request.body;
    const payload = await updateSingularAgileKeyResultHistory(recordId, fields);

    return reply.code(payload.updated ? 200 : payload.status === "validation_failed" ? 400 : 500).send(payload);
  });

  app.post<{ Body: CreateSingularAgileObjectiveBody }>("/singular-agile/objectives", async (request, reply) => {
    const payload = await createSingularAgileObjective(request.body);

    return reply.code(payload.created ? 201 : payload.status === "validation_failed" ? 400 : 500).send(payload);
  });

  app.patch<{ Body: UpdateSingularAgileObjectiveBody }>("/singular-agile/objectives", async (request, reply) => {
    const { recordId, ...fields } = request.body;
    const payload = await updateSingularAgileObjective(recordId, fields);

    return reply.code(payload.updated ? 200 : payload.status === "validation_failed" ? 400 : 500).send(payload);
  });

  app.post<{ Body: OkrBotMessageBody }>("/okrs/bot/chat", async (request, reply) => {
    const projectId = request.body.projectId?.trim();

    if (!projectId) {
      return reply.code(400).send({
        ok: false,
        message: "El projectId es obligatorio."
      });
    }

    const payload = await createOkrBotReply({
      action: request.body.action,
      activeProposal: request.body.activeProposal,
      collaboratorEmail: request.body.collaboratorEmail?.trim().toLowerCase(),
      conversationHistory: request.body.conversationHistory,
      memoryLimit: request.body.memoryLimit,
      message: request.body.message,
      objectiveId: request.body.objectiveId,
      projectId,
      projectName: request.body.projectName,
      targetLabel: request.body.targetLabel,
      targetId: request.body.targetId
    });

    return reply.send(payload);
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
    const existingFeedback = request.body.existingFeedback?.trim() ?? "";
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
      { start, end },
      undefined,
      existingFeedback
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
      const existingFeedback = request.body.existingFeedback?.trim() ?? "";
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

      const suggestion = await streamTrustworthinessSuggestion({
        activeSessionEmail: activeEmail,
        emitDecisionTrace: (delta) => {
          writeEvent({
            delta,
            type: "decision_trace_delta"
          });
        },
        emitStage: writeStage,
        explicitRange: { start, end },
        existingFeedback,
        participantEmail,
        recordId: request.params.recordId
      });

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
        : undefined,
      participantEmail,
      proposal: request.body.proposal
        ? {
            credibilityPoints: request.body.proposal.credibilityPoints ?? 0,
            feedback: request.body.proposal.feedback ?? "",
            groupThinkingPoints: request.body.proposal.groupThinkingPoints ?? 0,
            intimacyPoints: request.body.proposal.intimacyPoints ?? 0,
            reliabilityPoints: request.body.proposal.reliabilityPoints ?? 0
          }
        : undefined,
      projectContext: request.body.projectContext ?? null,
      recordId: request.params.recordId,
      roleLabel: request.body.roleLabel ?? null,
      start,
      suggestion: request.body.suggestion
    });

    return reply.send({
      ok: true,
      ...session
    });
  });

  app.post<{
    Body: AssistantStreamMessageBody;
    Params: TrustworthinessSuggestionParams;
  }>("/trustworthiness/:recordId/assistant/message/stream", async (request, reply) => {
    const prompt = request.body.prompt?.trim();
    const sessionId = request.body.sessionId?.trim();
    const rehydrate =
      request.body.rehydrate &&
      typeof request.body.rehydrate === "object" &&
      typeof request.body.rehydrate.evaluatedName === "string" &&
      typeof request.body.rehydrate.evaluatorEmail === "string" &&
      typeof request.body.rehydrate.participantEmail === "string" &&
      typeof request.body.rehydrate.start === "string" &&
      typeof request.body.rehydrate.end === "string" &&
      request.body.rehydrate.proposal &&
      request.body.rehydrate.suggestion
        ? {
            activeSessionEmail:
              typeof request.body.rehydrate.activeSessionEmail === "string"
                ? request.body.rehydrate.activeSessionEmail
                : undefined,
            end: request.body.rehydrate.end.trim(),
            evaluatedName: request.body.rehydrate.evaluatedName.trim(),
            evaluatorEmail: request.body.rehydrate.evaluatorEmail.trim().toLowerCase(),
            history: Array.isArray(request.body.rehydrate.history)
              ? request.body.rehydrate.history
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
            meetings: Array.isArray(request.body.rehydrate.meetings)
              ? request.body.rehydrate.meetings.map((meeting) => ({
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
                    typeof meeting.transcriptSummary === "string"
                      ? meeting.transcriptSummary
                      : null
                }))
              : undefined,
            participantEmail: request.body.rehydrate.participantEmail.trim().toLowerCase(),
            projectContext:
              typeof request.body.rehydrate.projectContext === "string"
                ? request.body.rehydrate.projectContext
                : null,
            proposal: {
              credibilityPoints: request.body.rehydrate.proposal.credibilityPoints ?? 0,
              feedback: request.body.rehydrate.proposal.feedback ?? "",
              groupThinkingPoints: request.body.rehydrate.proposal.groupThinkingPoints ?? 0,
              intimacyPoints: request.body.rehydrate.proposal.intimacyPoints ?? 0,
              reliabilityPoints: request.body.rehydrate.proposal.reliabilityPoints ?? 0
            },
            roleLabel:
              typeof request.body.rehydrate.roleLabel === "string"
                ? request.body.rehydrate.roleLabel
                : null,
            start: request.body.rehydrate.start.trim(),
            suggestion: request.body.rehydrate.suggestion
          }
        : undefined;

    if (!prompt) {
      return reply.code(400).send({
        ok: false,
        message: "El prompt del usuario es obligatorio."
      });
    }

    if (!sessionId) {
      return reply.code(400).send({
        ok: false,
        message: "El sessionId del agente es obligatorio."
      });
    }

    reply.raw.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Type": "application/x-ndjson; charset=utf-8"
    });

    try {
      await streamTrustworthinessAssistantMessage({
        emit: (event) => {
          reply.raw.write(`${JSON.stringify(event)}\n`);
        },
        prompt,
        rehydrateSession: rehydrate,
        recordId: request.params.recordId,
        sessionId
      });
    } catch (error) {
      reply.raw.write(
        `${JSON.stringify({
          message:
            error instanceof Error
              ? error.message
              : "No fue posible continuar la conversación del agente.",
          type: "error"
        })}\n`
      );
    } finally {
      reply.raw.end();
    }
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
