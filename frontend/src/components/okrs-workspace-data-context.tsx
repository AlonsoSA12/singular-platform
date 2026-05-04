"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type {
  AgileKeyProject,
  AgileKeyResult,
  AgileKeyResultHistoryPoint,
  AgileKeyResultSentimentAnalysis,
  AgileObjective,
  AgilePortfolioAnalysis,
  AgilePortfolioAnalysisProject,
  AgileProject
} from "@/lib/okrs";
import {
  analyzeAgileKeyResultSentiments,
  analyzeAgilePortfolio,
  fetchAgileKeyResultHistoryBulk
} from "@/lib/okrs";

type LoadStatus = "error" | "idle" | "loading" | "ready";

export type ProjectOkrData = {
  keyProjects: AgileKeyProject[];
  keyProjectsError?: string | null;
  objectives: AgileObjective[];
};

export type PortfolioProjectSummary = {
  analyses: AgileKeyResultSentimentAnalysis[];
  error?: string;
  keyResults: AgileKeyResult[];
  keyResultCount: number;
  objectiveCount: number;
  score: number | null;
  signalCounts: ReturnType<typeof getSignalCounts>;
  status: "empty" | "error" | "loading" | "ready";
};

export type PortfolioNarrativeState = {
  analysis: AgilePortfolioAnalysis | null;
  error: string | null;
  generatedAt: string | null;
  isLoading: boolean;
};

export type PortfolioKrHistoryCache = Record<
  string,
  {
    error?: string;
    history: AgileKeyResultHistoryPoint[];
    status: "error" | "loading" | "ready";
  }
>;

type ProjectsState = {
  error: string | null;
  projects: AgileProject[];
  status: LoadStatus;
};

type OkrsWorkspaceDataContextValue = {
  ensureKeyResultHistoryBulk: (keyResultIds: string[]) => Promise<PortfolioKrHistoryCache>;
  ensurePortfolioNarrative: (
    signature: string,
    input: {
      generatedFor: string;
      portfolioScore: number | null;
      projects: AgilePortfolioAnalysisProject[];
    }
  ) => Promise<PortfolioNarrativeState>;
  ensurePortfolioSummaries: () => Promise<Record<string, PortfolioProjectSummary>>;
  ensureProjectData: (projectId: string, options?: { force?: boolean }) => Promise<ProjectOkrData>;
  ensureProjectSentiments: (
    projectId: string,
    keyResults: AgileKeyResult[]
  ) => Promise<AgileKeyResultSentimentAnalysis[]>;
  ensureProjects: () => Promise<AgileProject[]>;
  invalidateProject: (projectId: string) => void;
  portfolioKrHistoryById: PortfolioKrHistoryCache;
  portfolioNarrativeCache: Record<string, PortfolioNarrativeState>;
  portfolioProjectSummaries: Record<string, PortfolioProjectSummary>;
  projectDataCache: Record<string, ProjectOkrData>;
  projectSentimentCache: Record<string, AgileKeyResultSentimentAnalysis[]>;
  projects: AgileProject[];
  projectsError: string | null;
  projectsStatus: LoadStatus;
};

const OkrsWorkspaceDataContext = createContext<OkrsWorkspaceDataContextValue | null>(null);

async function fetchOkrsProjectData(projectId: string): Promise<ProjectOkrData> {
  const [response, keyProjectsResponse] = await Promise.all([
    fetch(`/api/okrs/objectives?projectId=${encodeURIComponent(projectId)}`, {
      cache: "no-store"
    }),
    fetch(`/api/okrs/key-projects?projectId=${encodeURIComponent(projectId)}`, {
      cache: "no-store"
    })
  ]);
  const payload = (await response.json()) as
    | { objectives: AgileObjective[]; ok: true }
    | { message?: string; ok?: false };
  const keyProjectsPayload = (await keyProjectsResponse.json()) as
    | { keyProjects: AgileKeyProject[]; ok: true }
    | { message?: string; ok?: false };

  if (!response.ok || !("ok" in payload && payload.ok)) {
    const failurePayload = payload as { message?: string };
    throw new Error(failurePayload.message ?? "No fue posible consultar los objetivos.");
  }

  if (!keyProjectsResponse.ok || !("ok" in keyProjectsPayload && keyProjectsPayload.ok)) {
    const failurePayload = keyProjectsPayload as { message?: string };

    return {
      keyProjects: [],
      keyProjectsError: failurePayload.message ?? "No fue posible consultar los Key Projects.",
      objectives: payload.objectives
    };
  }

  return {
    keyProjects: keyProjectsPayload.keyProjects,
    keyProjectsError: null,
    objectives: payload.objectives
  };
}

function normalizeProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isKeyResultComplete(keyResult: AgileKeyResult) {
  return normalizeProgress(keyResult.progress) >= 100 || keyResult.status === "Achieved" || keyResult.status === "Done";
}

function getObjectiveKeyResults(objective: AgileObjective): AgileKeyResult[] {
  if ((objective.keyResults ?? []).length > 0) {
    return objective.keyResults;
  }

  return objective.keyResultIds.map((keyResultId, index) => ({
    code: "",
    currentValue: null,
    explanation: "",
    id: keyResultId,
    initialValue: null,
    metric: objective.metric,
    progress: objective.status === "Achieved" ? 100 : 0,
    status: objective.status ?? "Linked",
    targetDate: objective.targetDate,
    targetValue: null,
    title: `Linked Key Result ${index + 1}`
  }));
}

function computeObjectiveProgress(objective: AgileObjective) {
  const keyResults = getObjectiveKeyResults(objective);

  if (keyResults.length === 0) return 0;

  const keyResultsWithProgress = keyResults.filter((kr) => kr.progress > 0);
  if (keyResultsWithProgress.length > 0) {
    return normalizeProgress(
      keyResultsWithProgress.reduce((total, kr) => total + normalizeProgress(kr.progress), 0) /
        keyResultsWithProgress.length
    );
  }

  return normalizeProgress((keyResults.filter(isKeyResultComplete).length / keyResults.length) * 100);
}

function computeObjectiveScore(objective: AgileObjective) {
  if (objective.score !== null) {
    return normalizeProgress(objective.score);
  }

  return computeObjectiveProgress(objective);
}

function getSignalCounts(analyses: AgileKeyResultSentimentAnalysis[]) {
  return {
    bleeding: analyses.filter((analysis) => analysis.metricStatus === "BLEEDING").length,
    cold: analyses.filter((analysis) => analysis.metricStatus === "COLD").length,
    hot: analyses.filter((analysis) => analysis.metricStatus === "HOT").length,
    new: analyses.filter((analysis) => analysis.metricStatus === "NEW").length
  };
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        await worker(item);
      }
    }
  });

  await Promise.all(workers);
}

export function OkrsWorkspaceDataProvider({ children }: { children: React.ReactNode }) {
  const [projectsState, setProjectsState] = useState<ProjectsState>({
    error: null,
    projects: [],
    status: "idle"
  });
  const [projectDataCache, setProjectDataCache] = useState<Record<string, ProjectOkrData>>({});
  const [projectSentimentCache, setProjectSentimentCache] = useState<
    Record<string, AgileKeyResultSentimentAnalysis[]>
  >({});
  const [portfolioProjectSummaries, setPortfolioProjectSummaries] = useState<
    Record<string, PortfolioProjectSummary>
  >({});
  const [portfolioKrHistoryById, setPortfolioKrHistoryById] = useState<PortfolioKrHistoryCache>({});
  const [portfolioNarrativeCache, setPortfolioNarrativeCache] = useState<Record<string, PortfolioNarrativeState>>({});

  const projectsPromiseRef = useRef<Promise<AgileProject[]> | null>(null);
  const projectDataPromisesRef = useRef<Partial<Record<string, Promise<ProjectOkrData>>>>({});
  const projectSentimentPromisesRef = useRef<Partial<Record<string, Promise<AgileKeyResultSentimentAnalysis[]>>>>({});
  const historyPromisesRef = useRef<Partial<Record<string, Promise<PortfolioKrHistoryCache>>>>({});
  const narrativePromisesRef = useRef<Partial<Record<string, Promise<PortfolioNarrativeState>>>>({});

  const projectDataCacheRef = useRef(projectDataCache);
  const projectSentimentCacheRef = useRef(projectSentimentCache);
  const portfolioKrHistoryByIdRef = useRef(portfolioKrHistoryById);
  const portfolioNarrativeCacheRef = useRef(portfolioNarrativeCache);
  const portfolioProjectSummariesRef = useRef(portfolioProjectSummaries);
  const projectsStateRef = useRef(projectsState);

  projectDataCacheRef.current = projectDataCache;
  projectSentimentCacheRef.current = projectSentimentCache;
  portfolioKrHistoryByIdRef.current = portfolioKrHistoryById;
  portfolioNarrativeCacheRef.current = portfolioNarrativeCache;
  portfolioProjectSummariesRef.current = portfolioProjectSummaries;
  projectsStateRef.current = projectsState;

  const ensureProjects = useCallback(async () => {
    const current = projectsStateRef.current;
    if (current.status === "ready") {
      return current.projects;
    }

    if (projectsPromiseRef.current) {
      return projectsPromiseRef.current;
    }

    const promise = (async () => {
      setProjectsState((state) => ({
        ...state,
        error: null,
        status: "loading"
      }));

      try {
        const response = await fetch("/api/okrs/projects", {
          cache: "no-store"
        });
        const payload = (await response.json()) as
          | { ok: true; projects: AgileProject[] }
          | { message?: string; ok?: false };

        if (!response.ok || !("ok" in payload && payload.ok)) {
          const failurePayload = payload as { message?: string };
          throw new Error(failurePayload.message ?? "No fue posible consultar los proyectos.");
        }

        setProjectsState({
          error: null,
          projects: payload.projects,
          status: "ready"
        });

        return payload.projects;
      } catch (error) {
        setProjectsState({
          error: error instanceof Error ? error.message : "No fue posible consultar los proyectos.",
          projects: [],
          status: "error"
        });
        throw error;
      } finally {
        projectsPromiseRef.current = null;
      }
    })();

    projectsPromiseRef.current = promise;

    return promise;
  }, []);

  const ensureProjectData = useCallback(async (projectId: string, options: { force?: boolean } = {}) => {
    if (!options.force && projectDataCacheRef.current[projectId]) {
      return projectDataCacheRef.current[projectId];
    }

    if (!options.force && projectDataPromisesRef.current[projectId]) {
      return projectDataPromisesRef.current[projectId];
    }

    const promise = (async () => {
      try {
        const data = await fetchOkrsProjectData(projectId);
        const nextCache = {
          ...projectDataCacheRef.current,
          [projectId]: data
        };
        projectDataCacheRef.current = nextCache;
        setProjectDataCache(nextCache);

        return data;
      } catch (error) {
        throw error;
      } finally {
        delete projectDataPromisesRef.current[projectId];
      }
    })();

    projectDataPromisesRef.current[projectId] = promise;

    return promise;
  }, []);

  const ensureProjectSentiments = useCallback(async (projectId: string, keyResults: AgileKeyResult[]) => {
    const cachedAnalyses = projectSentimentCacheRef.current[projectId];
    if (cachedAnalyses && cachedAnalyses.length === keyResults.length) {
      return cachedAnalyses;
    }

    if (keyResults.length === 0) {
      const nextCache = {
        ...projectSentimentCacheRef.current,
        [projectId]: []
      };
      projectSentimentCacheRef.current = nextCache;
      setProjectSentimentCache(nextCache);
      return [];
    }

    if (projectSentimentPromisesRef.current[projectId]) {
      return projectSentimentPromisesRef.current[projectId];
    }

    const promise = analyzeAgileKeyResultSentiments(keyResults)
      .then((payload) => {
        const nextCache = {
          ...projectSentimentCacheRef.current,
          [projectId]: payload.analyses
        };
        projectSentimentCacheRef.current = nextCache;
        setProjectSentimentCache(nextCache);

        return payload.analyses;
      })
      .finally(() => {
        delete projectSentimentPromisesRef.current[projectId];
      });

    projectSentimentPromisesRef.current[projectId] = promise;

    return promise;
  }, []);

  const ensurePortfolioSummaries = useCallback(async () => {
    const projects = await ensureProjects();

    setPortfolioProjectSummaries((current) => {
      const next = { ...current };

      for (const project of projects) {
        if (!next[project.id]) {
          next[project.id] = {
            analyses: [],
            keyResults: [],
            keyResultCount: 0,
            objectiveCount: 0,
            score: null,
            signalCounts: getSignalCounts([]),
            status: "loading"
          };
        }
      }

      portfolioProjectSummariesRef.current = next;
      return next;
    });

    await runWithConcurrency(projects, 4, async (project) => {
      try {
        const data = await ensureProjectData(project.id);
        const keyResults = data.objectives.flatMap((objective) => getObjectiveKeyResults(objective));
        const cachedAnalyses = projectSentimentCacheRef.current[project.id];
        const initialAnalyses =
          cachedAnalyses && cachedAnalyses.length === keyResults.length ? cachedAnalyses : [];
        const score =
          data.objectives.length > 0
            ? Math.round(
                data.objectives.reduce((total, objective) => total + computeObjectiveScore(objective), 0) /
                  data.objectives.length
              )
            : null;
        const baseSummary: PortfolioProjectSummary = {
          analyses: initialAnalyses,
          keyResults,
          keyResultCount: keyResults.length,
          objectiveCount: data.objectives.length,
          score,
          signalCounts: getSignalCounts(initialAnalyses),
          status: data.objectives.length === 0 && keyResults.length === 0 ? "empty" : "ready"
        };

        setPortfolioProjectSummaries((current) => {
          const next = {
            ...current,
            [project.id]: baseSummary
          };

          portfolioProjectSummariesRef.current = next;
          return next;
        });

        if (initialAnalyses.length === keyResults.length || keyResults.length === 0) {
          return;
        }

        const analyses = await ensureProjectSentiments(project.id, keyResults);
        setPortfolioProjectSummaries((current) => {
          const next = {
            ...current,
            [project.id]: {
              ...(current[project.id] ?? baseSummary),
              analyses,
              signalCounts: getSignalCounts(analyses)
            }
          };

          portfolioProjectSummariesRef.current = next;
          return next;
        });
      } catch (error) {
        setPortfolioProjectSummaries((current) => {
          const next = {
            ...current,
            [project.id]: {
              analyses: [],
              error: error instanceof Error ? error.message : "Could not load project analysis.",
              keyResults: [],
              keyResultCount: 0,
              objectiveCount: 0,
              score: null,
              signalCounts: getSignalCounts([]),
              status: "error" as const
            }
          };

          portfolioProjectSummariesRef.current = next;
          return next;
        });
      }
    });

    return portfolioProjectSummariesRef.current;
  }, [ensureProjectData, ensureProjectSentiments, ensureProjects]);

  const ensureKeyResultHistoryBulk = useCallback(async (keyResultIds: string[]) => {
    const uniqueIds = Array.from(new Set(keyResultIds.filter(Boolean)));
    const missingIds = uniqueIds.filter((keyResultId) => !portfolioKrHistoryByIdRef.current[keyResultId]);

    if (missingIds.length === 0) {
      return portfolioKrHistoryByIdRef.current;
    }

    const signature = missingIds.sort().join("|");
    if (historyPromisesRef.current[signature]) {
      return historyPromisesRef.current[signature];
    }

    setPortfolioKrHistoryById((current) => {
      const next = {
        ...current,
        ...Object.fromEntries(
          missingIds.map((keyResultId) => [
            keyResultId,
            {
              history: [],
              status: "loading" as const
            }
          ])
        )
      };

      portfolioKrHistoryByIdRef.current = next;
      return next;
    });

    const promise = fetchAgileKeyResultHistoryBulk(missingIds)
      .then((payload) => {
        const nextEntries = Object.fromEntries(
          missingIds.map((keyResultId) => [
            keyResultId,
            {
              history: payload.historyByKeyResultId[keyResultId] ?? [],
              status: "ready" as const
            }
          ])
        );
        const nextCache = {
          ...portfolioKrHistoryByIdRef.current,
          ...nextEntries
        };

        portfolioKrHistoryByIdRef.current = nextCache;
        setPortfolioKrHistoryById(nextCache);

        return nextCache;
      })
      .catch((error) => {
        const nextEntries = Object.fromEntries(
          missingIds.map((keyResultId) => [
            keyResultId,
            {
              error: error instanceof Error ? error.message : "Could not load Key Result History.",
              history: [],
              status: "error" as const
            }
          ])
        );
        const nextCache = {
          ...portfolioKrHistoryByIdRef.current,
          ...nextEntries
        };

        portfolioKrHistoryByIdRef.current = nextCache;
        setPortfolioKrHistoryById(nextCache);

        return nextCache;
      })
      .finally(() => {
        delete historyPromisesRef.current[signature];
      });

    historyPromisesRef.current[signature] = promise;

    return promise;
  }, []);

  const ensurePortfolioNarrative = useCallback(
    async (
      signature: string,
      input: {
        generatedFor: string;
        portfolioScore: number | null;
        projects: AgilePortfolioAnalysisProject[];
      }
    ) => {
      const cachedNarrative = portfolioNarrativeCacheRef.current[signature];
      if (cachedNarrative && !cachedNarrative.isLoading) {
        return cachedNarrative;
      }

      if (narrativePromisesRef.current[signature]) {
        return narrativePromisesRef.current[signature];
      }

      setPortfolioNarrativeCache((current) => ({
        ...current,
        [signature]: {
          analysis: current[signature]?.analysis ?? null,
          error: null,
          generatedAt: current[signature]?.generatedAt ?? null,
          isLoading: true
        }
      }));

      const promise = analyzeAgilePortfolio(input)
        .then((payload) => {
          const narrative: PortfolioNarrativeState = {
            analysis: payload.analysis,
            error: payload.message ?? null,
            generatedAt: payload.generatedAt,
            isLoading: false
          };

          portfolioNarrativeCacheRef.current = {
            ...portfolioNarrativeCacheRef.current,
            [signature]: narrative
          };
          setPortfolioNarrativeCache((current) => ({
            ...current,
            [signature]: narrative
          }));

          return narrative;
        })
        .catch((error) => {
          const narrative: PortfolioNarrativeState = {
            analysis: null,
            error: error instanceof Error ? error.message : "No fue posible generar el Portfolio Analysis.",
            generatedAt: null,
            isLoading: false
          };

          portfolioNarrativeCacheRef.current = {
            ...portfolioNarrativeCacheRef.current,
            [signature]: narrative
          };
          setPortfolioNarrativeCache((current) => ({
            ...current,
            [signature]: narrative
          }));

          return narrative;
        })
        .finally(() => {
          delete narrativePromisesRef.current[signature];
        });

      narrativePromisesRef.current[signature] = promise;

      return promise;
    },
    []
  );

  const invalidateProject = useCallback((projectId: string) => {
    const nextProjectDataCache = { ...projectDataCacheRef.current };
    delete nextProjectDataCache[projectId];
    projectDataCacheRef.current = nextProjectDataCache;
    setProjectDataCache(nextProjectDataCache);

    const nextProjectSentimentCache = { ...projectSentimentCacheRef.current };
    delete nextProjectSentimentCache[projectId];
    projectSentimentCacheRef.current = nextProjectSentimentCache;
    setProjectSentimentCache(nextProjectSentimentCache);

    const nextPortfolioProjectSummaries = { ...portfolioProjectSummariesRef.current };
    delete nextPortfolioProjectSummaries[projectId];
    portfolioProjectSummariesRef.current = nextPortfolioProjectSummaries;
    setPortfolioProjectSummaries(nextPortfolioProjectSummaries);

    portfolioNarrativeCacheRef.current = {};
    setPortfolioNarrativeCache({});
  }, []);

  const value = useMemo<OkrsWorkspaceDataContextValue>(
    () => ({
      ensureKeyResultHistoryBulk,
      ensurePortfolioNarrative,
      ensurePortfolioSummaries,
      ensureProjectData,
      ensureProjectSentiments,
      ensureProjects,
      invalidateProject,
      portfolioKrHistoryById,
      portfolioNarrativeCache,
      portfolioProjectSummaries,
      projectDataCache,
      projectSentimentCache,
      projects: projectsState.projects,
      projectsError: projectsState.error,
      projectsStatus: projectsState.status
    }),
    [
      ensureKeyResultHistoryBulk,
      ensurePortfolioNarrative,
      ensurePortfolioSummaries,
      ensureProjectData,
      ensureProjectSentiments,
      ensureProjects,
      invalidateProject,
      portfolioKrHistoryById,
      portfolioNarrativeCache,
      portfolioProjectSummaries,
      projectDataCache,
      projectSentimentCache,
      projectsState.error,
      projectsState.projects,
      projectsState.status
    ]
  );

  return <OkrsWorkspaceDataContext.Provider value={value}>{children}</OkrsWorkspaceDataContext.Provider>;
}

export function useOkrsWorkspaceData() {
  const context = useContext(OkrsWorkspaceDataContext);

  if (!context) {
    throw new Error("useOkrsWorkspaceData must be used inside OkrsWorkspaceDataProvider.");
  }

  return context;
}
