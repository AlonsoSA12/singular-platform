"use client";

import { isValidElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import type {
  CachedTwSuggestion,
  CoachingContextRecord,
  DetailGroupsOptions,
  DetailPerson,
  EditableScoreField,
  EvidenceSignal,
  PillarSuggestion,
  PeriodOption,
  RecordGroup,
  RecordPeriodGroup,
  RecordPeriodMeta,
  RecordSummary,
  RestoredTwSuggestion,
  ScoreEditorConfig,
  SelectedPeriodCoverage,
  SelectedPeriodMeta,
  SuggestionAppliedPoints,
  SuggestionConfidence,
  SuggestionPillarKey,
  TrustworthinessAssistantProposal,
  TrustworthinessDraft,
  TrustworthinessRecord,
  TwGenerationProgress,
  TwGenerationStage,
  TwSuggestionCacheMetadata,
  TwSuggestionResponse,
  TwSuggestionStreamEvent
} from "./types";

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

const DATE_RANGE_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

const MEETING_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "America/Lima",
  year: "numeric"
});

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

export const PERIOD_SELECTION_STORAGE_KEY = "singular-platform-trustworthiness-periods";
export const DETAIL_DRAWER_WIDTH_STORAGE_KEY = "singular-platform-trustworthiness-detail-width";
export const CHAT_REVIEW_WIDTH_STORAGE_KEY = "singular-platform-trustworthiness-chat-width";
const TW_SUGGESTION_CACHE_KEY_PREFIX = "singular-platform-trustworthiness-suggestion";
const TW_SUGGESTION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_STATUS_FILTERS = ["Pending"];
export const FALLBACK_COMPLETED_STATUS = "Done";

const SCORE_EDITOR_FIELDS: ScoreEditorConfig[] = [
  {
    draftField: "reliabilityPoints",
    label: "Reliability",
    meaningField: "Reliability Meaning",
    pointsField: "Reliability Points",
    questionField: "Reliability Question"
  },
  {
    draftField: "intimacyPoints",
    label: "Intimacy",
    meaningField: "Intimacy Meaning",
    pointsField: "Intimacy Points",
    questionField: "Intimacy Question"
  },
  {
    draftField: "groupThinkingPoints",
    label: "Group Thinking",
    meaningField: "Group Thinking Meaning",
    pointsField: "Group Thinking Points",
    questionField: "Group Thinking Question"
  },
  {
    draftField: "credibilityPoints",
    label: "Credibility",
    meaningField: "Credibility Meaning",
    pointsField: "Credibility Points",
    questionField: "Credibility Question"
  }
];

export const SUGGESTION_PILLAR_CONFIG: Array<{
  draftField: EditableScoreField;
  key: SuggestionPillarKey;
  label: string;
}> = [
  { draftField: "reliabilityPoints", key: "reliability", label: "Reliability" },
  { draftField: "intimacyPoints", key: "intimacy", label: "Intimacy" },
  { draftField: "groupThinkingPoints", key: "groupThinking", label: "Group Thinking" },
  { draftField: "credibilityPoints", key: "credibility", label: "Credibility" }
];

const AI_JSON_FIELD_BY_DRAFT_FIELD: Record<EditableScoreField, string> = {
  credibilityPoints: "Credibility AI JSON",
  groupThinkingPoints: "Group Thinking Points AI JSON",
  intimacyPoints: "Intimacy AI JSON",
  reliabilityPoints: "Reliability AI JSON"
};

const AI_JSON_PAYLOAD_FIELD_BY_DRAFT_FIELD: Record<
  EditableScoreField,
  "credibilityAiJson" | "groupThinkingAiJson" | "intimacyAiJson" | "reliabilityAiJson"
> = {
  credibilityPoints: "credibilityAiJson",
  groupThinkingPoints: "groupThinkingAiJson",
  intimacyPoints: "intimacyAiJson",
  reliabilityPoints: "reliabilityAiJson"
};

const TALENT_PILLAR_MEANINGS: Record<SuggestionPillarKey, string[]> = {
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

export const TW_GENERATION_STEPS: Array<{
  id: TwGenerationStage;
  label: string;
}> = [
  { id: "validating_evaluation_data", label: "Validando datos de la evaluación" },
  { id: "fetching_airtable_meetings", label: "Consultando reuniones en Airtable" },
  { id: "building_meeting_evidence", label: "Preparando evidencia de reuniones" },
  { id: "sending_context_to_ai", label: "Enviando contexto a IA" },
  { id: "validating_structured_response", label: "Validando respuesta estructurada" },
  { id: "calculating_tw_score", label: "Calculando score final de TW" }
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toIsoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function getCurrentPeriodStart(now: Date) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  if (day >= 25) {
    return { year, month };
  }

  if (month === 0) {
    return { year: year - 1, month: 11 };
  }

  return { year, month: month - 1 };
}

export function createPeriods(now = new Date()): PeriodOption[] {
  const currentPeriod = getCurrentPeriodStart(now);
  const periods: PeriodOption[] = [];
  let cursorYear = now.getUTCFullYear() - 1;
  let cursorMonth = 5;

  while (
    cursorYear < currentPeriod.year ||
    (cursorYear === currentPeriod.year && cursorMonth <= currentPeriod.month)
  ) {
    const start = new Date(Date.UTC(cursorYear, cursorMonth, 25));
    const end = new Date(Date.UTC(cursorYear, cursorMonth + 1, 24));

    periods.push({
      id: toIsoDate(cursorYear, cursorMonth, 25),
      endLabel: capitalize(MONTH_YEAR_FORMATTER.format(end)),
      rangeLabel: `${DATE_RANGE_FORMATTER.format(start)} - ${DATE_RANGE_FORMATTER.format(end)}`
    });

    if (cursorMonth === 11) {
      cursorYear += 1;
      cursorMonth = 0;
    } else {
      cursorMonth += 1;
    }
  }

  return periods.reverse();
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAttachment(value: unknown): value is { filename?: string; url: string } {
  return isRecordLike(value) && typeof value.url === "string";
}

function isPersonLike(value: unknown): value is { email?: string; id?: string; name?: string } {
  return isRecordLike(value) && (
    typeof value.name === "string" ||
    typeof value.email === "string" ||
    typeof value.id === "string"
  );
}

function getStringValue(fields: Record<string, unknown>, fieldName: string) {
  const value = fields[fieldName];

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim().length > 0) {
        return item.trim();
      }
    }
  }

  return null;
}

function getFirstPersonName(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (isPersonLike(item) && typeof item.name === "string" && item.name.trim().length > 0) {
      return item.name.trim();
    }
  }

  return null;
}

function getFirstPersonEmail(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (isPersonLike(item) && typeof item.email === "string" && item.email.trim().length > 0) {
      return item.email.trim();
    }
  }

  return null;
}

function getFirstPersonRecord(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (isPersonLike(item)) {
      return item;
    }
  }

  return null;
}

function getAttachmentUrl(value: unknown) {
  if (isAttachment(value)) {
    return value.url;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (isAttachment(item)) {
        return item.url;
      }
    }
  }

  return null;
}

export function formatDateValue(value: string) {
  if (DATE_ONLY_PATTERN.test(value)) {
    return DATE_RANGE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
  }

  if (DATE_TIME_PATTERN.test(value)) {
    return DATE_TIME_FORMATTER.format(new Date(value));
  }

  return value;
}

function formatPrimitiveValue(value: string | number | boolean) {
  if (typeof value === "string") {
    return formatDateValue(value);
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(2).replace(/\.00$/, "");
  }

  return value ? "Si" : "No";
}

function stringifyObjectSummary(value: Record<string, unknown>) {
  if (typeof value.specialValue === "string") {
    return value.specialValue;
  }

  if (isAttachment(value)) {
    return value.filename ?? value.url;
  }

  if (isPersonLike(value)) {
    return [value.name, value.email, value.id].filter(Boolean).join(" · ");
  }

  return JSON.stringify(value, null, 2);
}

function getArrayPreview(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const preview = value
    .map((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
      ) {
        return formatPrimitiveValue(item);
      }

      if (isRecordLike(item)) {
        return stringifyObjectSummary(item);
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));

  return preview.length > 0 ? preview.join(" · ") : null;
}

function formatTrustworthinessScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Sin score";
  }

  if (value >= 0 && value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  return formatPrimitiveValue(value);
}

function getNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return Math.max(0, Math.round(parsedValue));
    }
  }

  return null;
}

export function createDraftFromRecord(record: TrustworthinessRecord): TrustworthinessDraft {
  return {
    credibilityPoints: getNumericValue(record.fields["Credibility Points"]),
    feedback: getStringValue(record.fields, "Feedback") ?? "",
    groupThinkingPoints: getNumericValue(record.fields["Group Thinking Points"]),
    intimacyPoints: getNumericValue(record.fields["Intimacy Points"]),
    reliabilityPoints: getNumericValue(record.fields["Reliability Points"])
  };
}

export function getTrustworthinessRecordCoverage(
  record: TrustworthinessRecord
): SelectedPeriodCoverage | null {
  const start = getStringValue(record.fields, "Start Date Range");
  const end = getStringValue(record.fields, "End Date Range");

  if (!start || !end) {
    return null;
  }

  return { end, start };
}

export function isPendingRecord(record: TrustworthinessRecord) {
  return normalizeStatusValue(getRecordStatus(record)) === "pending";
}

export function calculateTrustworthinessScoreFromProposal(
  proposal: TrustworthinessAssistantProposal
) {
  return (
    proposal.credibilityPoints +
    proposal.reliabilityPoints +
    proposal.intimacyPoints * 2 +
    proposal.groupThinkingPoints * 2
  ) / 60;
}

export function getTrustworthinessMeaningFromScore(score: number) {
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

export function formatTrustworthinessPercentageFromProposal(
  proposal: TrustworthinessAssistantProposal
) {
  return `${Math.round(calculateTrustworthinessScoreFromProposal(proposal) * 100)}%`;
}

export function createTrustworthinessAssistantWelcomeMessage(params: {
  evaluatedName: string;
  meetingsUsed: number;
  proposal: TrustworthinessAssistantProposal;
}) {
  const percentage = formatTrustworthinessPercentageFromProposal(params.proposal);

  return [
    `Ya preparé una propuesta inicial para ${params.evaluatedName} usando ${params.meetingsUsed} reuniones con evidencia útil.`,
    `TW sugerido: ${percentage}. Revisa los cuatro pilares y el feedback general que te dejé arriba.`,
    "¿Te parece bien y la guardamos, o quieres conversar un pilar específico o el feedback general antes de guardar?"
  ].join("\n");
}

export function getTrustworthinessAssistantSavePrompt() {
  return "Sí, está bien. Continuemos y guarda esta propuesta.";
}

export function getTrustworthinessAssistantFocusPrompt(
  focus: SuggestionPillarKey | "feedback"
) {
  if (focus === "feedback") {
    return "Quiero revisar y ajustar el feedback general antes de guardar.";
  }

  return `Quiero revisar ${getPillarLabel(focus)}. Explícame la evidencia y ajusta la propuesta si hace falta.`;
}

export function getCoachingUniqueKey(record: CoachingContextRecord) {
  return getStringValue(record.fields, "unique_key") ?? record.id;
}

export function getCoachingMeetingTitle(record: CoachingContextRecord) {
  return getStringValue(record.fields, "meeting_title") ?? "Reunión sin título";
}

export function getCoachingMeetingDatetimeLabel(record: CoachingContextRecord) {
  const rawValue = getStringValue(record.fields, "meeting_datetime");

  if (!rawValue) {
    return "Fecha no disponible";
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawValue;
  }

  return MEETING_DATE_TIME_FORMATTER.format(parsedDate);
}

export function formatTranscriptTime(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }

  return MEETING_DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatMeetingDatetimeValue(value: string | null) {
  if (!value) {
    return "Fecha no disponible";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return MEETING_DATE_TIME_FORMATTER.format(parsedDate);
}

export function getPillarDraftField(pillar: SuggestionPillarKey) {
  return SUGGESTION_PILLAR_CONFIG.find((config) => config.key === pillar)?.draftField ?? "reliabilityPoints";
}

export function getPillarLabel(pillar: SuggestionPillarKey) {
  return SUGGESTION_PILLAR_CONFIG.find((config) => config.key === pillar)?.label ?? pillar;
}

export function getAiJsonPayloadField(field: EditableScoreField) {
  return AI_JSON_PAYLOAD_FIELD_BY_DRAFT_FIELD[field];
}

function isPillarSuggestion(value: unknown): value is PillarSuggestion {
  if (!isRecordLike(value) || !isRecordLike(value.decisionDetail)) {
    return false;
  }

  return (
    typeof value.points === "number" &&
    typeof value.confidence === "string" &&
    typeof value.meaning === "string" &&
    typeof value.shortReason === "string" &&
    typeof value.decisionDetail.conclusion === "string" &&
    Array.isArray(value.decisionDetail.metricInputs) &&
    Array.isArray(value.decisionDetail.negativeSignals) &&
    Array.isArray(value.decisionDetail.positiveSignals) &&
    Array.isArray(value.decisionDetail.uncertainty)
  );
}

function parsePillarSuggestionJson(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;
    return isPillarSuggestion(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function serializePillarSuggestion(value: PillarSuggestion) {
  return JSON.stringify(value, null, 2);
}

export function buildDetailAiSuggestions(
  record: TrustworthinessRecord,
  suggestion: TwSuggestionResponse | null
): Partial<Record<EditableScoreField, PillarSuggestion>> {
  const storedSuggestions = SUGGESTION_PILLAR_CONFIG.reduce<
    Partial<Record<EditableScoreField, PillarSuggestion>>
  >((accumulator, pillarConfig) => {
    const parsedSuggestion = parsePillarSuggestionJson(
      record.fields[AI_JSON_FIELD_BY_DRAFT_FIELD[pillarConfig.draftField]]
    );

    if (parsedSuggestion) {
      accumulator[pillarConfig.draftField] = parsedSuggestion;
    }

    return accumulator;
  }, {});

  if (!suggestion) {
    return storedSuggestions;
  }

  return {
    ...storedSuggestions,
    credibilityPoints: suggestion.pillars.credibility,
    groupThinkingPoints: suggestion.pillars.groupThinking,
    intimacyPoints: suggestion.pillars.intimacy,
    reliabilityPoints: suggestion.pillars.reliability
  };
}

export function getEditablePillarMeaning(pillar: SuggestionPillarKey, points: number) {
  return TALENT_PILLAR_MEANINGS[pillar][Math.max(1, Math.min(10, points)) - 1];
}

export function createSuggestionDraftPointsFromSuggestion(suggestion: TwSuggestionResponse) {
  return {
    credibility: suggestion.pillars.credibility.points,
    groupThinking: suggestion.pillars.groupThinking.points,
    intimacy: suggestion.pillars.intimacy.points,
    reliability: suggestion.pillars.reliability.points
  };
}

function isSuggestionDraftPoints(value: unknown): value is Record<SuggestionPillarKey, number> {
  if (!isRecordLike(value)) {
    return false;
  }

  return SUGGESTION_PILLAR_CONFIG.every(({ key }) => {
    const points = value[key];
    return typeof points === "number" && Number.isInteger(points) && points >= 0 && points <= 10;
  });
}

function normalizeSuggestionDraftPoints(
  suggestion: TwSuggestionResponse,
  draftPoints: unknown
): Record<SuggestionPillarKey, number> {
  return isSuggestionDraftPoints(draftPoints)
    ? draftPoints
    : createSuggestionDraftPointsFromSuggestion(suggestion);
}

export function createTwSuggestionCacheKey(params: {
  end: string;
  evaluatedEmail: string;
  recordId: string;
  start: string;
}) {
  return [
    TW_SUGGESTION_CACHE_KEY_PREFIX,
    params.recordId,
    params.evaluatedEmail.toLowerCase(),
    params.start,
    params.end
  ].join(":");
}

function isSuggestionAppliedPoints(value: unknown): value is SuggestionAppliedPoints {
  if (!isRecordLike(value)) {
    return false;
  }

  return SUGGESTION_PILLAR_CONFIG.every(({ key }) => {
    const points = value[key];
    return (
      points === undefined ||
      (typeof points === "number" && Number.isInteger(points) && points >= 0 && points <= 10)
    );
  });
}

function normalizeSuggestionAppliedPoints(value: unknown): SuggestionAppliedPoints {
  return isSuggestionAppliedPoints(value) ? value : {};
}

function isCachedTwSuggestion(value: unknown): value is CachedTwSuggestion {
  return (
    isRecordLike(value) &&
    value.version === 2 &&
    typeof value.recordId === "string" &&
    typeof value.evaluatedEmail === "string" &&
    typeof value.start === "string" &&
    typeof value.end === "string" &&
    isSuggestionAppliedPoints(value.appliedPoints) &&
    typeof value.cachedAt === "number" &&
    typeof value.expiresAt === "number" &&
    isRecordLike(value.suggestion) &&
    value.suggestion.ok === true &&
    isSuggestionDraftPoints(value.draftPoints)
  );
}

function cacheMetadataMatches(cacheEntry: CachedTwSuggestion, metadata: TwSuggestionCacheMetadata) {
  return (
    cacheEntry.recordId === metadata.recordId &&
    cacheEntry.evaluatedEmail.toLowerCase() === metadata.evaluatedEmail.toLowerCase() &&
    cacheEntry.start === metadata.start &&
    cacheEntry.end === metadata.end
  );
}

export function clearExpiredSuggestionCache() {
  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const cacheKey = window.localStorage.key(index);

    if (!cacheKey?.startsWith(`${TW_SUGGESTION_CACHE_KEY_PREFIX}:`)) {
      continue;
    }

    try {
      const rawValue = window.localStorage.getItem(cacheKey);
      const parsedValue = rawValue ? (JSON.parse(rawValue) as unknown) : null;

      if (!isCachedTwSuggestion(parsedValue) || now > parsedValue.expiresAt) {
        window.localStorage.removeItem(cacheKey);
      }
    } catch {
      window.localStorage.removeItem(cacheKey);
    }
  }
}

export function readCachedTwSuggestion(metadata: TwSuggestionCacheMetadata): RestoredTwSuggestion | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cacheKey = createTwSuggestionCacheKey(metadata);

  try {
    const rawValue = window.localStorage.getItem(cacheKey);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isCachedTwSuggestion(parsedValue)) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    if (!cacheMetadataMatches(parsedValue, metadata) || Date.now() > parsedValue.expiresAt) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return {
      appliedPoints: normalizeSuggestionAppliedPoints(parsedValue.appliedPoints),
      cachedAt: parsedValue.cachedAt,
      draftPoints: normalizeSuggestionDraftPoints(parsedValue.suggestion, parsedValue.draftPoints),
      end: parsedValue.end,
      evaluatedEmail: parsedValue.evaluatedEmail,
      recordId: parsedValue.recordId,
      start: parsedValue.start,
      suggestion: parsedValue.suggestion
    };
  } catch {
    window.localStorage.removeItem(cacheKey);
    return null;
  }
}

export function writeCachedTwSuggestion(params: {
  appliedPoints?: SuggestionAppliedPoints;
  draftPoints?: Record<SuggestionPillarKey, number>;
  metadata: TwSuggestionCacheMetadata;
  preserveCacheTimestamp?: boolean;
  suggestion: TwSuggestionResponse;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const cacheKey = createTwSuggestionCacheKey(params.metadata);
  let cachedAt = Date.now();
  let expiresAt = cachedAt + TW_SUGGESTION_CACHE_TTL_MS;

  if (params.preserveCacheTimestamp) {
    try {
      const rawValue = window.localStorage.getItem(cacheKey);
      const parsedValue = rawValue ? (JSON.parse(rawValue) as unknown) : null;

      if (
        isCachedTwSuggestion(parsedValue) &&
        cacheMetadataMatches(parsedValue, params.metadata) &&
        Date.now() <= parsedValue.expiresAt
      ) {
        cachedAt = parsedValue.cachedAt;
        expiresAt = parsedValue.expiresAt;
      }
    } catch {
      cachedAt = Date.now();
      expiresAt = cachedAt + TW_SUGGESTION_CACHE_TTL_MS;
    }
  }

  const cacheEntry: CachedTwSuggestion = {
    ...params.metadata,
    appliedPoints: params.appliedPoints ?? {},
    cachedAt,
    draftPoints: params.draftPoints ?? createSuggestionDraftPointsFromSuggestion(params.suggestion),
    evaluatedEmail: params.metadata.evaluatedEmail.toLowerCase(),
    expiresAt,
    suggestion: params.suggestion,
    version: 2
  };

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch {
    // Cache is opportunistic; failing to write must not block suggestion review.
  }
}

export function formatSuggestionCacheAge(cachedAt: number) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - cachedAt) / 60000));

  if (elapsedMinutes < 1) {
    return "hace menos de 1 minuto";
  }

  if (elapsedMinutes < 60) {
    return `hace ${elapsedMinutes} minuto${elapsedMinutes === 1 ? "" : "s"}`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `hace ${elapsedHours} hora${elapsedHours === 1 ? "" : "s"}`;
}

export function getConfidenceLabel(confidence: SuggestionConfidence) {
  if (confidence === "high") {
    return "Alta";
  }

  if (confidence === "medium") {
    return "Media";
  }

  return "Baja";
}

export function getSourceLabel(sourceType: EvidenceSignal["sourceType"]) {
  const labels: Record<EvidenceSignal["sourceType"], string> = {
    action_item: "Action item",
    coaching_analysis: "Coaching analysis",
    coaching_summary: "Coaching summary",
    metric_score: "Métrica",
    topic: "Topic",
    transcript_summary: "Resumen transcript"
  };

  return labels[sourceType];
}

export function getImpactLabel(impact: EvidenceSignal["impact"]) {
  const labels: Record<EvidenceSignal["impact"], string> = {
    lowers_score: "Baja score",
    raises_score: "Sube score",
    supports_current_score: "Sostiene score"
  };

  return labels[impact];
}

export function getDisplayParticipants(
  meeting: CoachingContextRecord,
  selectedRecordSummary: RecordSummary
) {
  return (meeting.participants ?? []).map((participant) => {
    const isEvaluated =
      selectedRecordSummary.evaluatedEmail &&
      participant.email.toLowerCase() === selectedRecordSummary.evaluatedEmail.toLowerCase();

    return {
      ...participant,
      avatarUrl: isEvaluated ? selectedRecordSummary.avatarUrl ?? participant.avatarUrl : participant.avatarUrl
    };
  });
}

function buildDetailPersonCard(person: DetailPerson) {
  return (
    <div className="detail-person-card">
      {person.avatarUrl ? (
        <img
          alt={`Foto de ${person.name}`}
          className="detail-person-avatar"
          src={person.avatarUrl}
        />
      ) : (
        <span aria-hidden="true" className="detail-person-avatar detail-person-avatar-fallback">
          <svg viewBox="0 0 24 24">
            <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.87 0-7 2.24-7 5v1h14v-1c0-2.76-3.13-5-7-5Z" />
          </svg>
        </span>
      )}

      <div className="detail-person-copy">
        <strong>{person.name}</strong>
        {person.email ? <span>{person.email}</span> : null}
        {person.role ? <small>{person.role}</small> : null}
      </div>
    </div>
  );
}

function buildDetailContextList(items: string[]) {
  return (
    <div className="detail-context-list">
      {items.map((item, index) => (
        <div className="detail-context-item" key={`${item}-${index}`}>
          {item}
        </div>
      ))}
    </div>
  );
}

function ScoreDetailCard(props: {
  aiSuggestion?: PillarSuggestion | null;
  dirty: boolean;
  editable: boolean;
  meaning: unknown;
  onChange?: (value: number) => void;
  onDiscard?: () => void;
  points: unknown;
  question: unknown;
  value: number | null;
}) {
  const [isAiTooltipOpen, setIsAiTooltipOpen] = useState(false);
  const [aiTooltipStyle, setAiTooltipStyle] = useState<CSSProperties>({});
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const aiTooltipButtonRef = useRef<HTMLButtonElement | null>(null);
  const aiTooltipPanelRef = useRef<HTMLDivElement | null>(null);
  const safePoints = getNumericValue(props.points);
  const activeValue = hoveredValue ?? props.value ?? 0;

  useEffect(() => {
    if (!isAiTooltipOpen) {
      return;
    }

    function updateTooltipPosition() {
      const buttonElement = aiTooltipButtonRef.current;
      const panelElement = aiTooltipPanelRef.current;

      if (!buttonElement || !panelElement) {
        return;
      }

      const buttonRect = buttonElement.getBoundingClientRect();
      const panelWidth = Math.min(420, window.innerWidth - 32);
      const panelHeight = Math.min(panelElement.offsetHeight || 0, window.innerHeight - 32);
      const spaceBelow = window.innerHeight - buttonRect.bottom - 16;
      const openAbove = spaceBelow < Math.min(panelHeight, 280) && buttonRect.top > spaceBelow;
      const top = openAbove
        ? Math.max(16, buttonRect.top - panelHeight - 8)
        : Math.min(window.innerHeight - panelHeight - 16, buttonRect.bottom + 8);
      const left = Math.min(
        window.innerWidth - panelWidth - 16,
        Math.max(16, buttonRect.right - panelWidth)
      );

      setAiTooltipStyle({
        left,
        top,
        width: panelWidth
      });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAiTooltipOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        aiTooltipPanelRef.current?.contains(target) ||
        aiTooltipButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsAiTooltipOpen(false);
    }

    const animationFrameId = window.requestAnimationFrame(updateTooltipPosition);

    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAiTooltipOpen]);

  return (
    <div className="detail-score-card">
      {props.aiSuggestion ? (
        <div className="detail-score-card-header">
          <small>Contexto del pilar</small>
          <div className="detail-score-ai">
            <button
              aria-expanded={isAiTooltipOpen}
              aria-label="Ver data de IA"
              ref={aiTooltipButtonRef}
              className={`detail-score-ai-toggle ${isAiTooltipOpen ? "is-open" : ""}`}
              data-tooltip="Ver data IA"
              onClick={() => setIsAiTooltipOpen((current) => !current)}
              title="Ver data IA"
              type="button"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2.5a1 1 0 0 1 .95.68l1.23 3.7a1 1 0 0 0 .63.63l3.7 1.23a1 1 0 0 1 0 1.9l-3.7 1.23a1 1 0 0 0-.63.63l-1.23 3.7a1 1 0 0 1-1.9 0l-1.23-3.7a1 1 0 0 0-.63-.63l-3.7-1.23a1 1 0 0 1 0-1.9l3.7-1.23a1 1 0 0 0 .63-.63l1.23-3.7a1 1 0 0 1 .95-.68Z" />
              </svg>
              <span>IA</span>
            </button>

            {isAiTooltipOpen && typeof document !== "undefined"
              ? createPortal(
                  <div className="detail-score-ai-layer">
                    <div
                      className="detail-score-ai-tooltip"
                      ref={aiTooltipPanelRef}
                      role="dialog"
                      style={aiTooltipStyle}
                    >
                      <div className="detail-score-ai-row">
                        <strong>points</strong>
                        <span>{props.aiSuggestion.points}</span>
                      </div>
                      <div className="detail-score-ai-row">
                        <strong>confidence</strong>
                        <span>{props.aiSuggestion.confidence}</span>
                      </div>
                      <div className="detail-score-ai-block">
                        <strong>meaning</strong>
                        <p>{props.aiSuggestion.meaning}</p>
                      </div>
                      <div className="detail-score-ai-block">
                        <strong>shortReason</strong>
                        <p>{props.aiSuggestion.shortReason}</p>
                      </div>
                      <div className="detail-score-ai-block">
                        <strong>decisionDetail</strong>
                        <pre>{JSON.stringify(props.aiSuggestion.decisionDetail, null, 2)}</pre>
                      </div>
                    </div>
                  </div>,
                  document.body
                )
              : null}
          </div>
        </div>
      ) : null}
      <div className="detail-score-card-body">
        <div>
          <small>Pregunta</small>
          <div>{renderValue(props.question)}</div>
        </div>
        <div>
          <small>Puntos</small>
          {props.editable && props.onChange ? (
            <div
              className="detail-score-editor"
              onMouseLeave={() => setHoveredValue(null)}
              role="radiogroup"
            >
              {Array.from({ length: 10 }, (_, index) => {
                const starValue = index + 1;
                const isActive = activeValue >= starValue;

                return (
                  <button
                    aria-checked={props.value === starValue}
                    className={`detail-score-star-button ${isActive ? "is-active" : ""}`}
                    key={starValue}
                    onClick={() => props.onChange?.(starValue)}
                    onMouseEnter={() => setHoveredValue(starValue)}
                    role="radio"
                    type="button"
                  >
                    ★
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className="detail-score-stars"
              aria-label={safePoints !== null ? `${safePoints} puntos` : "Puntaje sin dato"}
            >
              {safePoints !== null ? "★".repeat(safePoints) : renderValue(props.points)}
            </div>
          )}
        </div>
        <div>
          <small>Feedback</small>
          <div>{renderValue(props.meaning)}</div>
          {props.editable ? (
            <span className="detail-score-note">Este texto se recalcula al guardar.</span>
          ) : null}
        </div>
      </div>

      {props.editable && props.dirty && props.onDiscard ? (
        <div className="detail-card-actions">
          <button
            className="detail-card-action detail-card-action-secondary"
            onClick={props.onDiscard}
            type="button"
          >
            Discard
          </button>
          <span className="detail-score-note">Cambio pendiente. Guarda la evaluación al final.</span>
        </div>
      ) : null}
    </div>
  );
}

function buildTrustworthinessResultCard(score: unknown, meaning: unknown) {
  return (
    <div className="detail-score-card detail-score-card-final">
      <div className="detail-score-card-header">
        <strong>Trustworthiness</strong>
        <span>{renderValue(score)}</span>
      </div>
      <div className="detail-score-card-body">
        <div>
          <small>Evaluación</small>
          <div>{renderValue(meaning)}</div>
        </div>
      </div>
    </div>
  );
}

export function buildDetailGroups(record: TrustworthinessRecord, options: DetailGroupsOptions): RecordGroup[] {
  const { fields } = record;
  const evaluatorRecord = getFirstPersonRecord(fields["User (de Evaluator) (de TW Examns)"]);
  const evaluatedRecord = getFirstPersonRecord(fields["User (de Evaluated) (de TW Examns)"]);
  const evaluator: DetailPerson = {
    avatarUrl: getAttachmentUrl(fields["Photo Evaluator"]),
    email:
      getStringValue(fields, "Email address from Evaluator") ??
      (evaluatorRecord?.email && typeof evaluatorRecord.email === "string"
        ? evaluatorRecord.email.trim()
        : null),
    name:
      getStringValue(fields, "evaluator name") ??
      (evaluatorRecord?.name && typeof evaluatorRecord.name === "string"
        ? evaluatorRecord.name.trim()
        : "Sin evaluator"),
    role: getArrayPreview(fields["Role Type Evaluator (de TW Examns)"])
  };
  const evaluated: DetailPerson = {
    avatarUrl: getAttachmentUrl(fields["Photo Evaluated"]),
    email:
      getStringValue(fields, "Email From Evaluated") ??
      (evaluatedRecord?.email && typeof evaluatedRecord.email === "string"
        ? evaluatedRecord.email.trim()
        : null),
    name:
      getStringValue(fields, "Evaluated Resources") ??
      (evaluatedRecord?.name && typeof evaluatedRecord.name === "string"
        ? evaluatedRecord.name.trim()
        : "Sin evaluated"),
    role:
      getArrayPreview(fields["Rol type Evaluated (de TW Examns)"]) ??
      getArrayPreview(fields["Rol type Evaluated (from TW Examns)"]) ??
      getArrayPreview(fields["Roles Evaluation"])
  };
  const relatedProjects = getStringValue(fields, "related_projects");
  const projectSprintPairs = Array.isArray(fields["Project / Sprint"])
    ? fields["Project / Sprint"].filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];
  const projectSprintDisplay =
    projectSprintPairs.length > 0
      ? buildDetailContextList(projectSprintPairs)
      : getArrayPreview(fields["Sprint Name Short"]) ??
        relatedProjects ??
        getStringValue(fields, "Sprint") ??
        getArrayPreview(fields["Sprint"]) ??
        getStringValue(fields, "Sprints") ??
        getArrayPreview(fields["Sprints"]);

  const detailGroups: RecordGroup[] = [
    {
      key: "summary",
      label: "Resumen",
      fields: [
        { name: "Strengths", value: fields["Stregnths"] },
        { name: "Weakness", value: fields["Weekness"] }
      ].filter((field) => field.value !== null && field.value !== undefined)
    },
    {
      key: "people",
      label: "Personas",
      fields: [
        { name: "Evaluator", value: buildDetailPersonCard(evaluator) },
        { name: "Evaluated", value: buildDetailPersonCard(evaluated) }
      ]
    },
    {
      key: "context",
      label: "Contexto",
      fields: [{ name: "Project / Sprint", value: projectSprintDisplay }].filter(
        (field) => field.value !== null && field.value !== undefined
      )
    },
    {
      key: "scores",
      label: "Trustworthiness",
      fields: [
        ...SCORE_EDITOR_FIELDS.map((scoreField) => ({
          name: scoreField.label,
          value: (
            <ScoreDetailCard
              aiSuggestion={options.aiSuggestions[scoreField.draftField] ?? null}
              dirty={options.isDirty(scoreField.draftField)}
              editable={options.editable}
              meaning={fields[scoreField.meaningField]}
              onChange={(value) => options.onPointsChange(scoreField.draftField, value)}
              onDiscard={() => options.onDiscard(scoreField.draftField)}
              points={options.draft ? options.draft[scoreField.draftField] : fields[scoreField.pointsField]}
              question={fields[scoreField.questionField]}
              value={
                options.draft
                  ? options.draft[scoreField.draftField]
                  : getNumericValue(fields[scoreField.pointsField])
              }
            />
          )
        })),
        {
          name: "Trustworthiness Result",
          value: buildTrustworthinessResultCard(
            fields["Trustworthiness"],
            fields["Trustworthiness Meaning"]
          )
        }
      ]
    },
    {
      key: "narrative",
      label: "Narrativa",
      fields: [{
        name: "Feedback",
        walkthroughId: "detail-feedback",
        value: options.editable ? (
          <div className="trustworthiness-feedback-card">
            <div className="trustworthiness-feedback-toolbar">
              <button
                className="detail-card-action detail-card-action-secondary"
                disabled={options.isGeneratingFeedback}
                onClick={options.onGenerateFeedback}
                type="button"
              >
                {options.isGeneratingFeedback ? "Generando con IA..." : "Generar con IA"}
              </button>
              {options.feedbackGenerationError ? (
                <span className="detail-card-error">{options.feedbackGenerationError}</span>
              ) : null}
            </div>
            <textarea
              className="trustworthiness-feedback-editor"
              onChange={(event) => options.onFeedbackChange(event.target.value)}
              rows={9}
              value={options.draft?.feedback ?? ""}
            />
            {options.isDirty("feedback") ? (
              <div className="detail-card-actions">
                <button
                  className="detail-card-action detail-card-action-secondary"
                  disabled={!options.isDirty("feedback")}
                  onClick={() => options.onDiscard("feedback")}
                  type="button"
                >
                  Discard
                </button>
                <span className="detail-score-note">Cambio pendiente. Guarda la evaluación al final.</span>
              </div>
            ) : null}
          </div>
        ) : (
          fields["Feedback"]
        )
      }].filter((field) => field.value !== null && field.value !== undefined)
    }
  ];

  return detailGroups.filter((group) => group.fields.length > 0);
}

export function getRecordSummary(record: TrustworthinessRecord): RecordSummary {
  const { fields } = record;
  const evaluatedName =
    getStringValue(fields, "Evaluated Resources") ??
    getFirstPersonName(fields["User (de Evaluated) (de TW Examns)"]) ??
    "Sin nombre";
  const evaluatedEmail =
    getStringValue(fields, "Email From Evaluated") ??
    getFirstPersonEmail(fields["User (de Evaluated) (de TW Examns)"]);
  const avatarUrl = getAttachmentUrl(fields["Photo Evaluated"]);
  const context =
    getStringValue(fields, "related_projects") ??
    getArrayPreview(fields["Client Name"]) ??
    "Sin contexto";
  const roleLabel =
    getArrayPreview(fields["Rol type Evaluated (de TW Examns)"]) ??
    getArrayPreview(fields["Roles Evaluation"]) ??
    "Sin rol";
  const lastModified =
    getStringValue(fields, "Last Modified Status") ??
    getStringValue(fields, "Update Raiting") ??
    getStringValue(fields, "createdAt");
  const periodMeta = getRecordPeriodMeta(record);

  return {
    avatarUrl,
    context,
    evaluatedEmail,
    evaluatedName,
    periodLabel: periodMeta.label,
    roleLabel,
    scoreLabel: formatTrustworthinessScore(fields["Trustworthiness"]),
    status: getStringValue(fields, "Rating Status") ?? "Sin estado",
    strengths: getStringValue(fields, "Stregnths"),
    updatedLabel: lastModified ? formatDateValue(lastModified) : "Sin fecha",
    weaknesses: getStringValue(fields, "Weekness")
  };
}

function getRecordPeriodMeta(record: TrustworthinessRecord): RecordPeriodMeta {
  const startDate = getStringValue(record.fields, "Start Date Range");
  const endDate = getStringValue(record.fields, "End Date Range");
  const createdAt = getStringValue(record.fields, "createdAt");

  if (startDate && endDate) {
    return {
      key: `${startDate}__${endDate}`,
      label: `${formatDateValue(startDate)} - ${formatDateValue(endDate)}`,
      sortValue: startDate
    };
  }

  if (startDate) {
    return {
      key: startDate,
      label: formatDateValue(startDate),
      sortValue: startDate
    };
  }

  if (createdAt) {
    return {
      key: `created-at:${createdAt}`,
      label: formatDateValue(createdAt),
      sortValue: createdAt
    };
  }

  return {
    key: "sin-periodo",
    label: "Sin periodo",
    sortValue: ""
  };
}

function getRecordSortValue(record: TrustworthinessRecord) {
  const { sortValue } = getRecordPeriodMeta(record);

  return sortValue;
}

export function compareRecords(left: TrustworthinessRecord, right: TrustworthinessRecord) {
  const leftDate = getRecordSortValue(left);
  const rightDate = getRecordSortValue(right);

  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate);
  }

  return getRecordSummary(left).evaluatedName.localeCompare(
    getRecordSummary(right).evaluatedName,
    "es"
  );
}

export function dedupeRecords(records: TrustworthinessRecord[]) {
  const uniqueRecords = new Map<string, TrustworthinessRecord>();

  for (const record of records) {
    if (!uniqueRecords.has(record.id)) {
      uniqueRecords.set(record.id, record);
    }
  }

  return [...uniqueRecords.values()];
}

export function getSelectedPeriodMeta(period: PeriodOption): SelectedPeriodMeta {
  const start = period.id;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const end = toIsoDate(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 24);

  return {
    end,
    id: period.id,
    label: `${period.endLabel}: ${period.rangeLabel}`,
    start
  };
}

export function getSelectedPeriodCoverage(periods: PeriodOption[]): SelectedPeriodCoverage | null {
  const selectedPeriodMetas = periods.map(getSelectedPeriodMeta);

  if (selectedPeriodMetas.length === 0) {
    return null;
  }

  const start = selectedPeriodMetas.reduce(
    (current, period) => (period.start < current ? period.start : current),
    selectedPeriodMetas[0].start
  );
  const end = selectedPeriodMetas.reduce(
    (current, period) => (period.end > current ? period.end : current),
    selectedPeriodMetas[0].end
  );

  return { end, start };
}

function recordBelongsToSelectedPeriod(record: TrustworthinessRecord, period: SelectedPeriodMeta) {
  const startDate = getStringValue(record.fields, "Start Date Range");
  const endDate = getStringValue(record.fields, "End Date Range");

  if (startDate && endDate) {
    return startDate <= period.end && endDate >= period.start;
  }

  if (startDate) {
    return startDate >= period.start && startDate <= period.end;
  }

  if (endDate) {
    return endDate >= period.start && endDate <= period.end;
  }

  return false;
}

export function groupRecordsBySelectedPeriods(
  records: TrustworthinessRecord[],
  selectedPeriods: PeriodOption[]
): RecordPeriodGroup[] {
  const selectedPeriodMetas = selectedPeriods
    .map(getSelectedPeriodMeta)
    .sort((left, right) => right.start.localeCompare(left.start));
  const groupedRecords = new Map<string, RecordPeriodGroup>(
    selectedPeriodMetas.map((period) => [
      period.id,
      {
        id: period.id,
        label: period.label,
        records: [],
        sortValue: period.start
      }
    ])
  );
  const fallbackGroups = new Map<string, RecordPeriodGroup>();

  for (const record of records) {
    const matchingSelectedPeriod = selectedPeriodMetas.find((period) =>
      recordBelongsToSelectedPeriod(record, period)
    );

    if (matchingSelectedPeriod) {
      groupedRecords.get(matchingSelectedPeriod.id)?.records.push(record);
      continue;
    }

    const periodMeta = getRecordPeriodMeta(record);
    const currentFallbackGroup = fallbackGroups.get(periodMeta.key);

    if (currentFallbackGroup) {
      currentFallbackGroup.records.push(record);
      continue;
    }

    fallbackGroups.set(periodMeta.key, {
      id: periodMeta.key,
      label: periodMeta.label,
      records: [record],
      sortValue: periodMeta.sortValue
    });
  }

  return [...groupedRecords.values(), ...fallbackGroups.values()]
    .filter((group) => group.records.length > 0)
    .sort((left, right) => {
      if (left.sortValue !== right.sortValue) {
        return right.sortValue.localeCompare(left.sortValue);
      }

      return left.label.localeCompare(right.label, "es");
    });
}

function renderStructuredObject(value: Record<string, unknown>) {
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return <span className="record-empty-value">Sin datos</span>;
  }

  return (
    <div className="record-inline-grid">
      {entries.map(([key, nestedValue]) => (
        <div className="record-inline-entry" key={key}>
          <span>{key}</span>
          <div>{renderValue(nestedValue)}</div>
        </div>
      ))}
    </div>
  );
}

export function renderValue(value: unknown): ReactNode {
  if (isValidElement(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return <span className="record-empty-value">No disponible</span>;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const formatted = formatPrimitiveValue(value);
    const isLongText =
      typeof value === "string" &&
      (value.includes("\n") || value.length > 120 || value.trim().startsWith("{"));

    if (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}")) {
      return <pre className="record-code">{value}</pre>;
    }

    if (isLongText) {
      return <div className="record-text-block">{formatted}</div>;
    }

    return <span>{formatted}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="record-empty-value">Sin datos</span>;
    }

    const arePrimitiveValues = value.every(
      (item) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    if (arePrimitiveValues) {
      return (
        <div className="record-chip-list">
          {value.map((item, index) => (
            <span className="record-chip" key={`${String(item)}-${index}`}>
              {formatPrimitiveValue(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="record-stack-list">
        {value.map((item, index) => {
          if (isAttachment(item)) {
            return (
              <a
                className="record-link-card"
                href={item.url}
                key={`${item.url}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <strong>{item.filename ?? "Adjunto"}</strong>
                <span>{item.url}</span>
              </a>
            );
          }

          if (isPersonLike(item)) {
            return (
              <div
                className="record-person-card"
                key={`${item.id ?? item.email ?? "person"}-${index}`}
              >
                <strong>{item.name ?? "Registro"}</strong>
                {item.email ? <span>{item.email}</span> : null}
                {item.id ? <small>{item.id}</small> : null}
              </div>
            );
          }

          if (isRecordLike(item)) {
            return (
              <div className="record-object-card" key={index}>
                {renderStructuredObject(item)}
              </div>
            );
          }

          return (
            <span className="record-chip" key={index}>
              {String(item)}
            </span>
          );
        })}
      </div>
    );
  }

  if (isAttachment(value)) {
    return (
      <a className="record-link-card" href={value.url} rel="noreferrer" target="_blank">
        <strong>{value.filename ?? "Adjunto"}</strong>
        <span>{value.url}</span>
      </a>
    );
  }

  if (isPersonLike(value)) {
    return (
      <div className="record-person-card">
        <strong>{value.name ?? "Registro"}</strong>
        {value.email ? <span>{value.email}</span> : null}
        {value.id ? <small>{value.id}</small> : null}
      </div>
    );
  }

  if (isRecordLike(value)) {
    return renderStructuredObject(value);
  }

  return <span>{String(value)}</span>;
}

export function getStatusClassName(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("done")) {
    return "is-done";
  }

  if (normalizedStatus.includes("pending")) {
    return "is-pending";
  }

  return "is-neutral";
}

export function normalizeStatusValue(status: string) {
  return status.trim().toLowerCase();
}

export function getRecordStatus(record: TrustworthinessRecord) {
  return getStringValue(record.fields, "Rating Status") ?? "Sin estado";
}

export function sortStatuses(left: string, right: string) {
  const leftNormalized = normalizeStatusValue(left);
  const rightNormalized = normalizeStatusValue(right);
  const leftPriority =
    leftNormalized === "pending" ? 0 : leftNormalized === "done" ? 1 : 2;
  const rightPriority =
    rightNormalized === "pending" ? 0 : rightNormalized === "done" ? 1 : 2;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.localeCompare(right, "es");
}

export function SuggestionStarEditor(props: {
  disabled?: boolean;
  onChange?: (value: number) => void;
  value: number;
}) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const activeValue = hoveredValue ?? props.value;

  return (
    <div
      className={`detail-score-editor ${props.disabled ? "is-disabled" : ""}`}
      onMouseLeave={() => setHoveredValue(null)}
      role="radiogroup"
    >
      {Array.from({ length: 10 }, (_, index) => {
        const starValue = index + 1;
        const isActive = activeValue >= starValue;

        return (
          <button
            aria-checked={props.value === starValue}
            className={`detail-score-star-button ${isActive ? "is-active" : ""}`}
            disabled={props.disabled}
            key={starValue}
            onClick={() => props.onChange?.(starValue)}
            onMouseEnter={() => {
              if (!props.disabled) {
                setHoveredValue(starValue);
              }
            }}
            role="radio"
            type="button"
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export function LoadingProgress({ label }: { label: string }) {
  return (
    <div aria-live="polite" className="workspace-loading-state" role="status">
      <div className="workspace-loading-head">
        <span aria-hidden="true" className="workspace-loading-spinner" />
        <p className="workspace-response-state">{label}</p>
      </div>
      <div aria-hidden="true" className="workspace-loading-bar">
        <span className="workspace-loading-bar-indicator" />
      </div>
    </div>
  );
}

export function createIdleTwGenerationProgress(): TwGenerationProgress {
  return {
    completedStages: [],
    currentStage: null,
    errorMessage: null,
    errorStage: null,
    status: "idle"
  };
}

export function createRunningTwGenerationProgress(): TwGenerationProgress {
  return {
    completedStages: [],
    currentStage: "validating_evaluation_data",
    errorMessage: null,
    errorStage: null,
    status: "running"
  };
}

export function getGenerationCompletedStages(stage: TwGenerationStage) {
  const stageIndex = TW_GENERATION_STEPS.findIndex((step) => step.id === stage);

  if (stageIndex <= 0) {
    return [];
  }

  return TW_GENERATION_STEPS.slice(0, stageIndex).map((step) => step.id);
}

function isTwGenerationStage(value: unknown): value is TwGenerationStage {
  return TW_GENERATION_STEPS.some((step) => step.id === value);
}

export function isTwSuggestionStreamEvent(value: unknown): value is TwSuggestionStreamEvent {
  if (!isRecordLike(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "stage") {
    return isTwGenerationStage(value.stage) && typeof value.label === "string";
  }

  if (value.type === "result") {
    return isRecordLike(value.data) && value.data.ok === true;
  }

  if (value.type === "error") {
    return (
      typeof value.message === "string" &&
      (value.stage === null || isTwGenerationStage(value.stage))
    );
  }

  return false;
}

export function TwGenerationStatusCard({
  onRetry,
  progress
}: {
  onRetry: () => void;
  progress: TwGenerationProgress;
}) {
  if (progress.status === "idle") {
    return null;
  }

  const activeStep = progress.currentStage
    ? TW_GENERATION_STEPS.find((step) => step.id === progress.currentStage)
    : null;
  const completedCount =
    progress.status === "success"
      ? TW_GENERATION_STEPS.length
      : progress.completedStages.length;
  const progressPercent = Math.max(
    progress.status === "running" ? 8 : 0,
    Math.round((completedCount / TW_GENERATION_STEPS.length) * 100)
  );
  const footerMessage =
    progress.status === "success"
      ? "La sugerencia ya está lista para revisión."
      : progress.status === "error"
        ? progress.errorMessage ?? "No se pudo completar la sugerencia TW."
        : activeStep?.label ?? "Iniciando generación de sugerencia TW.";

  return (
    <section
      aria-live="polite"
      className={`tw-generation-status-card is-${progress.status}`}
      role="status"
    >
      <div className="tw-generation-status-header">
        <div>
          <span>Generando sugerencia TW</span>
          <h4>
            {progress.status === "success"
              ? "Sugerencia lista"
              : progress.status === "error"
                ? "Proceso detenido"
                : activeStep?.label ?? "Preparando generación"}
          </h4>
        </div>
        {progress.status === "running" ? (
          <span aria-hidden="true" className="workspace-loading-spinner" />
        ) : null}
      </div>

      <div className="tw-generation-progress" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      <ol className="tw-generation-step-list">
        {TW_GENERATION_STEPS.map((step) => {
          const isDone = progress.status === "success" || progress.completedStages.includes(step.id);
          const isActive = progress.status === "running" && progress.currentStage === step.id;
          const isError = progress.status === "error" && progress.errorStage === step.id;
          const statusLabel = isError ? "Error" : isDone ? "Completado" : isActive ? "En curso" : "Pendiente";

          return (
            <li
              className={`tw-generation-step ${
                isError ? "is-error" : isDone ? "is-done" : isActive ? "is-active" : "is-pending"
              }`}
              key={step.id}
            >
              <span className="tw-generation-step-marker" aria-hidden="true" />
              <div>
                <strong>{step.label}</strong>
                <small>{statusLabel}</small>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="tw-generation-status-footer">
        <p>{footerMessage}</p>
        {progress.status === "error" ? (
          <button className="detail-card-action detail-card-action-secondary" onClick={onRetry} type="button">
            Reintentar
          </button>
        ) : null}
      </div>
    </section>
  );
}

export const WALKTHROUGH_DETAIL_STEP_IDS = new Set([
  "detail-snapshot",
  "detail-status",
  "detail-summary",
  "detail-meetings",
  "detail-transcript",
  "detail-trustworthiness",
  "detail-feedback",
  "detail-save"
]);
