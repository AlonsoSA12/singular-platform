export type AgileObjectiveStatus = "Achieved" | "In Progress" | "Pending Review" | "Underachieved";
export type AgileKeyResultStatus = "Done" | "In progress" | "Todo";
export type AgileKeyProjectStatus = "Active" | "Archived" | "Suggested by Resource";
export type AgileObjectiveHealthStatus = "At Risk" | "Critical" | "Healthy" | "Needs Attention";
export type AgileKeyResultMetricStatus = "BLEEDING" | "COLD" | "HOT" | "NEW";
export type AgileKeyResultSentiment = "Bud" | "Rose" | "Thorn";

export type CreateAgileObjectiveInput = {
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

export type CreateAgileKeyResultInput = {
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

export type UpdateAgileKeyResultInput = Partial<CreateAgileKeyResultInput> & {
  recordId: string;
};

export type CreateAgileKeyProjectInput = {
  dontShowInSingularStories?: boolean;
  epicStory?: string;
  justification?: string;
  name: string;
  projectId: string;
  status?: AgileKeyProjectStatus;
  totalStories?: number | null;
};

export type AgileKeyResultSentimentInput = {
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

export type AgileObjectiveHealthKeyResultInput = AgileKeyResultSentimentInput & {
  explanation?: string;
};

export type AgileObjectiveHealthInput = {
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

export type AgileObjectiveHealthAnalysisInput = {
  keyProjects?: unknown[];
  objectives: AgileObjectiveHealthInput[];
  project?: {
    id?: string;
    name?: string;
  };
};

export type AgilePortfolioAnalysisProjectInput = {
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

export type AgilePortfolioAnalysisInput = {
  generatedFor?: string;
  portfolioScore?: number | null;
  projects: AgilePortfolioAnalysisProjectInput[];
};

export type AgileObjectiveDraftInput = {
  existingObjectives?: unknown[];
  idea: string;
  keyProjects?: unknown[];
  projectId: string;
  projectName: string;
};

export type AgileKeyResultDraftInput = {
  existingKeyResults?: unknown[];
  idea: string;
  objective: unknown;
  projectId: string;
  projectName: string;
};

export type AgileKeyResultEditDraftInput = {
  currentKeyResult: unknown;
  editInstructions: string;
  keyResultHistory?: unknown[];
  objective?: unknown;
  siblingKeyResults?: unknown[];
  projectId: string;
  projectName: string;
};

export type AgileKeyProjectDraftInput = {
  existingKeyProjects?: unknown[];
  existingKeyResults?: unknown[];
  idea: string;
  objectives?: unknown[];
  projectId: string;
  projectName: string;
  selectedKeyResult?: unknown;
};
