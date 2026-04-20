"use client";

import { useEffect, useRef, useState } from "react";

import {
  CHAT_REVIEW_WIDTH_STORAGE_KEY,
  buildDetailAiSuggestions,
  buildDetailGroups,
  clearExpiredSuggestionCache,
  compareRecords,
  createDraftFromRecord,
  createIdleTwGenerationProgress,
  createPeriods,
  createRunningTwGenerationProgress,
  createSuggestionDraftPointsFromSuggestion,
  createTwSuggestionCacheKey,
  DEFAULT_STATUS_FILTERS,
  dedupeRecords,
  DETAIL_DRAWER_WIDTH_STORAGE_KEY,
  FALLBACK_COMPLETED_STATUS,
  getAiJsonPayloadField,
  getEditablePillarMeaning,
  getGenerationCompletedStages,
  getPillarDraftField,
  getPillarLabel,
  getRecordStatus,
  getRecordSummary,
  getTrustworthinessMeaningFromScore,
  getSelectedPeriodCoverage,
  groupRecordsBySelectedPeriods,
  isPendingRecord,
  isTwSuggestionStreamEvent,
  normalizeStatusValue,
  PERIOD_SELECTION_STORAGE_KEY,
  readCachedTwSuggestion,
  serializePillarSuggestion,
  sortStatuses,
  TW_GENERATION_STEPS,
  WALKTHROUGH_DETAIL_STEP_IDS,
  writeCachedTwSuggestion
} from "./helpers";
import {
  TrustworthinessDetailDrawer,
  TrustworthinessFilters,
  TrustworthinessRecordsSection,
  TrustworthinessSaveConfirmationModal
} from "./main-sections";
import { TrustworthinessMockChatModal } from "./mock-chat-modal";
import {
  SuggestionDetailModal,
  TranscriptSideSheet,
  TrustworthinessFloatingToasts,
  TrustworthinessSuggestionSideSheet
} from "./overlays";
import type {
  CoachingContextResponse,
  CoachingTranscriptResponse,
  EditableDraftTarget,
  EditableScoreField,
  PeriodOption,
  SuggestionAppliedPoints,
  SuggestionCacheNotice,
  SuggestionNotification,
  SuggestionPillarKey,
  TrustworthinessDraft,
  TrustworthinessFloatingToast,
  TrustworthinessRatingStatus,
  TrustworthinessRecord,
  TrustworthinessResponse,
  TrustworthinessWorkspaceProps,
  TwGenerationProgress,
  TwGenerationStage,
  TwSuggestionCacheMetadata,
  TwSuggestionResponse
} from "./types";

function isIdleTwGenerationProgress(progress: TwGenerationProgress) {
  return (
    progress.status === "idle" &&
    progress.currentStage === null &&
    progress.errorMessage === null &&
    progress.errorStage === null &&
    progress.completedStages.length === 0
  );
}

function isEmptyAppliedSuggestionPoints(value: SuggestionAppliedPoints) {
  return Object.keys(value).length === 0;
}

function areAppliedSuggestionPointsEqual(
  left: SuggestionAppliedPoints,
  right: SuggestionAppliedPoints
) {
  return (
    left.reliability === right.reliability &&
    left.intimacy === right.intimacy &&
    left.groupThinking === right.groupThinking &&
    left.credibility === right.credibility
  );
}

function areSuggestionDraftPointsEqual(
  left: Record<SuggestionPillarKey, number> | null,
  right: Record<SuggestionPillarKey, number> | null
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.reliability === right.reliability &&
    left.intimacy === right.intimacy &&
    left.groupThinking === right.groupThinking &&
    left.credibility === right.credibility
  );
}

function getGenerationStageLabel(stage: TwGenerationStage) {
  return TW_GENERATION_STEPS.find((step) => step.id === stage)?.label ?? "Actualizando sugerencia TW";
}

const DETAIL_DRAWER_DEFAULT_WIDTH = 550;
const DETAIL_DRAWER_MIN_WIDTH = 360;
const DETAIL_DRAWER_MAX_WIDTH = 760;

function clampDetailDrawerWidth(width: number) {
  const roundedWidth = Math.round(width);

  if (typeof window === "undefined") {
    return Math.min(DETAIL_DRAWER_MAX_WIDTH, Math.max(DETAIL_DRAWER_MIN_WIDTH, roundedWidth));
  }

  const maxWidth = Math.min(DETAIL_DRAWER_MAX_WIDTH, window.innerWidth - 120);
  return Math.min(maxWidth, Math.max(DETAIL_DRAWER_MIN_WIDTH, roundedWidth));
}

function getGenerationStageToastMessage(stage: TwGenerationStage) {
  const stepIndex = TW_GENERATION_STEPS.findIndex((step) => step.id === stage);
  const baseLabel = getGenerationStageLabel(stage);

  if (stage === "sending_context_to_ai") {
    return `Paso ${stepIndex + 1} de ${TW_GENERATION_STEPS.length}: ${baseLabel}. Esto puede tardar unos segundos.`;
  }

  return `Paso ${stepIndex + 1} de ${TW_GENERATION_STEPS.length}: ${baseLabel}.`;
}

type SidePanelKey =
  | "chat"
  | "chatAgentConfig"
  | "chatContext"
  | "suggestion"
  | "suggestionDetail"
  | "transcript";

const SIDE_PANEL_BASE_Z_INDEX = 30;
const SIDE_PANEL_KEYS: SidePanelKey[] = [
  "chat",
  "chatContext",
  "chatAgentConfig",
  "transcript",
  "suggestion",
  "suggestionDetail"
];

const EDITABLE_SCORE_FIELDS: EditableScoreField[] = [
  "reliabilityPoints",
  "intimacyPoints",
  "groupThinkingPoints",
  "credibilityPoints"
];
const EDITABLE_DRAFT_TARGETS: EditableDraftTarget[] = [...EDITABLE_SCORE_FIELDS, "feedback"];

function getEditableRatingStatus(value: string | null | undefined): TrustworthinessRatingStatus {
  return normalizeStatusValue(value ?? "") === normalizeStatusValue(FALLBACK_COMPLETED_STATUS)
    ? "Done"
    : "Pending";
}

function getManualSaveToastMessage(status: TrustworthinessRatingStatus) {
  return status === "Done"
    ? "Evaluación guardada como Done."
    : "Evaluación guardada como Draft. El status queda en Pending.";
}

function createInitialSidePanelLayers(): Record<SidePanelKey, number> {
  return {
    chat: 0,
    chatAgentConfig: 0,
    chatContext: 0,
    suggestion: 0,
    suggestionDetail: 0,
    transcript: 0
  };
}

type ChatbotWalkthroughSnapshot = {
  chatbotCoachingContextError: string | null;
  chatbotCoachingContextKey: string | null;
  chatbotCoachingContextResponse: CoachingContextResponse | null;
  chatbotRecordId: string | null;
  isChatAgentConfigPanelOpen: boolean;
  isChatbotCoachingContextLoading: boolean;
  isChatContextPanelOpen: boolean;
  isSuggestionSideSheetOpen: boolean;
  isTranscriptLoading: boolean;
  selectedRecordId: string | null;
  selectedSuggestionPillar: SuggestionPillarKey | null;
  selectedTranscriptMeetingId: string | null;
  transcriptError: string | null;
  transcriptParticipantEmail: string | null;
  transcriptRequestKey: string | null;
  transcriptResponse: CoachingTranscriptResponse | null;
};

function createWalkthroughDemoMeetingDatetime(start: string, dayOffset: number, hour: number) {
  const date = new Date(`${start}T${String(hour).padStart(2, "0")}:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString();
}

function createWalkthroughDemoContext(params: {
  coverage: { end: string; start: string };
  record: TrustworthinessRecord;
  recordSummary: {
    avatarUrl: string | null;
    context: string;
    evaluatedEmail: string | null;
    evaluatedName: string;
    roleLabel: string;
  };
}): CoachingContextResponse {
  const participantEmail =
    params.recordSummary.evaluatedEmail?.trim().toLowerCase() ??
    `demo-${params.record.id.toLowerCase()}@singularagency.co`;
  const evaluatedRole =
    params.recordSummary.roleLabel.trim() && params.recordSummary.roleLabel !== "Sin rol"
      ? params.recordSummary.roleLabel
      : null;
  const participants = [
    {
      avatarUrl: params.recordSummary.avatarUrl,
      email: participantEmail,
      name: params.recordSummary.evaluatedName,
      role: evaluatedRole
    },
    {
      avatarUrl: null,
      email: "gm@singularagency.co",
      name: "Gerardo Molina",
      role: "Product Owner"
    }
  ];

  return {
    filtering: {
      applied: true,
      reason: "Walkthrough demo del período oficial seleccionado."
    },
    ok: true,
    participantEmail,
    recordCount: 3,
    records: [
      {
        id: `${params.record.id}-wt-meeting-1`,
        fields: {
          action_items: [
            "Publicar la página de decisiones del sprint antes del viernes.",
            "Asignar owners para cada entregable visible en el board."
          ],
          coaching_analysis:
            "La reunión muestra estructura clara, seguimiento de dependencias y coordinación entre producto y delivery, aunque el cierre de ownership todavía depende de confirmaciones posteriores.",
          coaching_summary:
            `${params.recordSummary.evaluatedName} facilitó una revisión ordenada, conectando prioridades de ${params.recordSummary.context || "proyecto"} con próximos pasos concretos.`,
          meeting_datetime: createWalkthroughDemoMeetingDatetime(params.coverage.start, 4, 15),
          meeting_title: "Pioneering Collective Review",
          metrics_scores: {
            "Decision Documentation": 7.5,
            "Meeting Structure & Facilitation": 8,
            "Stakeholder Alignment": 8
          },
          topics: [
            "priorización del sprint",
            "claridad de ownership",
            "riesgos operativos"
          ],
          transcript_summary:
            "El equipo valida prioridades, define entregables y deja varios action items concretos, pero queda un riesgo por confirmar responsables finales.",
          unique_key: `WT-${params.record.id}-1`
        },
        participantEmails: participants.map((participant) => participant.email),
        participants
      },
      {
        id: `${params.record.id}-wt-meeting-2`,
        fields: {
          action_items: [
            "Enviar recap del cliente con fechas comprometidas.",
            "Confirmar mitigación del bloqueo legal antes del miércoles."
          ],
          coaching_analysis:
            "Buena claridad de timeline y expectativa del cliente, pero aparecen señales repetidas de dependencia en terceros y mitigación reactiva del riesgo.",
          coaching_summary:
            `La conversación con Invercorp muestra capacidad de articulación y seguimiento, aunque todavía hay brechas cuando las decisiones quedan sujetas a validaciones externas.`,
          meeting_datetime: createWalkthroughDemoMeetingDatetime(params.coverage.start, 10, 16),
          meeting_title: "Invercorp Review",
          metrics_scores: {
            "Client Clarity": 8,
            "Risk Management": 6.5,
            "Timeline Coordination": 8
          },
          topics: [
            "timeline de cierre de sprint",
            "riesgos legales",
            "alineación con cliente"
          ],
          transcript_summary:
            "La reunión confirma cadencia y claridad de timeline, pero deja pendiente la mitigación de un riesgo externo que condiciona el cierre.",
          unique_key: `WT-${params.record.id}-2`
        },
        participantEmails: participants.map((participant) => participant.email),
        participants
      },
      {
        id: `${params.record.id}-wt-meeting-3`,
        fields: {
          action_items: [
            "Revisar dependencias cruzadas con UX.",
            "Compartir feedback consolidado con el equipo antes de la daily."
          ],
          coaching_analysis:
            "Se observa colaboración sana, escucha activa y construcción colectiva de decisiones. La conversación refuerza empatía y group thinking positivos.",
          coaching_summary:
            `${params.recordSummary.evaluatedName} promueve colaboración transversal y mantiene un tono constructivo mientras alinea al equipo en prioridades compartidas.`,
          meeting_datetime: createWalkthroughDemoMeetingDatetime(params.coverage.start, 16, 14),
          meeting_title: "Sprint Planning Follow-up",
          metrics_scores: {
            "Collaboration": 8.5,
            Empathy: 8,
            "Group Coordination": 8
          },
          topics: [
            "coordinación del equipo",
            "alineación cross-functional",
            "feedback compartido"
          ],
          transcript_summary:
            "La reunión sostiene buen tono, coordinación transversal y acuerdos compartidos, con evidencia útil para Intimacy y Group Thinking.",
          unique_key: `WT-${params.record.id}-3`
        },
        participantEmails: participants.map((participant) => participant.email),
        participants
      }
    ],
    selectedPeriods: [`${params.coverage.start} -> ${params.coverage.end}`],
    tableName: "WT Chatbot Demo Context"
  };
}

function createWalkthroughDemoSuggestion(params: {
  coachingContextResponse: CoachingContextResponse;
  record: TrustworthinessRecord;
  recordSummary: {
    context: string;
    evaluatedName: string;
  };
}): TwSuggestionResponse {
  const [meetingOne, meetingTwo, meetingThree] = params.coachingContextResponse.records;
  const reliabilityPoints = 7;
  const intimacyPoints = 8;
  const groupThinkingPoints = 7;
  const credibilityPoints = 7;
  const trustworthinessScore =
    (credibilityPoints +
      reliabilityPoints +
      intimacyPoints * 2 +
      groupThinkingPoints * 2) /
    60;

  return {
    generatedAt: new Date().toISOString(),
    meetingsUsed: params.coachingContextResponse.records.length,
    ok: true,
    pillars: {
      credibility: {
        confidence: "medium",
        decisionDetail: {
          conclusion:
            "La evidencia sostiene una credibilidad sólida: hay conocimiento del contexto, criterio técnico razonable y comunicación clara, aunque parte de la validación final todavía depende de terceros.",
          metricInputs: [
            {
              interpretation: "La claridad ante cliente sostiene una base creíble de comunicación.",
              mappedTo: "credibility",
              metricName: "Client Clarity",
              value: 8
            },
            {
              interpretation: "La mitigación reactiva del riesgo baja un poco la credibilidad percibida.",
              mappedTo: "credibility",
              metricName: "Risk Management",
              value: 6.5
            }
          ],
          negativeSignals: [
            {
              evidenceText:
                "La mitigación del riesgo legal quedó pendiente de confirmación externa.",
              impact: "lowers_score",
              interpretation:
                "La propuesta mantiene prudencia porque la comunicación de riesgo todavía no cierra el loop completo.",
              meetingDatetime:
                typeof meetingTwo?.fields.meeting_datetime === "string"
                  ? meetingTwo.fields.meeting_datetime
                  : "",
              meetingId: meetingTwo?.id ?? `${params.record.id}-wt-meeting-2`,
              meetingTitle:
                typeof meetingTwo?.fields.meeting_title === "string"
                  ? meetingTwo.fields.meeting_title
                  : "Invercorp Review",
              sourceType: "coaching_analysis"
            }
          ],
          positiveSignals: [
            {
              evidenceText:
                "Se confirmó cadencia y claridad del timeline frente al cliente.",
              impact: "raises_score",
              interpretation:
                "La claridad de comunicación y dominio del contexto sostienen credibilidad en la propuesta.",
              meetingDatetime:
                typeof meetingTwo?.fields.meeting_datetime === "string"
                  ? meetingTwo.fields.meeting_datetime
                  : "",
              meetingId: meetingTwo?.id ?? `${params.record.id}-wt-meeting-2`,
              meetingTitle:
                typeof meetingTwo?.fields.meeting_title === "string"
                  ? meetingTwo.fields.meeting_title
                  : "Invercorp Review",
              sourceType: "transcript_summary"
            }
          ],
          uncertainty: [
            "No hay evidencia directa del cumplimiento posterior de los compromisos."
          ]
        },
        meaning: getEditablePillarMeaning("credibility", credibilityPoints),
        points: credibilityPoints,
        shortReason:
          "Demuestra criterio y claridad de comunicación, con espacio para reforzar cómo documenta mitigaciones y validaciones finales."
      },
      groupThinking: {
        confidence: "medium",
        decisionDetail: {
          conclusion:
            "El período muestra colaboración sana y priorización compartida. La propuesta conserva un 7/10 porque hay coordinación real entre roles, aunque todavía depende de seguimiento posterior para cerrar del todo.",
          metricInputs: [
            {
              interpretation: "La coordinación transversal se observa de forma consistente.",
              mappedTo: "groupThinking",
              metricName: "Group Coordination",
              value: 8
            },
            {
              interpretation: "La colaboración es alta y visible en la conversación.",
              mappedTo: "groupThinking",
              metricName: "Collaboration",
              value: 8.5
            }
          ],
          negativeSignals: [],
          positiveSignals: [
            {
              evidenceText:
                "Se compartió feedback consolidado y se alinearon prioridades cross-functional.",
              impact: "raises_score",
              interpretation:
                "La evidencia refuerza una lectura positiva de coordinación y construcción colectiva.",
              meetingDatetime:
                typeof meetingThree?.fields.meeting_datetime === "string"
                  ? meetingThree.fields.meeting_datetime
                  : "",
              meetingId: meetingThree?.id ?? `${params.record.id}-wt-meeting-3`,
              meetingTitle:
                typeof meetingThree?.fields.meeting_title === "string"
                  ? meetingThree.fields.meeting_title
                  : "Sprint Planning Follow-up",
              sourceType: "action_item"
            }
          ],
          uncertainty: [
            "No hay evidencia suficiente para afirmar un nivel excepcional sostenido."
          ]
        },
        meaning: getEditablePillarMeaning("groupThinking", groupThinkingPoints),
        points: groupThinkingPoints,
        shortReason:
          "Coordina bien al grupo y prioriza intereses compartidos, aunque el cierre de algunos acuerdos todavía depende de seguimiento adicional."
      },
      intimacy: {
        confidence: "medium",
        decisionDetail: {
          conclusion:
            "La evidencia del período muestra buena empatía, escucha activa y tono constructivo con equipo y cliente, por eso Intimacy sube a 8/10.",
          metricInputs: [
            {
              interpretation: "El tono y la escucha sostienen una relación confiable con el equipo.",
              mappedTo: "intimacy",
              metricName: "Empathy",
              value: 8
            }
          ],
          negativeSignals: [],
          positiveSignals: [
            {
              evidenceText:
                "La conversación mantiene un tono constructivo y alinea prioridades sin fricción visible.",
              impact: "raises_score",
              interpretation:
                "Refuerza que la relación se maneja con cercanía funcional y claridad.",
              meetingDatetime:
                typeof meetingThree?.fields.meeting_datetime === "string"
                  ? meetingThree.fields.meeting_datetime
                  : "",
              meetingId: meetingThree?.id ?? `${params.record.id}-wt-meeting-3`,
              meetingTitle:
                typeof meetingThree?.fields.meeting_title === "string"
                  ? meetingThree.fields.meeting_title
                  : "Sprint Planning Follow-up",
              sourceType: "coaching_summary"
            }
          ],
          uncertainty: [
            "La evidencia viene de reuniones concretas y no cubre todos los stakeholders del período."
          ]
        },
        meaning: getEditablePillarMeaning("intimacy", intimacyPoints),
        points: intimacyPoints,
        shortReason:
          "Muestra buena conexión con stakeholders y un tono empático consistente en las reuniones observadas."
      },
      reliability: {
        confidence: "medium",
        decisionDetail: {
          conclusion:
            "Reliability queda en 7/10 porque hay estructura, claridad de próximos pasos y buena coordinación, pero aún aparecen brechas repetidas en cierre de ownership y mitigación proactiva del riesgo.",
          metricInputs: [
            {
              interpretation: "La estructura y facilitación de la reunión empujan la confiabilidad hacia arriba.",
              mappedTo: "reliability",
              metricName: "Meeting Structure & Facilitation",
              value: 8
            },
            {
              interpretation: "La documentación de decisiones es útil, pero no siempre cierra el ciclo.",
              mappedTo: "reliability",
              metricName: "Decision Documentation",
              value: 7.5
            },
            {
              interpretation: "La gestión de riesgo todavía necesita más anticipación.",
              mappedTo: "reliability",
              metricName: "Risk Management",
              value: 6.5
            }
          ],
          negativeSignals: [
            {
              evidenceText:
                "Persisten decisiones sujetas a confirmación posterior y mitigación reactiva de riesgos.",
              impact: "lowers_score",
              interpretation:
                "La confiabilidad no cae, pero sí se contiene porque el cierre de ciclo todavía tiene fricciones.",
              meetingDatetime:
                typeof meetingTwo?.fields.meeting_datetime === "string"
                  ? meetingTwo.fields.meeting_datetime
                  : "",
              meetingId: meetingTwo?.id ?? `${params.record.id}-wt-meeting-2`,
              meetingTitle:
                typeof meetingTwo?.fields.meeting_title === "string"
                  ? meetingTwo.fields.meeting_title
                  : "Invercorp Review",
              sourceType: "coaching_analysis"
            }
          ],
          positiveSignals: [
            {
              evidenceText:
                "Se dejan action items concretos y un board de seguimiento visible para el equipo.",
              impact: "raises_score",
              interpretation:
                "Esto sostiene una lectura confiable de coordinación y ejecución.",
              meetingDatetime:
                typeof meetingOne?.fields.meeting_datetime === "string"
                  ? meetingOne.fields.meeting_datetime
                  : "",
              meetingId: meetingOne?.id ?? `${params.record.id}-wt-meeting-1`,
              meetingTitle:
                typeof meetingOne?.fields.meeting_title === "string"
                  ? meetingOne.fields.meeting_title
                  : "Pioneering Collective Review",
              sourceType: "action_item"
            }
          ],
          uncertainty: [
            "No hay evidencia concluyente del cumplimiento posterior de todos los commitments."
          ]
        },
        meaning: getEditablePillarMeaning("reliability", reliabilityPoints),
        points: reliabilityPoints,
        shortReason:
          "Hay buena estructura y seguimiento dentro de las reuniones, aunque todavía aparecen brechas de cierre de ownership y mitigación proactiva."
      }
    },
    recordId: params.record.id,
    trustworthiness: {
      confidence: "medium",
      explanation: `${params.recordSummary.evaluatedName} muestra buena estructura, coordinación y claridad con stakeholders durante el período, con oportunidades puntuales de fortalecer el cierre de ciclo y la anticipación del riesgo en ${params.recordSummary.context || "el proyecto"}.`,
      meaning: getTrustworthinessMeaningFromScore(trustworthinessScore),
      percentage: `${Math.round(trustworthinessScore * 100)}%`,
      score: trustworthinessScore
    }
  };
}

function createWalkthroughDemoTranscript(params: {
  coachingContextResponse: CoachingContextResponse | null;
  meetingId: string;
}): CoachingTranscriptResponse | null {
  const targetMeeting =
    params.coachingContextResponse?.records.find((record) => record.id === params.meetingId) ?? null;

  if (!targetMeeting) {
    return null;
  }

  const meetingTitle =
    typeof targetMeeting.fields.meeting_title === "string"
      ? targetMeeting.fields.meeting_title
      : "Reunión demo del walkthrough";
  const meetingDatetime =
    typeof targetMeeting.fields.meeting_datetime === "string"
      ? targetMeeting.fields.meeting_datetime
      : null;
  const summary =
    typeof targetMeeting.fields.transcript_summary === "string"
      ? targetMeeting.fields.transcript_summary
      : null;
  const topics = Array.isArray(targetMeeting.fields.topics)
    ? targetMeeting.fields.topics.filter((topic): topic is string => typeof topic === "string")
    : [];
  const actionItems = Array.isArray(targetMeeting.fields.action_items)
    ? targetMeeting.fields.action_items.filter((item): item is string => typeof item === "string")
    : [];
  const uniqueKey =
    typeof targetMeeting.fields.unique_key === "string"
      ? targetMeeting.fields.unique_key
      : targetMeeting.id;
  const primarySpeaker = targetMeeting.participants?.[0]?.name ?? "Facilitador";
  const secondarySpeaker = targetMeeting.participants?.[1]?.name ?? "Stakeholder";

  return {
    actionItems,
    chapterSummaries: [
      {
        description:
          "Se alinean prioridades del período, se revisan dependencias y se acuerdan siguientes pasos.",
        title: "Alineación inicial"
      },
      {
        description:
          "La conversación entra al detalle del riesgo, ownership y coordinación con el equipo.",
        title: "Decisiones y riesgos"
      }
    ],
    meetingDatetime,
    meetingTitle,
    ok: true,
    speakerBlocks: [
      {
        endTime: 78,
        id: `${targetMeeting.id}-speaker-1`,
        speaker: primarySpeaker,
        startTime: 0,
        words:
          "Repasemos prioridades del período, riesgos abiertos y qué owners debemos dejar explícitos antes de cerrar la reunión."
      },
      {
        endTime: 164,
        id: `${targetMeeting.id}-speaker-2`,
        speaker: secondarySpeaker,
        startTime: 79,
        words:
          "Queda claro el timeline y las dependencias. Necesitamos visibilidad sobre el bloqueo y una recap con compromisos concretos."
      },
      {
        endTime: 245,
        id: `${targetMeeting.id}-speaker-3`,
        speaker: primarySpeaker,
        startTime: 165,
        words:
          "Perfecto. Dejemos action items, responsables y fecha de seguimiento para asegurar cierre de ciclo esta semana."
      }
    ],
    summary,
    topics,
    uniqueKey
  };
}

export function TrustworthinessWorkspace({
  isWalkthroughOpen = false,
  onWalkthroughAbort,
  onWalkthroughComplete,
  onWalkthroughToast,
  walkthroughStepId = null,
  walkthroughVariant = null
}: TrustworthinessWorkspaceProps) {
  const selectorRef = useRef<HTMLDetailsElement | null>(null);
  const statusFilterRef = useRef<HTMLDivElement | null>(null);
  const detailShellRef = useRef<HTMLDivElement | null>(null);
  const isResizingDrawerRef = useRef(false);
  const isResizingChatRef = useRef(false);
  const lastCoachingContextKeyRef = useRef<string | null>(null);
  const lastChatbotCoachingContextKeyRef = useRef<string | null>(null);
  const lastTranscriptKeyRef = useRef<string | null>(null);
  const isClosingDetailForChatRef = useRef(false);
  const walkthroughAutoSelectedRecordIdRef = useRef<string | null>(null);
  const walkthroughPreviousSelectedRecordIdRef = useRef<string | null>(null);
  const chatbotWalkthroughSnapshotRef = useRef<ChatbotWalkthroughSnapshot | null>(null);
  const chatbotWalkthroughHasOpenedRef = useRef(false);
  const suggestionGenerationRequestIdRef = useRef(0);
  const activeGenerationToastIdRef = useRef<number | null>(null);
  const generationToastTimeoutsRef = useRef<Map<number, { closeTimeoutId: number; removeTimeoutId: number | null }>>(
    new Map()
  );
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
  const [statusValue, setStatusValue] = useState<TrustworthinessRatingStatus>("Pending");
  const [isManualSaveConfirmationOpen, setIsManualSaveConfirmationOpen] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [manualSaveErrorMessage, setManualSaveErrorMessage] = useState<string | null>(null);
  const [manualSavingStatus, setManualSavingStatus] = useState<TrustworthinessRatingStatus | null>(null);
  const [feedbackGenerationError, setFeedbackGenerationError] = useState<string | null>(null);
  const [isFeedbackGenerating, setIsFeedbackGenerating] = useState(false);
  const [chatbotRecordId, setChatbotRecordId] = useState<string | null>(null);
  const [isChatContextPanelOpen, setIsChatContextPanelOpen] = useState(false);
  const [isChatAgentConfigPanelOpen, setIsChatAgentConfigPanelOpen] = useState(false);
  const [coachingContextResponse, setCoachingContextResponse] = useState<CoachingContextResponse | null>(null);
  const [coachingContextError, setCoachingContextError] = useState<string | null>(null);
  const [isCoachingContextLoading, setIsCoachingContextLoading] = useState(false);
  const [chatbotCoachingContextResponse, setChatbotCoachingContextResponse] = useState<CoachingContextResponse | null>(
    null
  );
  const [chatbotCoachingContextError, setChatbotCoachingContextError] = useState<string | null>(null);
  const [isChatbotCoachingContextLoading, setIsChatbotCoachingContextLoading] = useState(false);
  const [selectedTranscriptMeetingId, setSelectedTranscriptMeetingId] = useState<string | null>(null);
  const [transcriptParticipantEmail, setTranscriptParticipantEmail] = useState<string | null>(null);
  const [transcriptResponse, setTranscriptResponse] = useState<CoachingTranscriptResponse | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [twSuggestion, setTwSuggestion] = useState<TwSuggestionResponse | null>(null);
  const [suggestionDraftPoints, setSuggestionDraftPoints] = useState<Record<SuggestionPillarKey, number> | null>(
    null
  );
  const [appliedSuggestionPoints, setAppliedSuggestionPoints] = useState<SuggestionAppliedPoints>({});
  const [suggestionCacheNotice, setSuggestionCacheNotice] = useState<SuggestionCacheNotice | null>(null);
  const [suggestionNotification, setSuggestionNotification] = useState<SuggestionNotification | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isSuggestionSideSheetOpen, setIsSuggestionSideSheetOpen] = useState(false);
  const [selectedSuggestionPillar, setSelectedSuggestionPillar] = useState<SuggestionPillarKey | null>(null);
  const [twGenerationProgress, setTwGenerationProgress] = useState<TwGenerationProgress>(() =>
    createIdleTwGenerationProgress()
  );
  const [generationToasts, setGenerationToasts] = useState<TrustworthinessFloatingToast[]>([]);
  const [drawerWidth, setDrawerWidth] = useState(() => clampDetailDrawerWidth(DETAIL_DRAWER_DEFAULT_WIDTH));
  const [chatWidth, setChatWidth] = useState(760);
  const sidePanelOrderRef = useRef(0);
  const previousSidePanelVisibilityRef = useRef<Record<SidePanelKey, boolean>>({
    chat: false,
    chatAgentConfig: false,
    chatContext: false,
    suggestion: false,
    suggestionDetail: false,
    transcript: false
  });
  const [sidePanelLayers, setSidePanelLayers] = useState<Record<SidePanelKey, number>>(
    createInitialSidePanelLayers
  );
  const isChatOpen = chatbotRecordId !== null;
  const isChatbotWalkthrough = isWalkthroughOpen && walkthroughVariant === "chatbot";
  const isChatAgentConfigOpen = isChatAgentConfigPanelOpen;
  const isTranscriptOpen = selectedTranscriptMeetingId !== null;
  const isSuggestionOpen = isSuggestionSideSheetOpen;
  const isSuggestionDetailOpen =
    isSuggestionSideSheetOpen &&
    selectedSuggestionPillar !== null &&
    twSuggestion !== null;

  function getSidePanelZIndex(panelKey: SidePanelKey) {
    return SIDE_PANEL_BASE_Z_INDEX + sidePanelLayers[panelKey];
  }

  useEffect(() => {
    return () => {
      for (const timeoutGroup of generationToastTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutGroup.closeTimeoutId);
        if (timeoutGroup.removeTimeoutId !== null) {
          window.clearTimeout(timeoutGroup.removeTimeoutId);
        }
      }

      generationToastTimeoutsRef.current.clear();
      activeGenerationToastIdRef.current = null;
    };
  }, []);

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

      setDrawerWidth(clampDetailDrawerWidth(parsedWidth));
    } catch {
      window.localStorage.removeItem(DETAIL_DRAWER_WIDTH_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(CHAT_REVIEW_WIDTH_STORAGE_KEY);

      if (!rawValue) {
        return;
      }

      const parsedWidth = Number(rawValue);

      if (!Number.isFinite(parsedWidth)) {
        return;
      }

      const minWidth = 620;
      const maxWidth = Math.min(1120, window.innerWidth - 120);
      setChatWidth(Math.min(maxWidth, Math.max(minWidth, Math.round(parsedWidth))));
    } catch {
      window.localStorage.removeItem(CHAT_REVIEW_WIDTH_STORAGE_KEY);
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
    window.localStorage.setItem(CHAT_REVIEW_WIDTH_STORAGE_KEY, String(chatWidth));
  }, [chatWidth]);

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
      setFeedbackGenerationError(null);
      setIsFeedbackGenerating(false);
      setIsManualSaveConfirmationOpen(false);
      setIsManualSaving(false);
      setManualSaveErrorMessage(null);
      setManualSavingStatus(null);
      return;
    }

    const activeRecord =
      responsePayload.records.find((record) => record.id === selectedRecordId) ?? null;

    if (!activeRecord || !isPendingRecord(activeRecord)) {
      setDraftRecord(null);
      setFeedbackGenerationError(null);
      setIsFeedbackGenerating(false);
      setStatusValue(activeRecord ? getEditableRatingStatus(getRecordStatus(activeRecord)) : "Pending");
      setIsManualSaveConfirmationOpen(false);
      setIsManualSaving(false);
      setManualSaveErrorMessage(null);
      setManualSavingStatus(null);
      return;
    }

    setDraftRecord(createDraftFromRecord(activeRecord));
    setStatusValue(getEditableRatingStatus(getRecordStatus(activeRecord)));
    setFeedbackGenerationError(null);
    setIsFeedbackGenerating(false);
    setIsManualSaveConfirmationOpen(false);
    setIsManualSaving(false);
    setManualSaveErrorMessage(null);
    setManualSavingStatus(null);
  }, [responsePayload, selectedRecordId]);

  useEffect(() => {
    if (!selectedRecordId && isClosingDetailForChatRef.current) {
      isClosingDetailForChatRef.current = false;
      return;
    }

    suggestionGenerationRequestIdRef.current += 1;
    clearGenerationToasts();
    setSelectedTranscriptMeetingId((current) => (current === null ? current : null));
    setTranscriptResponse((current) => (current === null ? current : null));
    setTranscriptError((current) => (current === null ? current : null));
    setTwSuggestion((current) => (current === null ? current : null));
    setSuggestionDraftPoints((current) => (current === null ? current : null));
    setAppliedSuggestionPoints((current) => (isEmptyAppliedSuggestionPoints(current) ? current : {}));
    setSuggestionCacheNotice((current) => (current === null ? current : null));
    setSuggestionNotification((current) => (current === null ? current : null));
    setSuggestionError((current) => (current === null ? current : null));
    setIsSuggestionSideSheetOpen((current) => (current ? false : current));
    setSelectedSuggestionPillar((current) => (current === null ? current : null));
    setTwGenerationProgress((current) =>
      isIdleTwGenerationProgress(current) ? current : createIdleTwGenerationProgress()
    );
    setIsSuggestionLoading((current) => (current ? false : current));
  }, [selectedRecordId]);

  useEffect(() => {
    if (!twSuggestion) {
      setSuggestionDraftPoints((current) => (current === null ? current : null));
      setAppliedSuggestionPoints((current) => (isEmptyAppliedSuggestionPoints(current) ? current : {}));
      return;
    }

    setSuggestionDraftPoints((current) => {
      const nextDraftPoints = createSuggestionDraftPointsFromSuggestion(twSuggestion);

      if (current === null) {
        return nextDraftPoints;
      }

      return areSuggestionDraftPointsEqual(current, nextDraftPoints) ? current : nextDraftPoints;
    });
  }, [twSuggestion]);

  useEffect(() => {
    if (!suggestionNotification) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuggestionNotification((current) =>
        current?.id === suggestionNotification.id ? null : current
      );
    }, 2600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [suggestionNotification]);

  useEffect(() => {
    const nextVisibility: Record<SidePanelKey, boolean> = {
      chat: isChatOpen,
      chatAgentConfig: isChatAgentConfigOpen,
      chatContext: isChatContextPanelOpen,
      suggestion: isSuggestionOpen,
      suggestionDetail: isSuggestionDetailOpen,
      transcript: isTranscriptOpen
    };
    const openedPanels = SIDE_PANEL_KEYS.filter(
      (panelKey) => nextVisibility[panelKey] && !previousSidePanelVisibilityRef.current[panelKey]
    );

    previousSidePanelVisibilityRef.current = nextVisibility;

    if (openedPanels.length === 0) {
      return;
    }

    setSidePanelLayers((current) => {
      const next = { ...current };
      let nextOrder = sidePanelOrderRef.current;

      for (const panelKey of openedPanels) {
        nextOrder += 1;
        next[panelKey] = nextOrder;
      }

      sidePanelOrderRef.current = nextOrder;
      return next;
    });
  }, [
    isChatAgentConfigOpen,
    isChatContextPanelOpen,
    isChatOpen,
    isSuggestionDetailOpen,
    isSuggestionOpen,
    isTranscriptOpen
  ]);

  useEffect(() => {
    if (!isChatOpen) {
      if (isChatContextPanelOpen) {
        setIsChatContextPanelOpen(false);
      }
      if (isChatAgentConfigPanelOpen) {
        setIsChatAgentConfigPanelOpen(false);
      }
    }
  }, [isChatAgentConfigPanelOpen, isChatContextPanelOpen, isChatOpen]);

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
        if (isChatAgentConfigPanelOpen) {
          setIsChatAgentConfigPanelOpen(false);
          return;
        }
        if (isChatContextPanelOpen) {
          setIsChatContextPanelOpen(false);
          return;
        }
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
          if (isChatbotWalkthrough) {
            onWalkthroughComplete?.();
            return;
          }
          setChatbotRecordId(null);
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
    isChatAgentConfigPanelOpen,
    isChatbotWalkthrough,
    isChatContextPanelOpen,
    chatbotRecordId,
    isSuggestionSideSheetOpen,
    onWalkthroughComplete,
    selectedRecordId,
    selectedSuggestionPillar,
    selectedTranscriptMeetingId
  ]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (isResizingDrawerRef.current) {
        const nextWidth = window.innerWidth - event.clientX - 12;

        setDrawerWidth(clampDetailDrawerWidth(nextWidth));
        return;
      }

      if (!isResizingChatRef.current) {
        return;
      }

      const minWidth = 620;
      const maxWidth = Math.min(1120, window.innerWidth - 120);
      const nextWidth = window.innerWidth - event.clientX - 12;

      setChatWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
    }

    function handlePointerUp() {
      if (!isResizingDrawerRef.current && !isResizingChatRef.current) {
        return;
      }

      isResizingDrawerRef.current = false;
      isResizingChatRef.current = false;
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

  function clearGenerationToastTimeouts(toastId: number) {
    const timeoutGroup = generationToastTimeoutsRef.current.get(toastId);

    if (!timeoutGroup) {
      return;
    }

    window.clearTimeout(timeoutGroup.closeTimeoutId);
    if (timeoutGroup.removeTimeoutId !== null) {
      window.clearTimeout(timeoutGroup.removeTimeoutId);
    }
    generationToastTimeoutsRef.current.delete(toastId);
  }

  function removeGenerationToast(toastId: number) {
    clearGenerationToastTimeouts(toastId);
    if (activeGenerationToastIdRef.current === toastId) {
      activeGenerationToastIdRef.current = null;
    }
    setGenerationToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function dismissGenerationToast(toastId: number) {
    const timeoutGroup = generationToastTimeoutsRef.current.get(toastId);

    if (timeoutGroup?.removeTimeoutId !== null) {
      return;
    }

    setGenerationToasts((current) =>
      current.map((toast) =>
        toast.id === toastId
          ? {
              ...toast,
              isClosing: true
            }
          : toast
      )
    );

    const removeTimeoutId = window.setTimeout(() => {
      removeGenerationToast(toastId);
    }, 260);

    if (timeoutGroup) {
      generationToastTimeoutsRef.current.set(toastId, {
        ...timeoutGroup,
        removeTimeoutId
      });
    }
  }

  function clearGenerationToasts() {
    for (const timeoutGroup of generationToastTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutGroup.closeTimeoutId);
      if (timeoutGroup.removeTimeoutId !== null) {
        window.clearTimeout(timeoutGroup.removeTimeoutId);
      }
    }

    generationToastTimeoutsRef.current.clear();
    activeGenerationToastIdRef.current = null;
    setGenerationToasts([]);
  }

  function upsertGenerationToast(
    tone: TrustworthinessFloatingToast["tone"],
    title: string | null,
    message: string
  ) {
    const activeToastId = activeGenerationToastIdRef.current;

    if (activeToastId !== null) {
      clearGenerationToastTimeouts(activeToastId);
      setGenerationToasts((current) =>
        current.map((toast) =>
          toast.id === activeToastId
            ? {
                ...toast,
                isClosing: false,
                message,
                title,
                tone
              }
            : toast
        )
      );

      return activeToastId;
    }

    const toastId = Date.now() + Math.floor(Math.random() * 1000);
    activeGenerationToastIdRef.current = toastId;

    setGenerationToasts((current) => [
      ...current,
      {
        id: toastId,
        isClosing: false,
        message,
        title,
        tone
      }
    ]);

    return toastId;
  }

  function finalizeGenerationToast(
    tone: TrustworthinessFloatingToast["tone"],
    title: string | null,
    message: string,
    durationMs: number
  ) {
    const toastId = upsertGenerationToast(tone, title, message);
    const closeTimeoutId = window.setTimeout(() => {
      dismissGenerationToast(toastId);
    }, durationMs);

    generationToastTimeoutsRef.current.set(toastId, {
      closeTimeoutId,
      removeTimeoutId: null
    });
  }

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
    setFeedbackGenerationError(null);
    setManualSaveErrorMessage(null);
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
    setFeedbackGenerationError(null);
    setManualSaveErrorMessage(null);
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
  const selectedRecordStatus = selectedRecord ? getEditableRatingStatus(getRecordStatus(selectedRecord)) : "Pending";
  const hasDraftFieldChanges =
    selectedRecordIsPending && draftRecord
      ? EDITABLE_DRAFT_TARGETS.some((target) => isTargetDirty(target))
      : false;
  const isStatusDirty = selectedRecord ? statusValue !== selectedRecordStatus : false;
  const hasPendingManualChanges = hasDraftFieldChanges || isStatusDirty;
  const hasSelectedRecordSummary = selectedRecordSummary !== null;
  const chatbotRecordSummary = chatbotRecord ? getRecordSummary(chatbotRecord) : null;
  const hasChatbotRecordSummary = chatbotRecordSummary !== null;
  const chatbotRecordParticipantEmail = chatbotRecordSummary?.evaluatedEmail?.trim().toLowerCase() ?? null;
  const chatbotInitialFeedback = chatbotRecord ? createDraftFromRecord(chatbotRecord).feedback : "";
  const chatbotSuggestion =
    chatbotRecord && twSuggestion?.recordId === chatbotRecord.id ? twSuggestion : null;
  const selectedPeriodCoverage = getSelectedPeriodCoverage(selectedPeriods);
  const detailAiSuggestions = selectedRecord ? buildDetailAiSuggestions(selectedRecord, twSuggestion) : {};
  const selectedPeriodCoverageStart = selectedPeriodCoverage?.start ?? null;
  const selectedPeriodCoverageEnd = selectedPeriodCoverage?.end ?? null;
  const selectedRecordParticipantEmail = selectedRecordSummary?.evaluatedEmail?.trim().toLowerCase() ?? null;
  const chatbotCoachingContextKey =
    chatbotRecordParticipantEmail && selectedPeriodCoverageStart && selectedPeriodCoverageEnd
      ? [
          chatbotRecordParticipantEmail,
          selectedPeriodCoverageStart,
          selectedPeriodCoverageEnd
        ].join("|")
      : null;
  const activeSuggestionCacheMetadata: TwSuggestionCacheMetadata | null =
    selectedRecord && selectedRecordParticipantEmail && selectedPeriodCoverageStart && selectedPeriodCoverageEnd
      ? {
          end: selectedPeriodCoverageEnd,
          evaluatedEmail: selectedRecordParticipantEmail,
          recordId: selectedRecord.id,
          start: selectedPeriodCoverageStart
        }
      : null;
  const activeSuggestionCacheKey = activeSuggestionCacheMetadata
    ? createTwSuggestionCacheKey(activeSuggestionCacheMetadata)
    : null;

  const coachingContextKey =
    selectedRecordParticipantEmail && selectedPeriodCoverageStart && selectedPeriodCoverageEnd
      ? [
          selectedRecordParticipantEmail,
          selectedPeriodCoverageStart,
          selectedPeriodCoverageEnd
        ].join("|")
      : null;
  const activeTranscriptParticipantEmail =
    transcriptParticipantEmail ?? selectedRecordParticipantEmail ?? chatbotRecordParticipantEmail;
  const transcriptRequestKey =
    selectedTranscriptMeetingId &&
    activeTranscriptParticipantEmail &&
    selectedPeriodCoverageStart &&
    selectedPeriodCoverageEnd
      ? [
          selectedTranscriptMeetingId,
          activeTranscriptParticipantEmail,
          selectedPeriodCoverageStart,
          selectedPeriodCoverageEnd
        ].join("|")
      : null;
  const suggestionActionLabel = isSuggestionLoading
    ? "Generando sugerencia TW"
    : "Generar sugerencia TW";
  const firstFilteredRecord = filteredRecords[0] ?? null;
  const firstFilteredRecordId = filteredRecords[0]?.id ?? null;
  const pendingStatus = availableStatuses.find(
    (status) => normalizeStatusValue(status) === normalizeStatusValue(DEFAULT_STATUS_FILTERS[0])
  );
  const doneStatus = availableStatuses.find(
    (status) => normalizeStatusValue(status) === normalizeStatusValue(FALLBACK_COMPLETED_STATUS)
  );
  const autoSelectedStatus = pendingStatus ?? doneStatus ?? null;
  const autoSelectedStatusKey = autoSelectedStatus ? normalizeStatusValue(autoSelectedStatus) : "";

  useEffect(() => {
    if (!isChatbotWalkthrough) {
      const snapshot = chatbotWalkthroughSnapshotRef.current;

      if (!snapshot) {
        return;
      }

      suggestionGenerationRequestIdRef.current += 1;
      chatbotWalkthroughSnapshotRef.current = null;
      chatbotWalkthroughHasOpenedRef.current = false;
      lastChatbotCoachingContextKeyRef.current = null;
      clearGenerationToasts();
      setTwGenerationProgress(createIdleTwGenerationProgress());
      setSuggestionError(null);
      setIsSuggestionLoading(false);
      setIsChatbotCoachingContextLoading(snapshot.isChatbotCoachingContextLoading);
      setChatbotCoachingContextError(snapshot.chatbotCoachingContextError);
      setChatbotCoachingContextResponse(snapshot.chatbotCoachingContextResponse);
      setChatbotRecordId(snapshot.chatbotRecordId);
      setIsChatAgentConfigPanelOpen(snapshot.isChatAgentConfigPanelOpen);
      setIsChatContextPanelOpen(snapshot.isChatContextPanelOpen);
      setSelectedSuggestionPillar(snapshot.selectedSuggestionPillar);
      setIsSuggestionSideSheetOpen(snapshot.isSuggestionSideSheetOpen);
      setIsTranscriptLoading(snapshot.isTranscriptLoading);
      setSelectedTranscriptMeetingId(snapshot.selectedTranscriptMeetingId);
      setTranscriptError(snapshot.transcriptError);
      setTranscriptParticipantEmail(snapshot.transcriptParticipantEmail);
      setTranscriptResponse(snapshot.transcriptResponse);
      lastChatbotCoachingContextKeyRef.current = snapshot.chatbotCoachingContextKey;
      lastTranscriptKeyRef.current = snapshot.transcriptRequestKey;
      setSelectedRecordId(snapshot.selectedRecordId);
      return;
    }

    if (!chatbotWalkthroughSnapshotRef.current) {
      chatbotWalkthroughSnapshotRef.current = {
        chatbotCoachingContextError,
        chatbotCoachingContextKey,
        chatbotCoachingContextResponse,
        chatbotRecordId,
        isChatAgentConfigPanelOpen,
        isChatbotCoachingContextLoading,
        isChatContextPanelOpen,
        isTranscriptLoading,
        isSuggestionSideSheetOpen,
        selectedRecordId,
        selectedSuggestionPillar,
        selectedTranscriptMeetingId,
        transcriptError,
        transcriptParticipantEmail,
        transcriptRequestKey,
        transcriptResponse
      };
    }
  }, [
    chatbotCoachingContextError,
    chatbotCoachingContextKey,
    chatbotCoachingContextResponse,
    chatbotRecordId,
    isChatAgentConfigPanelOpen,
    isChatbotCoachingContextLoading,
    isChatContextPanelOpen,
    isChatbotWalkthrough,
    isTranscriptLoading,
    isSuggestionSideSheetOpen,
    selectedRecordId,
    selectedSuggestionPillar,
    selectedTranscriptMeetingId,
    transcriptError,
    transcriptRequestKey,
    transcriptResponse,
    transcriptParticipantEmail
  ]);

  useEffect(() => {
    if (!isChatbotWalkthrough) {
      return;
    }

    if (firstFilteredRecord) {
      return;
    }

    onWalkthroughAbort?.(
      "No hay una evaluación disponible para demostrar el WT Chatbot con los filtros actuales."
    );
  }, [firstFilteredRecord, isChatbotWalkthrough, onWalkthroughAbort]);

  useEffect(() => {
    if (!isChatbotWalkthrough || !walkthroughStepId || walkthroughStepId === "chatbot-entry") {
      return;
    }

    if (!firstFilteredRecord || chatbotWalkthroughHasOpenedRef.current) {
      return;
    }

    chatbotWalkthroughHasOpenedRef.current = true;
    openChatbot(firstFilteredRecord);
  }, [firstFilteredRecord, isChatbotWalkthrough, walkthroughStepId]);

  useEffect(() => {
    if (!isChatbotWalkthrough || !chatbotWalkthroughHasOpenedRef.current) {
      return;
    }

    if (isSuggestionLoading || isChatbotCoachingContextLoading) {
      return;
    }

    if (suggestionError) {
      onWalkthroughAbort?.(`WT Chatbot no pudo continuar: ${suggestionError}`);
      return;
    }

    if (chatbotCoachingContextError) {
      onWalkthroughAbort?.(`WT Chatbot no pudo continuar: ${chatbotCoachingContextError}`);
    }
  }, [
    chatbotCoachingContextError,
    isChatbotCoachingContextLoading,
    isChatbotWalkthrough,
    isSuggestionLoading,
    onWalkthroughAbort,
    suggestionError
  ]);

  useEffect(() => {
    if (!isChatbotWalkthrough) {
      return;
    }

    if (walkthroughStepId === "chatbot-context-panel" || walkthroughStepId === "chatbot-context-meetings") {
      if (!isChatContextPanelOpen) {
        setIsChatContextPanelOpen(true);
      }
      if (isChatAgentConfigPanelOpen) {
        setIsChatAgentConfigPanelOpen(false);
      }
      if (selectedTranscriptMeetingId !== null) {
        setSelectedTranscriptMeetingId(null);
      }
      return;
    }

    if (walkthroughStepId === "chatbot-agent-panel") {
      if (!isChatAgentConfigPanelOpen) {
        setIsChatAgentConfigPanelOpen(true);
      }
      if (isChatContextPanelOpen) {
        setIsChatContextPanelOpen(false);
      }
      if (selectedTranscriptMeetingId !== null) {
        setSelectedTranscriptMeetingId(null);
      }
      return;
    }

    if (isChatAgentConfigPanelOpen) {
      setIsChatAgentConfigPanelOpen(false);
    }
    if (isChatContextPanelOpen) {
      setIsChatContextPanelOpen(false);
    }
    if (selectedTranscriptMeetingId !== null) {
      setSelectedTranscriptMeetingId(null);
    }
  }, [
    isChatAgentConfigPanelOpen,
    isChatContextPanelOpen,
    isChatbotWalkthrough,
    selectedTranscriptMeetingId,
    walkthroughStepId
  ]);

  async function handleGenerateFeedback() {
    if (!selectedRecord || !selectedRecordSummary || !selectedRecordIsPending) {
      return;
    }

    const activeDraft = draftRecord ?? createDraftFromRecord(selectedRecord);
    const reliabilityPoints = activeDraft.reliabilityPoints;
    const intimacyPoints = activeDraft.intimacyPoints;
    const groupThinkingPoints = activeDraft.groupThinkingPoints;
    const credibilityPoints = activeDraft.credibilityPoints;

    if (
      typeof reliabilityPoints !== "number" ||
      typeof intimacyPoints !== "number" ||
      typeof groupThinkingPoints !== "number" ||
      typeof credibilityPoints !== "number"
    ) {
      setFeedbackGenerationError("Define los cuatro puntajes antes de generar feedback con IA.");
      return;
    }

    const pillars = {
      credibility: {
        aiSuggestion: detailAiSuggestions.credibilityPoints,
        meaning: getEditablePillarMeaning("credibility", credibilityPoints),
        points: credibilityPoints
      },
      groupThinking: {
        aiSuggestion: detailAiSuggestions.groupThinkingPoints,
        meaning: getEditablePillarMeaning("groupThinking", groupThinkingPoints),
        points: groupThinkingPoints
      },
      intimacy: {
        aiSuggestion: detailAiSuggestions.intimacyPoints,
        meaning: getEditablePillarMeaning("intimacy", intimacyPoints),
        points: intimacyPoints
      },
      reliability: {
        aiSuggestion: detailAiSuggestions.reliabilityPoints,
        meaning: getEditablePillarMeaning("reliability", reliabilityPoints),
        points: reliabilityPoints
      }
    };

    setIsFeedbackGenerating(true);
    setFeedbackGenerationError(null);

    try {
      const response = await fetch(
        `/api/trustworthiness/${encodeURIComponent(selectedRecord.id)}/feedback-suggestion`,
        {
          body: JSON.stringify({
            evaluatedName: selectedRecordSummary.evaluatedName,
            existingFeedback: activeDraft.feedback.trim().length > 0 ? activeDraft.feedback : null,
            pillars,
            projectContext: selectedRecordSummary.context,
            roleLabel: selectedRecordSummary.roleLabel
          }),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        }
      );
      const parsedPayload = (await response.json()) as { feedback?: string; message?: string; ok?: boolean };

      if (!response.ok || !parsedPayload.ok || typeof parsedPayload.feedback !== "string") {
        throw new Error(parsedPayload.message ?? "No fue posible generar el feedback con IA.");
      }

      const generatedFeedback = parsedPayload.feedback;

      setDraftRecord((current) =>
        current
          ? {
              ...current,
              feedback: generatedFeedback
            }
          : current
      );
      setSuggestionNotification({
        id: Date.now(),
        message: "Feedback generado con IA. Revísalo antes de guardar."
      });
    } catch (feedbackErrorValue) {
      setFeedbackGenerationError(
        feedbackErrorValue instanceof Error
          ? feedbackErrorValue.message
          : "No fue posible generar el feedback con IA."
      );
    } finally {
      setIsFeedbackGenerating(false);
    }
  }

  const selectedRecordGroups = selectedRecord
    ? buildDetailGroups(selectedRecord, {
        aiSuggestions: detailAiSuggestions,
        draft: draftRecord,
        editable: selectedRecordIsPending,
        feedbackGenerationError,
        isDirty: isTargetDirty,
        isGeneratingFeedback: isFeedbackGenerating,
        onDiscard: handleDiscardTarget,
        onFeedbackChange: handleDraftFeedbackChange,
        onGenerateFeedback: () => {
          void handleGenerateFeedback();
        },
        onPointsChange: handleDraftPointsChange
      })
    : [];

  useEffect(() => {
    if (!activeSuggestionCacheMetadata) {
      setSuggestionCacheNotice((current) => (current === null ? current : null));
      return;
    }

    clearExpiredSuggestionCache();
    const cachedSuggestion = readCachedTwSuggestion(activeSuggestionCacheMetadata);

    if (!cachedSuggestion) {
      setTwSuggestion((current) => (current === null ? current : null));
      setSuggestionDraftPoints((current) => (current === null ? current : null));
      setAppliedSuggestionPoints((current) =>
        isEmptyAppliedSuggestionPoints(current) ? current : {}
      );
      setSuggestionCacheNotice((current) => (current === null ? current : null));
      setSuggestionNotification((current) => (current === null ? current : null));
      setSuggestionError((current) => (current === null ? current : null));
      setIsSuggestionSideSheetOpen((current) => (current ? false : current));
      setSelectedSuggestionPillar((current) => (current === null ? current : null));
      setTwGenerationProgress((current) =>
        isIdleTwGenerationProgress(current) ? current : createIdleTwGenerationProgress()
      );
      return;
    }

    setTwSuggestion((current) =>
      current === cachedSuggestion.suggestion ? current : cachedSuggestion.suggestion
    );
    setSuggestionDraftPoints((current) =>
      areSuggestionDraftPointsEqual(current, cachedSuggestion.draftPoints)
        ? current
        : cachedSuggestion.draftPoints
    );
    setAppliedSuggestionPoints((current) =>
      areAppliedSuggestionPointsEqual(current, cachedSuggestion.appliedPoints)
        ? current
        : cachedSuggestion.appliedPoints
    );
    setSuggestionCacheNotice((current) =>
      current?.cachedAt === cachedSuggestion.cachedAt
        ? current
        : { cachedAt: cachedSuggestion.cachedAt }
    );
    setSuggestionError((current) => (current === null ? current : null));
    setSelectedSuggestionPillar((current) => (current === null ? current : null));
    setTwGenerationProgress((current) =>
      isIdleTwGenerationProgress(current) ? current : createIdleTwGenerationProgress()
    );
  }, [activeSuggestionCacheKey]);

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

    if (selectedRecordId || !firstFilteredRecordId) {
      return;
    }

    walkthroughPreviousSelectedRecordIdRef.current = selectedRecordId;
    walkthroughAutoSelectedRecordIdRef.current = firstFilteredRecordId;
    setSelectedRecordId(firstFilteredRecordId);
  }, [firstFilteredRecordId, isWalkthroughOpen, selectedRecordId, walkthroughStepId]);

  useEffect(() => {
    if (hasManualStatusSelection) {
      return;
    }

    if (allRecords.length === 0) {
      return;
    }

    if (!autoSelectedStatus) {
      return;
    }

    if (selectedStatusKey === autoSelectedStatusKey && selectedStatuses.length === 1) {
      return;
    }

    setSelectedStatuses((current) => {
      const currentKey = current.map((status) => normalizeStatusValue(status)).join("|");

      if (currentKey === autoSelectedStatusKey && current.length === 1) {
        return current;
      }

      return [autoSelectedStatus];
    });
  }, [
    allRecords.length,
    autoSelectedStatus,
    autoSelectedStatusKey,
    availableStatusKey,
    hasManualStatusSelection,
    selectedStatusKey,
    selectedStatuses.length
  ]);

  useEffect(() => {
    if (!hasSelectedRecordSummary) {
      lastCoachingContextKeyRef.current = null;
      setCoachingContextResponse((current) => (current === null ? current : null));
      setCoachingContextError((current) => (current === null ? current : null));
      setIsCoachingContextLoading((current) => (current ? false : current));
      return;
    }

    if (!selectedRecordParticipantEmail) {
      lastCoachingContextKeyRef.current = null;
      setCoachingContextResponse((current) => (current === null ? current : null));
      setCoachingContextError((current) =>
        current === "Esta evaluación no tiene email del talento para cruzar reuniones."
          ? current
          : "Esta evaluación no tiene email del talento para cruzar reuniones."
      );
      setIsCoachingContextLoading((current) => (current ? false : current));
      return;
    }

    if (!selectedPeriodCoverageStart || !selectedPeriodCoverageEnd) {
      lastCoachingContextKeyRef.current = null;
      setCoachingContextResponse((current) => (current === null ? current : null));
      setCoachingContextError((current) =>
        current === "No hay un rango total de periodos disponible para filtrar reuniones."
          ? current
          : "No hay un rango total de periodos disponible para filtrar reuniones."
      );
      setIsCoachingContextLoading((current) => (current ? false : current));
      return;
    }

    if (coachingContextKey && lastCoachingContextKeyRef.current === coachingContextKey) {
      return;
    }

    const coachingParticipantEmail = selectedRecordParticipantEmail;
    const coachingPeriodCoverageStart = selectedPeriodCoverageStart;
    const coachingPeriodCoverageEnd = selectedPeriodCoverageEnd;
    lastCoachingContextKeyRef.current = coachingContextKey;

    let isActive = true;

    async function loadCoachingContext() {
      setIsCoachingContextLoading(true);
      setCoachingContextError(null);
      setCoachingContextResponse(null);

      try {
        const url = new URL("/api/trustworthiness/coaching-context", window.location.origin);
        url.searchParams.set("start", coachingPeriodCoverageStart);
        url.searchParams.set("end", coachingPeriodCoverageEnd);
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
    coachingContextKey,
    hasSelectedRecordSummary,
    selectedPeriodCoverageEnd,
    selectedPeriodCoverageStart,
    selectedRecordParticipantEmail
  ]);

  useEffect(() => {
    if (!hasChatbotRecordSummary) {
      lastChatbotCoachingContextKeyRef.current = null;
      setChatbotCoachingContextResponse((current) => (current === null ? current : null));
      setChatbotCoachingContextError((current) => (current === null ? current : null));
      setIsChatbotCoachingContextLoading((current) => (current ? false : current));
      return;
    }

    if (!chatbotRecordParticipantEmail) {
      lastChatbotCoachingContextKeyRef.current = null;
      setChatbotCoachingContextResponse((current) => (current === null ? current : null));
      setChatbotCoachingContextError((current) =>
        current === "Esta evaluación no tiene email del talento para cruzar reuniones."
          ? current
          : "Esta evaluación no tiene email del talento para cruzar reuniones."
      );
      setIsChatbotCoachingContextLoading((current) => (current ? false : current));
      return;
    }

    if (!selectedPeriodCoverageStart || !selectedPeriodCoverageEnd) {
      lastChatbotCoachingContextKeyRef.current = null;
      setChatbotCoachingContextResponse((current) => (current === null ? current : null));
      setChatbotCoachingContextError((current) =>
        current === "No hay un rango total de periodos disponible para filtrar reuniones."
          ? current
          : "No hay un rango total de periodos disponible para filtrar reuniones."
      );
      setIsChatbotCoachingContextLoading((current) => (current ? false : current));
      return;
    }

    if (isChatbotWalkthrough) {
      setChatbotCoachingContextError((current) => (current === null ? current : null));
      setIsChatbotCoachingContextLoading((current) => (current ? false : current));
      return;
    }

    if (
      chatbotCoachingContextKey &&
      lastChatbotCoachingContextKeyRef.current === chatbotCoachingContextKey
    ) {
      return;
    }

    const coachingParticipantEmail = chatbotRecordParticipantEmail;
    const coachingPeriodCoverageStart = selectedPeriodCoverageStart;
    const coachingPeriodCoverageEnd = selectedPeriodCoverageEnd;
    lastChatbotCoachingContextKeyRef.current = chatbotCoachingContextKey;

    let isActive = true;

    async function loadChatbotCoachingContext() {
      setIsChatbotCoachingContextLoading(true);
      setChatbotCoachingContextError(null);
      setChatbotCoachingContextResponse(null);

      try {
        const url = new URL("/api/trustworthiness/coaching-context", window.location.origin);
        url.searchParams.set("start", coachingPeriodCoverageStart);
        url.searchParams.set("end", coachingPeriodCoverageEnd);
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
          setChatbotCoachingContextResponse(payload as CoachingContextResponse);
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setChatbotCoachingContextResponse(null);
        setChatbotCoachingContextError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible consultar las reuniones del talento."
        );
      } finally {
        if (isActive) {
          setIsChatbotCoachingContextLoading(false);
        }
      }
    }

    void loadChatbotCoachingContext();

    return () => {
      isActive = false;
    };
  }, [
    chatbotCoachingContextKey,
    chatbotRecordParticipantEmail,
    hasChatbotRecordSummary,
    isChatbotWalkthrough,
    selectedPeriodCoverageEnd,
    selectedPeriodCoverageStart
  ]);

  useEffect(() => {
    if (!selectedTranscriptMeetingId) {
      lastTranscriptKeyRef.current = null;
      setTranscriptParticipantEmail((current) => (current === null ? current : null));
      setTranscriptResponse((current) => (current === null ? current : null));
      setTranscriptError((current) => (current === null ? current : null));
      setIsTranscriptLoading((current) => (current ? false : current));
      return;
    }

    if (!activeTranscriptParticipantEmail || !selectedPeriodCoverageStart || !selectedPeriodCoverageEnd) {
      lastTranscriptKeyRef.current = null;
      setTranscriptResponse((current) => (current === null ? current : null));
      setTranscriptError((current) =>
        current === "No hay contexto suficiente para consultar el transcript."
          ? current
          : "No hay contexto suficiente para consultar el transcript."
      );
      setIsTranscriptLoading((current) => (current ? false : current));
      return;
    }

    if (isChatbotWalkthrough) {
      if (transcriptRequestKey && lastTranscriptKeyRef.current === transcriptRequestKey) {
        return;
      }

      lastTranscriptKeyRef.current = transcriptRequestKey;
      setIsTranscriptLoading(false);
      setTranscriptError(null);
      setTranscriptResponse(
        createWalkthroughDemoTranscript({
          coachingContextResponse: chatbotCoachingContextResponse,
          meetingId: selectedTranscriptMeetingId
        })
      );
      return;
    }

    if (transcriptRequestKey && lastTranscriptKeyRef.current === transcriptRequestKey) {
      return;
    }

    const transcriptMeetingId = selectedTranscriptMeetingId;
    const transcriptPeriodCoverageStart = selectedPeriodCoverageStart;
    const transcriptPeriodCoverageEnd = selectedPeriodCoverageEnd;
    const meetingParticipantEmail = activeTranscriptParticipantEmail;
    lastTranscriptKeyRef.current = transcriptRequestKey;
    let isActive = true;

    async function loadTranscript() {
      setIsTranscriptLoading(true);
      setTranscriptError(null);

      try {
        const url = new URL(
          `/api/trustworthiness/coaching-context/${encodeURIComponent(transcriptMeetingId)}/transcript`,
          window.location.origin
        );
        url.searchParams.set("start", transcriptPeriodCoverageStart);
        url.searchParams.set("end", transcriptPeriodCoverageEnd);
        url.searchParams.set("participantEmail", meetingParticipantEmail);

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
    activeTranscriptParticipantEmail,
    chatbotCoachingContextResponse,
    chatbotRecordParticipantEmail,
    isChatbotWalkthrough,
    transcriptRequestKey,
    selectedPeriodCoverageEnd,
    selectedPeriodCoverageStart,
    selectedRecordParticipantEmail,
    selectedTranscriptMeetingId
  ]);

  function handleStatusChange(nextStatus: TrustworthinessRatingStatus) {
    setStatusValue(nextStatus);
    setManualSaveErrorMessage(null);
  }

  function openManualSaveConfirmation() {
    if (!selectedRecord || !hasPendingManualChanges) {
      return;
    }

    setManualSaveErrorMessage(null);
    setIsManualSaveConfirmationOpen(true);
  }

  function closeManualSaveConfirmation() {
    if (isManualSaving) {
      return;
    }

    setIsManualSaveConfirmationOpen(false);
  }

  function discardManualChanges() {
    if (!selectedRecord || isManualSaving) {
      return;
    }

    setDraftRecord(selectedRecordIsPending ? createDraftFromRecord(selectedRecord) : null);
    setStatusValue(getEditableRatingStatus(getRecordStatus(selectedRecord)));
    setFeedbackGenerationError(null);
    setManualSaveErrorMessage(null);
    setManualSavingStatus(null);
    setIsManualSaveConfirmationOpen(false);
  }

  async function handleManualSave(nextStatus: TrustworthinessRatingStatus) {
    if (!selectedRecord || isManualSaving) {
      return;
    }

    const currentStatus = getEditableRatingStatus(getRecordStatus(selectedRecord));
    const hasContentChanges = selectedRecordIsPending && draftRecord
      ? EDITABLE_DRAFT_TARGETS.some((target) => isTargetDirty(target))
      : false;

    if (!hasContentChanges && nextStatus === currentStatus) {
      setIsManualSaveConfirmationOpen(false);
      return;
    }

    const payload = hasContentChanges
      ? {
          credibilityPoints: draftRecord?.credibilityPoints ?? null,
          feedback: draftRecord?.feedback ?? "",
          groupThinkingPoints: draftRecord?.groupThinkingPoints ?? null,
          intimacyPoints: draftRecord?.intimacyPoints ?? null,
          ratingStatus: nextStatus,
          reliabilityPoints: draftRecord?.reliabilityPoints ?? null,
          ...EDITABLE_SCORE_FIELDS.reduce<Record<string, string | null>>((accumulator, field) => {
            const suggestion = detailAiSuggestions[field];

            if (suggestion) {
              accumulator[getAiJsonPayloadField(field)] = serializePillarSuggestion(suggestion);
            }

            return accumulator;
          }, {})
        }
      : {
          ratingStatus: nextStatus
        };

    setIsManualSaving(true);
    setManualSavingStatus(nextStatus);
    setManualSaveErrorMessage(null);

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
      setSuggestionNotification({
        id: Date.now(),
        message: getManualSaveToastMessage(nextStatus)
      });
      setIsManualSaveConfirmationOpen(false);
    } catch (saveRecordError) {
      setManualSaveErrorMessage(
        saveRecordError instanceof Error
          ? saveRecordError.message
          : "No fue posible guardar la evaluación."
      );
    } finally {
      setIsManualSaving(false);
      setManualSavingStatus(null);
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
    if (target === "feedback") {
      setFeedbackGenerationError(null);
    }
    setManualSaveErrorMessage(null);
  }

  function openChatbot(record: TrustworthinessRecord) {
    detailShellRef.current?.scrollTo({
      behavior: "smooth",
      top: 0
    });
    isClosingDetailForChatRef.current = true;
    setSelectedRecordId(null);
    setIsChatAgentConfigPanelOpen(false);
    setIsChatContextPanelOpen(false);
    void generateTwSuggestion({
      openChatOnSuccess: true,
      record
    });
  }

  function closeChatbot() {
    setIsChatAgentConfigPanelOpen(false);
    setIsChatContextPanelOpen(false);
    setChatbotRecordId(null);
  }

  function handleChatbotSavedRecord(record: TrustworthinessRecord) {
    setResponsePayload((current) =>
      current
        ? {
            ...current,
            records: current.records.map((currentRecord) =>
              currentRecord.id === record.id ? record : currentRecord
            )
          }
        : current
    );

    setDraftRecord((current) => {
      if (!current || selectedRecordId !== record.id) {
        return current;
      }

      return createDraftFromRecord(record);
    });
  }

  async function loadChatbotCoachingContextForTarget(input: {
    end: string;
    participantEmail: string;
    requestId: number;
    start: string;
  }) {
    const contextKey = [
      input.participantEmail,
      input.start,
      input.end
    ].join("|");

    lastChatbotCoachingContextKeyRef.current = contextKey;
    setIsChatbotCoachingContextLoading(true);
    setChatbotCoachingContextError(null);
    setChatbotCoachingContextResponse(null);

    try {
      const url = new URL("/api/trustworthiness/coaching-context", window.location.origin);
      url.searchParams.set("start", input.start);
      url.searchParams.set("end", input.end);
      url.searchParams.set("participantEmail", input.participantEmail);

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

      if (suggestionGenerationRequestIdRef.current !== input.requestId) {
        return null;
      }

      setChatbotCoachingContextResponse(payload as CoachingContextResponse);
      return payload as CoachingContextResponse;
    } catch (loadError) {
      if (suggestionGenerationRequestIdRef.current !== input.requestId) {
        return null;
      }

      const message =
        loadError instanceof Error
          ? loadError.message
          : "No fue posible consultar las reuniones del talento.";

      setChatbotCoachingContextResponse(null);
      setChatbotCoachingContextError(message);
      throw new Error(message);
    } finally {
      if (suggestionGenerationRequestIdRef.current === input.requestId) {
        setIsChatbotCoachingContextLoading(false);
      }
    }
  }

  async function generateTwSuggestion(options?: {
    openChatOnSuccess?: boolean;
    record?: TrustworthinessRecord;
  }) {
    const targetRecord = options?.record ?? selectedRecord;
    const targetRecordSummary = targetRecord ? getRecordSummary(targetRecord) : null;
    const isWalkthroughDemoGeneration = isChatbotWalkthrough && options?.openChatOnSuccess;
    const targetParticipantEmail =
      targetRecordSummary?.evaluatedEmail?.trim().toLowerCase() ??
      (isWalkthroughDemoGeneration && targetRecord
        ? `demo-${targetRecord.id.toLowerCase()}@singularagency.co`
        : null);
    const targetPeriodCoverage = selectedPeriodCoverage;

    if (!targetRecord || !targetRecordSummary || !targetParticipantEmail || !targetPeriodCoverage) {
      const message = "No hay contexto suficiente para generar la sugerencia TW.";
      setSuggestionError(message);
      setTwGenerationProgress({
        completedStages: [],
        currentStage: null,
        errorMessage: message,
        errorStage: "validating_evaluation_data",
        status: "error"
      });
      finalizeGenerationToast(
        "error",
        "Proceso detenido",
        message,
        3600
      );
      return;
    }

    const requestId = suggestionGenerationRequestIdRef.current + 1;
    suggestionGenerationRequestIdRef.current = requestId;
    let latestStage: TwGenerationStage = "validating_evaluation_data";
    const suggestionCacheMetadata: TwSuggestionCacheMetadata = {
      end: targetPeriodCoverage.end,
      evaluatedEmail: targetParticipantEmail,
      recordId: targetRecord.id,
      start: targetPeriodCoverage.start
    };

    clearGenerationToasts();
    setIsSuggestionLoading(true);
    setSuggestionError(null);
    setTwSuggestion(null);
    setSuggestionDraftPoints(null);
    setAppliedSuggestionPoints({});
    setSuggestionCacheNotice(null);
    setSelectedSuggestionPillar(null);
    setIsSuggestionSideSheetOpen(false);
    if (options?.openChatOnSuccess) {
      lastChatbotCoachingContextKeyRef.current = null;
      setChatbotCoachingContextResponse(null);
      setChatbotCoachingContextError(null);
      setIsChatbotCoachingContextLoading(false);
      setChatbotRecordId(null);
    }
    setTwGenerationProgress(createRunningTwGenerationProgress());
    upsertGenerationToast(
      "progress",
      "Generando sugerencia TW",
      getGenerationStageToastMessage("validating_evaluation_data")
    );

    const applyStage = (stage: TwGenerationStage) => {
      latestStage = stage;

      if (suggestionGenerationRequestIdRef.current !== requestId) {
        return;
      }

      setTwGenerationProgress({
        completedStages: getGenerationCompletedStages(stage),
        currentStage: stage,
        errorMessage: null,
        errorStage: null,
        status: "running"
      });
      upsertGenerationToast(
        "progress",
        "Generando sugerencia TW",
        getGenerationStageToastMessage(stage)
      );
    };

    const applyError = (message: string, stage: TwGenerationStage | null) => {
      if (suggestionGenerationRequestIdRef.current !== requestId) {
        return;
      }

      const errorStage = stage ?? "validating_evaluation_data";
      setTwSuggestion(null);
      setSuggestionError(message);
      setTwGenerationProgress({
        completedStages: getGenerationCompletedStages(errorStage),
        currentStage: errorStage,
        errorMessage: message,
        errorStage,
        status: "error"
      });
      finalizeGenerationToast(
        "error",
        "Proceso detenido",
        message,
        4200
      );
    };

    const applySuccess = async (
      suggestion: TwSuggestionResponse,
      successOptions?: {
        demoContextResponse?: CoachingContextResponse;
        successMessage?: string;
        successTitle?: string;
      }
    ) => {
      if (suggestionGenerationRequestIdRef.current !== requestId) {
        return;
      }

      const nextDraftPoints = createSuggestionDraftPointsFromSuggestion(suggestion);
      writeCachedTwSuggestion({
        appliedPoints: {},
        draftPoints: nextDraftPoints,
        metadata: suggestionCacheMetadata,
        suggestion
      });
      setSuggestionDraftPoints(nextDraftPoints);
      setAppliedSuggestionPoints({});
      setTwSuggestion(suggestion);
      setSelectedSuggestionPillar(null);
      setTwGenerationProgress({
        completedStages: TW_GENERATION_STEPS.map((step) => step.id),
        currentStage: null,
        errorMessage: null,
        errorStage: null,
        status: "success"
      });
      if (options?.openChatOnSuccess) {
        if (successOptions?.demoContextResponse) {
          setChatbotCoachingContextError(null);
          setIsChatbotCoachingContextLoading(false);
          setChatbotCoachingContextResponse(successOptions.demoContextResponse);
        } else {
          upsertGenerationToast(
            "progress",
            "Preparando chat TW",
            "Cargando reuniones para el contexto del chat."
          );

          try {
            await loadChatbotCoachingContextForTarget({
              end: targetPeriodCoverage.end,
              participantEmail: targetParticipantEmail,
              requestId,
              start: targetPeriodCoverage.start
            });
          } catch (loadContextError) {
            applyError(
              loadContextError instanceof Error
                ? loadContextError.message
                : "No fue posible cargar las reuniones para el contexto del chat.",
              latestStage
            );
            return;
          }
        }

        if (suggestionGenerationRequestIdRef.current !== requestId) {
          return;
        }

        finalizeGenerationToast(
          "success",
          successOptions?.successTitle ?? "Chat listo",
          successOptions?.successMessage ??
            "El chat ya tiene la sugerencia TW y las reuniones como contexto.",
          2800
        );
        setIsSuggestionSideSheetOpen(false);
        setChatbotRecordId(targetRecord.id);
        return;
      }

      finalizeGenerationToast(
        "success",
        "Sugerencia lista",
        "La sugerencia TW ya está lista para revisión.",
        2800
      );
      setIsSuggestionSideSheetOpen(true);
    };

    if (isWalkthroughDemoGeneration) {
      const walkthroughDemoContext = createWalkthroughDemoContext({
        coverage: targetPeriodCoverage,
        record: targetRecord,
        recordSummary: {
          avatarUrl: targetRecordSummary.avatarUrl,
          context: targetRecordSummary.context,
          evaluatedEmail: targetRecordSummary.evaluatedEmail,
          evaluatedName: targetRecordSummary.evaluatedName,
          roleLabel: targetRecordSummary.roleLabel
        }
      });
      const walkthroughDemoSuggestion = createWalkthroughDemoSuggestion({
        coachingContextResponse: walkthroughDemoContext,
        record: targetRecord,
        recordSummary: {
          context: targetRecordSummary.context,
          evaluatedName: targetRecordSummary.evaluatedName
        }
      });

      await applySuccess(walkthroughDemoSuggestion, {
        demoContextResponse: walkthroughDemoContext,
        successMessage: "El chat demo ya está listo con una sugerencia TW y reuniones simuladas.",
        successTitle: "WT Chatbot listo"
      });
      setIsSuggestionLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/trustworthiness/${encodeURIComponent(targetRecord.id)}/suggestion/stream`,
        {
          body: JSON.stringify({
            end: targetPeriodCoverage.end,
            participantEmail: targetParticipantEmail,
            start: targetPeriodCoverage.start
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        }
      );

      if (!response.ok || !response.body) {
        let message = "No fue posible iniciar la generación de sugerencia TW.";

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) {
            message = payload.message;
          }
        } catch {
          message = "No fue posible iniciar la generación de sugerencia TW.";
        }

        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedTerminalEvent = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (trimmedLine.length === 0) {
            continue;
          }

          const parsedEvent = JSON.parse(trimmedLine) as unknown;

          if (!isTwSuggestionStreamEvent(parsedEvent)) {
            continue;
          }

          if (parsedEvent.type === "stage") {
            applyStage(parsedEvent.stage);
            continue;
          }

          if (parsedEvent.type === "error") {
            receivedTerminalEvent = true;
            applyError(parsedEvent.message, parsedEvent.stage);
            continue;
          }

          receivedTerminalEvent = true;
          await applySuccess(parsedEvent.data);
        }
      }

      const trailingLine = buffer.trim();

      if (trailingLine.length > 0) {
        const parsedEvent = JSON.parse(trailingLine) as unknown;

        if (isTwSuggestionStreamEvent(parsedEvent)) {
          if (parsedEvent.type === "stage") {
            applyStage(parsedEvent.stage);
          } else if (parsedEvent.type === "error") {
            receivedTerminalEvent = true;
            applyError(parsedEvent.message, parsedEvent.stage);
          } else {
            receivedTerminalEvent = true;
            await applySuccess(parsedEvent.data);
          }
        }
      }

      if (!receivedTerminalEvent) {
        throw new Error("El backend cerró el stream sin devolver una sugerencia TW.");
      }
    } catch (suggestionErrorValue) {
      applyError(
        suggestionErrorValue instanceof Error
          ? suggestionErrorValue.message
          : "No fue posible generar la sugerencia TW.",
        latestStage
      );
    } finally {
      if (suggestionGenerationRequestIdRef.current === requestId) {
        setIsSuggestionLoading(false);
      }
    }
  }

  function startSuggestionGeneration() {
    detailShellRef.current?.scrollTo({
      behavior: "smooth",
      top: 0
    });
    void generateTwSuggestion();
  }

  function handleSuggestionPointChange(pillar: SuggestionPillarKey, value: number) {
    if (!twSuggestion) {
      return;
    }

    const nextDraftPoints = {
      ...(suggestionDraftPoints ?? createSuggestionDraftPointsFromSuggestion(twSuggestion)),
      [pillar]: value
    };
    const nextAppliedPoints = { ...appliedSuggestionPoints };
    delete nextAppliedPoints[pillar];

    setAppliedSuggestionPoints(nextAppliedPoints);
    setSuggestionDraftPoints(nextDraftPoints);

    if (activeSuggestionCacheMetadata) {
      writeCachedTwSuggestion({
        appliedPoints: nextAppliedPoints,
        draftPoints: nextDraftPoints,
        metadata: activeSuggestionCacheMetadata,
        preserveCacheTimestamp: true,
        suggestion: twSuggestion
      });
    }
  }

  function applySuggestionPillar(pillar: SuggestionPillarKey) {
    if (!selectedRecordIsPending || !twSuggestion) {
      return;
    }

    const draftField = getPillarDraftField(pillar);
    const currentDraftPoints = suggestionDraftPoints ?? createSuggestionDraftPointsFromSuggestion(twSuggestion);
    const points = currentDraftPoints[pillar];
    const pillarLabel = getPillarLabel(pillar);
    const nextAppliedPoints = {
      ...appliedSuggestionPoints,
      [pillar]: points
    };

    setDraftRecord((current) =>
      current
        ? {
            ...current,
            [draftField]: points
          }
        : current
    );
    setAppliedSuggestionPoints(nextAppliedPoints);
    if (activeSuggestionCacheMetadata) {
      writeCachedTwSuggestion({
        appliedPoints: nextAppliedPoints,
        draftPoints: currentDraftPoints,
        metadata: activeSuggestionCacheMetadata,
        preserveCacheTimestamp: true,
        suggestion: twSuggestion
      });
    }
    setSuggestionNotification({
      id: Date.now(),
      message: `${pillarLabel} aplicado al detalle.`
    });
  }

  function applyAllSuggestionPillars() {
    if (!selectedRecordIsPending || !twSuggestion) {
      return;
    }

    const nextPoints = suggestionDraftPoints ?? {
      credibility: twSuggestion.pillars.credibility.points,
      groupThinking: twSuggestion.pillars.groupThinking.points,
      intimacy: twSuggestion.pillars.intimacy.points,
      reliability: twSuggestion.pillars.reliability.points
    };

    setDraftRecord((current) =>
      current
        ? {
            ...current,
            credibilityPoints: nextPoints.credibility,
            groupThinkingPoints: nextPoints.groupThinking,
            intimacyPoints: nextPoints.intimacy,
            reliabilityPoints: nextPoints.reliability
          }
        : current
    );
    setAppliedSuggestionPoints(nextPoints);
    if (activeSuggestionCacheMetadata) {
      writeCachedTwSuggestion({
        appliedPoints: nextPoints,
        draftPoints: nextPoints,
        metadata: activeSuggestionCacheMetadata,
        preserveCacheTimestamp: true,
        suggestion: twSuggestion
      });
    }
    setSuggestionNotification({
      id: Date.now(),
      message: "Sugerencia TW aplicada al detalle."
    });
  }

  function openDetailTranscript(meetingId: string) {
    setTranscriptParticipantEmail(selectedRecordParticipantEmail);
    setSelectedTranscriptMeetingId(meetingId);
  }

  function openChatTranscript(meetingId: string) {
    setTranscriptParticipantEmail(chatbotRecordParticipantEmail);
    setSelectedTranscriptMeetingId(meetingId);
  }

  function openSuggestionTranscript(meetingId: string) {
    setTranscriptParticipantEmail(selectedRecordParticipantEmail ?? chatbotRecordParticipantEmail);
    setSelectedTranscriptMeetingId(meetingId);
    setSelectedSuggestionPillar(null);
  }

  return (
    <div className="trustworthiness-panel">
      <TrustworthinessFilters
        isSelectorOpen={isSelectorOpen}
        isStatusMenuOpen={isStatusMenuOpen}
        onTogglePeriod={togglePeriod}
        onToggleSelector={toggleSelector}
        onToggleStatus={toggleStatus}
        onToggleStatusMenu={() => setIsStatusMenuOpen((current) => !current)}
        periodOptions={periodOptions}
        selectedPeriodIds={selectedPeriodIds}
        selectedPeriods={selectedPeriods}
        selectedStatuses={selectedStatuses}
        selectorRef={selectorRef}
        statusFilterRef={statusFilterRef}
        statusOptions={statusOptions}
        statusSummaryLabel={statusSummaryLabel}
        summaryLabel={summaryLabel}
      />

      <TrustworthinessRecordsSection
        error={error}
        filteredRecords={filteredRecords}
        isLoading={isLoading}
        isUpToDateWorkspace={isUpToDateWorkspace}
        onOpenChatbot={openChatbot}
        onSelectRecord={setSelectedRecordId}
        periodGroups={periodGroups}
        responsePayload={responsePayload}
        selectedRecordId={selectedRecordId}
      />

      <TrustworthinessDetailDrawer
        coachingContextError={coachingContextError}
        coachingContextResponse={coachingContextResponse}
        drawerWidth={drawerWidth}
        hasPendingChanges={
          hasPendingManualChanges || (isWalkthroughOpen && walkthroughStepId === "detail-save")
        }
        isCoachingContextLoading={isCoachingContextLoading}
        isManualSavePending={isManualSaving}
        isSuggestionLoading={isSuggestionLoading}
        manualSaveErrorMessage={manualSaveErrorMessage}
        onClose={() => setSelectedRecordId(null)}
        onOpenChatbot={openChatbot}
        onOpenSaveConfirmation={openManualSaveConfirmation}
        onOpenTranscript={openDetailTranscript}
        onStatusChange={handleStatusChange}
        onStartResize={() => {
          isResizingDrawerRef.current = true;
          document.body.style.cursor = "ew-resize";
          document.body.style.userSelect = "none";
        }}
        onStartSuggestionGeneration={startSuggestionGeneration}
        selectedPeriodIds={selectedPeriodIds}
        selectedRecord={selectedRecord}
        selectedRecordGroups={selectedRecordGroups}
        selectedRecordSummary={selectedRecordSummary}
        shellRef={detailShellRef}
        statusValue={statusValue}
        suggestionActionLabel={suggestionActionLabel}
      />

      <TrustworthinessSaveConfirmationModal
        description="Se guardarán juntos los puntajes, el feedback editado y el estado final que elijas ahora."
        errorMessage={manualSaveErrorMessage}
        eyebrow="Confirmar guardado"
        isOpen={isManualSaveConfirmationOpen}
        isSaving={isManualSaving}
        onClose={closeManualSaveConfirmation}
        onDiscard={discardManualChanges}
        onSaveAsDone={() => {
          void handleManualSave("Done");
        }}
        onSaveAsDraft={() => {
          void handleManualSave("Pending");
        }}
        savingStatus={manualSavingStatus}
        selectedStatus={statusValue}
        summaryBadges={[
          selectedRecordSummary?.periodLabel ?? "Sin periodo",
          selectedRecordSummary?.evaluatedName ?? "Sin talento"
        ]}
        title="Guardar evaluación manual"
        zIndex={SIDE_PANEL_BASE_Z_INDEX + 20}
      />

      <TrustworthinessMockChatModal
        agentConfigZIndex={getSidePanelZIndex("chatAgentConfig")}
        chatWidth={chatWidth}
        chatZIndex={getSidePanelZIndex("chat")}
        coachingContextError={chatbotCoachingContextError}
        coachingContextResponse={chatbotCoachingContextResponse}
        contextZIndex={getSidePanelZIndex("chatContext")}
        initialFeedback={chatbotInitialFeedback}
        isAgentConfigPanelOpen={isChatAgentConfigPanelOpen}
        isCoachingContextLoading={isChatbotCoachingContextLoading}
        isContextPanelOpen={isChatContextPanelOpen}
        onClose={closeChatbot}
        onCloseAgentConfigPanel={() => setIsChatAgentConfigPanelOpen(false)}
        onCloseContextPanel={() => setIsChatContextPanelOpen(false)}
        onOpenAgentConfigPanel={() => setIsChatAgentConfigPanelOpen(true)}
        onOpenContextPanel={() => setIsChatContextPanelOpen(true)}
        onOpenTranscript={openChatTranscript}
        onSavedRecord={handleChatbotSavedRecord}
        onStartResize={() => {
          isResizingChatRef.current = true;
          document.body.style.cursor = "ew-resize";
          document.body.style.userSelect = "none";
        }}
        onWalkthroughComplete={onWalkthroughComplete}
        recordId={chatbotRecord?.id ?? null}
        recordSummary={chatbotRecordSummary}
        selectedPeriodCoverage={selectedPeriodCoverage}
        twSuggestion={chatbotSuggestion}
        walkthroughStepId={walkthroughStepId}
        walkthroughVariant={walkthroughVariant}
      />

      <TranscriptSideSheet
        isTranscriptLoading={isTranscriptLoading}
        onClose={() => {
          setTranscriptParticipantEmail(null);
          setSelectedTranscriptMeetingId(null);
        }}
        selectedTranscriptMeetingId={selectedTranscriptMeetingId}
        transcriptError={transcriptError}
        transcriptResponse={transcriptResponse}
        zIndex={getSidePanelZIndex("transcript")}
      />

      <TrustworthinessSuggestionSideSheet
        appliedSuggestionPoints={appliedSuggestionPoints}
        isSuggestionLoading={isSuggestionLoading}
        isSuggestionSideSheetOpen={isSuggestionSideSheetOpen}
        onApplyAll={applyAllSuggestionPillars}
        onApplyPillar={applySuggestionPillar}
        onChangePillarPoint={handleSuggestionPointChange}
        onClose={() => {
          setSelectedSuggestionPillar(null);
          setIsSuggestionSideSheetOpen(false);
        }}
        onOpenPillarDetail={setSelectedSuggestionPillar}
        onRegenerate={() => {
          void generateTwSuggestion();
        }}
        selectedRecord={selectedRecord}
        selectedRecordIsPending={selectedRecordIsPending}
        selectedRecordSummary={selectedRecordSummary}
        suggestionCacheNotice={suggestionCacheNotice}
        suggestionDraftPoints={suggestionDraftPoints}
        suggestionError={suggestionError}
        twSuggestion={twSuggestion}
        zIndex={getSidePanelZIndex("suggestion")}
      />

      <TrustworthinessFloatingToasts
        generationToasts={generationToasts}
        suggestionNotification={suggestionNotification}
        twGenerationProgress={twGenerationProgress}
      />

      <SuggestionDetailModal
        isSuggestionSideSheetOpen={isSuggestionSideSheetOpen}
        onClose={() => setSelectedSuggestionPillar(null)}
        onOpenTranscript={openSuggestionTranscript}
        selectedSuggestionPillar={selectedSuggestionPillar}
        twSuggestion={twSuggestion}
        zIndex={getSidePanelZIndex("suggestionDetail")}
      />
    </div>
  );
}
