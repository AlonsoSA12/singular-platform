import { randomUUID } from "node:crypto";
import { getAgileAirtableConfig, getAirtableConfig, getOpenAIConfig } from "../config.js";

type AirtableRecord = {
  createdTime?: string;
  id: string;
  fields: Record<string, unknown>;
};

type AirtableResponse = {
  offset?: string;
  records: AirtableRecord[];
};

type AirtableCollaborator = {
  email?: string;
  id?: string;
  name?: string;
};

type AgileObjectiveStatus = "Achieved" | "In Progress" | "Pending Review" | "Underachieved";
type AgileKeyResultStatus = "Done" | "In progress" | "Todo";
type AgileKeyProjectStatus = "Active" | "Archived" | "Suggested by Resource";
type AgileObjectiveHealthStatus = "At Risk" | "Critical" | "Healthy" | "Needs Attention";

type CreateAgileObjectiveInput = {
  aiSuggestedKeyResults?: string;
  description?: string;
  explanation?: string;
  metric?: string;
  objective: string;
  priority?: string;
  projectId: string;
  quarter?: string;
  status?: AgileObjectiveStatus;
  targetDate?: string;
  type?: string;
};

type CreateAgileKeyResultInput = {
  currentValue?: number | null;
  explanation?: string;
  initialValue?: number | null;
  keyResult: string;
  metric?: string;
  objectiveId: string;
  projectId: string;
  quarter?: string;
  status?: AgileKeyResultStatus;
  targetDate?: string;
  targetValue?: number | null;
};

type CreateAgileKeyProjectInput = {
  dontShowInSingularStories?: boolean;
  epicStory?: string;
  justification?: string;
  name: string;
  projectId: string;
  status?: AgileKeyProjectStatus;
  totalStories?: number | null;
};

type AgileKeyResultSentimentInput = {
  code?: string;
  currentValue?: number | null;
  id: string;
  initialValue?: number | null;
  metric?: string;
  progress?: number | null;
  status?: string;
  targetDate?: string;
  targetValue?: number | null;
  title: string;
};

type AgileObjectiveHealthKeyResultInput = AgileKeyResultSentimentInput & {
  explanation?: string;
};

type AgileObjectiveHealthInput = {
  description?: string;
  id: string;
  keyResultSentiments?: Array<{
    keyResultId: string;
    metricStatus: AgileKeyResultMetricStatus;
  }>;
  keyResults?: AgileObjectiveHealthKeyResultInput[];
  quarter?: string;
  score?: number | null;
  status?: string | null;
  targetDate?: string;
  title: string;
};

type AgileObjectiveHealthAnalysisInput = {
  keyProjects?: unknown[];
  objectives: AgileObjectiveHealthInput[];
  project?: {
    id?: string;
    name?: string;
  };
};

type AgileKeyResultMetricStatus = "BLEEDING" | "COLD" | "HOT" | "NEW";
type AgileKeyResultSentiment = "Bud" | "Rose" | "Thorn";

type AgilePortfolioAnalysisProjectInput = {
  keyResultCount?: number;
  objectiveCount?: number;
  projectId?: string;
  projectName?: string;
  score?: number | null;
  signalCounts?: {
    bleeding?: number;
    cold?: number;
    hot?: number;
    new?: number;
  };
  status?: "empty" | "error" | "loading" | "ready";
};

type AgilePortfolioAnalysisInput = {
  generatedFor?: string;
  portfolioScore?: number | null;
  projects: AgilePortfolioAnalysisProjectInput[];
};

type AgileObjectiveDraftInput = {
  existingObjectives?: unknown[];
  idea: string;
  keyProjects?: unknown[];
  projectId: string;
  projectName: string;
};

type AgileObjectiveEditDraftInput = {
  currentObjective: unknown;
  editInstructions: string;
  keyProjects?: unknown[];
  keyResults?: unknown[];
  projectId: string;
  projectName: string;
};

type AgileKeyResultDraftInput = {
  existingKeyResults?: unknown[];
  idea: string;
  objective: unknown;
  projectId: string;
  projectName: string;
};

type AgileKeyResultEditDraftInput = {
  currentKeyResult: unknown;
  editInstructions: string;
  keyResultHistory?: unknown[];
  objective?: unknown;
  siblingKeyResults?: unknown[];
  projectId: string;
  projectName: string;
};

type AgileKeyProjectDraftInput = {
  existingKeyProjects?: unknown[];
  existingKeyResults?: unknown[];
  idea: string;
  objectives?: unknown[];
  projectId: string;
  projectName: string;
  selectedKeyResult?: unknown;
};

type AgileKeyProjectEditDraftInput = {
  currentKeyProject: unknown;
  editInstructions: string;
  existingKeyResults?: unknown[];
  objectives?: unknown[];
  projectId: string;
  projectName: string;
};

type TrustworthinessRecordUpdateFields = {
  "Credibility Points"?: number | null;
  "Credibility AI JSON"?: string | null;
  "Feedback"?: string;
  "Group Thinking Points"?: number | null;
  "Group Thinking Points AI JSON"?: string | null;
  "Intimacy Points"?: number | null;
  "Intimacy AI JSON"?: string | null;
  "Rating Status"?: "Pending" | "Done";
  "Reliability Points"?: number | null;
  "Reliability AI JSON"?: string | null;
};

type FetchAirtableRecordsOptions = {
  apiToken?: string;
  baseId?: string;
  fields?: string[];
  filterByFormula?: string;
};

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getAirtableRetryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfter ? Number.parseFloat(retryAfter) : Number.NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return [750, 1500, 3000][attempt] ?? 3000;
}

async function fetchAirtableWithRetry(url: URL, apiToken: string) {
  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`
      }
    });

    if (response.ok || (response.status !== 429 && response.status < 500) || attempt === maxAttempts - 1) {
      return response;
    }

    await wait(getAirtableRetryDelay(response, attempt));
  }

  throw new Error("Airtable request failed before receiving a response.");
}

type DateRangeLiteral = {
  end: string;
  start: string;
};

type PeriodRange = {
  endsAt: Date;
  exclusiveEndAt: Date;
  id: string;
  startsAt: Date;
};

type CoachingParticipant = {
  avatarUrl: string | null;
  email: string;
  name: string;
  role: string | null;
};

type CoachingEvidenceMeeting = {
  actionItems: string[];
  coachingAnalysis: string | null;
  coachingSummary: string | null;
  metricsScores: Record<string, number | null>;
  rawRecordId: string;
  title: string;
  topics: string[];
  transcriptSummary: string | null;
  when: string | null;
};

type Confidence = "low" | "medium" | "high";
type PillarKey = "reliability" | "intimacy" | "groupThinking" | "credibility";
type FeedbackGenerationInput = {
  evaluatedName: string;
  existingFeedback?: string | null;
  pillars: Record<
    PillarKey,
    {
      aiSuggestion?: unknown;
      meaning: string;
      points: number;
    }
  >;
  projectContext?: string | null;
  roleLabel?: string | null;
};

type TrustworthinessAssistantProposal = {
  credibilityPoints: number;
  feedback: string;
  groupThinkingPoints: number;
  intimacyPoints: number;
  reliabilityPoints: number;
};

type TrustworthinessAssistantMeeting = {
  actionItems: string[];
  coachingAnalysis: string | null;
  coachingSummary: string | null;
  meetingDatetime: string | null;
  meetingId: string;
  metricsScores: Record<string, number | null>;
  title: string;
  topics: string[];
  transcriptSummary: string | null;
};

type TrustworthinessAssistantCitation = {
  meetingId: string;
  meetingTitle: string;
  pillar: PillarKey | null;
  reason: string;
};

type TrustworthinessAssistantConversationInput = {
  evaluatedName: string;
  history: Array<{
    content: string;
    role: "assistant" | "user";
  }>;
  meetings: TrustworthinessAssistantMeeting[];
  projectContext?: string | null;
  prompt: string;
  proposal: TrustworthinessAssistantProposal;
  roleLabel?: string | null;
  suggestion: Record<string, unknown>;
};

type TrustworthinessAssistantReply = {
  changeSource: TrustworthinessAssistantChangeSource;
  citations: TrustworthinessAssistantCitation[];
  decisionTrace: string[];
  evidenceQuestion: string | null;
  focusArea: TrustworthinessAssistantFocusArea;
  message: string;
  needsOptionalEvidence: boolean;
  nextIntent: TrustworthinessAssistantIntent;
  proposal: TrustworthinessAssistantProposal;
  proposalChanged: boolean;
};

type TrustworthinessAssistantSession = {
  activeSessionEmail?: string;
  context: {
    end: string;
    evaluatedName: string;
    evaluatorEmail: string;
    participantEmail: string;
    projectContext?: string | null;
    recordId: string;
    roleLabel?: string | null;
    start: string;
  };
  expiresAt: number;
  history: Array<{
    content: string;
    role: "assistant" | "user";
  }>;
  meetings: TrustworthinessAssistantMeeting[];
  proposal: TrustworthinessAssistantProposal;
  suggestion: Record<string, unknown>;
  updatedAt: number;
};

type TrustworthinessAssistantHistoryEntry = {
  content: string;
  role: "assistant" | "user";
};

type TrustworthinessAssistantSessionRehydrateInput = {
  activeSessionEmail?: string;
  end: string;
  evaluatedName: string;
  evaluatorEmail: string;
  history?: TrustworthinessAssistantHistoryEntry[];
  meetings?: TrustworthinessAssistantMeeting[];
  participantEmail: string;
  projectContext?: string | null;
  proposal?: TrustworthinessAssistantProposal;
  roleLabel?: string | null;
  start: string;
  suggestion?: Record<string, unknown>;
};

export type TrustworthinessAssistantStreamEvent =
  | {
      label: string;
      type: "status";
    }
  | {
      delta: string;
      type: "assistant_text_delta";
    }
  | {
      label: string;
      tool: "searchMeetingEvidence" | "updateProposal" | "prepareSave";
      type: "tool_start";
    }
  | {
      result: Record<string, unknown>;
      tool: "searchMeetingEvidence" | "updateProposal" | "prepareSave";
      type: "tool_done";
    }
  | {
      delta: string;
      type: "decision_trace_delta";
    }
  | ({
      sessionId: string;
      type: "assistant_structured_final";
    } & TrustworthinessAssistantReply)
  | {
      code?: string;
      message: string;
      type: "error";
    };

type TrustworthinessAssistantSaveInput = {
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
  proposal?: TrustworthinessAssistantProposal;
  ratingStatus?: "Pending" | "Done";
  twSuggestion?: Record<string, unknown>;
};

type TrustworthinessAssistantIntent =
  | "review"
  | "edit_pillar"
  | "edit_feedback"
  | "save"
  | "clarify";

type TrustworthinessAssistantFocusArea = PillarKey | "feedback" | null;
type TrustworthinessAssistantChangeSource =
  | "model_evidence"
  | "human_override"
  | "mixed"
  | "none";
export type TrustworthinessSuggestionStage =
  | "validating_evaluation_data"
  | "fetching_airtable_meetings"
  | "building_meeting_evidence"
  | "sending_context_to_ai"
  | "validating_structured_response"
  | "calculating_tw_score";

export const TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS: Record<
  TrustworthinessSuggestionStage,
  string
> = {
  validating_evaluation_data: "Validando datos de la evaluación",
  fetching_airtable_meetings: "Consultando reuniones en Airtable",
  building_meeting_evidence: "Preparando evidencia de reuniones",
  sending_context_to_ai: "Enviando contexto a IA",
  validating_structured_response: "Validando respuesta estructurada",
  calculating_tw_score: "Calculando score final de TW"
};

type TrustworthinessSuggestionStageEmitter = (
  stage: TrustworthinessSuggestionStage
) => void | Promise<void>;

type TrustworthinessSuggestionTraceEmitter = (
  trace: string
) => void | Promise<void>;

const TRUSTWORTHINESS_START_FIELD = "Start Date Range";
const TRUSTWORTHINESS_END_FIELD = "End Date Range";
const TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD = "Email address from Evaluator";
const COACHING_INPUT_LOG_PARTICIPANT_FIELD = "participant";
const COACHING_INPUT_LOG_RECEIVED_AT_FIELD = "received_at";
const COACHING_INPUT_LOG_UNIQUE_KEY_FIELD = "unique_key";
const COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD = "raw_payload";
const COACHING_INPUT_LOG_METRICS_JSON_FIELD = "metrics_json";
const SPRINT_TABLE_NAME = "Sprints";
const SPRINT_NAME_FIELD = "Sprint Name";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const TRUSTWORTHINESS_ASSISTANT_AGENT_ID = "asistente-revision-tw";
const TRUSTWORTHINESS_ASSISTANT_AGENT_VERSION = "0.1.0";
const ASSISTANT_HISTORY_LIMIT = 6;
const ASSISTANT_MEETING_LIMIT = 8;
const ASSISTANT_TEXT_LIMIT = 900;
const ASSISTANT_SHORT_TEXT_LIMIT = 260;
const ASSISTANT_SESSION_TTL_MS = 45 * 60 * 1000;
const assistantSessions = new Map<string, TrustworthinessAssistantSession>();

type OpenAITextStreamHandlers = {
  onCompleted?: (text: string) => void | Promise<void>;
  onDelta?: (delta: string) => void | Promise<void>;
};

export function escapeFormulaValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

export function escapeRegexValue(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

function createPeriodRange(periodId: string): PeriodRange | null {
  const startsAt = new Date(`${periodId}T00:00:00.000Z`);

  if (Number.isNaN(startsAt.getTime())) {
    return null;
  }

  const exclusiveEndAt = new Date(
    Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + 1, 25, 0, 0, 0, 0)
  );
  const endsAt = new Date(
    Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + 1, 24, 23, 59, 59, 999)
  );

  return {
    id: periodId,
    exclusiveEndAt,
    startsAt,
    endsAt
  };
}

function parseIsoDateLiteral(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isAirtableCollaborator(value: unknown): value is AirtableCollaborator {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toIsoDateLiteral(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildEvaluatorFilterFormula(evaluatorEmail: string) {
  const normalizedEmail = normalizeEmail(evaluatorEmail);
  const escapedRegex = escapeFormulaValue(escapeRegexValue(normalizedEmail));

  return `REGEX_MATCH("," & LOWER(ARRAYJOIN({${TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD}}, ",")) & ",", ",${escapedRegex},")`;
}

function buildPeriodFilterFormula(periods: PeriodRange[]) {
  if (periods.length === 0) {
    return "";
  }

  const formulas = periods.map((period) => {
    const periodStart = escapeFormulaValue(toIsoDateLiteral(period.startsAt));
    const periodEnd = escapeFormulaValue(toIsoDateLiteral(period.endsAt));

    return `AND({${TRUSTWORTHINESS_START_FIELD}} <= DATETIME_PARSE("${periodEnd}", "YYYY-MM-DD"), {${TRUSTWORTHINESS_END_FIELD}} >= DATETIME_PARSE("${periodStart}", "YYYY-MM-DD"))`;
  });

  if (formulas.length === 1) {
    return formulas[0];
  }

  return `OR(${formulas.join(",")})`;
}

function buildSingleDateFieldRangeFilterFormula(fieldName: string, startsAt: Date, exclusiveEndAt: Date) {
  const periodStart = escapeFormulaValue(toIsoDateLiteral(startsAt));
  const periodExclusiveEnd = escapeFormulaValue(toIsoDateLiteral(exclusiveEndAt));

  return `AND({${fieldName}} >= DATETIME_PARSE("${periodStart}", "YYYY-MM-DD"), {${fieldName}} < DATETIME_PARSE("${periodExclusiveEnd}", "YYYY-MM-DD"))`;
}

function buildTrustworthinessFilterFormula(selectedPeriods: string[], evaluatorEmail: string) {
  const periodRanges = selectedPeriods
    .map((periodId) => createPeriodRange(periodId))
    .filter((period): period is PeriodRange => period !== null);
  const formulas = [buildEvaluatorFilterFormula(evaluatorEmail)];
  const periodFormula = buildPeriodFilterFormula(periodRanges);

  if (periodFormula) {
    formulas.push(periodFormula);
  }

  return {
    filterByFormula: formulas.length === 1 ? formulas[0] : `AND(${formulas.join(",")})`,
    selectedPeriods: periodRanges.map((period) => period.id)
  };
}

function buildParticipantFilterFormula(participantEmail: string) {
  const normalizedEmail = escapeFormulaValue(escapeRegexValue(normalizeEmail(participantEmail)));

  return `REGEX_MATCH(LOWER({${COACHING_INPUT_LOG_PARTICIPANT_FIELD}} & ""), "${normalizedEmail}")`;
}

function getTotalPeriodCoverage(selectedPeriods: string[], explicitRange?: DateRangeLiteral) {
  if (explicitRange?.start && explicitRange?.end) {
    const startsAt = parseIsoDateLiteral(explicitRange.start);
    const endsAtInclusive = parseIsoDateLiteral(explicitRange.end);

    if (startsAt && endsAtInclusive) {
      const exclusiveEndAt = new Date(endsAtInclusive.getTime() + 24 * 60 * 60 * 1000);

      return {
        exclusiveEndAt,
        selectedPeriods,
        startsAt
      };
    }
  }

  const periodRanges = selectedPeriods
    .map((periodId) => createPeriodRange(periodId))
    .filter((period): period is PeriodRange => period !== null);
  if (periodRanges.length === 0) {
    return null;
  }

  return {
    exclusiveEndAt: new Date(Math.max(...periodRanges.map((period) => period.exclusiveEndAt.getTime()))),
    selectedPeriods: periodRanges.map((period) => period.id),
    startsAt: new Date(Math.min(...periodRanges.map((period) => period.startsAt.getTime())))
  };
}

function buildCoachingInputLogFilterFormula(
  selectedPeriods: string[],
  participantEmail: string,
  activeSessionEmail?: string,
  explicitRange?: DateRangeLiteral
) {
  const formulas = [buildParticipantFilterFormula(participantEmail)];

  if (activeSessionEmail && normalizeEmail(activeSessionEmail) !== normalizeEmail(participantEmail)) {
    formulas.push(buildParticipantFilterFormula(activeSessionEmail));
  }

  const totalRange = getTotalPeriodCoverage(selectedPeriods, explicitRange);
  const periodFormula = totalRange
    ? buildSingleDateFieldRangeFilterFormula(
        COACHING_INPUT_LOG_RECEIVED_AT_FIELD,
        totalRange.startsAt,
        totalRange.exclusiveEndAt
      )
    : "";

  if (periodFormula) {
    formulas.push(periodFormula);
  }

  return {
    filterByFormula: formulas.length === 1 ? formulas[0] : `AND(${formulas.join(",")})`,
    selectedPeriods: totalRange?.selectedPeriods ?? []
  };
}

export async function findUserByEmail(email: string) {
  const airtableConfig = getAirtableConfig();
  const escapedEmail = escapeFormulaValue(email.trim().toLowerCase());
  const fieldName = airtableConfig.airtableEmailField;
  const filterByFormula = `LOWER({${fieldName}})="${escapedEmail}"`;

  const url = new URL(
    `https://api.airtable.com/v0/${airtableConfig.airtableBaseId}/${encodeURIComponent(airtableConfig.airtableTableName)}`
  );

  url.searchParams.set("maxRecords", "1");
  url.searchParams.set("filterByFormula", filterByFormula);
  url.searchParams.append("fields[]", airtableConfig.airtableEmailField);
  url.searchParams.append("fields[]", airtableConfig.airtableRoleField);

  if (airtableConfig.airtableNameField) {
    url.searchParams.append("fields[]", airtableConfig.airtableNameField);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${airtableConfig.airtableApiToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Airtable request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AirtableResponse;
  const record = payload.records[0];

  if (!record) {
    return null;
  }

  const normalizedEmail = String(record.fields[airtableConfig.airtableEmailField] ?? "")
    .trim()
    .toLowerCase();
  const rawName = airtableConfig.airtableNameField
    ? record.fields[airtableConfig.airtableNameField]
    : null;
  const rawRole = record.fields[airtableConfig.airtableRoleField];

  return {
    authenticated: true,
    email: normalizedEmail,
    name: rawName ? String(rawName) : null,
    role: rawRole ? String(rawRole) : null
  };
}

export async function fetchAirtableRecords(
  tableName: string,
  options: FetchAirtableRecordsOptions = {}
) {
  const airtableConfig = getAirtableConfig();
  const baseId = options.baseId || airtableConfig.airtableBaseId;
  const apiToken = options.apiToken || airtableConfig.airtableApiToken;
  const records: AirtableRecord[] = [];
  let offset = "";

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
    );

    url.searchParams.set("pageSize", "100");
    if (options.filterByFormula) {
      url.searchParams.set("filterByFormula", options.filterByFormula);
    }
    for (const field of options.fields ?? []) {
      url.searchParams.append("fields[]", field);
    }

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetchAirtableWithRetry(url, apiToken);

    if (!response.ok) {
      let details = "";

      try {
        const payload = (await response.json()) as {
          error?: {
            message?: string;
            type?: string;
          };
        };
        details = payload.error?.message
          ? `: ${payload.error.message}`
          : payload.error?.type
            ? `: ${payload.error.type}`
            : "";
      } catch {
        details = "";
      }

      throw new Error(`Airtable request failed for table ${tableName} with status ${response.status}${details}`);
    }

    const payload = (await response.json()) as AirtableResponse;
    records.push(...payload.records);
    offset = payload.offset ?? "";
  } while (offset);

  return records;
}

export function dedupeAirtableRecords(records: AirtableRecord[]) {
  const uniqueRecords = new Map<string, AirtableRecord>();

  for (const record of records) {
    if (!uniqueRecords.has(record.id)) {
      uniqueRecords.set(record.id, record);
    }
  }

  return [...uniqueRecords.values()];
}

export function getTrustworthinessTableName() {
  const airtableConfig = getAirtableConfig();

  if (!airtableConfig.airtableTrustworthinessTableName) {
    throw new Error(
      "Missing trustworthiness Airtable table name. Set AIRTABLE_TRUSTWORTHINESS_TABLE_NAME in the root .env."
    );
  }

  return airtableConfig.airtableTrustworthinessTableName;
}

function getCoachingInputLogTableName() {
  const airtableConfig = getAirtableConfig();

  return airtableConfig.airtableCoachingInputLogTableName || "coaching_input_log";
}

export function getCoachingInputLogConnection() {
  const airtableConfig = getAirtableConfig();

  return {
    apiToken: airtableConfig.airtableCoachingInputLogApiToken || airtableConfig.airtableApiToken,
    baseId: airtableConfig.airtableCoachingInputLogBaseId || airtableConfig.airtableBaseId,
    tableName: getCoachingInputLogTableName()
  };
}

export function getAgileAirtableConnection() {
  const agileConfig = getAgileAirtableConfig();
  const resolveTableName = (tableName: string, tableId: string) =>
    tableName === "Key Result" || tableName === "Key Project" || tableName === "Key Result History"
      ? tableId
      : tableName;

  return {
    apiToken: agileConfig.airtableAgileApiToken,
    baseId: agileConfig.airtableAgileBaseId,
    keyProjectTableName: resolveTableName(agileConfig.airtableAgileKeyProjectTableName, "tblu9Jj3IFaDzAu3T"),
    keyResultHistoryTableName: resolveTableName(
      agileConfig.airtableAgileKeyResultHistoryTableName,
      "tbl6vfKhWFgBgUVVJ"
    ),
    keyResultTableName: resolveTableName(agileConfig.airtableAgileKeyResultTableName, "tblwSWyJl7p6NgYUA"),
    objectiveTableName: agileConfig.airtableAgileObjectiveTableName,
    projectsTableName: agileConfig.airtableAgileProjectsTableName
  };
}

function getCollaboratorEmail(value: unknown) {
  if (!isAirtableCollaborator(value)) {
    return null;
  }

  const rawEmail = typeof value.email === "string" ? value.email : "";
  return rawEmail.trim().length > 0 ? normalizeEmail(rawEmail) : null;
}

function getCollaboratorName(value: unknown) {
  if (!isAirtableCollaborator(value)) {
    return null;
  }

  const rawName = typeof value.name === "string" ? value.name.trim() : "";
  return rawName.length > 0 ? rawName : null;
}

function mapAgileProject(record: AirtableRecord) {
  const collaborator = record.fields["Collaborator"] ?? record.fields["collaborator"];
  const rawName =
    record.fields["Clientes"] ??
    record.fields["clients"] ??
    record.fields["Project"] ??
    record.fields["Project Name"] ??
    record.fields["client_name"] ??
    record.fields["Name"];
  const rawStatus = record.fields["Estatus"] ?? record.fields["status"];
  const name = typeof rawName === "string" && rawName.trim().length > 0
    ? rawName.trim()
    : record.id;

  return {
    id: record.id,
    sourceRecordId:
      getFirstTextValue(getFieldValue(record.fields, "source_record_id")) ??
      getFirstTextValue(getFieldValue(record.fields, "recordID")) ??
      getFirstTextValue(getFieldValue(record.fields, "recordid")) ??
      "",
    name,
    collaborator: {
      email: getCollaboratorEmail(collaborator),
      name: getCollaboratorName(collaborator)
    },
    status: typeof rawStatus === "string" ? rawStatus.trim() : null
  };
}

export async function listAgileProjectsForCollaborator(collaboratorEmail: string) {
  const normalizedCollaboratorEmail = normalizeEmail(collaboratorEmail);
  const agileConnection = getAgileAirtableConnection();
  const records = await fetchAirtableRecords(agileConnection.projectsTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });
  const projects = records
    .map(mapAgileProject)
    .filter((project) => project.collaborator.email === normalizedCollaboratorEmail)
    .filter((project) => !project.status || project.status === "Active")
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

  return {
    collaboratorEmail: normalizedCollaboratorEmail,
    projects,
    recordCount: projects.length,
    tableName: agileConnection.projectsTableName
  };
}

function normalizeAirtableFieldName(fieldName: string) {
  return fieldName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function getFieldValue(fields: Record<string, unknown>, fieldName: string) {
  if (fieldName in fields) {
    return fields[fieldName];
  }

  const normalizedFieldName = normalizeAirtableFieldName(fieldName);
  const compactFieldName = normalizedFieldName.replaceAll("_", "");
  const entry = Object.entries(fields).find(([key]) => {
    const normalizedKey = normalizeAirtableFieldName(key);

    return normalizedKey === normalizedFieldName || normalizedKey.replaceAll("_", "") === compactFieldName;
  });

  return entry?.[1];
}

export function getTextField(fields: Record<string, unknown>, fieldName: string) {
  const value = getFieldValue(fields, fieldName);

  return typeof value === "string" ? value.trim() : "";
}

export function getNumberField(fields: Record<string, unknown>, fieldName: string) {
  const value = getFieldValue(fields, fieldName);

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getBooleanField(fields: Record<string, unknown>, fieldName: string) {
  return getFieldValue(fields, fieldName) === true;
}

function getOptionalObjectiveStatus(value: unknown) {
  if (
    value === "Achieved" ||
    value === "In Progress" ||
    value === "Pending Review" ||
    value === "Underachieved"
  ) {
    return value;
  }

  return null;
}

function getOptionalKeyResultStatus(value: unknown) {
  if (value === "Done" || value === "In progress" || value === "Todo") {
    return value;
  }

  return null;
}

function getOptionalKeyProjectStatus(value: unknown) {
  if (value === "Active" || value === "Archived" || value === "Suggested by Resource") {
    return value;
  }

  return null;
}

function requireNonEmptyString(value: string | undefined, fieldName: string) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return trimmedValue;
}

function normalizeNullablePercentInput(value: number | null | undefined) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }

  return value > 1 ? value / 100 : value;
}

export function calculateAgileKeyResultProgress(input: {
  currentValue?: number | null;
  initialValue?: number | null;
  targetValue?: number | null;
}) {
  const initialValue =
    typeof input.initialValue === "number" && Number.isFinite(input.initialValue) ? input.initialValue : null;
  const currentValue =
    typeof input.currentValue === "number" && Number.isFinite(input.currentValue) ? input.currentValue : null;
  const targetValue =
    typeof input.targetValue === "number" && Number.isFinite(input.targetValue) ? input.targetValue : null;

  if (initialValue === null || currentValue === null || targetValue === null || targetValue === initialValue) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(((currentValue - initialValue) / (targetValue - initialValue)) * 100)));
}

export function normalizeScoreObjetives(value: number | null) {
  if (value === null) {
    return null;
  }

  if (value <= 1) {
    return Math.round(value * 100);
  }

  if (value <= 10) {
    return Math.round(value * 10);
  }

  return Math.round(value);
}

export function getPercentField(fields: Record<string, unknown>, fieldName: string) {
  const value = fields[fieldName];

  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizePercentLike(value);
  }

  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function formatCollaboratorLookup(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  const labels = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (isAirtableCollaborator(item)) {
        return item.name?.trim() || item.email?.trim() || "";
      }

      return "";
    })
    .filter((item) => item.length > 0);

  return [...new Set(labels)].join(", ");
}

function mapAgileKeyResult(record: AirtableRecord) {
  const fields = record.fields;
  const currentValue = getNumberField(fields, "Current Value");
  const initialValue = getNumberField(fields, "Initial Value");
  const targetValue = getNumberField(fields, "Target Value");
  const storedProgress = getPercentField(fields, "Progress") || getPercentField(fields, "Progress Number");
  const progress =
    calculateAgileKeyResultProgress({
      currentValue,
      initialValue,
      targetValue
    }) ?? storedProgress;

  return {
    id: record.id,
    code: getTextField(fields, "#"),
    currentValue,
    explanation: getTextField(fields, "Explanation"),
    initialValue,
    metric: getTextField(fields, "Metric"),
    progress,
    sourceRecordId:
      getFirstTextValue(getFieldValue(fields, "record_id")) ??
      getFirstTextValue(getFieldValue(fields, "Record Id")) ??
      getFirstTextValue(getFieldValue(fields, "recordId")) ??
      "",
    status: getTextField(fields, "Status"),
    targetDate: getTextField(fields, "Target Date"),
    targetValue,
    title: getTextField(fields, "Key Result") || getTextField(fields, "Name") || record.id
  };
}

function mapAgileKeyResultHistoryPoint(record: AirtableRecord) {
  const fields = record.fields;
  const currentValue = getNumberField(fields, "Current Value");
  const initialValue = getNumberField(fields, "Initial Value");
  const targetValue = getNumberField(fields, "Target Value");
  const storedProgress = getPercentField(fields, "Progress") || getPercentField(fields, "Progress Number");
  const progress =
    calculateAgileKeyResultProgress({
      currentValue,
      initialValue,
      targetValue
    }) ?? storedProgress;

  return {
    id: record.id,
    currentValue,
    initialValue,
    name: getTextField(fields, "Name"),
    no: getNumberField(fields, "No."),
    progress,
    progressNumber: getNumberField(fields, "Progress Number"),
    quarter: getTextField(fields, "Quarter"),
    scoreKeyResult: getNumberField(fields, "Score Key Result"),
    status: getTextField(fields, "Status"),
    targetDate: getTextField(fields, "Target Date"),
    targetValue,
    writtenExplanationScore: getTextField(fields, "Written Explanation Score")
  };
}

function compareAgileKeyResultHistoryPoints(
  left: ReturnType<typeof mapAgileKeyResultHistoryPoint>,
  right: ReturnType<typeof mapAgileKeyResultHistoryPoint>
) {
  if (left.no !== null && right.no !== null) {
    return left.no - right.no;
  }

  if (left.no !== null) {
    return -1;
  }

  if (right.no !== null) {
    return 1;
  }

  const leftDate = Date.parse(left.targetDate);
  const rightDate = Date.parse(right.targetDate);

  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    return leftDate - rightDate;
  }

  if (Number.isFinite(leftDate)) {
    return -1;
  }

  if (Number.isFinite(rightDate)) {
    return 1;
  }

  return 0;
}

function mapAgileObjective(record: AirtableRecord) {
  const fields = record.fields;
  const name = getTextField(fields, "Name");
  const objective = getTextField(fields, "Objective");
  const description = getTextField(fields, "Objetive Description");
  const explanation = getTextField(fields, "Explanation");
  const projectIds = getLinkedRecordIds(getFieldValue(fields, "Project"));
  const keyResultIds = getLinkedRecordIds(getFieldValue(fields, "Key Results"));
  const score = normalizeScoreObjetives(getNumberField(fields, "Score Objetives"));

  return {
    id: record.id,
    aiSuggestedKeyResults: getTextField(fields, "AI suggested key results"),
    createdAt: record.createdTime ?? getTextField(fields, "Created"),
    description,
    explanation,
    keyResultIds,
    keyResults: [],
    metric: getTextField(fields, "Metric"),
    name: name || objective || record.id,
    no: getNumberField(fields, "No."),
    objective,
    poUser: getFieldValue(fields, "po_user") ?? null,
    poUserLabel: formatCollaboratorLookup(getFieldValue(fields, "po_user")),
    priority: getTextField(fields, "Priority"),
    projectIds,
    quarter: getTextField(fields, "Quarter"),
    recordId:
      getFirstTextValue(getFieldValue(fields, "record_id")) ??
      getFirstTextValue(getFieldValue(fields, "Record Id")) ??
      getFirstTextValue(getFieldValue(fields, "recordId")) ??
      "",
    score,
    status: getOptionalObjectiveStatus(getFieldValue(fields, "Status")),
    targetDate: getTextField(fields, "Target Date"),
    type: getTextField(fields, "Type")
  };
}

export function normalizePercentLike(value: number | null) {
  if (value === null) {
    return 0;
  }

  if (value <= 1) {
    return Math.round(value * 100);
  }

  return Math.round(value);
}

function compactAirtableCreateFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === "string" && value.trim().length === 0) {
        return false;
      }

      if (Array.isArray(value) && value.length === 0) {
        return false;
      }

      return true;
    })
  );
}

function mapAgileKeyProject(record: AirtableRecord) {
  const fields = record.fields;
  const qualityScore = normalizePercentLike(getNumberField(fields, "Quality Score"));
  const finalScore = normalizePercentLike(getNumberField(fields, "finalScore"));
  const projectIds = getLinkedRecordIds(getFieldValue(fields, "Projects"));

  return {
    id: record.id,
    aiStoriesAssist: getTextField(fields, "AI Stories Assist"),
    clarity: getNumberField(fields, "Clarity"),
    createdAt: getTextField(fields, "Create"),
    dontShowInSingularStories: getBooleanField(fields, "Don't Show In Singular Stories"),
    epicUpdatedAt: getTextField(fields, "Epic Updated"),
    finalScore,
    keyProjectId: getTextField(fields, "ID"),
    justification: getTextField(fields, "Justification"),
    name: getTextField(fields, "Epic Name"),
    projectIds,
    qualityScore,
    sourceRecordId:
      getFirstTextValue(getFieldValue(fields, "source_record_id")) ??
      getFirstTextValue(getFieldValue(fields, "Record Id")) ??
      getFirstTextValue(getFieldValue(fields, "recordId")) ??
      "",
    strategicFocus: getNumberField(fields, "Strategic Focus"),
    story: getTextField(fields, "Epic Story"),
    status: getTextField(fields, "Status"),
    totalStories: getNumberField(fields, "Total Stories"),
    valueOrientation: getNumberField(fields, "Value Orientation")
  };
}

export async function listAgileKeyProjectsForProject(projectId: string) {
  const agileConnection = getAgileAirtableConnection();
  const records = await fetchAirtableRecords(agileConnection.keyProjectTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });
  const keyProjects = records
    .map(mapAgileKeyProject)
    .filter((keyProject) => keyProject.projectIds.includes(projectId))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

  return {
    keyProjects,
    projectId,
    recordCount: keyProjects.length,
    tableName: agileConnection.keyProjectTableName
  };
}

export async function listAgileKeyResultHistoryBulk(keyResultIds: string[]) {
  const normalizedKeyResultIds = [...new Set(keyResultIds.map((keyResultId) => keyResultId.trim()).filter(Boolean))];

  if (normalizedKeyResultIds.length === 0) {
    throw new Error("La lista de Key Results es obligatoria.");
  }

  const agileConnection = getAgileAirtableConnection();
  const historyByKeyResultId = Object.fromEntries(
    normalizedKeyResultIds.map((keyResultId) => [keyResultId, [] as ReturnType<typeof mapAgileKeyResultHistoryPoint>[]])
  );
  const records = await fetchAirtableRecords(agileConnection.keyResultHistoryTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });

  const requestedKeyResultIds = new Set(normalizedKeyResultIds);

  for (const record of records) {
    const linkedKeyResultIds = getAgileKeyResultHistoryRecordIds(record).filter((keyResultId) =>
      requestedKeyResultIds.has(keyResultId)
    );

    for (const keyResultId of linkedKeyResultIds) {
      historyByKeyResultId[keyResultId]?.push(mapAgileKeyResultHistoryPoint(record));
    }
  }

  for (const keyResultId of normalizedKeyResultIds) {
    historyByKeyResultId[keyResultId].sort(compareAgileKeyResultHistoryPoints);
  }

  return {
    historyByKeyResultId,
    keyResultIds: normalizedKeyResultIds,
    recordCount: Object.values(historyByKeyResultId).reduce((total, history) => total + history.length, 0),
    tableName: agileConnection.keyResultHistoryTableName
  };
}

function getAgileKeyResultHistoryRecordIds(record: AirtableRecord) {
  return getLinkedRecordIds(getFieldValue(record.fields, "Key Result"));
}

function getAgileKeyResultSentimentFromMetricStatus(
  metricStatus: AgileKeyResultMetricStatus
): AgileKeyResultSentiment {
  if (metricStatus === "HOT") return "Rose";
  if (metricStatus === "BLEEDING") return "Thorn";
  return "Bud";
}

function calculateAgileKeyResultMetricStatus(
  keyResult: AgileKeyResultSentimentInput,
  history: ReturnType<typeof mapAgileKeyResultHistoryPoint>[]
): AgileKeyResultMetricStatus {
  const points =
    history.length > 0
      ? history.map((point) => ({
          currentValue: point.currentValue,
          initialValue: point.initialValue,
          targetValue: point.targetValue
        }))
      : [
          {
            currentValue: keyResult.currentValue ?? null,
            initialValue: keyResult.initialValue ?? null,
            targetValue: keyResult.targetValue ?? null
          }
        ];

  if (points.length < 2) {
    const progress = typeof keyResult.progress === "number" ? keyResult.progress : null;

    if (progress === null) return "NEW";
    if (progress >= 80) return "HOT";
    if (progress > 0) return "COLD";
    return "NEW";
  }

  const changedPoints: typeof points = [];
  let previousCurrent: number | null = null;
  let previousInitial: number | null = null;
  let previousTarget: number | null = null;

  for (const point of points) {
    const currentChanged = previousCurrent !== null && point.currentValue !== previousCurrent;
    const initialChanged = previousInitial !== null && point.initialValue !== previousInitial;
    const targetChanged = previousTarget !== null && point.targetValue !== previousTarget;

    if (previousCurrent === null || currentChanged || initialChanged || targetChanged) {
      changedPoints.push(point);
    }

    previousCurrent = point.currentValue;
    previousInitial = point.initialValue;
    previousTarget = point.targetValue;
  }

  if (changedPoints.length < 2) return "NEW";

  const recentPoints = changedPoints.slice(-5);
  const first = recentPoints[0];
  const last = recentPoints[recentPoints.length - 1];

  if (
    typeof first.currentValue !== "number" ||
    typeof first.initialValue !== "number" ||
    typeof last.currentValue !== "number" ||
    typeof last.targetValue !== "number"
  ) {
    return "NEW";
  }

  const isGrowthGoal = last.targetValue >= first.initialValue;
  const valueChange = last.currentValue - first.currentValue;
  const range = Math.abs(last.targetValue - first.initialValue) || 1;
  const changePercent = valueChange / range;
  const threshold = 0.05;

  if (isGrowthGoal) {
    if (changePercent > threshold) return "HOT";
    if (changePercent < -threshold) return "BLEEDING";
  } else {
    if (changePercent < -threshold) return "HOT";
    if (changePercent > threshold) return "BLEEDING";
  }

  return "COLD";
}

function getAgileKeyResultSentimentReason(
  metricStatus: AgileKeyResultMetricStatus,
  historyCount: number
) {
  if (metricStatus === "HOT") {
    return "The Key Result is moving toward its target with positive momentum.";
  }

  if (metricStatus === "BLEEDING") {
    return "The Key Result is moving away from its target and needs intervention.";
  }

  if (metricStatus === "COLD") {
    return "The Key Result is within the movement threshold and needs focus to accelerate.";
  }

  return historyCount > 0
    ? "History exists, but there are not enough value changes to determine a trend."
    : "There is not enough history yet to determine a trend.";
}

export async function analyzeAgileKeyResultSentiments(
  keyResults: AgileKeyResultSentimentInput[]
) {
  const normalizedKeyResults = keyResults
    .map((keyResult) => ({
      ...keyResult,
      id: requireNonEmptyString(keyResult.id, "Key Result"),
      title: keyResult.title?.trim() || keyResult.id
    }))
    .slice(0, 20);

  const historyByKeyResultId = (await listAgileKeyResultHistoryBulk(
    normalizedKeyResults.map((keyResult) => keyResult.id)
  )).historyByKeyResultId;
  const historyByKeyResult = normalizedKeyResults.map((keyResult) => ({
    history: historyByKeyResultId[keyResult.id] ?? [],
    keyResult
  }));

  const deterministicAnalyses = historyByKeyResult.map(({ history, keyResult }) => {
    const metricStatus = calculateAgileKeyResultMetricStatus(keyResult, history);
    const sentiment = getAgileKeyResultSentimentFromMetricStatus(metricStatus);

    return {
      confidence: history.length >= 2 ? "high" : history.length === 1 ? "medium" : "low",
      keyResultId: keyResult.id,
      metricStatus,
      model: "deterministic",
      reason: getAgileKeyResultSentimentReason(metricStatus, history.length),
      recommendedAction:
        sentiment === "Rose"
          ? "Protect the current execution pattern and watch for regression."
          : sentiment === "Thorn"
            ? "Review blockers, ownership, and target plan in the next OKR check-in."
            : "Define the next concrete action to move the Key Result toward target.",
      sentiment,
      usedHistoryPoints: history.length
    };
  });

  const openAIConfig = getOpenAIConfig();
  const model = openAIConfig.model || "gpt-5.4-mini";

  if (!openAIConfig.apiKey) {
    return {
      analyses: deterministicAnalyses,
      model,
      ok: true
    };
  }

  const input = [
    "You classify OKR Key Results using Rose, Bud, Thorn and HOT/COLD/BLEEDING/NEW criteria.",
    "Use the deterministic trend as the primary calculation. Do not contradict it unless the provided data clearly shows a calculation error.",
    "Mapping: HOT=Rose, BLEEDING=Thorn, COLD or NEW=Bud.",
    "Trend criteria: compare recent history movement toward target. More than 5% of range toward target is HOT. More than 5% away is BLEEDING. Within threshold is COLD. Insufficient changed history is NEW.",
    "Return concise business-facing explanations.",
    JSON.stringify(
      {
        keyResults: historyByKeyResult.map(({ history, keyResult }, index) => ({
          deterministic: deterministicAnalyses[index],
          history,
          keyResult
        }))
      },
      null,
      2
    )
  ].join("\n\n");

  try {
    const responseText = await callConfiguredModelForJson({
      input,
      model,
      schemaName: "agile_key_result_sentiment_analysis",
      schema: {
        additionalProperties: false,
        properties: {
          analyses: {
            items: {
              additionalProperties: false,
              properties: {
                confidence: {
                  enum: ["low", "medium", "high"],
                  type: "string"
                },
                keyResultId: {
                  type: "string"
                },
                metricStatus: {
                  enum: ["HOT", "COLD", "BLEEDING", "NEW"],
                  type: "string"
                },
                reason: {
                  type: "string"
                },
                recommendedAction: {
                  type: "string"
                },
                sentiment: {
                  enum: ["Rose", "Bud", "Thorn"],
                  type: "string"
                }
              },
              required: [
                "confidence",
                "keyResultId",
                "metricStatus",
                "reason",
                "recommendedAction",
                "sentiment"
              ],
              type: "object"
            },
            type: "array"
          }
        },
        required: ["analyses"],
        type: "object"
      }
    });
    const parsed = JSON.parse(responseText ?? "{}") as {
      analyses?: Array<{
        confidence: Confidence;
        keyResultId: string;
        metricStatus: AgileKeyResultMetricStatus;
        reason: string;
        recommendedAction: string;
        sentiment: AgileKeyResultSentiment;
      }>;
    };
    const byId = new Map(parsed.analyses?.map((analysis) => [analysis.keyResultId, analysis]) ?? []);

    return {
      analyses: deterministicAnalyses.map((analysis) => ({
        ...analysis,
        ...(byId.get(analysis.keyResultId) ?? {}),
        model
      })),
      model,
      ok: true
    };
  } catch (error) {
    return {
      analyses: deterministicAnalyses,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible generar el análisis de Rose/Bud/Thorn con IA.",
      model,
      ok: true
    };
  }
}

function getObjectiveHealthFallbackStatus(score: number, keyResultCount: number): AgileObjectiveHealthStatus {
  if (keyResultCount === 0 || score <= 0) return "Critical";
  if (score >= 80) return "Healthy";
  if (score >= 40) return "Needs Attention";
  return "At Risk";
}

function getObjectiveHealthFallbackSummary(
  status: AgileObjectiveHealthStatus,
  hotCount: number,
  bleedingCount: number,
  coldCount: number,
  newCount: number
) {
  if (status === "Healthy") {
    return "The Objective is progressing strongly, with enough KR momentum to keep execution on track.";
  }

  if (status === "Critical") {
    return "The Objective has limited measurable traction or no active KR coverage, so it needs immediate ownership review.";
  }

  if (status === "At Risk") {
    return bleedingCount > 0
      ? "Some Key Results are moving away from target, creating execution risk for this Objective."
      : "Progress is below the expected range and needs focused intervention to recover.";
  }

  if (coldCount + newCount > hotCount) {
    return "The Objective has signals, but most KRs are either stable or too new to prove momentum yet.";
  }

  return "The Objective has partial momentum and needs a clearer next action to convert progress into outcome.";
}

function buildObjectiveHealthFallbackAnalysis(
  objective: AgileObjectiveHealthInput,
  index: number
) {
  const score = typeof objective.score === "number" && Number.isFinite(objective.score)
    ? Math.max(0, Math.min(100, Math.round(objective.score)))
    : Math.round(
        ((objective.keyResults ?? []).reduce((sum, keyResult) => {
          const progress = typeof keyResult.progress === "number" && Number.isFinite(keyResult.progress)
            ? keyResult.progress
            : 0;

          return sum + Math.max(0, Math.min(100, progress));
        }, 0) / Math.max((objective.keyResults ?? []).length, 1))
      );
  const sentiments = objective.keyResultSentiments ?? [];
  const hotCount = sentiments.filter((sentiment) => sentiment.metricStatus === "HOT").length;
  const bleedingCount = sentiments.filter((sentiment) => sentiment.metricStatus === "BLEEDING").length;
  const coldCount = sentiments.filter((sentiment) => sentiment.metricStatus === "COLD").length;
  const newCount = sentiments.filter((sentiment) => sentiment.metricStatus === "NEW").length;
  const status = getObjectiveHealthFallbackStatus(score, (objective.keyResults ?? []).length);

  return {
    confidence: sentiments.length > 0 ? "medium" : "low",
    headline:
      status === "Healthy"
        ? "Objective has measurable momentum"
        : status === "Critical"
          ? "Objective needs immediate alignment"
          : status === "At Risk"
            ? "Objective is trending below plan"
            : "Objective needs focused acceleration",
    objectiveId: objective.id || `objective-${index + 1}`,
    primaryRisk:
      bleedingCount > 0
        ? "One or more Key Results are moving away from target."
        : newCount > 0
          ? "Some Key Results do not have enough historical signal yet."
          : "KR progress is not strong enough to confirm outcome delivery.",
    recommendedAction:
      status === "Healthy"
        ? "Protect the current operating rhythm and watch for regression."
        : "Clarify ownership, next milestone, and the Key Result that should move first.",
    score,
    status,
    summary: getObjectiveHealthFallbackSummary(status, hotCount, bleedingCount, coldCount, newCount)
  } as const;
}

export async function analyzeAgileObjectiveHealth(input: AgileObjectiveHealthAnalysisInput) {
  const normalizedObjectives = input.objectives
    .map((objective, index) => ({
      ...objective,
      id: objective.id?.trim() || `objective-${index + 1}`,
      title: objective.title?.trim() || objective.id || `Objective ${index + 1}`,
      keyResults: Array.isArray(objective.keyResults) ? objective.keyResults : [],
      keyResultSentiments: Array.isArray(objective.keyResultSentiments) ? objective.keyResultSentiments : []
    }))
    .slice(0, 12);
  const fallbackAnalyses = normalizedObjectives.map(buildObjectiveHealthFallbackAnalysis);
  const openAIConfig = getOpenAIConfig();
  const model = openAIConfig.model || "gpt-5.4-mini";

  if (!openAIConfig.apiKey || normalizedObjectives.length === 0) {
    return {
      analyses: fallbackAnalyses,
      model,
      ok: true
    };
  }

  try {
    const responseText = await callConfiguredModelForJson({
      input: [
        "You are helping PO/PM users understand Objective health in an OKR platform.",
        "Use the provided deterministic fallback as the guardrail. You may improve headline, summary, primaryRisk, recommendedAction, confidence, and status only if the data supports it.",
        "Classify each Objective using: Healthy, Needs Attention, At Risk, Critical.",
        "Anchor your reasoning to Objective score, KR progress, KR metric statuses, target dates, and available Key Project context. Do not invent data.",
        "Return concise, business-facing explanations. Headline must be 7 words or fewer. Summary must be one sentence.",
        JSON.stringify(
          {
            fallbackAnalyses,
            keyProjects: input.keyProjects ?? [],
            objectives: normalizedObjectives,
            project: input.project ?? null
          },
          null,
          2
        )
      ].join("\n\n"),
      model,
      schemaName: "agile_objective_health_analysis",
      schema: {
        additionalProperties: false,
        properties: {
          analyses: {
            items: {
              additionalProperties: false,
              properties: {
                confidence: {
                  enum: ["low", "medium", "high"],
                  type: "string"
                },
                headline: {
                  type: "string"
                },
                objectiveId: {
                  type: "string"
                },
                primaryRisk: {
                  type: "string"
                },
                recommendedAction: {
                  type: "string"
                },
                score: {
                  type: "number"
                },
                status: {
                  enum: ["Healthy", "Needs Attention", "At Risk", "Critical"],
                  type: "string"
                },
                summary: {
                  type: "string"
                }
              },
              required: [
                "confidence",
                "headline",
                "objectiveId",
                "primaryRisk",
                "recommendedAction",
                "score",
                "status",
                "summary"
              ],
              type: "object"
            },
            type: "array"
          }
        },
        required: ["analyses"],
        type: "object"
      }
    });
    const parsed = JSON.parse(responseText ?? "{}") as {
      analyses?: Array<{
        confidence: "low" | "medium" | "high";
        headline: string;
        objectiveId: string;
        primaryRisk: string;
        recommendedAction: string;
        score: number;
        status: AgileObjectiveHealthStatus;
        summary: string;
      }>;
    };
    const byId = new Map(parsed.analyses?.map((analysis) => [analysis.objectiveId, analysis]) ?? []);

    return {
      analyses: fallbackAnalyses.map((analysis) => ({
        ...analysis,
        ...(byId.get(analysis.objectiveId) ?? {})
      })),
      model,
      ok: true
    };
  } catch (error) {
    return {
      analyses: fallbackAnalyses,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible generar el análisis de salud del Objective con IA.",
      model,
      ok: true
    };
  }
}

function normalizePortfolioProject(project: AgilePortfolioAnalysisProjectInput, index: number) {
  const signalCounts = project.signalCounts ?? {};

  return {
    keyResultCount: Math.max(0, Math.round(Number(project.keyResultCount ?? 0))),
    objectiveCount: Math.max(0, Math.round(Number(project.objectiveCount ?? 0))),
    projectId: project.projectId?.trim() || `project-${index + 1}`,
    projectName: project.projectName?.trim() || `Project ${index + 1}`,
    score: typeof project.score === "number" && Number.isFinite(project.score) ? Math.round(project.score) : null,
    signalCounts: {
      bleeding: Math.max(0, Math.round(Number(signalCounts.bleeding ?? 0))),
      cold: Math.max(0, Math.round(Number(signalCounts.cold ?? 0))),
      hot: Math.max(0, Math.round(Number(signalCounts.hot ?? 0))),
      new: Math.max(0, Math.round(Number(signalCounts.new ?? 0)))
    },
    status:
      project.status === "empty" || project.status === "error" || project.status === "loading" || project.status === "ready"
        ? project.status
        : "empty"
  };
}

function buildPortfolioAnalysisFallback(input: AgilePortfolioAnalysisInput) {
  const projects = input.projects.map(normalizePortfolioProject).filter((project) => project.status !== "loading");
  const readyProjects = projects.filter((project) => project.status === "ready");
  const score =
    typeof input.portfolioScore === "number" && Number.isFinite(input.portfolioScore)
      ? Math.round(input.portfolioScore)
      : readyProjects.length > 0
        ? Math.round(
            readyProjects.reduce((total, project) => total + (project.score ?? 0), 0) / readyProjects.length
          )
        : null;
  const winners = readyProjects
    .filter((project) => (project.score ?? 0) >= 80 || project.signalCounts.hot >= 2)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
  const needsAttention = readyProjects
    .filter(
      (project) =>
        project.signalCounts.bleeding > 0 ||
        project.signalCounts.cold >= 2 ||
        (project.score ?? 100) < 50 ||
        project.signalCounts.new >= Math.max(2, project.keyResultCount)
    )
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
    .slice(0, 3);
  const noOkrCount = projects.filter((project) => project.status === "empty").length;

  return {
    executiveSummary:
      score === null
        ? "Portfolio analysis is waiting for loaded OKR data before a score can be calculated."
        : `Portfolio score is ${score}%, based on ${readyProjects.length} project${readyProjects.length === 1 ? "" : "s"} with loaded OKR data.`,
    needsAttention:
      needsAttention.length > 0
        ? needsAttention.map((project) => {
            if (project.signalCounts.bleeding > 0) {
              return `${project.projectName} needs attention because it has ${project.signalCounts.bleeding} BLEEDING Key Result signal${project.signalCounts.bleeding === 1 ? "" : "s"}.`;
            }

            if ((project.score ?? 100) < 50) {
              return `${project.projectName} needs attention because its score is ${project.score ?? 0}%.`;
            }

            if (project.signalCounts.cold >= 2) {
              return `${project.projectName} needs attention because ${project.signalCounts.cold} Key Results are COLD.`;
            }

            return `${project.projectName} needs more history because ${project.signalCounts.new} Key Results are NEW.`;
          })
        : noOkrCount > 0
          ? [`${noOkrCount} project${noOkrCount === 1 ? "" : "s"} do not have loaded OKRs yet.`]
          : ["No immediate portfolio risk is visible in the loaded OKR data."],
    winners:
      winners.length > 0
        ? winners.map(
            (project) =>
              `${project.projectName} is a winner with ${project.score ?? 0}% score and ${project.signalCounts.hot} HOT Key Result signal${project.signalCounts.hot === 1 ? "" : "s"}.`
          )
        : ["No winner can be identified yet from the loaded OKR data."]
  };
}

export async function analyzeAgilePortfolio(input: AgilePortfolioAnalysisInput) {
  const normalizedInput = {
    generatedFor: input.generatedFor?.trim() || "current portfolio",
    portfolioScore: typeof input.portfolioScore === "number" && Number.isFinite(input.portfolioScore) ? Math.round(input.portfolioScore) : null,
    projects: input.projects.map(normalizePortfolioProject).slice(0, 40)
  };
  const fallback = buildPortfolioAnalysisFallback(normalizedInput);
  const openAIConfig = getOpenAIConfig();
  const model = openAIConfig.model || "gpt-5.4-mini";

  if (!openAIConfig.apiKey || normalizedInput.projects.length === 0) {
    return {
      analysis: fallback,
      generatedAt: new Date().toISOString(),
      model,
      ok: true
    };
  }

  try {
    const responseText = await callConfiguredModelForJson({
      input: [
        "You write portfolio analysis for PO/PM users in an OKR platform.",
        "Use only the JSON data provided. Do not invent project names, scores, metrics, percentages, dates, counts, or statuses.",
        "If a fact is not present in the JSON, omit it or say there is not enough loaded OKR data.",
        "Reference exact project names and exact numbers from the JSON only.",
        "Tone: concise, executive, clear. Do not overhype. Do not use metaphors like cash cows or problem child.",
        "Return one executive summary paragraph, 2-4 Winners bullets, and 2-4 Needs Attention bullets.",
        "Winners should favor high score, HOT signals, and no BLEEDING signals.",
        "Needs Attention should favor BLEEDING, multiple COLD, low score, no OKRs, or too many NEW signals.",
        JSON.stringify(
          {
            fallback,
            portfolio: normalizedInput
          },
          null,
          2
        )
      ].join("\n\n"),
      model,
      schemaName: "agile_portfolio_analysis",
      schema: {
        additionalProperties: false,
        properties: {
          executiveSummary: {
            type: "string"
          },
          needsAttention: {
            items: {
              type: "string"
            },
            type: "array"
          },
          winners: {
            items: {
              type: "string"
            },
            type: "array"
          }
        },
        required: ["executiveSummary", "needsAttention", "winners"],
        type: "object"
      }
    });
    const parsed = JSON.parse(responseText ?? "{}") as {
      executiveSummary?: string;
      needsAttention?: string[];
      winners?: string[];
    };

    return {
      analysis: {
        executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
        needsAttention: Array.isArray(parsed.needsAttention) && parsed.needsAttention.length > 0
          ? parsed.needsAttention.slice(0, 4)
          : fallback.needsAttention,
        winners: Array.isArray(parsed.winners) && parsed.winners.length > 0
          ? parsed.winners.slice(0, 4)
          : fallback.winners
      },
      generatedAt: new Date().toISOString(),
      model,
      ok: true
    };
  } catch (error) {
    return {
      analysis: fallback,
      generatedAt: new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : "No fue posible generar el Portfolio Analysis con IA.",
      model,
      ok: true
    };
  }
}

const agileKeyResultDraftSchema = {
  additionalProperties: false,
  properties: {
    currentValue: {
      type: ["number", "null"]
    },
    explanation: {
      type: "string"
    },
    initialValue: {
      type: ["number", "null"]
    },
    keyResult: {
      type: "string"
    },
    metric: {
      type: "string"
    },
    status: {
      enum: ["Done", "In progress", "Todo"],
      type: "string"
    },
    targetDate: {
      type: "string"
    },
    targetValue: {
      type: ["number", "null"]
    }
  },
  required: [
    "currentValue",
    "explanation",
    "initialValue",
    "keyResult",
    "metric",
    "status",
    "targetDate",
    "targetValue"
  ],
  type: "object"
} satisfies Record<string, unknown>;

const agileObjectiveDraftSchema = {
  additionalProperties: false,
  properties: {
    draft: {
      additionalProperties: false,
      properties: {
        description: {
          type: "string"
        },
        explanation: {
          type: "string"
        },
        keyResults: {
          items: agileKeyResultDraftSchema,
          maxItems: 3,
          minItems: 3,
          type: "array"
        },
        metric: {
          type: "string"
        },
        objective: {
          type: "string"
        },
        priority: {
          type: "string"
        },
        targetDate: {
          type: "string"
        },
        type: {
          type: "string"
        }
      },
      required: [
        "description",
        "explanation",
        "keyResults",
        "metric",
        "objective",
        "priority",
        "targetDate",
        "type"
      ],
      type: "object"
    }
  },
  required: ["draft"],
  type: "object"
} satisfies Record<string, unknown>;

const agileObjectiveEditDraftSchema = {
  additionalProperties: false,
  properties: {
    draft: {
      additionalProperties: false,
      properties: {
        description: {
          type: "string"
        },
        explanation: {
          type: "string"
        },
        metric: {
          type: "string"
        },
        objective: {
          type: "string"
        },
        priority: {
          type: "string"
        },
        recordId: {
          type: "string"
        },
        status: {
          enum: ["Achieved", "In Progress", "Pending Review", "Underachieved"],
          type: "string"
        },
        targetDate: {
          type: "string"
        },
        type: {
          type: "string"
        }
      },
      required: [
        "description",
        "explanation",
        "metric",
        "objective",
        "priority",
        "recordId",
        "status",
        "targetDate",
        "type"
      ],
      type: "object"
    }
  },
  required: ["draft"],
  type: "object"
} satisfies Record<string, unknown>;

const agileSingleKeyResultDraftSchema = {
  additionalProperties: false,
  properties: {
    draft: agileKeyResultDraftSchema
  },
  required: ["draft"],
  type: "object"
} satisfies Record<string, unknown>;

const agileKeyResultEditDraftSchema = {
  additionalProperties: false,
  properties: {
    draft: {
      additionalProperties: false,
      properties: {
        currentValue: {
          type: ["number", "null"]
        },
        explanation: {
          type: "string"
        },
        initialValue: {
          type: ["number", "null"]
        },
        keyResult: {
          type: "string"
        },
        metric: {
          type: "string"
        },
        objectiveId: {
          type: "string"
        },
        recordId: {
          type: "string"
        },
        status: {
          enum: ["Done", "In progress", "Todo"],
          type: "string"
        },
        targetDate: {
          type: "string"
        },
        targetValue: {
          type: ["number", "null"]
        }
      },
      required: [
        "currentValue",
        "explanation",
        "initialValue",
        "keyResult",
        "metric",
        "objectiveId",
        "recordId",
        "status",
        "targetDate",
        "targetValue"
      ],
      type: "object"
    }
  },
  required: ["draft"],
  type: "object"
} satisfies Record<string, unknown>;

const agileKeyProjectDraftSchema = {
  additionalProperties: false,
  properties: {
    draft: {
      additionalProperties: false,
      properties: {
        clarity: {
          type: "number"
        },
        epicStory: {
          type: "string"
        },
        finalScore: {
          type: "number"
        },
        justification: {
          type: "string"
        },
        keyResultIds: {
          items: {
            type: "string"
          },
          type: "array"
        },
        name: {
          type: "string"
        },
        projectId: {
          type: "string"
        },
        status: {
          enum: ["Suggested by Resource"],
          type: "string"
        },
        strategicFocus: {
          type: "number"
        },
        valueOrientation: {
          type: "number"
        }
      },
      required: [
        "clarity",
        "epicStory",
        "finalScore",
        "justification",
        "keyResultIds",
        "name",
        "projectId",
        "status",
        "strategicFocus",
        "valueOrientation"
      ],
      type: "object"
    }
  },
  required: ["draft"],
  type: "object"
} satisfies Record<string, unknown>;

const agileKeyProjectEditDraftSchema = {
  additionalProperties: false,
  properties: {
    draft: {
      additionalProperties: false,
      properties: {
        clarity: {
          type: "number"
        },
        epicStory: {
          type: "string"
        },
        finalScore: {
          type: "number"
        },
        justification: {
          type: "string"
        },
        keyResultIds: {
          items: {
            type: "string"
          },
          type: "array"
        },
        name: {
          type: "string"
        },
        recordId: {
          type: "string"
        },
        status: {
          enum: ["Suggested by Resource"],
          type: "string"
        },
        strategicFocus: {
          type: "number"
        },
        valueOrientation: {
          type: "number"
        }
      },
      required: [
        "clarity",
        "epicStory",
        "finalScore",
        "justification",
        "keyResultIds",
        "name",
        "recordId",
        "status",
        "strategicFocus",
        "valueOrientation"
      ],
      type: "object"
    }
  },
  required: ["draft"],
  type: "object"
} satisfies Record<string, unknown>;

function getAgileDraftModel() {
  const openAIConfig = getOpenAIConfig();

  return openAIConfig.model || "gpt-5.4-mini";
}

export async function generateAgileObjectiveDraft(input: AgileObjectiveDraftInput) {
  const idea = requireNonEmptyString(input.idea, "Objective idea");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const projectName = requireNonEmptyString(input.projectName, "Project name");
  const model = getAgileDraftModel();
  const prompt = [
    "Generate a coherent OKR Objective draft for a PO/PM OKR platform.",
    "Use the user's objective idea as the primary intent. Use project context, existing objectives, and key projects to refine it, avoid duplication, and create measurable work.",
    "The Objective must be outcome-focused, specific, and suitable for a product/project team.",
    "Generate exactly 3 Key Results. Each KR must be measurable and include metric, initialValue, currentValue, targetValue, targetDate, status, and explanation.",
    "Use decimal percentages for percentage values: 0.35 means 35%. If a metric is a count or time value, use the natural numeric value.",
    "Prefer target dates in YYYY-MM-DD format. Use Todo for new KRs unless the context clearly says otherwise.",
    JSON.stringify(
      {
        existingObjectives: input.existingObjectives ?? [],
        keyProjects: input.keyProjects ?? [],
        objectiveIdea: idea,
        project: {
          id: projectId,
          name: projectName
        }
      },
      null,
      2
    )
  ].join("\n\n");
  const responseText = await callConfiguredModelForJson({
    input: prompt,
    model,
    schema: agileObjectiveDraftSchema,
    schemaName: "agile_objective_draft"
  });
  const parsed = JSON.parse(responseText ?? "{}") as {
    draft?: unknown;
  };

  if (!parsed.draft) {
    throw new Error("La IA no devolvió un borrador de Objective válido.");
  }

  return {
    draft: parsed.draft,
    model,
    ok: true
  };
}

export async function generateAgileObjectiveEditDraft(input: AgileObjectiveEditDraftInput) {
  const editInstructions = requireNonEmptyString(input.editInstructions, "Objective edit instructions");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const projectName = requireNonEmptyString(input.projectName, "Project name");
  const model = getAgileDraftModel();
  const prompt = [
    "Generate one edit proposal for the selected Objective in an OKR platform.",
    "The selected Objective target is fixed. Do not ask the user to choose another Objective, and do not switch targets.",
    "Use the user's edit instructions to improve only the selected Objective.",
    "Preserve existing values unless the user's edit instructions require a change.",
    "The Objective must remain outcome-focused, specific, and suitable for a product/project team.",
    "Use only the chatbot Objective edit contract: recordId, objective, description, explanation, metric, priority, status, targetDate, and type.",
    "Do not suggest, request, or output fields outside that contract.",
    "Never output Name, Quarter, Score Objetives, Key Results, calculated fields, lookup fields, rollup fields, Project, projectIds, or internal Airtable fields.",
    "Use Achieved, In Progress, Pending Review, or Underachieved for status. Preserve the current status unless the user explicitly asks to change it or the edit clearly implies it.",
    JSON.stringify(
      {
        currentObjective: input.currentObjective,
        editInstructions,
        keyProjects: input.keyProjects ?? [],
        keyResults: input.keyResults ?? [],
        project: {
          id: projectId,
          name: projectName
        }
      },
      null,
      2
    )
  ].join("\n\n");
  const responseText = await callConfiguredModelForJson({
    input: prompt,
    model,
    schema: agileObjectiveEditDraftSchema,
    schemaName: "agile_objective_edit_draft"
  });
  const parsed = JSON.parse(responseText ?? "{}") as {
    draft?: unknown;
  };

  if (!parsed.draft) {
    throw new Error("La IA no devolvió un borrador de edición de Objective válido.");
  }

  return {
    draft: parsed.draft,
    model,
    ok: true
  };
}

export async function generateAgileKeyResultDraft(input: AgileKeyResultDraftInput) {
  const idea = requireNonEmptyString(input.idea, "Key Result idea");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const projectName = requireNonEmptyString(input.projectName, "Project name");
  const model = getAgileDraftModel();
  const prompt = [
    "Generate one measurable Key Result draft for an OKR platform.",
    "Use the user's Key Result idea as the primary intent. Refine it using the project and Objective context. Avoid duplicating existing Key Results.",
    "The Key Result must be measurable, time-bound, and coherent with the Objective.",
    "Return only the Key Result create draft contract: keyResult, metric, explanation, status, initialValue, currentValue, targetValue, and targetDate.",
    "Do not suggest, request, mention, or output fields outside that create contract.",
    "Never output Quarter, Progress, Progress Number, Score Key Result, Key Result History, calculated fields, lookup fields, rollup fields, Project, Objective, projectIds, objectiveIds, projectId, or objectiveId.",
    "Use decimal percentages for percentage values: 0.35 means 35%. If a metric is a count or time value, use the natural numeric value.",
    JSON.stringify(
      {
        existingKeyResults: input.existingKeyResults ?? [],
        keyResultIdea: idea,
        objective: input.objective,
        project: {
          id: projectId,
          name: projectName
        }
      },
      null,
      2
    )
  ].join("\n\n");
  const responseText = await callConfiguredModelForJson({
    input: prompt,
    model,
    schema: agileSingleKeyResultDraftSchema,
    schemaName: "agile_key_result_draft"
  });
  const parsed = JSON.parse(responseText ?? "{}") as {
    draft?: unknown;
  };

  if (!parsed.draft) {
    throw new Error("La IA no devolvió un borrador de Key Result válido.");
  }

  return {
    draft: parsed.draft,
    model,
    ok: true
  };
}

export async function generateAgileKeyResultEditDraft(input: AgileKeyResultEditDraftInput) {
  const editInstructions = requireNonEmptyString(input.editInstructions, "Key Result edit instructions");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const projectName = requireNonEmptyString(input.projectName, "Project name");
  const model = getAgileDraftModel();
  const prompt = [
    "Generate one edit proposal for the selected Key Result in an OKR platform.",
    "The selected Key Result target is fixed. Do not ask the user to choose another Key Result, and do not switch targets.",
    "Use the user's edit instructions to improve only the selected Key Result.",
    "Do not ask the user to choose or change Objective during a normal Key Result edit.",
    "Preserve objectiveId exactly unless the user explicitly asks to move this Key Result to another Objective.",
    "Preserve existing values unless the user's edit instructions require a change.",
    "The Key Result must remain measurable, time-bound, and coherent with its Objective.",
    "Use only the chatbot Key Result edit contract: recordId, keyResult, metric, explanation, status, initialValue, currentValue, targetValue, targetDate, and objectiveId.",
    "Do not suggest, request, or output fields outside that contract.",
    "Never output Progress, Progress Number, Score Key Result, Key Result History, calculated fields, or internal Airtable fields.",
    "Use decimal percentages for percentage values: 0.35 means 35%. If a metric is a count or time value, use the natural numeric value.",
    "Use Todo, In progress, or Done for status. Preserve the current status unless the user explicitly asks to change it or the edit clearly implies it.",
    JSON.stringify(
      {
        currentKeyResult: input.currentKeyResult,
        editInstructions,
        keyResultHistory: input.keyResultHistory ?? [],
        objective: input.objective ?? null,
        project: {
          id: projectId,
          name: projectName
        },
        siblingKeyResults: input.siblingKeyResults ?? []
      },
      null,
      2
    )
  ].join("\n\n");
  const responseText = await callConfiguredModelForJson({
    input: prompt,
    model,
    schema: agileKeyResultEditDraftSchema,
    schemaName: "agile_key_result_edit_draft"
  });
  const parsed = JSON.parse(responseText ?? "{}") as {
    draft?: unknown;
  };

  if (!parsed.draft) {
    throw new Error("La IA no devolvió un borrador de edición de Key Result válido.");
  }

  return {
    draft: parsed.draft,
    model,
    ok: true
  };
}

export async function generateAgileKeyProjectDraft(input: AgileKeyProjectDraftInput) {
  const idea = requireNonEmptyString(input.idea, "Key Project idea");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const projectName = requireNonEmptyString(input.projectName, "Project name");
  const model = getAgileDraftModel();
  const prompt = [
    "Generate one Key Project draft for an OKR platform.",
    "A Key Project is delivery work, similar to an Epic, that should move one or more Key Results.",
    "Use the user's idea as the primary intent, but rewrite it into a clear, useful execution proposal.",
    "Use project context, Objectives, Key Results, existing Key Projects, and the selected Key Result when provided.",
    "The draft must not copy the user's wording verbatim unless it is already polished.",
    "The name must be concise, executive, and action-oriented.",
    "The epicStory must describe what will be built or delivered, who it helps, and how it supports the OKR outcome.",
    "The justification must explicitly connect the Key Project to the selected Key Result when one is provided.",
    "Always use Suggested by Resource for status.",
    "Use the selected Key Result sourceRecordId/id in keyResultIds when provided. Otherwise return an empty array.",
    "Use only the chatbot Key Project draft contract: name, epicStory, justification, clarity, strategicFocus, valueOrientation, finalScore, status, and keyResultIds.",
    "Do not suggest, request, or output fields outside that contract.",
    "Never mention Stories, Total Stories, AI Stories Assist, calculated fields, or internal Airtable fields unless the user explicitly asks about them.",
    "Return numeric quality scores from 0 to 1 for clarity, strategicFocus, valueOrientation, and finalScore so the user can review and confirm them.",
    "Use clarity for how well-scoped and understandable the delivery work is.",
    "Use strategicFocus for how directly the work supports the selected KR or strongest related OKR outcome.",
    "Use valueOrientation for how clearly the work improves user/client/product value.",
    "Use finalScore as an overall weighted quality signal. Do not return null scores.",
    JSON.stringify(
      {
        existingKeyProjects: input.existingKeyProjects ?? [],
        existingKeyResults: input.existingKeyResults ?? [],
        keyProjectIdea: idea,
        objectives: input.objectives ?? [],
        project: {
          id: projectId,
          name: projectName
        },
        selectedKeyResult: input.selectedKeyResult ?? null
      },
      null,
      2
    )
  ].join("\n\n");
  const responseText = await callConfiguredModelForJson({
    input: prompt,
    model,
    schema: agileKeyProjectDraftSchema,
    schemaName: "agile_key_project_draft"
  });
  const parsed = JSON.parse(responseText ?? "{}") as {
    draft?: unknown;
  };

  if (!parsed.draft) {
    throw new Error("La IA no devolvió un borrador de Key Project válido.");
  }

  return {
    draft: parsed.draft,
    model,
    ok: true
  };
}

export async function generateAgileKeyProjectEditDraft(input: AgileKeyProjectEditDraftInput) {
  const editInstructions = requireNonEmptyString(input.editInstructions, "Key Project edit instructions");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const projectName = requireNonEmptyString(input.projectName, "Project name");
  const model = getAgileDraftModel();
  const prompt = [
    "Generate one edit proposal for the selected Key Project in an OKR platform.",
    "The selected Key Project target is fixed. Do not ask the user to choose another Key Project, and do not switch targets.",
    "Use the user's edit instructions to improve only the selected Key Project.",
    "Use only the chatbot Key Project edit contract: recordId, name, epicStory, justification, clarity, strategicFocus, valueOrientation, finalScore, status, and keyResultIds.",
    "Do not suggest, request, or output fields outside that contract.",
    "Never mention Stories, Total Stories, AI Stories Assist, calculated fields, or internal Airtable fields unless the user explicitly asks about them.",
    "If the user does not explicitly ask to change, connect, remove, or replace Key Results, preserve the current keyResultIds exactly.",
    "Use Suggested by Resource for status.",
    "Return numeric quality scores from 0 to 1 for clarity, strategicFocus, valueOrientation, and finalScore.",
    "Rewrite name, epicStory, and justification only as much as needed to satisfy the user's edit instructions.",
    JSON.stringify(
      {
        currentKeyProject: input.currentKeyProject,
        editInstructions,
        existingKeyResults: input.existingKeyResults ?? [],
        objectives: input.objectives ?? [],
        project: {
          id: projectId,
          name: projectName
        }
      },
      null,
      2
    )
  ].join("\n\n");
  const responseText = await callConfiguredModelForJson({
    input: prompt,
    model,
    schema: agileKeyProjectEditDraftSchema,
    schemaName: "agile_key_project_edit_draft"
  });
  const parsed = JSON.parse(responseText ?? "{}") as {
    draft?: unknown;
  };

  if (!parsed.draft) {
    throw new Error("La IA no devolvió un borrador de edición de Key Project válido.");
  }

  return {
    draft: parsed.draft,
    model,
    ok: true
  };
}

export async function listAgileObjectivesForProject(projectId: string) {
  const agileConnection = getAgileAirtableConnection();
  const records = await fetchAirtableRecords(agileConnection.objectiveTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });
  const objectives = records
    .map(mapAgileObjective)
    .filter((objective) => objective.projectIds.includes(projectId))
    .sort((left, right) => {
      const leftCreatedAt = Date.parse(left.createdAt);
      const rightCreatedAt = Date.parse(right.createdAt);

      if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt)) {
        return rightCreatedAt - leftCreatedAt;
      }

      if (Number.isFinite(leftCreatedAt)) {
        return -1;
      }

      if (Number.isFinite(rightCreatedAt)) {
        return 1;
      }

      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });

  const keyResultRecords = await fetchRecordsByIds(
    agileConnection.keyResultTableName,
    objectives.flatMap((objective) => objective.keyResultIds),
    [],
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );
  const keyResultsById = new Map(
    keyResultRecords.map((record) => [record.id, mapAgileKeyResult(record)])
  );
  const hydratedObjectives = objectives.map((objective) => ({
    ...objective,
    keyResults: objective.keyResultIds
      .map((keyResultId) => keyResultsById.get(keyResultId))
      .filter((keyResult): keyResult is ReturnType<typeof mapAgileKeyResult> => Boolean(keyResult))
  }));

  return {
    objectives: hydratedObjectives,
    projectId,
    recordCount: hydratedObjectives.length,
    tableName: agileConnection.objectiveTableName
  };
}

export async function createAgileObjective(input: CreateAgileObjectiveInput) {
  const agileConnection = getAgileAirtableConnection();
  const objective = requireNonEmptyString(input.objective, "Objective");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const status = getOptionalObjectiveStatus(input.status) ?? "Pending Review";

  const record = await createAirtableRecord(
    agileConnection.objectiveTableName,
    compactAirtableCreateFields({
      "AI suggested key results": input.aiSuggestedKeyResults?.trim() ?? "",
      "Explanation": input.explanation?.trim() ?? "",
      "Metric": input.metric?.trim() ?? "",
      "Name": objective,
      "Objective": objective,
      "Objetive Description": input.description?.trim() ?? "",
      "Priority": input.priority?.trim() ?? "",
      "Project": [projectId],
      "Quarter": input.quarter?.trim() ?? "",
      "Status": status,
      "Target Date": input.targetDate?.trim() || null,
      "Type": input.type?.trim() ?? ""
    }),
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );

  return {
    objective: mapAgileObjective(record),
    tableName: agileConnection.objectiveTableName
  };
}

export async function createAgileKeyResult(input: CreateAgileKeyResultInput) {
  const agileConnection = getAgileAirtableConnection();
  const keyResult = requireNonEmptyString(input.keyResult, "Key Result");
  const objectiveId = requireNonEmptyString(input.objectiveId, "Objective");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const status = getOptionalKeyResultStatus(input.status) ?? "Todo";
  const initialValue = normalizeNullablePercentInput(input.initialValue);
  const currentValue = normalizeNullablePercentInput(input.currentValue);
  const targetValue = normalizeNullablePercentInput(input.targetValue);
  const progress = calculateAgileKeyResultProgress(input);
  const connection = {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  };
  const [objectiveRecord] = await fetchRecordsByIds(
    agileConnection.objectiveTableName,
    [objectiveId],
    ["Project", "Key Results"],
    connection
  );

  if (!objectiveRecord) {
    throw new Error("No se encontró el Objective seleccionado.");
  }

  const objectiveProjectIds = getLinkedRecordIds(getFieldValue(objectiveRecord.fields, "Project"));
  if (!objectiveProjectIds.includes(projectId)) {
    throw new Error("El Objective seleccionado no pertenece al Project indicado.");
  }

  const record = await createAirtableRecord(
    agileConnection.keyResultTableName,
    compactAirtableCreateFields({
      "Current Value": currentValue,
      "Explanation": input.explanation?.trim() ?? "",
      "Initial Value": initialValue,
      "Key Result": keyResult,
      "Metric": input.metric?.trim() ?? "",
      "Name": keyResult,
      "Objetive": [objectiveId],
      "Progress": progress === null ? null : progress / 100,
      "Progress Number": progress,
      "Project": [projectId],
      "Quarter": input.quarter?.trim() ?? "",
      "Status": status,
      "Target Date": input.targetDate?.trim() || null,
      "Target Value": targetValue
    }),
    connection
  );

  const existingKeyResultIds = getLinkedRecordIds(getFieldValue(objectiveRecord.fields, "Key Results"));
  await updateAirtableRecord(
    agileConnection.objectiveTableName,
    objectiveId,
    {
      "Key Results": [...new Set([...existingKeyResultIds, record.id])]
    },
    connection
  );

  return {
    keyResult: mapAgileKeyResult(record),
    objectiveId,
    projectId,
    tableName: agileConnection.keyResultTableName
  };
}

export async function createAgileKeyProject(input: CreateAgileKeyProjectInput) {
  const agileConnection = getAgileAirtableConnection();
  const name = requireNonEmptyString(input.name, "Key Project Name");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const status = getOptionalKeyProjectStatus(input.status) ?? "Suggested by Resource";

  const record = await createAirtableRecord(
    agileConnection.keyProjectTableName,
    compactAirtableCreateFields({
      "Don't Show In Singular Stories": input.dontShowInSingularStories === true,
      "Epic Name": name,
      "Epic Story": input.epicStory?.trim() ?? "",
      "Justification": input.justification?.trim() ?? "",
      "Projects": [projectId],
      "Status": status,
      "Total Stories": input.totalStories ?? null
    }),
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );

  return {
    keyProject: mapAgileKeyProject(record),
    projectId,
    tableName: agileConnection.keyProjectTableName
  };
}

function extractEmailsFromParticipant(value: string) {
  const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

  return [...new Set(matches.map((email) => normalizeEmail(email)))];
}

export function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function buildRecordIdsFilterFormula(recordIds: string[]) {
  if (recordIds.length === 0) {
    return "";
  }

  if (recordIds.length === 1) {
    return `RECORD_ID()="${escapeFormulaValue(recordIds[0])}"`;
  }

  return `OR(${recordIds
    .map((recordId) => `RECORD_ID()="${escapeFormulaValue(recordId)}"`)
    .join(",")})`;
}

export async function fetchRecordsByIds(
  tableName: string,
  recordIds: string[],
  fields: string[],
  connection?: { apiToken: string; baseId: string }
) {
  const uniqueIds = [...new Set(recordIds.filter((recordId) => recordId.trim().length > 0))];

  if (uniqueIds.length === 0) {
    return [] as AirtableRecord[];
  }

  const records = await Promise.all(
    chunkArray(uniqueIds, 25).map((recordIdChunk) =>
      fetchAirtableRecords(tableName, {
        apiToken: connection?.apiToken,
        baseId: connection?.baseId,
        fields,
        filterByFormula: buildRecordIdsFilterFormula(recordIdChunk)
      })
    )
  );

  return dedupeAirtableRecords(records.flat());
}

export async function updateAirtableRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>,
  connection?: { apiToken: string; baseId: string }
) {
  const airtableConfig = getAirtableConfig();
  const baseId = connection?.baseId || airtableConfig.airtableBaseId;
  const apiToken = connection?.apiToken || airtableConfig.airtableApiToken;
  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`
  );

  const response = await fetch(url, {
    body: JSON.stringify({
      fields,
      typecast: true
    }),
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  if (!response.ok) {
    let details = "";
    let syncedTableError: string | null = null;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
          type?: string;
        };
      };
      details = payload.error?.message
        ? `: ${payload.error.message}`
        : payload.error?.type
          ? `: ${payload.error.type}`
          : "";

      if (payload.error?.message?.toLowerCase().includes("externally synced")) {
        throw new Error(
          `La tabla ${tableName} en Airtable está sincronizada externamente y no permite crear registros desde la API. Crea el registro en la tabla fuente o configura una tabla editable para OKRs.`
        );
      }
    } catch {
      details = "";
    }

    throw new Error(`Airtable request failed for table ${tableName} with status ${response.status}${details}`);
  }

  return (await response.json()) as AirtableRecord;
}

export async function createAirtableRecord(
  tableName: string,
  fields: Record<string, unknown>,
  connection?: { apiToken: string; baseId: string }
) {
  const airtableConfig = getAirtableConfig();
  const baseId = connection?.baseId || airtableConfig.airtableBaseId;
  const apiToken = connection?.apiToken || airtableConfig.airtableApiToken;
  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
  );

  const response = await fetch(url, {
    body: JSON.stringify({
      fields,
      typecast: true
    }),
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    let details = "";
    let syncedTableError: string | null = null;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
          type?: string;
        };
      };
      details = payload.error?.message
        ? `: ${payload.error.message}`
        : payload.error?.type
          ? `: ${payload.error.type}`
          : "";
      if (payload.error?.message?.toLowerCase().includes("externally synced")) {
        syncedTableError = `La tabla ${tableName} en Airtable está sincronizada externamente y no permite crear registros desde la API. Crea el registro en la tabla fuente o configura una tabla editable para OKRs.`;
      }
    } catch {
      details = "";
    }

    if (syncedTableError) {
      throw new Error(syncedTableError);
    }

    throw new Error(`Airtable create failed for table ${tableName} with status ${response.status}${details}`);
  }

  return (await response.json()) as AirtableRecord;
}

export function getLinkedRecordIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getFirstTextValue(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item.trim();
    }
  }

  return null;
}

export function getFirstPersonEmail(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (isPlainRecord(item) && typeof item.email === "string" && item.email.trim().length > 0) {
      return item.email.trim();
    }
  }

  return null;
}

function getDateLiteralValue(value: unknown) {
  const textValue = getFirstTextValue(value);

  if (!textValue) {
    return null;
  }

  return textValue.slice(0, 10);
}

function parseJsonRecord(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;

    return typeof parsedValue === "object" && parsedValue !== null
      ? (parsedValue as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonRecordFromFields(record: AirtableRecord, fieldName: string) {
  return parseJsonRecord(record.fields[fieldName]);
}

function getNestedValue(record: Record<string, unknown> | null, path: string[]) {
  if (!record) {
    return null;
  }

  let currentValue: unknown = record;

  for (const key of path) {
    if (!isPlainRecord(currentValue)) {
      return null;
    }

    currentValue = currentValue[key];
  }

  return currentValue;
}

function getNestedTextValue(record: Record<string, unknown> | null, path: string[]) {
  const currentValue = getNestedValue(record, path);

  return typeof currentValue === "string" && currentValue.trim().length > 0
    ? currentValue.trim()
    : null;
}

function getNestedArrayValue(record: Record<string, unknown> | null, path: string[]) {
  const value = getNestedValue(record, path);

  return Array.isArray(value) ? value : [];
}

function getNestedRecordValue(record: Record<string, unknown> | null, path: string[]) {
  const value = getNestedValue(record, path);

  return isPlainRecord(value) ? value : null;
}

function getTextItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (isPlainRecord(item) && typeof item.text === "string") {
        return item.text.trim();
      }

      return "";
    })
    .filter((item) => item.length > 0);
}

function getNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function createFallbackPersonName(email: string) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getParticipantRecords(rawPayload: Record<string, unknown> | null) {
  return [
    ...getNestedArrayValue(rawPayload, ["participants"]),
    ...getNestedArrayValue(rawPayload, ["transcript", "participants"])
  ].filter(isPlainRecord);
}

function getCoachingParticipantsForEmails(
  rawPayload: Record<string, unknown> | null,
  emails: string[]
) {
  const normalizedEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  const participantRecords = getParticipantRecords(rawPayload);

  return normalizedEmails.map((email) => {
    const participant = participantRecords.find(
      (record) => typeof record.email === "string" && normalizeEmail(record.email) === email
    );
    const name =
      typeof participant?.name === "string" && participant.name.trim().length > 0
        ? participant.name.trim()
        : createFallbackPersonName(email);
    const role =
      typeof participant?.role === "string" && participant.role.trim().length > 0
        ? participant.role.trim()
        : null;

    return {
      avatarUrl: null,
      email,
      name,
      role
    } satisfies CoachingParticipant;
  });
}

function getCoachingMeetingTitle(rawPayload: Record<string, unknown> | null) {
  return (
    getNestedTextValue(rawPayload, ["meeting_title"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meeting_title"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meta", "meeting_title"]) ??
    getNestedTextValue(rawPayload, ["transcript", "title"]) ??
    "Reunión sin título"
  );
}

function getCoachingMeetingDatetime(rawPayload: Record<string, unknown> | null, record: AirtableRecord) {
  return (
    getNestedTextValue(rawPayload, ["meeting_datetime"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meeting_datetime"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meta", "meeting_datetime"]) ??
    getNestedTextValue(rawPayload, ["transcript", "start_time"]) ??
    getFirstTextValue(record.fields[COACHING_INPUT_LOG_RECEIVED_AT_FIELD])
  );
}

function getCoachingMetricsScores(
  rawPayload: Record<string, unknown> | null,
  metricsJson: Record<string, unknown> | null
) {
  const scores =
    getNestedRecordValue(metricsJson, ["scores"]) ??
    getNestedRecordValue(rawPayload, ["metrics", "scores"]) ??
    {};
  const normalizedScores: Record<string, number | null> = {};

  for (const [key, value] of Object.entries(scores)) {
    normalizedScores[key] = getNumberOrNull(value);
  }

  return normalizedScores;
}

function createCoachingContextRecord(
  record: AirtableRecord,
  normalizedParticipantEmail: string,
  normalizedActiveSessionEmail?: string
) {
  const participantValue = getFirstTextValue(record.fields[COACHING_INPUT_LOG_PARTICIPANT_FIELD]) ?? "";
  const participantEmails = extractEmailsFromParticipant(participantValue);
  const rawPayload = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD);
  const evidenceMeeting = createCoachingEvidenceMeeting(record);
  const relevantEmails = normalizedActiveSessionEmail &&
    normalizedActiveSessionEmail !== normalizedParticipantEmail
    ? [normalizedParticipantEmail, normalizedActiveSessionEmail]
    : [normalizedParticipantEmail];

  return {
    id: record.id,
    fields: {
      action_items: evidenceMeeting.actionItems,
      coaching_analysis: evidenceMeeting.coachingAnalysis,
      coaching_summary: evidenceMeeting.coachingSummary,
      meeting_datetime: evidenceMeeting.when,
      meeting_title: evidenceMeeting.title,
      metrics_scores: evidenceMeeting.metricsScores,
      [COACHING_INPUT_LOG_UNIQUE_KEY_FIELD]:
        getFirstTextValue(record.fields[COACHING_INPUT_LOG_UNIQUE_KEY_FIELD]) ?? record.id,
      topics: evidenceMeeting.topics,
      transcript_summary: evidenceMeeting.transcriptSummary
    },
    participantEmails,
    participants: getCoachingParticipantsForEmails(rawPayload, relevantEmails)
  };
}

function getRecordSprintIds(record: AirtableRecord) {
  const linkedSprintIds = getLinkedRecordIds(record.fields["Sprints"]);

  if (linkedSprintIds.length > 0) {
    return linkedSprintIds;
  }

  return getLinkedRecordIds(record.fields["Sprint"]);
}

async function resolveSprintDisplayNames(records: AirtableRecord[]) {
  const sprintIds = [...new Set(records.flatMap((record) => getRecordSprintIds(record)))];

  if (sprintIds.length === 0) {
    return new Map<string, string>();
  }

  const sprintRecords = await fetchRecordsByIds(SPRINT_TABLE_NAME, sprintIds, [SPRINT_NAME_FIELD]);
  const sprintDisplayNameById = new Map<string, string>();

  for (const sprintRecord of sprintRecords) {
    const sprintName = getFirstTextValue(sprintRecord.fields[SPRINT_NAME_FIELD]);

    if (sprintName) {
      sprintDisplayNameById.set(sprintRecord.id, sprintName);
    }
  }

  return sprintDisplayNameById;
}

async function hydrateTrustworthinessRecords(records: AirtableRecord[]) {
  const sprintDisplayNameById = await resolveSprintDisplayNames(records);

  return records.map((record) => ({
    id: record.id,
    fields: {
      ...record.fields,
      "Project / Sprint": getRecordSprintIds(record)
        .map((sprintId) => sprintDisplayNameById.get(sprintId) ?? null)
        .filter((value): value is string => value !== null)
    }
  }));
}

function canEditTrustworthinessRecord(record: AirtableRecord, evaluatorEmail: string) {
  assertTrustworthinessRecordOwnership(record, evaluatorEmail);
  const ratingStatus = record.fields["Rating Status"];
  const normalizedStatus =
    typeof ratingStatus === "string" ? normalizeEmail(ratingStatus) : "";

  if (normalizedStatus !== "pending") {
    throw new Error("Solo se pueden editar evaluaciones con status Pending.");
  }
}

function assertTrustworthinessRecordOwnership(record: AirtableRecord, evaluatorEmail: string) {
  const normalizedEvaluatorEmail = normalizeEmail(evaluatorEmail);
  const rawEvaluatorField = record.fields[TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD];
  const evaluatorEmails = Array.isArray(rawEvaluatorField)
    ? rawEvaluatorField
    : rawEvaluatorField
      ? [rawEvaluatorField]
      : [];

  const isOwnedByEvaluator = evaluatorEmails.some(
    (value) => typeof value === "string" && normalizeEmail(value) === normalizedEvaluatorEmail
  );

  if (!isOwnedByEvaluator) {
    throw new Error("No autorizado para editar esta evaluación.");
  }
}

function normalizeTrustworthinessRatingStatus(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = normalizeEmail(value);

  if (normalizedValue === "pending") {
    return "Pending";
  }

  if (normalizedValue === "done") {
    return "Done";
  }

  return null;
}

export async function listTrustworthinessRecords(selectedPeriods: string[], evaluatorEmail: string) {
  const tableName = getTrustworthinessTableName();

  const { filterByFormula, selectedPeriods: normalizedSelectedPeriods } =
    buildTrustworthinessFilterFormula(selectedPeriods, evaluatorEmail);
  const records = dedupeAirtableRecords(
    await fetchAirtableRecords(tableName, {
      filterByFormula
    })
  );
  const hydratedRecords = await hydrateTrustworthinessRecords(records);

  return {
    evaluatorEmail,
    selectedPeriods: normalizedSelectedPeriods,
    filtering: {
      applied: true,
      reason: `Filtrado en Airtable por ${TRUSTWORTHINESS_START_FIELD}, ${TRUSTWORTHINESS_END_FIELD} y ${TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD}.`
    },
    recordCount: records.length,
    records: hydratedRecords,
    tableName
  };
}

export async function updateTrustworthinessRecord(
  recordId: string,
  evaluatorEmail: string,
  fields: TrustworthinessRecordUpdateFields
) {
  const tableName = getTrustworthinessTableName();
  const [existingRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!existingRecord) {
    throw new Error("No se encontró la evaluación solicitada.");
  }

  assertTrustworthinessRecordOwnership(existingRecord, evaluatorEmail);

  const fieldKeys = Object.keys(fields);
  const isStatusOnlyUpdate =
    fieldKeys.length > 0 && fieldKeys.every((fieldKey) => fieldKey === "Rating Status");

  if (!isStatusOnlyUpdate) {
    canEditTrustworthinessRecord(existingRecord, evaluatorEmail);
  }

  if (Object.prototype.hasOwnProperty.call(fields, "Rating Status")) {
    const normalizedStatus = normalizeTrustworthinessRatingStatus(fields["Rating Status"]);

    if (!normalizedStatus) {
      throw new Error("El status debe ser Pending o Done.");
    }

    fields["Rating Status"] = normalizedStatus;
  }

  await updateAirtableRecord(tableName, recordId, fields);

  const [updatedRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!updatedRecord) {
    throw new Error("No fue posible refrescar la evaluación actualizada.");
  }

  const [hydratedRecord] = await hydrateTrustworthinessRecords([updatedRecord]);

  if (!hydratedRecord) {
    throw new Error("No fue posible hidratar la evaluación actualizada.");
  }

  return mergeTrustworthinessRecordFields(hydratedRecord, fields);
}

function getTrustworthinessRecordEvaluatedEmail(record: AirtableRecord) {
  return (
    getFirstTextValue(record.fields["Email From Evaluated"]) ??
    getFirstPersonEmail(record.fields["User (de Evaluated) (de TW Examns)"])
  );
}

function getAssistantSuggestionPillarJson(
  suggestion: Record<string, unknown> | undefined,
  pillar: PillarKey
) {
  if (!suggestion || !isPlainRecord(suggestion.pillars)) {
    return undefined;
  }

  const pillarPayload = suggestion.pillars[pillar];

  if (!isPlainRecord(pillarPayload)) {
    return undefined;
  }

  return JSON.stringify(pillarPayload);
}

function validateAssistantSaveContext(
  recordId: string,
  record: AirtableRecord,
  input: TrustworthinessAssistantSaveInput
) {
  const context = input.context;

  if (!context || context.recordId !== recordId) {
    throw new Error("El contexto del chat no corresponde a la evaluación.");
  }

  const participantEmail = context.participantEmail?.trim().toLowerCase();

  if (!participantEmail) {
    throw new Error("El contexto del chat no incluye el talento evaluado.");
  }

  const recordEvaluatedEmail = getTrustworthinessRecordEvaluatedEmail(record);

  if (recordEvaluatedEmail && normalizeEmail(recordEvaluatedEmail) !== participantEmail) {
    throw new Error("El contexto del chat pertenece a otro talento.");
  }

  if (
    typeof context.meetingsCount !== "number" ||
    !Number.isInteger(context.meetingsCount) ||
    context.meetingsCount < 0
  ) {
    throw new Error("El contexto del chat no incluye una cantidad válida de reuniones.");
  }
}

function mergeSavedAssistantProposalIntoRecord(
  record: AirtableRecord,
  proposal: TrustworthinessAssistantProposal,
  ratingStatus: "Pending" | "Done",
  twSuggestion: Record<string, unknown> | undefined
) {
  const fields: TrustworthinessRecordUpdateFields = {
    "Credibility Points": proposal.credibilityPoints,
    "Feedback": proposal.feedback,
    "Group Thinking Points": proposal.groupThinkingPoints,
    "Intimacy Points": proposal.intimacyPoints,
    "Rating Status": ratingStatus,
    "Reliability Points": proposal.reliabilityPoints
  };
  const credibilityAiJson = getAssistantSuggestionPillarJson(twSuggestion, "credibility");
  const groupThinkingAiJson = getAssistantSuggestionPillarJson(twSuggestion, "groupThinking");
  const intimacyAiJson = getAssistantSuggestionPillarJson(twSuggestion, "intimacy");
  const reliabilityAiJson = getAssistantSuggestionPillarJson(twSuggestion, "reliability");

  if (credibilityAiJson) {
    fields["Credibility AI JSON"] = credibilityAiJson;
  }

  if (groupThinkingAiJson) {
    fields["Group Thinking Points AI JSON"] = groupThinkingAiJson;
  }

  if (intimacyAiJson) {
    fields["Intimacy AI JSON"] = intimacyAiJson;
  }

  if (reliabilityAiJson) {
    fields["Reliability AI JSON"] = reliabilityAiJson;
  }

  return mergeTrustworthinessRecordFields(record, fields);
}

export async function saveTrustworthinessAssistantProposal(
  recordId: string,
  evaluatorEmail: string,
  input: TrustworthinessAssistantSaveInput
) {
  if (!input.confirmedByUser) {
    throw new Error("La confirmación explícita del usuario es obligatoria para guardar.");
  }

  if (
    input.agentId !== TRUSTWORTHINESS_ASSISTANT_AGENT_ID ||
    input.agentVersion !== TRUSTWORTHINESS_ASSISTANT_AGENT_VERSION
  ) {
    throw new Error("La configuración del agente no corresponde al asistente de revisión TW.");
  }

  if (!input.proposal) {
    throw new Error("La propuesta del asistente es obligatoria para guardar.");
  }

  const proposal = validateAssistantProposal(input.proposal);
  const normalizedStatus = normalizeTrustworthinessRatingStatus(input.ratingStatus);

  if (!normalizedStatus) {
    throw new Error("El status debe ser Pending o Done.");
  }

  const tableName = getTrustworthinessTableName();
  const [existingRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!existingRecord) {
    throw new Error("No se encontró la evaluación solicitada.");
  }

  canEditTrustworthinessRecord(existingRecord, evaluatorEmail);
  validateAssistantSaveContext(recordId, existingRecord, input);

  const fields: TrustworthinessRecordUpdateFields = {
    "Credibility Points": proposal.credibilityPoints,
    "Feedback": proposal.feedback,
    "Group Thinking Points": proposal.groupThinkingPoints,
    "Intimacy Points": proposal.intimacyPoints,
    "Rating Status": normalizedStatus,
    "Reliability Points": proposal.reliabilityPoints
  };
  const credibilityAiJson = getAssistantSuggestionPillarJson(input.twSuggestion, "credibility");
  const groupThinkingAiJson = getAssistantSuggestionPillarJson(input.twSuggestion, "groupThinking");
  const intimacyAiJson = getAssistantSuggestionPillarJson(input.twSuggestion, "intimacy");
  const reliabilityAiJson = getAssistantSuggestionPillarJson(input.twSuggestion, "reliability");

  if (credibilityAiJson) {
    fields["Credibility AI JSON"] = credibilityAiJson;
  }

  if (groupThinkingAiJson) {
    fields["Group Thinking Points AI JSON"] = groupThinkingAiJson;
  }

  if (intimacyAiJson) {
    fields["Intimacy AI JSON"] = intimacyAiJson;
  }

  if (reliabilityAiJson) {
    fields["Reliability AI JSON"] = reliabilityAiJson;
  }

  await updateAirtableRecord(tableName, recordId, fields);

  const [updatedRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!updatedRecord) {
    throw new Error("No fue posible refrescar la evaluación actualizada.");
  }

  const [hydratedRecord] = await hydrateTrustworthinessRecords([updatedRecord]);

  if (!hydratedRecord) {
    throw new Error("No fue posible hidratar la evaluación actualizada.");
  }

  return mergeSavedAssistantProposalIntoRecord(
    hydratedRecord,
    proposal,
    normalizedStatus,
    input.twSuggestion
  );
}

export async function listCoachingInputLogs(
  selectedPeriods: string[],
  participantEmail: string,
  activeSessionEmail?: string,
  explicitRange?: DateRangeLiteral
) {
  const normalizedParticipantEmail = normalizeEmail(participantEmail);
  const normalizedActiveSessionEmail = activeSessionEmail
    ? normalizeEmail(activeSessionEmail)
    : undefined;
  const connection = getCoachingInputLogConnection();
  const { filterByFormula, selectedPeriods: normalizedSelectedPeriods } =
    buildCoachingInputLogFilterFormula(
      selectedPeriods,
      normalizedParticipantEmail,
      normalizedActiveSessionEmail,
      explicitRange
    );
  const records = dedupeAirtableRecords(
    await fetchAirtableRecords(connection.tableName, {
      apiToken: connection.apiToken,
      baseId: connection.baseId,
      fields: [
        COACHING_INPUT_LOG_UNIQUE_KEY_FIELD,
        COACHING_INPUT_LOG_PARTICIPANT_FIELD,
        COACHING_INPUT_LOG_RECEIVED_AT_FIELD,
        COACHING_INPUT_LOG_METRICS_JSON_FIELD,
        COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD
      ],
      filterByFormula
    })
  )
    .map((record) =>
      createCoachingContextRecord(
        record,
        normalizedParticipantEmail,
        normalizedActiveSessionEmail
      )
    )
    .filter((record) => record.participantEmails.includes(normalizedParticipantEmail))
    .sort((left, right) => {
      const leftReceivedAt = String(left.fields.meeting_datetime ?? "");
      const rightReceivedAt = String(right.fields.meeting_datetime ?? "");

      return rightReceivedAt.localeCompare(leftReceivedAt);
    });

  return {
    filtering: {
      applied: true,
      reason: normalizedActiveSessionEmail &&
        normalizedActiveSessionEmail !== normalizedParticipantEmail
        ? `Filtrado en Airtable por ${COACHING_INPUT_LOG_RECEIVED_AT_FIELD} y coincidencia conjunta de ${normalizedParticipantEmail} + ${normalizedActiveSessionEmail} dentro de ${COACHING_INPUT_LOG_PARTICIPANT_FIELD}.`
        : `Filtrado en Airtable por ${COACHING_INPUT_LOG_RECEIVED_AT_FIELD} y coincidencia de email dentro de ${COACHING_INPUT_LOG_PARTICIPANT_FIELD}.`
    },
    activeSessionEmail: normalizedActiveSessionEmail ?? null,
    participantEmail: normalizedParticipantEmail,
    recordCount: records.length,
    records,
    selectedPeriods: normalizedSelectedPeriods,
    tableName: connection.tableName
  };
}

async function fetchCoachingInputLogRecordsForContext(
  participantEmail: string,
  activeSessionEmail: string | undefined,
  explicitRange: DateRangeLiteral,
  recordIds?: string[]
) {
  const normalizedParticipantEmail = normalizeEmail(participantEmail);
  const normalizedActiveSessionEmail = activeSessionEmail
    ? normalizeEmail(activeSessionEmail)
    : undefined;
  const connection = getCoachingInputLogConnection();
  const { filterByFormula } = buildCoachingInputLogFilterFormula(
    [],
    normalizedParticipantEmail,
    normalizedActiveSessionEmail,
    explicitRange
  );
  const recordFilter = recordIds && recordIds.length > 0
    ? buildRecordIdsFilterFormula(recordIds)
    : "";
  const combinedFilter = recordFilter
    ? `AND(${recordFilter},${filterByFormula})`
    : filterByFormula;

  return dedupeAirtableRecords(
    await fetchAirtableRecords(connection.tableName, {
      apiToken: connection.apiToken,
      baseId: connection.baseId,
      fields: [
        COACHING_INPUT_LOG_UNIQUE_KEY_FIELD,
        COACHING_INPUT_LOG_PARTICIPANT_FIELD,
        COACHING_INPUT_LOG_RECEIVED_AT_FIELD,
        COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD,
        COACHING_INPUT_LOG_METRICS_JSON_FIELD
      ],
      filterByFormula: combinedFilter
    })
  );
}

function createTranscriptSpeakerBlocks(rawPayload: Record<string, unknown> | null) {
  return getNestedArrayValue(rawPayload, ["transcript", "transcript", "speaker_blocks"])
    .filter(isPlainRecord)
    .map((block, index) => {
      const speaker = isPlainRecord(block.speaker) ? block.speaker : {};
      const speakerName =
        typeof speaker.name === "string" && speaker.name.trim().length > 0
          ? speaker.name.trim()
          : "UNKNOWN_SPEAKER";

      return {
        id: `${index}-${String(block.start_time ?? "")}`,
        endTime: typeof block.end_time === "number" ? block.end_time : null,
        speaker: speakerName,
        startTime: typeof block.start_time === "number" ? block.start_time : null,
        words: typeof block.words === "string" ? block.words.trim() : ""
      };
    })
    .filter((block) => block.words.length > 0);
}

function createCoachingEvidenceMeeting(record: AirtableRecord): CoachingEvidenceMeeting {
  const rawPayload = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD);
  const metricsJson = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_METRICS_JSON_FIELD);
  const actionItems = [
    ...getTextItems(getNestedValue(rawPayload, ["action_items"])),
    ...getTextItems(getNestedValue(rawPayload, ["transcript", "action_items"]))
  ];
  const topics = [
    ...getTextItems(getNestedValue(rawPayload, ["topics"])),
    ...getTextItems(getNestedValue(rawPayload, ["transcript", "topics"]))
  ];

  return {
    actionItems,
    coachingAnalysis:
      getNestedTextValue(rawPayload, ["coaching_analysis"]) ??
      getNestedTextValue(rawPayload, ["report"]),
    coachingSummary:
      getNestedTextValue(rawPayload, ["coaching_summary"]) ??
      getNestedTextValue(rawPayload, ["summary"]),
    metricsScores: getCoachingMetricsScores(rawPayload, metricsJson),
    rawRecordId: record.id,
    title: getCoachingMeetingTitle(rawPayload),
    topics,
    transcriptSummary: getNestedTextValue(rawPayload, ["transcript", "summary"]),
    when: getCoachingMeetingDatetime(rawPayload, record)
  };
}

function getTrustworthinessMeaning(score: number) {
  if (score >= 0.8) {
    return "Excellence in Trust";
  }

  if (score >= 0.6) {
    return "High Trust";
  }

  if (score >= 0.4) {
    return "Moderate Trust";
  }

  if (score >= 0.2) {
    return "Basic Trust";
  }

  return "Initial Trust Development";
}

const TALENT_PILLAR_MEANINGS: Record<PillarKey, string[]> = {
  credibility: [
    "Shows a lack of knowledge and competence; contributions are erroneous.",
    "Has deficiencies in the necessary knowledge, affecting performance.",
    "Presents shortcomings in knowledge, generating doubts about capability.",
    "Possesses some knowledge, but competence is limited and requires supervision.",
    "Has basic knowledge, but is inconsistent in its application.",
    "Possesses acceptable competence, though does not fully master the role.",
    "Demonstrates a good level of knowledge and competence, being reliable in most situations.",
    "Has a high level of competence, is reliable, and consistently adds value.",
    "Is very competent, with respected contributions and rarely questioned judgment.",
    "Is exceptional in knowledge and competence, a reference within the team whose decisions are valued."
  ],
  groupThinking: [
    "Does not collaborate at all and acts solely in self-interest.",
    "Rarely collaborates, prioritizing personal interests.",
    "Shows little willingness to collaborate and acts in an individualistic manner.",
    "Sometimes collaborates, but prioritizes personal interests over the team's.",
    "Has a moderately collaborative attitude, although does not always prioritize the common good.",
    "Generally collaborates, though in some situations individual interests are evident.",
    "Actively collaborates in most decisions and tends to prioritize team interests.",
    "Is collaborative and prioritizes the group's well-being over personal interests.",
    "Always collaborates effectively and advocates for group thinking, prioritizing collective well-being.",
    "Is an exemplary collaborator, consistently prioritizing team interests and working for the common good."
  ],
  intimacy: [
    "Does not demonstrate the ability to understand or connect with the client.",
    "Minimum understanding and superficial connection with the client.",
    "Basic understanding and limited emotional connection.",
    "Moderate understanding and occasional empathetic connection.",
    "Clear understanding and regular empathetic, trustworthy relationship.",
    "Solid understanding and frequent close, trusting relationship.",
    "Good understanding and consistent close, empathetic connection.",
    "Deep understanding and frequent empathetic, trustworthy relationship.",
    "Exceptional understanding and deep, empathetic trust-based relationships.",
    "Outstanding understanding and authentic, lasting emotional connection."
  ],
  reliability: [
    "Never fulfills commitments, affecting reliability.",
    "Rarely keeps promises; frequently misses deadlines.",
    "Fulfills some commitments, but is unreliable in most cases.",
    "Occasionally meets deadlines, but lack of consistency raises concerns.",
    "Moderately meets deadlines, although often delays or fails to fulfill completely.",
    "Generally meets commitments, although there are times when he/she does not.",
    "Is reliable and meets most established deadlines.",
    "Consistently fulfills commitments and is considered reliable by the team.",
    "Always meets deadlines and is considered highly reliable.",
    "Not only fulfills commitments but exceeds expectations, being an example of reliability."
  ]
};

function getPillarMeaning(pillar: PillarKey, points: number) {
  return TALENT_PILLAR_MEANINGS[pillar][Math.max(1, Math.min(10, points)) - 1];
}

function getFirstNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return Math.round(parsedValue);
    }
  }

  return null;
}

function mergeTrustworthinessRecordFields(
  record: AirtableRecord,
  fields: Partial<Record<keyof TrustworthinessRecordUpdateFields, unknown>>
) {
  const nextFields: Record<string, unknown> = {
    ...record.fields,
    ...fields
  };
  const reliabilityPoints = getFirstNumericValue(nextFields["Reliability Points"]);
  const intimacyPoints = getFirstNumericValue(nextFields["Intimacy Points"]);
  const groupThinkingPoints = getFirstNumericValue(nextFields["Group Thinking Points"]);
  const credibilityPoints = getFirstNumericValue(nextFields["Credibility Points"]);

  if (typeof reliabilityPoints === "number") {
    nextFields["Reliability Meaning"] = getPillarMeaning("reliability", reliabilityPoints);
  } else {
    delete nextFields["Reliability Meaning"];
  }

  if (typeof intimacyPoints === "number") {
    nextFields["Intimacy Meaning"] = getPillarMeaning("intimacy", intimacyPoints);
  } else {
    delete nextFields["Intimacy Meaning"];
  }

  if (typeof groupThinkingPoints === "number") {
    nextFields["Group Thinking Meaning"] = getPillarMeaning(
      "groupThinking",
      groupThinkingPoints
    );
  } else {
    delete nextFields["Group Thinking Meaning"];
  }

  if (typeof credibilityPoints === "number") {
    nextFields["Credibility Meaning"] = getPillarMeaning("credibility", credibilityPoints);
  } else {
    delete nextFields["Credibility Meaning"];
  }

  if (
    typeof reliabilityPoints === "number" &&
    typeof intimacyPoints === "number" &&
    typeof groupThinkingPoints === "number" &&
    typeof credibilityPoints === "number"
  ) {
    const trustworthinessScore = calculateTrustworthinessScore({
      credibility: credibilityPoints,
      groupThinking: groupThinkingPoints,
      intimacy: intimacyPoints,
      reliability: reliabilityPoints
    });

    nextFields["Trustworthiness"] = trustworthinessScore;
    nextFields["Trustworthiness Meaning"] = getTrustworthinessMeaning(trustworthinessScore);
  } else {
    delete nextFields["Trustworthiness"];
    delete nextFields["Trustworthiness Meaning"];
  }

  return {
    ...record,
    fields: nextFields
  };
}

function calculateTrustworthinessScore(points: Record<PillarKey, number>) {
  return (
    points.credibility +
    points.reliability +
    points.intimacy * 2 +
    points.groupThinking * 2
  ) / 60;
}

function hasEvidenceText(meeting: CoachingEvidenceMeeting) {
  return Boolean(
    meeting.coachingAnalysis ||
    meeting.coachingSummary ||
    meeting.transcriptSummary ||
    meeting.actionItems.length > 0 ||
    meeting.topics.length > 0 ||
    Object.values(meeting.metricsScores).some((value) => typeof value === "number")
  );
}

function toTrustworthinessAssistantMeeting(
  meeting: CoachingEvidenceMeeting
): TrustworthinessAssistantMeeting {
  return {
    actionItems: meeting.actionItems,
    coachingAnalysis: meeting.coachingAnalysis,
    coachingSummary: meeting.coachingSummary,
    meetingDatetime: meeting.when,
    meetingId: meeting.rawRecordId,
    metricsScores: meeting.metricsScores,
    title: meeting.title,
    topics: meeting.topics,
    transcriptSummary: meeting.transcriptSummary
  };
}

async function prepareTrustworthinessSuggestionContext(
  participantEmail: string,
  activeSessionEmail: string | undefined,
  explicitRange: DateRangeLiteral,
  emitStage?: TrustworthinessSuggestionStageEmitter
) {
  await emitStage?.("fetching_airtable_meetings");
  const records = await fetchCoachingInputLogRecordsForContext(
    participantEmail,
    activeSessionEmail,
    explicitRange
  );

  await emitStage?.("building_meeting_evidence");
  const meetings = records.map(createCoachingEvidenceMeeting).filter(hasEvidenceText);

  if (records.length === 0) {
    throw new Error("No hay reuniones suficientes para sugerir TW.");
  }

  if (meetings.length === 0) {
    throw new Error("Hay reuniones, pero no hay evidencia textual suficiente.");
  }

  return meetings;
}

function createProposalFromSuggestion(
  suggestion: Awaited<ReturnType<typeof createTrustworthinessSuggestion>>,
  feedback: string
): TrustworthinessAssistantProposal {
  return {
    credibilityPoints: suggestion.pillars.credibility.points,
    feedback,
    groupThinkingPoints: suggestion.pillars.groupThinking.points,
    intimacyPoints: suggestion.pillars.intimacy.points,
    reliabilityPoints: suggestion.pillars.reliability.points
  };
}

function normalizeAssistantHistory(
  history: Array<{
    content: string;
    role: "assistant" | "user";
  }> | undefined
) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
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
    .slice(-ASSISTANT_HISTORY_LIMIT);
}

function createFeedbackInputFromSuggestion(params: {
  evaluatedName: string;
  existingFeedback?: string | null;
  projectContext?: string | null;
  roleLabel?: string | null;
  suggestion: Awaited<ReturnType<typeof createTrustworthinessSuggestion>>;
}): FeedbackGenerationInput {
  return {
    evaluatedName: params.evaluatedName,
    existingFeedback: params.existingFeedback ?? null,
    pillars: {
      credibility: {
        aiSuggestion: params.suggestion.pillars.credibility,
        meaning: params.suggestion.pillars.credibility.meaning,
        points: params.suggestion.pillars.credibility.points
      },
      groupThinking: {
        aiSuggestion: params.suggestion.pillars.groupThinking,
        meaning: params.suggestion.pillars.groupThinking.meaning,
        points: params.suggestion.pillars.groupThinking.points
      },
      intimacy: {
        aiSuggestion: params.suggestion.pillars.intimacy,
        meaning: params.suggestion.pillars.intimacy.meaning,
        points: params.suggestion.pillars.intimacy.points
      },
      reliability: {
        aiSuggestion: params.suggestion.pillars.reliability,
        meaning: params.suggestion.pillars.reliability.meaning,
        points: params.suggestion.pillars.reliability.points
      }
    },
    projectContext: params.projectContext ?? null,
    roleLabel: params.roleLabel ?? null
  };
}

function createSuggestionPrompt(meetings: CoachingEvidenceMeeting[], existingFeedback?: string | null) {
  const normalizedFeedback = existingFeedback?.trim();

  return [
    "Generate JSON only. You are assisting a human evaluator with Monthly Trustworthiness for a talent.",
    "The feedback and all analysis must be written exclusively about the evaluated talent. Do not write about, quote, or reference the evaluator or other meeting participants by name.",
    "When meeting transcripts mention other people, use that content only as context for understanding the evaluated talent's behavior — never as a subject of the evaluation.",
    "Use only the supplied meeting evidence. Do not invent evidence, events, names, or scores.",
    "Use the evaluator's existing feedback as an additional human judgment signal when calibrating the TW score and pillars.",
    "Do not quote the feedback verbatim unless it is necessary; reconcile it with meeting evidence and call out uncertainty if they conflict.",
    "The four TW pillars are Reliability, Intimacy, Group Thinking, and Credibility.",
    "Formula context: TW = (Credibility + Reliability + 2*Intimacy + 2*Group Thinking) / 60.",
    "Reliability: commitments, deadlines, consistency, decision documentation, risk handling.",
    "Intimacy: empathy, understanding needs, trustful relationship, stakeholder communication.",
    "Group Thinking: collaboration, team alignment, prioritizing collective interest.",
    "Credibility: knowledge, competence, judgment, clear ownership, confidence generated.",
    "Return integer points 1-10 per pillar. Include concrete evidence by meeting and source type.",
    "Separate positive signals, negative signals/risks, uncertainty, and metric inputs.",
    `Evaluator feedback draft:\n${normalizedFeedback && normalizedFeedback.length > 0 ? normalizedFeedback : "None provided."}`,
    `Evidence package:\n${JSON.stringify(meetings, null, 2)}`
  ].join("\n\n");
}

function createSuggestionTracePrompt(meetings: CoachingEvidenceMeeting[], existingFeedback?: string | null) {
  const normalizedFeedback = existingFeedback?.trim();

  return [
    "You are preparing a visible decision trace for a Monthly Trustworthiness evaluation.",
    "Reply in Spanish.",
    "Use only the supplied meeting evidence and evaluator feedback draft.",
    "Return 3 to 5 short bullet lines.",
    "Each line must start with '- '.",
    "Each bullet should mention one concrete positive signal, risk, contradiction, or calibration insight across the TW pillars.",
    "Do not return JSON, headings, numbering, or markdown other than bullet lines.",
    `Evaluator feedback draft:\n${normalizedFeedback && normalizedFeedback.length > 0 ? normalizedFeedback : "None provided."}`,
    `Evidence package:\n${JSON.stringify(meetings, null, 2)}`
  ].join("\n\n");
}

const TW_SUGGESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["trustworthiness", "pillars"],
  properties: {
    trustworthiness: {
      type: "object",
      additionalProperties: false,
      required: ["confidence", "explanation"],
      properties: {
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        explanation: { type: "string" }
      }
    },
    pillars: {
      type: "object",
      additionalProperties: false,
      required: ["reliability", "intimacy", "groupThinking", "credibility"],
      properties: {
        reliability: { $ref: "#/$defs/pillarSuggestion" },
        intimacy: { $ref: "#/$defs/pillarSuggestion" },
        groupThinking: { $ref: "#/$defs/pillarSuggestion" },
        credibility: { $ref: "#/$defs/pillarSuggestion" }
      }
    }
  },
  $defs: {
    pillarSuggestion: {
      type: "object",
      additionalProperties: false,
      required: ["points", "confidence", "shortReason", "decisionDetail"],
      properties: {
        points: { type: "integer", minimum: 1, maximum: 10 },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        shortReason: { type: "string" },
        decisionDetail: {
          type: "object",
          additionalProperties: false,
          required: ["conclusion", "positiveSignals", "negativeSignals", "uncertainty", "metricInputs"],
          properties: {
            conclusion: { type: "string" },
            positiveSignals: {
              type: "array",
              items: { $ref: "#/$defs/evidenceSignal" }
            },
            negativeSignals: {
              type: "array",
              items: { $ref: "#/$defs/evidenceSignal" }
            },
            uncertainty: {
              type: "array",
              items: { type: "string" }
            },
            metricInputs: {
              type: "array",
              items: { $ref: "#/$defs/metricInput" }
            }
          }
        }
      }
    },
    evidenceSignal: {
      type: "object",
      additionalProperties: false,
      required: [
        "meetingId",
        "meetingTitle",
        "meetingDatetime",
        "sourceType",
        "evidenceText",
        "interpretation",
        "impact"
      ],
      properties: {
        meetingId: { type: "string" },
        meetingTitle: { type: "string" },
        meetingDatetime: { type: "string" },
        sourceType: {
          type: "string",
          enum: [
            "coaching_summary",
            "coaching_analysis",
            "transcript_summary",
            "topic",
            "action_item",
            "metric_score"
          ]
        },
        evidenceText: { type: "string" },
        interpretation: { type: "string" },
        impact: {
          type: "string",
          enum: ["raises_score", "lowers_score", "supports_current_score"]
        }
      }
    },
    metricInput: {
      type: "object",
      additionalProperties: false,
      required: ["metricName", "value", "mappedTo", "interpretation"],
      properties: {
        metricName: { type: "string" },
        value: {
          anyOf: [{ type: "number" }, { type: "null" }]
        },
        mappedTo: {
          type: "string",
          enum: ["reliability", "intimacy", "groupThinking", "credibility"]
        },
        interpretation: { type: "string" }
      }
    }
  }
};

const FEEDBACK_SUGGESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["feedback"],
  properties: {
    feedback: {
      type: "string"
    }
  }
};

const TRUSTWORTHINESS_ASSISTANT_REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "message",
    "nextIntent",
    "focusArea",
    "proposalChanged",
    "changeSource",
    "needsOptionalEvidence",
    "evidenceQuestion",
    "proposal",
    "citations",
    "decisionTrace"
  ],
  properties: {
    message: {
      type: "string"
    },
    nextIntent: {
      type: "string",
      enum: ["review", "edit_pillar", "edit_feedback", "save", "clarify"]
    },
    focusArea: {
      anyOf: [
        {
          type: "string",
          enum: ["reliability", "intimacy", "groupThinking", "credibility", "feedback"]
        },
        {
          type: "null"
        }
      ]
    },
    proposalChanged: {
      type: "boolean"
    },
    changeSource: {
      type: "string",
      enum: ["model_evidence", "human_override", "mixed", "none"]
    },
    needsOptionalEvidence: {
      type: "boolean"
    },
    evidenceQuestion: {
      anyOf: [
        {
          type: "string"
        },
        {
          type: "null"
        }
      ]
    },
    proposal: {
      type: "object",
      additionalProperties: false,
      required: [
        "reliabilityPoints",
        "intimacyPoints",
        "groupThinkingPoints",
        "credibilityPoints",
        "feedback"
      ],
      properties: {
        reliabilityPoints: { type: "integer", minimum: 1, maximum: 10 },
        intimacyPoints: { type: "integer", minimum: 1, maximum: 10 },
        groupThinkingPoints: { type: "integer", minimum: 1, maximum: 10 },
        credibilityPoints: { type: "integer", minimum: 1, maximum: 10 },
        feedback: { type: "string" }
      }
    },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["meetingId", "meetingTitle", "reason", "pillar"],
        properties: {
          meetingId: { type: "string" },
          meetingTitle: { type: "string" },
          reason: { type: "string" },
          pillar: {
            anyOf: [
              {
                type: "string",
                enum: ["reliability", "intimacy", "groupThinking", "credibility"]
              },
              {
                type: "null"
              }
            ]
          }
        }
      }
    },
    decisionTrace: {
      type: "array",
      items: { type: "string" }
    }
  }
};

export function extractOpenAIOutputText(payload: unknown) {
  if (isPlainRecord(payload) && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!isPlainRecord(payload) || !Array.isArray(payload.output)) {
    return null;
  }

  for (const item of payload.output) {
    if (!isPlainRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (isPlainRecord(content) && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

export function extractDeepSeekOutputText(payload: unknown) {
  if (!isPlainRecord(payload) || !Array.isArray(payload.choices)) {
    return null;
  }

  const [firstChoice] = payload.choices;

  if (!isPlainRecord(firstChoice) || !isPlainRecord(firstChoice.message)) {
    return null;
  }

  return typeof firstChoice.message.content === "string"
    ? firstChoice.message.content
    : null;
}

async function streamOpenAIResponsesText(params: {
  apiKey: string;
  input: string;
  model: string;
  reasoningEffort?: string;
  handlers: OpenAITextStreamHandlers;
}) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: params.input,
      model: params.model,
      reasoning: params.reasoningEffort
        ? {
            effort: params.reasoningEffort
          }
        : undefined,
      stream: true
    }),
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok || !response.body) {
    let message = `OpenAI request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      message = `OpenAI request failed with status ${response.status}`;
    }

    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulatedText = "";

  async function processChunk(chunk: string) {
    const lines = chunk.split("\n");
    let eventType = "";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
        continue;
      }

      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const data = dataLines.join("\n");

    if (!data || data === "[DONE]") {
      return;
    }

    const payload = JSON.parse(data) as {
      delta?: string;
      error?: { message?: string };
      response?: unknown;
      type?: string;
    };
    const payloadType = typeof payload.type === "string" ? payload.type : eventType;

    if (payloadType === "response.output_text.delta" && typeof payload.delta === "string") {
      accumulatedText += payload.delta;
      await params.handlers.onDelta?.(payload.delta);
      return;
    }

    if (payloadType === "error") {
      throw new Error(payload.error?.message ?? "No fue posible stream la respuesta de OpenAI.");
    }

    if (
      payloadType === "response.completed" ||
      payloadType === "response.done" ||
      payloadType === "response.output_text.done"
    ) {
      const completedText =
        extractOpenAIOutputText(payload.response) ??
        (typeof payload.delta === "string" ? `${accumulatedText}${payload.delta}` : accumulatedText);

      if (completedText.length > 0) {
        accumulatedText = completedText;
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const trimmedChunk = chunk.trim();

      if (trimmedChunk.length === 0) {
        continue;
      }

      await processChunk(trimmedChunk);
    }
  }

  if (buffer.trim().length > 0) {
    await processChunk(buffer.trim());
  }

  if (accumulatedText.length > 0) {
    await params.handlers.onCompleted?.(accumulatedText);
  }

  return accumulatedText;
}

async function callOpenAIResponsesJson(params: {
  apiKey: string;
  input: string;
  model: string;
  reasoningEffort?: string;
  schema: Record<string, unknown>;
  schemaName: string;
}) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: params.input,
      model: params.model,
      reasoning: params.reasoningEffort
        ? {
            effort: params.reasoningEffort
          }
        : undefined,
      text: {
        format: {
          type: "json_schema",
          name: params.schemaName,
          strict: true,
          schema: params.schema
        }
      }
    }),
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    let message = `OpenAI request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      message = `OpenAI request failed with status ${response.status}`;
    }

    throw new Error(message);
  }

  return extractOpenAIOutputText(await response.json());
}

async function callDeepSeekChatJson(params: {
  apiKey: string;
  baseUrl: string;
  input: string;
  model: string;
}) {
  const response = await fetch(`${params.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content:
            "Return valid JSON only. Do not include markdown fences, comments, or explanatory text.",
          role: "system"
        },
        {
          content: params.input,
          role: "user"
        }
      ],
      model: params.model,
      max_tokens: 8000,
      response_format: {
        type: "json_object"
      },
      stream: false
    }),
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    let message = `DeepSeek request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      message = `DeepSeek request failed with status ${response.status}`;
    }

    throw new Error(message);
  }

  return extractDeepSeekOutputText(await response.json());
}

async function callConfiguredModelForJson(params: {
  input: string;
  model: string;
  schema: Record<string, unknown>;
  schemaName: string;
}) {
  const openAIConfig = getOpenAIConfig();

  if (!openAIConfig.apiKey || !params.model) {
    throw new Error("No hay modelo configurado para generar JSON con IA.");
  }

  if (openAIConfig.provider === "deepseek") {
    return callDeepSeekChatJson({
      apiKey: openAIConfig.apiKey,
      baseUrl: openAIConfig.deepSeekBaseUrl,
      input: params.input,
      model: params.model
    });
  }

  return callOpenAIResponsesJson({
    apiKey: openAIConfig.apiKey,
    input: params.input,
    model: params.model,
    reasoningEffort: openAIConfig.reasoningEffort,
    schema: params.schema,
    schemaName: params.schemaName
  });
}

async function streamConfiguredModelText(params: {
  input: string;
  model: string;
  handlers: OpenAITextStreamHandlers;
}) {
  const openAIConfig = getOpenAIConfig();

  if (!openAIConfig.apiKey || !params.model) {
    throw new Error("No hay modelo configurado para generar streaming con IA.");
  }

  if (openAIConfig.provider !== "openai") {
    return "";
  }

  return streamOpenAIResponsesText({
    apiKey: openAIConfig.apiKey,
    handlers: params.handlers,
    input: params.input,
    model: params.model,
    reasoningEffort: openAIConfig.reasoningEffort
  });
}

function normalizeConfidence(value: unknown, meetingsUsed: number): Confidence {
  const confidence =
    value === "high" || value === "medium" || value === "low" ? value : "low";

  if (meetingsUsed <= 1 && confidence === "high") {
    return "medium";
  }

  return confidence;
}

function validatePillarSuggestion(value: unknown, pillar: PillarKey, meetingsUsed: number) {
  if (!isPlainRecord(value)) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  const points = getNumberOrNull(value.points);

  if (typeof points !== "number" || !Number.isInteger(points) || points < 1 || points > 10) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  const normalizedPoints = Number(points);
  const decisionDetail = isPlainRecord(value.decisionDetail) ? value.decisionDetail : {};

  return {
    points: normalizedPoints,
    confidence: normalizeConfidence(value.confidence, meetingsUsed),
    meaning: getPillarMeaning(pillar, normalizedPoints),
    shortReason: typeof value.shortReason === "string" ? value.shortReason : "",
    decisionDetail: {
      conclusion:
        typeof decisionDetail.conclusion === "string" ? decisionDetail.conclusion : "",
      positiveSignals: Array.isArray(decisionDetail.positiveSignals)
        ? decisionDetail.positiveSignals
        : [],
      negativeSignals: Array.isArray(decisionDetail.negativeSignals)
        ? decisionDetail.negativeSignals
        : [],
      uncertainty: Array.isArray(decisionDetail.uncertainty)
        ? decisionDetail.uncertainty.filter((item): item is string => typeof item === "string")
        : [],
      metricInputs: Array.isArray(decisionDetail.metricInputs)
        ? decisionDetail.metricInputs
        : []
    }
  };
}

async function callOpenAIForSuggestion(meetings: CoachingEvidenceMeeting[], existingFeedback?: string | null) {
  const openAIConfig = getOpenAIConfig();
  const suggestionModel = openAIConfig.suggestionModel || openAIConfig.model;

  if (!openAIConfig.apiKey || !suggestionModel) {
    throw new Error("No hay modelo configurado para generar sugerencias.");
  }

  const outputText = await callConfiguredModelForJson({
    input: createSuggestionPrompt(meetings, existingFeedback),
    model: suggestionModel,
    schema: TW_SUGGESTION_SCHEMA,
    schemaName: "tw_suggestion"
  });

  if (!outputText) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  try {
    return JSON.parse(outputText) as unknown;
  } catch {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }
}

async function streamSuggestionTraceFromMeetings(params: {
  emitTrace?: TrustworthinessSuggestionTraceEmitter;
  existingFeedback?: string | null;
  meetings: CoachingEvidenceMeeting[];
}) {
  const openAIConfig = getOpenAIConfig();
  const suggestionModel = openAIConfig.suggestionModel || openAIConfig.model;

  if (!params.emitTrace || !openAIConfig.apiKey || !suggestionModel) {
    return "";
  }

  let traceBuffer = "";

  function flushCompletedTraceLines() {
    const normalizedBuffer = traceBuffer.replace(/\r/g, "");
    const lines = normalizedBuffer.split("\n");
    traceBuffer = lines.pop() ?? "";

    return lines
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2).trim())
      .filter((line) => line.length > 0);
  }

  const streamedText = await streamConfiguredModelText({
    handlers: {
      onCompleted: async () => {
        const remainingLine = traceBuffer.trim();

        if (remainingLine.startsWith("- ")) {
          await params.emitTrace?.(remainingLine.slice(2).trim());
        }
      },
      onDelta: async (delta) => {
        traceBuffer += delta;

        for (const line of flushCompletedTraceLines()) {
          await params.emitTrace?.(line);
        }
      }
    },
    input: createSuggestionTracePrompt(params.meetings, params.existingFeedback),
    model: suggestionModel
  });

  return streamedText;
}

function createFeedbackPrompt(input: FeedbackGenerationInput) {
  const pillarLines = (Object.entries(input.pillars) as Array<
    [PillarKey, FeedbackGenerationInput["pillars"][PillarKey]]
  >)
    .map(([pillarKey, pillar]) => {
      const aiContext =
        pillar.aiSuggestion !== undefined && pillar.aiSuggestion !== null
          ? JSON.stringify(pillar.aiSuggestion, null, 2)
          : "No AI context available for this pillar.";

      return [
        `${pillarKey.toUpperCase()}`,
        `points: ${pillar.points}/10`,
        `meaning: ${pillar.meaning}`,
        `ai_context:`,
        aiContext
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are writing a final performance feedback narrative for a trustworthiness evaluation.",
    "Write in professional English.",
    "Return one concise final narrative in 1 or 2 short paragraphs.",
    "Do not use bullets, headers, markdown, JSON, or labels.",
    "Do not mention AI, confidence scores, or that a model generated the text.",
    "Use the pillar points and meanings as the source of truth.",
    "If AI context is available for a pillar, use it as supporting evidence and nuance.",
    "Balance strengths, risks, and concrete improvement areas.",
    "If evidence is limited, say so briefly in natural language without sounding robotic.",
    "",
    `Evaluated person: ${input.evaluatedName}`,
    `IMPORTANT: The narrative must be written entirely about ${input.evaluatedName}. Do not mention the evaluator or other participants as subjects. If other names appear in the evidence, use their statements only as context, not as the focus.`,
    `Role: ${input.roleLabel && input.roleLabel.trim().length > 0 ? input.roleLabel : "Unknown"}`,
    `Project context: ${
      input.projectContext && input.projectContext.trim().length > 0
        ? input.projectContext
        : "No project context available"
    }`,
    `Existing feedback draft: ${
      input.existingFeedback && input.existingFeedback.trim().length > 0
        ? input.existingFeedback
        : "None"
    }`,
    "",
    "Pillar data:",
    pillarLines,
    "",
    'Return JSON with this shape only: {"feedback":"..."}'
  ].join("\n");
}

async function callOpenAIForFeedback(input: FeedbackGenerationInput) {
  const openAIConfig = getOpenAIConfig();
  const feedbackModel =
    openAIConfig.feedbackModel || openAIConfig.assistantModel || openAIConfig.model;

  if (!openAIConfig.apiKey || !feedbackModel) {
    throw new Error("No hay modelo configurado para generar feedback.");
  }

  const outputText = await callConfiguredModelForJson({
    input: createFeedbackPrompt(input),
    model: feedbackModel,
    schema: FEEDBACK_SUGGESTION_SCHEMA,
    schemaName: "tw_feedback"
  });

  if (!outputText) {
    throw new Error("No fue posible generar el feedback con IA.");
  }

  try {
    const parsedOutput = JSON.parse(outputText) as { feedback?: unknown };

    if (typeof parsedOutput.feedback !== "string" || parsedOutput.feedback.trim().length === 0) {
      throw new Error("No fue posible generar el feedback con IA.");
    }

    return parsedOutput.feedback.trim();
  } catch {
    throw new Error("No fue posible generar el feedback con IA.");
  }
}

function validateAssistantProposal(
  proposal: TrustworthinessAssistantProposal
): TrustworthinessAssistantProposal {
  const credibilityPoints = getNumberOrNull(proposal.credibilityPoints);
  const groupThinkingPoints = getNumberOrNull(proposal.groupThinkingPoints);
  const intimacyPoints = getNumberOrNull(proposal.intimacyPoints);
  const reliabilityPoints = getNumberOrNull(proposal.reliabilityPoints);

  if (credibilityPoints === null || !Number.isInteger(credibilityPoints) || credibilityPoints < 1 || credibilityPoints > 10) {
    throw new Error("La propuesta del asistente tiene un valor inválido en credibilityPoints.");
  }

  if (
    groupThinkingPoints === null ||
    !Number.isInteger(groupThinkingPoints) ||
    groupThinkingPoints < 1 ||
    groupThinkingPoints > 10
  ) {
    throw new Error("La propuesta del asistente tiene un valor inválido en groupThinkingPoints.");
  }

  if (intimacyPoints === null || !Number.isInteger(intimacyPoints) || intimacyPoints < 1 || intimacyPoints > 10) {
    throw new Error("La propuesta del asistente tiene un valor inválido en intimacyPoints.");
  }

  if (
    reliabilityPoints === null ||
    !Number.isInteger(reliabilityPoints) ||
    reliabilityPoints < 1 ||
    reliabilityPoints > 10
  ) {
    throw new Error("La propuesta del asistente tiene un valor inválido en reliabilityPoints.");
  }

  const feedback = typeof proposal.feedback === "string" ? proposal.feedback.trim() : "";

  if (feedback.length === 0) {
    throw new Error("La propuesta del asistente debe incluir feedback.");
  }

  return {
    credibilityPoints,
    feedback,
    groupThinkingPoints,
    intimacyPoints,
    reliabilityPoints
  };
}

function areAssistantProposalsEqual(
  left: TrustworthinessAssistantProposal,
  right: TrustworthinessAssistantProposal
) {
  return (
    left.credibilityPoints === right.credibilityPoints &&
    left.feedback === right.feedback &&
    left.groupThinkingPoints === right.groupThinkingPoints &&
    left.intimacyPoints === right.intimacyPoints &&
    left.reliabilityPoints === right.reliabilityPoints
  );
}

function validateAssistantCitations(value: unknown): TrustworthinessAssistantCitation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((citation) => {
      if (!isPlainRecord(citation)) {
        return null;
      }

      const meetingId = typeof citation.meetingId === "string" ? citation.meetingId.trim() : "";
      const meetingTitle =
        typeof citation.meetingTitle === "string" ? citation.meetingTitle.trim() : "";
      const reason = typeof citation.reason === "string" ? citation.reason.trim() : "";
      const pillar =
        citation.pillar === "reliability" ||
        citation.pillar === "intimacy" ||
        citation.pillar === "groupThinking" ||
        citation.pillar === "credibility"
          ? citation.pillar
          : null;

      if (!meetingId || !meetingTitle || !reason) {
        return null;
      }

      return {
        meetingId,
        meetingTitle,
        pillar,
        reason
      };
    })
    .filter((citation): citation is TrustworthinessAssistantCitation => citation !== null)
    .slice(0, 6);
}

function validateDecisionTrace(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 5);
}

function normalizeAssistantChangeSource(
  value: unknown,
  proposalChanged: boolean
): TrustworthinessAssistantChangeSource {
  if (
    value === "model_evidence" ||
    value === "human_override" ||
    value === "mixed" ||
    value === "none"
  ) {
    return proposalChanged ? value : "none";
  }

  return proposalChanged ? "mixed" : "none";
}

function truncateAssistantText(value: string | null | undefined, limit = ASSISTANT_TEXT_LIMIT) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (normalizedValue.length <= limit) {
    return normalizedValue || null;
  }

  return `${normalizedValue.slice(0, limit).trimEnd()}...`;
}

function compactAssistantList(values: string[], limit: number, textLimit = ASSISTANT_SHORT_TEXT_LIMIT) {
  return values
    .map((value) => truncateAssistantText(value, textLimit))
    .filter((value): value is string => Boolean(value))
    .slice(0, limit);
}

function compactAssistantMetrics(metricsScores: Record<string, number | null>) {
  return Object.fromEntries(
    Object.entries(metricsScores)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .slice(0, 12)
  );
}

function compactAssistantMeetings(meetings: TrustworthinessAssistantMeeting[]) {
  return meetings.slice(0, ASSISTANT_MEETING_LIMIT).map((meeting) => ({
    actionItems: compactAssistantList(meeting.actionItems, 5),
    coachingAnalysis: truncateAssistantText(meeting.coachingAnalysis),
    coachingSummary: truncateAssistantText(meeting.coachingSummary),
    meetingDatetime: meeting.meetingDatetime,
    meetingId: meeting.meetingId,
    metricsScores: compactAssistantMetrics(meeting.metricsScores),
    title: truncateAssistantText(meeting.title, ASSISTANT_SHORT_TEXT_LIMIT) ?? "Reunión sin título",
    topics: compactAssistantList(meeting.topics, 8, 120),
    transcriptSummary: truncateAssistantText(meeting.transcriptSummary)
  }));
}

function compactAssistantSignal(value: unknown) {
  if (!isPlainRecord(value)) {
    return null;
  }

  return {
    evidenceText: truncateAssistantText(
      typeof value.evidenceText === "string" ? value.evidenceText : null,
      ASSISTANT_SHORT_TEXT_LIMIT
    ),
    impact: typeof value.impact === "string" ? value.impact : null,
    interpretation: truncateAssistantText(
      typeof value.interpretation === "string" ? value.interpretation : null,
      ASSISTANT_SHORT_TEXT_LIMIT
    ),
    meetingId: typeof value.meetingId === "string" ? value.meetingId : null,
    meetingTitle: truncateAssistantText(
      typeof value.meetingTitle === "string" ? value.meetingTitle : null,
      ASSISTANT_SHORT_TEXT_LIMIT
    ),
    sourceType: typeof value.sourceType === "string" ? value.sourceType : null
  };
}

function compactAssistantSuggestion(input: Record<string, unknown>) {
  const pillars = isPlainRecord(input.pillars) ? input.pillars : {};

  return {
    generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : null,
    meetingsUsed: typeof input.meetingsUsed === "number" ? input.meetingsUsed : null,
    pillars: Object.fromEntries(
      (["reliability", "intimacy", "groupThinking", "credibility"] as PillarKey[]).map(
        (pillarKey) => {
          const pillar = isPlainRecord(pillars[pillarKey]) ? pillars[pillarKey] : {};
          const decisionDetail = isPlainRecord(pillar.decisionDetail)
            ? pillar.decisionDetail
            : {};

          return [
            pillarKey,
            {
              confidence: typeof pillar.confidence === "string" ? pillar.confidence : null,
              conclusion: truncateAssistantText(
                typeof decisionDetail.conclusion === "string"
                  ? decisionDetail.conclusion
                  : null
              ),
              meaning: typeof pillar.meaning === "string" ? pillar.meaning : null,
              negativeSignals: Array.isArray(decisionDetail.negativeSignals)
                ? decisionDetail.negativeSignals
                    .map(compactAssistantSignal)
                    .filter(Boolean)
                    .slice(0, 3)
                : [],
              points: typeof pillar.points === "number" ? pillar.points : null,
              positiveSignals: Array.isArray(decisionDetail.positiveSignals)
                ? decisionDetail.positiveSignals
                    .map(compactAssistantSignal)
                    .filter(Boolean)
                    .slice(0, 3)
                : [],
              shortReason: truncateAssistantText(
                typeof pillar.shortReason === "string" ? pillar.shortReason : null
              ),
              uncertainty: Array.isArray(decisionDetail.uncertainty)
                ? compactAssistantList(decisionDetail.uncertainty, 3)
                : []
            }
          ];
        }
      )
    ),
    trustworthiness: isPlainRecord(input.trustworthiness)
      ? {
          confidence:
            typeof input.trustworthiness.confidence === "string"
              ? input.trustworthiness.confidence
              : null,
          explanation: truncateAssistantText(
            typeof input.trustworthiness.explanation === "string"
              ? input.trustworthiness.explanation
              : null
          ),
          meaning:
            typeof input.trustworthiness.meaning === "string"
              ? input.trustworthiness.meaning
              : null,
          percentage:
            typeof input.trustworthiness.percentage === "string"
              ? input.trustworthiness.percentage
              : null,
          score:
            typeof input.trustworthiness.score === "number"
              ? input.trustworthiness.score
              : null
        }
      : null
  };
}

function createTrustworthinessAssistantPrompt(
  input: TrustworthinessAssistantConversationInput
) {
  const recentHistory = input.history
    .slice(-ASSISTANT_HISTORY_LIMIT)
    .map(
      (message) =>
        `${message.role === "assistant" ? "ASSISTANT" : "USER"}: ${
          truncateAssistantText(message.content, ASSISTANT_TEXT_LIMIT) ?? ""
        }`
    )
    .join("\n\n");
  const compactSuggestion = compactAssistantSuggestion(input.suggestion);
  const compactMeetings = compactAssistantMeetings(input.meetings);

  return [
    "You are Asistente de Revision TW (agent id: asistente-revision-tw).",
    "You are a conversational Trustworthiness evaluation assistant helping a human evaluator review a draft.",
    "All feedback proposals must focus exclusively on the evaluated talent. Never write feedback that describes the evaluator or third parties as the subject.",
    "Reply in Spanish.",
    "Use only the supplied meeting evidence, suggestion data, current proposal, and explicit human evaluator input. Do not invent meetings, events, names, facts, or outcomes.",
    "The current proposal is the working draft. The human evaluator has final authority over score changes.",
    "If the evaluator explicitly requests score changes, apply those changes to the returned proposal unless a requested score would be outside 1..10.",
    "Do not block requested score changes only because meeting evidence is insufficient. Instead, explain briefly that the adjustment is being applied as human judgment.",
    "If useful, ask at most one short optional evidence question. Do not pressure, repeat, or require evidence before applying the user's requested change.",
    "Use changeSource='human_override' when changes are mainly based on the evaluator's judgment, 'model_evidence' when based on meeting evidence, 'mixed' when both apply, and 'none' when proposal is unchanged.",
    "Set needsOptionalEvidence=true only when an optional human rationale would improve traceability. evidenceQuestion must be one concise optional question or null.",
    "Always return the full proposal object, even if unchanged.",
    "Keep proposal.feedback written in professional English. Keep message written in Spanish.",
    "Whenever proposal scores change, update proposal.feedback so it stays aligned with the latest scores, evidence, and human judgment source.",
    "If changes are human_override or mixed, mention in proposal.feedback that the final calibration includes evaluator judgment, without inventing unsupported evidence.",
    "Be concise, useful, and grounded in the evidence.",
    "Set proposalChanged to true only when the returned proposal differs from the current proposal.",
    "Include citations for meeting evidence you reference. Use only meeting ids and titles present in Meeting evidence JSON.",
    "Return decisionTrace as 2-5 short Spanish bullets for the evaluator. Summarize evidence comparison and final calibration. Do not reveal hidden chain-of-thought.",
    "If the user clearly approves, confirms, or asks to continue/apply/save, set nextIntent to save.",
    "If the user wants to discuss one pillar, set nextIntent to edit_pillar and focusArea to that pillar.",
    "If the user wants to adjust the narrative or general feedback, set nextIntent to edit_feedback and focusArea to feedback.",
    "If the user mainly asks for explanation or rationale, set nextIntent to clarify.",
    "Do not claim the result is already saved. Saving happens after your response.",
    "",
    `Evaluated person: ${input.evaluatedName}`,
    `Role: ${input.roleLabel && input.roleLabel.trim().length > 0 ? input.roleLabel : "Unknown"}`,
    `Project context: ${
      input.projectContext && input.projectContext.trim().length > 0
        ? input.projectContext
        : "No project context available"
    }`,
    "",
    `Current suggestion JSON:\n${JSON.stringify(compactSuggestion, null, 2)}`,
    "",
    `Current proposal JSON:\n${JSON.stringify(input.proposal, null, 2)}`,
    "",
    `Meeting evidence JSON:\n${JSON.stringify(compactMeetings, null, 2)}`,
    "",
    `Conversation so far:\n${recentHistory || "No previous messages."}`,
    "",
    `Latest user message:\n${input.prompt}`,
    "",
    "Return JSON only."
  ].join("\n");
}

function createTrustworthinessAssistantVisiblePrompt(
  input: TrustworthinessAssistantConversationInput
) {
  const recentHistory = input.history
    .slice(-ASSISTANT_HISTORY_LIMIT)
    .map(
      (message) =>
        `${message.role === "assistant" ? "ASSISTANT" : "USER"}: ${
          truncateAssistantText(message.content, ASSISTANT_TEXT_LIMIT) ?? ""
        }`
    )
    .join("\n\n");
  const compactSuggestion = compactAssistantSuggestion(input.suggestion);
  const compactMeetings = compactAssistantMeetings(input.meetings);

  return [
    "You are Asistente de Revision TW (agent id: asistente-revision-tw).",
    "Write the visible chat answer only.",
    "Reply in Spanish markdown.",
    "Use only the supplied meeting evidence, suggestion data, current proposal, and explicit human evaluator input.",
    "Do not invent meetings, facts, or outcomes.",
    "Do not return JSON.",
    "Do not expose hidden chain-of-thought.",
    "Do not include a separate reasoning section, citations list, or save confirmation claim.",
    "Be concise and useful. If the evaluator asks for an adjustment, explain it naturally in the reply.",
    "",
    `Evaluated person: ${input.evaluatedName}`,
    `Role: ${input.roleLabel && input.roleLabel.trim().length > 0 ? input.roleLabel : "Unknown"}`,
    `Project context: ${
      input.projectContext && input.projectContext.trim().length > 0
        ? input.projectContext
        : "No project context available"
    }`,
    "",
    `Current suggestion JSON:\n${JSON.stringify(compactSuggestion, null, 2)}`,
    "",
    `Current proposal JSON:\n${JSON.stringify(input.proposal, null, 2)}`,
    "",
    `Meeting evidence JSON:\n${JSON.stringify(compactMeetings, null, 2)}`,
    "",
    `Conversation so far:\n${recentHistory || "No previous messages."}`,
    "",
    `Latest user message:\n${input.prompt}`
  ].join("\n");
}

async function callOpenAIForTrustworthinessAssistant(
  input: TrustworthinessAssistantConversationInput
) {
  const openAIConfig = getOpenAIConfig();
  const assistantModel = openAIConfig.assistantModel || openAIConfig.model;

  if (!openAIConfig.apiKey || !assistantModel) {
    throw new Error("No hay modelo configurado para conversar sobre TW.");
  }

  const outputText = await callConfiguredModelForJson({
    input: createTrustworthinessAssistantPrompt(input),
    model: assistantModel,
    schema: TRUSTWORTHINESS_ASSISTANT_REPLY_SCHEMA,
    schemaName: "tw_assistant_reply"
  });

  if (!outputText) {
    throw new Error("No fue posible generar una respuesta del asistente.");
  }

  try {
    const parsedOutput = JSON.parse(outputText) as {
      changeSource?: unknown;
      citations?: unknown;
      decisionTrace?: unknown;
      evidenceQuestion?: unknown;
      focusArea?: TrustworthinessAssistantFocusArea;
      message?: unknown;
      needsOptionalEvidence?: unknown;
      nextIntent?: unknown;
      proposal?: TrustworthinessAssistantProposal;
      proposalChanged?: unknown;
    };

    if (typeof parsedOutput.message !== "string" || parsedOutput.message.trim().length === 0) {
      throw new Error("No fue posible generar una respuesta del asistente.");
    }

    const nextIntent: TrustworthinessAssistantIntent =
      parsedOutput.nextIntent === "review" ||
      parsedOutput.nextIntent === "edit_pillar" ||
      parsedOutput.nextIntent === "edit_feedback" ||
      parsedOutput.nextIntent === "save" ||
      parsedOutput.nextIntent === "clarify"
        ? parsedOutput.nextIntent
        : "clarify";
    const focusArea: TrustworthinessAssistantFocusArea =
      parsedOutput.focusArea === "reliability" ||
      parsedOutput.focusArea === "intimacy" ||
      parsedOutput.focusArea === "groupThinking" ||
      parsedOutput.focusArea === "credibility" ||
      parsedOutput.focusArea === "feedback"
        ? parsedOutput.focusArea
        : null;

    if (!parsedOutput.proposal) {
      throw new Error("No fue posible generar una propuesta del asistente.");
    }
    const currentProposal = validateAssistantProposal(input.proposal);
    const proposal = validateAssistantProposal(parsedOutput.proposal);
    const proposalChanged =
      typeof parsedOutput.proposalChanged === "boolean"
        ? parsedOutput.proposalChanged || !areAssistantProposalsEqual(currentProposal, proposal)
        : !areAssistantProposalsEqual(currentProposal, proposal);
    const evidenceQuestion =
      typeof parsedOutput.evidenceQuestion === "string" &&
      parsedOutput.evidenceQuestion.trim().length > 0
        ? parsedOutput.evidenceQuestion.trim()
        : null;

    return {
      changeSource: normalizeAssistantChangeSource(parsedOutput.changeSource, proposalChanged),
      citations: validateAssistantCitations(parsedOutput.citations),
      decisionTrace: validateDecisionTrace(parsedOutput.decisionTrace),
      evidenceQuestion,
      focusArea,
      message: parsedOutput.message.trim(),
      needsOptionalEvidence:
        typeof parsedOutput.needsOptionalEvidence === "boolean"
          ? parsedOutput.needsOptionalEvidence
          : evidenceQuestion !== null,
      nextIntent,
      proposal,
      proposalChanged
    };
  } catch {
    throw new Error("No fue posible generar una respuesta del asistente.");
  }
}

async function streamTrustworthinessAssistantVisibleMessage(params: {
  emitDelta?: (delta: string) => void | Promise<void>;
  input: TrustworthinessAssistantConversationInput;
}) {
  const openAIConfig = getOpenAIConfig();
  const assistantModel = openAIConfig.assistantModel || openAIConfig.model;

  if (!params.emitDelta || !openAIConfig.apiKey || !assistantModel) {
    return "";
  }

  return streamConfiguredModelText({
    handlers: {
      onDelta: params.emitDelta
    },
    input: createTrustworthinessAssistantVisiblePrompt(params.input),
    model: assistantModel
  });
}

export async function getCoachingInputLogTranscript(
  recordId: string,
  participantEmail: string,
  activeSessionEmail: string | undefined,
  explicitRange: DateRangeLiteral
) {
  const [record] = await fetchCoachingInputLogRecordsForContext(
    participantEmail,
    activeSessionEmail,
    explicitRange,
    [recordId]
  );

  if (!record) {
    throw new Error("No se encontró una reunión válida para este contexto.");
  }

  const rawPayload = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD);
  const speakerBlocks = createTranscriptSpeakerBlocks(rawPayload);

  return {
    actionItems: [
      ...getTextItems(getNestedValue(rawPayload, ["action_items"])),
      ...getTextItems(getNestedValue(rawPayload, ["transcript", "action_items"]))
    ],
    chapterSummaries: getNestedArrayValue(rawPayload, ["transcript", "chapter_summaries"])
      .filter(isPlainRecord)
      .map((chapter) => ({
        description:
          typeof chapter.description === "string" ? chapter.description.trim() : "",
        title: typeof chapter.title === "string" ? chapter.title.trim() : "Capítulo"
      })),
    meetingDatetime: getCoachingMeetingDatetime(rawPayload, record),
    meetingTitle: getCoachingMeetingTitle(rawPayload),
    speakerBlocks,
    summary:
      getNestedTextValue(rawPayload, ["transcript", "summary"]) ??
      getNestedTextValue(rawPayload, ["summary"]),
    topics: [
      ...getTextItems(getNestedValue(rawPayload, ["topics"])),
      ...getTextItems(getNestedValue(rawPayload, ["transcript", "topics"]))
    ],
    uniqueKey: getFirstTextValue(record.fields[COACHING_INPUT_LOG_UNIQUE_KEY_FIELD]) ?? record.id
  };
}

async function generateTrustworthinessSuggestionFromMeetings(
  recordId: string,
  meetings: CoachingEvidenceMeeting[],
  emitStage?: TrustworthinessSuggestionStageEmitter,
  existingFeedback?: string | null
) {
  await emitStage?.("sending_context_to_ai");
  const suggestionPayload = await callOpenAIForSuggestion(meetings, existingFeedback);

  await emitStage?.("validating_structured_response");
  if (!isPlainRecord(suggestionPayload) || !isPlainRecord(suggestionPayload.pillars)) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  const pillars = {
    credibility: validatePillarSuggestion(
      suggestionPayload.pillars.credibility,
      "credibility",
      meetings.length
    ),
    groupThinking: validatePillarSuggestion(
      suggestionPayload.pillars.groupThinking,
      "groupThinking",
      meetings.length
    ),
    intimacy: validatePillarSuggestion(
      suggestionPayload.pillars.intimacy,
      "intimacy",
      meetings.length
    ),
    reliability: validatePillarSuggestion(
      suggestionPayload.pillars.reliability,
      "reliability",
      meetings.length
    )
  };
  await emitStage?.("calculating_tw_score");
  const score = calculateTrustworthinessScore({
    credibility: pillars.credibility.points,
    groupThinking: pillars.groupThinking.points,
    intimacy: pillars.intimacy.points,
    reliability: pillars.reliability.points
  });
  const trustworthiness = isPlainRecord(suggestionPayload.trustworthiness)
    ? suggestionPayload.trustworthiness
    : {};

  return {
    generatedAt: new Date().toISOString(),
    meetingsUsed: meetings.length,
    pillars,
    recordId,
    trustworthiness: {
      confidence: normalizeConfidence(trustworthiness.confidence, meetings.length),
      explanation:
        typeof trustworthiness.explanation === "string"
          ? trustworthiness.explanation
          : "Sugerencia generada a partir de evidencia de reuniones.",
      meaning: getTrustworthinessMeaning(score),
      percentage: `${Math.round(score * 100)}%`,
      score
    }
  };
}

export async function createTrustworthinessSuggestion(
  recordId: string,
  participantEmail: string,
  activeSessionEmail: string | undefined,
  explicitRange: DateRangeLiteral,
  emitStage?: TrustworthinessSuggestionStageEmitter,
  existingFeedback?: string | null
) {
  const meetings = await prepareTrustworthinessSuggestionContext(
    participantEmail,
    activeSessionEmail,
    explicitRange,
    emitStage
  );

  return generateTrustworthinessSuggestionFromMeetings(recordId, meetings, emitStage, existingFeedback);
}

export async function streamTrustworthinessSuggestion(params: {
  activeSessionEmail?: string;
  emitDecisionTrace?: TrustworthinessSuggestionTraceEmitter;
  emitStage?: TrustworthinessSuggestionStageEmitter;
  explicitRange: DateRangeLiteral;
  existingFeedback?: string | null;
  participantEmail: string;
  recordId: string;
}) {
  const startedAt = Date.now();
  let contextReadyAt = startedAt;
  let modelReadyAt = startedAt;

  try {
    const meetings = await prepareTrustworthinessSuggestionContext(
      params.participantEmail,
      params.activeSessionEmail,
      params.explicitRange,
      params.emitStage
    );
    contextReadyAt = Date.now();

    await params.emitStage?.("sending_context_to_ai");
    const suggestionPromise = callOpenAIForSuggestion(meetings, params.existingFeedback);
    const tracePromise = streamSuggestionTraceFromMeetings({
      emitTrace: params.emitDecisionTrace,
      existingFeedback: params.existingFeedback,
      meetings
    });
    const [suggestionResult, traceResult] = await Promise.allSettled([
      suggestionPromise,
      tracePromise
    ]);
    modelReadyAt = Date.now();

    if (traceResult.status === "rejected") {
      throw traceResult.reason;
    }

    if (suggestionResult.status === "rejected") {
      throw suggestionResult.reason;
    }

    await params.emitStage?.("validating_structured_response");
    const suggestionPayload = suggestionResult.value;

    if (!isPlainRecord(suggestionPayload) || !isPlainRecord(suggestionPayload.pillars)) {
      throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
    }

    const pillars = {
      credibility: validatePillarSuggestion(
        suggestionPayload.pillars.credibility,
        "credibility",
        meetings.length
      ),
      groupThinking: validatePillarSuggestion(
        suggestionPayload.pillars.groupThinking,
        "groupThinking",
        meetings.length
      ),
      intimacy: validatePillarSuggestion(
        suggestionPayload.pillars.intimacy,
        "intimacy",
        meetings.length
      ),
      reliability: validatePillarSuggestion(
        suggestionPayload.pillars.reliability,
        "reliability",
        meetings.length
      )
    };
    await params.emitStage?.("calculating_tw_score");
    const score = calculateTrustworthinessScore({
      credibility: pillars.credibility.points,
      groupThinking: pillars.groupThinking.points,
      intimacy: pillars.intimacy.points,
      reliability: pillars.reliability.points
    });
    const trustworthiness = isPlainRecord(suggestionPayload.trustworthiness)
      ? suggestionPayload.trustworthiness
      : {};

    return {
      generatedAt: new Date().toISOString(),
      meetingsUsed: meetings.length,
      pillars,
      recordId: params.recordId,
      trustworthiness: {
        confidence: normalizeConfidence(trustworthiness.confidence, meetings.length),
        explanation:
          typeof trustworthiness.explanation === "string"
            ? trustworthiness.explanation
            : "Sugerencia generada a partir de evidencia de reuniones.",
        meaning: getTrustworthinessMeaning(score),
        percentage: `${Math.round(score * 100)}%`,
        score
      }
    };
  } finally {
    const finishedAt = Date.now();
    console.info("[tw-suggestion-stream]", {
      contextMs: contextReadyAt - startedAt,
      modelMs: modelReadyAt - contextReadyAt,
      totalMs: finishedAt - startedAt,
      validationMs: modelReadyAt > 0 ? finishedAt - modelReadyAt : 0
    });
  }
}

export async function createTrustworthinessFeedback(
  recordId: string,
  evaluatorEmail: string,
  input: FeedbackGenerationInput
) {
  const tableName = getTrustworthinessTableName();
  const [existingRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!existingRecord) {
    throw new Error("No se encontró la evaluación solicitada.");
  }

  canEditTrustworthinessRecord(existingRecord, evaluatorEmail);

  for (const [pillarKey, pillar] of Object.entries(input.pillars) as Array<
    [PillarKey, FeedbackGenerationInput["pillars"][PillarKey]]
  >) {
    if (!Number.isInteger(pillar.points) || pillar.points < 1 || pillar.points > 10) {
      throw new Error(`El pilar ${pillarKey} no tiene un puntaje válido para generar feedback.`);
    }

    if (typeof pillar.meaning !== "string" || pillar.meaning.trim().length === 0) {
      throw new Error(`El pilar ${pillarKey} no tiene meaning suficiente para generar feedback.`);
    }
  }

  return callOpenAIForFeedback(input);
}

export async function createTrustworthinessAssistantSession(params: {
  activeSessionEmail?: string;
  end: string;
  evaluatedName: string;
  evaluatorEmail: string;
  existingFeedback?: string | null;
  history?: TrustworthinessAssistantHistoryEntry[];
  meetings?: TrustworthinessAssistantMeeting[];
  participantEmail: string;
  proposal?: TrustworthinessAssistantProposal;
  projectContext?: string | null;
  recordId: string;
  roleLabel?: string | null;
  start: string;
  suggestion?: Record<string, unknown>;
}) {
  const hasPrebuiltContext = params.suggestion && params.proposal && params.meetings;
  const meetings = hasPrebuiltContext
    ? compactAssistantMeetings(params.meetings ?? [])
    : (await prepareTrustworthinessSuggestionContext(
        params.participantEmail,
        params.activeSessionEmail,
        { end: params.end, start: params.start }
      )).map(toTrustworthinessAssistantMeeting);
  const suggestion = hasPrebuiltContext
    ? params.suggestion ?? {}
    : await generateTrustworthinessSuggestionFromMeetings(
        params.recordId,
        meetings.map((meeting) => ({
          actionItems: meeting.actionItems,
          coachingAnalysis: meeting.coachingAnalysis,
          coachingSummary: meeting.coachingSummary,
          metricsScores: meeting.metricsScores,
          rawRecordId: meeting.meetingId,
          title: meeting.title,
          topics: meeting.topics,
          transcriptSummary: meeting.transcriptSummary,
          when: meeting.meetingDatetime
        })),
        undefined,
        params.existingFeedback
      );
  const proposal = hasPrebuiltContext
    ? validateAssistantProposal(params.proposal as TrustworthinessAssistantProposal)
    : createProposalFromSuggestion(
        suggestion as Awaited<ReturnType<typeof createTrustworthinessSuggestion>>,
        await createTrustworthinessFeedback(
          params.recordId,
          params.evaluatorEmail,
          createFeedbackInputFromSuggestion({
            evaluatedName: params.evaluatedName,
            existingFeedback: params.existingFeedback ?? null,
            projectContext: params.projectContext ?? null,
            roleLabel: params.roleLabel ?? null,
            suggestion: suggestion as Awaited<ReturnType<typeof createTrustworthinessSuggestion>>
          })
        )
      );
  const now = Date.now();
  const sessionId = randomUUID();

  assistantSessions.set(sessionId, {
    activeSessionEmail: params.activeSessionEmail,
    context: {
      end: params.end,
      evaluatedName: params.evaluatedName,
      evaluatorEmail: params.evaluatorEmail,
      participantEmail: params.participantEmail,
      projectContext: params.projectContext ?? null,
      recordId: params.recordId,
      roleLabel: params.roleLabel ?? null,
      start: params.start
    },
    expiresAt: now + ASSISTANT_SESSION_TTL_MS,
    history: normalizeAssistantHistory(params.history),
    meetings,
    proposal,
    suggestion,
    updatedAt: now
  });

  return {
    expiresAt: new Date(now + ASSISTANT_SESSION_TTL_MS).toISOString(),
    meetings,
    proposal,
    sessionId,
    suggestion
  };
}

export async function createTrustworthinessAssistantReply(
  input: TrustworthinessAssistantConversationInput
) {
  if (input.prompt.trim().length === 0) {
    throw new Error("El mensaje del usuario es obligatorio para continuar la conversación.");
  }

  return callOpenAIForTrustworthinessAssistant({
    ...input,
    prompt: input.prompt.trim(),
    proposal: validateAssistantProposal(input.proposal)
  });
}

function getAssistantSession(sessionId: string, recordId: string) {
  const session = assistantSessions.get(sessionId);
  const now = Date.now();

  if (!session || session.context.recordId !== recordId || session.expiresAt <= now) {
    if (session) {
      assistantSessions.delete(sessionId);
    }

    return null;
  }

  session.expiresAt = now + ASSISTANT_SESSION_TTL_MS;
  session.updatedAt = now;

  return session;
}

function detectAssistantFocus(prompt: string): TrustworthinessAssistantFocusArea {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("reliability")) {
    return "reliability";
  }

  if (normalizedPrompt.includes("intimacy")) {
    return "intimacy";
  }

  if (normalizedPrompt.includes("group thinking") || normalizedPrompt.includes("groupthinking")) {
    return "groupThinking";
  }

  if (normalizedPrompt.includes("credibility")) {
    return "credibility";
  }

  if (normalizedPrompt.includes("feedback")) {
    return "feedback";
  }

  return null;
}

function searchAssistantMeetingEvidence(
  meetings: TrustworthinessAssistantMeeting[],
  focusArea: TrustworthinessAssistantFocusArea,
  prompt: string
) {
  const normalizedPrompt = prompt.toLowerCase();
  const terms = [
    focusArea,
    ...normalizedPrompt
      .split(/[^a-z0-9áéíóúñü]+/i)
      .filter((term) => term.length >= 5)
      .slice(0, 8)
  ].filter((term): term is string => Boolean(term));

  return meetings
    .map((meeting) => {
      const evidenceText = [
        meeting.coachingSummary,
        meeting.coachingAnalysis,
        meeting.transcriptSummary,
        meeting.topics.join(" "),
        meeting.actionItems.join(" ")
      ]
        .filter(Boolean)
        .join(" ");
      const normalizedEvidence = evidenceText.toLowerCase();
      const score = terms.reduce(
        (total, term) => total + (normalizedEvidence.includes(term.toLowerCase()) ? 1 : 0),
        0
      );

      return {
        meetingId: meeting.meetingId,
        meetingTitle: meeting.title,
        reason:
          truncateAssistantText(
            meeting.coachingAnalysis ?? meeting.coachingSummary ?? meeting.transcriptSummary,
            ASSISTANT_SHORT_TEXT_LIMIT
          ) ?? "Reunión incluida en el contexto del agente.",
        score,
        sourceType: meeting.coachingAnalysis
          ? "coaching_analysis"
          : meeting.coachingSummary
            ? "coaching_summary"
            : "transcript_summary"
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ score, ...item }) => item);
}

export async function streamTrustworthinessAssistantMessage(params: {
  emit: (event: TrustworthinessAssistantStreamEvent) => void | Promise<void>;
  prompt: string;
  rehydrateSession?: TrustworthinessAssistantSessionRehydrateInput;
  recordId: string;
  sessionId: string;
}) {
  const startedAt = Date.now();
  const prompt = params.prompt.trim();

  if (!prompt) {
    throw new Error("El mensaje del usuario es obligatorio para continuar la conversación.");
  }

  let activeSessionId = params.sessionId;
  let session = getAssistantSession(activeSessionId, params.recordId);

  if (!session && params.rehydrateSession) {
    const rehydratedSession = await createTrustworthinessAssistantSession({
      activeSessionEmail: params.rehydrateSession.activeSessionEmail,
      end: params.rehydrateSession.end,
      evaluatedName: params.rehydrateSession.evaluatedName,
      evaluatorEmail: params.rehydrateSession.evaluatorEmail,
      history: params.rehydrateSession.history,
      meetings: params.rehydrateSession.meetings,
      participantEmail: params.rehydrateSession.participantEmail,
      projectContext: params.rehydrateSession.projectContext ?? null,
      proposal: params.rehydrateSession.proposal,
      recordId: params.recordId,
      roleLabel: params.rehydrateSession.roleLabel ?? null,
      start: params.rehydrateSession.start,
      suggestion: params.rehydrateSession.suggestion
    });
    activeSessionId = rehydratedSession.sessionId;
    session = getAssistantSession(activeSessionId, params.recordId);
  }

  if (!session) {
    await params.emit({
      code: "SESSION_EXPIRED",
      message: "La sesión del agente expiró. Vuelve a preparar el chat.",
      type: "error"
    });

    return null;
  }

  const focusArea = detectAssistantFocus(prompt);
  await params.emit({ label: "Preparando contexto de la sesión", type: "status" });
  await params.emit({
    label: "Buscando evidencia relevante",
    tool: "searchMeetingEvidence",
    type: "tool_start"
  });
  const evidence = searchAssistantMeetingEvidence(session.meetings, focusArea, prompt);
  await params.emit({
    result: {
      count: evidence.length,
      evidence
    },
    tool: "searchMeetingEvidence",
    type: "tool_done"
  });
  const contextReadyAt = Date.now();
  await params.emit({ label: "Esperando respuesta del modelo", type: "status" });

  const assistantInput: TrustworthinessAssistantConversationInput = {
    evaluatedName: session.context.evaluatedName,
    history: session.history,
    meetings: session.meetings,
    projectContext: session.context.projectContext ?? null,
    prompt,
    proposal: session.proposal,
    roleLabel: session.context.roleLabel ?? null,
    suggestion: session.suggestion
  };
  const structuredReplyPromise = createTrustworthinessAssistantReply(assistantInput);
  const visibleMessagePromise = streamTrustworthinessAssistantVisibleMessage({
    emitDelta: async (delta) => {
      await params.emit({
        delta,
        type: "assistant_text_delta"
      });
    },
    input: assistantInput
  });
  const [structuredReplyResult, visibleMessageResult] = await Promise.allSettled([
    structuredReplyPromise,
    visibleMessagePromise
  ]);
  const modelReadyAt = Date.now();

  if (visibleMessageResult.status === "rejected") {
    throw visibleMessageResult.reason;
  }

  if (structuredReplyResult.status === "rejected") {
    throw structuredReplyResult.reason;
  }

  const assistantReply = structuredReplyResult.value;

  if (assistantReply.decisionTrace.length > 0) {
    for (const trace of assistantReply.decisionTrace) {
      await params.emit({
        delta: trace,
        type: "decision_trace_delta"
      });
    }
  }

  if (assistantReply.proposalChanged) {
    await params.emit({
      label: "Actualizando propuesta local",
      tool: "updateProposal",
      type: "tool_start"
    });
    session.proposal = assistantReply.proposal;
    await params.emit({
      result: {
        proposalChanged: true
      },
      tool: "updateProposal",
      type: "tool_done"
    });
  }

  if (assistantReply.nextIntent === "save") {
    await params.emit({
      label: "Preparando confirmación de guardado",
      tool: "prepareSave",
      type: "tool_start"
    });
    await params.emit({
      result: {
        readyToSave: true
      },
      tool: "prepareSave",
      type: "tool_done"
    });
  }

  session.history = [
    ...session.history,
    { content: prompt, role: "user" as const },
    { content: assistantReply.message, role: "assistant" as const }
  ].slice(-ASSISTANT_HISTORY_LIMIT);

  await params.emit({
    ...assistantReply,
    sessionId: activeSessionId,
    type: "assistant_structured_final"
  });
  console.info("[tw-assistant-stream]", {
    contextMs: contextReadyAt - startedAt,
    modelMs: modelReadyAt - contextReadyAt,
    totalMs: Date.now() - startedAt
  });

  return assistantReply;
}
