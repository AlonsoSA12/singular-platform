import { fetchFromBackend } from "@/lib/backend";
import { getBackendBaseUrl } from "@/lib/env";

export type AgileProject = {
  collaborator: {
    email: string | null;
    name: string | null;
  };
  id: string;
  name: string;
  sourceRecordId: string;
  status: string | null;
};

export type AgileObjective = {
  aiSuggestedKeyResults: string;
  createdAt: string;
  description: string;
  explanation: string;
  id: string;
  keyResultIds: string[];
  keyResults: AgileKeyResult[];
  metric: string;
  name: string;
  no: number | null;
  objective: string;
  poUser: unknown;
  poUserLabel: string;
  priority: string;
  projectIds: string[];
  quarter: string;
  recordId: string;
  score: number | null;
  status: "Achieved" | "In Progress" | "Pending Review" | "Underachieved" | null;
  targetDate: string;
  type: string;
};

export type AgileKeyResult = {
  code: string;
  currentValue: number | null;
  displayName?: string;
  explanation: string;
  id: string;
  initialValue: number | null;
  keyProjectIds?: string[];
  keyProjectLabels?: string[];
  metric: string;
  progress: number;
  sourceRecordId: string;
  status: string;
  targetDate: string;
  targetValue: number | null;
  title: string;
};

export type AgileKeyResultHistoryPoint = {
  created: string;
  currentValue: number | null;
  explanation: string;
  id: string;
  initialValue: number | null;
  justificationScoreKeyResult: string;
  keyResultIds: string[];
  metric: string;
  name: string;
  no: number | null;
  objectiveIds: string[];
  progress: number;
  progressNumber: number | null;
  projectIds: string[];
  quarter: string;
  scoreKeyResult: number | null;
  sourceId: string;
  status: string;
  targetDate: string;
  targetValue: number | null;
  writtenExplanationScore: string;
};

export type AgileKeyResultSentimentAnalysis = {
  confidence: "low" | "medium" | "high";
  keyResultId: string;
  metricStatus: "BLEEDING" | "COLD" | "HOT" | "NEW";
  model: string;
  reason: string;
  recommendedAction: string;
  sentiment: "Bud" | "Rose" | "Thorn";
  usedHistoryPoints: number;
};

export type AgileObjectiveHealthAnalysis = {
  confidence: "low" | "medium" | "high";
  headline: string;
  objectiveId: string;
  primaryRisk: string;
  recommendedAction: string;
  score: number;
  status: "At Risk" | "Critical" | "Healthy" | "Needs Attention";
  summary: string;
};

export type AgilePortfolioAnalysisProject = {
  keyResultCount: number;
  objectiveCount: number;
  projectId: string;
  projectName: string;
  score: number | null;
  signalCounts: {
    bleeding: number;
    cold: number;
    hot: number;
    new: number;
  };
  status: "empty" | "error" | "loading" | "ready";
};

export type AgilePortfolioAnalysis = {
  executiveSummary: string;
  needsAttention: string[];
  winners: string[];
};

export type AgileGeneratedKeyResultDraft = {
  currentValue: number | null;
  explanation: string;
  initialValue: number | null;
  keyResult: string;
  metric: string;
  status: "Done" | "In progress" | "Todo";
  targetDate: string;
  targetValue: number | null;
};

export type AgileGeneratedKeyProjectDraft = {
  clarity: number;
  epicStory: string;
  finalScore: number;
  justification: string;
  keyResultIds: string[];
  name: string;
  projectId: string;
  status: "Suggested by Resource";
  strategicFocus: number;
  valueOrientation: number;
};

export type AgileGeneratedObjectiveDraft = {
  description: string;
  explanation: string;
  keyResults: AgileGeneratedKeyResultDraft[];
  metric: string;
  objective: string;
  priority: string;
  targetDate: string;
  type: string;
};

export type AgileKeyProject = {
  aiStoriesAssist: string;
  clarity: number | null;
  createdAt: string;
  dontShowInSingularStories: boolean;
  epicUpdatedAt: string;
  finalScore: number;
  id: string;
  justification: string;
  keyProjectId: string;
  keyResultIds: string[];
  keyResultLabels?: string[];
  name: string;
  projectIds: string[];
  qualityScore: number;
  sourceRecordId: string;
  strategicFocus: number | null;
  status: string;
  story: string;
  totalStories: number | null;
  valueOrientation: number | null;
};

export type CreateAgileObjectiveInput = {
  aiSuggestedKeyResults?: string;
  description?: string;
  explanation?: string;
  keyResults?: string[];
  metric?: string;
  objective: string;
  priority?: string;
  projectId: string;
  quarter?: string;
  status?: NonNullable<AgileObjective["status"]>;
  suggestedKeyResultsJson?: AgileGeneratedKeyResultDraft[];
  targetDate?: string;
  type?: string;
};

export type CreateAgileKeyResultInput = {
  currentValue?: number | null;
  explanation?: string;
  initialValue?: number | null;
  keyResult: string;
  metric?: string;
  objectiveId: string;
  projectId: string;
  quarter?: string;
  status?: "Done" | "In progress" | "Todo";
  targetDate?: string;
  targetValue?: number | null;
};

export type UpdateAgileKeyResultInput = Partial<CreateAgileKeyResultInput> & {
  recordId: string;
};

export type CreateAgileKeyProjectInput = {
  dontShowInSingularStories?: boolean;
  epicStory?: string;
  justification?: string;
  name: string;
  projectId: string;
  status?: "Active" | "Archived" | "Suggested by Resource";
  totalStories?: number | null;
};

export type SingularAgileKeyProjectInput = {
  clarity?: number | null;
  dontShowInSingularStories?: boolean;
  epicStory?: string;
  finalScore?: number | null;
  justification?: string;
  keyResultIds?: string[];
  name: string;
  projectIds?: string[];
  status?: string;
  strategicFocus?: number | null;
  valueOrientation?: number | null;
};

export type SingularAgileKeyProjectUpdateInput = Partial<SingularAgileKeyProjectInput> & {
  recordId: string;
};

export type SingularAgileKeyProjectLinkSnapshot = {
  id: string;
  keyResultIds: string[];
  keyResultLabels?: string[];
  name: string;
};

type SingularAgileKeyProjectsSuccess = {
  ok: true;
  keyProjects: SingularAgileKeyProjectLinkSnapshot[];
  recordCount: number;
  tableName: string;
};

export type SingularAgileObjectiveInput = {
  aiSuggestedKeyResults?: string;
  description?: string;
  explanation?: string;
  keyResultIds?: string[];
  metric?: string;
  objective: string;
  priority?: string;
  projectIds?: string[];
  status?: "Achieved" | "In Progress" | "Pending Review" | "Underachieved";
  targetDate?: string;
  type?: string;
};

export type SingularAgileObjectiveUpdateInput = Partial<SingularAgileObjectiveInput> & {
  recordId: string;
};

export type SingularAgileKeyResultInput = {
  currentValue?: number | null;
  explanation?: string;
  initialValue?: number | null;
  keyResult: string;
  metric?: string;
  objectiveIds?: string[];
  projectIds?: string[];
  status?: "Done" | "In progress" | "Todo";
  targetDate?: string;
  targetValue?: number | null;
};

export type SingularAgileKeyResultUpdateInput = Partial<SingularAgileKeyResultInput> & {
  recordId?: string;
  sourceId?: string;
  source_id?: string;
};

export type SingularAgileKeyResultHistoryUpdateInput = {
  currentValue?: number | null;
  initialValue?: number | null;
  recordId?: string;
  sourceId?: string;
  source_id?: string;
  targetValue?: number | null;
};

export type OkrBotAction =
  | "create_key_project"
  | "create_key_result"
  | "create_objective"
  | "edit_key_project"
  | "edit_key_result"
  | "edit_objective";

export type OkrBotProposal = {
  draft: unknown;
  operation: "create" | "edit";
  targetType: "key_project" | "key_result" | "objective";
};

export type OkrBotChatInput = {
  action?: OkrBotAction;
  activeProposal?: OkrBotProposal;
  conversationHistory?: Array<{
    role: "assistant" | "user";
    text: string;
  }>;
  memoryLimit?: number;
  message?: string;
  objectiveId?: string;
  projectId: string;
  projectName?: string;
  targetLabel?: string;
  targetId?: string;
};

export type OkrBotChatResponse = {
  action: OkrBotAction | null;
  context: {
    keyProjectCount: number;
    keyResultCount: number;
    keyResultHistoryCount: number;
    objectiveCount: number;
    project: {
      id: string;
      name: string;
    };
    warnings: string[];
  };
  message: string;
  nextStep: "choose_action" | "confirm_proposal" | "provide_prompt" | "select_target";
  ok: true;
  options?: Array<string | { id: string; label: string; meta?: string; searchText?: string }>;
  proposal?: OkrBotProposal;
  prompt?: string;
  selectedTarget?: {
    id: string;
    label: string;
  };
  selectedTargetId?: string;
};

type AgileProjectsSuccess = {
  collaboratorEmail: string;
  ok: true;
  projects: AgileProject[];
  recordCount: number;
  tableName: string;
};

type AgileObjectivesSuccess = {
  objectives: AgileObjective[];
  ok: true;
  projectId: string;
  recordCount: number;
  tableName: string;
};

type AgileKeyProjectsSuccess = {
  keyProjects: AgileKeyProject[];
  ok: true;
  projectId: string;
  recordCount: number;
  tableName: string;
};

type AgileKeyResultHistoryBulkSuccess = {
  historyByKeyResultId: Record<string, AgileKeyResultHistoryPoint[]>;
  keyResultIds: string[];
  ok: true;
  recordCount: number;
  tableName: string;
};

type AgileKeyResultSentimentsSuccess = {
  analyses: AgileKeyResultSentimentAnalysis[];
  message?: string;
  model: string;
  ok: true;
};

type AgileObjectiveHealthAnalysisSuccess = {
  analyses: AgileObjectiveHealthAnalysis[];
  message?: string;
  model: string;
  ok: true;
};

type AgilePortfolioAnalysisSuccess = {
  analysis: AgilePortfolioAnalysis;
  generatedAt: string;
  message?: string;
  model: string;
  ok: true;
};

type AgileObjectiveDraftSuccess = {
  draft: AgileGeneratedObjectiveDraft;
  model: string;
  ok: true;
};

type AgileKeyResultDraftSuccess = {
  draft: AgileGeneratedKeyResultDraft;
  model: string;
  ok: true;
};

type AgileKeyProjectDraftSuccess = {
  draft: AgileGeneratedKeyProjectDraft;
  model: string;
  ok: true;
};

export type AgileKeyProjectKeyResultSuggestion = {
  confidence: number;
  keyResult: AgileKeyResult;
  objective: {
    id: string;
    title: string;
  };
  reason: string;
};

type AgileKeyProjectKeyResultSuggestionsSuccess = {
  model: string;
  ok: true;
  suggestions: AgileKeyProjectKeyResultSuggestion[];
};

type AgileCreateObjectiveSuccess = {
  objective: AgileObjective;
  ok: true;
  tableName: string;
};

type AgileCreateKeyResultSuccess = {
  keyResult: AgileKeyResult;
  objectiveId: string;
  ok: true;
  projectId: string;
  tableName: string;
};

type AgileCreateKeyProjectSuccess = {
  keyProject: AgileKeyProject;
  ok: true;
  projectId: string;
  tableName: string;
};

type SingularAgileKeyProjectWriteSuccess = {
  acceptedFields: string[];
  created?: boolean;
  invalidFields: Array<{ field: string; message: string }>;
  missingRequiredFields: string[];
  ok: true;
  record: {
    createdTime: string;
    fields: Record<string, unknown>;
    id: string;
  };
  status: string;
  tableName: string;
  unknownFields: string[];
  updated?: boolean;
};

type SingularAgileKeyResultWriteSuccess = SingularAgileKeyProjectWriteSuccess;

type SingularAgileKeyResultHistoryWriteSuccess = SingularAgileKeyProjectWriteSuccess;

type SingularAgileObjectiveWriteSuccess = SingularAgileKeyProjectWriteSuccess;

type AgileProjectsFailure = {
  invalidFields?: Array<{ field: string; message: string }>;
  message?: string;
  missingRequiredFields?: string[];
  ok?: false;
};

export async function fetchAgileProjectsFromBackend(collaboratorEmail: string) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(`${backendBaseUrl}/okrs/projects`);

  url.searchParams.set("collaboratorEmail", collaboratorEmail);

  const response = await fetchFromBackend(url, {
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as AgileProjectsSuccess | AgileProjectsFailure;

  if (!response.ok || !("ok" in payload && payload.ok)) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible consultar los proyectos de OKRs.");
  }

  return payload;
}

export async function fetchAgileObjectivesFromBackend(projectId: string) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(`${backendBaseUrl}/okrs/objectives`);

  url.searchParams.set("projectId", projectId);

  const response = await fetchFromBackend(url, {
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as AgileObjectivesSuccess | AgileProjectsFailure;

  if (!response.ok || !("ok" in payload && payload.ok)) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible consultar los objetivos de OKRs.");
  }

  return payload;
}

export async function fetchAgileKeyProjectsFromBackend(projectId: string) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(`${backendBaseUrl}/okrs/key-projects`);

  url.searchParams.set("projectId", projectId);

  const response = await fetchFromBackend(url, {
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as AgileKeyProjectsSuccess | AgileProjectsFailure;

  if (!response.ok || !("ok" in payload && payload.ok)) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible consultar los Key Projects de OKRs.");
  }

  return payload;
}

export async function fetchAgileKeyResultHistoryBulkFromBackend(keyResultIds: string[]) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/key-result-history/bulk`, {
    body: JSON.stringify({ keyResultIds }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultHistoryBulkSuccess>(
    response,
    "No fue posible consultar el historico de Key Results."
  );
}

export async function fetchSingularAgileKeyResultHistoryBulkFromBackend(keyResultIds: string[]) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/key-result-history/bulk`, {
    body: JSON.stringify({ keyResultIds }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultHistoryBulkSuccess>(
    response,
    "No fue posible consultar el histórico de Key Results en Singular Agile."
  );
}

export async function fetchAgileKeyResultHistoryBulk(keyResultIds: string[]) {
  const response = await fetch("/api/okrs/key-result-history/bulk", {
    body: JSON.stringify({ keyResultIds }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultHistoryBulkSuccess>(
    response,
    "No fue posible consultar el historico de Key Results."
  );
}

export async function fetchSingularAgileKeyResultHistoryBulk(keyResultIds: string[]) {
  const response = await fetch("/api/singular-agile/key-result-history/bulk", {
    body: JSON.stringify({ keyResultIds }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultHistoryBulkSuccess>(
    response,
    "No fue posible consultar el histórico de Key Results en Singular Agile."
  );
}

export async function analyzeAgileKeyResultSentimentsInBackend(
  keyResults: AgileKeyResult[]
) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/key-result-sentiments`, {
    body: JSON.stringify({ keyResults }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultSentimentsSuccess>(
    response,
    "No fue posible analizar Rose/Bud/Thorn para los Key Results."
  );
}

export async function analyzeAgileKeyResultSentiments(keyResults: AgileKeyResult[]) {
  const response = await fetch("/api/okrs/key-result-sentiments", {
    body: JSON.stringify({ keyResults }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultSentimentsSuccess>(
    response,
    "No fue posible analizar Rose/Bud/Thorn para los Key Results."
  );
}

export async function analyzeAgileObjectiveHealthInBackend(input: {
  keyProjects: AgileKeyProject[];
  objectives: Array<
    Pick<AgileObjective, "description" | "id" | "quarter" | "score" | "status" | "targetDate"> & {
      keyResultSentiments?: Array<Pick<AgileKeyResultSentimentAnalysis, "keyResultId" | "metricStatus">>;
      keyResults: AgileKeyResult[];
      title: string;
    }
  >;
  project: Pick<AgileProject, "id" | "name">;
}) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/objective-health-analysis`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileObjectiveHealthAnalysisSuccess>(
    response,
    "No fue posible analizar la salud de los Objectives."
  );
}

export async function analyzeAgileObjectiveHealth(input: {
  keyProjects: AgileKeyProject[];
  objectives: Array<
    Pick<AgileObjective, "description" | "id" | "quarter" | "score" | "status" | "targetDate"> & {
      keyResultSentiments?: Array<Pick<AgileKeyResultSentimentAnalysis, "keyResultId" | "metricStatus">>;
      keyResults: AgileKeyResult[];
      title: string;
    }
  >;
  project: Pick<AgileProject, "id" | "name">;
}) {
  const response = await fetch("/api/okrs/objective-health-analysis", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileObjectiveHealthAnalysisSuccess>(
    response,
    "No fue posible analizar la salud de los Objectives."
  );
}

export async function analyzeAgilePortfolioInBackend(input: {
  generatedFor: string;
  portfolioScore: number | null;
  projects: AgilePortfolioAnalysisProject[];
}) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/portfolio-analysis`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgilePortfolioAnalysisSuccess>(
    response,
    "No fue posible generar el Portfolio Analysis."
  );
}

export async function analyzeAgilePortfolio(input: {
  generatedFor: string;
  portfolioScore: number | null;
  projects: AgilePortfolioAnalysisProject[];
}) {
  const response = await fetch("/api/okrs/portfolio-analysis", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgilePortfolioAnalysisSuccess>(
    response,
    "No fue posible generar el Portfolio Analysis."
  );
}

export async function generateAgileObjectiveDraftInBackend(input: {
  existingObjectives: AgileObjective[];
  idea: string;
  keyProjects: AgileKeyProject[];
  projectId: string;
  projectName: string;
}) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/ai/objective-draft`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileObjectiveDraftSuccess>(
    response,
    "No fue posible generar el Objective con IA."
  );
}

export async function generateAgileObjectiveDraft(input: {
  existingObjectives: AgileObjective[];
  idea: string;
  keyProjects: AgileKeyProject[];
  projectId: string;
  projectName: string;
}) {
  const response = await fetch("/api/okrs/ai/objective-draft", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileObjectiveDraftSuccess>(
    response,
    "No fue posible generar el Objective con IA."
  );
}

export async function generateAgileKeyResultDraftInBackend(input: {
  existingKeyResults: AgileKeyResult[];
  idea: string;
  objective: AgileObjective;
  projectId: string;
  projectName: string;
}) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/ai/key-result-draft`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultDraftSuccess>(
    response,
    "No fue posible generar el Key Result con IA."
  );
}

export async function generateAgileKeyResultDraft(input: {
  existingKeyResults: AgileKeyResult[];
  idea: string;
  objective: AgileObjective;
  projectId: string;
  projectName: string;
}) {
  const response = await fetch("/api/okrs/ai/key-result-draft", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyResultDraftSuccess>(
    response,
    "No fue posible generar el Key Result con IA."
  );
}

export async function generateAgileKeyProjectDraftInBackend(input: {
  existingKeyProjects: AgileKeyProject[];
  existingKeyResults: AgileKeyResult[];
  idea: string;
  objectives: AgileObjective[];
  projectId: string;
  projectName: string;
  selectedKeyResult?: AgileKeyResult | null;
}) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/ai/key-project-draft`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyProjectDraftSuccess>(
    response,
    "No fue posible generar el Key Project con IA."
  );
}

export async function generateAgileKeyProjectDraft(input: {
  existingKeyProjects: AgileKeyProject[];
  existingKeyResults: AgileKeyResult[];
  idea: string;
  objectives: AgileObjective[];
  projectId: string;
  projectName: string;
  selectedKeyResult?: AgileKeyResult | null;
}) {
  const response = await fetch("/api/okrs/ai/key-project-draft", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyProjectDraftSuccess>(
    response,
    "No fue posible generar el Key Project con IA."
  );
}

export async function suggestKeyResultsForKeyProject(input: {
  keyProject: Pick<AgileKeyProject, "id" | "justification" | "keyProjectId" | "name" | "story">;
  objectives: AgileObjective[];
  projectId: string;
  projectName: string;
}) {
  const response = await fetch("/api/okrs/key-projects/suggest-key-results", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileKeyProjectKeyResultSuggestionsSuccess>(
    response,
    "No fue posible sugerir Key Results para este Key Project."
  );
}

async function parseOkrsBackendJson<TSuccess extends { ok: true }>(
  response: Response,
  fallbackMessage: string
) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as TSuccess | AgileProjectsFailure;

  if (!response.ok || !("ok" in payload && payload.ok)) {
    const missingRequiredFields =
      "missingRequiredFields" in payload && Array.isArray(payload.missingRequiredFields)
        ? payload.missingRequiredFields
        : [];
    const invalidFields =
      "invalidFields" in payload && Array.isArray(payload.invalidFields) ? payload.invalidFields : [];
    const validationDetails = [
      missingRequiredFields.length > 0 ? `Campos requeridos: ${missingRequiredFields.join(", ")}.` : "",
      ...invalidFields.map((field) => `${field.field}: ${field.message}`)
    ].filter(Boolean);
    const message =
      "message" in payload && payload.message
        ? payload.message
        : validationDetails.length > 0
          ? validationDetails.join(" ")
          : undefined;
    throw new Error(message ?? fallbackMessage);
  }

  return payload as TSuccess;
}

export async function createAgileObjectiveInBackend(input: CreateAgileObjectiveInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/objectives`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileCreateObjectiveSuccess>(
    response,
    "No fue posible crear el Objective de OKRs."
  );
}

export async function createAgileKeyResultInBackend(input: CreateAgileKeyResultInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/key-results`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileCreateKeyResultSuccess>(
    response,
    "No fue posible crear el Key Result de OKRs."
  );
}

export async function updateAgileKeyResultInBackend(input: UpdateAgileKeyResultInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/key-results`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<AgileCreateKeyResultSuccess>(
    response,
    "No fue posible actualizar el Key Result de OKRs."
  );
}

export async function createAgileKeyProjectInBackend(input: CreateAgileKeyProjectInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/key-projects`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileCreateKeyProjectSuccess>(
    response,
    "No fue posible crear el Key Project de OKRs."
  );
}

export async function createSingularAgileKeyProjectInBackend(input: SingularAgileKeyProjectInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/key-projects`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<SingularAgileKeyProjectWriteSuccess>(
    response,
    "No fue posible crear el Key Project en Singular Agile."
  );
}

export async function createSingularAgileKeyResultInBackend(input: SingularAgileKeyResultInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/key-results`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<SingularAgileKeyResultWriteSuccess>(
    response,
    "No fue posible crear el Key Result en Singular Agile."
  );
}

export async function createSingularAgileObjectiveInBackend(input: SingularAgileObjectiveInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/objectives`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<SingularAgileObjectiveWriteSuccess>(
    response,
    "No fue posible crear el Objective en Singular Agile."
  );
}

export async function updateSingularAgileObjectiveInBackend(input: SingularAgileObjectiveUpdateInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/objectives`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileObjectiveWriteSuccess>(
    response,
    "No fue posible actualizar el Objective en Singular Agile."
  );
}

export async function updateSingularAgileKeyResultInBackend(input: SingularAgileKeyResultUpdateInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/key-results`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileKeyResultWriteSuccess>(
    response,
    "No fue posible actualizar el Key Result en Singular Agile."
  );
}

export async function updateSingularAgileKeyResultHistoryInBackend(
  input: SingularAgileKeyResultHistoryUpdateInput
) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/key-result-history`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileKeyResultHistoryWriteSuccess>(
    response,
    "No fue posible actualizar el histórico del Key Result en Singular Agile."
  );
}

export async function updateSingularAgileKeyProjectInBackend(input: SingularAgileKeyProjectUpdateInput) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/singular-agile/key-projects`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileKeyProjectWriteSuccess>(
    response,
    "No fue posible actualizar el Key Project en Singular Agile."
  );
}

export async function fetchSingularAgileKeyProjectsFromBackend(recordIds: string[]) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(`${backendBaseUrl}/singular-agile/key-projects`);

  url.searchParams.set("recordIds", recordIds.join(","));

  const response = await fetchFromBackend(url, {
    cache: "no-store"
  });

  return parseOkrsBackendJson<SingularAgileKeyProjectsSuccess>(
    response,
    "No fue posible consultar los Key Projects en Singular Agile."
  );
}

export async function createAgileObjective(input: CreateAgileObjectiveInput) {
  const response = await fetch("/api/okrs/objectives", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileCreateObjectiveSuccess>(
    response,
    "No fue posible crear el Objective de OKRs."
  );
}

export async function createAgileKeyResult(input: CreateAgileKeyResultInput) {
  const response = await fetch("/api/okrs/key-results", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileCreateKeyResultSuccess>(
    response,
    "No fue posible crear el Key Result de OKRs."
  );
}

export async function updateAgileKeyResult(input: UpdateAgileKeyResultInput) {
  const response = await fetch("/api/okrs/key-results", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<AgileCreateKeyResultSuccess>(
    response,
    "No fue posible actualizar el Key Result de OKRs."
  );
}

export async function createAgileKeyProject(input: CreateAgileKeyProjectInput) {
  const response = await fetch("/api/okrs/key-projects", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<AgileCreateKeyProjectSuccess>(
    response,
    "No fue posible crear el Key Project de OKRs."
  );
}

export async function createSingularAgileKeyProject(input: SingularAgileKeyProjectInput) {
  const response = await fetch("/api/singular-agile/key-projects", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<SingularAgileKeyProjectWriteSuccess>(
    response,
    "No fue posible crear el Key Project en Singular Agile."
  );
}

export async function createSingularAgileKeyResult(input: SingularAgileKeyResultInput) {
  const response = await fetch("/api/singular-agile/key-results", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<SingularAgileKeyResultWriteSuccess>(
    response,
    "No fue posible crear el Key Result en Singular Agile."
  );
}

export async function createSingularAgileObjective(input: SingularAgileObjectiveInput) {
  const response = await fetch("/api/singular-agile/objectives", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<SingularAgileObjectiveWriteSuccess>(
    response,
    "No fue posible crear el Objective en Singular Agile."
  );
}

export async function updateSingularAgileObjective(input: SingularAgileObjectiveUpdateInput) {
  const response = await fetch("/api/singular-agile/objectives", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileObjectiveWriteSuccess>(
    response,
    "No fue posible actualizar el Objective en Singular Agile."
  );
}

export async function updateSingularAgileKeyResult(input: SingularAgileKeyResultUpdateInput) {
  const response = await fetch("/api/singular-agile/key-results", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileKeyResultWriteSuccess>(
    response,
    "No fue posible actualizar el Key Result en Singular Agile."
  );
}

export async function updateSingularAgileKeyResultHistory(input: SingularAgileKeyResultHistoryUpdateInput) {
  const response = await fetch("/api/singular-agile/key-result-history", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileKeyResultHistoryWriteSuccess>(
    response,
    "No fue posible actualizar el histórico del Key Result en Singular Agile."
  );
}

export async function updateSingularAgileKeyProject(input: SingularAgileKeyProjectUpdateInput) {
  const response = await fetch("/api/singular-agile/key-projects", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  return parseOkrsBackendJson<SingularAgileKeyProjectWriteSuccess>(
    response,
    "No fue posible actualizar el Key Project en Singular Agile."
  );
}

export async function fetchSingularAgileKeyProjects(recordIds: string[]) {
  const url = new URL("/api/singular-agile/key-projects", window.location.origin);

  url.searchParams.set("recordIds", recordIds.join(","));

  const response = await fetch(url, {
    cache: "no-store"
  });

  return parseOkrsBackendJson<SingularAgileKeyProjectsSuccess>(
    response,
    "No fue posible consultar los Key Projects en Singular Agile."
  );
}

export async function sendOkrBotMessageInBackend(input: OkrBotChatInput & { collaboratorEmail: string }) {
  const backendBaseUrl = getBackendBaseUrl();
  const response = await fetchFromBackend(`${backendBaseUrl}/okrs/bot/chat`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<OkrBotChatResponse>(
    response,
    "No fue posible consultar el OKR Bot."
  );
}

export async function sendOkrBotMessage(input: OkrBotChatInput) {
  const response = await fetch("/api/okrs/bot/chat", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseOkrsBackendJson<OkrBotChatResponse>(
    response,
    "No fue posible consultar el OKR Bot."
  );
}
