"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import type {
  PortfolioKrHistoryCache,
  PortfolioNarrativeState,
  PortfolioProjectSummary,
  ProjectOkrData
} from "@/components/okrs-workspace-data-context";
import { useOkrsWorkspaceData } from "@/components/okrs-workspace-data-context";
import type {
  AgileKeyProject,
  AgileKeyProjectKeyResultSuggestion,
  AgileKeyResult,
  AgileKeyResultHistoryPoint,
  AgileKeyResultSentimentAnalysis,
  SingularAgileKeyProjectLinkSnapshot,
  AgileObjective,
  AgileObjectiveHealthAnalysis,
  AgileProject,
  CreateAgileKeyProjectInput,
  CreateAgileKeyResultInput,
  CreateAgileObjectiveInput,
  SingularAgileKeyProjectUpdateInput,
  SingularAgileKeyResultHistoryUpdateInput
} from "@/lib/okrs";
import {
  analyzeAgileKeyResultSentiments,
  analyzeAgileObjectiveHealth,
  generateAgileKeyResultDraft,
  generateAgileObjectiveDraft,
  fetchAgileKeyResultHistoryBulk,
  fetchSingularAgileKeyResultHistoryBulk,
  fetchSingularAgileKeyProjects,
  suggestKeyResultsForKeyProject,
  updateSingularAgileKeyProject,
  updateSingularAgileKeyResultHistory
} from "@/lib/okrs";
import { useToast, type AppToastTone } from "@/components/app-toasts";

type MainOkrTab = "okrs" | "key-results" | "portfolio-analysis";
type OkrDetailTab = "overview" | "key-results" | "key-projects" | "stories";
type NewOkrRecordType = "key-project" | "key-result" | "objective";
type PortfolioTab = "summary" | "kr-trends";
type ProjectToastHandler = (
  tone: AppToastTone,
  title: string | null,
  message: string
) => void;
type OptimisticKeyProjectLink = {
  keyResultIds: string[];
  keyResultLabels: string[];
  status: "pending" | "synced";
};
type KeyProjectUpdatedOptions = {
  silent?: boolean;
};

const statusOptions: Array<{ label: string; value: "ALL" | NonNullable<AgileObjective["status"]> }> = [
  { value: "ALL", label: "ALL" },
  { value: "Achieved", label: "Achieved" },
  { value: "In Progress", label: "In Progress" },
  { value: "Pending Review", label: "Pending Review" },
  { value: "Underachieved", label: "Underachieved" }
];
const keyResultStatusOptions = ["Todo", "In progress", "Done"];
const keyProjectStatusOptions: Array<NonNullable<CreateAgileKeyProjectInput["status"]>> = [
  "Active",
  "Suggested by Resource",
  "Archived"
];
const objectiveStatusOptions: Array<NonNullable<AgileObjective["status"]>> = [
  "Pending Review",
  "In Progress",
  "Achieved",
  "Underachieved"
];
const createObjectiveWebhookUrl =
  "https://dev.webhooks.singular-innovation.com/webhook/fbf80a95-1dca-440c-804f-c2ea8dc762ad";
const createKeyResultWebhookUrl =
  "https://dev.webhooks.singular-innovation.com/webhook/f9afbac5-a913-4610-9ada-63d698fd3c3a";
const updateObjectiveWebhookUrl =
  "https://dev.webhooks.singular-innovation.com/webhook/614971eb-60ec-4acd-83cb-24cbf2dc07b9";
const updateKeyResultWebhookUrl =
  "https://dev.webhooks.singular-innovation.com/webhook/2034dfef-2a50-4341-825c-3099aee45847";
const objectiveSyncPollDelays = [5000, 5000, 10000, 15000];
const keyResultFoundationSyncPollDelays = [2000, 5000, 10000, 15000];

type ObjectiveSyncStatus = {
  objectiveTitle: string;
  projectId: string;
  startedAt: number;
  status: "pending" | "synced";
  targetDate: string;
};

function normalizeProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getObjectiveTitle(objective: AgileObjective) {
  return objective.objective || objective.name || objective.id;
}

function getObjectiveDescription(objective: AgileObjective) {
  return objective.description || objective.explanation || objective.metric || "No description set";
}

function getObjectiveQuarter(objective: AgileObjective) {
  return objective.quarter || "No quarter";
}

function displayValue(value: string) {
  return value.trim() || "Not set";
}

function formatDateTimeValue(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatNumberValue(value: number | null) {
  return value === null ? "Not set" : String(value);
}

function formatOneDecimalValue(value: number | null) {
  return value === null ? "Not set" : value.toFixed(1);
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
    sourceRecordId: "",
    status: objective.status ?? "Linked",
    targetDate: objective.targetDate,
    targetValue: null,
    title: `Linked Key Result ${index + 1}`
  }));
}

function getAllObjectiveKeyResults(objectives: AgileObjective[]) {
  return objectives.flatMap((objective) =>
    getObjectiveKeyResults(objective).map((keyResult) => ({
      keyResult,
      objective
    }))
  );
}

function getKeyResultLinkId(keyResult: AgileKeyResult) {
  return keyResult.sourceRecordId || keyResult.id;
}

function getKeyResultDisplayTitle(keyResult: AgileKeyResult) {
  return keyResult.title.trim() || keyResult.displayName?.trim() || keyResult.id;
}

function findKeyResultDetailElement(keyResultId: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-key-result-detail-id]")).find(
    (element) => element.dataset.keyResultDetailId === keyResultId
  ) ?? null;
}

function keyProjectHasKeyResult(keyProject: AgileKeyProject, keyResult: AgileKeyResult) {
  const keyResultIds = keyProject.keyResultIds ?? [];
  const keyResultLabels = (keyProject.keyResultLabels ?? []).map((label) => label.toLowerCase());
  const linkId = getKeyResultLinkId(keyResult);
  const displayTitle = getKeyResultDisplayTitle(keyResult).toLowerCase();

  return (
    keyResultIds.includes(keyResult.id) ||
    keyResultIds.includes(keyResult.sourceRecordId) ||
    keyResultIds.includes(linkId) ||
    keyResultLabels.includes(keyResult.title.toLowerCase()) ||
    keyResultLabels.includes(displayTitle) ||
    keyResultLabels.includes(keyResult.code.toLowerCase())
  );
}

function getKeyProjectRelatedKeyResultLabel(
  keyProject: AgileKeyProject,
  projectKeyResults: Array<{ keyResult: AgileKeyResult; objective: AgileObjective }>
) {
  const matchedKeyResult = projectKeyResults.find(({ keyResult }) => keyProjectHasKeyResult(keyProject, keyResult));

  if (matchedKeyResult) {
    return getKeyResultDisplayTitle(matchedKeyResult.keyResult);
  }

  return keyProject.keyResultLabels?.[0] || "";
}

function computeObjectiveProgress(objective: AgileObjective) {
  const keyResults = getObjectiveKeyResults(objective);

  if (keyResults.length === 0) return 0;

  const keyResultsWithProgress = keyResults.filter((kr) => kr.progress > 0);
  if (keyResultsWithProgress.length > 0) {
    return normalizeProgress(
      keyResultsWithProgress.reduce((total, kr) => total + normalizeProgress(kr.progress), 0) / keyResultsWithProgress.length
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

function getObjectiveStatusClass(status: AgileObjective["status"]) {
  if (status === "Achieved") return "is-achieved";
  if (status === "In Progress") return "is-in-progress";
  if (status === "Pending Review") return "is-pending-review";
  if (status === "Underachieved") return "is-underachieved";
  return "is-not-set";
}

function StatusBadge({ status }: { status: AgileObjective["status"] }) {
  return <span className={`client-okrs-status ${getObjectiveStatusClass(status)}`}>{status ?? "No status"}</span>;
}

function getKeyProjectStatusClass(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "active") return " is-active";
  if (normalizedStatus === "suggested by resource") return " is-suggested";
  if (normalizedStatus === "archived") return " is-archived";
  if (normalizedStatus === "completed") return " is-complete";

  return "";
}

function formatPercentValue(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  const percentValue = getPercentDisplayNumber(value);

  return `${percentValue.toLocaleString("es-PE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}%`;
}

function formatHistoryMetricValue(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  if (Math.abs(value) <= 1) {
    return formatPercentValue(value);
  }

  return value.toLocaleString("es-PE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

function shouldNormalizeMixedHistoryPercentValues(values: number[]) {
  return values.some((value) => Math.abs(value) > 10) && values.some((value) => Math.abs(value) > 0 && Math.abs(value) <= 1);
}

function normalizeHistoryChartValue(value: number, shouldNormalizeMixedPercentValues: boolean) {
  return shouldNormalizeMixedPercentValues && Math.abs(value) <= 1 ? value * 100 : value;
}

function formatHistoryChartValue(value: number, shouldNormalizeMixedPercentValues: boolean) {
  return formatHistoryMetricValue(normalizeHistoryChartValue(value, shouldNormalizeMixedPercentValues));
}

function getHistoryPointNumberLabel(point: AgileKeyResultHistoryPoint) {
  return point.no !== null ? `History #${point.no}` : point.name || point.id;
}

function getHistoryCreatedTime(point: AgileKeyResultHistoryPoint) {
  const parsedTime = parseHistoryDateValue(point.created);

  return parsedTime;
}

function formatHistoryCreatedLabel(point: AgileKeyResultHistoryPoint) {
  const createdTime = getHistoryCreatedTime(point);

  if (createdTime !== null) {
    return formatHistoryDateLabel(point.created);
  }

  return point.created || "";
}

function formatHistoryCreatedTooltipLabel(point: AgileKeyResultHistoryPoint) {
  const createdTime = getHistoryCreatedTime(point);

  if (createdTime !== null) {
    return formatDateTimeValue(point.created);
  }

  return point.created || "Not set";
}

function getHistoryPointTooltip(input: {
  point: AgileKeyResultHistoryPoint;
  serie: { key: "currentValue" | "initialValue" | "targetValue"; label: string };
  shouldNormalizeMixedPercentValues: boolean;
  value: number;
}) {
  const { point, serie, shouldNormalizeMixedPercentValues, value } = input;
  const lines = [
    `${serie.label}: ${formatHistoryChartValue(value, shouldNormalizeMixedPercentValues)}`,
    `Created: ${formatHistoryCreatedTooltipLabel(point)}`,
    point.targetDate ? `Target date: ${formatHistoryDateLabel(point.targetDate)}` : "",
    point.status ? `Status: ${point.status}` : "",
    `Initial ${formatHistoryMetricValue(point.initialValue)} · Current ${formatHistoryMetricValue(point.currentValue)}`,
    `Target ${formatHistoryMetricValue(point.targetValue)}`
  ];

  return lines.filter(Boolean).join("\n");
}

function parseHistoryDateValue(value: string) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
}

function formatHistoryDateLabel(value: string) {
  const parsedTime = parseHistoryDateValue(value);

  if (parsedTime === null) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  }).format(new Date(parsedTime));
}

function getHistoryAxisLabel(point: AgileKeyResultHistoryPoint, index: number) {
  const createdLabel = formatHistoryCreatedLabel(point);

  if (createdLabel) {
    return createdLabel;
  }

  if (point.quarter) {
    return point.quarter;
  }

  return point.no !== null ? `#${point.no}` : `P${index + 1}`;
}

function getHistoryAxisContextLabel(point: AgileKeyResultHistoryPoint) {
  if (point.quarter) {
    return point.quarter;
  }

  return "";
}

function getHistoryListSortValue(point: AgileKeyResultHistoryPoint) {
  const createdTime = Date.parse(point.created);

  if (Number.isFinite(createdTime)) {
    return createdTime;
  }

  const targetTime = parseHistoryDateValue(point.targetDate);

  if (targetTime !== null) {
    return targetTime;
  }

  return point.no ?? 0;
}

function getHistoryListDateLabel(point: AgileKeyResultHistoryPoint) {
  if (point.created) {
    return formatDateTimeValue(point.created);
  }

  if (point.targetDate) {
    return formatHistoryDateLabel(point.targetDate);
  }

  return "No date";
}

function getHistorySignature(history: AgileKeyResultHistoryPoint[]) {
  return history
    .map((point) =>
      [
        point.id,
        point.sourceId,
        point.created,
        point.initialValue ?? "",
        point.currentValue ?? "",
        point.targetValue ?? "",
        point.status
      ].join(":")
    )
    .join("|");
}

function getMetricStatusMeta(metricStatus: AgileKeyResultSentimentAnalysis["metricStatus"]) {
  if (metricStatus === "HOT") {
    return {
      className: "is-hot",
      label: "HOT"
    };
  }

  if (metricStatus === "BLEEDING") {
    return {
      className: "is-bleeding",
      label: "BLEEDING"
    };
  }

  if (metricStatus === "NEW") {
    return {
      className: "is-new",
      label: "NEW"
    };
  }

  return {
    className: "is-cold",
    label: "COLD"
  };
}

function getMetricStatusColor(metricStatus: AgileKeyResultSentimentAnalysis["metricStatus"] | undefined) {
  if (metricStatus === "HOT") return "var(--client-okrs-green)";
  if (metricStatus === "BLEEDING") return "var(--client-okrs-red)";
  if (metricStatus === "COLD") return "var(--client-okrs-amber)";
  return "var(--client-okrs-primary-strong)";
}

function getProjectSentimentFromAnalyses(analyses: AgileKeyResultSentimentAnalysis[]) {
  const hotCount = analyses.filter((analysis) => analysis.metricStatus === "HOT").length;
  const bleedingCount = analyses.filter((analysis) => analysis.metricStatus === "BLEEDING").length;

  if (hotCount >= 2) {
    return {
      className: "is-rose",
      label: "Rose",
      metricSummary: `${hotCount} HOT KRs`
    };
  }

  if (bleedingCount >= 2) {
    return {
      className: "is-thorn",
      label: "Thorn",
      metricSummary: `${bleedingCount} BLEEDING KRs`
    };
  }

  return {
    className: "is-bud",
    label: "Bud",
    metricSummary: analyses.length > 0 ? "Mixed KR signals" : "Pending KR signals"
  };
}

function getSignalCounts(analyses: AgileKeyResultSentimentAnalysis[]) {
  return {
    bleeding: analyses.filter((analysis) => analysis.metricStatus === "BLEEDING").length,
    cold: analyses.filter((analysis) => analysis.metricStatus === "COLD").length,
    hot: analyses.filter((analysis) => analysis.metricStatus === "HOT").length,
    new: analyses.filter((analysis) => analysis.metricStatus === "NEW").length
  };
}

function computePortfolioScore(portfolioSummaries: Record<string, PortfolioProjectSummary>, selectedProjectId?: string) {
  if (selectedProjectId) {
    return portfolioSummaries[selectedProjectId]?.score ?? null;
  }

  const readySummaries = Object.values(portfolioSummaries).filter((summary) => summary.status === "ready");

  return readySummaries.length > 0
    ? Math.round(
        readySummaries.reduce((total, summary) => total + (summary.score ?? 0), 0) / readySummaries.length
      )
    : null;
}

function getProjectSentimentEmoji(summary?: PortfolioProjectSummary) {
  if (!summary || summary.status === "loading") return null;
  if (summary.status !== "ready") return "--";
  if (summary.signalCounts.hot >= 2) return "🌹";
  if (summary.signalCounts.bleeding >= 2) return "🥀";
  return "🌱";
}

function getProjectTrendSummary(summary?: PortfolioProjectSummary) {
  if (!summary || summary.status === "loading") return "Loading KR signals";
  if (summary.status === "empty") return "No KRs loaded yet";
  if (summary.status === "error") return "Could not load KR signals";

  const total = summary.keyResultCount;
  if (total === 0) return "No KRs loaded yet";

  if (summary.signalCounts.hot > 0) {
    return `${summary.signalCounts.hot}/${total} KRs growing strongly`;
  }

  if (summary.signalCounts.bleeding > 0) {
    return `${summary.signalCounts.bleeding}/${total} KRs need intervention`;
  }

  if (summary.signalCounts.cold > 0) {
    return `${summary.signalCounts.cold}/${total} KRs stable, not accelerating`;
  }

  return `${summary.signalCounts.new}/${total} KRs need more history`;
}

function KeyResultSentimentBadge({
  analysis,
  isLoading
}: {
  analysis?: AgileKeyResultSentimentAnalysis;
  isLoading?: boolean;
}) {
  if (isLoading && !analysis) {
    return <span className="client-okrs-sentiment-badge is-loading">Analyzing</span>;
  }

  if (!analysis) {
    return <span className="client-okrs-sentiment-badge is-empty">Not scored</span>;
  }

  const meta = getMetricStatusMeta(analysis.metricStatus);

  return (
    <span
      className={`client-okrs-sentiment-badge ${meta.className}`}
      title={analysis.reason}
    >
      {meta.label}
    </span>
  );
}

function KeyResultAiReadout({
  analysis,
  isLoading
}: {
  analysis?: AgileKeyResultSentimentAnalysis;
  isLoading?: boolean;
}) {
  if (isLoading && !analysis) {
    return (
      <section className="client-okrs-kr-ai-readout is-loading">
        <div>
          <span>AI Readout</span>
          <strong>Analyzing KR signal</strong>
        </div>
        <p>Reading history, progress, and target movement for this Key Result.</p>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="client-okrs-kr-ai-readout is-empty">
        <div>
          <span>AI Readout</span>
          <strong>Not scored yet</strong>
        </div>
        <p>This Key Result needs an available trend signal before the AI readout can be shown.</p>
      </section>
    );
  }

  const meta = getMetricStatusMeta(analysis.metricStatus);
  const readoutTitle =
    analysis.metricStatus === "HOT"
      ? "AI Praise"
      : analysis.metricStatus === "NEW"
        ? "Needs more signal"
        : "Devil's Advocate";
  const readoutTone =
    analysis.metricStatus === "HOT"
      ? "Protect what is working."
      : analysis.metricStatus === "NEW"
        ? "Build enough history to judge movement."
        : "Create urgency around the next move.";

  return (
    <section className={`client-okrs-kr-ai-readout ${meta.className}`}>
      <div>
        <span>{readoutTitle}</span>
        <strong>{readoutTone}</strong>
        <small>{meta.label} | {analysis.sentiment} | {analysis.confidence} confidence</small>
      </div>
      <p>{analysis.reason}</p>
      <small>{analysis.recommendedAction}</small>
    </section>
  );
}

function ProjectSentimentPanel({
  analyses,
  error,
  isAnalyzing,
  isLoadingObjectives,
  keyResultCount,
  visibleObjectiveCount
}: {
  analyses: AgileKeyResultSentimentAnalysis[];
  error: string | null;
  isAnalyzing: boolean;
  isLoadingObjectives: boolean;
  keyResultCount: number;
  visibleObjectiveCount: number;
}) {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  if (isLoadingObjectives || isAnalyzing) {
    return (
      <div className="client-okrs-project-sentiment is-thinking" title="GPT is analyzing Key Result metric signals">
        <div className="client-okrs-project-sentiment-head">
          <span>Project Sentiment</span>
          <strong>GPT thinking</strong>
        </div>
        <ol>
          <li className="is-done">Collecting KRs</li>
          <li className={isLoadingObjectives ? "is-active" : "is-done"}>Reading history</li>
          <li className={isAnalyzing ? "is-active" : undefined}>Scoring signals</li>
        </ol>
      </div>
    );
  }

  if (visibleObjectiveCount === 0) {
    return (
      <div className="client-okrs-project-sentiment is-empty" title="There are no OKRs in the current view">
        <span>Project Sentiment</span>
        <strong>No OKR data</strong>
        <small>Clear filters to calculate sentiment</small>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-okrs-project-sentiment is-error" title={error}>
        <span>Project Sentiment</span>
        <strong>Unavailable</strong>
        <small>Could not score KR signals</small>
      </div>
    );
  }

  if (keyResultCount === 0) {
    return (
      <div className="client-okrs-project-sentiment is-empty" title="This project does not have Key Results to analyze yet">
        <span>Project Sentiment</span>
        <strong>No KR data</strong>
        <small>Add KRs to calculate sentiment</small>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="client-okrs-project-sentiment is-empty" title="Waiting for metric analysis">
        <span>Project Sentiment</span>
        <strong>Pending</strong>
        <small>Waiting for KR signals</small>
      </div>
    );
  }

  const projectSentiment = getProjectSentimentFromAnalyses(analyses);
  const hotCount = analyses.filter((analysis) => analysis.metricStatus === "HOT").length;
  const bleedingCount = analyses.filter((analysis) => analysis.metricStatus === "BLEEDING").length;
  const coldCount = analyses.filter((analysis) => analysis.metricStatus === "COLD").length;
  const newCount = analyses.filter((analysis) => analysis.metricStatus === "NEW").length;

  return (
    <>
      <button
        aria-label="Open Project Sentiment explanation"
        className={`client-okrs-project-sentiment ${projectSentiment.className}`}
        onClick={() => setIsExplanationOpen(true)}
        title="Project sentiment calculated from KR metric statuses"
        type="button"
      >
        <span>Project Sentiment</span>
        <strong>{projectSentiment.label}</strong>
        <small>{projectSentiment.metricSummary}</small>
      </button>
      {isExplanationOpen ? (
        <div aria-modal="true" className="client-okrs-sentiment-info-layer" role="dialog">
          <section className="client-okrs-sentiment-info-card">
            <header>
              <div>
                <span className="client-okrs-section-label">Project Sentiment</span>
                <h2>How this score is calculated</h2>
              </div>
              <button aria-label="Close Project Sentiment explanation" onClick={() => setIsExplanationOpen(false)} type="button">
                ×
              </button>
            </header>

            <div className="client-okrs-sentiment-info-current">
              <span>Current project result</span>
              <strong>{projectSentiment.label}</strong>
              <p>{projectSentiment.metricSummary}</p>
            </div>

            <div className="client-okrs-sentiment-info-counts">
              <div>
                <span>HOT</span>
                <strong>{hotCount}</strong>
                <small>Moving toward target</small>
              </div>
              <div>
                <span>BLEEDING</span>
                <strong>{bleedingCount}</strong>
                <small>Moving away from target</small>
              </div>
              <div>
                <span>COLD</span>
                <strong>{coldCount}</strong>
                <small>Stable, not accelerating</small>
              </div>
              <div>
                <span>NEW</span>
                <strong>{newCount}</strong>
                <small>Not enough history</small>
              </div>
            </div>

            <div className="client-okrs-sentiment-info-section">
              <h3>1. First, every Key Result gets a metric status</h3>
              <p>
                The backend reads Key Result History when it exists. If there are at least two changed history points, it compares recent movement against the target.
              </p>
              <ul>
                <li><strong>HOT</strong> means movement toward target is greater than 5% of the initial-to-target range.</li>
                <li><strong>BLEEDING</strong> means movement away from target is greater than 5% of that range.</li>
                <li><strong>COLD</strong> means movement is inside the 5% threshold.</li>
                <li><strong>NEW</strong> means there is not enough changed history to read a trend.</li>
              </ul>
            </div>

            <div className="client-okrs-sentiment-info-section">
              <h3>2. Then, the project rolls up all KR signals</h3>
              <ul>
                <li><strong>Rose</strong> when the project has 2 or more HOT KRs.</li>
                <li><strong>Thorn</strong> when the project has 2 or more BLEEDING KRs.</li>
                <li><strong>Bud</strong> when signals are mixed, cold, new, or still pending.</li>
              </ul>
              <p>
                If a project has both 2 HOT and 2 BLEEDING KRs, Rose wins today because HOT is evaluated first in the current rule.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function normalizePercentDecimalValue(value: number) {
  // Airtable can still return old whole-percent values like 70 for 70%.
  return Math.abs(value) > 10 ? value / 100 : value;
}

function normalizeNullablePercentDecimalValue(value: number | null) {
  return value === null ? null : normalizePercentDecimalValue(value);
}

function getPercentDisplayNumber(value: number) {
  return normalizePercentDecimalValue(value) * 100;
}

function formatEditablePercentInputValue(value: number | null) {
  if (value === null) return "";
  const percentValue = getPercentDisplayNumber(value);
  return Number.isInteger(percentValue) ? String(percentValue) : String(Number(percentValue.toFixed(2)));
}

function parsePercentInputValue(value: string) {
  const normalizedValue = value
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const parsedValue = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(parsedValue)) return null;
  return parsedValue / 100;
}

function formatProgressValue(value: number) {
  return `${normalizeProgress(value)}%`;
}

function formatDraftNumberInput(value: number | null) {
  if (value === null) return "";
  return String(value <= 1 ? value * 100 : value);
}

function formatKeyResultDraftLines(keyResults: Array<{
  currentValue: number | null;
  explanation: string;
  initialValue: number | null;
  keyResult: string;
  metric: string;
  targetDate: string;
  targetValue: number | null;
}>) {
  return keyResults
    .map((keyResult, index) =>
      [
        `KR ${index + 1}: ${keyResult.keyResult}`,
        `Metric: ${keyResult.metric}`,
        `Initial: ${formatHistoryMetricValue(keyResult.initialValue)} | Current: ${formatHistoryMetricValue(keyResult.currentValue)} | Target: ${formatHistoryMetricValue(keyResult.targetValue)}`,
        `Target Date: ${keyResult.targetDate || "Not set"}`,
        `Explanation: ${keyResult.explanation}`
      ].join("\n")
    )
    .join("\n\n");
}

function getQuarterFromDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

function getDaysRemaining(value: string) {
  if (!value) return null;
  const targetDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(targetDate.getTime())) return null;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.ceil((targetDate.getTime() - todayStart.getTime()) / 86400000);
}

function formatTimelineDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

async function readWebhookResponse(response: Response) {
  const responseText = await response.text();
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as { message?: string; ok?: boolean };
  } catch {
    return { message: responseText };
  }
}

function findSyncedObjective(
  objectives: AgileObjective[],
  input: Pick<CreateAgileObjectiveInput, "objective" | "targetDate">
) {
  const expectedTitle = input.objective.trim().toLowerCase();
  const expectedTargetDate = input.targetDate?.trim() ?? "";

  return objectives.find((objective) => {
    const title = getObjectiveTitle(objective).trim().toLowerCase();
    const targetDate = objective.targetDate.trim();

    return title === expectedTitle && (!expectedTargetDate || targetDate === expectedTargetDate);
  }) ?? null;
}

function getObjectiveNumber(objective: AgileObjective) {
  if (objective.no !== null) {
    return objective.no;
  }

  const match = objective.name.match(/^#(\d+)/);
  return match ? Number(match[1]) : null;
}

function buildObjectiveUpdatePayload({
  objective,
  project
}: {
  objective: AgileObjective;
  project: AgileProject | null;
}) {
  const sourceObjectiveId = objective.recordId.trim();
  const sourceProjectId = project?.sourceRecordId?.trim() || objective.projectIds[0] || "";
  const targetDate = objective.targetDate.trim();

  return {
    action: "updateObjective",
    executionMode: "production",
    foundationProjectId: objective.projectIds[0] ?? "",
    project: {
      foundationRecordId: objective.projectIds[0] ?? "",
      name: project?.name ?? "",
      sourceRecordId: sourceProjectId
    },
    projectId: sourceProjectId,
    objective: {
      aiSuggestedKeyResults: objective.aiSuggestedKeyResults.trim(),
      description: objective.description.trim(),
      explanation: objective.explanation.trim(),
      foundationRecordId: objective.id,
      goal: getObjectiveTitle(objective).trim(),
      id: sourceObjectiveId,
      metric: objective.metric.trim(),
      number: getObjectiveNumber(objective),
      priority: objective.priority.trim(),
      quarter: objective.quarter.trim(),
      sourceRecordId: sourceObjectiveId,
      status: objective.status ?? "Pending Review",
      targetDate,
      type: objective.type.trim()
    },
    webhookUrl: updateObjectiveWebhookUrl
  };
}

function formatKeyResultWebhookValue(value: string) {
  return value.replace("%", "").trim();
}

function buildKeyResultCreatePayload({
  form,
  objective,
  project,
  projectId,
  projectName
}: {
  form: Omit<CreateAgileKeyResultInput, "currentValue" | "initialValue" | "targetValue"> & {
    currentValue: string;
    initialValue: string;
    targetValue: string;
  };
  objective: AgileObjective;
  project: AgileProject | null;
  projectId: string;
  projectName: string;
}) {
  const sourceProjectId = project?.sourceRecordId?.trim() ?? "";
  const sourceObjectiveId = objective.recordId.trim();
  const createdBy = project?.collaborator.email?.trim() || "jorgec@singularagency.co";
  const keyResult = {
    "Created By": createdBy,
    "Current Value": formatKeyResultWebhookValue(form.currentValue),
    "Explanation": form.explanation?.trim() ?? "",
    "Initial Value": formatKeyResultWebhookValue(form.initialValue),
    "Key Result": form.keyResult.trim(),
    "Metric": form.metric?.trim() ?? "",
    "Objetive": sourceObjectiveId,
    "Project": sourceProjectId,
    "Status": form.status,
    "Target Date": form.targetDate?.trim() ?? "",
    "Target Value": formatKeyResultWebhookValue(form.targetValue)
  };

  return {
    action: "createKeyResults",
    executionMode: "production",
    foundationProjectId: projectId,
    keyResults: [keyResult],
    objective: {
      foundationRecordId: objective.id,
      name: getObjectiveTitle(objective),
      sourceRecordId: sourceObjectiveId
    },
    objectiveId: sourceObjectiveId,
    project: {
      foundationRecordId: projectId,
      name: project?.name ?? projectName,
      sourceRecordId: sourceProjectId
    },
    projectId: sourceProjectId,
    webhookUrl: createKeyResultWebhookUrl
  };
}

function formatKeyResultNumberValue(value: number | null) {
  return value === null ? "" : String(normalizePercentDecimalValue(value));
}

function buildKeyResultUpdatePayload({
  keyResult,
  objective,
  originalKeyResult,
  project
}: {
  keyResult: AgileKeyResult;
  objective: AgileObjective;
  originalKeyResult?: AgileKeyResult | null;
  project: AgileProject | null;
}) {
  const sourceProjectId = project?.sourceRecordId?.trim() ?? "";
  const sourceObjectiveId = objective.recordId.trim();
  const sourceKeyResultId = keyResult.sourceRecordId.trim();
  const currentTitle = keyResult.title.trim();
  const originalTitle = originalKeyResult?.title.trim() ?? currentTitle;
  const shouldUpdateTitle = currentTitle.length > 0 && currentTitle !== originalTitle;
  const keyResultFields = {
    "Current Value": formatKeyResultNumberValue(keyResult.currentValue),
    "Explanation": keyResult.explanation.trim(),
    "Initial Value": formatKeyResultNumberValue(keyResult.initialValue),
    "Metric": keyResult.metric.trim(),
    "Objetive": sourceObjectiveId,
    "Project": sourceProjectId,
    "Status": keyResult.status.trim(),
    "Target Date": keyResult.targetDate.trim(),
    "Target Value": formatKeyResultNumberValue(keyResult.targetValue),
    foundationRecordId: keyResult.id,
    id: sourceKeyResultId,
    sourceRecordId: sourceKeyResultId
  };

  return {
    action: "updateKeyResult",
    executionMode: "production",
    keyResult: shouldUpdateTitle ? { ...keyResultFields, "Key Result": currentTitle } : keyResultFields,
    keyResultId: sourceKeyResultId,
    objective: {
      foundationRecordId: objective.id,
      name: getObjectiveTitle(objective),
      sourceRecordId: sourceObjectiveId
    },
    objectiveId: sourceObjectiveId,
    project: {
      foundationRecordId: objective.projectIds[0] ?? "",
      name: project?.name ?? "",
      sourceRecordId: sourceProjectId
    },
    projectId: sourceProjectId,
    webhookUrl: updateKeyResultWebhookUrl
  };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function parseProgressInputValue(value: string) {
  const normalizedValue = value
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsedValue = Number.parseFloat(normalizedValue);

  return normalizeProgress(Number.isFinite(parsedValue) ? parsedValue : 0);
}

function calculateKeyResultProgress(
  initialValue: number | null,
  currentValue: number | null,
  targetValue: number | null
) {
  if (initialValue === null || currentValue === null || targetValue === null) {
    return null;
  }

  if (targetValue === initialValue) {
    return null;
  }

  return normalizeProgress(((currentValue - initialValue) / (targetValue - initialValue)) * 100);
}

function EditableMetaItem({
  className,
  isEditing,
  label,
  onChange,
  title,
  type = "text",
  value
}: {
  className?: string;
  isEditing: boolean;
  label: string;
  onChange: (value: string) => void;
  title?: string;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <label className={`client-okrs-meta-item${className ? ` ${className}` : ""}${isEditing ? " is-editing" : ""}`}>
      <span>{label}</span>
      {isEditing ? (
        <input onChange={(event) => onChange(event.target.value)} title={title} type={type} value={value} />
      ) : (
        <strong title={title}>{value || "Not set"}</strong>
      )}
    </label>
  );
}

function EditableMetricItem({
  isEditing,
  isOpen,
  onChange,
  onClose,
  onOpen,
  value
}: {
  isEditing: boolean;
  isOpen: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onOpen: () => void;
  value: string;
}) {
  return (
    <div
      className={`client-okrs-meta-item client-okrs-metric-editor${isEditing ? " is-editing" : ""}${isOpen ? " is-open" : ""}`}
      data-tooltip={value || "Not set"}
    >
      <span>Metric</span>
      {isEditing ? (
        <>
          <button className="client-okrs-metric-preview" onClick={onOpen} title={value} type="button">
            {value || "Not set"}
          </button>
          {isOpen ? (
            <div className="client-okrs-metric-popover" role="dialog" aria-label="Edit Metric">
              <textarea
                autoFocus
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onClose();
                  }
                }}
                rows={4}
                value={value}
              />
              <button onClick={onClose} type="button">
                Done
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <strong title={value}>{value || "Not set"}</strong>
      )}
    </div>
  );
}

function EditablePercentItem({
  isEditing,
  label,
  onChange,
  value
}: {
  isEditing: boolean;
  label: string;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  const [inputValue, setInputValue] = useState(formatEditablePercentInputValue(value));
  const displayValue = formatPercentValue(value);

  useEffect(() => {
    if (isEditing) {
      setInputValue(formatEditablePercentInputValue(value));
    }
  }, [isEditing]);

  return (
    <label className={`client-okrs-meta-item${isEditing ? " is-editing" : ""}`}>
      <span>{label}</span>
      {isEditing ? (
        <input
          inputMode="decimal"
          onBlur={() => setInputValue(formatEditablePercentInputValue(value))}
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputValue(nextValue);
            onChange(parsePercentInputValue(nextValue));
          }}
          onFocus={(event) => event.currentTarget.select()}
          placeholder="0"
          value={inputValue}
        />
      ) : (
        <strong>{displayValue}</strong>
      )}
    </label>
  );
}

function parseNullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatHistoryEditInputValue(value: number | null) {
  return value === null || value === undefined ? "" : String(value);
}

type KeyResultHistoryEditableValues = Pick<
  SingularAgileKeyResultHistoryUpdateInput,
  "currentValue" | "initialValue" | "targetValue"
>;

function areNullableHistoryNumbersEqual(left: number | null, right: number | null | undefined) {
  if (right === undefined) {
    return true;
  }

  if (left === null || right === null) {
    return left === right;
  }

  return Math.abs(left - right) < 0.005;
}

type KeyResultSyncStatus = {
  keyResultId: string;
  message: string;
  status: "synced" | "syncing" | "timeout";
};

type KeyResultHistoryUiResponse = {
  history: AgileKeyResultHistoryPoint[];
  sentimentAnalysis?: AgileKeyResultSentimentAnalysis;
  type: "key_result_history";
};

function KeyResultHistoryChart({
  points,
  variant = "full"
}: {
  points: AgileKeyResultHistoryPoint[];
  variant?: "compact" | "full";
}) {
  const [activeTooltip, setActiveTooltip] = useState<{
    lines: string[];
    x: number;
    y: number;
  } | null>(null);
  const series = [
    { key: "initialValue", label: "Initial", color: "#8fb1ff" },
    { key: "currentValue", label: "Current", color: "#2dd4a7" },
    { key: "targetValue", label: "Target", color: "#f4b942" }
  ] as const;
  const values = points.flatMap((point) =>
    series
      .map((serie) => point[serie.key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  );

  if (points.length === 0 || values.length === 0) {
    return (
      <div className="client-okrs-history-chart-empty">
        <strong>No chart data</strong>
        <p>This Key Result does not have Initial, Current, or Target values in history yet.</p>
      </div>
    );
  }

  const shouldNormalizeMixedPercentValues = shouldNormalizeMixedHistoryPercentValues(values);
  const chartValues = values.map((value) => normalizeHistoryChartValue(value, shouldNormalizeMixedPercentValues));
  const minValue = Math.min(...chartValues);
  const maxValue = Math.max(...chartValues);
  const padding = maxValue === minValue ? Math.max(Math.abs(maxValue) * 0.15, 0.1) : (maxValue - minValue) * 0.12;
  const yMin = minValue - padding;
  const yMax = maxValue + padding;
  const width = 640;
  const isCompact = variant === "compact";
  const height = isCompact ? 230 : 300;
  const chartLeft = 52;
  const chartRight = 28;
  const chartTop = isCompact ? 20 : 24;
  const chartBottom = isCompact ? 58 : 64;
  const plotWidth = width - chartLeft - chartRight;
  const plotHeight = height - chartTop - chartBottom;
  const timelineValues = points.map(getHistoryCreatedTime);
  const validTimelineValues = timelineValues.filter((value): value is number => value !== null);
  const uniqueTimelineValues = Array.from(new Set(validTimelineValues));
  const shouldUseTimelineScale =
    uniqueTimelineValues.length > 1 &&
    uniqueTimelineValues.length === points.length &&
    validTimelineValues.length === points.length;
  const timelineMin = shouldUseTimelineScale ? Math.min(...validTimelineValues) : 0;
  const timelineMax = shouldUseTimelineScale ? Math.max(...validTimelineValues) : 0;
  const xForPoint = (point: AgileKeyResultHistoryPoint, index: number) => {
    if (shouldUseTimelineScale) {
      const parsedTime = getHistoryCreatedTime(point) ?? timelineMin;

      return chartLeft + ((parsedTime - timelineMin) / (timelineMax - timelineMin)) * plotWidth;
    }

    return chartLeft + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  };
  const yForValue = (value: number) => chartTop + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <div className={`client-okrs-history-chart${isCompact ? " is-compact" : ""}`}>
      <div className="client-okrs-history-legend">
        {series.map((serie) => (
          <span key={serie.key}>
            <i style={{ background: serie.color }} />
            {serie.label}
          </span>
        ))}
        <small>{shouldUseTimelineScale ? "Timeline by record creation" : "Timeline by history sequence"}</small>
      </div>
      <svg aria-label="Key Result history chart" role="img" viewBox={`0 0 ${width} ${height}`}>
        <title>Key Result history by Initial, Current, and Target values</title>
        <line className="client-okrs-history-axis" x1={chartLeft} x2={chartLeft} y1={chartTop} y2={chartTop + plotHeight} />
        <line className="client-okrs-history-axis" x1={chartLeft} x2={chartLeft + plotWidth} y1={chartTop + plotHeight} y2={chartTop + plotHeight} />
        {yTicks.map((tick) => {
          const y = yForValue(tick);

          return (
            <g key={tick}>
              <line className="client-okrs-history-grid-line" x1={chartLeft} x2={chartLeft + plotWidth} y1={y} y2={y} />
              <text className="client-okrs-history-y-label" x={chartLeft - 10} y={y + 4}>
                {formatHistoryMetricValue(tick)}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const shouldShowLabel = points.length <= 6 || index === 0 || index === points.length - 1;
          const contextLabel = getHistoryAxisContextLabel(point);

          return shouldShowLabel ? (
            <text className="client-okrs-history-x-label" key={point.id} x={xForPoint(point, index)} y={height - 28}>
              <tspan x={xForPoint(point, index)}>{getHistoryAxisLabel(point, index)}</tspan>
              {contextLabel ? (
                <tspan className="client-okrs-history-x-context-label" dy="15" x={xForPoint(point, index)}>
                  {contextLabel}
                </tspan>
              ) : null}
            </text>
          ) : null;
        })}
        {series.map((serie) => {
          const coordinates = points
            .map((point, index) => {
              const rawValue = point[serie.key];
              const value =
                typeof rawValue === "number" && Number.isFinite(rawValue)
                  ? normalizeHistoryChartValue(rawValue, shouldNormalizeMixedPercentValues)
                  : rawValue;
              return typeof rawValue === "number" && Number.isFinite(rawValue) && typeof value === "number" && Number.isFinite(value)
                ? {
                    point,
                    rawValue,
                    tooltip: getHistoryPointTooltip({
                      point,
                      serie,
                      shouldNormalizeMixedPercentValues,
                      value: rawValue
                    }),
                    x: xForPoint(point, index),
                    y: yForValue(value),
                    value
                  }
                : null;
            })
            .filter(
              (
                point
              ): point is {
                point: AgileKeyResultHistoryPoint;
                rawValue: number;
                tooltip: string;
                x: number;
                y: number;
                value: number;
              } => Boolean(point)
            );
          const pathData = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

          return (
            <g key={serie.key}>
              {pathData ? (
                <path className="client-okrs-history-line" d={pathData} style={{ stroke: serie.color }} />
              ) : null}
              {coordinates.map((point) => (
                <circle
                  aria-label={point.tooltip}
                  className="client-okrs-history-point"
                  cx={point.x}
                  cy={point.y}
                  key={`${serie.key}-${point.point.id}-${point.x}-${point.y}`}
                  onBlur={() => setActiveTooltip(null)}
                  onFocus={() =>
                    setActiveTooltip({
                      lines: point.tooltip.split("\n"),
                      x: point.x,
                      y: point.y
                    })
                  }
                  onMouseEnter={() =>
                    setActiveTooltip({
                      lines: point.tooltip.split("\n"),
                      x: point.x,
                      y: point.y
                    })
                  }
                  onMouseLeave={() => setActiveTooltip(null)}
                  r={isCompact ? "4.5" : "4"}
                  style={{ fill: serie.color }}
                  tabIndex={0}
                />
              ))}
            </g>
          );
        })}
        {activeTooltip ? (
          <foreignObject
            className="client-okrs-history-tooltip-foreign"
            height="112"
            width="236"
            x={Math.min(Math.max(activeTooltip.x + 10, chartLeft), width - 246)}
            y={Math.max(activeTooltip.y - 88, chartTop)}
          >
            <div className="client-okrs-history-tooltip">
              {activeTooltip.lines.map((line, index) => (
                <span className={index === 0 ? "is-primary" : undefined} key={`${line}-${index}`}>
                  {line}
                </span>
              ))}
            </div>
          </foreignObject>
        ) : null}
      </svg>
    </div>
  );
}

function KeyResultHistoryUiResponseView({
  compact = false,
  onUpdateHistoryPoint,
  showFilters = false,
  showList = false,
  showSentiment = false,
  showSummary = false,
  uiResponse
}: {
  compact?: boolean;
  onUpdateHistoryPoint?: (recordId: string, values: KeyResultHistoryEditableValues) => Promise<void>;
  showFilters?: boolean;
  showList?: boolean;
  showSentiment?: boolean;
  showSummary?: boolean;
  uiResponse: KeyResultHistoryUiResponse;
}) {
  const [quarterFilter, setQuarterFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [historyEditValues, setHistoryEditValues] = useState({
    currentValue: "",
    initialValue: "",
    targetValue: ""
  });
  const [historyEditError, setHistoryEditError] = useState<string | null>(null);
  const [savingHistoryId, setSavingHistoryId] = useState<string | null>(null);
  const history = uiResponse.history;
  const sentimentAnalysis = uiResponse.sentimentAnalysis;
  const quarterOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(history.map((point) => point.quarter).filter(Boolean)))],
    [history]
  );
  const statusOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(history.map((point) => point.status).filter(Boolean)))],
    [history]
  );
  const filteredHistory = useMemo(
    () =>
      history.filter((point) => {
        if (quarterFilter !== "ALL" && point.quarter !== quarterFilter) {
          return false;
        }

        if (statusFilter !== "ALL" && point.status !== statusFilter) {
          return false;
        }

        return true;
      }),
    [history, quarterFilter, statusFilter]
  );
  const visibleHistoryList = useMemo(
    () =>
      [...filteredHistory].sort((left, right) => {
        const sortDiff = getHistoryListSortValue(right) - getHistoryListSortValue(left);

        if (sortDiff !== 0) {
          return sortDiff;
        }

        return (right.no ?? 0) - (left.no ?? 0);
      }),
    [filteredHistory]
  );
  const latestPoint = filteredHistory.at(-1) ?? history.at(-1) ?? null;

  function startHistoryEdit(point: AgileKeyResultHistoryPoint) {
    setEditingHistoryId(point.id);
    setHistoryEditError(null);
    setHistoryEditValues({
      currentValue: formatHistoryEditInputValue(point.currentValue),
      initialValue: formatHistoryEditInputValue(point.initialValue),
      targetValue: formatHistoryEditInputValue(point.targetValue)
    });
  }

  async function submitHistoryEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingHistoryId || !onUpdateHistoryPoint) {
      return;
    }

    const editingPoint = history.find((point) => point.id === editingHistoryId);

    if (!editingPoint) {
      setHistoryEditError("No se encontró el record de histórico que estás editando.");
      return;
    }

    const parsedValues = {
      currentValue: parseNullableNumber(historyEditValues.currentValue),
      initialValue: parseNullableNumber(historyEditValues.initialValue),
      targetValue: parseNullableNumber(historyEditValues.targetValue)
    };
    const values: KeyResultHistoryEditableValues = {};

    if (!areNullableHistoryNumbersEqual(editingPoint.initialValue, parsedValues.initialValue)) {
      values.initialValue = parsedValues.initialValue;
    }

    if (!areNullableHistoryNumbersEqual(editingPoint.currentValue, parsedValues.currentValue)) {
      values.currentValue = parsedValues.currentValue;
    }

    if (!areNullableHistoryNumbersEqual(editingPoint.targetValue, parsedValues.targetValue)) {
      values.targetValue = parsedValues.targetValue;
    }

    if (Object.keys(values).length === 0) {
      setEditingHistoryId(null);
      setHistoryEditError(null);
      return;
    }

    setSavingHistoryId(editingHistoryId);
    setHistoryEditError(null);

    try {
      await onUpdateHistoryPoint(editingPoint.id, values);
      setEditingHistoryId(null);
    } catch (error) {
      setHistoryEditError(error instanceof Error ? error.message : "No fue posible actualizar el histórico.");
    } finally {
      setSavingHistoryId(null);
    }
  }

  if (history.length === 0) {
    return (
      <article className="client-okrs-history-state">
        <strong>No history yet</strong>
        <p>This Key Result does not have historical snapshots.</p>
      </article>
    );
  }

  return (
    <div className={`client-okrs-history-ui-response${compact ? " is-compact" : ""}`}>
      {showSentiment && sentimentAnalysis ? (
        <section className={`client-okrs-history-sentiment ${getMetricStatusMeta(sentimentAnalysis.metricStatus).className}`}>
          <div>
            <span>Metric Status</span>
            <strong>{sentimentAnalysis.metricStatus}</strong>
          </div>
          <p>{sentimentAnalysis.reason}</p>
          <small>{sentimentAnalysis.recommendedAction}</small>
        </section>
      ) : null}

      {showFilters ? (
        <div className="client-okrs-history-filters">
          <label>
            <span>Quarter</span>
            <select onChange={(event) => setQuarterFilter(event.target.value)} value={quarterFilter}>
              {quarterOptions.map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter === "ALL" ? "All" : quarter}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All" : status}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {showSummary ? (
        <div className="client-okrs-history-summary">
          <div>
            <span>Initial</span>
            <strong>{formatHistoryMetricValue(latestPoint?.initialValue ?? null)}</strong>
          </div>
          <div>
            <span>Current</span>
            <strong>{formatHistoryMetricValue(latestPoint?.currentValue ?? null)}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{formatHistoryMetricValue(latestPoint?.targetValue ?? null)}</strong>
          </div>
        </div>
      ) : null}

      <KeyResultHistoryChart points={filteredHistory} variant={compact ? "compact" : "full"} />

      {showList ? (
        <div className="client-okrs-history-list">
          {visibleHistoryList.map((point, index) => (
            <article className={editingHistoryId === point.id ? "is-editing" : ""} key={point.id}>
              <div className="client-okrs-history-list-head">
                <div>
                  <strong>{getHistoryAxisLabel(point, index)}</strong>
                  <span>{[getHistoryAxisContextLabel(point), point.status || "No status"].filter(Boolean).join(" · ")}</span>
                </div>
                {onUpdateHistoryPoint ? (
                  <button
                    className="client-okrs-history-edit-button"
                    disabled={savingHistoryId !== null}
                    onClick={() => startHistoryEdit(point)}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {editingHistoryId === point.id ? (
                <form className="client-okrs-history-edit-form" onSubmit={submitHistoryEdit}>
                  <label>
                    <span>Initial</span>
                    <input
                      inputMode="decimal"
                      onChange={(event) =>
                        setHistoryEditValues((current) => ({ ...current, initialValue: event.target.value }))
                      }
                      value={historyEditValues.initialValue}
                    />
                  </label>
                  <label>
                    <span>Current</span>
                    <input
                      inputMode="decimal"
                      onChange={(event) =>
                        setHistoryEditValues((current) => ({ ...current, currentValue: event.target.value }))
                      }
                      value={historyEditValues.currentValue}
                    />
                  </label>
                  <label>
                    <span>Target</span>
                    <input
                      inputMode="decimal"
                      onChange={(event) =>
                        setHistoryEditValues((current) => ({ ...current, targetValue: event.target.value }))
                      }
                      value={historyEditValues.targetValue}
                    />
                  </label>
                  {historyEditError ? <p className="client-okrs-history-edit-error">{historyEditError}</p> : null}
                  <div className="client-okrs-history-edit-actions">
                    <button
                      className="client-okrs-app-confirm-secondary"
                      disabled={savingHistoryId === point.id}
                      onClick={() => {
                        setEditingHistoryId(null);
                        setHistoryEditError(null);
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button className="client-okrs-app-confirm-primary" disabled={savingHistoryId === point.id} type="submit">
                      {savingHistoryId === point.id ? "Saving" : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p>
                    Fecha {getHistoryListDateLabel(point)} · Initial {formatHistoryMetricValue(point.initialValue)} · Current {formatHistoryMetricValue(point.currentValue)} · Target {formatHistoryMetricValue(point.targetValue)}
                  </p>
                </>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KeyResultHistoryPanel({
  initialHistory,
  keyResult,
  objective,
  onClose,
  onHistoryChanged,
  onLatestValuesChanged,
  onToast,
  sentimentAnalysis
}: {
  initialHistory?: AgileKeyResultHistoryPoint[];
  keyResult: AgileKeyResult;
  objective: AgileObjective;
  onClose: () => void;
  onHistoryChanged?: (history: AgileKeyResultHistoryPoint[]) => void;
  onLatestValuesChanged?: (values: KeyResultHistoryEditableValues) => void;
  onToast?: ProjectToastHandler;
  sentimentAnalysis?: AgileKeyResultSentimentAnalysis;
}) {
  const { ensureKeyResultHistoryBulk } = useOkrsWorkspaceData();
  const [history, setHistory] = useState<AgileKeyResultHistoryPoint[]>(initialHistory ?? []);
  const [isLoading, setIsLoading] = useState(!initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const historySignatureRef = useRef(getHistorySignature(initialHistory ?? []));
  const loadedSingularSourceIdRef = useRef<string | null>(null);
  const onHistoryChangedRef = useRef(onHistoryChanged);

  useEffect(() => {
    onHistoryChangedRef.current = onHistoryChanged;
  }, [onHistoryChanged]);

  function applyHistory(nextHistory: AgileKeyResultHistoryPoint[], options?: { notifyParent?: boolean }) {
    const nextSignature = getHistorySignature(nextHistory);

    if (historySignatureRef.current === nextSignature) {
      return false;
    }

    historySignatureRef.current = nextSignature;
    setHistory(nextHistory);

    if (options?.notifyParent) {
      onHistoryChangedRef.current?.(nextHistory);
    }

    return true;
  }

  useEffect(() => {
    loadedSingularSourceIdRef.current = null;
    const nextHistory = initialHistory ?? [];

    historySignatureRef.current = getHistorySignature(nextHistory);
    setHistory(nextHistory);
    setError(null);
    setIsLoading(!initialHistory);
  }, [initialHistory, keyResult.id]);

  useEffect(() => {
    let isMounted = true;
    const sourceKeyResultId = keyResult.sourceRecordId.trim();

    if (sourceKeyResultId.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    if (loadedSingularSourceIdRef.current === sourceKeyResultId) {
      return () => {
        isMounted = false;
      };
    }

    loadedSingularSourceIdRef.current = sourceKeyResultId;
    setIsLoading(true);
    setError(null);

    async function loadSingularHistory() {
      try {
        const singularHistoryPayload = await fetchSingularAgileKeyResultHistoryBulk([sourceKeyResultId]);
        const singularHistory = singularHistoryPayload.historyByKeyResultId[sourceKeyResultId] ?? [];

        if (!isMounted) {
          return;
        }

        if (singularHistory.length > 0) {
          applyHistory(singularHistory, { notifyParent: true });
          setError(null);
          return;
        }

        const historyCache = await ensureKeyResultHistoryBulk([keyResult.id]);
        const cachedHistory = historyCache[keyResult.id];

        if (!isMounted) {
          return;
        }

        applyHistory(cachedHistory?.history ?? []);
        setError(cachedHistory?.error ?? null);
      } catch (historyError) {
        if (isMounted) {
          loadedSingularSourceIdRef.current = null;
          setError(historyError instanceof Error ? historyError.message : "No fue posible consultar el historico.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSingularHistory();

    return () => {
      isMounted = false;
    };
  }, [keyResult.sourceRecordId]);

  useEffect(() => {
    let isMounted = true;
    const sourceKeyResultId = keyResult.sourceRecordId.trim();

    if (sourceKeyResultId.length > 0 || initialHistory) {
      return () => {
        isMounted = false;
      };
    }

    async function loadFallbackHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const historyCache = await ensureKeyResultHistoryBulk([keyResult.id]);

        if (isMounted) {
          const cachedHistory = historyCache[keyResult.id];

          applyHistory(cachedHistory?.history ?? []);
          setError(cachedHistory?.error ?? null);
        }
      } catch (historyError) {
        if (isMounted) {
          setHistory([]);
          setError(historyError instanceof Error ? historyError.message : "No fue posible consultar el historico.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFallbackHistory();

    return () => {
      isMounted = false;
    };
  }, [ensureKeyResultHistoryBulk, initialHistory, keyResult.id, keyResult.sourceRecordId]);

  function confirmOutsideClose() {
    setIsCloseConfirmOpen(true);
  }

  async function handleUpdateHistoryPoint(recordId: string, values: KeyResultHistoryEditableValues) {
    try {
      await updateSingularAgileKeyResultHistory({
        recordId,
        ...values
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible actualizar el histórico.";

      onToast?.("error", "No se pudo guardar el histórico", message);
      throw error;
    }

    const latestPoint = history.at(-1) ?? null;
    const nextHistory = history.map((point) =>
      point.id === recordId || point.sourceId === recordId
        ? {
            ...point,
            currentValue: values.currentValue !== undefined ? values.currentValue : point.currentValue,
            initialValue: values.initialValue !== undefined ? values.initialValue : point.initialValue,
            targetValue: values.targetValue !== undefined ? values.targetValue : point.targetValue
          }
        : point
    );

    historySignatureRef.current = getHistorySignature(nextHistory);
    setHistory(nextHistory);
    onHistoryChanged?.(nextHistory);

    if (latestPoint?.id === recordId || latestPoint?.sourceId === recordId) {
      onLatestValuesChanged?.(values);
    }

    onToast?.("success", "Histórico guardado", "Los valores del Key Result se guardaron correctamente.");
  }

  return (
    <>
      <button
        aria-label="Confirm close Key Result history"
        className="client-okrs-history-backdrop"
        onClick={confirmOutsideClose}
        type="button"
      />
      <aside aria-label="Key Result history" className="client-okrs-history-panel">
      <header className="client-okrs-history-header">
        <div>
          <span className="client-okrs-section-label">Key Result History</span>
          <h3>{getKeyResultDisplayTitle(keyResult)}</h3>
          <p>{getObjectiveTitle(objective)}</p>
        </div>
        <button aria-label="Close Key Result history" className="client-okrs-modal-close" onClick={onClose} type="button">
          ×
        </button>
      </header>

      {isLoading ? (
        <article className="client-okrs-history-state">
          <strong>Loading history</strong>
          <p>Consulting Key Result History records.</p>
        </article>
      ) : error ? (
        <article className="client-okrs-history-state is-error">
          <strong>History could not be loaded</strong>
          <p>{error}</p>
        </article>
      ) : (
        <KeyResultHistoryUiResponseView
          onUpdateHistoryPoint={handleUpdateHistoryPoint}
          showFilters
          showList
          showSentiment
          showSummary
          uiResponse={{
            history,
            sentimentAnalysis,
            type: "key_result_history"
          }}
        />
      )}
    </aside>
      {isCloseConfirmOpen ? (
        <div aria-modal="true" className="client-okrs-app-confirm-layer" role="dialog">
          <section className="client-okrs-app-confirm-card">
            <p>Vas a cerrar el historial del Key Result. ¿Quieres continuar?</p>
            <div>
              <button className="client-okrs-app-confirm-secondary" onClick={() => setIsCloseConfirmOpen(false)} type="button">
                Cancel
              </button>
              <button className="client-okrs-app-confirm-primary" onClick={onClose} type="button">
                OK
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function EditableStatusItem({
  isEditing,
  onChange,
  value
}: {
  isEditing: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const options = keyResultStatusOptions.includes(value) || !value
    ? keyResultStatusOptions
    : [value, ...keyResultStatusOptions];

  return (
    <label className={`client-okrs-meta-item${isEditing ? " is-editing" : ""}`}>
      <span>Status</span>
      {isEditing ? (
        <select onChange={(event) => onChange(event.target.value)} value={value || keyResultStatusOptions[0]}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <strong>{value || "Not set"}</strong>
      )}
    </label>
  );
}

function EditableObjectiveStatusItem({
  isEditing,
  onChange,
  value
}: {
  isEditing: boolean;
  onChange: (value: AgileObjective["status"]) => void;
  value: AgileObjective["status"];
}) {
  const options = value && !objectiveStatusOptions.includes(value)
    ? [value, ...objectiveStatusOptions]
    : objectiveStatusOptions;

  return (
    <label className={`client-okrs-meta-item${isEditing ? " is-editing" : ""}`}>
      <span>Status</span>
      {isEditing ? (
        <select
          onChange={(event) => onChange(event.target.value as AgileObjective["status"])}
          value={value || objectiveStatusOptions[0]}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <strong>{value || "Not set"}</strong>
      )}
    </label>
  );
}

function splitRichTextLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function DetailMetaItem({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }

  return (
    <div className="client-okrs-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KeyProjectScoreInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  function stepValue(delta: number) {
    const currentValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    onChange(Math.max(0, Number((currentValue + delta).toFixed(1))));
  }

  return (
    <div className="client-okrs-key-project-score-control">
      <input
        aria-label={label}
        className="client-okrs-key-project-score-input"
        inputMode="decimal"
        onChange={(event) => onChange(parseNullableNumber(event.target.value))}
        onFocus={(event) => event.currentTarget.select()}
        type="text"
        value={value === null ? "" : value.toFixed(1)}
      />
      <div className="client-okrs-key-project-score-steppers">
        <button aria-label={`Increase ${label}`} onClick={() => stepValue(0.1)} type="button">
          <svg viewBox="0 0 12 12">
            <path d="M3 7.5 6 4.5l3 3" />
          </svg>
        </button>
        <button aria-label={`Decrease ${label}`} onClick={() => stepValue(-0.1)} type="button">
          <svg viewBox="0 0 12 12">
            <path d="M3 4.5 6 7.5l3-3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function KpiToggle({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Hide KPIs" : "Show KPIs"}
      className="client-okrs-kpi-toggle"
      onClick={onToggle}
      title={isExpanded ? "Hide KPIs" : "Show KPIs"}
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function NewOkrMenu({
  disabled,
  onSelect
}: {
  disabled: boolean;
  onSelect: (type: NewOkrRecordType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="client-okrs-new-menu">
      <button
        aria-expanded={isOpen}
        className="client-okrs-new-button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        title={disabled ? "Select a project first" : "Create a new OKR record"}
        type="button"
      >
        <span aria-hidden="true">+</span>
        New
      </button>
      {isOpen && !disabled ? (
        <div className="client-okrs-new-menu-list" role="menu">
          {([
            ["objective", "Objective"],
            ["key-result", "Key Result"],
            ["key-project", "Key Project"]
          ] as Array<[NewOkrRecordType, string]>).map(([type, label]) => (
            <button
              key={type}
              onClick={() => {
                setIsOpen(false);
                onSelect(type);
              }}
              role="menuitem"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  children,
  className = "",
  label
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`client-okrs-form-field${className ? ` ${className}` : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ObjectivePicker({
  objectives,
  onChange,
  value
}: {
  objectives: AgileObjective[];
  onChange: (objectiveId: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedObjective = objectives.find((objective) => objective.id === value);
  const selectedLabel = selectedObjective ? getObjectiveTitle(selectedObjective) : "Select Objective";

  return (
    <div className="client-okrs-form-field client-okrs-objective-picker is-wide">
      <span>Objective</span>
      <button
        aria-expanded={isOpen}
        className={selectedObjective ? "has-value" : undefined}
        onClick={() => setIsOpen((current) => !current)}
        title={selectedObjective ? selectedLabel : undefined}
        type="button"
      >
        <strong>{selectedLabel}</strong>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isOpen ? (
        <div className="client-okrs-objective-picker-list" role="listbox">
          {objectives.map((objective) => {
            const objectiveLabel = getObjectiveTitle(objective);

            return (
              <button
                aria-selected={objective.id === value}
                key={objective.id}
                onClick={() => {
                  onChange(objective.id);
                  setIsOpen(false);
                }}
                role="option"
                title={objectiveLabel}
                type="button"
              >
                {objectiveLabel}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NewOkrRecordModal({
  objectives,
  onClose,
  onCreated,
  keyProjects,
  project,
  projectId,
  projectName,
  type
}: {
  keyProjects: AgileKeyProject[];
  objectives: AgileObjective[];
  onClose: () => void;
  onCreated: (result: {
    keyProjectId?: string;
    objectiveTitle?: string;
    objectiveId?: string;
    targetDate?: string;
    type: NewOkrRecordType;
  }) => Promise<void>;
  project: AgileProject | null;
  projectId: string;
  projectName: string;
  type: NewOkrRecordType;
}) {
  const [objectiveForm, setObjectiveForm] = useState<CreateAgileObjectiveInput>({
    description: "",
    explanation: "",
    metric: "",
    objective: "",
    priority: "",
    projectId,
    status: "Pending Review",
    targetDate: "",
    type: ""
  });
  const [keyResultForm, setKeyResultForm] = useState<
    Omit<CreateAgileKeyResultInput, "currentValue" | "initialValue" | "targetValue"> & {
      currentValue: string;
      initialValue: string;
      targetValue: string;
    }
  >({
    currentValue: "",
    explanation: "",
    initialValue: "",
    keyResult: "",
    metric: "",
    objectiveId: "",
    projectId,
    status: "Todo",
    targetDate: "",
    targetValue: ""
  });
  const [keyProjectForm, setKeyProjectForm] = useState<CreateAgileKeyProjectInput>({
    dontShowInSingularStories: false,
    justification: "",
    name: "",
    projectId,
    status: "Suggested by Resource",
  });
  const [error, setError] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isObjectiveIdeaModalOpen, setIsObjectiveIdeaModalOpen] = useState(false);
  const [isKeyResultIdeaModalOpen, setIsKeyResultIdeaModalOpen] = useState(false);
  const [objectiveIdea, setObjectiveIdea] = useState("");
  const [objectiveIdeaError, setObjectiveIdeaError] = useState<string | null>(null);
  const [keyResultIdea, setKeyResultIdea] = useState("");
  const [keyResultIdeaError, setKeyResultIdeaError] = useState<string | null>(null);
  const title =
    type === "objective" ? "New Objective" : type === "key-result" ? "New Key Result" : "New Key Project";

  async function handleGenerateObjectiveDraft() {
    setObjectiveIdeaError(null);
    setGenerationMessage(null);

    if (!objectiveIdea.trim()) {
      setObjectiveIdeaError("Add an Objective idea before generating with IA.");
      return;
    }

    setIsGeneratingDraft(true);

    try {
      const payload = await generateAgileObjectiveDraft({
        existingObjectives: objectives,
        idea: objectiveIdea.trim(),
        keyProjects,
        projectId,
        projectName
      });
      const draft = payload.draft;

      setObjectiveForm((current) => ({
        ...current,
        aiSuggestedKeyResults: formatKeyResultDraftLines(draft.keyResults),
        description: draft.description,
        explanation: draft.explanation,
        keyResults: draft.keyResults.map((keyResult) => keyResult.keyResult),
        metric: draft.metric,
        objective: draft.objective,
        priority: draft.priority,
        suggestedKeyResultsJson: draft.keyResults,
        targetDate: draft.targetDate,
        type: draft.type
      }));
      setIsObjectiveIdeaModalOpen(false);
      setGenerationMessage(`Draft generated with ${payload.model}. Review before creating.`);
    } catch (draftError) {
      setObjectiveIdeaError(
        draftError instanceof Error ? draftError.message : "No fue posible generar el Objective con IA."
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleGenerateKeyResultDraft() {
    const selectedObjective = objectives.find((objective) => objective.id === keyResultForm.objectiveId);

    setError(null);
    setGenerationMessage(null);
    setKeyResultIdeaError(null);

    if (!selectedObjective) {
      setKeyResultIdeaError("Select an Objective first so the IA can generate a coherent Key Result.");
      return;
    }

    if (!keyResultIdea.trim()) {
      setKeyResultIdeaError("Add a Key Result idea before generating with IA.");
      return;
    }

    setIsGeneratingDraft(true);

    try {
      const payload = await generateAgileKeyResultDraft({
        existingKeyResults: getObjectiveKeyResults(selectedObjective),
        idea: keyResultIdea.trim(),
        objective: selectedObjective,
        projectId,
        projectName
      });
      const draft = payload.draft;

      setKeyResultForm((current) => ({
        ...current,
        currentValue: formatDraftNumberInput(draft.currentValue),
        explanation: draft.explanation,
        initialValue: formatDraftNumberInput(draft.initialValue),
        keyResult: draft.keyResult,
        metric: draft.metric,
        status: draft.status,
        targetDate: draft.targetDate,
        targetValue: formatDraftNumberInput(draft.targetValue)
      }));
      setIsKeyResultIdeaModalOpen(false);
      setGenerationMessage(`Draft generated with ${payload.model}. Review before creating.`);
    } catch (draftError) {
      setKeyResultIdeaError(draftError instanceof Error ? draftError.message : "No fue posible generar el Key Result con IA.");
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setIsSaving(true);

      if (type === "objective") {
        if (!objectiveForm.objective.trim()) {
          throw new Error("Objective is required.");
        }

        const sourceRecordId = project?.sourceRecordId?.trim();
        if (!sourceRecordId) {
          throw new Error("Este Project no tiene sourceRecordId configurado para crear el Objective en Singular AGILE.");
        }

        const targetDate = objectiveForm.targetDate?.trim() ?? "";
        const suggestedKeyResultsJson = objectiveForm.suggestedKeyResultsJson ?? [];
        const response = await fetch(createObjectiveWebhookUrl, {
          body: JSON.stringify({
            action: "createObjective",
            daysRemaining: getDaysRemaining(targetDate),
            description: objectiveForm.description?.trim() ?? "",
            executionMode: "production",
            explanation: objectiveForm.explanation?.trim() ?? "",
            foundationProjectId: projectId,
            goal: objectiveForm.objective.trim(),
            keyResults: objectiveForm.keyResults ?? suggestedKeyResultsJson.map((keyResult) => keyResult.keyResult),
            metric: objectiveForm.metric?.trim() ?? "",
            priority: objectiveForm.priority?.trim() ?? "",
            project: {
              foundationRecordId: projectId,
              name: project?.name ?? projectName,
              sourceRecordId
            },
            projectId: sourceRecordId,
            quarter: objectiveForm.quarter?.trim() || getQuarterFromDate(targetDate),
            status: objectiveForm.status ?? "Pending Review",
            suggestedKeyResults: objectiveForm.aiSuggestedKeyResults?.trim() ?? "",
            suggestedKeyResultsJson,
            timeline: formatTimelineDate(targetDate),
            timelineDate: targetDate,
            type: objectiveForm.type?.trim() ?? "",
            webhookUrl: createObjectiveWebhookUrl
          }),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });
        const payload = await readWebhookResponse(response);

        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.message ?? "No fue posible crear el Objective en N8n.");
        }

        await onCreated({
          objectiveTitle: objectiveForm.objective.trim(),
          targetDate,
          type
        });
        return;
      }

      if (type === "key-result") {
        if (!keyResultForm.objectiveId.trim()) {
          throw new Error("Objective is required.");
        }

        if (!keyResultForm.keyResult.trim()) {
          throw new Error("Key Result is required.");
        }

        const selectedObjective = objectives.find((objective) => objective.id === keyResultForm.objectiveId);
        if (!selectedObjective) {
          throw new Error("Objective is required.");
        }

        if (!project?.sourceRecordId?.trim()) {
          throw new Error("Este Project no tiene sourceRecordId configurado para crear KRs en Singular AGILE.");
        }

        if (!selectedObjective.recordId.trim()) {
          throw new Error("Este Objective no tiene sourceRecordId / record_id configurado para crear KRs en Singular AGILE.");
        }

        const response = await fetch(createKeyResultWebhookUrl, {
          body: JSON.stringify(
            buildKeyResultCreatePayload({
              form: keyResultForm,
              objective: selectedObjective,
              project,
              projectId,
              projectName
            })
          ),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });
        const payload = await readWebhookResponse(response);

        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.message ?? "No fue posible crear el Key Result en N8n.");
        }

        await onCreated({ objectiveId: selectedObjective.id, type });
        return;
      }

      if (!keyProjectForm.name.trim()) {
        throw new Error("Key Project Name is required.");
      }

      const response = await fetch("/api/okrs/key-projects", {
        body: JSON.stringify({
          ...keyProjectForm,
          projectId
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload = (await response.json()) as
        | { keyProject: AgileKeyProject; ok: true }
        | { message?: string; ok?: false };

      if (!response.ok || !("ok" in payload && payload.ok)) {
        throw new Error((payload as { message?: string }).message ?? "No fue posible crear el Key Project.");
      }

      await onCreated({ keyProjectId: payload.keyProject.id, type });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible crear el registro.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="client-okrs-modal-layer" role="presentation">
      <button aria-label="Close new OKR form" className="client-okrs-modal-backdrop" onClick={onClose} type="button" />
      <aside aria-modal="true" className="client-okrs-modal client-okrs-create-sheet" role="dialog">
        <div className="client-okrs-create-head">
          <div>
            <span className="client-okrs-section-label">Create</span>
            <h2>{title}</h2>
          </div>
          <button aria-label="Close new OKR form" className="client-okrs-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        {type === "objective" || type === "key-result" ? (
          <section className="client-okrs-ai-draft-panel">
            <div>
              <span>AI Draft Assist</span>
              <p>
                {type === "objective"
                  ? "Open a guided prompt to add your intent, then generate an Objective and 3 measurable Key Results."
                  : "Open a guided prompt to add your intent, then generate a measurable Key Result from the selected Objective."}
              </p>
            </div>
            <button
              disabled={isGeneratingDraft}
              onClick={type === "objective" ? () => {
                setObjectiveIdeaError(null);
                setIsObjectiveIdeaModalOpen(true);
              } : () => {
                setKeyResultIdeaError(null);
                setIsKeyResultIdeaModalOpen(true);
              }}
              type="button"
            >
              {isGeneratingDraft ? "Thinking..." : "Generate with IA"}
            </button>
          </section>
        ) : null}

        <form className="client-okrs-create-form" onSubmit={handleSubmit}>
          {type === "objective" ? (
            <>
              <FormField className="is-wide" label="Objective">
                <textarea
                  onChange={(event) => setObjectiveForm((current) => ({ ...current, objective: event.target.value }))}
                  required
                  rows={3}
                  value={objectiveForm.objective}
                />
              </FormField>
              <FormField className="is-wide" label="Objetive Description">
                <textarea
                  onChange={(event) => setObjectiveForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  value={objectiveForm.description}
                />
              </FormField>
              <FormField label="Status">
                <select
                  onChange={(event) =>
                    setObjectiveForm((current) => ({
                      ...current,
                      status: event.target.value as CreateAgileObjectiveInput["status"]
                    }))
                  }
                  value={objectiveForm.status}
                >
                  {objectiveStatusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Target Date">
                <input onChange={(event) => setObjectiveForm((current) => ({ ...current, targetDate: event.target.value }))} type="date" value={objectiveForm.targetDate} />
              </FormField>
              <FormField label="Priority">
                <input onChange={(event) => setObjectiveForm((current) => ({ ...current, priority: event.target.value }))} value={objectiveForm.priority} />
              </FormField>
              <FormField label="Type">
                <input onChange={(event) => setObjectiveForm((current) => ({ ...current, type: event.target.value }))} value={objectiveForm.type} />
              </FormField>
              <FormField label="Metric">
                <input onChange={(event) => setObjectiveForm((current) => ({ ...current, metric: event.target.value }))} value={objectiveForm.metric} />
              </FormField>
              <FormField className="is-wide" label="Explanation">
                <textarea onChange={(event) => setObjectiveForm((current) => ({ ...current, explanation: event.target.value }))} rows={4} value={objectiveForm.explanation} />
              </FormField>
              <FormField className="is-wide" label="Suggested Key Results">
                <textarea
                  onChange={(event) => setObjectiveForm((current) => ({ ...current, aiSuggestedKeyResults: event.target.value }))}
                  rows={10}
                  value={objectiveForm.aiSuggestedKeyResults ?? ""}
                />
              </FormField>
            </>
          ) : null}

          {type === "key-result" ? (
            <>
              <ObjectivePicker
                objectives={objectives}
                onChange={(objectiveId) => {
                  setKeyResultForm((current) => ({
                    ...current,
                    objectiveId
                  }));
                }}
                value={keyResultForm.objectiveId}
              />
              <FormField className="is-wide" label="Key Result">
                <textarea onChange={(event) => setKeyResultForm((current) => ({ ...current, keyResult: event.target.value }))} required rows={3} value={keyResultForm.keyResult} />
              </FormField>
              <FormField label="Metric">
                <input onChange={(event) => setKeyResultForm((current) => ({ ...current, metric: event.target.value }))} value={keyResultForm.metric} />
              </FormField>
              <FormField label="Status">
                <select
                  onChange={(event) =>
                    setKeyResultForm((current) => ({
                      ...current,
                      status: event.target.value as CreateAgileKeyResultInput["status"]
                    }))
                  }
                  value={keyResultForm.status}
                >
                  {keyResultStatusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Target Date">
                <input onChange={(event) => setKeyResultForm((current) => ({ ...current, targetDate: event.target.value }))} type="date" value={keyResultForm.targetDate} />
              </FormField>
              <FormField label="Initial Value %">
                <input inputMode="decimal" onChange={(event) => setKeyResultForm((current) => ({ ...current, initialValue: event.target.value }))} placeholder="0.00" value={keyResultForm.initialValue} />
              </FormField>
              <FormField label="Current Value %">
                <input inputMode="decimal" onChange={(event) => setKeyResultForm((current) => ({ ...current, currentValue: event.target.value }))} placeholder="0.00" value={keyResultForm.currentValue} />
              </FormField>
              <FormField label="Target Value %">
                <input inputMode="decimal" onChange={(event) => setKeyResultForm((current) => ({ ...current, targetValue: event.target.value }))} placeholder="100.00" value={keyResultForm.targetValue} />
              </FormField>
              <FormField className="is-wide" label="Explanation">
                <textarea onChange={(event) => setKeyResultForm((current) => ({ ...current, explanation: event.target.value }))} rows={4} value={keyResultForm.explanation} />
              </FormField>
            </>
          ) : null}

          {type === "key-project" ? (
            <>
              <FormField className="is-wide" label="Key Project Name">
                <textarea onChange={(event) => setKeyProjectForm((current) => ({ ...current, name: event.target.value }))} required rows={2} value={keyProjectForm.name} />
              </FormField>
              <FormField label="Status">
                <select
                  onChange={(event) =>
                    setKeyProjectForm((current) => ({
                      ...current,
                      status: event.target.value as CreateAgileKeyProjectInput["status"]
                    }))
                  }
                  value={keyProjectForm.status}
                >
                  {keyProjectStatusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              <label className="client-okrs-form-check">
                <input
                  checked={keyProjectForm.dontShowInSingularStories === true}
                  onChange={(event) => setKeyProjectForm((current) => ({ ...current, dontShowInSingularStories: event.target.checked }))}
                  type="checkbox"
                />
                Don't Show In Singular Stories
              </label>
              <FormField className="is-wide" label="Justification">
                <textarea onChange={(event) => setKeyProjectForm((current) => ({ ...current, justification: event.target.value }))} rows={4} value={keyProjectForm.justification} />
              </FormField>
            </>
          ) : null}

          {generationMessage ? <p className="client-okrs-create-success">{generationMessage}</p> : null}
          {error ? <p className="client-okrs-create-error">{error}</p> : null}

          <div className="client-okrs-create-actions">
            <button className="client-okrs-create-cancel" disabled={isSaving} onClick={onClose} type="button">
              Cancel
            </button>
            <button className="client-okrs-create-submit" disabled={isSaving} type="submit">
              {isSaving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </aside>
      {type === "objective" && isObjectiveIdeaModalOpen ? (
        <div className="client-okrs-idea-modal-layer" role="presentation">
          <button
            aria-label="Close Objective idea prompt"
            className="client-okrs-idea-modal-backdrop"
            disabled={isGeneratingDraft}
            onClick={() => setIsObjectiveIdeaModalOpen(false)}
            type="button"
          />
          <section
            aria-labelledby="client-okrs-objective-idea-title"
            aria-modal="true"
            className="client-okrs-idea-modal"
            role="dialog"
          >
            <div className="client-okrs-idea-modal-head">
              <div>
                <span className="client-okrs-section-label">Generate Objective</span>
                <h3 id="client-okrs-objective-idea-title">Objective Idea</h3>
              </div>
              <button
                aria-label="Close Objective idea prompt"
                className="client-okrs-idea-modal-close"
                disabled={isGeneratingDraft}
                onClick={() => setIsObjectiveIdeaModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="client-okrs-idea-modal-copy">
              Add the business intent or problem to solve. IA will combine it with the project context and draft one
              Objective plus 3 measurable Key Results.
            </p>
            <label className="client-okrs-idea-field">
              <span>Idea</span>
              <textarea
                autoFocus
                onChange={(event) => {
                  setObjectiveIdea(event.target.value);
                  setObjectiveIdeaError(null);
                }}
                placeholder="Example: improve reporting adoption, reduce delivery delays, stabilize project visibility..."
                rows={5}
                value={objectiveIdea}
              />
            </label>
            {objectiveIdeaError ? <p className="client-okrs-idea-error">{objectiveIdeaError}</p> : null}
            <div className="client-okrs-idea-modal-actions">
              <button
                className="client-okrs-create-cancel"
                disabled={isGeneratingDraft}
                onClick={() => setIsObjectiveIdeaModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="client-okrs-create-submit"
                disabled={isGeneratingDraft || !objectiveIdea.trim()}
                onClick={handleGenerateObjectiveDraft}
                type="button"
              >
                {isGeneratingDraft ? "Generating..." : "Generate draft"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {type === "key-result" && isKeyResultIdeaModalOpen ? (
        <div className="client-okrs-idea-modal-layer" role="presentation">
          <button
            aria-label="Close Key Result idea prompt"
            className="client-okrs-idea-modal-backdrop"
            disabled={isGeneratingDraft}
            onClick={() => setIsKeyResultIdeaModalOpen(false)}
            type="button"
          />
          <section
            aria-labelledby="client-okrs-key-result-idea-title"
            aria-modal="true"
            className="client-okrs-idea-modal"
            role="dialog"
          >
            <div className="client-okrs-idea-modal-head">
              <div>
                <span className="client-okrs-section-label">Generate Key Result</span>
                <h3 id="client-okrs-key-result-idea-title">Key Result Idea</h3>
              </div>
              <button
                aria-label="Close Key Result idea prompt"
                className="client-okrs-idea-modal-close"
                disabled={isGeneratingDraft}
                onClick={() => setIsKeyResultIdeaModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="client-okrs-idea-modal-copy">
              Add the result you want to measure. IA will combine it with the selected Objective, project context, and
              existing Key Results to draft one measurable KR.
            </p>
            <label className="client-okrs-idea-field">
              <span>Idea</span>
              <textarea
                autoFocus
                onChange={(event) => {
                  setKeyResultIdea(event.target.value);
                  setKeyResultIdeaError(null);
                }}
                placeholder="Example: reduce review time, increase first-pass approval, improve response SLA..."
                rows={5}
                value={keyResultIdea}
              />
            </label>
            {keyResultIdeaError ? <p className="client-okrs-idea-error">{keyResultIdeaError}</p> : null}
            <div className="client-okrs-idea-modal-actions">
              <button
                className="client-okrs-create-cancel"
                disabled={isGeneratingDraft}
                onClick={() => setIsKeyResultIdeaModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="client-okrs-create-submit"
                disabled={isGeneratingDraft || !keyResultIdea.trim()}
                onClick={handleGenerateKeyResultDraft}
                type="button"
              >
                {isGeneratingDraft ? "Generating..." : "Generate draft"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MainOkrTabs({
  activeTab,
  onChange
}: {
  activeTab: MainOkrTab;
  onChange: (tab: MainOkrTab) => void;
}) {
  return (
    <div className="client-okrs-main-tabs" role="tablist" aria-label="OKR views">
      <button
        aria-selected={activeTab === "okrs"}
        className={activeTab === "okrs" ? "is-active" : undefined}
        onClick={() => onChange("okrs")}
        role="tab"
        type="button"
      >
        OKRs
      </button>
      <button
        aria-selected={activeTab === "key-results"}
        className={activeTab === "key-results" ? "is-active" : undefined}
        onClick={() => onChange("key-results")}
        role="tab"
        type="button"
      >
        Key Results
      </button>
    </div>
  );
}

function PortfolioTabs({
  activeTab,
  onChange
}: {
  activeTab: PortfolioTab;
  onChange: (tab: PortfolioTab) => void;
}) {
  return (
    <div className="client-okrs-main-tabs client-okrs-portfolio-tabs" role="tablist" aria-label="Portfolio Analysis views">
      <button
        aria-selected={activeTab === "summary"}
        className={activeTab === "summary" ? "is-active" : undefined}
        onClick={() => onChange("summary")}
        role="tab"
        type="button"
      >
        Account Summary
      </button>
      <button
        aria-selected={activeTab === "kr-trends"}
        className={activeTab === "kr-trends" ? "is-active" : undefined}
        onClick={() => onChange("kr-trends")}
        role="tab"
        type="button"
      >
        KR Trends
      </button>
    </div>
  );
}

function AccountSummaryView({
  narrative,
  onOpenProject,
  portfolioSummaries,
  projects,
  selectedProjectId
}: {
  narrative: PortfolioNarrativeState;
  onOpenProject: (projectId: string) => void;
  portfolioSummaries: Record<string, PortfolioProjectSummary>;
  projects: AgileProject[];
  selectedProjectId: string;
}) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const portfolioScore = computePortfolioScore(portfolioSummaries, selectedProject?.id);
  const updatedAt = narrative.generatedAt
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(narrative.generatedAt))
    : null;

  return (
    <section className="client-okrs-account-summary" aria-label="Account Summary">
      <header className="client-okrs-account-summary-header">
        <div>
          <span className="client-okrs-section-label">Portfolio Analysis</span>
          <h2>Portfolio Analysis</h2>
          {updatedAt ? <small>Updated {updatedAt}</small> : null}
          {narrative.isLoading ? (
            <p>Generating portfolio narrative from the loaded OKR signals.</p>
          ) : narrative.analysis ? (
            <>
              <p>{narrative.analysis.executiveSummary}</p>
              <div className="client-okrs-portfolio-narrative">
                <div>
                  <strong>Winners</strong>
                  <ul>
                    {narrative.analysis.winners.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Needs Attention</strong>
                  <ul>
                    {narrative.analysis.needsAttention.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : narrative.error ? (
            <p className="client-okrs-account-summary-error">{narrative.error}</p>
          ) : (
            <p>Summary built from the active projects available in this workspace.</p>
          )}
        </div>
        <div className="client-okrs-account-summary-score">
          <span>{selectedProject ? "Selected account score" : "Portfolio score"}</span>
          <strong>{portfolioScore === null ? "N/A" : `${portfolioScore}%`}</strong>
        </div>
      </header>

      <div className="client-okrs-account-summary-list">
        {projects.map((project) => {
          const isSelected = project.id === selectedProjectId;
          const summary = portfolioSummaries[project.id];
          const signalCounts = summary?.signalCounts ?? { bleeding: 0, cold: 0, hot: 0, new: 0 };
          const hasAnalysis = summary?.status === "ready";
          const hasNoOkrs = summary?.status === "empty";
          const hasError = summary?.status === "error";
          const isLoading = !summary || summary.status === "loading";
          const rowSentiment =
            hasAnalysis && signalCounts.hot >= 2
              ? { className: "is-rose", emoji: "🌹", label: "Rose" }
              : hasAnalysis && signalCounts.bleeding >= 2
                ? { className: "is-thorn", emoji: "🥀", label: "Thorn" }
                : hasAnalysis
                  ? { className: "is-bud", emoji: "🌱", label: "Bud" }
                  : null;

          return (
            <button
              className={`client-okrs-account-row${isSelected ? " is-selected" : ""}`}
              key={project.id}
              onClick={() => onOpenProject(project.id)}
              type="button"
            >
              <div className="client-okrs-account-row-main">
                <span className={rowSentiment ? rowSentiment.className : isLoading ? "is-loading" : "is-empty"}>
                  {rowSentiment ? (
                    rowSentiment.emoji
                  ) : isLoading ? (
                    <span className="client-okrs-account-dot-loader" aria-label="Loading project sentiment">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : hasError ? (
                    "!"
                  ) : (
                    "--"
                  )}
                </span>
                <div>
                  <strong>{project.name}</strong>
                  <div className="client-okrs-account-row-signals" aria-label={`${project.name} Key Result signal counts`}>
                    <span className="is-hot">HOT <strong>{signalCounts.hot}</strong></span>
                    <span className="is-bleeding">BLEEDING <strong>{signalCounts.bleeding}</strong></span>
                    <span className="is-cold">COLD <strong>{signalCounts.cold}</strong></span>
                    <span className="is-new">NEW <strong>{signalCounts.new}</strong></span>
                  </div>
                </div>
              </div>
              <div className="client-okrs-account-row-score">
                {hasAnalysis ? (
                  <>
                    <strong>{summary.score ?? 0}%</strong>
                    <small>{summary.objectiveCount} objectives</small>
                  </>
                ) : hasNoOkrs ? (
                  <>
                    <strong>--</strong>
                    <small>No OKRs</small>
                  </>
                ) : hasError ? (
                  <>
                    <strong>--</strong>
                    <small>Load failed</small>
                  </>
                ) : (
                  <>
                    {isLoading ? (
                      <span className="client-okrs-account-loading-dots" aria-label="Loading project analysis">
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : (
                      <strong>--</strong>
                    )}
                    <small>{isLoading ? "Loading" : "Pending"}</small>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PortfolioProjectOverviewPanel({
  error,
  isLoading,
  onClose,
  onOpenObjective,
  project,
  projectData,
  summary
}: {
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onOpenObjective: (objective: AgileObjective, index: number) => void;
  project: AgileProject;
  projectData?: ProjectOkrData;
  summary?: PortfolioProjectSummary;
}) {
  const objectives = projectData?.objectives ?? [];
  const signalCounts = summary?.signalCounts ?? { bleeding: 0, cold: 0, hot: 0, new: 0 };

  return (
    <div className="client-okrs-modal-layer" role="presentation">
      <button
        aria-label="Close Project overview"
        className="client-okrs-modal-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside aria-modal="true" className="client-okrs-modal client-okrs-side-sheet" role="dialog">
        <div className="client-okrs-sheet-toolbar">
          <div>
            <span className="client-okrs-section-label">Project Overview</span>
            <h2 className="client-okrs-project-overview-title">{project.name}</h2>
          </div>
          <button aria-label="Close Project overview" className="client-okrs-sheet-close" onClick={onClose} type="button">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="client-okrs-detail-stack">
          <section className="client-okrs-detail-card">
            <div className="client-okrs-progress-head">
              <span>Project Score</span>
              <div>
                <strong>{summary?.score === null || summary?.score === undefined ? "N/A" : `${summary.score}%`}</strong>
                <p>{summary?.objectiveCount ?? objectives.length} objectives</p>
              </div>
            </div>
            <div className="client-okrs-account-row-signals" aria-label={`${project.name} Key Result signal counts`}>
              <span className="is-hot">HOT <strong>{signalCounts.hot}</strong></span>
              <span className="is-bleeding">BLEEDING <strong>{signalCounts.bleeding}</strong></span>
              <span className="is-cold">COLD <strong>{signalCounts.cold}</strong></span>
              <span className="is-new">NEW <strong>{signalCounts.new}</strong></span>
            </div>
          </section>

          {isLoading ? (
            <article className="client-okrs-detail-card">
              <p>Loading Project overview...</p>
            </article>
          ) : error ? (
            <article className="client-okrs-detail-card">
              <p className="client-okrs-sentiment-error">{error}</p>
            </article>
          ) : objectives.length === 0 ? (
            <article className="client-okrs-detail-card">
              <p>No OKRs loaded for this Project yet.</p>
            </article>
          ) : (
            <div className="client-okrs-grid">
              {objectives.map((objective, index) => (
                <OkrSummaryCard
                  healthError={null}
                  isAnalyzingHealth={false}
                  key={objective.id}
                  okr={objective}
                  okrIndex={index + 1}
                  onOpen={() => onOpenObjective(objective, index)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function PortfolioMiniHistoryChart({
  history,
  metricStatus
}: {
  history: AgileKeyResultHistoryPoint[];
  metricStatus?: AgileKeyResultSentimentAnalysis["metricStatus"];
}) {
  const points = history.filter((point) => point.currentValue !== null);

  if (points.length < 2) {
    return (
      <div className="client-okrs-portfolio-kr-chart-empty">
        {history.length === 1 ? "Not enough history" : "No history yet"}
      </div>
    );
  }

  const width = 320;
  const height = 92;
  const paddingX = 10;
  const paddingY = 14;
  const rawValues = points.flatMap((point) => [
    point.currentValue ?? 0,
    point.targetValue ?? point.currentValue ?? 0
  ]);
  const shouldNormalizeMixedPercentValues = shouldNormalizeMixedHistoryPercentValues(rawValues);
  const values = rawValues.map((value) => normalizeHistoryChartValue(value, shouldNormalizeMixedPercentValues));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const xForIndex = (index: number) =>
    paddingX + (index / Math.max(1, points.length - 1)) * (width - paddingX * 2);
  const yForValue = (value: number) =>
    height - paddingY - ((value - minValue) / range) * (height - paddingY * 2);
  const currentPath = points
    .map((point, index) => {
      const x = xForIndex(index);
      const y = yForValue(normalizeHistoryChartValue(point.currentValue ?? 0, shouldNormalizeMixedPercentValues));

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const targetPoints = points
    .map((point, index) => ({ index, point }))
    .filter(({ point }) => point.targetValue !== null);
  const targetPath =
    targetPoints.length >= 2
      ? targetPoints
          .map(({ index, point }, pathIndex) => {
            const x = xForIndex(index);
            const y = yForValue(normalizeHistoryChartValue(point.targetValue ?? 0, shouldNormalizeMixedPercentValues));

            return `${pathIndex === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ")
      : "";
  const firstLabel = getHistoryAxisLabel(points[0], 0);
  const lastLabel = getHistoryAxisLabel(points[points.length - 1], points.length - 1);

  return (
    <div className="client-okrs-portfolio-kr-chart">
      <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${width} ${height}`}>
        <line className="client-okrs-portfolio-kr-chart-grid" x1={paddingX} x2={width - paddingX} y1={height - paddingY} y2={height - paddingY} />
        {targetPath ? <path className="client-okrs-portfolio-kr-target-line" d={targetPath} /> : null}
        <path
          className="client-okrs-portfolio-kr-current-line"
          d={currentPath}
          style={{ stroke: getMetricStatusColor(metricStatus) }}
        />
        {points.map((point, index) => (
          <circle
            className="client-okrs-portfolio-kr-point"
            cx={xForIndex(index)}
            cy={yForValue(normalizeHistoryChartValue(point.currentValue ?? 0, shouldNormalizeMixedPercentValues))}
            fill={getMetricStatusColor(metricStatus)}
            key={`${point.id}-${index}`}
            r="2.5"
          />
        ))}
      </svg>
      <div className="client-okrs-portfolio-kr-chart-labels">
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  );
}

function PortfolioKrCard({
  analysis,
  historyState,
  keyResult,
  onOpen
}: {
  analysis?: AgileKeyResultSentimentAnalysis;
  historyState?: PortfolioKrHistoryCache[string];
  keyResult: AgileKeyResult;
  onOpen: () => void;
}) {
  const metricStatus = analysis?.metricStatus;

  return (
    <button
      aria-label={`Open ${keyResult.code || "Key Result"} details`}
      className="client-okrs-portfolio-kr-card"
      onClick={onOpen}
      type="button"
    >
      <header>
        <div>
          <span>{keyResult.code || "KR"}</span>
          <strong>{keyResult.metric || getKeyResultDisplayTitle(keyResult)}</strong>
        </div>
        <KeyResultSentimentBadge analysis={analysis} isLoading={!analysis} />
      </header>
      <h4>{getKeyResultDisplayTitle(keyResult)}</h4>
      <div className="client-okrs-portfolio-kr-values">
        <div>
          <span>Current</span>
          <strong>{formatHistoryMetricValue(keyResult.currentValue)}</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{formatHistoryMetricValue(keyResult.targetValue)}</strong>
        </div>
        <div>
          <span>Progress</span>
          <strong>{normalizeProgress(keyResult.progress)}%</strong>
        </div>
      </div>
      {historyState?.status === "ready" ? (
        <PortfolioMiniHistoryChart history={historyState.history} metricStatus={metricStatus} />
      ) : historyState?.status === "error" ? (
        <div className="client-okrs-portfolio-kr-chart-empty is-error">{historyState.error ?? "History failed"}</div>
      ) : (
        <div className="client-okrs-portfolio-kr-chart-empty">
          <span className="client-okrs-account-loading-dots" aria-label="Loading history">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
    </button>
  );
}

function KeyResultInlineHistoryChart({
  historyState,
  sentimentAnalysis
}: {
  historyState?: PortfolioKrHistoryCache[string];
  sentimentAnalysis?: AgileKeyResultSentimentAnalysis;
}) {
  return (
    <div className="client-okrs-kr-inline-history">
      <div className="client-okrs-detail-card-head">
        <span>History Trend</span>
      </div>
      {historyState?.status === "ready" ? (
        <KeyResultHistoryUiResponseView
          compact
          uiResponse={{
            history: historyState.history,
            sentimentAnalysis,
            type: "key_result_history"
          }}
        />
      ) : historyState?.status === "error" ? (
        <div className="client-okrs-portfolio-kr-chart-empty is-error">{historyState.error ?? "History failed"}</div>
      ) : (
        <div className="client-okrs-portfolio-kr-chart-empty">
          <span className="client-okrs-account-loading-dots" aria-label="Loading history">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
    </div>
  );
}

function PortfolioKrTrendsView({
  historyByKeyResultId,
  onOpenKeyResult,
  portfolioSummaries,
  projects
}: {
  historyByKeyResultId: PortfolioKrHistoryCache;
  onOpenKeyResult: (project: AgileProject, keyResult: AgileKeyResult) => void;
  portfolioSummaries: Record<string, PortfolioProjectSummary>;
  projects: AgileProject[];
}) {
  return (
    <section className="client-okrs-portfolio-trends" aria-label="Portfolio Key Result trends">
      <header className="client-okrs-portfolio-trends-header">
        <div>
          <span className="client-okrs-section-label">KR Trends</span>
          <h2>Key Result Trends by Project</h2>
          <p>History-based trend cards grouped by project, using the loaded Key Result History records.</p>
        </div>
      </header>

      <div className="client-okrs-portfolio-projects">
        {projects.map((project) => {
          const summary = portfolioSummaries[project.id];
          const analysesByKeyResultId = new Map(summary?.analyses.map((analysis) => [analysis.keyResultId, analysis]) ?? []);
          const sentimentEmoji = getProjectSentimentEmoji(summary);

          return (
            <article className="client-okrs-portfolio-project-section" key={project.id}>
              <header>
                <div className="client-okrs-portfolio-project-title">
                  <span>{sentimentEmoji ?? "--"}</span>
                  <div>
                    <strong>{project.name}</strong>
                    <p>{getProjectTrendSummary(summary)}</p>
                  </div>
                </div>
                <div className="client-okrs-account-row-signals" aria-label={`${project.name} Key Result signal counts`}>
                  <span className="is-hot">HOT <strong>{summary?.signalCounts.hot ?? 0}</strong></span>
                  <span className="is-bleeding">BLEEDING <strong>{summary?.signalCounts.bleeding ?? 0}</strong></span>
                  <span className="is-cold">COLD <strong>{summary?.signalCounts.cold ?? 0}</strong></span>
                  <span className="is-new">NEW <strong>{summary?.signalCounts.new ?? 0}</strong></span>
                </div>
              </header>

              {summary?.status === "error" ? (
                <p className="client-okrs-portfolio-project-state">{summary.error ?? "Could not load project KRs."}</p>
              ) : summary?.status === "empty" ? (
                <p className="client-okrs-portfolio-project-state">No Key Results loaded for this project.</p>
              ) : summary?.status === "loading" || !summary ? (
                <p className="client-okrs-portfolio-project-state">Loading Key Results...</p>
              ) : (
                <div className="client-okrs-portfolio-kr-grid">
                  {summary.keyResults.map((keyResult) => (
                    <PortfolioKrCard
                      analysis={analysesByKeyResultId.get(keyResult.id)}
                      historyState={historyByKeyResultId[keyResult.id]}
                      key={keyResult.id}
                      keyResult={keyResult}
                      onOpen={() => onOpenKeyResult(project, keyResult)}
                    />
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ObjectiveHealthAnalysisCard({
  analysis,
  error,
  isLoading
}: {
  analysis?: AgileObjectiveHealthAnalysis;
  error?: string | null;
  isLoading: boolean;
}) {
  if (isLoading && !analysis) {
    return (
      <section className="client-okrs-objective-health is-loading">
        <div>
          <span className="client-okrs-section-label">AI Health Analysis</span>
          <strong>Analyzing objective health</strong>
        </div>
        <p>Reading Objective, Key Result, and Key Project signals.</p>
      </section>
    );
  }

  if (error && !analysis) {
    return (
      <section className="client-okrs-objective-health is-error">
        <div>
          <span className="client-okrs-section-label">AI Health Analysis</span>
          <strong>Unavailable</strong>
        </div>
        <p>Could not calculate objective health.</p>
      </section>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <section className={`client-okrs-objective-health is-${analysis.status.toLowerCase().replace(/\s+/g, "-")}`}>
      <div>
        <span className="client-okrs-section-label">AI Health Analysis</span>
        <strong>{analysis.status}</strong>
      </div>
      <h4>{analysis.headline}</h4>
      <p>{analysis.summary}</p>
      <div className="client-okrs-objective-health-meter">
        <span>Overall Health</span>
        <div className="client-okrs-progress-track">
          <i style={{ width: `${Math.max(0, Math.min(100, Math.round(analysis.score)))}%` }} />
        </div>
        <strong>{Math.round(analysis.score)}%</strong>
      </div>
    </section>
  );
}

function OkrSummaryCard({
  healthAnalysis,
  healthError,
  isAnalyzingHealth,
  okr,
  okrIndex,
  onOpen
}: {
  healthAnalysis?: AgileObjectiveHealthAnalysis;
  healthError?: string | null;
  isAnalyzingHealth: boolean;
  okr: AgileObjective;
  okrIndex: number;
  onOpen: () => void;
}) {
  const keyResults = getObjectiveKeyResults(okr);
  const overallProgress = computeObjectiveScore(okr);

  return (
    <article
      className="client-okrs-card"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="client-okrs-card-top">
        <div className="client-okrs-card-copy">
          <div className="client-okrs-title-row">
            <h3>{getObjectiveTitle(okr)}</h3>
            <span>{getObjectiveQuarter(okr)}</span>
          </div>
          <p>{getObjectiveDescription(okr)}</p>
        </div>

        <div className="client-okrs-card-meta">
          <strong className={overallProgress === 100 ? "is-complete" : undefined}>{overallProgress}%</strong>
          <StatusBadge status={okr.status} />
        </div>
      </div>

      <ObjectiveHealthAnalysisCard
        analysis={healthAnalysis}
        error={healthError}
        isLoading={isAnalyzingHealth}
      />

      <div className="client-okrs-kr-block">
        <span className="client-okrs-section-label">Key Results</span>
        <div className="client-okrs-kr-list">
          {keyResults.length > 0 ? keyResults.map((keyResult, keyResultIndex) => {
            const progress = normalizeProgress(keyResult.progress);

            return (
              <div className="client-okrs-kr-row" key={keyResult.id}>
                <span className="client-okrs-kr-number">{keyResult.code || `KR ${okrIndex}.${keyResultIndex + 1}`}</span>
                <p>{getKeyResultDisplayTitle(keyResult)}</p>
                <div className="client-okrs-progress-wrap" aria-label={`${progress}%`}>
                  <div className="client-okrs-progress-track">
                    <span
                      className={progress === 100 ? "is-complete" : undefined}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <strong className={progress === 100 ? "is-complete" : undefined}>{progress}%</strong>
                </div>
              </div>
            );
          }) : (
            <div className="client-okrs-kr-row">
              <span className="client-okrs-kr-number">KR</span>
              <p>No key results linked yet</p>
              <div className="client-okrs-progress-wrap" aria-label="0%">
                <div className="client-okrs-progress-track">
                  <span style={{ width: "0%" }} />
                </div>
                <strong>0%</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function OkrDetailModal({
  allObjectives,
  initialTab = "overview",
  initialTargetKeyResultId = null,
  initialKeyResultSentiments,
  keyResultHistoryCache,
  keyProjects,
  okr,
  okrIndex,
  onClose,
  onKeyProjectUpdated,
  onObjectiveUpdated,
  onProjectToast,
  projects
}: {
  allObjectives: AgileObjective[];
  initialTab?: OkrDetailTab;
  initialTargetKeyResultId?: string | null;
  initialKeyResultSentiments: AgileKeyResultSentimentAnalysis[];
  keyResultHistoryCache?: PortfolioKrHistoryCache;
  keyProjects: AgileKeyProject[];
  okr: AgileObjective;
  okrIndex: number;
  onClose: () => void;
  onKeyProjectUpdated: (keyProject: AgileKeyProject, options?: KeyProjectUpdatedOptions) => void;
  onObjectiveUpdated: (objective: AgileObjective) => void;
  onProjectToast: ProjectToastHandler;
  projects: AgileProject[];
}) {
  const {
    ensureKeyResultHistoryBulk,
    ensureProjectData,
    fetchProjectDataSnapshot,
    invalidateKeyResultHistory,
    invalidateProject
  } = useOkrsWorkspaceData();
  const [activeTab, setActiveTab] = useState<OkrDetailTab>(initialTab);
  const [highlightedKeyResultId, setHighlightedKeyResultId] = useState<string | null>(initialTargetKeyResultId);
  const keyResults = getObjectiveKeyResults(okr);
  const [editableObjective, setEditableObjective] = useState<AgileObjective>(okr);
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [editableKeyResults, setEditableKeyResults] = useState<AgileKeyResult[]>(keyResults);
  const [editingKeyResultId, setEditingKeyResultId] = useState<string | null>(null);
  const [activeMetricEditorId, setActiveMetricEditorId] = useState<string | null>(null);
  const [activeHistoryKeyResult, setActiveHistoryKeyResult] = useState<AgileKeyResult | null>(null);
  const [activeKeyProject, setActiveKeyProject] = useState<AgileKeyProject | null>(null);
  const [editableKeyProject, setEditableKeyProject] = useState<AgileKeyProject | null>(null);
  const [isEditingKeyProject, setIsEditingKeyProject] = useState(false);
  const [keyProjectSuggestionTarget, setKeyProjectSuggestionTarget] = useState<AgileKeyProject | null>(null);
  const [isKeyProjectSuggestionOpen, setIsKeyProjectSuggestionOpen] = useState(false);
  const [isLoadingKeyProjectSuggestions, setIsLoadingKeyProjectSuggestions] = useState(false);
  const [keyProjectSuggestionError, setKeyProjectSuggestionError] = useState<string | null>(null);
  const [keyProjectSuggestions, setKeyProjectSuggestions] = useState<AgileKeyProjectKeyResultSuggestion[]>([]);
  const [keyProjectSearchQuery, setKeyProjectSearchQuery] = useState("");
  const [isLinkingKeyProjectResult, setIsLinkingKeyProjectResult] = useState(false);
  const [pendingKeyProjectLinkKeyResult, setPendingKeyProjectLinkKeyResult] = useState<AgileKeyResult | null>(null);
  const [optimisticKeyProjectLinksById, setOptimisticKeyProjectLinksById] = useState<
    Record<string, OptimisticKeyProjectLink>
  >({});
  const [singularKeyProjectsByRecordId, setSingularKeyProjectsByRecordId] = useState<
    Record<string, SingularAgileKeyProjectLinkSnapshot>
  >({});
  const [isKeyProjectNameEditorOpen, setIsKeyProjectNameEditorOpen] = useState(false);
  const [keyProjectNameDraft, setKeyProjectNameDraft] = useState("");
  const [keyProjectTextEditor, setKeyProjectTextEditor] = useState<{
    field: "justification" | "story";
    label: string;
    maxLength: number;
    title: string;
  } | null>(null);
  const [keyProjectTextDraft, setKeyProjectTextDraft] = useState("");
  const [isUpdatingKeyProject, setIsUpdatingKeyProject] = useState(false);
  const [keyProjectUpdateError, setKeyProjectUpdateError] = useState<string | null>(null);
  const [isKeyProjectUpdateConfirmOpen, setIsKeyProjectUpdateConfirmOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isObjectiveUpdateConfirmOpen, setIsObjectiveUpdateConfirmOpen] = useState(false);
  const [pendingKeyResultUpdateId, setPendingKeyResultUpdateId] = useState<string | null>(null);
  const [keyResultSentiments, setKeyResultSentiments] = useState<Record<string, AgileKeyResultSentimentAnalysis>>(() =>
    Object.fromEntries(initialKeyResultSentiments.map((analysis) => [analysis.keyResultId, analysis]))
  );
  const [isAnalyzingKeyResultSentiments, setIsAnalyzingKeyResultSentiments] = useState(false);
  const [keyResultSentimentError, setKeyResultSentimentError] = useState<string | null>(null);
  const [isUpdatingObjective, setIsUpdatingObjective] = useState(false);
  const [objectiveUpdateError, setObjectiveUpdateError] = useState<string | null>(null);
  const [isUpdatingKeyResult, setIsUpdatingKeyResult] = useState(false);
  const [keyResultUpdateError, setKeyResultUpdateError] = useState<string | null>(null);
  const [keyResultSyncStatus, setKeyResultSyncStatus] = useState<KeyResultSyncStatus | null>(null);
  const [localHistoryByKeyResultId, setLocalHistoryByKeyResultId] = useState<PortfolioKrHistoryCache>({});
  const completedKrs = keyResults.filter(isKeyResultComplete).length;
  const progress = computeObjectiveScore(editableObjective);
  const suggestionLines = splitRichTextLines(editableObjective.aiSuggestedKeyResults);
  const quarter = getObjectiveQuarter(editableObjective);
  const keyResultHistorySignature = editableKeyResults.map((keyResult) => keyResult.id).join("|");
  const allProjectKeyResults = getAllObjectiveKeyResults(allObjectives);
  const getHydratedKeyProject = (keyProject: AgileKeyProject | null) => {
    if (!keyProject) {
      return null;
    }

    const optimisticLink = optimisticKeyProjectLinksById[keyProject.id];
    const singularKeyProject = keyProject.sourceRecordId
      ? singularKeyProjectsByRecordId[keyProject.sourceRecordId]
      : undefined;
    const linkedKeyResultIds = optimisticLink?.keyResultIds.length
      ? optimisticLink.keyResultIds
      : singularKeyProject?.keyResultIds.length
        ? singularKeyProject.keyResultIds
        : keyProject.keyResultIds;
    const linkedKeyResultLabels = optimisticLink?.keyResultLabels.length
      ? optimisticLink.keyResultLabels
      : (singularKeyProject?.keyResultLabels?.length ?? 0) > 0
        ? singularKeyProject?.keyResultLabels
        : keyProject.keyResultLabels;

    if (!optimisticLink && !singularKeyProject) {
      return keyProject;
    }

    return {
      ...keyProject,
      keyResultIds: linkedKeyResultIds,
      keyResultLabels: linkedKeyResultLabels
    };
  };
  const activeKeyProjectView = getHydratedKeyProject(editableKeyProject ?? activeKeyProject);
  const keyProjectSuggestionView = keyProjectSuggestionTarget
    ? getHydratedKeyProject(keyProjectSuggestionTarget)
    : activeKeyProjectView;
  const linkedKeyResultsForActiveKeyProject = activeKeyProjectView
    ? allProjectKeyResults.filter(({ keyResult }) => keyProjectHasKeyResult(activeKeyProjectView, keyResult))
    : [];
  const filteredKeyProjectSearchResults = keyProjectSearchQuery.trim()
    ? allProjectKeyResults.filter(({ keyResult, objective }) => {
        const query = keyProjectSearchQuery.trim().toLowerCase();
        return [
          keyResult.code,
          keyResult.title,
          getKeyResultDisplayTitle(keyResult),
          keyResult.metric,
          getObjectiveTitle(objective)
        ].some((value) => value.toLowerCase().includes(query));
      })
    : allProjectKeyResults;

  useEffect(() => {
    const recordIds = keyProjects
      .map((keyProject) => keyProject.sourceRecordId.trim())
      .filter((recordId) => recordId.length > 0);

    if (recordIds.length === 0) {
      return;
    }

    let isCurrent = true;

    void fetchSingularAgileKeyProjects(recordIds)
      .then((payload) => {
        if (!isCurrent) {
          return;
        }

        setSingularKeyProjectsByRecordId((current) => ({
          ...current,
          ...Object.fromEntries(payload.keyProjects.map((keyProject) => [keyProject.id, keyProject]))
        }));
      })
      .catch(() => {
        if (isCurrent) {
          setSingularKeyProjectsByRecordId((current) => current);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [keyProjects]);

  useEffect(() => {
    setActiveTab(initialTab);
    setHighlightedKeyResultId(initialTargetKeyResultId);
    setEditableObjective(okr);
    setIsEditingObjective(false);
    setEditableKeyResults(keyResults);
    setEditingKeyResultId(null);
    setActiveMetricEditorId(null);
    setActiveHistoryKeyResult(null);
    setActiveKeyProject(null);
    setEditableKeyProject(null);
    setIsEditingKeyProject(false);
    setKeyProjectSuggestionTarget(null);
    setIsKeyProjectSuggestionOpen(false);
    setIsLoadingKeyProjectSuggestions(false);
      setKeyProjectSuggestionError(null);
      setKeyProjectSuggestions([]);
      setKeyProjectSearchQuery("");
      setPendingKeyProjectLinkKeyResult(null);
      setOptimisticKeyProjectLinksById({});
      setIsLinkingKeyProjectResult(false);
    setIsKeyProjectNameEditorOpen(false);
    setKeyProjectNameDraft("");
    setKeyProjectTextEditor(null);
    setKeyProjectTextDraft("");
    setIsUpdatingKeyProject(false);
    setKeyProjectUpdateError(null);
    setIsCloseConfirmOpen(false);
    setIsObjectiveUpdateConfirmOpen(false);
    setPendingKeyResultUpdateId(null);
    setKeyResultSentiments({});
    setKeyResultSentimentError(null);
    setObjectiveUpdateError(null);
    setIsUpdatingObjective(false);
    setKeyResultUpdateError(null);
    setIsUpdatingKeyResult(false);
    setKeyResultSyncStatus(null);
    setLocalHistoryByKeyResultId({});
  }, [initialTab, initialTargetKeyResultId, okr.id]);

  useEffect(() => {
    if (activeTab !== "key-results" || !initialTargetKeyResultId) {
      return;
    }

    const targetKeyResultId = initialTargetKeyResultId;
    let animationFrameId = 0;
    function scrollToTarget() {
      animationFrameId = window.requestAnimationFrame(() => {
        const target = findKeyResultDetailElement(targetKeyResultId);

        target?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        setHighlightedKeyResultId(targetKeyResultId);
      });
    }

    const timeoutId = window.setTimeout(scrollToTarget, 120);
    const retryTimeoutId = window.setTimeout(scrollToTarget, 900);
    const clearHighlightTimeoutId = window.setTimeout(() => {
      setHighlightedKeyResultId((current) => (current === targetKeyResultId ? null : current));
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(retryTimeoutId);
      window.clearTimeout(clearHighlightTimeoutId);
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [activeTab, editableKeyResults.length, initialTargetKeyResultId]);

  useEffect(() => {
    setEditableKeyProject(activeKeyProject);
    setIsEditingKeyProject(false);
    setIsUpdatingKeyProject(false);
    setKeyProjectUpdateError(null);
    setIsKeyProjectSuggestionOpen(false);
    setIsLoadingKeyProjectSuggestions(false);
    setKeyProjectSuggestionError(null);
    setKeyProjectSuggestions([]);
    setKeyProjectSearchQuery("");
    setIsLinkingKeyProjectResult(false);
  }, [activeKeyProject?.id]);

  useEffect(() => {
    if (initialKeyResultSentiments.length === 0) {
      return;
    }

    setKeyResultSentiments((current) => ({
      ...current,
      ...Object.fromEntries(initialKeyResultSentiments.map((analysis) => [analysis.keyResultId, analysis]))
    }));
  }, [initialKeyResultSentiments]);

  useEffect(() => {
    let isMounted = true;

    const missingKeyResults = editableKeyResults.filter((keyResult) => !keyResultSentiments[keyResult.id]);

    if (activeTab !== "key-results" || editableKeyResults.length === 0 || missingKeyResults.length === 0) {
      setIsAnalyzingKeyResultSentiments(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadSentiments() {
      setIsAnalyzingKeyResultSentiments(true);
      setKeyResultSentimentError(null);

      try {
        const payload = await analyzeAgileKeyResultSentiments(missingKeyResults);

        if (isMounted) {
          setKeyResultSentiments((current) => ({
            ...current,
            ...Object.fromEntries(payload.analyses.map((analysis) => [analysis.keyResultId, analysis]))
          }));
          setKeyResultSentimentError(payload.message ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setKeyResultSentimentError(
            error instanceof Error
              ? error.message
              : "No fue posible analizar Rose/Bud/Thorn para los Key Results."
          );
        }
      } finally {
        if (isMounted) {
          setIsAnalyzingKeyResultSentiments(false);
        }
      }
    }

    void loadSentiments();

    return () => {
      isMounted = false;
    };
  }, [activeTab, editableKeyResults, keyResultSentiments, okr.id]);

  useEffect(() => {
    setActiveKeyProject(null);
    setActiveMetricEditorId(null);
    setActiveHistoryKeyResult(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "key-results" || editableKeyResults.length === 0) {
      return;
    }

    const missingHistoryKeyResults = editableKeyResults.filter(
      (keyResult) => getKeyResultHistoryState(keyResult.id)?.status !== "ready"
    );
    const missingHistoryIds = missingHistoryKeyResults.map((keyResult) => keyResult.id);

    if (missingHistoryIds.length === 0) {
      return;
    }

    let isMounted = true;

    async function loadKeyResultHistory() {
      const foundationHistoryCache = await ensureKeyResultHistoryBulk(missingHistoryIds);
      const singularFallbackKeyResults = missingHistoryKeyResults.filter((keyResult) => {
        const foundationHistory = foundationHistoryCache[keyResult.id]?.history ?? [];
        return foundationHistory.length === 0 && keyResult.sourceRecordId.trim().length > 0;
      });

      if (singularFallbackKeyResults.length === 0) {
        return;
      }

      const singularHistoryPayload = await fetchSingularAgileKeyResultHistoryBulk(
        singularFallbackKeyResults.map((keyResult) => keyResult.sourceRecordId)
      ).catch(() => null);

      if (!isMounted || !singularHistoryPayload) {
        return;
      }

      setLocalHistoryByKeyResultId((current) => {
        const next = { ...current };

        for (const keyResult of singularFallbackKeyResults) {
          const singularHistory = singularHistoryPayload.historyByKeyResultId[keyResult.sourceRecordId] ?? [];

          if (singularHistory.length > 0) {
            next[keyResult.id] = {
              history: singularHistory,
              status: "ready"
            };
          }
        }

        return next;
      });
    }

    void loadKeyResultHistory();

    return () => {
      isMounted = false;
    };
  }, [activeTab, ensureKeyResultHistoryBulk, keyResultHistoryCache, keyResultHistorySignature, localHistoryByKeyResultId]);

  function getKeyResultHistoryState(keyResultId: string) {
    return localHistoryByKeyResultId[keyResultId] ?? keyResultHistoryCache?.[keyResultId];
  }

  function applyOptimisticLatestHistoryValues(keyResultId: string, values: KeyResultHistoryEditableValues) {
    const historyState = getKeyResultHistoryState(keyResultId);

    if (historyState?.status !== "ready" || historyState.history.length === 0) {
      return;
    }

    const latestPoint = historyState.history.at(-1);
    if (!latestPoint) {
      return;
    }

    setLocalHistoryByKeyResultId((current) => ({
      ...current,
      [keyResultId]: {
        history: historyState.history.map((point) =>
          point.id === latestPoint.id
            ? {
                ...point,
                currentValue: values.currentValue !== undefined ? values.currentValue : point.currentValue,
                initialValue: values.initialValue !== undefined ? values.initialValue : point.initialValue,
                targetValue: values.targetValue !== undefined ? values.targetValue : point.targetValue
              }
            : point
        ),
        status: "ready"
      }
    }));
  }

  function areNullableNumbersEqual(actual: number | null, expected: number | null | undefined) {
    if (expected === undefined) {
      return true;
    }

    if (actual === null || expected === null) {
      return actual === expected;
    }

    return Math.abs(actual - expected) < 0.005;
  }

  function keyResultMatchesExpectedValues(
    keyResult: AgileKeyResult,
    expectedValues: KeyResultHistoryEditableValues
  ) {
    return (
      areNullableNumbersEqual(keyResult.initialValue, expectedValues.initialValue) &&
      areNullableNumbersEqual(keyResult.currentValue, expectedValues.currentValue) &&
      areNullableNumbersEqual(keyResult.targetValue, expectedValues.targetValue)
    );
  }

  function applyOptimisticKeyResultValues(keyResultId: string, values: KeyResultHistoryEditableValues) {
    const nextKeyResults = editableKeyResults.map((keyResult) => {
      if (keyResult.id !== keyResultId) {
        return keyResult;
      }

      const nextKeyResult = {
        ...keyResult,
        currentValue: values.currentValue !== undefined ? values.currentValue : keyResult.currentValue,
        initialValue: values.initialValue !== undefined ? values.initialValue : keyResult.initialValue,
        targetValue: values.targetValue !== undefined ? values.targetValue : keyResult.targetValue
      };

      return {
        ...nextKeyResult,
        progress: calculateKeyResultProgress(
          nextKeyResult.initialValue,
          nextKeyResult.currentValue,
          nextKeyResult.targetValue
        ) ?? nextKeyResult.progress
      };
    });
    const nextObjective = {
      ...editableObjective,
      keyResults: nextKeyResults
    };

    setEditableKeyResults(nextKeyResults);
    setEditableObjective(nextObjective);
    onObjectiveUpdated(nextObjective);
  }

  async function syncKeyResultAfterSingularUpdate(input: {
    expectedValues: KeyResultHistoryEditableValues;
    keyResultId: string;
    projectId: string;
  }) {
    setKeyResultSyncStatus({
      keyResultId: input.keyResultId,
      message: "Waiting for Foundation sync",
      status: "syncing"
    });

    for (let attempt = 0; attempt < keyResultFoundationSyncPollDelays.length; attempt += 1) {
      await wait(keyResultFoundationSyncPollDelays[attempt]);

      try {
        const projectData = await fetchProjectDataSnapshot(input.projectId);
        const syncedObjective = projectData.objectives.find((candidate) => candidate.id === editableObjective.id);
        const syncedKeyResult = syncedObjective
          ? getObjectiveKeyResults(syncedObjective).find((candidate) => candidate.id === input.keyResultId)
          : null;

        if (syncedKeyResult && keyResultMatchesExpectedValues(syncedKeyResult, input.expectedValues)) {
          const historyPayload = await fetchAgileKeyResultHistoryBulk([input.keyResultId]).catch(() => null);
          const nextHistory = historyPayload?.historyByKeyResultId[input.keyResultId];

          if (nextHistory) {
            setLocalHistoryByKeyResultId((current) => ({
              ...current,
              [input.keyResultId]: {
                history: nextHistory,
                status: "ready"
              }
            }));
          }

          if (syncedObjective) {
            setEditableObjective((currentObjective) => {
              if (currentObjective.id !== syncedObjective.id) {
                return currentObjective;
              }

              return {
                ...currentObjective,
                keyResults: getObjectiveKeyResults(syncedObjective)
              };
            });
            setEditableKeyResults(getObjectiveKeyResults(syncedObjective));
          }

          setKeyResultSyncStatus({
            keyResultId: input.keyResultId,
            message: "Foundation sync complete",
            status: "synced"
          });
          window.setTimeout(() => {
            setKeyResultSyncStatus((current) =>
              current?.keyResultId === input.keyResultId && current.status === "synced" ? null : current
            );
          }, 1800);
          return;
        }
      } catch {
        // Keep polling; the user already sees the optimistic update.
      }
    }

    setKeyResultSyncStatus({
      keyResultId: input.keyResultId,
      message: "Foundation sync is still pending",
      status: "timeout"
    });
  }

  function updateEditableKeyResult(keyResultId: string, changes: Partial<AgileKeyResult>) {
    const shouldRecalculateProgress =
      "initialValue" in changes || "currentValue" in changes || "targetValue" in changes;

    setEditableKeyResults((currentKeyResults) =>
      currentKeyResults.map((keyResult) => {
        if (keyResult.id !== keyResultId) {
          return keyResult;
        }

        const nextKeyResult = {
          ...keyResult,
          ...changes
        };

        if (shouldRecalculateProgress) {
          nextKeyResult.initialValue = normalizeNullablePercentDecimalValue(nextKeyResult.initialValue);
          nextKeyResult.currentValue = normalizeNullablePercentDecimalValue(nextKeyResult.currentValue);
          nextKeyResult.targetValue = normalizeNullablePercentDecimalValue(nextKeyResult.targetValue);
        }

        const recalculatedProgress = shouldRecalculateProgress
          ? calculateKeyResultProgress(
              nextKeyResult.initialValue,
              nextKeyResult.currentValue,
              nextKeyResult.targetValue
            )
          : null;

        return {
          ...nextKeyResult,
          progress: recalculatedProgress ?? nextKeyResult.progress
        };
      })
    );
  }

  function updateEditableObjective(changes: Partial<AgileObjective>) {
    setEditableObjective((currentObjective) => ({
      ...currentObjective,
      ...changes
    }));
  }

  function updateEditableKeyProject(changes: Partial<AgileKeyProject>) {
    setEditableKeyProject((currentKeyProject) =>
      currentKeyProject
        ? {
            ...currentKeyProject,
            ...changes
          }
        : currentKeyProject
    );
  }

  function discardEditableKeyResultChanges(keyResultId: string) {
    const originalKeyResult = keyResults.find((candidate) => candidate.id === keyResultId);

    if (originalKeyResult) {
      setEditableKeyResults((currentKeyResults) =>
        currentKeyResults.map((keyResult) =>
          keyResult.id === keyResultId ? originalKeyResult : keyResult
        )
      );
    }

    setEditingKeyResultId(null);
    setActiveMetricEditorId(null);
    setPendingKeyResultUpdateId(null);
    setKeyResultUpdateError(null);
  }

  function discardEditableObjectiveChanges() {
    setEditableObjective(okr);
    setIsEditingObjective(false);
    setIsObjectiveUpdateConfirmOpen(false);
    setObjectiveUpdateError(null);
  }

  function discardEditableKeyProjectChanges() {
    setEditableKeyProject(activeKeyProject);
    setIsEditingKeyProject(false);
    setIsKeyProjectUpdateConfirmOpen(false);
    setIsKeyProjectNameEditorOpen(false);
    setKeyProjectNameDraft("");
    setKeyProjectTextEditor(null);
    setKeyProjectTextDraft("");
    setKeyProjectUpdateError(null);
  }

  function openKeyProjectNameEditor() {
    if (!activeKeyProjectView) {
      return;
    }

    setKeyProjectNameDraft(activeKeyProjectView.name);
    setIsKeyProjectNameEditorOpen(true);
  }

  function applyKeyProjectNameDraft() {
    const nextName = keyProjectNameDraft.trim();

    if (!nextName) {
      setKeyProjectUpdateError("Epic Name no puede estar vacío.");
      return;
    }

    updateEditableKeyProject({ name: nextName });
    setIsKeyProjectNameEditorOpen(false);
    setKeyProjectNameDraft("");
    setKeyProjectUpdateError(null);
  }

  function openKeyProjectTextEditor(input: {
    field: "justification" | "story";
    label: string;
    maxLength: number;
    title: string;
    value: string;
  }) {
    setKeyProjectTextEditor({
      field: input.field,
      label: input.label,
      maxLength: input.maxLength,
      title: input.title
    });
    setKeyProjectTextDraft(input.value);
  }

  function closeKeyProjectTextEditor() {
    setKeyProjectTextEditor(null);
    setKeyProjectTextDraft("");
  }

  function applyKeyProjectTextDraft() {
    if (!keyProjectTextEditor) {
      return;
    }

    updateEditableKeyProject({
      [keyProjectTextEditor.field]: keyProjectTextDraft.trim()
    });
    closeKeyProjectTextEditor();
    setKeyProjectUpdateError(null);
  }

  async function saveEditableKeyProject() {
    if (!editableKeyProject) {
      return;
    }

    const sourceKeyProjectId = editableKeyProject.sourceRecordId.trim();
    const keyProjectName = editableKeyProject.name.trim();

    if (!sourceKeyProjectId) {
      const message = "Este Key Project no tiene sourceRecordId / record_id configurado para actualizarlo en Singular AGILE.";
      setKeyProjectUpdateError(message);
      onProjectToast("error", "No se pudo guardar el Key Project", message);
      return;
    }

    if (!keyProjectName) {
      const message = "Epic Name no puede estar vacío.";
      setKeyProjectUpdateError(message);
      onProjectToast("error", "No se pudo guardar el Key Project", message);
      return;
    }

    const updateInput: SingularAgileKeyProjectUpdateInput = {
      clarity: editableKeyProject.clarity,
      dontShowInSingularStories: editableKeyProject.dontShowInSingularStories,
      epicStory: editableKeyProject.story,
      justification: editableKeyProject.justification,
      name: keyProjectName,
      recordId: sourceKeyProjectId,
      status: editableKeyProject.status,
      strategicFocus: editableKeyProject.strategicFocus,
      valueOrientation: editableKeyProject.valueOrientation
    };

    const updatedKeyProject: AgileKeyProject = {
      ...editableKeyProject,
      name: keyProjectName
    };

    setIsUpdatingKeyProject(true);
    setKeyProjectUpdateError(null);

    try {
      await updateSingularAgileKeyProject(updateInput);
      setActiveKeyProject(updatedKeyProject);
      setEditableKeyProject(updatedKeyProject);
      setIsEditingKeyProject(false);
      setIsKeyProjectUpdateConfirmOpen(false);
      onKeyProjectUpdated(updatedKeyProject, { silent: true });
      invalidateProject(editableObjective.projectIds[0]);
      onProjectToast("success", "Key Project guardado", "Los cambios se guardaron correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible actualizar el Key Project.";
      setKeyProjectUpdateError(message);
      onProjectToast("error", "No se pudo guardar el Key Project", message);
    } finally {
      setIsUpdatingKeyProject(false);
    }
  }

  async function openKeyProjectSuggestionModal(targetKeyProject = activeKeyProjectView) {
    if (!targetKeyProject) {
      return;
    }

    setKeyProjectSuggestionTarget(targetKeyProject);
    setIsKeyProjectSuggestionOpen(true);
    setIsLoadingKeyProjectSuggestions(true);
    setKeyProjectSuggestionError(null);
    setKeyProjectSearchQuery("");

    try {
      const payload = await suggestKeyResultsForKeyProject({
        keyProject: {
          id: targetKeyProject.id,
          justification: targetKeyProject.justification,
          keyProjectId: targetKeyProject.keyProjectId,
          name: targetKeyProject.name,
          story: targetKeyProject.story
        },
        objectives: allObjectives,
        projectId: targetKeyProject.projectIds[0] ?? editableObjective.projectIds[0] ?? "",
        projectName: getProjectNames(targetKeyProject.projectIds)
      });

      setKeyProjectSuggestions(payload.suggestions);
    } catch (error) {
      setKeyProjectSuggestions([]);
      setKeyProjectSuggestionError(
        error instanceof Error ? error.message : "No fue posible sugerir Key Results."
      );
    } finally {
      setIsLoadingKeyProjectSuggestions(false);
    }
  }

  function requestLinkKeyProjectToKeyResult(keyResult: AgileKeyResult) {
    if (!keyProjectSuggestionView) {
      return;
    }

    const sourceKeyProjectId = keyProjectSuggestionView.sourceRecordId.trim();
    if (!sourceKeyProjectId) {
      setKeyProjectSuggestionError("Este Key Project no tiene sourceRecordId para actualizarlo en Singular AGILE.");
      return;
    }

    const keyResultLinkId = getKeyResultLinkId(keyResult).trim();
    if (!keyResultLinkId) {
      setKeyProjectSuggestionError("Este Key Result no tiene record id disponible para vincularlo.");
      return;
    }

    setKeyProjectSuggestionError(null);
    setPendingKeyProjectLinkKeyResult(keyResult);
  }

  async function linkKeyProjectToKeyResult(keyResult: AgileKeyResult) {
    if (!keyProjectSuggestionView) {
      return;
    }

    const sourceKeyProjectId = keyProjectSuggestionView.sourceRecordId.trim();
    if (!sourceKeyProjectId) {
      setKeyProjectSuggestionError("Este Key Project no tiene sourceRecordId para actualizarlo en Singular AGILE.");
      return;
    }

    const keyResultLinkId = getKeyResultLinkId(keyResult).trim();
    if (!keyResultLinkId) {
      setKeyProjectSuggestionError("Este Key Result no tiene record id disponible para vincularlo.");
      return;
    }

    setIsLinkingKeyProjectResult(true);
    setKeyProjectSuggestionError(null);

    try {
      await updateSingularAgileKeyProject({
        keyResultIds: [keyResultLinkId],
        recordId: sourceKeyProjectId
      });

      const keyResultLabel = getKeyResultDisplayTitle(keyResult);
      const updatedKeyProject = {
        ...keyProjectSuggestionView,
        keyResultIds: [keyResultLinkId],
        keyResultLabels: [keyResultLabel]
      };
      setOptimisticKeyProjectLinksById((current) => ({
        ...current,
        [updatedKeyProject.id]: {
          keyResultIds: [keyResultLinkId],
          keyResultLabels: [keyResultLabel],
          status: "pending"
        }
      }));
      setSingularKeyProjectsByRecordId((current) => ({
        ...current,
        [sourceKeyProjectId]: {
          id: sourceKeyProjectId,
          keyResultIds: [keyResultLinkId],
          keyResultLabels: [keyResultLabel],
          name: updatedKeyProject.name
        }
      }));

      if (activeKeyProject?.id === updatedKeyProject.id) {
        setActiveKeyProject(updatedKeyProject);
        setEditableKeyProject(updatedKeyProject);
      }
      setIsKeyProjectSuggestionOpen(false);
      setKeyProjectSuggestionTarget(null);
      setPendingKeyProjectLinkKeyResult(null);
      setKeyProjectSuggestions([]);
      setKeyProjectSearchQuery("");
      onKeyProjectUpdated(updatedKeyProject);
      onProjectToast("success", "KR linked", "The Key Result was assigned to this Key Project.");
      void fetchSingularAgileKeyProjects([sourceKeyProjectId])
        .then((payload) => {
          const confirmedKeyProject = payload.keyProjects.find((candidate) => candidate.id === sourceKeyProjectId);

          if (!confirmedKeyProject) {
            return;
          }

          setSingularKeyProjectsByRecordId((current) => ({
            ...current,
            [sourceKeyProjectId]: confirmedKeyProject
          }));

          const isConfirmed = confirmedKeyProject.keyResultIds.includes(keyResultLinkId);
          if (isConfirmed) {
            setOptimisticKeyProjectLinksById((current) => ({
              ...current,
              [updatedKeyProject.id]: {
                keyResultIds: [keyResultLinkId],
                keyResultLabels: [keyResultLabel],
                status: "synced"
              }
            }));
          }
        })
        .catch(() => {
          setOptimisticKeyProjectLinksById((current) => current);
        });
      const projectId = keyProjectSuggestionView.projectIds[0];
      if (projectId) {
        invalidateProject(projectId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible vincular el Key Project al Key Result.";
      setKeyProjectSuggestionError(
        message
      );
      onProjectToast("error", "KR link failed", message);
    } finally {
      setIsLinkingKeyProjectResult(false);
    }
  }

  async function saveEditableObjective() {
    const project = projects.find((candidate) => candidate.id === editableObjective.projectIds[0]) ?? null;
    const sourceObjectiveId = editableObjective.recordId.trim();

    if (!sourceObjectiveId) {
      const message = "Este Objective no tiene sourceRecordId / record_id configurado para actualizarlo en Singular AGILE.";
      setObjectiveUpdateError(message);
      setIsObjectiveUpdateConfirmOpen(false);
      onProjectToast("error", "No se pudo guardar el Objective", message);
      return;
    }

    setIsUpdatingObjective(true);
    setObjectiveUpdateError(null);

    try {
      const response = await fetch(updateObjectiveWebhookUrl, {
        body: JSON.stringify(buildObjectiveUpdatePayload({ objective: editableObjective, project })),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload = await readWebhookResponse(response);

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.message ?? "No fue posible actualizar el Objective en N8n.");
      }

      setIsEditingObjective(false);
      setIsObjectiveUpdateConfirmOpen(false);
      onObjectiveUpdated(editableObjective);
      onProjectToast("success", "Objective guardado", "Los cambios se guardaron correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible actualizar el Objective.";
      setObjectiveUpdateError(message);
      onProjectToast("error", "No se pudo guardar el Objective", message);
    } finally {
      setIsUpdatingObjective(false);
    }
  }

  async function saveEditableKeyResult(keyResultId: string) {
    const keyResult = editableKeyResults.find((candidate) => candidate.id === keyResultId);
    const originalKeyResult = keyResults.find((candidate) => candidate.id === keyResultId) ?? null;
    const project = projects.find((candidate) => candidate.id === editableObjective.projectIds[0]) ?? null;

    if (!keyResult) {
      setPendingKeyResultUpdateId(null);
      return;
    }

    if (!project?.sourceRecordId?.trim()) {
      const message = "Este Project no tiene sourceRecordId configurado para actualizar KRs en Singular AGILE.";
      setKeyResultUpdateError(message);
      setPendingKeyResultUpdateId(null);
      onProjectToast("error", "No se pudo guardar el Key Result", message);
      return;
    }

    if (!editableObjective.recordId.trim()) {
      const message = "Este Objective no tiene sourceRecordId / record_id configurado para actualizar KRs en Singular AGILE.";
      setKeyResultUpdateError(message);
      setPendingKeyResultUpdateId(null);
      onProjectToast("error", "No se pudo guardar el Key Result", message);
      return;
    }

    if (!keyResult.sourceRecordId.trim()) {
      const message = "Este Key Result no tiene sourceRecordId / record_id configurado para actualizarlo en Singular AGILE.";
      setKeyResultUpdateError(message);
      setPendingKeyResultUpdateId(null);
      onProjectToast("error", "No se pudo guardar el Key Result", message);
      return;
    }

    setIsUpdatingKeyResult(true);
    setKeyResultUpdateError(null);

    try {
      const response = await fetch(updateKeyResultWebhookUrl, {
        body: JSON.stringify(buildKeyResultUpdatePayload({ keyResult, objective: editableObjective, originalKeyResult, project })),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload = await readWebhookResponse(response);

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.message ?? "No fue posible actualizar el Key Result en N8n.");
      }

      const nextObjective = {
        ...editableObjective,
        keyResults: editableKeyResults
      };
      const projectId = editableObjective.projectIds[0] ?? "";
      const expectedValues = {
        currentValue: keyResult.currentValue,
        initialValue: keyResult.initialValue,
        targetValue: keyResult.targetValue
      };

      setEditableObjective(nextObjective);
      applyOptimisticLatestHistoryValues(keyResult.id, expectedValues);
      setEditingKeyResultId(null);
      setPendingKeyResultUpdateId(null);
      onObjectiveUpdated(nextObjective);
      if (projectId) {
        void syncKeyResultAfterSingularUpdate({
          expectedValues,
          keyResultId: keyResult.id,
          projectId
        });
      }
      onProjectToast("success", "Key Result guardado", "Los cambios se guardaron correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible actualizar el Key Result.";
      setKeyResultUpdateError(message);
      onProjectToast("error", "No se pudo guardar el Key Result", message);
    } finally {
      setIsUpdatingKeyResult(false);
    }
  }

  function getProjectNames(projectIds: string[]) {
    if (projectIds.length === 0) return "Not set";

    return projectIds
      .map((projectId) => projects.find((project) => project.id === projectId)?.name ?? projectId)
      .join(", ");
  }

  return (
    <div className="client-okrs-modal-layer" role="presentation">
      <button
        aria-label="Confirm close OKR detail"
        className="client-okrs-modal-backdrop"
        onClick={() => setIsCloseConfirmOpen(true)}
        type="button"
      />
      <aside aria-modal="true" className="client-okrs-modal client-okrs-side-sheet" role="dialog">
        {activeKeyProject ? null : (
          <div className="client-okrs-sheet-toolbar">
            <div className="client-okrs-detail-tabs" role="tablist" aria-label="OKR detail sections">
              {([
                ["overview", "Overview"],
                ["key-results", "Key Results"],
                ["key-projects", "Key Projects"],
                ["stories", "Stories"]
              ] as Array<[OkrDetailTab, string]>).map(([tab, label]) => (
                <button
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? "is-active" : undefined}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <button aria-label="Close OKR detail" className="client-okrs-sheet-close" onClick={onClose} type="button">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}

        {activeTab === "overview" ? (
          <div className="client-okrs-detail-stack">
            <section className="client-okrs-detail-card">
              <div className="client-okrs-objective-actions">
                <span className="client-okrs-section-label">Objective</span>
                <button
                  aria-label={isEditingObjective ? "Save Objective" : "Edit Objective"}
                  className={`client-okrs-kr-edit-button${isEditingObjective ? " is-editing" : ""}`}
                  disabled={isUpdatingObjective}
                  onClick={() => {
                    if (!isEditingObjective) {
                      setObjectiveUpdateError(null);
                      setIsEditingObjective(true);
                      return;
                    }

                    setIsObjectiveUpdateConfirmOpen(true);
                  }}
                  type="button"
                >
                  {isEditingObjective ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  )}
                </button>
              </div>
              {objectiveUpdateError ? <p className="client-okrs-sentiment-error">{objectiveUpdateError}</p> : null}
              <div className="client-okrs-detail-heading-row">
                {isEditingObjective ? (
                  <textarea
                    aria-label="Objective title"
                    className="client-okrs-objective-title-input"
                    onChange={(event) => updateEditableObjective({ objective: event.target.value })}
                    value={getObjectiveTitle(editableObjective)}
                  />
                ) : (
                  <h2>{getObjectiveTitle(editableObjective)}</h2>
                )}
                <StatusBadge status={editableObjective.status} />
              </div>
              {isEditingObjective ? (
                <textarea
                  aria-label="Objective description"
                  className="client-okrs-objective-description-input"
                  onChange={(event) => updateEditableObjective({ description: event.target.value })}
                  value={getObjectiveDescription(editableObjective)}
                />
              ) : (
                <p>{getObjectiveDescription(editableObjective)}</p>
              )}
              <div className="client-okrs-meta-grid">
                <DetailMetaItem label="Quarter" value={editableObjective.quarter} />
                <EditableObjectiveStatusItem
                  isEditing={isEditingObjective}
                  onChange={(value) => updateEditableObjective({ status: value })}
                  value={editableObjective.status}
                />
                <EditableMetaItem
                  isEditing={isEditingObjective}
                  label="Priority"
                  onChange={(value) => updateEditableObjective({ priority: value })}
                  value={editableObjective.priority}
                />
                <EditableMetaItem
                  isEditing={isEditingObjective}
                  label="Type"
                  onChange={(value) => updateEditableObjective({ type: value })}
                  value={editableObjective.type}
                />
                <EditableMetaItem
                  isEditing={isEditingObjective}
                  label="Target Date"
                  onChange={(value) => updateEditableObjective({ targetDate: value })}
                  type="date"
                  value={editableObjective.targetDate}
                />
                <DetailMetaItem label="Owner" value={editableObjective.poUserLabel} />
                <EditableMetaItem
                  className="is-wide"
                  isEditing={isEditingObjective}
                  label="Metric"
                  onChange={(value) => updateEditableObjective({ metric: value })}
                  title={editableObjective.metric}
                  value={editableObjective.metric}
                />
              </div>
            </section>

            <section className="client-okrs-detail-card">
              <div className="client-okrs-progress-head">
                <span>Objective Score</span>
                <div>
                  <strong>{progress}%</strong>
                  <p>{completedKrs}/{keyResults.length} Key Results complete</p>
                </div>
              </div>
              {isEditingObjective ? (
                <input
                  aria-label="Objective score"
                  className="client-okrs-objective-score-input"
                  max={100}
                  min={0}
                  onChange={(event) => updateEditableObjective({ score: parseNullableNumber(event.target.value) })}
                  step={0.1}
                  type="number"
                  value={editableObjective.score === null ? "" : String(progress)}
                />
              ) : null}
              <div className="client-okrs-progress-track is-wide">
                <span style={{ width: `${progress}%` }} />
              </div>
            </section>

            <section className="client-okrs-detail-card">
              <div className="client-okrs-detail-card-head">
                <span>Performance</span>
                <small>{quarter}</small>
              </div>
              <div className="client-okrs-performance-grid">
                <div>
                  <span>Key Results</span>
                  <strong>{completedKrs}/{keyResults.length}</strong>
                  <div className="client-okrs-progress-track">
                    <span style={{ width: `${keyResults.length > 0 ? Math.round((completedKrs / keyResults.length) * 100) : 0}%` }} />
                  </div>
                  <p>{Math.max(keyResults.length - completedKrs, 0)} active</p>
                </div>
                <div>
                  <span>Key Projects</span>
                  <strong>{keyProjects.length}</strong>
                  <div className="client-okrs-progress-track">
                    <span style={{ width: `${keyProjects.length > 0 ? Math.round(keyProjects.reduce((total, keyProject) => total + keyProject.qualityScore, 0) / keyProjects.length) : 0}%` }} />
                  </div>
                  <p>{keyProjects.length > 0 ? "Project-level delivery scope" : "Pending Key Project setup"}</p>
                </div>
                <div>
                  <span>Score</span>
                  <strong>{progress}%</strong>
                  <div className="client-okrs-progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <p>Objective score</p>
                </div>
              </div>
            </section>

            <section className="client-okrs-detail-card">
              <div className="client-okrs-ai-title">
                <strong>Explanation</strong>
              </div>
              {isEditingObjective ? (
                <textarea
                  aria-label="Objective explanation"
                  className="client-okrs-objective-rich-input"
                  onChange={(event) => updateEditableObjective({ explanation: event.target.value })}
                  value={editableObjective.explanation}
                />
              ) : (
                <p>{displayValue(editableObjective.explanation)}</p>
              )}
            </section>

            <section className="client-okrs-detail-card">
              <div className="client-okrs-ai-title">
                <span aria-hidden="true">✦</span>
                <strong>AI Suggested Key Results</strong>
              </div>
              {isEditingObjective ? (
                <textarea
                  aria-label="AI suggested key results"
                  className="client-okrs-objective-rich-input"
                  onChange={(event) => updateEditableObjective({ aiSuggestedKeyResults: event.target.value })}
                  value={editableObjective.aiSuggestedKeyResults}
                />
              ) : suggestionLines.length > 0 ? (
                <ul className="client-okrs-suggestion-list">
                  {suggestionLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p>Not set</p>
              )}
            </section>

          </div>
        ) : null}

        {activeTab === "key-results" ? (
          <div className="client-okrs-detail-stack">
            <span className="client-okrs-section-label">Key Results</span>
            {keyResultSentimentError ? (
              <p className="client-okrs-sentiment-error">{keyResultSentimentError}</p>
            ) : null}
            {keyResultUpdateError ? (
              <p className="client-okrs-sentiment-error">{keyResultUpdateError}</p>
            ) : null}
            {keyResultSyncStatus ? (
              <p className={`client-okrs-sync-inline is-${keyResultSyncStatus.status}`}>
                {keyResultSyncStatus.message}
              </p>
            ) : null}
            {editableKeyResults.length > 0 ? (
              <article className="client-okrs-kr-detail-card">
                {editableKeyResults.map((keyResult, keyResultIndex) => {
                  const keyResultProgress = normalizeProgress(keyResult.progress);
                  const isEditingKeyResult = editingKeyResultId === keyResult.id;
                  const keyResultCode = keyResult.code || `KR ${okrIndex}.${keyResultIndex + 1}`;
                  const sentimentAnalysis = keyResultSentiments[keyResult.id];

                  return (
                  <div
                    className={`client-okrs-kr-real-detail${highlightedKeyResultId === keyResult.id ? " is-scroll-target" : ""}`}
                    data-key-result-detail-id={keyResult.id}
                    key={keyResult.id}
                  >
                    <div className="client-okrs-kr-detail-main">
                      <div className="client-okrs-kr-detail-title">
                        {isEditingKeyResult ? (
                          <input
                            aria-label="Key Result code"
                            className="client-okrs-kr-code-input"
                            onChange={(event) => updateEditableKeyResult(keyResult.id, { code: event.target.value })}
                            value={keyResultCode}
                          />
                        ) : (
                          <span>{keyResultCode}</span>
                        )}
                        {isEditingKeyResult ? (
                          <input
                            aria-label="Key Result title"
                            className="client-okrs-kr-title-input"
                            onChange={(event) => updateEditableKeyResult(keyResult.id, { title: event.target.value })}
                            value={keyResult.title}
                          />
                        ) : (
                          <h3>{getKeyResultDisplayTitle(keyResult)}</h3>
                        )}
                        <KeyResultSentimentBadge
                          analysis={sentimentAnalysis}
                          isLoading={isAnalyzingKeyResultSentiments}
                        />
                      </div>
                      <div className="client-okrs-kr-detail-progress">
                        <div className="client-okrs-progress-track">
                          <span style={{ width: `${keyResultProgress}%` }} />
                        </div>
                        {isEditingKeyResult ? (
                          <input
                            aria-label="Key Result progress"
                            className="client-okrs-kr-progress-input"
                            onChange={(event) =>
                              updateEditableKeyResult(keyResult.id, {
                                progress: parseProgressInputValue(event.target.value)
                              })
                            }
                            type="text"
                            value={formatProgressValue(keyResultProgress)}
                          />
                        ) : (
                          <strong>{formatProgressValue(keyResultProgress)}</strong>
                        )}
                        <div className="client-okrs-kr-action-group">
                          <button
                            aria-label="View Key Result history"
                            className={`client-okrs-kr-edit-button client-okrs-kr-history-button${activeHistoryKeyResult?.id === keyResult.id ? " is-editing" : ""}`}
                            onClick={() => {
                              setActiveHistoryKeyResult(keyResult);
                              setActiveMetricEditorId(null);
                            }}
                            title="View Key Result history"
                            type="button"
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M4 19h16" />
                              <path d="M6 16 10 11l4 3 4-7" />
                              <path d="M18 7h-4" />
                              <path d="M18 7v4" />
                            </svg>
                          </button>
                          <button
                            aria-label={isEditingKeyResult ? "Finish editing Key Result" : "Edit Key Result"}
                            className={`client-okrs-kr-edit-button${isEditingKeyResult ? " is-editing" : ""}`}
                            disabled={isUpdatingKeyResult}
                            onClick={() => {
                              setKeyResultUpdateError(null);
                              if (isEditingKeyResult) {
                                setPendingKeyResultUpdateId(keyResult.id);
                              } else {
                                setEditingKeyResultId(keyResult.id);
                              }
                              setActiveMetricEditorId(null);
                            }}
                            type="button"
                          >
                            {isEditingKeyResult ? (
                              <svg aria-hidden="true" viewBox="0 0 24 24">
                                <path d="m20 6-11 11-5-5" />
                              </svg>
                            ) : (
                              <svg aria-hidden="true" viewBox="0 0 24 24">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="client-okrs-kr-detail-content">
                      <KeyResultInlineHistoryChart
                        historyState={getKeyResultHistoryState(keyResult.id)}
                        sentimentAnalysis={sentimentAnalysis}
                      />
                      <div className="client-okrs-kr-metric-grid">
                        <EditableMetricItem
                          isEditing={isEditingKeyResult}
                          isOpen={activeMetricEditorId === keyResult.id}
                          onChange={(value) => updateEditableKeyResult(keyResult.id, { metric: value })}
                          onClose={() => setActiveMetricEditorId(null)}
                          onOpen={() => setActiveMetricEditorId(keyResult.id)}
                          value={keyResult.metric || okr.metric}
                        />
                        <EditableStatusItem
                          isEditing={isEditingKeyResult}
                          onChange={(value) => updateEditableKeyResult(keyResult.id, { status: value })}
                          value={keyResult.status}
                        />
                        <EditableMetaItem
                          isEditing={isEditingKeyResult}
                          label="Target Date"
                          onChange={(value) => updateEditableKeyResult(keyResult.id, { targetDate: value })}
                          type="date"
                          value={keyResult.targetDate || okr.targetDate}
                        />
                        <EditablePercentItem
                          isEditing={isEditingKeyResult}
                          label="Initial"
                          onChange={(value) => updateEditableKeyResult(keyResult.id, { initialValue: value })}
                          value={keyResult.initialValue}
                        />
                        <EditablePercentItem
                          isEditing={isEditingKeyResult}
                          label="Current"
                          onChange={(value) => updateEditableKeyResult(keyResult.id, { currentValue: value })}
                          value={keyResult.currentValue}
                        />
                        <EditablePercentItem
                          isEditing={isEditingKeyResult}
                          label="Target"
                          onChange={(value) => updateEditableKeyResult(keyResult.id, { targetValue: value })}
                          value={keyResult.targetValue}
                        />
                      </div>
                    </div>
                    <KeyResultAiReadout
                      analysis={sentimentAnalysis}
                      isLoading={isAnalyzingKeyResultSentiments}
                    />
                    {isEditingKeyResult ? (
                      <textarea
                        aria-label="Key Result explanation"
                        className="client-okrs-kr-explanation-input"
                        onChange={(event) => updateEditableKeyResult(keyResult.id, { explanation: event.target.value })}
                        value={keyResult.explanation}
                      />
                    ) : null}
                  </div>
                )})}
              </article>
            ) : (
              <article className="client-okrs-detail-card">
                <p>No Key Results are linked to this objective yet.</p>
              </article>
            )}
          </div>
        ) : null}

        {activeTab === "key-projects" ? (
          <div className="client-okrs-detail-stack">
            {activeKeyProjectView ? (
              <>
                <button
                  className="client-okrs-detail-inline-back"
                  onClick={() => {
                    setActiveKeyProject(null);
                    setEditableKeyProject(null);
                    setIsEditingKeyProject(false);
                    setIsKeyProjectUpdateConfirmOpen(false);
                    setIsKeyProjectNameEditorOpen(false);
                    setKeyProjectNameDraft("");
                    setKeyProjectTextEditor(null);
                    setKeyProjectTextDraft("");
                    setKeyProjectUpdateError(null);
                  }}
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                  </svg>
                  Back to Key Projects
                </button>

                <section className="client-okrs-detail-card client-okrs-key-project-detail">
                  <div className="client-okrs-key-project-actions">
                    <button
                      aria-label={isEditingKeyProject ? "Save Key Project changes" : "Edit Key Project"}
                      className={`client-okrs-kr-edit-button${isEditingKeyProject ? " is-editing" : ""}`}
                      disabled={isUpdatingKeyProject}
                      onClick={() => {
                        if (isEditingKeyProject) {
                          setIsKeyProjectUpdateConfirmOpen(true);
                          return;
                        }

                        setIsEditingKeyProject(true);
                        setKeyProjectUpdateError(null);
                      }}
                      type="button"
                    >
                      {isEditingKeyProject ? (
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                          <path d="M17 21v-8H7v8" />
                          <path d="M7 3v5h8" />
                        </svg>
                      ) : (
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      )}
                    </button>
                    {isEditingKeyProject ? (
                      <button
                        className="client-okrs-detail-inline-back client-okrs-key-project-cancel"
                        disabled={isUpdatingKeyProject}
                        onClick={discardEditableKeyProjectChanges}
                        type="button"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                  {keyProjectUpdateError ? <p className="client-okrs-sentiment-error">{keyProjectUpdateError}</p> : null}
                  <div className="client-okrs-detail-heading-row">
                    <div>
                      <span className="client-okrs-section-label">Key Project</span>
                      {isEditingKeyProject ? (
                        <div className="client-okrs-key-project-title-edit">
                          <h2>{activeKeyProjectView.name || "Untitled Key Project"}</h2>
                          <button
                            aria-label="Edit Epic Name"
                            onClick={openKeyProjectNameEditor}
                            type="button"
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <h2>{activeKeyProjectView.name || "Untitled Key Project"}</h2>
                      )}
                    </div>
                    {isEditingKeyProject ? (
                      <select
                        aria-label="Key Project status"
                        className="client-okrs-key-project-status-select"
                        onChange={(event) => updateEditableKeyProject({ status: event.target.value })}
                        value={activeKeyProjectView.status || keyProjectStatusOptions[0]}
                      >
                        {keyProjectStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`client-okrs-related-key-project-status${getKeyProjectStatusClass(activeKeyProjectView.status)}`}>
                        {activeKeyProjectView.status || "Not set"}
                      </span>
                    )}
                  </div>

                  <section className="client-okrs-key-project-section">
                    <div className="client-okrs-detail-card-head">
                      <span>Project Scope</span>
                    </div>
                    <div className="client-okrs-meta-grid">
                      <DetailMetaItem label="Project" value={getProjectNames(activeKeyProjectView.projectIds)} />
                      <DetailMetaItem label="Total Stories" value={activeKeyProjectView.totalStories === null ? "Not set" : String(activeKeyProjectView.totalStories)} />
                      {isEditingKeyProject ? (
                        <label className="client-okrs-meta-item is-editing">
                          <span>Visibility</span>
                          <select
                            onChange={(event) =>
                              updateEditableKeyProject({
                                dontShowInSingularStories: event.target.value === "hidden"
                              })
                            }
                            value={activeKeyProjectView.dontShowInSingularStories ? "hidden" : "shown"}
                          >
                            <option value="shown">Shown in Singular Stories</option>
                            <option value="hidden">Hidden in Singular Stories</option>
                          </select>
                        </label>
                      ) : (
                        <DetailMetaItem label="Visibility" value={activeKeyProjectView.dontShowInSingularStories ? "Hidden in Singular Stories" : "Shown in Singular Stories"} />
                      )}
                    </div>
                  </section>

                  <section className="client-okrs-key-project-section">
                    <div className="client-okrs-detail-card-head">
                      <span>Related Key Result</span>
                      <button
                        className="client-okrs-key-project-suggest-button"
                        disabled={isLinkingKeyProjectResult || allProjectKeyResults.length === 0}
                        onClick={() => void openKeyProjectSuggestionModal()}
                        type="button"
                      >
                        Suggest KR
                      </button>
                    </div>
                    {linkedKeyResultsForActiveKeyProject.length > 0 ? (
                      <div className="client-okrs-kp-linked-kr-list">
                        {linkedKeyResultsForActiveKeyProject.map(({ keyResult, objective }) => (
                          <article key={keyResult.id}>
                            <span>{keyResult.code || "KR"}</span>
                            <div>
                              <strong>{getKeyResultDisplayTitle(keyResult)}</strong>
                              <small>{getObjectiveTitle(objective)}</small>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="client-okrs-kp-linked-empty">
                        No Key Result linked yet. Use IA suggestions or search manually.
                      </p>
                    )}
                  </section>

                  <section className="client-okrs-key-project-section">
                    <div className="client-okrs-detail-card-head">
                      <span>Evaluation</span>
                    </div>
                    <div className="client-okrs-key-project-score-grid">
                      <div>
                        <span>Final Score</span>
                        <strong>{activeKeyProjectView.finalScore}%</strong>
                      </div>
                      <div>
                        <span>Quality Score</span>
                        <strong>{activeKeyProjectView.qualityScore}%</strong>
                      </div>
                      <div className={isEditingKeyProject ? "is-editing" : undefined}>
                        <span>Clarity</span>
                        {isEditingKeyProject ? (
                          <KeyProjectScoreInput
                            label="Clarity"
                            onChange={(value) => updateEditableKeyProject({ clarity: value })}
                            value={activeKeyProjectView.clarity}
                          />
                        ) : (
                          <strong>{formatOneDecimalValue(activeKeyProjectView.clarity)}</strong>
                        )}
                        {!isEditingKeyProject ? (
                          <div className="client-okrs-progress-track">
                            <span style={{ width: `${activeKeyProjectView.clarity === null ? 0 : Math.min(100, activeKeyProjectView.clarity * 10)}%` }} />
                          </div>
                        ) : null}
                      </div>
                      <div className={isEditingKeyProject ? "is-editing" : undefined}>
                        <span>Strategic Focus</span>
                        {isEditingKeyProject ? (
                          <KeyProjectScoreInput
                            label="Strategic Focus"
                            onChange={(value) => updateEditableKeyProject({ strategicFocus: value })}
                            value={activeKeyProjectView.strategicFocus}
                          />
                        ) : (
                          <strong>{formatOneDecimalValue(activeKeyProjectView.strategicFocus)}</strong>
                        )}
                        {!isEditingKeyProject ? (
                          <div className="client-okrs-progress-track">
                            <span style={{ width: `${activeKeyProjectView.strategicFocus === null ? 0 : Math.min(100, activeKeyProjectView.strategicFocus * 10)}%` }} />
                          </div>
                        ) : null}
                      </div>
                      <div className={isEditingKeyProject ? "is-editing" : undefined}>
                        <span title="Value Orientation">Value Orient...</span>
                        {isEditingKeyProject ? (
                          <KeyProjectScoreInput
                            label="Value Orientation"
                            onChange={(value) => updateEditableKeyProject({ valueOrientation: value })}
                            value={activeKeyProjectView.valueOrientation}
                          />
                        ) : (
                          <strong>{formatOneDecimalValue(activeKeyProjectView.valueOrientation)}</strong>
                        )}
                        {!isEditingKeyProject ? (
                          <div className="client-okrs-progress-track">
                            <span style={{ width: `${activeKeyProjectView.valueOrientation === null ? 0 : Math.min(100, activeKeyProjectView.valueOrientation * 10)}%` }} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="client-okrs-key-project-section">
                    <div className="client-okrs-detail-card-head">
                      <span>Workflow</span>
                    </div>
                    <div className="client-okrs-meta-grid">
                      {isEditingKeyProject ? (
                        <label className="client-okrs-meta-item is-editing">
                          <span>Status</span>
                          <select
                            onChange={(event) => updateEditableKeyProject({ status: event.target.value })}
                            value={activeKeyProjectView.status || keyProjectStatusOptions[0]}
                          >
                            {keyProjectStatusOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <DetailMetaItem label="Status" value={activeKeyProjectView.status} />
                      )}
                      <DetailMetaItem label="Created" value={formatDateTimeValue(activeKeyProjectView.createdAt)} />
                      <DetailMetaItem label="Last Updated" value={formatDateTimeValue(activeKeyProjectView.epicUpdatedAt)} />
                    </div>
                  </section>

                  <section className="client-okrs-key-project-text-stack">
                    <div className="client-okrs-key-project-text-card">
                      <div className="client-okrs-key-project-text-card-head">
                        <span>Epic Story</span>
                        {isEditingKeyProject ? (
                          <button
                            aria-label="Edit Epic Story"
                            onClick={() =>
                              openKeyProjectTextEditor({
                                field: "story",
                                label: "Epic Story",
                                maxLength: 1400,
                                title: "Edit Epic Story",
                                value: activeKeyProjectView.story
                              })
                            }
                            type="button"
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                      <p>{activeKeyProjectView.story || "No story set"}</p>
                    </div>
                  </section>

                  <section className="client-okrs-key-project-text-stack">
                    <div className="client-okrs-key-project-text-card">
                      <div className="client-okrs-key-project-text-card-head">
                        <span>Justification</span>
                        {isEditingKeyProject ? (
                          <button
                            aria-label="Edit Justification"
                            onClick={() =>
                              openKeyProjectTextEditor({
                                field: "justification",
                                label: "Justification",
                                maxLength: 1800,
                                title: "Edit Justification",
                                value: activeKeyProjectView.justification
                              })
                            }
                            type="button"
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                      <p>{displayValue(activeKeyProjectView.justification)}</p>
                    </div>
                  </section>
                </section>
              </>
            ) : keyProjects.length > 0 ? (
              <>
                <span className="client-okrs-section-label">Key Projects</span>
                {keyProjects.map((keyProject) => {
                  const keyProjectView = getHydratedKeyProject(keyProject) ?? keyProject;
                  const progress = keyProjectView.qualityScore || keyProjectView.finalScore;
                  const relatedKeyResultLabel = getKeyProjectRelatedKeyResultLabel(
                    keyProjectView,
                    allProjectKeyResults
                  );
                  const linkSyncStatus = optimisticKeyProjectLinksById[keyProjectView.id]?.status;

                  return (
                    <article
                      className="client-okrs-related-key-project-card"
                      key={keyProjectView.id}
                      onClick={() => setActiveKeyProject(keyProjectView)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveKeyProject(keyProjectView);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="client-okrs-related-key-project-head">
                        <div>
                          <h3>{keyProjectView.name || keyProjectView.story || "Untitled Key Project"}</h3>
                          <p>
                            {keyProjectView.totalStories ?? 0} stories
                            <span>{progress}% score</span>
                          </p>
                          <p className="client-okrs-related-key-project-kr">
                            KR: {relatedKeyResultLabel || "No Key Result linked"}
                            {relatedKeyResultLabel && linkSyncStatus === "synced" ? (
                              <span className="client-okrs-related-key-project-sync-chip">Synced</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="client-okrs-related-key-project-card-actions">
                          <button
                            className="client-okrs-key-project-suggest-button"
                            disabled={isLoadingKeyProjectSuggestions || isLinkingKeyProjectResult}
                            onClick={(event) => {
                              event.stopPropagation();
                              void openKeyProjectSuggestionModal(keyProjectView);
                            }}
                            type="button"
                          >
                            Suggest KR
                          </button>
                          <span className={`client-okrs-related-key-project-status${getKeyProjectStatusClass(keyProjectView.status)}`}>
                            {keyProjectView.status || "In Progress"}
                          </span>
                        </div>
                      </div>
                      <div className="client-okrs-progress-track is-wide">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    </article>
                  );
                })}
              </>
            ) : (
              <article className="client-okrs-detail-card">
                <p>No Key Projects are linked to this project yet.</p>
              </article>
            )}
          </div>
        ) : null}

        {activeTab === "stories" ? (
          <div className="client-okrs-detail-stack">
            <span className="client-okrs-section-label">Stories</span>
            <article className="client-okrs-detail-card">
              <p>Stories are not linked yet for this objective. This tab is ready for the Stories table hydration.</p>
            </article>
          </div>
        ) : null}

        {activeHistoryKeyResult ? (
            <KeyResultHistoryPanel
              initialHistory={
                getKeyResultHistoryState(activeHistoryKeyResult.id)?.status === "ready"
                  ? getKeyResultHistoryState(activeHistoryKeyResult.id)?.history
                  : undefined
              }
              keyResult={activeHistoryKeyResult}
              objective={editableObjective}
              onClose={() => setActiveHistoryKeyResult(null)}
              onHistoryChanged={(history) => {
                setLocalHistoryByKeyResultId((current) => ({
                  ...current,
                  [activeHistoryKeyResult.id]: {
                    history,
                    status: "ready"
                  }
                }));
              }}
              onLatestValuesChanged={(values) => {
                const projectId = editableObjective.projectIds[0] ?? "";

                applyOptimisticKeyResultValues(activeHistoryKeyResult.id, values);
                if (projectId) {
                  void syncKeyResultAfterSingularUpdate({
                    expectedValues: values,
                    keyResultId: activeHistoryKeyResult.id,
                    projectId
                  });
                }
              }}
              onToast={onProjectToast}
              sentimentAnalysis={keyResultSentiments[activeHistoryKeyResult.id]}
            />
        ) : null}
        {isKeyProjectSuggestionOpen && keyProjectSuggestionView ? (
          <div aria-modal="true" className="client-okrs-kr-suggestion-layer" role="dialog">
            <section className="client-okrs-kr-suggestion-modal">
              <div className="client-okrs-kr-suggestion-head">
                <div>
                  <span className="client-okrs-section-label">IA Match</span>
                  <h3>Sugerencias de Key Results</h3>
                  <p>{keyProjectSuggestionView.name || "Untitled Key Project"}</p>
                </div>
                <button
                  aria-label="Close Key Result suggestions"
                  disabled={isLinkingKeyProjectResult}
                  onClick={() => {
                    setIsKeyProjectSuggestionOpen(false);
                    setKeyProjectSuggestionTarget(null);
                    setPendingKeyProjectLinkKeyResult(null);
                  }}
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {isLoadingKeyProjectSuggestions ? (
                <div className="client-okrs-kr-suggestion-state">
                  <span className="client-okrs-account-loading-dots" aria-label="Loading suggestions">
                    <i />
                    <i />
                    <i />
                  </span>
                  <p>Buscando los KRs mas relacionados.</p>
                </div>
              ) : (
                <>
                  {keyProjectSuggestions.length > 0 ? (
                    <div className="client-okrs-kr-suggestion-list">
                      {keyProjectSuggestions.map((suggestion, index) => (
                        <button
                          className="client-okrs-kr-suggestion-card"
                          disabled={isLinkingKeyProjectResult}
                          key={suggestion.keyResult.id}
                          onClick={() => requestLinkKeyProjectToKeyResult(suggestion.keyResult)}
                          type="button"
                        >
                          <span>{index + 1}</span>
                          <div>
                            <strong>{getKeyResultDisplayTitle(suggestion.keyResult)}</strong>
                            <small>{suggestion.objective.title}</small>
                            <p>{suggestion.reason}</p>
                          </div>
                          <b>{suggestion.confidence}%<small>certeza</small></b>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="client-okrs-kr-suggestion-state">
                      <strong>No hay una recomendacion clara</strong>
                      <p>Busca manualmente entre todos los Key Results del proyecto.</p>
                    </div>
                  )}

                  <div className="client-okrs-kr-search-block">
                    <div className="client-okrs-kr-search-separator">
                      <span />
                      <small>o</small>
                      <span />
                    </div>
                    <label>
                      <span>Buscar otro Key Result</span>
                      <input
                        autoComplete="off"
                        onChange={(event) => setKeyProjectSearchQuery(event.target.value)}
                        placeholder="Buscar por nombre, objetivo o palabra clave..."
                        value={keyProjectSearchQuery}
                      />
                    </label>
                    <div className="client-okrs-kr-search-results">
                      {filteredKeyProjectSearchResults.slice(0, 12).map(({ keyResult, objective }) => (
                        <button
                          disabled={isLinkingKeyProjectResult}
                          key={`${objective.id}-${keyResult.id}`}
                          onClick={() => requestLinkKeyProjectToKeyResult(keyResult)}
                          type="button"
                        >
                          <strong>{keyResult.code ? `${keyResult.code}: ` : "KR: "}{getKeyResultDisplayTitle(keyResult)}</strong>
                          <small>{getObjectiveTitle(objective)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {keyProjectSuggestionError ? (
                <p className="client-okrs-kr-suggestion-error">{keyProjectSuggestionError}</p>
              ) : null}
            </section>
          </div>
        ) : null}
      </aside>
      {pendingKeyProjectLinkKeyResult && keyProjectSuggestionView ? (
        <div aria-modal="true" className="client-okrs-app-confirm-layer" role="dialog">
          <section className="client-okrs-app-confirm-card">
            <p>
              Vas a actualizar este Key Project con el KR seleccionado:
              {" "}
              <strong>{getKeyResultDisplayTitle(pendingKeyProjectLinkKeyResult)}</strong>.
              ¿Quieres continuar?
            </p>
            <div>
              <button
                className="client-okrs-app-confirm-secondary"
                disabled={isLinkingKeyProjectResult}
                onClick={() => setPendingKeyProjectLinkKeyResult(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="client-okrs-app-confirm-primary"
                disabled={isLinkingKeyProjectResult}
                onClick={() => void linkKeyProjectToKeyResult(pendingKeyProjectLinkKeyResult)}
                type="button"
              >
                {isLinkingKeyProjectResult ? "Updating..." : "Update"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isCloseConfirmOpen ? (
        <div aria-modal="true" className="client-okrs-app-confirm-layer" role="dialog">
          <section className="client-okrs-app-confirm-card">
            <p>Vas a cerrar el detalle del OKR. ¿Quieres continuar?</p>
            <div>
              <button className="client-okrs-app-confirm-secondary" onClick={() => setIsCloseConfirmOpen(false)} type="button">
                Cancel
              </button>
              <button className="client-okrs-app-confirm-primary" onClick={onClose} type="button">
                OK
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isObjectiveUpdateConfirmOpen ? (
        <div aria-modal="true" className="client-okrs-app-confirm-layer" role="dialog">
          <section className="client-okrs-app-confirm-card">
            <p>Vas a actualizar este Objective en Singular AGILE. ¿Quieres continuar?</p>
            <div className="client-okrs-app-confirm-actions has-three-actions">
              <button
                className="client-okrs-app-confirm-secondary"
                disabled={isUpdatingObjective}
                onClick={() => setIsObjectiveUpdateConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="client-okrs-app-confirm-secondary"
                disabled={isUpdatingObjective}
                onClick={discardEditableObjectiveChanges}
                type="button"
              >
                Discard
              </button>
              <button
                className="client-okrs-app-confirm-primary"
                disabled={isUpdatingObjective}
                onClick={() => void saveEditableObjective()}
                type="button"
              >
                {isUpdatingObjective ? "Updating..." : "OK"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {pendingKeyResultUpdateId ? (
        <div aria-modal="true" className="client-okrs-app-confirm-layer" role="dialog">
          <section className="client-okrs-app-confirm-card">
            <p>Vas a actualizar este Key Result en Singular AGILE. ¿Quieres continuar?</p>
            <div className="client-okrs-app-confirm-actions has-three-actions">
              <button
                className="client-okrs-app-confirm-secondary"
                disabled={isUpdatingKeyResult}
                onClick={() => setPendingKeyResultUpdateId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="client-okrs-app-confirm-secondary"
                disabled={isUpdatingKeyResult}
                onClick={() => discardEditableKeyResultChanges(pendingKeyResultUpdateId)}
                type="button"
              >
                Discard
              </button>
              <button
                className="client-okrs-app-confirm-primary"
                disabled={isUpdatingKeyResult}
                onClick={() => void saveEditableKeyResult(pendingKeyResultUpdateId)}
                type="button"
              >
                {isUpdatingKeyResult ? "Updating..." : "OK"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isKeyProjectUpdateConfirmOpen ? (
        <div aria-modal="true" className="client-okrs-app-confirm-layer" role="dialog">
          <section className="client-okrs-app-confirm-card">
            <p>Vas a guardar los cambios de este Key Project en Singular AGILE. ¿Quieres continuar?</p>
            <div className="client-okrs-app-confirm-actions has-three-actions">
              <button
                className="client-okrs-app-confirm-secondary"
                disabled={isUpdatingKeyProject}
                onClick={() => setIsKeyProjectUpdateConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="client-okrs-app-confirm-secondary"
                disabled={isUpdatingKeyProject}
                onClick={discardEditableKeyProjectChanges}
                type="button"
              >
                Discard
              </button>
              <button
                className="client-okrs-app-confirm-primary"
                disabled={isUpdatingKeyProject}
                onClick={() => void saveEditableKeyProject()}
                type="button"
              >
                {isUpdatingKeyProject ? "Saving..." : "Save"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isKeyProjectNameEditorOpen || keyProjectTextEditor ? (
        <div aria-modal="true" className="client-okrs-app-confirm-layer client-okrs-key-project-name-layer" role="dialog">
          <section className="client-okrs-key-project-name-modal">
            <div className="client-okrs-key-project-name-modal-head">
              <div>
                <span>{keyProjectTextEditor?.label ?? "Epic Name"}</span>
                <h3>{keyProjectTextEditor?.title ?? "Edit Key Project title"}</h3>
              </div>
              <button
                aria-label={keyProjectTextEditor ? `Close ${keyProjectTextEditor.label} editor` : "Close Epic Name editor"}
                onClick={keyProjectTextEditor ? closeKeyProjectTextEditor : () => {
                  setIsKeyProjectNameEditorOpen(false);
                  setKeyProjectNameDraft("");
                }}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <textarea
              aria-label={keyProjectTextEditor?.label ?? "Epic Name"}
              autoFocus
              className="client-okrs-key-project-name-textarea"
              maxLength={keyProjectTextEditor?.maxLength ?? 180}
              onChange={(event) =>
                keyProjectTextEditor
                  ? setKeyProjectTextDraft(event.target.value)
                  : setKeyProjectNameDraft(event.target.value)
              }
              rows={keyProjectTextEditor ? 6 : 4}
              value={keyProjectTextEditor ? keyProjectTextDraft : keyProjectNameDraft}
            />
            <div className="client-okrs-key-project-name-modal-foot">
              <small>
                {(keyProjectTextEditor ? keyProjectTextDraft : keyProjectNameDraft).trim().length}/
                {keyProjectTextEditor?.maxLength ?? 180}
              </small>
              <div>
                <button
                  className="client-okrs-key-project-name-button is-secondary"
                  onClick={keyProjectTextEditor ? closeKeyProjectTextEditor : () => {
                    setIsKeyProjectNameEditorOpen(false);
                    setKeyProjectNameDraft("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="client-okrs-key-project-name-button is-primary"
                  onClick={keyProjectTextEditor ? applyKeyProjectTextDraft : applyKeyProjectNameDraft}
                  type="button"
                >
                  Apply
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function ClientOkrsMock({
  initialProjectId = "",
  initialMainTab = "okrs",
  showMainTabs = true,
  syncProjectInUrl = false
}: {
  initialProjectId?: string;
  initialMainTab?: MainOkrTab;
  showMainTabs?: boolean;
  syncProjectInUrl?: boolean;
}) {
  const router = useRouter();
  const {
    cancelPortfolioSummaries,
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
    projects,
    projectsError,
    projectsStatus
  } = useOkrsWorkspaceData();
  const [okrs, setOkrs] = useState<AgileObjective[]>([]);
  const [keyProjects, setKeyProjects] = useState<AgileKeyProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [projectKeyResultAnalyses, setProjectKeyResultAnalyses] = useState<AgileKeyResultSentimentAnalysis[]>([]);
  const [portfolioNarrative, setPortfolioNarrative] = useState<PortfolioNarrativeState>({
    analysis: null,
    error: null,
    generatedAt: null,
    isLoading: false
  });
  const [portfolioActiveTab, setPortfolioActiveTab] = useState<PortfolioTab>("summary");
  const [isAnalyzingProjectSentiment, setIsAnalyzingProjectSentiment] = useState(false);
  const [projectSentimentError, setProjectSentimentError] = useState<string | null>(null);
  const [objectiveHealthAnalyses, setObjectiveHealthAnalyses] = useState<Record<string, AgileObjectiveHealthAnalysis>>({});
  const [isAnalyzingObjectiveHealth, setIsAnalyzingObjectiveHealth] = useState(false);
  const [objectiveHealthError, setObjectiveHealthError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | NonNullable<AgileObjective["status"]>>("ALL");
  const [selectedQuarter, setSelectedQuarter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState<"status" | "quarter">("status");
  const [activeMainTab, setActiveMainTab] = useState<MainOkrTab>(initialMainTab);
  const [kpiExpanded, setKpiExpanded] = useState(false);
  const [activeOkr, setActiveOkr] = useState<AgileObjective | null>(null);
  const [activeOkrIndex, setActiveOkrIndex] = useState(1);
  const [activeOkrInitialTab, setActiveOkrInitialTab] = useState<OkrDetailTab>("overview");
  const [activeOkrTargetKeyResultId, setActiveOkrTargetKeyResultId] = useState<string | null>(null);
  const [activePortfolioProjectId, setActivePortfolioProjectId] = useState<string | null>(null);
  const [isLoadingPortfolioProject, setIsLoadingPortfolioProject] = useState(false);
  const [portfolioProjectError, setPortfolioProjectError] = useState<string | null>(null);
  const [activeOkrReturnContext, setActiveOkrReturnContext] = useState<{
    mainTab: MainOkrTab;
    portfolioTab: PortfolioTab;
  } | null>(null);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(false);
  const [objectivesError, setObjectivesError] = useState<string | null>(null);
  const [keyProjectsError, setKeyProjectsError] = useState<string | null>(null);
  const [newRecordType, setNewRecordType] = useState<NewOkrRecordType | null>(null);
  const [objectiveSyncStatus, setObjectiveSyncStatus] = useState<ObjectiveSyncStatus | null>(null);
  const objectiveSyncPollRunRef = useRef(0);
  const initialProjectIdRef = useRef(initialProjectId);
  const isLoadingProjects = projectsStatus === "idle" || projectsStatus === "loading";
  const toast = useToast();

  function showProjectToast(tone: AppToastTone, title: string | null, message: string) {
    toast[tone]({
      message,
      title
    });
  }

  useEffect(() => {
    void ensureProjects().catch(() => undefined);
  }, [ensureProjects]);

  useEffect(() => {
    if (!syncProjectInUrl || activeMainTab === "portfolio-analysis") {
      return;
    }

    if (initialProjectIdRef.current !== initialProjectId) {
      initialProjectIdRef.current = initialProjectId;
      setSelectedProjectId(initialProjectId);
    }
  }, [activeMainTab, initialProjectId, syncProjectInUrl]);

  const selectedProjectCachedData = selectedProjectId ? projectDataCache[selectedProjectId] : undefined;

  useEffect(() => {
    let isMounted = true;

    async function loadObjectives() {
      if (!selectedProjectId) {
        setOkrs([]);
        setKeyProjects([]);
        setProjectKeyResultAnalyses([]);
        setProjectSentimentError(null);
        setObjectiveHealthAnalyses({});
        setObjectiveHealthError(null);
        setIsAnalyzingObjectiveHealth(false);
        setObjectivesError(null);
        setKeyProjectsError(null);
        setIsLoadingObjectives(false);
        return;
      }

      if (selectedProjectCachedData) {
        setOkrs(selectedProjectCachedData.objectives);
        setKeyProjects(selectedProjectCachedData.keyProjects);
        setObjectivesError(null);
        setKeyProjectsError(selectedProjectCachedData.keyProjectsError ?? null);
        setIsLoadingObjectives(false);
        return;
      }

      setIsLoadingObjectives(true);
      setObjectivesError(null);
      setKeyProjectsError(null);

      try {
        const projectData = await ensureProjectData(selectedProjectId);

        if (isMounted) {
          setOkrs(projectData.objectives);
          setKeyProjects(projectData.keyProjects);
          setKeyProjectsError(projectData.keyProjectsError ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setOkrs([]);
          setKeyProjects([]);
          setProjectKeyResultAnalyses([]);
          setProjectSentimentError(null);
          setObjectiveHealthAnalyses({});
          setObjectiveHealthError(null);
          setIsAnalyzingObjectiveHealth(false);
          setObjectivesError(error instanceof Error ? error.message : "No fue posible consultar los objetivos.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingObjectives(false);
        }
      }
    }

    void loadObjectives();

    return () => {
      isMounted = false;
    };
  }, [ensureProjectData, selectedProjectCachedData, selectedProjectId]);

  useEffect(() => {
    if (activeMainTab !== "portfolio-analysis") {
      cancelPortfolioSummaries();
      return;
    }

    void ensurePortfolioSummaries().catch(() => undefined);
  }, [activeMainTab, cancelPortfolioSummaries, ensurePortfolioSummaries]);

  const portfolioProjectsForAnalysis = useMemo(
    () =>
      projects.map((project) => {
        const summary = portfolioProjectSummaries[project.id];

        return {
          keyResultCount: summary?.keyResultCount ?? 0,
          objectiveCount: summary?.objectiveCount ?? 0,
          projectId: project.id,
          projectName: project.name,
          score: summary?.score ?? null,
          signalCounts: summary?.signalCounts ?? getSignalCounts([]),
          status: summary?.status ?? "loading" as const
        };
      }),
    [portfolioProjectSummaries, projects]
  );
  const portfolioAnalysisSignature = useMemo(
    () =>
      JSON.stringify({
        portfolioScore: computePortfolioScore(portfolioProjectSummaries),
        projects: portfolioProjectsForAnalysis
      }),
    [portfolioProjectSummaries, portfolioProjectsForAnalysis]
  );

  useEffect(() => {
    let isMounted = true;

    if (activeMainTab !== "portfolio-analysis" || projects.length === 0) {
      setPortfolioNarrative({
        analysis: null,
        error: null,
        generatedAt: null,
        isLoading: false
      });
      return () => {
        isMounted = false;
      };
    }

    const cachedNarrative = portfolioNarrativeCache[portfolioAnalysisSignature];
    if (cachedNarrative && !cachedNarrative.isLoading) {
      setPortfolioNarrative(cachedNarrative);
      return () => {
        isMounted = false;
      };
    }

    const hasPendingProjects =
      portfolioProjectsForAnalysis.length === 0 ||
      portfolioProjectsForAnalysis.some((project) => project.status === "loading");

    if (hasPendingProjects) {
      setPortfolioNarrative((current) => ({
        ...current,
        error: null,
        isLoading: true
      }));
      return () => {
        isMounted = false;
      };
    }

    async function loadPortfolioNarrative() {
      setPortfolioNarrative((current) => ({
        ...current,
        error: null,
        isLoading: true
      }));

      try {
        const narrative = await ensurePortfolioNarrative(portfolioAnalysisSignature, {
          generatedFor: "current portfolio",
          portfolioScore: computePortfolioScore(portfolioProjectSummaries),
          projects: portfolioProjectsForAnalysis
        });

        if (isMounted) {
          setPortfolioNarrative(narrative);
        }
      } catch (error) {
        if (isMounted) {
          setPortfolioNarrative({
            analysis: null,
            error: error instanceof Error ? error.message : "No fue posible generar el Portfolio Analysis.",
            generatedAt: null,
            isLoading: false
          });
        }
      }
    }

    void loadPortfolioNarrative();

    return () => {
      isMounted = false;
    };
  }, [
    activeMainTab,
    ensurePortfolioNarrative,
    portfolioAnalysisSignature,
    portfolioNarrativeCache,
    portfolioProjectSummaries,
    portfolioProjectsForAnalysis,
    projects.length
  ]);

  const portfolioTrendKeyResultIds = useMemo(() => {
    if (activeMainTab !== "portfolio-analysis" || portfolioActiveTab !== "kr-trends") {
      return [];
    }

    return Object.values(portfolioProjectSummaries)
      .filter((summary) => summary.status === "ready")
      .flatMap((summary) => summary.keyResults.map((keyResult) => keyResult.id));
  }, [activeMainTab, portfolioActiveTab, portfolioProjectSummaries]);
  const portfolioTrendKeyResultSignature = useMemo(
    () => portfolioTrendKeyResultIds.join("|"),
    [portfolioTrendKeyResultIds]
  );

  useEffect(() => {
    if (
      activeMainTab !== "portfolio-analysis" ||
      portfolioActiveTab !== "kr-trends" ||
      portfolioTrendKeyResultIds.length === 0
    ) {
      return;
    }

    void ensureKeyResultHistoryBulk(portfolioTrendKeyResultIds);
  }, [activeMainTab, ensureKeyResultHistoryBulk, portfolioActiveTab, portfolioTrendKeyResultIds, portfolioTrendKeyResultSignature]);

  const allProjectKeyResults = useMemo(
    () => okrs.flatMap((okr) => getObjectiveKeyResults(okr)),
    [okrs]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const activePortfolioProject = useMemo(
    () => projects.find((project) => project.id === activePortfolioProjectId) ?? null,
    [activePortfolioProjectId, projects]
  );

  useEffect(() => {
    let isMounted = true;

    if (!selectedProjectId || allProjectKeyResults.length === 0) {
      setProjectKeyResultAnalyses([]);
      setProjectSentimentError(null);
      setIsAnalyzingProjectSentiment(false);
      return () => {
        isMounted = false;
      };
    }

    const cachedAnalyses = projectSentimentCache[selectedProjectId];
    if (cachedAnalyses && cachedAnalyses.length === allProjectKeyResults.length) {
      setProjectKeyResultAnalyses(cachedAnalyses);
      setProjectSentimentError(null);
      setIsAnalyzingProjectSentiment(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadProjectSentiment() {
      setIsAnalyzingProjectSentiment(true);
      setProjectSentimentError(null);

      try {
        const analyses = await ensureProjectSentiments(selectedProjectId, allProjectKeyResults);

        if (isMounted) {
          setProjectKeyResultAnalyses(analyses);
          setProjectSentimentError(null);
        }
      } catch (error) {
        if (isMounted) {
          setProjectKeyResultAnalyses([]);
          setProjectSentimentError(
            error instanceof Error
              ? error.message
              : "No fue posible calcular el sentiment del proyecto."
          );
        }
      } finally {
        if (isMounted) {
          setIsAnalyzingProjectSentiment(false);
        }
      }
    }

    void loadProjectSentiment();

    return () => {
      isMounted = false;
    };
  }, [allProjectKeyResults, ensureProjectSentiments, projectSentimentCache, selectedProjectId]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedProjectId || !selectedProject || okrs.length === 0) {
      setObjectiveHealthAnalyses({});
      setObjectiveHealthError(null);
      setIsAnalyzingObjectiveHealth(false);
      return () => {
        isMounted = false;
      };
    }

    if (isAnalyzingProjectSentiment) {
      return () => {
        isMounted = false;
      };
    }

    const projectForHealth = selectedProject;

    async function loadObjectiveHealth() {
      setIsAnalyzingObjectiveHealth(true);
      setObjectiveHealthError(null);

      try {
        const sentimentByKeyResultId = new Map(
          projectKeyResultAnalyses.map((analysis) => [analysis.keyResultId, analysis])
        );
        const payload = await analyzeAgileObjectiveHealth({
          keyProjects,
          objectives: okrs.map((okr) => {
            const keyResults = getObjectiveKeyResults(okr);

            return {
              description: getObjectiveDescription(okr),
              id: okr.id,
              keyResultSentiments: keyResults
                .map((keyResult) => sentimentByKeyResultId.get(keyResult.id))
                .filter((analysis): analysis is AgileKeyResultSentimentAnalysis => Boolean(analysis))
                .map((analysis) => ({
                  keyResultId: analysis.keyResultId,
                  metricStatus: analysis.metricStatus
                })),
              keyResults,
              quarter: getObjectiveQuarter(okr),
              score: computeObjectiveScore(okr),
              status: okr.status,
              targetDate: okr.targetDate,
              title: getObjectiveTitle(okr)
            };
          }),
          project: {
            id: projectForHealth.id,
            name: projectForHealth.name
          }
        });

        if (isMounted) {
          setObjectiveHealthAnalyses(
            Object.fromEntries(payload.analyses.map((analysis) => [analysis.objectiveId, analysis]))
          );
          setObjectiveHealthError(payload.message ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setObjectiveHealthAnalyses({});
          setObjectiveHealthError(
            error instanceof Error
              ? error.message
              : "No fue posible calcular AI Health Analysis."
          );
        }
      } finally {
        if (isMounted) {
          setIsAnalyzingObjectiveHealth(false);
        }
      }
    }

    void loadObjectiveHealth();

    return () => {
      isMounted = false;
    };
  }, [isAnalyzingProjectSentiment, keyProjects, okrs, projectKeyResultAnalyses, selectedProject, selectedProjectId]);

  const quarterOptions = useMemo(() => {
    const quarters = Array.from(new Set(okrs.map(getObjectiveQuarter)));
    return ["ALL", ...quarters];
  }, [okrs]);

  const filteredOkrs = useMemo(() => {
    return okrs.filter((okr) => {
      if (selectedStatus !== "ALL" && okr.status !== selectedStatus) return false;
      if (selectedQuarter !== "ALL" && getObjectiveQuarter(okr) !== selectedQuarter) return false;
      return true;
    });
  }, [okrs, selectedQuarter, selectedStatus]);

  const totalKRs = okrs.reduce((total, okr) => total + getObjectiveKeyResults(okr).length, 0);
  const completedKRs = okrs.reduce(
    (total, okr) => total + getObjectiveKeyResults(okr).filter(isKeyResultComplete).length,
    0
  );
  const scoredOkrs = okrs.filter((okr) => okr.score !== null);
  const overallProgress =
    scoredOkrs.length > 0
      ? Math.round(scoredOkrs.reduce((total, okr) => total + computeObjectiveScore(okr), 0) / scoredOkrs.length)
      : totalKRs > 0
        ? Math.round((completedKRs / totalKRs) * 100)
        : 0;
  const hasDirtyFilters = selectedProjectId !== "" || selectedStatus !== "ALL" || selectedQuarter !== "ALL";

  function clearFilters() {
    setSelectedProjectId("");
    if (syncProjectInUrl && activeMainTab !== "portfolio-analysis") {
      router.push("/workspace/okrs");
    }
    setOkrs([]);
    setKeyProjects([]);
    setProjectKeyResultAnalyses([]);
    setProjectSentimentError(null);
    setObjectiveHealthAnalyses({});
    setObjectiveHealthError(null);
    setIsAnalyzingObjectiveHealth(false);
    setObjectivesError(null);
    setKeyProjectsError(null);
    setActiveOkr(null);
    setActiveOkrIndex(1);
    setActiveOkrInitialTab("overview");
    setActiveOkrTargetKeyResultId(null);
    setActivePortfolioProjectId(null);
    setPortfolioProjectError(null);
    setIsLoadingPortfolioProject(false);
    setActiveOkrReturnContext(null);
    setNewRecordType(null);
    setObjectiveSyncStatus(null);
    objectiveSyncPollRunRef.current += 1;
    setSelectedStatus("ALL");
    setSelectedQuarter("ALL");
    setActiveFilter("status");
  }

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    if (syncProjectInUrl && activeMainTab !== "portfolio-analysis") {
      router.push(projectId ? `/workspace/okrs/project/${encodeURIComponent(projectId)}` : "/workspace/okrs");
    }
    setOkrs([]);
    setKeyProjects([]);
    setProjectKeyResultAnalyses([]);
    setProjectSentimentError(null);
    setObjectiveHealthAnalyses({});
    setObjectiveHealthError(null);
    setIsAnalyzingObjectiveHealth(false);
    setSelectedStatus("ALL");
    setSelectedQuarter("ALL");
    setActiveFilter("status");
    setActiveMainTab(initialMainTab);
    setActiveOkr(null);
    setActiveOkrIndex(1);
    setActiveOkrInitialTab("overview");
    setActiveOkrTargetKeyResultId(null);
    setActivePortfolioProjectId(null);
    setPortfolioProjectError(null);
    setIsLoadingPortfolioProject(false);
    setActiveOkrReturnContext(null);
    setNewRecordType(null);
    setObjectiveSyncStatus(null);
    objectiveSyncPollRunRef.current += 1;
  }

  async function refreshProjectData(projectId: string, options: { force?: boolean } = {}) {
    const cachedProjectData = !options.force ? projectDataCache[projectId] : null;

    if (cachedProjectData) {
      setOkrs(cachedProjectData.objectives);
      setKeyProjects(cachedProjectData.keyProjects);
      setObjectivesError(null);
      setKeyProjectsError(cachedProjectData.keyProjectsError ?? null);
      setIsLoadingObjectives(false);
      return cachedProjectData;
    }

    setIsLoadingObjectives(true);
    setObjectivesError(null);
    setKeyProjectsError(null);

    try {
      const projectData = await ensureProjectData(projectId, options);
      setOkrs(projectData.objectives);
      setKeyProjects(projectData.keyProjects);
      setKeyProjectsError(projectData.keyProjectsError ?? null);

      return projectData;
    } catch (error) {
      setOkrs([]);
      setKeyProjects([]);
      setProjectKeyResultAnalyses([]);
      setProjectSentimentError(null);
      setObjectiveHealthAnalyses({});
      setObjectiveHealthError(null);
      setIsAnalyzingObjectiveHealth(false);
      setObjectivesError(error instanceof Error ? error.message : "No fue posible consultar los objetivos.");

      return {
        keyProjects: [],
        objectives: []
      };
    } finally {
      setIsLoadingObjectives(false);
    }
  }

  async function handleOpenPortfolioKeyResult(project: AgileProject, keyResult: AgileKeyResult) {
    const cachedSummary = portfolioProjectSummaries[project.id];
    const cachedAnalyses = projectSentimentCache[project.id] ?? cachedSummary?.analyses ?? [];

    function openKeyResultObjective(objectives: AgileObjective[]) {
      const objectiveIndex = objectives.findIndex((objective) =>
        getObjectiveKeyResults(objective).some((candidate) => candidate.id === keyResult.id)
      );
      const objective = objectives[objectiveIndex];

      if (!objective) {
        return false;
      }

      setActiveOkrReturnContext({
        mainTab: "portfolio-analysis",
        portfolioTab: "kr-trends"
      });
      setActiveOkrInitialTab("key-results");
      setActiveOkrTargetKeyResultId(keyResult.id);
      setActiveOkrIndex(objectiveIndex + 1);
      setActiveOkr(objective);
      return true;
    }

    setSelectedProjectId(project.id);
    setProjectKeyResultAnalyses(cachedAnalyses);
    setProjectSentimentError(null);
    setObjectiveHealthAnalyses({});
    setObjectiveHealthError(null);
    setIsAnalyzingObjectiveHealth(false);
    setSelectedStatus("ALL");
    setSelectedQuarter("ALL");
    setActiveFilter("status");
    setActiveOkr(null);
    setActiveOkrIndex(1);
    setActiveOkrInitialTab("key-results");
    setActiveOkrTargetKeyResultId(keyResult.id);
    setNewRecordType(null);

    if (project.id === selectedProjectId && openKeyResultObjective(okrs)) {
      return;
    }

    const refreshedData = await refreshProjectData(project.id);
    openKeyResultObjective(refreshedData.objectives);
  }

  async function handleOpenPortfolioProject(projectId: string) {
    setActivePortfolioProjectId(projectId);
    setPortfolioProjectError(null);

    if (projectDataCache[projectId]) {
      setIsLoadingPortfolioProject(false);
      return;
    }

    setIsLoadingPortfolioProject(true);

    try {
      await ensureProjectData(projectId);
    } catch (error) {
      setPortfolioProjectError(
        error instanceof Error ? error.message : "No fue posible cargar el Project overview."
      );
    } finally {
      setIsLoadingPortfolioProject(false);
    }
  }

  function handleOpenPortfolioProjectObjective(project: AgileProject, objective: AgileObjective, index: number) {
    const data = projectDataCache[project.id];
    const summary = portfolioProjectSummaries[project.id];
    const analyses = projectSentimentCache[project.id] ?? summary?.analyses ?? [];

    setSelectedProjectId(project.id);
    setOkrs(data?.objectives ?? []);
    setKeyProjects(data?.keyProjects ?? []);
    setProjectKeyResultAnalyses(analyses);
    setProjectSentimentError(null);
    setObjectiveHealthAnalyses({});
    setObjectiveHealthError(null);
    setIsAnalyzingObjectiveHealth(false);
    setSelectedStatus("ALL");
    setSelectedQuarter("ALL");
    setActiveFilter("status");
    setActivePortfolioProjectId(null);
    setActiveOkrReturnContext({
      mainTab: "portfolio-analysis",
      portfolioTab: "summary"
    });
    setActiveOkrInitialTab("overview");
    setActiveOkrTargetKeyResultId(null);
    setActiveOkrIndex(index + 1);
    setActiveOkr(objective);
  }

  async function pollObjectiveSync(
    projectId: string,
    input: Pick<CreateAgileObjectiveInput, "objective" | "targetDate">,
    pollRunId: number
  ) {
    for (let attempt = 0; objectiveSyncPollRunRef.current === pollRunId; attempt += 1) {
      const delay = objectiveSyncPollDelays[Math.min(attempt, objectiveSyncPollDelays.length - 1)];
      await wait(delay);

      if (objectiveSyncPollRunRef.current !== pollRunId) {
        return;
      }

      let refreshedData: Awaited<ReturnType<typeof refreshProjectData>>;
      try {
        invalidateProject(projectId);
        refreshedData = await refreshProjectData(projectId, { force: true });
      } catch {
        continue;
      }

      const syncedObjective = findSyncedObjective(refreshedData.objectives, input);

      if (!syncedObjective) {
        continue;
      }

      const objectiveIndex = refreshedData.objectives.findIndex((objective) => objective.id === syncedObjective.id);

      setObjectiveSyncStatus((current) =>
        current && current.projectId === projectId && current.objectiveTitle === input.objective
          ? { ...current, status: "synced" }
          : current
      );
      setActiveOkrReturnContext(null);
      setActiveOkrInitialTab("overview");
      setActiveOkrTargetKeyResultId(null);
      setActiveOkrIndex(objectiveIndex + 1);
      setActiveOkr(syncedObjective);
      return;
    }
  }

  async function handleCreatedRecord(result: {
    keyProjectId?: string;
    objectiveTitle?: string;
    objectiveId?: string;
    targetDate?: string;
    type: NewOkrRecordType;
  }) {
    if (result.type === "objective" && result.objectiveTitle) {
      const pollRunId = objectiveSyncPollRunRef.current + 1;
      objectiveSyncPollRunRef.current = pollRunId;
      setObjectiveSyncStatus({
        objectiveTitle: result.objectiveTitle,
        projectId: selectedProjectId,
        startedAt: Date.now(),
        status: "pending",
        targetDate: result.targetDate ?? ""
      });
      setNewRecordType(null);
      void pollObjectiveSync(
        selectedProjectId,
        {
          objective: result.objectiveTitle,
          targetDate: result.targetDate ?? ""
        },
        pollRunId
      ).catch((error) => {
        setObjectivesError(error instanceof Error ? error.message : "No fue posible verificar la sincronización.");
      });
      return;
    }

    invalidateProject(selectedProjectId);
    const refreshedData = await refreshProjectData(selectedProjectId, { force: true });
    setNewRecordType(null);

    if (result.type === "objective" && result.objectiveId) {
      const objectiveIndex = refreshedData.objectives.findIndex((objective) => objective.id === result.objectiveId);
      const objective = refreshedData.objectives[objectiveIndex];

      if (objective) {
        setActiveOkrReturnContext(null);
        setActiveOkrInitialTab("overview");
        setActiveOkrTargetKeyResultId(null);
        setActiveOkrIndex(objectiveIndex + 1);
        setActiveOkr(objective);
      }

      return;
    }

    if (result.type === "key-result" && result.objectiveId) {
      const objectiveIndex = refreshedData.objectives.findIndex((objective) => objective.id === result.objectiveId);
      const objective = refreshedData.objectives[objectiveIndex];

      if (objective) {
        setActiveOkrReturnContext(null);
        setActiveOkrInitialTab("key-results");
        setActiveOkrTargetKeyResultId(null);
        setActiveOkrIndex(objectiveIndex + 1);
        setActiveOkr(objective);
      }

      return;
    }

    if (result.type === "key-project") {
      const objective = refreshedData.objectives[0];

      if (objective) {
        setActiveOkrReturnContext(null);
        setActiveOkrInitialTab("key-projects");
        setActiveOkrTargetKeyResultId(null);
        setActiveOkrIndex(1);
        setActiveOkr(objective);
      }
    }
  }

  function handleCloseActiveOkr() {
    const returnContext = activeOkrReturnContext;

    setActiveOkr(null);
    setActiveOkrReturnContext(null);
    setActiveOkrTargetKeyResultId(null);

    if (returnContext) {
      setActiveMainTab(returnContext.mainTab);
      setPortfolioActiveTab(returnContext.portfolioTab);
    }
  }

  function handleObjectiveUpdated(updatedObjective: AgileObjective) {
    setActiveOkr(updatedObjective);
    setOkrs((currentObjectives) =>
      currentObjectives.map((objective) =>
        objective.id === updatedObjective.id ? updatedObjective : objective
      )
    );
    invalidateProject(selectedProjectId);
  }

  function handleKeyProjectUpdated(updatedKeyProject: AgileKeyProject, options?: KeyProjectUpdatedOptions) {
    setKeyProjects((currentKeyProjects) =>
      currentKeyProjects.map((keyProject) =>
        keyProject.id === updatedKeyProject.id ? updatedKeyProject : keyProject
      )
    );
    invalidateProject(selectedProjectId);
    if (options?.silent) {
      return;
    }
    showProjectToast(
      "success",
      "Key Project guardado",
      "Los cambios se guardaron correctamente."
    );
  }

  return (
    <section className="client-okrs-page" aria-label="Client OKRs mock">
      {selectedProjectId && showMainTabs ? <MainOkrTabs activeTab={activeMainTab} onChange={setActiveMainTab} /> : null}

      {selectedProjectId && activeMainTab === "okrs" && kpiExpanded ? (
        <div className="client-okrs-kpi-row">
          <article className="client-okrs-kpi-card">
            <strong>{overallProgress}%</strong>
            <p className="is-up">Weighted progress across all key results · +12% vs last review</p>
          </article>
          <article className="client-okrs-kpi-card">
            <strong>{totalKRs}</strong>
            <p className="is-up">Key Projects defined · {keyProjects.length} linked</p>
          </article>
          <article className="client-okrs-kpi-card">
            <strong>{okrs.filter((okr) => okr.status === "Pending Review").length}</strong>
            <p className="is-down">Objectives pending review in Airtable</p>
          </article>
        </div>
      ) : null}

      {activeMainTab !== "portfolio-analysis" ? (
        <div className="client-okrs-filter-switcher">
          <div className="client-okrs-project-row">
            <label className="client-okrs-project-filter">
              <span>Project</span>
              <select
                aria-label="Project"
                disabled={isLoadingProjects || projects.length === 0}
                onChange={(event) => handleProjectChange(event.target.value)}
                value={selectedProjectId}
              >
                <option value="">
                  {isLoadingProjects
                    ? "Loading projects..."
                    : projects.length === 0
                      ? "No projects assigned"
                      : "Select a project"}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedProjectId ? (
              <ProjectSentimentPanel
                analyses={projectKeyResultAnalyses}
                error={projectSentimentError}
                isAnalyzing={isAnalyzingProjectSentiment}
                isLoadingObjectives={isLoadingObjectives}
                keyResultCount={allProjectKeyResults.length}
                visibleObjectiveCount={filteredOkrs.length}
              />
            ) : null}
            <div className="client-okrs-header-actions">
              <NewOkrMenu disabled={!selectedProjectId} onSelect={setNewRecordType} />
              {selectedProjectId && activeMainTab === "okrs" ? (
                <KpiToggle isExpanded={kpiExpanded} onToggle={() => setKpiExpanded((current) => !current)} />
              ) : null}
            </div>
          </div>
          {projectsError ? <p className="client-okrs-project-error">{projectsError}</p> : null}
          {objectiveSyncStatus && objectiveSyncStatus.projectId === selectedProjectId ? (
            <div className={`client-okrs-sync-status is-${objectiveSyncStatus.status}`}>
              <strong>
                {objectiveSyncStatus.status === "synced"
                  ? "Objective synced with Foundation"
                  : "Objective enviado. Foundation sigue sincronizando."}
              </strong>
              <span>{objectiveSyncStatus.objectiveTitle}</span>
            </div>
          ) : null}

          {selectedProjectId && activeMainTab === "okrs" ? (
            <>
            <div className="client-okrs-filter-tabs" role="tablist" aria-label="Filter categories">
              <button
                aria-selected={activeFilter === "status"}
                className={activeFilter === "status" ? "is-active" : undefined}
                onClick={() => setActiveFilter("status")}
                role="tab"
                type="button"
              >
                Status
                {selectedStatus !== "ALL" ? <span /> : null}
              </button>
              <button
                aria-selected={activeFilter === "quarter"}
                className={activeFilter === "quarter" ? "is-active" : undefined}
                onClick={() => setActiveFilter("quarter")}
                role="tab"
                type="button"
              >
                Quarter
                {selectedQuarter !== "ALL" ? <span /> : null}
              </button>
              {hasDirtyFilters ? (
                <button className="client-okrs-clear" onClick={clearFilters} type="button">
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="client-okrs-filter-panel" role="tabpanel">
              {activeFilter === "status"
                ? statusOptions.map((option) => (
                    <button
                      className={selectedStatus === option.value ? "is-selected" : undefined}
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))
                : quarterOptions.map((quarter) => (
                    <button
                      className={selectedQuarter === quarter ? "is-selected" : undefined}
                      key={quarter}
                      onClick={() => setSelectedQuarter(quarter)}
                      type="button"
                    >
                      {quarter}
                    </button>
                  ))}
            </div>
            </>
          ) : null}
        </div>
      ) : projectsError ? (
        <p className="client-okrs-project-error">{projectsError}</p>
      ) : null}

      {!selectedProjectId && activeMainTab !== "portfolio-analysis" ? (
        <article className="client-okrs-empty">
          <strong>Select a project to view OKRs</strong>
          <p>Choose one active project from the dropdown to load its objectives from Airtable.</p>
        </article>
      ) : null}

      {selectedProjectId && activeMainTab !== "portfolio-analysis" && isLoadingObjectives ? (
        <article className="client-okrs-empty">
          <strong>Loading objectives</strong>
          <p>Consulting Objective records for the selected project.</p>
        </article>
      ) : null}

      {selectedProjectId && activeMainTab !== "portfolio-analysis" && objectivesError ? (
        <article className="client-okrs-empty">
          <strong>Objectives could not be loaded</strong>
          <p>{objectivesError}</p>
        </article>
      ) : null}

      {selectedProjectId && activeMainTab !== "portfolio-analysis" && !objectivesError && keyProjectsError ? (
        <article className="client-okrs-empty">
          <strong>Key Projects could not be loaded</strong>
          <p>{keyProjectsError}</p>
        </article>
      ) : null}

      {activeMainTab === "portfolio-analysis" && isLoadingProjects ? (
        <article className="client-okrs-empty">
          <strong>Loading accounts</strong>
          <p>Consulting active projects for this workspace.</p>
        </article>
      ) : null}

      {activeMainTab === "portfolio-analysis" && !isLoadingProjects ? (
        <>
          <div className="client-okrs-portfolio-tab-row">
            <PortfolioTabs activeTab={portfolioActiveTab} onChange={setPortfolioActiveTab} />
          </div>
          {portfolioActiveTab === "summary" ? (
            <AccountSummaryView
              narrative={portfolioNarrative}
              onOpenProject={handleOpenPortfolioProject}
              portfolioSummaries={portfolioProjectSummaries}
              projects={projects}
              selectedProjectId={selectedProjectId}
            />
          ) : (
            <PortfolioKrTrendsView
              historyByKeyResultId={portfolioKrHistoryById}
              onOpenKeyResult={handleOpenPortfolioKeyResult}
              portfolioSummaries={portfolioProjectSummaries}
              projects={projects}
            />
          )}
        </>
      ) : null}

      {selectedProjectId && activeMainTab === "okrs" && !isLoadingObjectives && !objectivesError && filteredOkrs.length === 0 ? (
        <article className="client-okrs-empty">
          <strong>No OKRs match the current filters</strong>
          <p>Clear the filters to see all strategic objectives for your organization.</p>
          <button onClick={clearFilters} type="button">Clear filters</button>
        </article>
      ) : null}

      {selectedProjectId && activeMainTab === "okrs" && !isLoadingObjectives && !objectivesError ? (
        <div className="client-okrs-grid">
          {filteredOkrs.map((okr, index) => (
            <OkrSummaryCard
              healthAnalysis={objectiveHealthAnalyses[okr.id]}
              healthError={objectiveHealthError}
              isAnalyzingHealth={isAnalyzingObjectiveHealth}
              key={okr.id}
              okr={okr}
              okrIndex={index + 1}
              onOpen={() => {
                setActiveOkrReturnContext(null);
                setActiveOkrInitialTab("overview");
                setActiveOkrTargetKeyResultId(null);
                setActiveOkrIndex(index + 1);
                setActiveOkr(okr);
              }}
            />
          ))}
        </div>
      ) : null}

      {selectedProjectId && activeMainTab === "key-results" && !isLoadingObjectives && !objectivesError ? (
        <div className="client-okrs-key-results-view">
          {okrs.flatMap((okr, okrIndex) =>
            getObjectiveKeyResults(okr).map((keyResult, keyResultIndex) => {
              const keyResultProgress = normalizeProgress(keyResult.progress);
              const sentimentAnalysis = projectKeyResultAnalyses.find((analysis) => analysis.keyResultId === keyResult.id);

              return (
                <article
                  className="client-okrs-key-result-card"
                  key={`${okr.id}-${keyResult.id}`}
                  onClick={() => {
                    setActiveOkrReturnContext(null);
                    setActiveOkrInitialTab("key-results");
                    setActiveOkrTargetKeyResultId(keyResult.id);
                    setActiveOkrIndex(okrIndex + 1);
                    setActiveOkr(okr);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveOkrReturnContext(null);
                      setActiveOkrInitialTab("key-results");
                      setActiveOkrTargetKeyResultId(keyResult.id);
                      setActiveOkrIndex(okrIndex + 1);
                      setActiveOkr(okr);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <span>{keyResult.code || `KR ${okrIndex + 1}.${keyResultIndex + 1}`}</span>
                    <h3>{getKeyResultDisplayTitle(keyResult)}</h3>
                    <p>{keyResult.explanation || keyResult.metric || getObjectiveDescription(okr)}</p>
                  </div>
                  <div className="client-okrs-key-result-meta">
                    <KeyResultSentimentBadge
                      analysis={sentimentAnalysis}
                      isLoading={isAnalyzingProjectSentiment}
                    />
                    <strong>{keyResultProgress}%</strong>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : null}

      {activePortfolioProject ? (
        <PortfolioProjectOverviewPanel
          error={portfolioProjectError}
          isLoading={isLoadingPortfolioProject}
          onClose={() => {
            setActivePortfolioProjectId(null);
            setPortfolioProjectError(null);
            setIsLoadingPortfolioProject(false);
          }}
          onOpenObjective={(objective, index) =>
            handleOpenPortfolioProjectObjective(activePortfolioProject, objective, index)
          }
          project={activePortfolioProject}
          projectData={projectDataCache[activePortfolioProject.id]}
          summary={portfolioProjectSummaries[activePortfolioProject.id]}
        />
      ) : null}

      {activeOkr ? (
        <OkrDetailModal
          allObjectives={okrs}
          initialTab={activeOkrInitialTab}
          initialTargetKeyResultId={activeOkrTargetKeyResultId}
          initialKeyResultSentiments={projectKeyResultAnalyses.filter((analysis) =>
            getObjectiveKeyResults(activeOkr).some((keyResult) => keyResult.id === analysis.keyResultId)
          )}
          keyResultHistoryCache={portfolioKrHistoryById}
          keyProjects={keyProjects}
          okr={activeOkr}
          okrIndex={activeOkrIndex}
          onClose={handleCloseActiveOkr}
          onKeyProjectUpdated={handleKeyProjectUpdated}
          onObjectiveUpdated={handleObjectiveUpdated}
          onProjectToast={showProjectToast}
          projects={projects}
        />
      ) : null}

      {selectedProjectId && newRecordType ? (
        <NewOkrRecordModal
          keyProjects={keyProjects}
          objectives={okrs}
          onClose={() => setNewRecordType(null)}
          onCreated={handleCreatedRecord}
          project={selectedProject}
          projectId={selectedProjectId}
          projectName={projects.find((project) => project.id === selectedProjectId)?.name ?? selectedProjectId}
          type={newRecordType}
        />
      ) : null}
    </section>
  );
}
