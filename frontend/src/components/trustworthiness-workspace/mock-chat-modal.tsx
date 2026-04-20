"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import {
  calculateTrustworthinessScoreFromProposal,
  createTrustworthinessAssistantWelcomeMessage,
  formatDateValue,
  formatTrustworthinessPercentageFromProposal,
  getCoachingMeetingDatetimeLabel,
  getCoachingMeetingTitle,
  getCoachingUniqueKey,
  getConfidenceLabel,
  getDisplayParticipants,
  getEditablePillarMeaning,
  getPillarLabel,
  getTrustworthinessAssistantFocusPrompt,
  getTrustworthinessAssistantSavePrompt,
  getTrustworthinessMeaningFromScore,
  LoadingProgress,
  normalizeStatusValue,
  SUGGESTION_PILLAR_CONFIG,
  SuggestionStarEditor
} from "./helpers";
import { TrustworthinessSaveConfirmationModal } from "./main-sections";
import type {
  ChatMessage,
  CoachingContextRecord,
  CoachingContextResponse,
  RecordSummary,
  SelectedPeriodCoverage,
  SuggestionPillarKey,
  TrustworthinessAssistantChangeSource,
  TrustworthinessAssistantMeeting,
  TrustworthinessAssistantProposal,
  TrustworthinessAssistantReplyResponse,
  TrustworthinessRatingStatus,
  TrustworthinessRecord,
  TwSuggestionResponse,
  WalkthroughVariant
} from "./types";

type TrustworthinessMockChatModalProps = {
  agentConfigZIndex: number;
  chatWidth: number;
  chatZIndex: number;
  coachingContextError: string | null;
  coachingContextResponse: CoachingContextResponse | null;
  contextZIndex: number;
  initialFeedback: string;
  isAgentConfigPanelOpen: boolean;
  isCoachingContextLoading: boolean;
  isContextPanelOpen: boolean;
  onCloseAgentConfigPanel: () => void;
  onCloseContextPanel: () => void;
  onClose: () => void;
  onOpenAgentConfigPanel: () => void;
  onOpenContextPanel: () => void;
  onOpenTranscript: (meetingId: string) => void;
  onSavedRecord: (record: TrustworthinessRecord) => void;
  onStartResize: () => void;
  onWalkthroughComplete?: () => void;
  recordId: string | null;
  recordSummary: RecordSummary | null;
  selectedPeriodCoverage: SelectedPeriodCoverage | null;
  twSuggestion: TwSuggestionResponse | null;
  walkthroughStepId?: string | null;
  walkthroughVariant?: WalkthroughVariant | null;
};

type PendingPillarUpdate = {
  currentValue: number;
  key: SuggestionPillarKey;
  label: string;
  nextValue: number;
};

type SaveSuccessToast = {
  id: string;
  message: string;
  title: string;
};

const CHAT_AGENT_CONFIG = {
  actions: [
    {
      description: "Explica la logica de la sugerencia o de un pilar.",
      id: "clarify"
    },
    {
      description: "Propone cambios a un pilar especifico.",
      id: "edit_pillar"
    },
    {
      description: "Propone cambios al feedback general.",
      id: "edit_feedback"
    },
    {
      description: "Mantiene la conversacion en modo revision.",
      id: "review"
    },
    {
      description: "Marca que la propuesta esta lista para confirmacion humana.",
      id: "save"
    }
  ],
  description: "Copiloto conversacional para revisar una sugerencia de Trustworthiness con trazabilidad a evidencia.",
  guardrails: [
    "Usar contexto, evidencia y criterio explícito del evaluador humano.",
    "No inventar reuniones, hechos, personas ni resultados.",
    "Distinguir claramente entre evidencia e inferencia.",
    "Respetar la autoridad final del evaluador sobre cambios de puntaje.",
    "Aplicar ajustes explícitos y marcarlos como criterio humano si la evidencia es limitada.",
    "Preguntar evidencia opcional como máximo una vez y sin bloquear el ajuste.",
    "No afirmar que los cambios ya se guardaron.",
    "Siempre devolver la propuesta completa, incluso si no cambia."
  ],
  id: "asistente-revision-tw",
  model: {
    fallback: "gpt-5.4",
    maxOutputTokens: 1200,
    reasoningEffort: "medium",
    recommended: "gpt-5.4-mini",
    responseFormat: "json_schema",
    temperature: 0.2
  },
  name: "Asistente de Revision TW",
  objectives: [
    "Explicar el score global y cada pilar.",
    "Responder preguntas sobre la evidencia.",
    "Proponer ajustes puntuales cuando el evaluador lo pida.",
    "Preparar una confirmacion final antes de guardar."
  ],
  status: "draft",
  version: "0.1.0"
};

function formatGeneratedAt(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
}

function createMessageId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createExportFileName(recordSummary: RecordSummary) {
  const slug = recordSummary.evaluatedName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);

  return `chat-revision-tw-${slug || "talento"}-${date}.md`;
}

function formatCoverageLabel(coverage: SelectedPeriodCoverage | null) {
  if (!coverage) {
    return "Sin rango cargado";
  }

  return `${formatDateValue(coverage.start)} - ${formatDateValue(coverage.end)}`;
}

function createPillarUpdatePrompt(params: {
  currentValue: number;
  label: string;
  nextValue: number;
}) {
  return [
    `Actualiza ${params.label} a ${params.nextValue}/10.`,
    `Antes estaba en ${params.currentValue}/10.`,
    "Mantén los demás pilares igual por ahora, ajusta el feedback propuesto para reflejar este cambio y explica brevemente el ajuste."
  ].join(" ");
}

function mergeSavedRecordWithProposal(params: {
  proposal: TrustworthinessAssistantProposal;
  record: TrustworthinessRecord;
  twSuggestion: TwSuggestionResponse | null;
}) {
  const nextFields: Record<string, unknown> = {
    ...params.record.fields,
    "Credibility Points": params.proposal.credibilityPoints,
    "Feedback": params.proposal.feedback,
    "Group Thinking Points": params.proposal.groupThinkingPoints,
    "Intimacy Points": params.proposal.intimacyPoints,
    "Reliability Points": params.proposal.reliabilityPoints
  };

  if (params.twSuggestion) {
    nextFields["Credibility AI JSON"] = JSON.stringify(params.twSuggestion.pillars.credibility);
    nextFields["Group Thinking Points AI JSON"] = JSON.stringify(
      params.twSuggestion.pillars.groupThinking
    );
    nextFields["Intimacy AI JSON"] = JSON.stringify(params.twSuggestion.pillars.intimacy);
    nextFields["Reliability AI JSON"] = JSON.stringify(params.twSuggestion.pillars.reliability);
  }

  return {
    ...params.record,
    fields: nextFields
  };
}

function formatExportedChat(params: {
  isSaved: boolean;
  messages: ChatMessage[];
  proposal: TrustworthinessAssistantProposal | null;
  recordSummary: RecordSummary;
  selectedPeriodCoverage: SelectedPeriodCoverage | null;
  twSuggestion: TwSuggestionResponse | null;
}) {
  const lines = [
    `# Chat de revision TW - ${params.recordSummary.evaluatedName}`,
    "",
    `Exportado: ${new Date().toISOString()}`,
    `Agente: ${CHAT_AGENT_CONFIG.name} (${CHAT_AGENT_CONFIG.id} v${CHAT_AGENT_CONFIG.version})`,
    `Talento: ${params.recordSummary.evaluatedName}`,
    `Rol: ${params.recordSummary.roleLabel}`,
    `Proyecto/contexto: ${params.recordSummary.context || "Sin contexto"}`,
    `Periodo: ${formatCoverageLabel(params.selectedPeriodCoverage)}`,
    `Ventana analizada: ${
      params.selectedPeriodCoverage
        ? `${params.selectedPeriodCoverage.start} -> ${params.selectedPeriodCoverage.end}`
        : "Sin rango cargado"
    }`,
    `Estado de guardado: ${params.isSaved ? "Guardado" : "No guardado"}`,
    "",
    "## Sugerencia TW",
    "",
    params.twSuggestion
      ? [
          `TW sugerido: ${params.twSuggestion.trustworthiness.percentage}`,
          `Meaning: ${params.twSuggestion.trustworthiness.meaning}`,
          `Reuniones usadas: ${params.twSuggestion.meetingsUsed}`,
          `Confianza: ${params.twSuggestion.trustworthiness.confidence}`
        ].join("\n")
      : "Sin sugerencia TW cargada.",
    "",
    "## Propuesta activa",
    ""
  ];

  if (params.proposal) {
    lines.push(
      `Reliability: ${params.proposal.reliabilityPoints}/10`,
      `Intimacy: ${params.proposal.intimacyPoints}/10`,
      `Group Thinking: ${params.proposal.groupThinkingPoints}/10`,
      `Credibility: ${params.proposal.credibilityPoints}/10`,
      "",
      "Feedback:",
      params.proposal.feedback
    );
  } else {
    lines.push("Sin propuesta activa.");
  }

  lines.push("", "## Conversacion", "");

  for (const message of params.messages) {
    lines.push(`### ${message.role === "assistant" ? "Asistente TW" : "Tu"}`);
    lines.push("");
    if (message.focusArea) {
      lines.push(`Focus: ${message.focusArea}`, "");
    }
    if (message.changeSource && message.changeSource !== "none") {
      lines.push(`Origen del cambio: ${getChangeSourceLabel(message.changeSource)}`, "");
    }
    lines.push(message.content, "");

    if (message.needsOptionalEvidence && message.evidenceQuestion) {
      lines.push("Evidencia opcional:", message.evidenceQuestion, "");
    }

    if (message.citations && message.citations.length > 0) {
      lines.push("Citas:");
      for (const citation of message.citations) {
        lines.push(
          `- ${citation.meetingTitle} (${citation.meetingId}): ${citation.reason}`
        );
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

function clampPoints(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.min(10, Math.round(value)));
  }

  return 1;
}

function createInitialProposal(
  twSuggestion: TwSuggestionResponse | null,
  initialFeedback: string
): TrustworthinessAssistantProposal | null {
  if (!twSuggestion) {
    return null;
  }

  const fallbackFeedback =
    initialFeedback.trim() ||
    twSuggestion.trustworthiness.explanation.trim() ||
    "Initial Trustworthiness proposal based on the available meeting evidence.";

  return {
    credibilityPoints: clampPoints(twSuggestion.pillars.credibility.points),
    feedback: fallbackFeedback,
    groupThinkingPoints: clampPoints(twSuggestion.pillars.groupThinking.points),
    intimacyPoints: clampPoints(twSuggestion.pillars.intimacy.points),
    reliabilityPoints: clampPoints(twSuggestion.pillars.reliability.points)
  };
}

function createInitialMessages(params: {
  meetingsCount: number;
  proposal: TrustworthinessAssistantProposal | null;
  recordSummary: RecordSummary;
  twSuggestion: TwSuggestionResponse | null;
}): ChatMessage[] {
  if (!params.proposal || !params.twSuggestion) {
    return [
      {
        content: "Falta cargar Generar TW y el contexto de reuniones antes de conversar con el asistente.",
        id: "assistant-missing-context",
        role: "assistant"
      }
    ];
  }

  return [
    {
      content: createTrustworthinessAssistantWelcomeMessage({
        evaluatedName: params.recordSummary.evaluatedName,
        meetingsUsed: params.meetingsCount || params.twSuggestion.meetingsUsed,
        proposal: params.proposal
      }),
      id: "assistant-intro",
      role: "assistant"
    }
  ];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(record: CoachingContextRecord, fieldName: string) {
  const value = record.fields[fieldName];

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getStringArrayField(record: CoachingContextRecord, fieldName: string) {
  const value = record.fields[fieldName];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function getMetricsScores(record: CoachingContextRecord) {
  const value = record.fields.metrics_scores;
  const scores: Record<string, number | null> = {};

  if (!isPlainRecord(value)) {
    return scores;
  }

  for (const [key, rawScore] of Object.entries(value)) {
    scores[key] =
      typeof rawScore === "number" && Number.isFinite(rawScore)
        ? rawScore
        : null;
  }

  return scores;
}

function buildAssistantMeetings(
  coachingContextResponse: CoachingContextResponse | null
): TrustworthinessAssistantMeeting[] {
  if (!coachingContextResponse) {
    return [];
  }

  return coachingContextResponse.records.map((record) => ({
    actionItems: getStringArrayField(record, "action_items"),
    coachingAnalysis: getStringField(record, "coaching_analysis"),
    coachingSummary: getStringField(record, "coaching_summary"),
    meetingDatetime: getStringField(record, "meeting_datetime"),
    meetingId: record.id,
    metricsScores: getMetricsScores(record),
    title: getCoachingMeetingTitle(record),
    topics: getStringArrayField(record, "topics"),
    transcriptSummary: getStringField(record, "transcript_summary")
  }));
}

function getAssistantReply(payload: unknown): TrustworthinessAssistantReplyResponse | null {
  if (!isPlainRecord(payload) || payload.ok !== true) {
    return null;
  }

  if (
    typeof payload.changeSource !== "string" ||
    typeof payload.evidenceQuestion !== "string" && payload.evidenceQuestion !== null ||
    typeof payload.message !== "string" ||
    typeof payload.needsOptionalEvidence !== "boolean" ||
    !isPlainRecord(payload.proposal) ||
    typeof payload.proposalChanged !== "boolean" ||
    !Array.isArray(payload.citations)
  ) {
    return null;
  }

  return payload as TrustworthinessAssistantReplyResponse;
}

function getChangeSourceLabel(changeSource: TrustworthinessAssistantChangeSource) {
  if (changeSource === "human_override") {
    return "Ajuste aplicado por criterio del evaluador";
  }

  if (changeSource === "mixed") {
    return "Ajuste aplicado con evidencia y criterio humano";
  }

  if (changeSource === "model_evidence") {
    return "Ajuste sugerido por evidencia";
  }

  return "Sin cambios en la propuesta";
}

function getWalkthroughFocusPillar(
  twSuggestion: TwSuggestionResponse | null
): SuggestionPillarKey | null {
  if (!twSuggestion) {
    return null;
  }

  const orderedPillars: SuggestionPillarKey[] = [
    "reliability",
    "intimacy",
    "groupThinking",
    "credibility"
  ];

  return orderedPillars.find((pillarKey) => Boolean(twSuggestion.pillars[pillarKey])) ?? null;
}

function buildWalkthroughCitations(params: {
  coachingContextResponse: CoachingContextResponse | null;
  pillarKey: SuggestionPillarKey;
  twSuggestion: TwSuggestionResponse | null;
}) {
  if (!params.twSuggestion) {
    return [];
  }

  const pillar = params.twSuggestion.pillars[params.pillarKey];
  const citations = [
    ...pillar.decisionDetail.positiveSignals,
    ...pillar.decisionDetail.negativeSignals
  ]
    .slice(0, 3)
    .map((signal) => ({
      meetingId: signal.meetingId,
      meetingTitle: signal.meetingTitle,
      pillar: params.pillarKey,
      reason: signal.interpretation || signal.evidenceText
    }));

  if (citations.length > 0) {
    return citations;
  }

  return buildAssistantMeetings(params.coachingContextResponse)
    .slice(0, 2)
    .map((meeting) => ({
      meetingId: meeting.meetingId,
      meetingTitle: meeting.title,
      pillar: params.pillarKey,
      reason:
        meeting.coachingSummary ||
        meeting.transcriptSummary ||
        "Reunión incluida en el contexto del período oficial."
    }));
}

function buildWalkthroughExplanationMessage(params: {
  coachingContextResponse: CoachingContextResponse | null;
  recordSummary: RecordSummary;
  twSuggestion: TwSuggestionResponse | null;
}): ChatMessage | null {
  const pillarKey = getWalkthroughFocusPillar(params.twSuggestion);

  if (!params.twSuggestion || !pillarKey) {
    return null;
  }

  const pillar = params.twSuggestion.pillars[pillarKey];
  const pillarLabel = getPillarLabel(pillarKey);
  const citations = buildWalkthroughCitations({
    coachingContextResponse: params.coachingContextResponse,
    pillarKey,
    twSuggestion: params.twSuggestion
  });
  const citedMeetingsLabel =
    citations.length > 0
      ? citations
          .map((citation) => citation.meetingTitle)
          .filter((meetingTitle, index, allTitles) => allTitles.indexOf(meetingTitle) === index)
          .slice(0, 2)
          .join(" y ")
      : null;

  return {
    changeSource: "model_evidence",
    citations,
    content: [
      `Para ${pillarLabel}, la evidencia disponible apunta a ${pillar.points}/10.`,
      pillar.shortReason,
      pillar.decisionDetail.conclusion,
      citedMeetingsLabel
        ? `La explicación se apoya en reuniones como ${citedMeetingsLabel}, junto con señales del contexto consolidado del período.`
        : `La explicación usa el contexto consolidado del período y las reuniones relacionadas con ${params.recordSummary.evaluatedName}.`
    ].join(" "),
    focusArea: pillarKey,
    id: "walkthrough-explanation",
    intent: "clarify",
    role: "assistant"
  };
}

function createWalkthroughDemoMessages(params: {
  coachingContextResponse: CoachingContextResponse | null;
  recordSummary: RecordSummary;
  twSuggestion: TwSuggestionResponse | null;
}): ChatMessage[] {
  const explanationMessage = buildWalkthroughExplanationMessage(params);

  if (!explanationMessage) {
    return [];
  }

  return [
    {
      content: "Quiero entender por qué quedó así esta propuesta antes de guardarla.",
      id: "walkthrough-user-clarify",
      role: "user"
    },
    explanationMessage
  ];
}

export function TrustworthinessMockChatModal(props: TrustworthinessMockChatModalProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [proposal, setProposal] = useState<TrustworthinessAssistantProposal | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [isSaveReady, setIsSaveReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastProposalChanged, setLastProposalChanged] = useState(false);
  const [lastChangeSource, setLastChangeSource] =
    useState<TrustworthinessAssistantChangeSource>("none");
  const [pendingPillarUpdate, setPendingPillarUpdate] = useState<PendingPillarUpdate | null>(null);
  const [pillarUpdatePrompt, setPillarUpdatePrompt] = useState("");
  const [isSaveConfirmationOpen, setIsSaveConfirmationOpen] = useState(false);
  const [saveConfirmationError, setSaveConfirmationError] = useState<string | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState<SaveSuccessToast | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const isWalkthroughMode = props.walkthroughVariant === "chatbot";
  const recordSummaryDependencyKey = props.recordSummary
    ? [
        props.recordSummary.evaluatedName,
        props.recordSummary.evaluatedEmail ?? "",
        props.recordSummary.roleLabel,
        props.recordSummary.context,
        props.recordSummary.status
      ].join("|")
    : "";
  const coachingContextDependencyKey = props.coachingContextResponse
    ? [
        props.coachingContextResponse.participantEmail,
        props.coachingContextResponse.recordCount,
        props.coachingContextResponse.selectedPeriods.join("|")
      ].join("|")
    : "";
  const twSuggestionDependencyKey = props.twSuggestion
    ? [
        props.twSuggestion.recordId,
        props.twSuggestion.generatedAt,
        props.twSuggestion.meetingsUsed
      ].join("|")
    : "";
  const walkthroughDemoMessages =
    props.recordSummary && isWalkthroughMode
      ? createWalkthroughDemoMessages({
          coachingContextResponse: props.coachingContextResponse,
          recordSummary: props.recordSummary,
          twSuggestion: props.twSuggestion
        })
      : [];
  const displayedMessages = isWalkthroughMode ? [...messages, ...walkthroughDemoMessages] : messages;

  useEffect(() => {
    if (!props.recordSummary) {
      return;
    }

    const initialProposal = createInitialProposal(props.twSuggestion, props.initialFeedback);
    const meetingsCount = props.coachingContextResponse?.records.length ?? props.twSuggestion?.meetingsUsed ?? 0;

    setDraftMessage("");
    setProposal(initialProposal);
    setMessages(
      createInitialMessages({
        meetingsCount,
        proposal: initialProposal,
        recordSummary: props.recordSummary,
        twSuggestion: props.twSuggestion
      })
    );
    setChatError(null);
    setIsResponding(false);
    setIsSaveReady(false);
    setIsSaving(false);
    setIsSaved(false);
    setLastProposalChanged(false);
    setLastChangeSource("none");
    setPendingPillarUpdate(null);
    setPillarUpdatePrompt("");
    setIsSaveConfirmationOpen(false);
    setSaveConfirmationError(null);
    setSaveSuccessToast(null);
  }, [
    coachingContextDependencyKey,
    props.initialFeedback,
    props.recordId,
    recordSummaryDependencyKey,
    twSuggestionDependencyKey
  ]);

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }

    if (isWalkthroughMode) {
      return;
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [
    isSaveConfirmationOpen,
    isSaveReady,
    isWalkthroughMode,
    messages,
    props.coachingContextResponse,
    props.twSuggestion
  ]);

  useEffect(() => {
    if (!isWalkthroughMode || !props.walkthroughStepId || !messagesRef.current) {
      return;
    }

    const messagesElement = messagesRef.current;

    const alignTargetWithinMessages = (selector: string) => {
      const target = messagesElement.querySelector<HTMLElement>(selector);

      if (!target) {
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const containerRect = messagesElement.getBoundingClientRect();
      const nextTop =
        messagesElement.scrollTop + (targetRect.top - containerRect.top) - 12;

      messagesElement.scrollTop = Math.max(0, nextTop);
    };

    const frameId = window.requestAnimationFrame(() => {
      switch (props.walkthroughStepId) {
        case "chatbot-shell":
        case "chatbot-proposal":
          messagesElement.scrollTop = 0;
          break;
        case "chatbot-explanation":
          alignTargetWithinMessages('[data-walkthrough="chatbot-explanation-bubble"]');
          break;
        default:
          break;
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    isWalkthroughMode,
    props.walkthroughStepId,
    coachingContextDependencyKey,
    messages.length,
    proposal?.feedback ?? "",
    twSuggestionDependencyKey
  ]);

  useEffect(() => {
    if (!saveSuccessToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveSuccessToast(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveSuccessToast]);

  useEffect(() => {
    if (!isWalkthroughMode) {
      if (isSaveConfirmationOpen) {
        setIsSaveConfirmationOpen(false);
      }
      return;
    }

    if (props.walkthroughStepId === "chatbot-save-confirmation" && !isSaveConfirmationOpen) {
      setIsSaveConfirmationOpen(true);
      setChatError(null);
      setSaveConfirmationError(null);
      return;
    }

    if (props.walkthroughStepId !== "chatbot-save-confirmation" && isSaveConfirmationOpen) {
      setIsSaveConfirmationOpen(false);
    }
  }, [isSaveConfirmationOpen, isWalkthroughMode, props.walkthroughStepId]);

  if (!props.recordSummary || typeof document === "undefined") {
    return null;
  }

  const recordSummary = props.recordSummary;
  const assistantMeetings = buildAssistantMeetings(props.coachingContextResponse);
  const canUseAssistant =
    Boolean(props.recordId) &&
    Boolean(props.twSuggestion) &&
    Boolean(props.coachingContextResponse) &&
    Boolean(proposal) &&
    !isWalkthroughMode &&
    !isResponding &&
    !isSaving &&
    !isSaved;
  const canOpenSaveConfirmation =
    Boolean(props.recordId) &&
    Boolean(props.twSuggestion) &&
    Boolean(props.selectedPeriodCoverage) &&
    Boolean(recordSummary.evaluatedEmail) &&
    Boolean(proposal) &&
    !isResponding &&
    !isSaving &&
    (!isSaved || isWalkthroughMode);
  const proposalScore = proposal ? calculateTrustworthinessScoreFromProposal(proposal) : null;
  const proposalPercentage = proposal ? formatTrustworthinessPercentageFromProposal(proposal) : null;
  const proposalMeaning =
    proposalScore !== null ? getTrustworthinessMeaningFromScore(proposalScore) : null;
  const suggestedSaveStatus: TrustworthinessRatingStatus =
    normalizeStatusValue(recordSummary.status) === "done" ? "Done" : "Pending";
  const proposalStatusLabel = isSaving
    ? "Guardando..."
    : isSaved
      ? "Guardado"
      : isSaveReady
        ? "Lista para guardar"
        : lastProposalChanged
          ? getChangeSourceLabel(lastChangeSource)
          : "Pendiente por guardar";
  const proposalStatusClass = isSaved
    ? "is-saved"
    : isSaveReady
      ? "is-ready"
      : lastProposalChanged
        ? "is-changed"
        : "";
  const officialPeriodLabel = formatCoverageLabel(props.selectedPeriodCoverage);
  const headerActionItems = [
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h3a2 2 0 0 1 1.4.57l.86.86a1 1 0 0 0 .7.29h5.04A2.5 2.5 0 0 1 20 8.22v9.28A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z" />
        </svg>
      ),
      id: "context",
      tooltip: `Contexto del chat: ${recordSummary.context || "Sin contexto"}`
    },
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M11 2.75a1 1 0 0 1 2 0V4h2.75A3.25 3.25 0 0 1 19 7.25v6.5A3.25 3.25 0 0 1 15.75 17h-7.5A3.25 3.25 0 0 1 5 13.75v-6.5A3.25 3.25 0 0 1 8.25 4H11V2.75ZM8.25 6A1.25 1.25 0 0 0 7 7.25v6.5A1.25 1.25 0 0 0 8.25 15h7.5A1.25 1.25 0 0 0 17 13.75v-6.5A1.25 1.25 0 0 0 15.75 6Zm-5 3.25a1 1 0 0 1 1 1v2.5a1 1 0 1 1-2 0v-2.5a1 1 0 0 1 1-1Zm17.5 0a1 1 0 0 1 1 1v2.5a1 1 0 1 1-2 0v-2.5a1 1 0 0 1 1-1ZM9.5 9.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-4 3.5h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5Z" />
        </svg>
      ),
      id: "agent",
      tooltip: `Configuracion del agente: ${CHAT_AGENT_CONFIG.name}`
    }
  ];

  async function sendAssistantMessage(userMessage: string) {
    const activeProposal = proposal;

    if (!props.recordId || !props.twSuggestion || !activeProposal || !props.coachingContextResponse) {
      setChatError("Falta Generar TW o el contexto de reuniones para continuar.");
      return;
    }

    if (userMessage.trim().length === 0 || isResponding || isSaving || isSaved) {
      return;
    }

    const trimmedMessage = userMessage.trim();
    const userChatMessage: ChatMessage = {
      content: trimmedMessage,
      id: createMessageId("user"),
      role: "user"
    };
    const history = messages.map((message) => ({
      content: message.content,
      role: message.role
    }));

    setDraftMessage("");
    setChatError(null);
    setSaveConfirmationError(null);
    setIsResponding(true);
    setIsSaveReady(false);
    setMessages((current) => [...current, userChatMessage]);

    try {
      const response = await fetch(
        `/api/trustworthiness/${encodeURIComponent(props.recordId)}/assistant/message`,
        {
          body: JSON.stringify({
            evaluatedName: recordSummary.evaluatedName,
            history,
            meetings: assistantMeetings,
            projectContext: recordSummary.context,
            prompt: trimmedMessage,
            proposal: activeProposal,
            roleLabel: recordSummary.roleLabel,
            suggestion: props.twSuggestion
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        }
      );
      const parsedPayload = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          isPlainRecord(parsedPayload) && typeof parsedPayload.message === "string"
            ? parsedPayload.message
            : "No fue posible continuar la conversación del asistente.";
        throw new Error(message);
      }

      const assistantReply = getAssistantReply(parsedPayload);

      if (!assistantReply) {
        throw new Error("El asistente no devolvió una respuesta válida.");
      }

      setProposal(assistantReply.proposal);
      setLastProposalChanged(assistantReply.proposalChanged);
      setLastChangeSource(assistantReply.changeSource);
      setIsSaveReady(assistantReply.nextIntent === "save");
      setIsSaved(false);
      setMessages((current) => [
        ...current,
        {
          changeSource: assistantReply.changeSource,
          citations: assistantReply.citations,
          content: assistantReply.message,
          evidenceQuestion: assistantReply.evidenceQuestion,
          focusArea: assistantReply.focusArea,
          id: createMessageId("assistant"),
          intent: assistantReply.nextIntent,
          needsOptionalEvidence: assistantReply.needsOptionalEvidence,
          role: "assistant"
        }
      ]);
    } catch (sendError) {
      setChatError(
        sendError instanceof Error
          ? sendError.message
          : "No fue posible continuar la conversación del asistente."
      );
    } finally {
      setIsResponding(false);
    }
  }

  function handleSubmit() {
    void sendAssistantMessage(draftMessage);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!canUseAssistant || draftMessage.trim().length === 0) {
      return;
    }

    handleSubmit();
  }

  function handleFocusPrompt(focus: SuggestionPillarKey | "feedback") {
    void sendAssistantMessage(getTrustworthinessAssistantFocusPrompt(focus));
  }

  function handlePrepareSave() {
    void sendAssistantMessage(getTrustworthinessAssistantSavePrompt());
  }

  function handleOpenSaveConfirmation() {
    if (!canOpenSaveConfirmation) {
      return;
    }

    setIsSaveConfirmationOpen(true);
    setChatError(null);
    setSaveConfirmationError(null);
  }

  function handleCloseSaveConfirmation() {
    if (isWalkthroughMode && props.walkthroughStepId === "chatbot-save-confirmation") {
      return;
    }

    setIsSaveConfirmationOpen(false);
    setSaveConfirmationError(null);
  }

  function handleDiscardSaveConfirmation() {
    if (isWalkthroughMode) {
      props.onWalkthroughComplete?.();
      return;
    }

    setIsSaveConfirmationOpen(false);
    setIsSaveReady(false);
    setChatError(null);
    setSaveConfirmationError(null);
  }

  function handlePillarScoreSelect(params: {
    currentValue: number;
    key: SuggestionPillarKey;
    label: string;
    nextValue: number;
  }) {
    if (!canUseAssistant || params.currentValue === params.nextValue) {
      return;
    }

    setPendingPillarUpdate({
      currentValue: params.currentValue,
      key: params.key,
      label: params.label,
      nextValue: params.nextValue
    });
    setPillarUpdatePrompt(
      createPillarUpdatePrompt({
        currentValue: params.currentValue,
        label: params.label,
        nextValue: params.nextValue
      })
    );
    setChatError(null);
  }

  function handleClosePillarUpdateModal() {
    setPendingPillarUpdate(null);
    setPillarUpdatePrompt("");
  }

  function handleConfirmPillarUpdate() {
    const prompt = pillarUpdatePrompt.trim();

    if (!pendingPillarUpdate || prompt.length === 0) {
      setChatError("Escribe el prompt de actualización antes de continuar.");
      return;
    }

    handleClosePillarUpdateModal();
    void sendAssistantMessage(prompt);
  }

  async function persistProposal(
    proposalToSave: TrustworthinessAssistantProposal,
    ratingStatus: TrustworthinessRatingStatus,
    options?: {
      savedMessage?: string;
    }
  ) {
    if (
      !props.recordId ||
      !props.twSuggestion ||
      !props.selectedPeriodCoverage ||
      !recordSummary.evaluatedEmail
    ) {
      setChatError("Falta contexto para guardar la propuesta del asistente.");
      setSaveConfirmationError("Falta contexto para guardar la propuesta del asistente.");
      return false;
    }

    setIsSaving(true);
    setChatError(null);
    setSaveConfirmationError(null);

    try {
      const response = await fetch(
        `/api/trustworthiness/${encodeURIComponent(props.recordId)}/assistant/save`,
        {
          body: JSON.stringify({
            agentId: CHAT_AGENT_CONFIG.id,
            agentVersion: CHAT_AGENT_CONFIG.version,
            confirmedByUser: true,
            context: {
              end: props.selectedPeriodCoverage.end,
              meetingsCount: props.coachingContextResponse?.records.length ?? 0,
              participantEmail: recordSummary.evaluatedEmail,
              recordId: props.recordId,
              start: props.selectedPeriodCoverage.start
            },
            proposal: proposalToSave,
            ratingStatus,
            twSuggestion: props.twSuggestion
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        }
      );
      const parsedPayload = (await response.json()) as
        | { ok: true; record: TrustworthinessRecord }
        | { message?: string };

      if (!response.ok || !("ok" in parsedPayload && parsedPayload.ok)) {
        throw new Error("message" in parsedPayload ? parsedPayload.message : undefined);
      }

      const savedRecord = mergeSavedRecordWithProposal({
        proposal: proposalToSave,
        record: parsedPayload.record,
        twSuggestion: props.twSuggestion
      });

      props.onSavedRecord(savedRecord);
      setIsSaved(true);
      setIsSaveReady(false);
      setLastProposalChanged(false);
      setLastChangeSource("none");
      setSaveSuccessToast({
        id: createMessageId("save-toast"),
        message:
          ratingStatus === "Done"
            ? "Se guardaron puntajes, feedback, datos de IA y el status final quedó en Done."
            : "Se guardaron puntajes, feedback y datos de IA. El status queda en Pending como Draft.",
        title: ratingStatus === "Done" ? "Evaluación guardada como Done" : "Evaluación guardada como Draft"
      });
      setMessages((current) => [
        ...current,
        {
          content:
            options?.savedMessage ??
            (ratingStatus === "Done"
              ? "La propuesta fue guardada con status Done. Los puntajes y el feedback quedaron actualizados."
              : "La propuesta fue guardada como Draft. Los puntajes y el feedback quedaron actualizados, pero la evaluación sigue en Pending."),
          id: createMessageId("assistant-saved"),
          role: "assistant"
        }
      ]);
      setIsSaveConfirmationOpen(false);
      return true;
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar la propuesta del asistente.";
      setChatError(message);
      setSaveConfirmationError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmSave(ratingStatus: TrustworthinessRatingStatus) {
    if (!proposal) {
      setChatError("Falta la propuesta activa para guardar.");
      setSaveConfirmationError("Falta la propuesta activa para guardar.");
      return;
    }

    if (isWalkthroughMode) {
      props.onWalkthroughComplete?.();
      return;
    }

    await persistProposal(proposal, ratingStatus);
  }

  function handleExportChat() {
    const content = formatExportedChat({
      isSaved,
      messages: displayedMessages,
      proposal,
      recordSummary,
      selectedPeriodCoverage: props.selectedPeriodCoverage,
      twSuggestion: props.twSuggestion
    });
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = createExportFileName(recordSummary);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <>
      {createPortal(
        <aside
          aria-label="Chat de revisión"
          className="transcript-side-sheet chat-review-side-sheet"
          data-walkthrough="chatbot-shell"
          role="dialog"
          style={{ width: `${props.chatWidth}px`, zIndex: props.chatZIndex }}
        >
          <button
            aria-label="Redimensionar panel del chat de revisión"
            className="chat-review-side-sheet-resize-handle"
            onPointerDown={props.onStartResize}
            type="button"
          />
          <div
            className="transcript-side-sheet-header chat-review-side-sheet-header"
            data-walkthrough="chatbot-shell-header"
          >
            <div className="trustworthiness-chatbot-header-copy">
              <span>Chat de revision</span>
              <h4>{recordSummary.evaluatedName}</h4>
              <div className="trustworthiness-chatbot-header-meta">
                <p>{recordSummary.roleLabel} · {CHAT_AGENT_CONFIG.name}</p>
                <div className="trustworthiness-chatbot-header-meta-inline">
                  <span className="trustworthiness-chatbot-status-chip">{recordSummary.status}</span>
                  <span className="trustworthiness-chatbot-period-chip">{officialPeriodLabel}</span>
                  {isWalkthroughMode ? (
                    <span className="trustworthiness-chatbot-walkthrough-chip">
                      WT Chatbot · demo segura
                    </span>
                  ) : null}
                  <button
                    aria-label="Informacion del guardado"
                    className="trustworthiness-chatbot-inline-info"
                    data-tooltip="El asistente propone cambios, pero solo guardamos cuando confirmas manualmente."
                    type="button"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3a9 9 0 1 1-9 9 9 9 0 0 1 9-9Zm0 4.2a1.1 1.1 0 1 0 1.1 1.1A1.1 1.1 0 0 0 12 7.2Zm1.4 10.1v-1a.5.5 0 0 0-.5-.5h-.4v-4.3a.5.5 0 0 0-.5-.5h-1.8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h.4v2.8h-.4a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3.2a.5.5 0 0 0 .5-.5Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="trustworthiness-chatbot-header-actions">
              {headerActionItems.map((item) => (
                <button
                  aria-label={item.tooltip}
                  className="trustworthiness-chatbot-icon"
                  data-tooltip={item.tooltip}
                  key={item.id}
                  onClick={
                    item.id === "context"
                      ? props.onOpenContextPanel
                      : item.id === "agent"
                        ? props.onOpenAgentConfigPanel
                        : undefined
                  }
                  data-walkthrough={
                    item.id === "context"
                      ? "chatbot-context-trigger"
                      : item.id === "agent"
                        ? "chatbot-agent-trigger"
                        : undefined
                  }
                  type="button"
                >
                  {item.icon}
                </button>
              ))}
              <button
                aria-label="Exportar chat"
                className="trustworthiness-chatbot-icon"
                data-tooltip="Exportar chat"
                onClick={handleExportChat}
                type="button"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 17a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V18a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
              <button
                aria-label={isSaved ? "Evaluación guardada" : "Guardar evaluación"}
                className="trustworthiness-chatbot-icon is-primary-action"
                data-walkthrough="chatbot-save-trigger"
                data-tooltip={isSaved ? "Evaluación guardada" : "Guardar evaluación"}
                disabled={!canOpenSaveConfirmation}
                onClick={handleOpenSaveConfirmation}
                type="button"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M5 3h11.2a2 2 0 0 1 1.42.59l2.79 2.79A2 2 0 0 1 21 7.8V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 2v5h8V5H7Zm10 14v-6H7v6h10Z" />
                </svg>
              </button>
              <button
                aria-label="Cerrar chat"
                className="trustworthiness-chatbot-icon"
                data-tooltip="Cerrar"
                onClick={isWalkthroughMode ? props.onWalkthroughComplete : props.onClose}
                type="button"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6.3 5.3a1 1 0 0 1 1.4 0l4.3 4.29 4.3-4.3a1 1 0 1 1 1.4 1.42L13.42 12l4.3 4.3a1 1 0 0 1-1.42 1.4L12 13.42l-4.3 4.3a1 1 0 0 1-1.4-1.42l4.29-4.3-4.3-4.3a1 1 0 0 1 0-1.4Z" />
                </svg>
              </button>
            </div>
          </div>

          <section className="transcript-side-sheet-body chat-review-side-sheet-body trustworthiness-chatbot-conversation">
            <div className="trustworthiness-chatbot-messages trustworthiness-mock-chat-messages" ref={messagesRef}>
              {proposal ? (
                <article
                  className="trustworthiness-chatbot-message is-assistant is-proposal"
                  data-walkthrough="chatbot-proposal"
                >
                  <span>Propuesta activa</span>
                  <div
                    className="trustworthiness-chatbot-proposal"
                    data-walkthrough="chatbot-proposal-card"
                  >
                    <div className="trustworthiness-chatbot-proposal-head">
                      <div>
                        <span>Trustworthiness sugerido</span>
                        <h5>
                          {proposalPercentage ?? "Sin propuesta"}{" "}
                          {proposalMeaning ? <small>{proposalMeaning}</small> : null}
                        </h5>
                      </div>
                      <span className={`trustworthiness-chatbot-proposal-status ${proposalStatusClass}`}>
                        {proposalStatusLabel}
                      </span>
                    </div>

                    <div className="trustworthiness-chatbot-pillars">
                      {SUGGESTION_PILLAR_CONFIG.map((pillar) => {
                        const value = proposal[pillar.draftField];

                        return (
                          <article className="trustworthiness-chatbot-pillar-card" key={pillar.key}>
                            <header>
                              <span>{pillar.label}</span>
                              <strong>{value}/10</strong>
                            </header>
                            <SuggestionStarEditor
                              disabled={!canUseAssistant || pendingPillarUpdate !== null}
                              onChange={(nextValue) => {
                                handlePillarScoreSelect({
                                  currentValue: value,
                                  key: pillar.key,
                                  label: pillar.label,
                                  nextValue
                                });
                              }}
                              value={value}
                            />
                            <p>{getEditablePillarMeaning(pillar.key, value)}</p>
                          </article>
                        );
                      })}
                    </div>

                    <div className="trustworthiness-chatbot-feedback-card">
                      <span>Feedback propuesto</span>
                      <p>{proposal.feedback}</p>
                    </div>
                  </div>
                </article>
              ) : null}

              {chatError ? <p className="workspace-response-error">{chatError}</p> : null}

              {displayedMessages.map((message) => (
                <article
                  className={`trustworthiness-mock-chat-row is-${message.role}`}
                  key={message.id}
                >
                  <span className="trustworthiness-mock-chat-label">
                    {message.role === "assistant" ? "Asistente TW" : "Tu"}
                  </span>
                  <div
                    className="trustworthiness-mock-chat-bubble"
                    data-walkthrough={
                      message.id === "walkthrough-explanation"
                        ? "chatbot-explanation-bubble"
                        : undefined
                    }
                  >
                    {message.focusArea ? (
                      <small className="trustworthiness-chatbot-message-tag">
                        {message.focusArea === "feedback"
                          ? "Feedback"
                          : getPillarLabel(message.focusArea)}
                      </small>
                    ) : null}
                    <p>{message.content}</p>
                    {message.role === "assistant" &&
                    message.changeSource &&
                    message.changeSource !== "none" ? (
                      <div className="trustworthiness-chatbot-change-source">
                        {getChangeSourceLabel(message.changeSource)}
                      </div>
                    ) : null}
                    {message.role === "assistant" &&
                    message.needsOptionalEvidence &&
                    message.evidenceQuestion ? (
                      <div className="trustworthiness-chatbot-evidence-question">
                        <span>Evidencia opcional</span>
                        <p>{message.evidenceQuestion}</p>
                      </div>
                    ) : null}
                    {message.citations && message.citations.length > 0 ? (
                      <div className="trustworthiness-chatbot-citations">
                        <span>Evidencia citada</span>
                        {message.citations.map((citation) => (
                          <button
                            key={`${citation.meetingId}-${citation.reason}`}
                            onClick={() => props.onOpenTranscript(citation.meetingId)}
                            type="button"
                          >
                            <strong>{citation.meetingTitle}</strong>
                            <small>{citation.reason}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}

            </div>

            <div className="trustworthiness-chatbot-composer">
              <div
                className="trustworthiness-chatbot-suggestions"
                data-walkthrough="chatbot-quick-actions"
              >
                <button
                  className="trustworthiness-chatbot-suggestion is-primary"
                  disabled={!canUseAssistant}
                  onClick={handlePrepareSave}
                  type="button"
                >
                  Está bien, preparar guardado
                </button>
                {SUGGESTION_PILLAR_CONFIG.map((pillar) => (
                  <button
                    className="trustworthiness-chatbot-suggestion"
                    disabled={!canUseAssistant}
                    key={pillar.key}
                    onClick={() => handleFocusPrompt(pillar.key)}
                    type="button"
                  >
                    Revisar {pillar.label}
                  </button>
                ))}
                <button
                  className="trustworthiness-chatbot-suggestion"
                  disabled={!canUseAssistant}
                  onClick={() => handleFocusPrompt("feedback")}
                  type="button"
                >
                  Revisar feedback
                </button>
              </div>
              <div
                className="trustworthiness-chatbot-input-wrap"
                data-walkthrough="chatbot-composer"
              >
                <textarea
                  className="trustworthiness-chatbot-input"
                  disabled={!canUseAssistant}
                  onKeyDown={handleComposerKeyDown}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Escribe una pregunta o ajuste para el asistente de revisión..."
                  rows={4}
                  value={draftMessage}
                />
                {isWalkthroughMode ? (
                  <p className="trustworthiness-chatbot-walkthrough-note">
                    Demo guiada: este recorrido usa una sugerencia, reuniones y respuestas demo.
                    No envía mensajes reales ni guarda cambios.
                  </p>
                ) : null}
                <button
                  className="trustworthiness-chatbot-send"
                  aria-label={isResponding ? "Pensando" : "Enviar mensaje"}
                  disabled={!canUseAssistant || draftMessage.trim().length === 0}
                  onClick={handleSubmit}
                  type="button"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M3.4 4.35a1.4 1.4 0 0 1 1.62-.22l15.2 7.05a.9.9 0 0 1 0 1.64l-15.2 7.05A1.4 1.4 0 0 1 3.1 18.2l1.75-5.16H11a1 1 0 1 0 0-2H4.85L3.1 5.88a1.4 1.4 0 0 1 .3-1.53Z" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        </aside>,
        document.body
      )}

      <TrustworthinessSaveConfirmationModal
        description={
          isWalkthroughMode
            ? "Este walkthrough llega hasta la confirmación final para mostrar el flujo completo, pero no ejecuta el guardado real."
            : "Se guardarán en una sola operación los puntajes actuales, el feedback trabajado, los datos de IA y el status final que elijas."
        }
        errorMessage={saveConfirmationError}
        eyebrow={isWalkthroughMode ? "Confirmación demo" : "Confirmar guardado"}
        isOpen={isSaveConfirmationOpen}
        isSaving={isSaving}
        onClose={handleCloseSaveConfirmation}
        onDiscard={handleDiscardSaveConfirmation}
        onSaveAsDone={() => {
          void handleConfirmSave("Done");
        }}
        onSaveAsDraft={() => {
          void handleConfirmSave("Pending");
        }}
        savingStatus={null}
        selectedStatus={suggestedSaveStatus}
        summaryBadges={[officialPeriodLabel, recordSummary.evaluatedName]}
        title={
          isWalkthroughMode
            ? "Demostración de guardado desde el chat"
            : "Guardar evaluación desde el chat"
        }
        walkthroughId="chatbot-save-confirmation"
        zIndex={props.chatZIndex + 4}
      />

      {pendingPillarUpdate
        ? createPortal(
            <div
              className="trustworthiness-chatbot-confirm-backdrop"
              onClick={handleClosePillarUpdateModal}
              style={{ zIndex: props.chatZIndex + 4 }}
            >
              <div
                aria-label={`Confirmar cambio de ${pendingPillarUpdate.label}`}
                aria-modal="true"
                className="trustworthiness-chatbot-confirm-modal"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                role="dialog"
              >
                <div className="trustworthiness-chatbot-confirm-copy">
                  <span>Actualizar pilar</span>
                  <h4>
                    {pendingPillarUpdate.label} a {pendingPillarUpdate.nextValue}/10
                  </h4>
                  <p>
                    Esto no cambia la propuesta directamente. Se enviará como instrucción al
                    asistente para actualizar el pilar seleccionado y recalcular el feedback
                    propuesto dentro del chat.
                  </p>
                </div>

                <div className="trustworthiness-chatbot-confirm-summary">
                  <span>Valor actual: {pendingPillarUpdate.currentValue}/10</span>
                  <span>Nuevo valor: {pendingPillarUpdate.nextValue}/10</span>
                </div>

                <label className="trustworthiness-chatbot-confirm-field">
                  <span>Prompt de actualización</span>
                  <textarea
                    onChange={(event) => {
                      setPillarUpdatePrompt(event.target.value);
                    }}
                    placeholder="Indica cómo quieres ajustar el pilar seleccionado..."
                    rows={4}
                    value={pillarUpdatePrompt}
                  />
                </label>

                <div className="trustworthiness-chatbot-confirm-actions">
                  <button
                    className="trustworthiness-chatbot-secondary"
                    onClick={handleClosePillarUpdateModal}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="trustworthiness-chatbot-confirm-primary"
                    onClick={handleConfirmPillarUpdate}
                    type="button"
                  >
                    Confirmar y enviar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isResponding
        ? createPortal(
            <div
              aria-live="polite"
              className="tw-suggestion-toast-layer chat-action-toast-layer"
              role="status"
              style={{ zIndex: props.chatZIndex + 3 }}
            >
              <div className="tw-suggestion-notification is-progress chat-action-toast">
                <span aria-hidden="true">TW</span>
                <div className="tw-suggestion-notification-copy">
                  <strong>Asistente revisando</strong>
                  <p>Actualizando la propuesta del chat.</p>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {saveSuccessToast
        ? createPortal(
            <div
              aria-live="polite"
              className="tw-suggestion-toast-layer chat-action-toast-layer"
              role="status"
              style={{ zIndex: props.chatZIndex + 3 }}
            >
              <div className="tw-suggestion-notification chat-action-toast" key={saveSuccessToast.id}>
                <span aria-hidden="true">OK</span>
                <div className="tw-suggestion-notification-copy">
                  <strong>{saveSuccessToast.title}</strong>
                  <p>{saveSuccessToast.message}</p>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {props.isContextPanelOpen
        ? createPortal(
            <aside
              aria-label="Contexto del chat de revisión"
              className="transcript-side-sheet chat-context-side-sheet"
              data-walkthrough="chatbot-context-panel"
              style={{ zIndex: props.contextZIndex }}
            >
              <div className="transcript-side-sheet-header">
                <div>
                  <span>Contexto del chat</span>
                  <h4>{recordSummary.evaluatedName}</h4>
                  <p>
                    {props.twSuggestion
                      ? `${props.twSuggestion.trustworthiness.percentage} · ${props.twSuggestion.trustworthiness.meaning}`
                      : "Aún no hay contexto generado"}
                  </p>
                </div>
                <button
                  className="trustworthiness-detail-close"
                  onClick={props.onCloseContextPanel}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              <div className="transcript-side-sheet-body chat-context-side-sheet-body">
                <section className="transcript-section">
                  <h5>Base del contexto</h5>
                  <div className="chat-context-summary-grid">
                    <div className="chat-context-summary-item">
                      <span>Talento</span>
                      <strong>{recordSummary.evaluatedName}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Proyecto</span>
                      <strong>{recordSummary.context || "Sin contexto"}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Periodo</span>
                      <strong>{officialPeriodLabel}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Ventana analizada</span>
                      <strong>
                        {props.selectedPeriodCoverage
                          ? `${props.selectedPeriodCoverage.start} → ${props.selectedPeriodCoverage.end}`
                          : "Sin rango cargado"}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="transcript-section">
                  <h5>Salida de Generar TW</h5>
                  {props.twSuggestion ? (
                    <div className="chat-context-summary-grid">
                      <div className="chat-context-summary-item">
                        <span>Meetings usados</span>
                        <strong>{props.twSuggestion.meetingsUsed}</strong>
                      </div>
                      <div className="chat-context-summary-item">
                        <span>Generado</span>
                        <strong>{formatGeneratedAt(props.twSuggestion.generatedAt)}</strong>
                      </div>
                      <div className="chat-context-summary-item">
                        <span>TW sugerido</span>
                        <strong>{props.twSuggestion.trustworthiness.percentage}</strong>
                      </div>
                      <div className="chat-context-summary-item">
                        <span>Confianza</span>
                        <strong>{getConfidenceLabel(props.twSuggestion.trustworthiness.confidence)}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="workspace-response-state">
                      Cuando este flujo cargue Generar TW, aquí se verá el contexto base del chat.
                    </p>
                  )}
                </section>

                <section className="transcript-section">
                  <h5>Pilares incluidos</h5>
                  {props.twSuggestion ? (
                    <div className="chat-context-pillar-list">
                      {Object.entries(props.twSuggestion.pillars).map(([pillarKey, pillar]) => (
                        <article className="chat-context-pillar-card" key={pillarKey}>
                          <div>
                            <strong>{getPillarLabel(pillarKey as SuggestionPillarKey)}</strong>
                            <span>{pillar.points}/10</span>
                          </div>
                          <p>{pillar.shortReason}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="workspace-response-state">Sin pilares cargados todavía.</p>
                  )}
                </section>

                <section className="transcript-section">
                  <h5>Explicación que tendría el chat</h5>
                  <p>
                    {props.twSuggestion?.trustworthiness.explanation ??
                      "Aún no hay explicación disponible para el contexto del chat."}
                  </p>
                </section>

                <section className="transcript-section" data-walkthrough="chatbot-context-meetings">
                  <div className="chat-context-section-header">
                    <h5>Detalle de reuniones</h5>
                    <span>
                      {props.isCoachingContextLoading
                        ? (
                          <span className="workspace-loading-inline-label">
                            <span aria-hidden="true" className="workspace-loading-spinner is-inline" />
                            Cargando...
                          </span>
                        )
                        : props.coachingContextResponse
                          ? `${props.coachingContextResponse.records.length} reuniones`
                          : props.coachingContextError
                            ? "Error"
                            : "Sin datos"}
                    </span>
                  </div>

                  <div className="trustworthiness-context-panel">
                    <div className="trustworthiness-context-summary">
                      <strong>
                        {props.coachingContextResponse
                          ? `${props.coachingContextResponse.records.length} reuniones encontradas`
                          : "Reuniones relacionadas"}
                      </strong>
                      <small>
                        {props.coachingContextError
                          ? props.coachingContextError
                          : props.coachingContextResponse?.filtering.reason ??
                            `${recordSummary.evaluatedEmail ?? "Sin email"} · ${
                              props.selectedPeriodCoverage
                                ? `${props.selectedPeriodCoverage.start} → ${props.selectedPeriodCoverage.end}`
                                : "Sin rango cargado"
                            }`}
                      </small>
                    </div>

                    {props.isCoachingContextLoading ? <LoadingProgress label="Consultando reuniones..." /> : null}

                    {!props.isCoachingContextLoading && props.coachingContextError ? (
                      <p className="workspace-response-error">{props.coachingContextError}</p>
                    ) : null}

                    {!props.isCoachingContextLoading &&
                    !props.coachingContextError &&
                    props.coachingContextResponse &&
                    props.coachingContextResponse.records.length === 0 ? (
                      <div className="trustworthiness-empty-state">
                        <strong>No encontramos reuniones para este talento en el rango cargado.</strong>
                        <p>
                          Este panel usa la misma fuente de reuniones que el detalle de evaluación.
                        </p>
                      </div>
                    ) : null}

                    {!props.isCoachingContextLoading &&
                    !props.coachingContextError &&
                    props.coachingContextResponse &&
                    props.coachingContextResponse.records.length > 0 ? (
                      <div className="trustworthiness-context-list">
                        {props.coachingContextResponse.records.map((meeting) => {
                          const participants = getDisplayParticipants(meeting, recordSummary);

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
                                onClick={() => props.onOpenTranscript(meeting.id)}
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
            </aside>,
            document.body
          )
        : null}

      {props.isAgentConfigPanelOpen
        ? createPortal(
            <aside
              aria-label="Configuración del agente de revisión TW"
              className="transcript-side-sheet chat-agent-config-side-sheet"
              data-walkthrough="chatbot-agent-panel"
              style={{ zIndex: props.agentConfigZIndex }}
            >
              <div className="transcript-side-sheet-header">
                <div>
                  <span>Configuracion del agente</span>
                  <h4>{CHAT_AGENT_CONFIG.name}</h4>
                  <p>
                    {CHAT_AGENT_CONFIG.id} · v{CHAT_AGENT_CONFIG.version} · {CHAT_AGENT_CONFIG.status}
                  </p>
                </div>
                <button
                  className="trustworthiness-detail-close"
                  onClick={props.onCloseAgentConfigPanel}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              <div className="transcript-side-sheet-body chat-agent-config-side-sheet-body">
                <section className="transcript-section">
                  <h5>Rol del agente</h5>
                  <p className="chat-agent-config-description">
                    {CHAT_AGENT_CONFIG.description}
                  </p>
                </section>

                <section className="transcript-section">
                  <h5>Modelo</h5>
                  <div className="chat-context-summary-grid">
                    <div className="chat-context-summary-item">
                      <span>Modelo recomendado</span>
                      <strong>{CHAT_AGENT_CONFIG.model.recommended}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Fallback</span>
                      <strong>{CHAT_AGENT_CONFIG.model.fallback}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Temperatura</span>
                      <strong>{CHAT_AGENT_CONFIG.model.temperature}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Formato</span>
                      <strong>{CHAT_AGENT_CONFIG.model.responseFormat}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Reasoning</span>
                      <strong>{CHAT_AGENT_CONFIG.model.reasoningEffort}</strong>
                    </div>
                    <div className="chat-context-summary-item">
                      <span>Max output</span>
                      <strong>{CHAT_AGENT_CONFIG.model.maxOutputTokens}</strong>
                    </div>
                  </div>
                </section>

                <section className="transcript-section">
                  <h5>Objetivos</h5>
                  <ul className="chat-agent-config-list">
                    {CHAT_AGENT_CONFIG.objectives.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>
                </section>

                <section className="transcript-section">
                  <h5>Reglas</h5>
                  <ul className="chat-agent-config-list">
                    {CHAT_AGENT_CONFIG.guardrails.map((guardrail) => (
                      <li key={guardrail}>{guardrail}</li>
                    ))}
                  </ul>
                </section>

                <section className="transcript-section">
                  <h5>Acciones</h5>
                  <div className="chat-agent-action-list">
                    {CHAT_AGENT_CONFIG.actions.map((action) => (
                      <article className="chat-agent-action-card" key={action.id}>
                        <span>{action.id}</span>
                        <p>{action.description}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </aside>,
            document.body
          )
        : null}
    </>
  );
}
