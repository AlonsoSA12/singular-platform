"use client";

import { isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PeriodOption = {
  endLabel: string;
  id: string;
  rangeLabel: string;
};

type TrustworthinessRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type TrustworthinessResponse = {
  evaluatorEmail: string;
  filtering: {
    applied: boolean;
    reason: string;
  };
  ok: true;
  recordCount: number;
  records: TrustworthinessRecord[];
  selectedPeriods: string[];
  tableName: string;
};

type CoachingContextRecord = {
  id: string;
  fields: Record<string, unknown>;
  participantEmails: string[];
  participants?: CoachingParticipant[];
};

type CoachingContextResponse = {
  filtering: {
    applied: boolean;
    reason: string;
  };
  ok: true;
  participantEmail: string;
  recordCount: number;
  records: CoachingContextRecord[];
  selectedPeriods: string[];
  tableName: string;
};

type GroupKey =
  | "summary"
  | "people"
  | "context"
  | "scores"
  | "delivery"
  | "roles"
  | "narrative"
  | "references"
  | "other";

type FieldEntry = {
  name: string;
  value: ReactNode | unknown;
};

type RecordGroup = {
  key: GroupKey;
  label: string;
  fields: FieldEntry[];
};

type RecordSummary = {
  avatarUrl: string | null;
  context: string;
  evaluatedEmail: string | null;
  evaluatedName: string;
  periodLabel: string;
  roleLabel: string;
  scoreLabel: string;
  status: string;
  strengths: string | null;
  updatedLabel: string;
  weaknesses: string | null;
};

type RecordPeriodMeta = {
  key: string;
  label: string;
  sortValue: string;
};

type RecordPeriodGroup = {
  id: string;
  label: string;
  records: TrustworthinessRecord[];
  sortValue: string;
};

type SelectedPeriodMeta = {
  end: string;
  id: string;
  label: string;
  start: string;
};

type SelectedPeriodCoverage = {
  end: string;
  start: string;
};

type DetailPerson = {
  avatarUrl: string | null;
  email: string | null;
  name: string;
  role: string | null;
};

type CoachingParticipant = {
  avatarUrl: string | null;
  email: string;
  name: string;
  role: string | null;
};

type CoachingTranscriptResponse = {
  actionItems: string[];
  chapterSummaries: Array<{
    description: string;
    title: string;
  }>;
  meetingDatetime: string | null;
  meetingTitle: string;
  ok: true;
  speakerBlocks: Array<{
    endTime: number | null;
    id: string;
    speaker: string;
    startTime: number | null;
    words: string;
  }>;
  summary: string | null;
  topics: string[];
  uniqueKey: string;
};

type SuggestionConfidence = "low" | "medium" | "high";
type SuggestionPillarKey = "reliability" | "intimacy" | "groupThinking" | "credibility";

type EvidenceSignal = {
  evidenceText: string;
  impact: "raises_score" | "lowers_score" | "supports_current_score";
  interpretation: string;
  meetingDatetime: string;
  meetingId: string;
  meetingTitle: string;
  sourceType:
    | "coaching_summary"
    | "coaching_analysis"
    | "transcript_summary"
    | "topic"
    | "action_item"
    | "metric_score";
};

type MetricInput = {
  interpretation: string;
  mappedTo: SuggestionPillarKey;
  metricName: string;
  value: number | null;
};

type PillarSuggestion = {
  confidence: SuggestionConfidence;
  decisionDetail: {
    conclusion: string;
    metricInputs: MetricInput[];
    negativeSignals: EvidenceSignal[];
    positiveSignals: EvidenceSignal[];
    uncertainty: string[];
  };
  meaning: string;
  points: number;
  shortReason: string;
};

type TwSuggestionResponse = {
  generatedAt: string;
  meetingsUsed: number;
  ok: true;
  pillars: Record<SuggestionPillarKey, PillarSuggestion>;
  recordId: string;
  trustworthiness: {
    confidence: SuggestionConfidence;
    explanation: string;
    meaning: string;
    percentage: string;
    score: number;
  };
};

type EditableScoreField =
  | "reliabilityPoints"
  | "intimacyPoints"
  | "groupThinkingPoints"
  | "credibilityPoints";

type EditableDraftTarget = EditableScoreField | "feedback";

type TrustworthinessDraft = {
  credibilityPoints: number | null;
  feedback: string;
  groupThinkingPoints: number | null;
  intimacyPoints: number | null;
  reliabilityPoints: number | null;
};

type ChatMessage = {
  content: string;
  id: string;
  role: "assistant" | "user";
};

type TrustworthinessWorkspaceProps = {
  isWalkthroughOpen?: boolean;
  walkthroughStepId?: string | null;
};

type ChatbotSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

type DetailGroupsOptions = {
  draft: TrustworthinessDraft | null;
  editable: boolean;
  errorMessage: string | null;
  errorTarget: EditableDraftTarget | null;
  isDirty: (target: EditableDraftTarget) => boolean;
  isSaving: (target: EditableDraftTarget) => boolean;
  onDiscard: (target: EditableDraftTarget) => void;
  onFeedbackChange: (value: string) => void;
  onPointsChange: (field: EditableScoreField, value: number) => void;
  onSave: (target: EditableDraftTarget) => void;
};

type ScoreEditorConfig = {
  draftField: EditableScoreField;
  label: string;
  meaningField: string;
  pointsField: string;
  questionField: string;
};

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
const PERIOD_SELECTION_STORAGE_KEY = "singular-platform-trustworthiness-periods";
const DETAIL_DRAWER_WIDTH_STORAGE_KEY = "singular-platform-trustworthiness-detail-width";
const DEFAULT_STATUS_FILTERS = ["Pending"];
const FALLBACK_COMPLETED_STATUS = "Done";
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
const SUGGESTION_PILLAR_CONFIG: Array<{
  draftField: EditableScoreField;
  key: SuggestionPillarKey;
  label: string;
}> = [
  { draftField: "reliabilityPoints", key: "reliability", label: "Reliability" },
  { draftField: "intimacyPoints", key: "intimacy", label: "Intimacy" },
  { draftField: "groupThinkingPoints", key: "groupThinking", label: "Group Thinking" },
  { draftField: "credibilityPoints", key: "credibility", label: "Credibility" }
];

const GROUP_LABELS: Record<GroupKey, string> = {
  context: "Contexto",
  delivery: "Entrega",
  narrative: "Narrativa",
  other: "Otros",
  people: "Personas",
  references: "Referencias",
  roles: "Roles",
  scores: "Puntajes",
  summary: "Resumen"
};

const GROUP_SEQUENCE: GroupKey[] = [
  "summary",
  "people",
  "context",
  "scores",
  "delivery",
  "roles",
  "narrative",
  "references",
  "other"
];

const FIELD_GROUP_LOOKUP: Record<string, GroupKey> = {
  "Achieved": "delivery",
  "Amount of Clients tested.": "delivery",
  "Chapter Lead Evaluated": "roles",
  "Client Name": "context",
  "Count (TW Examns)": "delivery",
  "Credibility Meaning": "scores",
  "Credibility Points": "scores",
  "Credibility Question": "scores",
  "Email From Evaluated": "people",
  "Email address from Evaluator": "people",
  "End Date Range": "context",
  "English Meaning": "scores",
  "English Points": "scores",
  "English Score": "scores",
  "Evaluator/Evaluaded": "people",
  "Evaluator_Slackid": "people",
  "Evaluated Resources": "people",
  "Evaluated_Slackid": "people",
  "Feedback": "narrative",
  "Final Utilization": "delivery",
  "Group Thinking Meaning": "scores",
  "Group Thinking Points": "scores",
  "Group Thinking Question": "scores",
  "Initial Utilization": "delivery",
  "Input Source": "references",
  "Intimacy Meaning": "scores",
  "Intimacy Points": "scores",
  "Intimacy Question": "scores",
  "Last Modified Status": "references",
  "PO (from Sprint) (de Utilization Butget) (de TW Examns)": "roles",
  "Photo Evaluated": "people",
  "Photo Evaluator": "people",
  "Project": "context",
  "Rating Status": "summary",
  "Reliability Meaning": "scores",
  "Reliability Points": "scores",
  "Reliability Question": "scores",
  "Resource and feedback": "narrative",
  "ResumenTWJson": "narrative",
  "Role Type Evaluator (de TW Examns)": "roles",
  "Rol type Evaluated (de TW Examns)": "roles",
  "Rol type Evaluated (from TW Examns)": "roles",
  "Roles Evaluation": "roles",
  "Roles Evaluation Long Text": "roles",
  "SF Date (from Sprint)": "context",
  "SO Date (from Sprint)": "context",
  "SPs Initially Projected": "delivery",
  "SPs Projected": "delivery",
  "Sprint": "context",
  "Sprint Name Short": "context",
  "Sprint Status (de Utilization Butget) (de TW Examns)": "context",
  "Sprints": "context",
  "Start Date Range": "context",
  "Stregnths": "summary",
  "TW Examns": "references",
  "Trustworthiness": "summary",
  "Trustworthiness Meaning": "summary",
  "Update Raiting": "references",
  "User (de Evaluated) (de TW Examns)": "people",
  "User (de Evaluator) (de TW Examns)": "people",
  "User (from Evaluator)": "people",
  "Utilization Butget Evaluated (de TW Examns)": "delivery",
  "Validatioon": "references",
  "Weekness": "summary",
  "createdAt": "references",
  "evaluator name": "people",
  "record": "references",
  "related_projects": "context"
};

const FIELD_ORDER: Record<GroupKey, string[]> = {
  context: [
    "Client Name",
    "related_projects",
    "Project",
    "Sprint Name Short",
    "Sprint",
    "Sprints",
    "Start Date Range",
    "End Date Range",
    "SO Date (from Sprint)",
    "SF Date (from Sprint)",
    "Sprint Status (de Utilization Butget) (de TW Examns)"
  ],
  delivery: [
    "Count (TW Examns)",
    "Achieved",
    "SPs Initially Projected",
    "SPs Projected",
    "Initial Utilization",
    "Final Utilization",
    "Utilization Butget Evaluated (de TW Examns)",
    "Amount of Clients tested."
  ],
  narrative: ["Feedback", "Resource and feedback", "ResumenTWJson"],
  other: [],
  people: [
    "Evaluated Resources",
    "Evaluator/Evaluaded",
    "evaluator name",
    "Email address from Evaluator",
    "Email From Evaluated",
    "User (from Evaluator)",
    "User (de Evaluator) (de TW Examns)",
    "User (de Evaluated) (de TW Examns)",
    "Evaluator_Slackid",
    "Evaluated_Slackid",
    "Photo Evaluator",
    "Photo Evaluated"
  ],
  references: [
    "Record ID",
    "record",
    "Validatioon",
    "Input Source",
    "createdAt",
    "Last Modified Status",
    "Update Raiting",
    "TW Examns"
  ],
  roles: [
    "Roles Evaluation",
    "Roles Evaluation Long Text",
    "Rol type Evaluated (from TW Examns)",
    "Rol type Evaluated (de TW Examns)",
    "Role Type Evaluator (de TW Examns)",
    "PO (from Sprint) (de Utilization Butget) (de TW Examns)",
    "Chapter Lead Evaluated"
  ],
  scores: [
    "Trustworthiness Meaning",
    "English Score",
    "English Points",
    "English Meaning",
    "Reliability Points",
    "Reliability Question",
    "Reliability Meaning",
    "Intimacy Points",
    "Intimacy Question",
    "Intimacy Meaning",
    "Group Thinking Points",
    "Group Thinking Question",
    "Group Thinking Meaning",
    "Credibility Points",
    "Credibility Question",
    "Credibility Meaning"
  ],
  summary: ["Rating Status", "Trustworthiness", "Trustworthiness Meaning", "Stregnths", "Weekness"]
};

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

function createPeriods(now = new Date()): PeriodOption[] {
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

function formatDateValue(value: string) {
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

function createDraftFromRecord(record: TrustworthinessRecord): TrustworthinessDraft {
  return {
    credibilityPoints: getNumericValue(record.fields["Credibility Points"]),
    feedback: getStringValue(record.fields, "Feedback") ?? "",
    groupThinkingPoints: getNumericValue(record.fields["Group Thinking Points"]),
    intimacyPoints: getNumericValue(record.fields["Intimacy Points"]),
    reliabilityPoints: getNumericValue(record.fields["Reliability Points"])
  };
}

function isPendingRecord(record: TrustworthinessRecord) {
  return normalizeStatusValue(getRecordStatus(record)) === "pending";
}

function isTrustworthinessDraftDirty(record: TrustworthinessRecord, draft: TrustworthinessDraft | null) {
  if (!draft) {
    return false;
  }

  const originalDraft = createDraftFromRecord(record);

  return (
    originalDraft.reliabilityPoints !== draft.reliabilityPoints ||
    originalDraft.intimacyPoints !== draft.intimacyPoints ||
    originalDraft.groupThinkingPoints !== draft.groupThinkingPoints ||
    originalDraft.credibilityPoints !== draft.credibilityPoints ||
    originalDraft.feedback !== draft.feedback
  );
}

function createChatbotGreeting(record: TrustworthinessRecord) {
  const summary = getRecordSummary(record);
  const role = summary.roleLabel !== "Sin rol" ? summary.roleLabel : "rol pendiente";
  const context = summary.context !== "Sin contexto" ? summary.context : "sin contexto asignado";

  return [
    `Hola. Estoy contigo para aterrizar la evaluación de ${summary.evaluatedName}.`,
    `Rol evaluado: ${role}.`,
    `Contexto: ${context}.`,
    "Puedo ayudarte a ordenar evidencia, proponer una narrativa más clara y traducir observaciones a los cuatro pilares de Trustworthiness."
  ].join("\n");
}

function createChatbotReply(record: TrustworthinessRecord, prompt: string) {
  const summary = getRecordSummary(record);
  const lowerPrompt = prompt.toLowerCase();
  const positiveSignals = [
    "bien",
    "excelente",
    "fuerte",
    "confiable",
    "claro",
    "lider",
    "liderazgo",
    "apoyo",
    "colabor"
  ];
  const cautionSignals = [
    "bloqueo",
    "retraso",
    "duda",
    "débil",
    "debil",
    "error",
    "falta",
    "riesgo",
    "conflicto"
  ];
  const positiveScore = positiveSignals.filter((word) => lowerPrompt.includes(word)).length;
  const cautionScore = cautionSignals.filter((word) => lowerPrompt.includes(word)).length;
  const tone =
    positiveScore > cautionScore
      ? "Suena a una evaluación con señales bastante favorables."
      : cautionScore > positiveScore
        ? "Aquí ya veo alertas claras que conviene dejar bien sustentadas."
        : "Lo que describes se siente mixto: hay valor, pero también fricción.";
  const strengthsHint = summary.strengths ? `Fortaleza actual detectada: ${summary.strengths}.` : "";
  const weaknessHint = summary.weaknesses ? `Debilidad actual detectada: ${summary.weaknesses}.` : "";

  return [
    `Gracias, ya tengo mejor contexto sobre ${summary.evaluatedName}.`,
    tone,
    strengthsHint,
    weaknessHint,
    "Yo lo ordenaría así:",
    "1. Reliability: qué pasó con compromisos, tiempos y consistencia.",
    "2. Intimacy: cómo se relacionó con cliente o equipo y qué tan bien entendió el contexto.",
    "3. Group Thinking: qué tan colaborativo fue y cómo priorizó el bien común.",
    "4. Credibility: qué tanto criterio, dominio y confianza transmitió.",
    "Si quieres, pídeme algo puntual como: \"dame una narrativa final\", \"sugiéreme estrellas por pilar\" o \"resume solo los riesgos\"."
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function createChatbotSuggestions(record: TrustworthinessRecord): ChatbotSuggestion[] {
  const summary = getRecordSummary(record);

  return [
    {
      id: "summary",
      label: "Resumen ejecutivo",
      prompt: `Hazme un resumen ejecutivo del desempeño de ${summary.evaluatedName} para esta evaluación.`
    },
    {
      id: "narrative",
      label: "Narrativa final",
      prompt: `Ayúdame a redactar una narrativa final para ${summary.evaluatedName} con un tono claro, profesional y humano.`
    },
    {
      id: "scores",
      label: "Sugerir estrellas",
      prompt: `Sugiéreme cómo pensar las estrellas de Reliability, Intimacy, Group Thinking y Credibility para ${summary.evaluatedName}.`
    },
    {
      id: "risks",
      label: "Riesgos y alertas",
      prompt: `Identifica riesgos, alertas o señales débiles que debería considerar antes de guardar la evaluación de ${summary.evaluatedName}.`
    }
  ];
}

function getCoachingUniqueKey(record: CoachingContextRecord) {
  return getStringValue(record.fields, "unique_key") ?? record.id;
}

function getCoachingMeetingTitle(record: CoachingContextRecord) {
  return getStringValue(record.fields, "meeting_title") ?? "Reunión sin título";
}

function getCoachingMeetingDatetimeLabel(record: CoachingContextRecord) {
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

function formatTranscriptTime(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }

  return MEETING_DATE_TIME_FORMATTER.format(new Date(value));
}

function formatMeetingDatetimeValue(value: string | null) {
  if (!value) {
    return "Fecha no disponible";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return MEETING_DATE_TIME_FORMATTER.format(parsedDate);
}

function getPillarDraftField(pillar: SuggestionPillarKey) {
  return SUGGESTION_PILLAR_CONFIG.find((config) => config.key === pillar)?.draftField ?? "reliabilityPoints";
}

function getPillarLabel(pillar: SuggestionPillarKey) {
  return SUGGESTION_PILLAR_CONFIG.find((config) => config.key === pillar)?.label ?? pillar;
}

function getConfidenceLabel(confidence: SuggestionConfidence) {
  if (confidence === "high") {
    return "Alta";
  }

  if (confidence === "medium") {
    return "Media";
  }

  return "Baja";
}

function getSourceLabel(sourceType: EvidenceSignal["sourceType"]) {
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

function getImpactLabel(impact: EvidenceSignal["impact"]) {
  const labels: Record<EvidenceSignal["impact"], string> = {
    lowers_score: "Baja score",
    raises_score: "Sube score",
    supports_current_score: "Sostiene score"
  };

  return labels[impact];
}

function getDisplayParticipants(
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

function resolveFieldGroup(fieldName: string): GroupKey {
  const directMatch = FIELD_GROUP_LOOKUP[fieldName];
  if (directMatch) {
    return directMatch;
  }

  if (
    fieldName.includes("Photo") ||
    fieldName.includes("User") ||
    fieldName.includes("Email") ||
    fieldName.includes("Slackid")
  ) {
    return "people";
  }

  if (
    fieldName.includes("Project") ||
    fieldName.includes("Sprint") ||
    fieldName.includes("Client") ||
    fieldName.includes("Date")
  ) {
    return "context";
  }

  if (
    fieldName.includes("Trustworthiness") ||
    fieldName.includes("Points") ||
    fieldName.includes("Question") ||
    fieldName.includes("Meaning") ||
    fieldName.includes("English")
  ) {
    return "scores";
  }

  if (
    fieldName.includes("Achieved") ||
    fieldName.includes("Projected") ||
    fieldName.includes("Utilization") ||
    fieldName.includes("Count")
  ) {
    return "delivery";
  }

  if (
    fieldName.includes("Role") ||
    fieldName.includes("Chapter Lead") ||
    fieldName.includes("PO")
  ) {
    return "roles";
  }

  if (
    fieldName.includes("Feedback") ||
    fieldName.includes("Resumen") ||
    fieldName.includes("Weekness") ||
    fieldName.includes("Stregnths")
  ) {
    return "narrative";
  }

  if (
    fieldName.includes("Status") ||
    fieldName.includes("Source") ||
    fieldName.includes("record") ||
    fieldName.includes("Update")
  ) {
    return "references";
  }

  return "other";
}

function sortFields(groupKey: GroupKey, left: FieldEntry, right: FieldEntry) {
  const order = FIELD_ORDER[groupKey];
  const leftIndex = order.indexOf(left.name);
  const rightIndex = order.indexOf(right.name);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  }

  return left.name.localeCompare(right.name, "es");
}

function buildRecordGroups(record: TrustworthinessRecord) {
  const groupedFields = new Map<GroupKey, FieldEntry[]>();
  const allEntries: FieldEntry[] = [
    { name: "Record ID", value: record.id },
    ...Object.entries(record.fields).map(([name, value]) => ({ name, value }))
  ];

  for (const entry of allEntries) {
    const groupKey = resolveFieldGroup(entry.name);
    const groupFields = groupedFields.get(groupKey) ?? [];
    groupFields.push(entry);
    groupedFields.set(groupKey, groupFields);
  }

  return GROUP_SEQUENCE.map((groupKey) => ({
    fields: (groupedFields.get(groupKey) ?? []).sort((left, right) =>
      sortFields(groupKey, left, right)
    ),
    key: groupKey,
    label: GROUP_LABELS[groupKey]
  })).filter((group) => group.fields.length > 0);
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
  dirty: boolean;
  editable: boolean;
  errorMessage: string | null;
  isSaving: boolean;
  meaning: unknown;
  onChange?: (value: number) => void;
  onDiscard?: () => void;
  onSave?: () => void;
  points: unknown;
  question: unknown;
  value: number | null;
}) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const safePoints = getNumericValue(props.points);
  const activeValue = hoveredValue ?? props.value ?? 0;

  return (
    <div className="detail-score-card">
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

      {props.editable && props.dirty && props.onSave && props.onDiscard ? (
        <div className="detail-card-actions">
          <button
            className="detail-card-action detail-card-action-secondary"
            disabled={props.isSaving}
            onClick={props.onDiscard}
            type="button"
          >
            Discard
          </button>
          <button
            className="detail-card-action detail-card-action-primary"
            disabled={props.isSaving}
            onClick={props.onSave}
            type="button"
          >
            {props.isSaving ? "Saving..." : "Save"}
          </button>
          {props.errorMessage ? <span className="detail-card-error">{props.errorMessage}</span> : null}
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

function buildDetailGroups(record: TrustworthinessRecord, options: DetailGroupsOptions): RecordGroup[] {
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
              dirty={options.isDirty(scoreField.draftField)}
              editable={options.editable}
              errorMessage={
                options.errorTarget === scoreField.draftField ? options.errorMessage : null
              }
              isSaving={options.isSaving(scoreField.draftField)}
              meaning={fields[scoreField.meaningField]}
              onChange={(value) => options.onPointsChange(scoreField.draftField, value)}
              onDiscard={() => options.onDiscard(scoreField.draftField)}
              onSave={() => options.onSave(scoreField.draftField)}
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
        value: options.editable ? (
          <div className="trustworthiness-feedback-card">
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
                  disabled={options.isSaving("feedback")}
                  onClick={() => options.onDiscard("feedback")}
                  type="button"
                >
                  Discard
                </button>
                <button
                  className="detail-card-action detail-card-action-primary"
                  disabled={options.isSaving("feedback")}
                  onClick={() => options.onSave("feedback")}
                  type="button"
                >
                  {options.isSaving("feedback") ? "Saving..." : "Save"}
                </button>
                {options.errorTarget === "feedback" && options.errorMessage ? (
                  <span className="detail-card-error">{options.errorMessage}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          fields["Feedback"]
        )
      }].filter(
        (field) => field.value !== null && field.value !== undefined
      )
    }
  ];

  return detailGroups.filter((group) => group.fields.length > 0);
}

function getRecordSummary(record: TrustworthinessRecord): RecordSummary {
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

function compareRecords(left: TrustworthinessRecord, right: TrustworthinessRecord) {
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

function dedupeRecords(records: TrustworthinessRecord[]) {
  const uniqueRecords = new Map<string, TrustworthinessRecord>();

  for (const record of records) {
    if (!uniqueRecords.has(record.id)) {
      uniqueRecords.set(record.id, record);
    }
  }

  return [...uniqueRecords.values()];
}

function getSelectedPeriodMeta(period: PeriodOption): SelectedPeriodMeta {
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

function getSelectedPeriodCoverage(periods: PeriodOption[]): SelectedPeriodCoverage | null {
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

function groupRecordsBySelectedPeriods(
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

function renderValue(value: unknown): ReactNode {
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

function getStatusClassName(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("done")) {
    return "is-done";
  }

  if (normalizedStatus.includes("pending")) {
    return "is-pending";
  }

  return "is-neutral";
}

function normalizeStatusValue(status: string) {
  return status.trim().toLowerCase();
}

function getRecordStatus(record: TrustworthinessRecord) {
  return getStringValue(record.fields, "Rating Status") ?? "Sin estado";
}

function sortStatuses(left: string, right: string) {
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

function LoadingProgress({ label }: { label: string }) {
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

const WALKTHROUGH_DETAIL_STEP_IDS = new Set([
  "detail-actions",
  "detail-sections",
  "detail-meetings"
]);

export function TrustworthinessWorkspace({
  isWalkthroughOpen = false,
  walkthroughStepId = null
}: TrustworthinessWorkspaceProps) {
  const selectorRef = useRef<HTMLDetailsElement | null>(null);
  const statusFilterRef = useRef<HTMLDivElement | null>(null);
  const isResizingDrawerRef = useRef(false);
  const walkthroughAutoSelectedRecordIdRef = useRef<string | null>(null);
  const walkthroughPreviousSelectedRecordIdRef = useRef<string | null>(null);
  const [periodOptions] = useState<PeriodOption[]>(() => createPeriods());
  const [hasLoadedStoredSelection, setHasLoadedStoredSelection] = useState(false);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>(() =>
    periodOptions.length > 0 ? [periodOptions[0].id] : []
  );
  const [responsePayload, setResponsePayload] = useState<TrustworthinessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(DEFAULT_STATUS_FILTERS);
  const [hasManualStatusSelection, setHasManualStatusSelection] = useState(false);
  const [draftRecord, setDraftRecord] = useState<TrustworthinessDraft | null>(null);
  const [savingTarget, setSavingTarget] = useState<EditableDraftTarget | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveErrorTarget, setSaveErrorTarget] = useState<EditableDraftTarget | null>(null);
  const [chatbotRecordId, setChatbotRecordId] = useState<string | null>(null);
  const [chatbotDraftMessage, setChatbotDraftMessage] = useState("");
  const [chatbotMessages, setChatbotMessages] = useState<ChatMessage[]>([]);
  const [coachingContextResponse, setCoachingContextResponse] = useState<CoachingContextResponse | null>(null);
  const [coachingContextError, setCoachingContextError] = useState<string | null>(null);
  const [isCoachingContextLoading, setIsCoachingContextLoading] = useState(false);
  const [selectedTranscriptMeetingId, setSelectedTranscriptMeetingId] = useState<string | null>(null);
  const [transcriptResponse, setTranscriptResponse] = useState<CoachingTranscriptResponse | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [twSuggestion, setTwSuggestion] = useState<TwSuggestionResponse | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isSuggestionSideSheetOpen, setIsSuggestionSideSheetOpen] = useState(false);
  const [selectedSuggestionPillar, setSelectedSuggestionPillar] = useState<SuggestionPillarKey | null>(null);
  const [drawerWidth, setDrawerWidth] = useState(460);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(DETAIL_DRAWER_WIDTH_STORAGE_KEY);

      if (!rawValue) {
        return;
      }

      const parsedWidth = Number(rawValue);

      if (!Number.isFinite(parsedWidth)) {
        return;
      }

      const minWidth = 360;
      const maxWidth = Math.min(760, window.innerWidth - 120);
      setDrawerWidth(Math.min(maxWidth, Math.max(minWidth, Math.round(parsedWidth))));
    } catch {
      window.localStorage.removeItem(DETAIL_DRAWER_WIDTH_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const availableIds = new Set(periodOptions.map((period) => period.id));

    try {
      const rawValue = window.localStorage.getItem(PERIOD_SELECTION_STORAGE_KEY);
      if (!rawValue) {
        setHasLoadedStoredSelection(true);
        return;
      }

      const parsedValue = JSON.parse(rawValue) as unknown;
      if (!Array.isArray(parsedValue)) {
        setHasLoadedStoredSelection(true);
        return;
      }

      const restoredIds = parsedValue.filter(
        (value): value is string => typeof value === "string" && availableIds.has(value)
      );

      if (restoredIds.length > 0) {
        setSelectedPeriodIds(restoredIds);
      }
    } catch {
      window.localStorage.removeItem(PERIOD_SELECTION_STORAGE_KEY);
    } finally {
      setHasLoadedStoredSelection(true);
    }
  }, [periodOptions]);

  useEffect(() => {
    let isActive = true;

    async function loadTrustworthiness() {
      if (!hasLoadedStoredSelection) {
        return;
      }

      if (selectedPeriodIds.length === 0) {
        setResponsePayload(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = new URL("/api/trustworthiness", window.location.origin);

        for (const period of selectedPeriodIds) {
          url.searchParams.append("period", period);
        }

        const response = await fetch(url, {
          cache: "no-store"
        });

        const payload = (await response.json()) as TrustworthinessResponse | { message?: string };

        if (!response.ok) {
          const message = "message" in payload ? payload.message : undefined;
          throw new Error(message ?? "No fue posible consultar Trustworthiness.");
        }

        if (isActive) {
          setResponsePayload(payload as TrustworthinessResponse);
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setResponsePayload(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible consultar la tabla de Trustworthiness."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTrustworthiness();

    return () => {
      isActive = false;
    };
  }, [hasLoadedStoredSelection, selectedPeriodIds]);

  useEffect(() => {
    if (!hasLoadedStoredSelection) {
      return;
    }

    window.localStorage.setItem(PERIOD_SELECTION_STORAGE_KEY, JSON.stringify(selectedPeriodIds));
  }, [hasLoadedStoredSelection, selectedPeriodIds]);

  useEffect(() => {
    window.localStorage.setItem(DETAIL_DRAWER_WIDTH_STORAGE_KEY, String(drawerWidth));
  }, [drawerWidth]);

  useEffect(() => {
    if (!selectedRecordId) {
      return;
    }

    const visibleRecords = responsePayload
      ? dedupeRecords(responsePayload.records).filter((record) => {
          if (selectedStatuses.length === 0) {
            return false;
          }

          const recordStatus = normalizeStatusValue(getRecordStatus(record));

          return selectedStatuses.some(
            (status) => normalizeStatusValue(status) === recordStatus
          );
        })
      : [];

    if (!visibleRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(null);
    }
  }, [responsePayload, selectedRecordId, selectedStatuses]);

  useEffect(() => {
    if (!selectedRecordId || !responsePayload) {
      setDraftRecord(null);
      setSaveErrorMessage(null);
      setSaveErrorTarget(null);
      return;
    }

    const activeRecord =
      responsePayload.records.find((record) => record.id === selectedRecordId) ?? null;

    if (!activeRecord || !isPendingRecord(activeRecord)) {
      setDraftRecord(null);
      setSaveErrorMessage(null);
      setSaveErrorTarget(null);
      return;
    }

    setDraftRecord(createDraftFromRecord(activeRecord));
    setSaveErrorMessage(null);
    setSaveErrorTarget(null);
  }, [responsePayload, selectedRecordId]);

  useEffect(() => {
    setSelectedTranscriptMeetingId(null);
    setTranscriptResponse(null);
    setTranscriptError(null);
    setTwSuggestion(null);
    setSuggestionError(null);
    setIsSuggestionSideSheetOpen(false);
    setSelectedSuggestionPillar(null);
  }, [selectedRecordId]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
      if (!statusFilterRef.current?.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (selectedSuggestionPillar) {
          setSelectedSuggestionPillar(null);
          return;
        }
        if (selectedTranscriptMeetingId) {
          setSelectedTranscriptMeetingId(null);
          return;
        }
        if (isSuggestionSideSheetOpen) {
          setIsSuggestionSideSheetOpen(false);
          return;
        }
        if (chatbotRecordId) {
          setChatbotRecordId(null);
          setChatbotDraftMessage("");
          setChatbotMessages([]);
          return;
        }
        if (selectedRecordId) {
          setSelectedRecordId(null);
        }
        setIsSelectorOpen(false);
        setIsStatusMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    chatbotRecordId,
    isSuggestionSideSheetOpen,
    selectedRecordId,
    selectedSuggestionPillar,
    selectedTranscriptMeetingId
  ]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!isResizingDrawerRef.current) {
        return;
      }

      const minWidth = 360;
      const maxWidth = Math.min(760, window.innerWidth - 120);
      const nextWidth = window.innerWidth - event.clientX - 12;

      setDrawerWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
    }

    function handlePointerUp() {
      if (!isResizingDrawerRef.current) {
        return;
      }

      isResizingDrawerRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  function togglePeriod(periodId: string) {
    setSelectedPeriodIds((current) =>
      current.includes(periodId)
        ? current.filter((value) => value !== periodId)
        : [...current, periodId]
    );
  }

  function toggleSelector() {
    setIsSelectorOpen((current) => !current);
  }

  function toggleStatus(status: string) {
    setHasManualStatusSelection(true);
    setSelectedStatuses((current) =>
      current.some((value) => normalizeStatusValue(value) === normalizeStatusValue(status))
        ? current.filter((value) => normalizeStatusValue(value) !== normalizeStatusValue(status))
        : [...current, status]
    );
  }

  function handleDraftPointsChange(field: EditableScoreField, value: number) {
    setDraftRecord((current) =>
      current
        ? {
            ...current,
            [field]: value
          }
        : current
    );
  }

  function handleDraftFeedbackChange(value: string) {
    setDraftRecord((current) =>
      current
        ? {
            ...current,
            feedback: value
          }
        : current
    );
  }

  function isTargetDirty(target: EditableDraftTarget) {
    if (!selectedRecord || !draftRecord) {
      return false;
    }

    const originalDraft = createDraftFromRecord(selectedRecord);

    if (target === "feedback") {
      return originalDraft.feedback !== draftRecord.feedback;
    }

    return originalDraft[target] !== draftRecord[target];
  }

  function isTargetSaving(target: EditableDraftTarget) {
    return savingTarget === target;
  }

  const selectedPeriods = periodOptions.filter((period) => selectedPeriodIds.includes(period.id));
  const summaryLabel =
    selectedPeriods.length === 0
      ? "Seleccionar periodos"
      : `${selectedPeriods.length} periodo${selectedPeriods.length === 1 ? "" : "s"}`;
  const allRecords = responsePayload ? dedupeRecords(responsePayload.records).sort(compareRecords) : [];
  const availableStatuses = [...new Set(allRecords.map((record) => getRecordStatus(record)))].sort(
    sortStatuses
  );
  const hasPendingStatus = availableStatuses.some(
    (status) => normalizeStatusValue(status) === normalizeStatusValue(DEFAULT_STATUS_FILTERS[0])
  );
  const hasDoneStatus = availableStatuses.some(
    (status) => normalizeStatusValue(status) === normalizeStatusValue(FALLBACK_COMPLETED_STATUS)
  );
  const isUpToDateWorkspace = !hasPendingStatus && hasDoneStatus && allRecords.length > 0;
  const availableStatusKey = availableStatuses
    .map((status) => normalizeStatusValue(status))
    .join("|");
  const selectedStatusKey = selectedStatuses
    .map((status) => normalizeStatusValue(status))
    .join("|");
  const statusOptions = [...new Set([...DEFAULT_STATUS_FILTERS, ...availableStatuses])].sort(
    sortStatuses
  );
  const statusSummaryLabel =
    selectedStatuses.length === 0
      ? "Seleccionar status"
      : selectedStatuses.length === 1
        ? selectedStatuses[0]
        : `${selectedStatuses.length} status`;
  const filteredRecords = allRecords.filter((record) => {
    if (selectedStatuses.length === 0) {
      return false;
    }

    const recordStatus = normalizeStatusValue(getRecordStatus(record));

    return selectedStatuses.some(
      (status) => normalizeStatusValue(status) === recordStatus
    );
  });
  const periodGroups = groupRecordsBySelectedPeriods(filteredRecords, selectedPeriods);
  const selectedRecord = selectedRecordId
    ? filteredRecords.find((record) => record.id === selectedRecordId) ?? null
    : null;
  const chatbotRecord = chatbotRecordId
    ? filteredRecords.find((record) => record.id === chatbotRecordId) ??
      allRecords.find((record) => record.id === chatbotRecordId) ??
      null
    : null;
  const selectedRecordIsPending = selectedRecord ? isPendingRecord(selectedRecord) : false;
  const selectedRecordSummary = selectedRecord ? getRecordSummary(selectedRecord) : null;
  const chatbotRecordSummary = chatbotRecord ? getRecordSummary(chatbotRecord) : null;
  const chatbotSuggestions = chatbotRecord ? createChatbotSuggestions(chatbotRecord) : [];
  const selectedPeriodCoverage = getSelectedPeriodCoverage(selectedPeriods);
  const selectedRecordGroups = selectedRecord
    ? buildDetailGroups(selectedRecord, {
        draft: draftRecord,
        editable: selectedRecordIsPending,
        errorMessage: saveErrorMessage,
        errorTarget: saveErrorTarget,
        isDirty: isTargetDirty,
        isSaving: isTargetSaving,
        onDiscard: handleDiscardTarget,
        onFeedbackChange: handleDraftFeedbackChange,
        onPointsChange: handleDraftPointsChange,
        onSave: (target) => {
          void handleSaveTarget(target);
        }
      })
    : [];

  useEffect(() => {
    const walkthroughNeedsDetail =
      isWalkthroughOpen && walkthroughStepId ? WALKTHROUGH_DETAIL_STEP_IDS.has(walkthroughStepId) : false;

    if (!walkthroughNeedsDetail) {
      if (walkthroughAutoSelectedRecordIdRef.current) {
        setSelectedRecordId(walkthroughPreviousSelectedRecordIdRef.current);
        walkthroughAutoSelectedRecordIdRef.current = null;
        walkthroughPreviousSelectedRecordIdRef.current = null;
      }

      return;
    }

    if (selectedRecordId || filteredRecords.length === 0) {
      return;
    }

    walkthroughPreviousSelectedRecordIdRef.current = selectedRecordId;
    walkthroughAutoSelectedRecordIdRef.current = filteredRecords[0].id;
    setSelectedRecordId(filteredRecords[0].id);
  }, [filteredRecords, isWalkthroughOpen, selectedRecordId, walkthroughStepId]);

  useEffect(() => {
    if (hasManualStatusSelection) {
      return;
    }

    if (allRecords.length === 0) {
      return;
    }

    const pendingStatus = availableStatuses.find(
      (status) => normalizeStatusValue(status) === normalizeStatusValue(DEFAULT_STATUS_FILTERS[0])
    );
    const doneStatus = availableStatuses.find(
      (status) => normalizeStatusValue(status) === normalizeStatusValue(FALLBACK_COMPLETED_STATUS)
    );
    const nextStatuses = pendingStatus ? [pendingStatus] : doneStatus ? [doneStatus] : [];
    const normalizedNextStatuses = nextStatuses
      .map((status) => normalizeStatusValue(status))
      .join("|");

    if (selectedStatusKey === normalizedNextStatuses) {
      return;
    }

    if (nextStatuses.length > 0) {
      setSelectedStatuses(nextStatuses);
    }
  }, [allRecords.length, availableStatusKey, hasManualStatusSelection, selectedStatusKey]);

  useEffect(() => {
    const participantEmail = selectedRecordSummary?.evaluatedEmail?.trim().toLowerCase();

    if (!selectedRecordSummary) {
      setCoachingContextResponse(null);
      setCoachingContextError(null);
      setIsCoachingContextLoading(false);
      return;
    }

    if (!participantEmail) {
      setCoachingContextResponse(null);
      setCoachingContextError("Esta evaluación no tiene email del talento para cruzar reuniones.");
      setIsCoachingContextLoading(false);
      return;
    }

    if (!selectedPeriodCoverage) {
      setCoachingContextResponse(null);
      setCoachingContextError("No hay un rango total de periodos disponible para filtrar reuniones.");
      setIsCoachingContextLoading(false);
      return;
    }

    const coachingParticipantEmail = participantEmail;
    const coachingPeriodCoverage = selectedPeriodCoverage;

    let isActive = true;

    async function loadCoachingContext() {
      setIsCoachingContextLoading(true);
      setCoachingContextError(null);
      setCoachingContextResponse(null);

      try {
        const url = new URL("/api/trustworthiness/coaching-context", window.location.origin);
        url.searchParams.set("start", coachingPeriodCoverage.start);
        url.searchParams.set("end", coachingPeriodCoverage.end);
        url.searchParams.set("participantEmail", coachingParticipantEmail);

        const response = await fetch(url, {
          cache: "no-store"
        });
        const payload = (await response.json()) as
          | CoachingContextResponse
          | { message?: string };

        if (!response.ok) {
          const message = "message" in payload ? payload.message : undefined;
          throw new Error(message ?? "No fue posible consultar las reuniones del talento.");
        }

        if (isActive) {
          setCoachingContextResponse(payload as CoachingContextResponse);
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setCoachingContextResponse(null);
        setCoachingContextError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible consultar las reuniones del talento."
        );
      } finally {
        if (isActive) {
          setIsCoachingContextLoading(false);
        }
      }
    }

    void loadCoachingContext();

    return () => {
      isActive = false;
    };
  }, [
    selectedRecordSummary?.evaluatedEmail,
    selectedRecordSummary?.evaluatedName,
    selectedPeriodCoverage?.end,
    selectedPeriodCoverage?.start
  ]);

  useEffect(() => {
    if (!selectedTranscriptMeetingId) {
      setTranscriptResponse(null);
      setTranscriptError(null);
      setIsTranscriptLoading(false);
      return;
    }

    const participantEmail = selectedRecordSummary?.evaluatedEmail?.trim().toLowerCase();

    if (!participantEmail || !selectedPeriodCoverage) {
      setTranscriptResponse(null);
      setTranscriptError("No hay contexto suficiente para consultar el transcript.");
      setIsTranscriptLoading(false);
      return;
    }

    const transcriptMeetingId = selectedTranscriptMeetingId;
    const transcriptPeriodCoverage = selectedPeriodCoverage;
    const transcriptParticipantEmail = participantEmail;
    let isActive = true;

    async function loadTranscript() {
      setIsTranscriptLoading(true);
      setTranscriptError(null);

      try {
        const url = new URL(
          `/api/trustworthiness/coaching-context/${encodeURIComponent(transcriptMeetingId)}/transcript`,
          window.location.origin
        );
        url.searchParams.set("start", transcriptPeriodCoverage.start);
        url.searchParams.set("end", transcriptPeriodCoverage.end);
        url.searchParams.set("participantEmail", transcriptParticipantEmail);

        const response = await fetch(url, {
          cache: "no-store"
        });
        const payload = (await response.json()) as CoachingTranscriptResponse | { message?: string };

        if (!response.ok) {
          const message = "message" in payload ? payload.message : undefined;
          throw new Error(message ?? "No fue posible consultar el transcript de la reunión.");
        }

        if (isActive) {
          setTranscriptResponse(payload as CoachingTranscriptResponse);
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setTranscriptResponse(null);
        setTranscriptError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible consultar el transcript de la reunión."
        );
      } finally {
        if (isActive) {
          setIsTranscriptLoading(false);
        }
      }
    }

    void loadTranscript();

    return () => {
      isActive = false;
    };
  }, [
    selectedPeriodCoverage?.end,
    selectedPeriodCoverage?.start,
    selectedRecordSummary?.evaluatedEmail,
    selectedTranscriptMeetingId
  ]);

  async function handleSaveTarget(target: EditableDraftTarget) {
    if (!selectedRecord || !draftRecord || !selectedRecordIsPending || !isTargetDirty(target)) {
      return;
    }

    setSavingTarget(target);
    setSaveErrorMessage(null);
    setSaveErrorTarget(null);

    const payload =
      target === "feedback"
        ? { feedback: draftRecord.feedback }
        : { [target]: draftRecord[target] };

    try {
      const response = await fetch(`/api/trustworthiness/${encodeURIComponent(selectedRecord.id)}`, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        },
        method: "PATCH"
      });
      const parsedPayload = (await response.json()) as
        | { ok: true; record: TrustworthinessRecord }
        | { message?: string };

      if (!response.ok || !("ok" in parsedPayload && parsedPayload.ok)) {
        throw new Error("message" in parsedPayload ? parsedPayload.message : undefined);
      }

      setResponsePayload((current) =>
        current
          ? {
              ...current,
              records: current.records.map((record) =>
                record.id === parsedPayload.record.id ? parsedPayload.record : record
              )
            }
          : current
      );
    } catch (saveRecordError) {
      setSaveErrorMessage(
        saveRecordError instanceof Error
          ? saveRecordError.message
          : "No fue posible guardar la evaluación."
      );
      setSaveErrorTarget(target);
    } finally {
      setSavingTarget(null);
    }
  }

  function handleDiscardTarget(target: EditableDraftTarget) {
    if (!selectedRecord) {
      return;
    }

    const originalDraft = createDraftFromRecord(selectedRecord);

    setDraftRecord((current) =>
      current
        ? {
            ...current,
            [target]: originalDraft[target]
          }
        : current
    );
    if (saveErrorTarget === target) {
      setSaveErrorMessage(null);
      setSaveErrorTarget(null);
    }
  }

  function openChatbot(record: TrustworthinessRecord) {
    setChatbotRecordId(record.id);
    setChatbotDraftMessage("");
    setChatbotMessages([
      {
        content: createChatbotGreeting(record),
        id: `${record.id}-greeting`,
        role: "assistant"
      }
    ]);
  }

  function closeChatbot() {
    setChatbotRecordId(null);
    setChatbotDraftMessage("");
    setChatbotMessages([]);
  }

  function sendChatbotPrompt(message: string) {
    if (!chatbotRecord || message.trim().length === 0) {
      return;
    }

    const userMessage = message.trim();

    setChatbotMessages((current) => [
      ...current,
      {
        content: userMessage,
        id: `user-${Date.now()}`,
        role: "user"
      },
      {
        content: createChatbotReply(chatbotRecord, userMessage),
        id: `assistant-${Date.now() + 1}`,
        role: "assistant"
      }
    ]);
  }

  function handleChatbotSubmit() {
    if (chatbotDraftMessage.trim().length === 0) {
      return;
    }

    sendChatbotPrompt(chatbotDraftMessage);
    setChatbotDraftMessage("");
  }

  async function generateTwSuggestion() {
    if (!selectedRecord || !selectedRecordSummary?.evaluatedEmail || !selectedPeriodCoverage) {
      setSuggestionError("No hay contexto suficiente para generar la sugerencia TW.");
      return;
    }

    setIsSuggestionLoading(true);
    setSuggestionError(null);

    try {
      const response = await fetch(
        `/api/trustworthiness/${encodeURIComponent(selectedRecord.id)}/suggestion`,
        {
          body: JSON.stringify({
            end: selectedPeriodCoverage.end,
            participantEmail: selectedRecordSummary.evaluatedEmail,
            start: selectedPeriodCoverage.start
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        }
      );
      const payload = (await response.json()) as TwSuggestionResponse | { message?: string };

      if (!response.ok) {
        const message = "message" in payload ? payload.message : undefined;
        throw new Error(message ?? "No fue posible generar la sugerencia TW.");
      }

      setTwSuggestion(payload as TwSuggestionResponse);
      setSelectedSuggestionPillar(null);
    } catch (suggestionErrorValue) {
      setTwSuggestion(null);
      setSuggestionError(
        suggestionErrorValue instanceof Error
          ? suggestionErrorValue.message
          : "No fue posible generar la sugerencia TW."
      );
    } finally {
      setIsSuggestionLoading(false);
    }
  }

  function openSuggestionSideSheetAndGenerate() {
    setIsSuggestionSideSheetOpen(true);
    void generateTwSuggestion();
  }

  function applySuggestionPillar(pillar: SuggestionPillarKey) {
    if (!selectedRecordIsPending || !twSuggestion) {
      return;
    }

    const draftField = getPillarDraftField(pillar);
    const points = twSuggestion.pillars[pillar].points;

    setDraftRecord((current) =>
      current
        ? {
            ...current,
            [draftField]: points
          }
        : current
    );
  }

  function applyAllSuggestionPillars() {
    if (!selectedRecordIsPending || !twSuggestion) {
      return;
    }

    setDraftRecord((current) =>
      current
        ? {
            ...current,
            credibilityPoints: twSuggestion.pillars.credibility.points,
            groupThinkingPoints: twSuggestion.pillars.groupThinking.points,
            intimacyPoints: twSuggestion.pillars.intimacy.points,
            reliabilityPoints: twSuggestion.pillars.reliability.points
          }
        : current
    );
  }

  return (
    <div className="trustworthiness-panel">
      <div className="workspace-filter-row workspace-filter-row-primary" data-walkthrough="workspace-filters">
        <div className="workspace-filter-group workspace-period-filter-group">
          <span className="workspace-filter-label">Periodos</span>
          <details className="period-selector" open={isSelectorOpen} ref={selectorRef}>
            <summary
              className="secondary-button period-selector-trigger"
              onClick={(event) => {
                event.preventDefault();
                toggleSelector();
              }}
            >
              <span className="workspace-filter-trigger-content">
                <span aria-hidden="true" className="workspace-filter-trigger-leading">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8Z" />
                  </svg>
                </span>
                <span>{summaryLabel}</span>
              </span>
              <span aria-hidden="true" className={`workspace-status-trigger-icon ${isSelectorOpen ? "is-open" : ""}`}>
                ▾
              </span>
            </summary>
            <div className="period-selector-menu">
              {periodOptions.map((period) => (
                <label className="period-option" key={period.id}>
                  <input
                    checked={selectedPeriodIds.includes(period.id)}
                    onChange={() => togglePeriod(period.id)}
                    type="checkbox"
                  />
                  <span className="period-option-text">{period.endLabel}: {period.rangeLabel}</span>
                </label>
              ))}
            </div>
            {selectedPeriods.length > 0 ? (
              <div className="period-selector-preview" role="status">
                <span className="period-selector-preview-label">Seleccionados</span>
                <div className="period-selector-preview-list">
                  {selectedPeriods.map((period) => (
                    <div className="period-selector-preview-item" key={period.id}>
                      <strong>{period.endLabel}</strong>
                      <small>{period.rangeLabel}</small>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </details>
        </div>

        <div className="workspace-filter-group workspace-status-filter-group">
          <span className="workspace-filter-label">Status</span>
          <div className="workspace-status-filter" ref={statusFilterRef}>
            <button
              aria-expanded={isStatusMenuOpen}
              className="secondary-button workspace-status-trigger"
              onClick={() => setIsStatusMenuOpen((current) => !current)}
              type="button"
            >
              <span className="workspace-filter-trigger-content">
                <span aria-hidden="true" className="workspace-filter-trigger-leading">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 1.6 3.2L15 13.4V20a1 1 0 0 1-1.45.9l-3-1.5A1 1 0 0 1 10 18.5v-5.1L3.4 6.2A2 2 0 0 1 3 5Z" />
                  </svg>
                </span>
                <span>{statusSummaryLabel}</span>
              </span>
              <span aria-hidden="true" className={`workspace-status-trigger-icon ${isStatusMenuOpen ? "is-open" : ""}`}>
                ▾
              </span>
            </button>

            {isStatusMenuOpen ? (
              <div className="workspace-status-menu">
                {statusOptions.map((status) => {
                  const isSelected = selectedStatuses.some(
                    (value) => normalizeStatusValue(value) === normalizeStatusValue(status)
                  );

                  return (
                    <label className="workspace-status-option" key={status}>
                      <input
                        checked={isSelected}
                        onChange={() => toggleStatus(status)}
                        type="checkbox"
                      />
                      <span className="workspace-status-option-copy">{status}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className={`trustworthiness-data ${filteredRecords.length === 0 ? "is-empty" : ""}`}>
        <div className="trustworthiness-data-header">
          <div>
            <h3>Evaluaciones</h3>
          </div>
        </div>

        {isLoading ? <p className="workspace-response-state">Consultando Airtable...</p> : null}
        {error ? <p className="workspace-response-error">{error}</p> : null}
        {!isLoading && !error && !responsePayload ? (
          <p className="workspace-response-state">Selecciona al menos un periodo para consultar.</p>
        ) : null}
        {!isLoading && !error && responsePayload && filteredRecords.length === 0 ? (
          <div className="trustworthiness-empty-state">
            <strong>
              {isUpToDateWorkspace
                ? "No hay evaluaciones pendientes. Esta persona está al día."
                : "No hay evaluaciones para los filtros seleccionados."}
            </strong>
            <p>
              {isUpToDateWorkspace
                ? "Encontramos evaluaciones en status Done, pero no hay registros Pending dentro de los periodos activos."
                : "Prueba agregando otro periodo o activando otros status para ampliar la consulta."}
            </p>
          </div>
        ) : null}

        {!isLoading && !error && filteredRecords.length > 0 ? (
          <div className="trustworthiness-content">
            <div className="trustworthiness-table">
              {periodGroups.map((periodGroup, index) => (
                <section
                  className="trustworthiness-period-group"
                  data-walkthrough={index === 0 ? "workspace-period-table" : undefined}
                  key={periodGroup.id}
                >
                  <div className="trustworthiness-period-header">
                    <div className="trustworthiness-period-copy">
                      <span>Periodo</span>
                      <h4>{periodGroup.label}</h4>
                    </div>
                    <strong>{periodGroup.records.length} registros</strong>
                  </div>

                  <div className="trustworthiness-table-scroll">
                    <div className="trustworthiness-table-grid">
                      <div className="trustworthiness-table-head">
                        <span>#</span>
                        <span>Foto</span>
                        <span>Talento</span>
                        <span>Cliente / Proyecto</span>
                        <span>Rol evaluado</span>
                        <span>Trustworthiness</span>
                        <span>Fortaleza</span>
                        <span>Debilidad</span>
                        <span>Estado</span>
                        <span>Periodo</span>
                        <span>Actualizado</span>
                      </div>

                      <div className="trustworthiness-table-body">
                        {periodGroup.records.map((record, index) => {
                          const summary = getRecordSummary(record);
                          const isSelected = record.id === selectedRecordId;

                          return (
                            <article
                              className={`trustworthiness-record ${isSelected ? "is-active" : ""}`}
                              key={`${periodGroup.id}-${record.id}`}
                            >
                              <div
                                className="trustworthiness-record-summary"
                                onClick={() => setSelectedRecordId(record.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setSelectedRecordId(record.id);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                <div className="trustworthiness-cell trustworthiness-index-cell">
                                  <span className="trustworthiness-mobile-label">#</span>
                                  <strong>{index + 1}</strong>
                                  <button
                                    aria-label={`Abrir chatbot de evaluación para ${summary.evaluatedName}`}
                                    className="trustworthiness-index-action"
                                    data-tooltip="Abrir chatbot de evaluación"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openChatbot(record);
                                    }}
                                    onKeyDown={(event) => {
                                      event.stopPropagation();
                                    }}
                                    title="Abrir chatbot de evaluación"
                                    type="button"
                                  >
                                    <svg viewBox="0 0 24 24">
                                      <path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v5.5A2.75 2.75 0 0 1 16.25 14H11.4l-3.55 3.03c-.8.69-1.85.12-1.85-.94V14A2.75 2.75 0 0 1 5 11.25Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h.75v2.2l2.79-2.2h4.96c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25Z" />
                                    </svg>
                                  </button>
                                </div>

                                <div className="trustworthiness-cell trustworthiness-photo-cell">
                                  <span className="trustworthiness-mobile-label">Foto</span>
                                  {summary.avatarUrl ? (
                                    <img
                                      alt={`Foto de ${summary.evaluatedName}`}
                                      className="trustworthiness-avatar"
                                      src={summary.avatarUrl}
                                    />
                                  ) : (
                                    <span
                                      aria-hidden="true"
                                      className="trustworthiness-avatar trustworthiness-avatar-fallback"
                                    >
                                      <svg viewBox="0 0 24 24">
                                        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.87 0-7 2.24-7 5v1h14v-1c0-2.76-3.13-5-7-5Z" />
                                      </svg>
                                    </span>
                                  )}
                                </div>

                                <div className="trustworthiness-cell trustworthiness-primary-cell">
                                  <span className="trustworthiness-mobile-label">Talento</span>
                                  <strong>{summary.evaluatedName}</strong>
                                  {summary.evaluatedEmail ? <small>{summary.evaluatedEmail}</small> : null}
                                </div>

                                <div className="trustworthiness-cell trustworthiness-context-cell trustworthiness-centered-cell">
                                  <span className="trustworthiness-mobile-label">Cliente / Proyecto</span>
                                  <strong className="trustworthiness-cell-clamp" title={summary.context}>
                                    {summary.context}
                                  </strong>
                                </div>

                                <div className="trustworthiness-cell trustworthiness-centered-cell">
                                  <span className="trustworthiness-mobile-label">Rol evaluado</span>
                                  <strong className="trustworthiness-cell-clamp" title={summary.roleLabel}>
                                    {summary.roleLabel}
                                  </strong>
                                </div>

                                <div className="trustworthiness-cell trustworthiness-centered-cell">
                                  <span className="trustworthiness-mobile-label">Trustworthiness</span>
                                  <strong className="trustworthiness-score-value">{summary.scoreLabel}</strong>
                                </div>

                                <div className="trustworthiness-cell trustworthiness-centered-cell">
                                  <span className="trustworthiness-mobile-label">Fortaleza</span>
                                  <span className="trustworthiness-chip">
                                    {summary.strengths ?? "Sin dato"}
                                  </span>
                                </div>

                                <div className="trustworthiness-cell trustworthiness-centered-cell">
                                  <span className="trustworthiness-mobile-label">Debilidad</span>
                                  <span className="trustworthiness-chip">
                                    {summary.weaknesses ?? "Sin dato"}
                                  </span>
                                </div>

                                <div className="trustworthiness-cell trustworthiness-status-cell">
                                  <span className="trustworthiness-mobile-label">Estado</span>
                                  <span className={`trustworthiness-status ${getStatusClassName(summary.status)}`}>
                                    {summary.status}
                                  </span>
                                </div>

                                <div className="trustworthiness-cell">
                                  <span className="trustworthiness-mobile-label">Periodo</span>
                                  <strong>{summary.periodLabel}</strong>
                                </div>

                                <div className="trustworthiness-cell trustworthiness-updated-cell">
                                  <span className="trustworthiness-mobile-label">Actualizado</span>
                                  <strong>{summary.updatedLabel}</strong>
                                  <small className="trustworthiness-inline-action">
                                    {isSelected ? "Detalle abierto" : "Abrir detalle"}
                                  </small>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {selectedRecord && selectedRecordSummary
        ? typeof document !== "undefined"
          ? createPortal(
              <aside
                className={`trustworthiness-detail-drawer ${selectedRecord ? "is-open" : ""}`}
                data-walkthrough="detail-drawer"
                style={{ width: `${drawerWidth}px` }}
              >
          <button
            aria-label="Redimensionar panel de detalle"
            className="trustworthiness-detail-resize-handle"
            onPointerDown={() => {
              isResizingDrawerRef.current = true;
              document.body.style.cursor = "ew-resize";
              document.body.style.userSelect = "none";
            }}
            type="button"
          />
          <div className="trustworthiness-detail-shell">
            <div className="trustworthiness-detail-header">
              <div className="trustworthiness-detail-profile">
                {selectedRecordSummary.avatarUrl ? (
                  <img
                    alt={`Foto de ${selectedRecordSummary.evaluatedName}`}
                    className="trustworthiness-detail-avatar"
                    src={selectedRecordSummary.avatarUrl}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="trustworthiness-detail-avatar trustworthiness-avatar-fallback"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.87 0-7 2.24-7 5v1h14v-1c0-2.76-3.13-5-7-5Z" />
                    </svg>
                  </span>
                )}

                <div className="trustworthiness-detail-copy">
                  <span>Detalle de evaluación</span>
                  <h4>{selectedRecordSummary.evaluatedName}</h4>
                  {selectedRecordSummary.evaluatedEmail ? (
                    <p>{selectedRecordSummary.evaluatedEmail}</p>
                  ) : null}
                </div>
              </div>

              <div className="trustworthiness-detail-header-actions" data-walkthrough="detail-actions">
                <button
                  aria-label="Generar sugerencia TW"
                  className={`trustworthiness-detail-icon-action ${isSuggestionLoading ? "is-loading" : ""}`}
                  data-tooltip="Generar sugerencia TW"
                  disabled={isSuggestionLoading}
                  onClick={openSuggestionSideSheetAndGenerate}
                  title="Generar sugerencia TW"
                  type="button"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2.5a1 1 0 0 1 .95.68l1.23 3.7a1 1 0 0 0 .63.63l3.7 1.23a1 1 0 0 1 0 1.9l-3.7 1.23a1 1 0 0 0-.63.63l-1.23 3.7a1 1 0 0 1-1.9 0l-1.23-3.7a1 1 0 0 0-.63-.63l-3.7-1.23a1 1 0 0 1 0-1.9l3.7-1.23a1 1 0 0 0 .63-.63l1.23-3.7a1 1 0 0 1 .95-.68Zm6.5 12a.9.9 0 0 1 .85.61l.46 1.38a.9.9 0 0 0 .57.57l1.38.46a.9.9 0 0 1 0 1.7l-1.38.46a.9.9 0 0 0-.57.57l-.46 1.38a.9.9 0 0 1-1.7 0l-.46-1.38a.9.9 0 0 0-.57-.57l-1.38-.46a.9.9 0 0 1 0-1.7l1.38-.46a.9.9 0 0 0 .57-.57l.46-1.38a.9.9 0 0 1 .85-.61Z" />
                  </svg>
                </button>
                <button
                  aria-label="Abrir chatbot"
                  className="trustworthiness-detail-icon-action"
                  data-tooltip="Abrir chatbot"
                  onClick={() => openChatbot(selectedRecord)}
                  title="Chatbot"
                  type="button"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v5.5A2.75 2.75 0 0 1 16.25 14H11.4l-3.55 3.03c-.8.69-1.85.12-1.85-.94V14A2.75 2.75 0 0 1 5 11.25Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h.75v2.2l2.79-2.2h4.96c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25Z" />
                  </svg>
                </button>
                <button
                  className="trustworthiness-detail-close"
                  onClick={() => setSelectedRecordId(null)}
                  type="button"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="trustworthiness-detail-meta">
              <div>
                <span>Trustworthiness</span>
                <strong>{selectedRecordSummary.scoreLabel}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{selectedRecordSummary.status}</strong>
              </div>
              <div>
                <span>Periodo</span>
                <strong>{selectedRecordSummary.periodLabel}</strong>
              </div>
              <div>
                <span>Actualizado</span>
                <strong>{selectedRecordSummary.updatedLabel}</strong>
              </div>
            </div>

            <div className="trustworthiness-detail-groups" data-walkthrough="detail-groups">
              {selectedRecordGroups.map((group) => (
                <section
                  className={`trustworthiness-group trustworthiness-group-${group.key}`}
                  key={`${selectedRecord.id}-${group.key}`}
                >
                  <div className="trustworthiness-group-header">
                    <h4>{group.label}</h4>
                    <span>{group.fields.length} campos</span>
                  </div>
                  <div className="trustworthiness-group-grid">
                    {group.fields.map((field) => (
                      <div className="trustworthiness-field" key={`${selectedRecord.id}-${field.name}`}>
                        <dt>{field.name}</dt>
                        <dd>{renderValue(field.value)}</dd>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <section
                className="trustworthiness-group trustworthiness-group-coaching-context"
                data-walkthrough="detail-meetings"
              >
                <div className="trustworthiness-group-header">
                  <h4>Detalle de reuniones</h4>
                  <span>
                    {isCoachingContextLoading
                      ? (
                        <span className="workspace-loading-inline-label">
                          <span aria-hidden="true" className="workspace-loading-spinner is-inline" />
                          Cargando...
                        </span>
                      )
                      : coachingContextResponse
                        ? `${coachingContextResponse.records.length} reuniones`
                        : coachingContextError
                          ? "Error"
                          : "Sin datos"}
                  </span>
                </div>

                <div className="trustworthiness-context-panel">
                  <div className="trustworthiness-context-summary">
                    <strong>
                      {coachingContextResponse
                        ? `${coachingContextResponse.records.length} reuniones encontradas`
                        : "Reuniones relacionadas"}
                    </strong>
                    <small>
                      {coachingContextError
                        ? coachingContextError
                        : coachingContextResponse?.filtering.reason ??
                          `${selectedRecordSummary.evaluatedEmail ?? "Sin email"} · ${selectedPeriodIds.length} periodos activos`}
                    </small>
                  </div>

                  {isCoachingContextLoading ? <LoadingProgress label="Consultando reuniones..." /> : null}

                  {!isCoachingContextLoading && coachingContextError ? (
                    <p className="workspace-response-error">{coachingContextError}</p>
                  ) : null}

                  {!isCoachingContextLoading &&
                  !coachingContextError &&
                  coachingContextResponse &&
                  coachingContextResponse.records.length === 0 ? (
                    <div className="trustworthiness-empty-state">
                      <strong>No encontramos reuniones para este talento en los periodos seleccionados.</strong>
                      <p>
                        Se filtró por `received_at` y por coincidencia conjunta de emails dentro de
                        `participant`.
                      </p>
                    </div>
                  ) : null}

                  {!isCoachingContextLoading &&
                  !coachingContextError &&
                  coachingContextResponse &&
                  coachingContextResponse.records.length > 0 ? (
                    <div className="trustworthiness-context-list">
                      {coachingContextResponse.records.map((meeting) => {
                        const participants = getDisplayParticipants(meeting, selectedRecordSummary);

                        return (
                          <article className="trustworthiness-context-item-card" key={meeting.id}>
                            <div className="trustworthiness-context-item-header">
                              <div>
                                <strong>{getCoachingMeetingTitle(meeting)}</strong>
                                <small>{getCoachingUniqueKey(meeting)}</small>
                              </div>
                              <span>{getCoachingMeetingDatetimeLabel(meeting)}</span>
                            </div>
                            <div className="trustworthiness-context-people">
                              {participants.map((participant) => (
                                <div className="trustworthiness-context-person" key={participant.email}>
                                  {participant.avatarUrl ? (
                                    <img alt={participant.name} src={participant.avatarUrl} />
                                  ) : (
                                    <span aria-hidden="true">
                                      {participant.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                  <div>
                                    <strong>{participant.name}</strong>
                                    <small>{participant.email}</small>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              className="trustworthiness-context-chat-action"
                              onClick={() => setSelectedTranscriptMeetingId(meeting.id)}
                              type="button"
                            >
                              <svg viewBox="0 0 24 24">
                                <path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v5.5A2.75 2.75 0 0 1 16.25 14H11.4l-3.55 3.03c-.8.69-1.85.12-1.85-.94V14A2.75 2.75 0 0 1 5 11.25Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h.75v2.2l2.79-2.2h4.96c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25Z" />
                              </svg>
                              Abrir transcript
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
              </aside>,
              document.body
            )
          : null
        : null}

      {chatbotRecord && chatbotRecordSummary ? (
        <div
          aria-modal="true"
          className="trustworthiness-chatbot-backdrop"
          onClick={closeChatbot}
          role="dialog"
        >
          <div
            className="trustworthiness-chatbot-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="trustworthiness-chatbot-header">
              <div className="trustworthiness-chatbot-header-copy">
                <span>Asistente de evaluación</span>
                <h4>{chatbotRecordSummary.evaluatedName}</h4>
                <p>
                  {chatbotRecordSummary.roleLabel} · {chatbotRecordSummary.status}
                </p>
              </div>
              <div className="trustworthiness-chatbot-header-actions">
                <button
                  className="trustworthiness-chatbot-close"
                  onClick={closeChatbot}
                  type="button"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="trustworthiness-chatbot-context-grid">
              <div className="trustworthiness-chatbot-context">
                <span>Contexto</span>
                <strong>{chatbotRecordSummary.context}</strong>
              </div>
              <div className="trustworthiness-chatbot-context">
                <span>Periodo</span>
                <strong>{chatbotRecordSummary.periodLabel}</strong>
              </div>
              <div className="trustworthiness-chatbot-context">
                <span>Trustworthiness actual</span>
                <strong>{chatbotRecordSummary.scoreLabel}</strong>
              </div>
            </div>

            <div className="trustworthiness-chatbot-suggestions">
              {chatbotSuggestions.map((suggestion) => (
                <button
                  className="trustworthiness-chatbot-suggestion"
                  key={suggestion.id}
                  onClick={() => sendChatbotPrompt(suggestion.prompt)}
                  type="button"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>

            <div className="trustworthiness-chatbot-messages">
              {chatbotMessages.map((message) => (
                <div
                  className={`trustworthiness-chatbot-message is-${message.role}`}
                  key={message.id}
                >
                  <span>{message.role === "assistant" ? "Copilot" : "Tú"}</span>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>

            <div className="trustworthiness-chatbot-composer">
              <textarea
                className="trustworthiness-chatbot-input"
                onChange={(event) => setChatbotDraftMessage(event.target.value)}
                placeholder="Describe el desempeño del talento para construir la evaluación..."
                rows={4}
                value={chatbotDraftMessage}
              />
              <div className="trustworthiness-chatbot-actions">
                <small>
                  Úsalo para pensar la evaluación antes de mover estrellas o guardar la narrativa.
                </small>
                <button
                  className="trustworthiness-chatbot-send"
                  onClick={handleChatbotSubmit}
                  type="button"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTranscriptMeetingId ? (
        <aside className="transcript-side-sheet" aria-label="Transcript de reunión">
          <div className="transcript-side-sheet-header">
            <div>
              <span>Transcript</span>
              <h4>{transcriptResponse?.meetingTitle ?? "Detalle de reunión"}</h4>
              <p>{formatMeetingDatetimeValue(transcriptResponse?.meetingDatetime ?? null)}</p>
            </div>
            <button
              className="trustworthiness-detail-close"
              onClick={() => setSelectedTranscriptMeetingId(null)}
              type="button"
            >
              Cerrar
            </button>
          </div>

          <div className="transcript-side-sheet-body">
            {isTranscriptLoading ? <LoadingProgress label="Consultando transcript..." /> : null}

            {transcriptError ? (
              <p className="workspace-response-error">{transcriptError}</p>
            ) : null}

            {!isTranscriptLoading && !transcriptError && transcriptResponse ? (
              <>
                <section className="transcript-section">
                  <h5>Resumen</h5>
                  <p>{transcriptResponse.summary ?? "Esta reunión no tiene resumen disponible."}</p>
                </section>

                <section className="transcript-section">
                  <h5>Action items</h5>
                  {transcriptResponse.actionItems.length > 0 ? (
                    <ul>
                      {transcriptResponse.actionItems.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No hay action items disponibles.</p>
                  )}
                </section>

                <section className="transcript-section">
                  <h5>Topics</h5>
                  {transcriptResponse.topics.length > 0 ? (
                    <ul>
                      {transcriptResponse.topics.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No hay topics disponibles.</p>
                  )}
                </section>

                <section className="transcript-section">
                  <h5>Conversación</h5>
                  {transcriptResponse.speakerBlocks.length > 0 ? (
                    <div className="transcript-speaker-list">
                      {transcriptResponse.speakerBlocks.map((block) => (
                        <article className="transcript-speaker-block" key={block.id}>
                          <div>
                            <strong>{block.speaker}</strong>
                            <span>{formatTranscriptTime(block.startTime)}</span>
                          </div>
                          <p>{block.words}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>Esta reunión no tiene transcript disponible.</p>
                  )}
                </section>
              </>
            ) : null}
          </div>
        </aside>
      ) : null}

      {selectedRecord && selectedRecordSummary && isSuggestionSideSheetOpen ? (
        <aside className="transcript-side-sheet tw-suggestion-side-sheet" aria-label="Sugerencia TW">
          <div className="transcript-side-sheet-header">
            <div>
              <span>Sugerencia TW</span>
              <h4>{selectedRecordSummary.evaluatedName}</h4>
              <p>
                {isSuggestionLoading
                  ? "Generando sugerencia..."
                  : twSuggestion
                    ? `${twSuggestion.trustworthiness.percentage} · ${twSuggestion.trustworthiness.meaning}`
                    : "Sin sugerencia disponible"}
              </p>
            </div>
            <div className="trustworthiness-detail-header-actions">
              <button
                className={`trustworthiness-detail-icon-action ${isSuggestionLoading ? "is-loading" : ""}`}
                data-tooltip="Regenerar sugerencia"
                disabled={isSuggestionLoading}
                onClick={() => {
                  void generateTwSuggestion();
                }}
                title="Regenerar sugerencia"
                type="button"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 2.5a1 1 0 0 1 .95.68l1.23 3.7a1 1 0 0 0 .63.63l3.7 1.23a1 1 0 0 1 0 1.9l-3.7 1.23a1 1 0 0 0-.63.63l-1.23 3.7a1 1 0 0 1-1.9 0l-1.23-3.7a1 1 0 0 0-.63-.63l-3.7-1.23a1 1 0 0 1 0-1.9l3.7-1.23a1 1 0 0 0 .63-.63l1.23-3.7a1 1 0 0 1 .95-.68Zm6.5 12a.9.9 0 0 1 .85.61l.46 1.38a.9.9 0 0 0 .57.57l1.38.46a.9.9 0 0 1 0 1.7l-1.38.46a.9.9 0 0 0-.57.57l-.46 1.38a.9.9 0 0 1-1.7 0l-.46-1.38a.9.9 0 0 0-.57-.57l-1.38-.46a.9.9 0 0 1 0-1.7l1.38-.46a.9.9 0 0 0 .57-.57l.46-1.38a.9.9 0 0 1 .85-.61Z" />
                </svg>
              </button>
              <button
                className="trustworthiness-detail-close"
                onClick={() => setIsSuggestionSideSheetOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="transcript-side-sheet-body tw-suggestion-side-sheet-body">
            {isSuggestionLoading ? <LoadingProgress label="Analizando evidencia de reuniones..." /> : null}

            {suggestionError ? <p className="workspace-response-error">{suggestionError}</p> : null}

            {!isSuggestionLoading && !suggestionError && !twSuggestion ? (
              <div className="trustworthiness-empty-state">
                <strong>No hay sugerencia disponible todavía.</strong>
                <p>Presiona el botón de regenerar para consultar la IA con el contexto actual.</p>
              </div>
            ) : null}

            {twSuggestion ? (
              <div className="tw-suggestion-panel">
                <div className="tw-suggestion-summary">
                  <div>
                    <span>TW sugerido</span>
                    <strong>{twSuggestion.trustworthiness.percentage}</strong>
                    <small>
                      {twSuggestion.trustworthiness.meaning} · Confianza{" "}
                      {getConfidenceLabel(twSuggestion.trustworthiness.confidence)}
                    </small>
                  </div>
                  <div className="tw-suggestion-actions">
                    <button
                      className="detail-card-action detail-card-action-secondary"
                      disabled={!selectedRecordIsPending}
                      onClick={applyAllSuggestionPillars}
                      type="button"
                    >
                      Aplicar toda
                    </button>
                  </div>
                </div>

                <p className="tw-suggestion-explanation">{twSuggestion.trustworthiness.explanation}</p>

                <div className="tw-suggestion-pillars">
                  {SUGGESTION_PILLAR_CONFIG.map((pillarConfig) => {
                    const pillar = twSuggestion.pillars[pillarConfig.key];

                    return (
                      <article className="tw-suggestion-pillar" key={pillarConfig.key}>
                        <div className="tw-suggestion-pillar-header">
                          <div>
                            <span>{pillarConfig.label}</span>
                            <strong>{pillar.points}/10</strong>
                          </div>
                          <small>{getConfidenceLabel(pillar.confidence)}</small>
                        </div>
                        <div className="detail-score-stars" aria-label={`${pillar.points} estrellas`}>
                          <span className="detail-score-stars-filled">{"★".repeat(pillar.points)}</span>
                          <span className="detail-score-stars-empty">
                            {"☆".repeat(Math.max(0, 10 - pillar.points))}
                          </span>
                        </div>
                        <p>{pillar.shortReason}</p>
                        <small>{pillar.meaning}</small>
                        <div className="tw-suggestion-pillar-actions">
                          <button
                            className="detail-card-action detail-card-action-secondary"
                            onClick={() => setSelectedSuggestionPillar(pillarConfig.key)}
                            type="button"
                          >
                            Ver por qué
                          </button>
                          <button
                            className="detail-card-action detail-card-action-primary"
                            disabled={!selectedRecordIsPending}
                            onClick={() => applySuggestionPillar(pillarConfig.key)}
                            type="button"
                          >
                            Aplicar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}

      {selectedSuggestionPillar && twSuggestion ? (
        <div
          aria-modal="true"
          className="suggestion-detail-backdrop"
          onClick={() => setSelectedSuggestionPillar(null)}
          role="dialog"
        >
          <div
            className="suggestion-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="suggestion-detail-header">
              <div>
                <span>Por qué la IA sugirió esto</span>
                <h4>{getPillarLabel(selectedSuggestionPillar)}</h4>
                <p>
                  {twSuggestion.pillars[selectedSuggestionPillar].points}/10 · Confianza{" "}
                  {getConfidenceLabel(twSuggestion.pillars[selectedSuggestionPillar].confidence)}
                </p>
              </div>
              <button
                className="trustworthiness-detail-close"
                onClick={() => setSelectedSuggestionPillar(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="suggestion-detail-body">
              <section>
                <h5>Conclusión</h5>
                <p>{twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.conclusion}</p>
              </section>

              <section>
                <h5>Señales positivas</h5>
                {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.positiveSignals.length > 0 ? (
                  <div className="suggestion-evidence-list">
                    {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.positiveSignals.map((signal, index) => (
                      <article className="suggestion-evidence-card" key={`${signal.meetingId}-positive-${index}`}>
                        <div>
                          <strong>{signal.meetingTitle}</strong>
                          <span>{formatMeetingDatetimeValue(signal.meetingDatetime)}</span>
                        </div>
                        <small>{getSourceLabel(signal.sourceType)} · {getImpactLabel(signal.impact)}</small>
                        <p>{signal.evidenceText}</p>
                        <em>{signal.interpretation}</em>
                        <button
                          className="detail-card-action detail-card-action-secondary"
                          onClick={() => {
                            setSelectedTranscriptMeetingId(signal.meetingId);
                            setSelectedSuggestionPillar(null);
                          }}
                          type="button"
                        >
                          Abrir transcript
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No se reportaron señales positivas específicas.</p>
                )}
              </section>

              <section>
                <h5>Señales negativas o riesgos</h5>
                {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.negativeSignals.length > 0 ? (
                  <div className="suggestion-evidence-list">
                    {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.negativeSignals.map((signal, index) => (
                      <article className="suggestion-evidence-card" key={`${signal.meetingId}-negative-${index}`}>
                        <div>
                          <strong>{signal.meetingTitle}</strong>
                          <span>{formatMeetingDatetimeValue(signal.meetingDatetime)}</span>
                        </div>
                        <small>{getSourceLabel(signal.sourceType)} · {getImpactLabel(signal.impact)}</small>
                        <p>{signal.evidenceText}</p>
                        <em>{signal.interpretation}</em>
                        <button
                          className="detail-card-action detail-card-action-secondary"
                          onClick={() => {
                            setSelectedTranscriptMeetingId(signal.meetingId);
                            setSelectedSuggestionPillar(null);
                          }}
                          type="button"
                        >
                          Abrir transcript
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No se reportaron riesgos específicos.</p>
                )}
              </section>

              <section>
                <h5>Métricas usadas</h5>
                {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.metricInputs.length > 0 ? (
                  <div className="suggestion-metric-list">
                    {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.metricInputs.map((metric, index) => (
                      <div className="suggestion-metric-card" key={`${metric.metricName}-${index}`}>
                        <strong>{metric.metricName}</strong>
                        <span>{metric.value ?? "Sin valor"}</span>
                        <p>{metric.interpretation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No hubo métricas numéricas útiles para este pilar.</p>
                )}
              </section>

              <section>
                <h5>Incertidumbre</h5>
                {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.uncertainty.length > 0 ? (
                  <ul>
                    {twSuggestion.pillars[selectedSuggestionPillar].decisionDetail.uncertainty.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No se reportó incertidumbre adicional.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
