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
  explanation: string;
  id: string;
  initialValue: number | null;
  metric: string;
  progress: number;
  status: string;
  targetDate: string;
  targetValue: number | null;
  title: string;
};

export type AgileKeyResultHistoryPoint = {
  currentValue: number | null;
  id: string;
  initialValue: number | null;
  name: string;
  no: number | null;
  progress: number;
  progressNumber: number | null;
  quarter: string;
  scoreKeyResult: number | null;
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
  name: string;
  projectIds: string[];
  qualityScore: number;
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

export type CreateAgileKeyProjectInput = {
  dontShowInSingularStories?: boolean;
  epicStory?: string;
  justification?: string;
  name: string;
  projectId: string;
  status?: "Active" | "Archived" | "Suggested by Resource";
  totalStories?: number | null;
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

type AgileProjectsFailure = {
  message?: string;
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
    const message = "message" in payload ? payload.message : undefined;
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
