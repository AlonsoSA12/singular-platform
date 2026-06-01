"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { useWorkspaceUser } from "@/components/workspace-user-context";
import { TrustworthinessSaveConfirmationModal } from "@/components/trustworthiness-workspace/main-sections";
import { TranscriptSideSheet } from "@/components/trustworthiness-workspace/overlays";
import {
  buildDetailGroups,
  calculateTrustworthinessScoreFromProposal,
  createPeriods,
  formatDateValue,
  formatTrustworthinessPercentageFromProposal,
  getCoachingMeetingDatetimeLabel,
  getCoachingMeetingTitle,
  getCoachingUniqueKey,
  getDisplayParticipants,
  getEditablePillarMeaning,
  getPillarLabel,
  getRecordStatus,
  getRecordSummary,
  getSelectedPeriodCoverage,
  getTrustworthinessAssistantFocusPrompt,
  getTrustworthinessAssistantSavePrompt,
  getTrustworthinessMeaningFromScore,
  LoadingProgress,
  normalizeStatusValue,
  renderValue,
  SUGGESTION_PILLAR_CONFIG,
  SuggestionStarEditor
} from "@/components/trustworthiness-workspace/helpers";
import type {
  ChatMessage,
  CoachingContextRecord,
  CoachingContextResponse,
  CoachingTranscriptResponse,
  EditableDraftTarget,
  EditableScoreField,
  RecordGroup,
  SuggestionPillarKey,
  TrustworthinessAssistantChangeSource,
  TrustworthinessAssistantMeeting,
  TrustworthinessAssistantProposal,
  TrustworthinessAssistantStreamEvent,
  TrustworthinessDraft,
  TrustworthinessRecord,
  TrustworthinessRatingStatus,
  TrustworthinessResponse
} from "@/components/trustworthiness-workspace/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DETAIL_STATUS_OPTIONS: TrustworthinessRatingStatus[] = ["Pending", "Done"];

const EMPTY_DRAFT: TrustworthinessDraft = {
  credibilityPoints: null,
  feedback: "",
  groupThinkingPoints: null,
  intimacyPoints: null,
  reliabilityPoints: null
};

function truncateMeetingTitle(title: string, max: number) {
  return title.length > max ? `${title.slice(0, max).trimEnd()}…` : title;
}

function getShortMeetingDate(meeting: CoachingContextRecord): string {
  const raw = meeting.fields.meeting_datetime;
  if (typeof raw !== "string") return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(d);
}

const TW_BOT_MEMORY_LIMIT = 20;
const TW_BOT_CHAT_HISTORY_VERSION = 1;
const TW_BOT_LOCAL_HISTORY_LIMIT = 200;
const TW_BOT_ASSISTANT_MEETING_LIMIT = 8;
const TW_BOT_ASSISTANT_TEXT_LIMIT = 900;
const TW_BOT_ASSISTANT_SHORT_TEXT_LIMIT = 260;
const TW_BOT_AGENT_ID = "tw-bot";
const TW_BOT_AGENT_VERSION = "0.1.0";
const TW_BOT_GREETING_ID = "tw-bot-greeting";

// ─── Local types ──────────────────────────────────────────────────────────────

type PendingPillarUpdate = {
  currentValue: number;
  key: SuggestionPillarKey;
  label: string;
  nextValue: number;
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildHistoryStorageKey(userEmail: string) {
  return `tw-bot-history:v${TW_BOT_CHAT_HISTORY_VERSION}:${userEmail.toLowerCase()}`;
}

function buildConversationHistory(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ content: m.content.trim(), role: m.role }))
    .slice(-TW_BOT_MEMORY_LIMIT);
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isEvaluationPending(record: TrustworthinessRecord) {
  return normalizeStatusValue(getRecordStatus(record)) !== "done";
}

function formatCoverageLabel(c: { start: string; end: string } | null) {
  if (!c) return "Sin rango cargado";
  return `${formatDateValue(c.start)} – ${formatDateValue(c.end)}`;
}

function getChangeSourceLabel(src: TrustworthinessAssistantChangeSource) {
  if (src === "human_override") return "Ajuste aplicado por criterio del evaluador";
  if (src === "mixed") return "Ajuste aplicado con evidencia y criterio humano";
  if (src === "model_evidence") return "Ajuste sugerido por evidencia";
  return "Sin cambios en la propuesta";
}

function createPillarUpdatePrompt(p: { currentValue: number; label: string; nextValue: number }) {
  return [
    `Actualiza ${p.label} a ${p.nextValue}/10.`,
    `Antes estaba en ${p.currentValue}/10.`,
    "Mantén los demás pilares igual por ahora, ajusta el feedback propuesto para reflejar este cambio y explica brevemente el ajuste."
  ].join(" ");
}

function clampPoints(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.max(1, Math.min(10, Math.round(v)))
    : 5;
}

function normalizeProposal(raw: TrustworthinessAssistantProposal): TrustworthinessAssistantProposal {
  return {
    credibilityPoints: clampPoints(raw.credibilityPoints),
    feedback: typeof raw.feedback === "string" ? raw.feedback : "",
    groupThinkingPoints: clampPoints(raw.groupThinkingPoints),
    intimacyPoints: clampPoints(raw.intimacyPoints),
    reliabilityPoints: clampPoints(raw.reliabilityPoints)
  };
}

function getCoachingStr(rec: CoachingContextRecord, f: string) {
  const v = rec.fields[f];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function getCoachingArr(rec: CoachingContextRecord, f: string) {
  const v = rec.fields[f];
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}
function getCoachingScores(rec: CoachingContextRecord) {
  const v = rec.fields.metrics_scores;
  const out: Record<string, number | null> = {};
  if (!isPlainRecord(v)) return out;
  for (const [k, s] of Object.entries(v)) {
    out[k] = typeof s === "number" && Number.isFinite(s) ? s : null;
  }
  return out;
}
function truncText(v: string | null | undefined, lim = TW_BOT_ASSISTANT_TEXT_LIMIT) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length <= lim ? s || null : `${s.slice(0, lim).trimEnd()}...`;
}
function compactArr(vals: string[], lim: number, textLim = TW_BOT_ASSISTANT_SHORT_TEXT_LIMIT) {
  return vals.map((x) => truncText(x, textLim)).filter((x): x is string => Boolean(x)).slice(0, lim);
}

function buildAssistantMeetings(ctx: CoachingContextResponse | null): TrustworthinessAssistantMeeting[] {
  if (!ctx) return [];
  return ctx.records.slice(0, TW_BOT_ASSISTANT_MEETING_LIMIT).map((rec) => {
    const rawScores = getCoachingScores(rec);
    return {
      actionItems: compactArr(getCoachingArr(rec, "action_items"), 5),
      coachingAnalysis: truncText(getCoachingStr(rec, "coaching_analysis")),
      coachingSummary: truncText(getCoachingStr(rec, "coaching_summary")),
      meetingDatetime: getCoachingStr(rec, "meeting_datetime"),
      meetingId: rec.id,
      metricsScores: Object.fromEntries(
        Object.entries(rawScores).filter(([, s]) => typeof s === "number").slice(0, 12)
      ) as Record<string, number | null>,
      title: (getCoachingStr(rec, "meeting_title") ?? "Reunión sin título").slice(0, TW_BOT_ASSISTANT_SHORT_TEXT_LIMIT),
      topics: compactArr(getCoachingArr(rec, "topics"), 8, 120),
      transcriptSummary: truncText(getCoachingStr(rec, "transcript_summary"))
    };
  });
}

function isStreamEvent(v: unknown): v is TrustworthinessAssistantStreamEvent {
  return isPlainRecord(v) && typeof v.type === "string";
}

function getFinalReply(event: TrustworthinessAssistantStreamEvent) {
  if (event.type !== "assistant_structured_final") return null;
  if (
    typeof event.changeSource !== "string" ||
    (typeof event.evidenceQuestion !== "string" && event.evidenceQuestion !== null) ||
    typeof event.message !== "string" ||
    typeof event.needsOptionalEvidence !== "boolean" ||
    !isPlainRecord(event.proposal) ||
    typeof event.proposalChanged !== "boolean" ||
    !Array.isArray(event.citations) ||
    typeof event.sessionId !== "string"
  ) return null;
  return { ...event, ok: true as const };
}

function readHistory(key: string): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!isPlainRecord(p) || p.version !== TW_BOT_CHAT_HISTORY_VERSION || !Array.isArray(p.messages)) return [];
    return (p.messages as unknown[])
      .filter((m): m is ChatMessage =>
        isPlainRecord(m) &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.id === "string" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
      )
      .slice(-TW_BOT_LOCAL_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeHistory(key: string, messages: ChatMessage[]) {
  const save = messages
    .filter((m) => m.id !== TW_BOT_GREETING_ID && m.content.trim().length > 0)
    .map((m) => ({ ...m, content: m.content.trim() }))
    .slice(-TW_BOT_LOCAL_HISTORY_LIMIT);
  if (!save.length) return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ messages: save, version: TW_BOT_CHAT_HISTORY_VERSION }));
  } catch { /* best-effort */ }
}

// ─── renderChatMarkdown ───────────────────────────────────────────────────────

function renderInlineMd(text: string, kp: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let idx = 0;
  for (const m of text.matchAll(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)) {
    const mi = m.index ?? 0;
    const tok = m[0];
    if (mi > cursor) nodes.push(text.slice(cursor, mi));
    if (tok.startsWith("`"))       nodes.push(<code key={`${kp}-c-${idx}`}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("**")) nodes.push(<strong key={`${kp}-b-${idx}`}>{tok.slice(2, -2)}</strong>);
    else                           nodes.push(<em key={`${kp}-e-${idx}`}>{tok.slice(1, -1)}</em>);
    cursor = mi + tok.length;
    idx++;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderChatMarkdown(content: string): ReactNode {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let pLines: string[] = [];
  let uItems: string[] = [];
  let oItems: string[] = [];

  const flushP = () => {
    if (!pLines.length) return;
    const i = blocks.length;
    blocks.push(<p key={`p-${i}`}>{renderInlineMd(pLines.join(" "), `p-${i}`)}</p>);
    pLines = [];
  };
  const flushU = () => {
    if (!uItems.length) return;
    const i = blocks.length;
    blocks.push(<ul key={`ul-${i}`}>{uItems.map((it, j) => <li key={j}>{renderInlineMd(it, `ul-${i}-${j}`)}</li>)}</ul>);
    uItems = [];
  };
  const flushO = () => {
    if (!oItems.length) return;
    const i = blocks.length;
    blocks.push(<ol key={`ol-${i}`}>{oItems.map((it, j) => <li key={j}>{renderInlineMd(it, `ol-${i}-${j}`)}</li>)}</ol>);
    oItems = [];
  };
  const flushAll = () => { flushU(); flushO(); };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushP(); flushAll(); continue; }
    const hm = /^#{1,3}\s+(.+)$/.exec(line);
    const um = /^[-*]\s+(.+)$/.exec(line);
    const om = /^\d+[.)]\s+(.+)$/.exec(line);
    if (hm) {
      flushP(); flushAll();
      const i = blocks.length;
      blocks.push(<strong className="trustworthiness-chatbot-markdown-heading" key={`h-${i}`}>{renderInlineMd(hm[1], `h-${i}`)}</strong>);
    } else if (um) { flushP(); flushO(); uItems.push(um[1]); }
    else if (om)   { flushP(); flushU(); oItems.push(om[1]); }
    else           { flushAll(); pLines.push(line); }
  }
  flushP(); flushAll();
  return <div className="trustworthiness-chatbot-markdown">{blocks}</div>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TwBotWorkspace() {
  const { userEmail } = useWorkspaceUser();

  // context
  const [contextStatus, setContextStatus] = useState<"loading" | "ready" | "error">("loading");
  const [contextError, setContextError] = useState<string | null>(null);
  const [pendingRecords, setPendingRecords] = useState<TrustworthinessRecord[]>([]);
  const [coachingContexts, setCoachingContexts] = useState<Record<string, CoachingContextResponse>>({});
  const [selectedRecordId, setSelectedRecordId] = useState("");

  // chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState("");
  const [streamingDecisionTrace, setStreamingDecisionTrace] = useState<string[]>([]);
  const [showStreamingFallback, setShowStreamingFallback] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // session / proposal
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<TrustworthinessAssistantProposal | null>(null);
  const [isSaveReady, setIsSaveReady] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastProposalChanged, setLastProposalChanged] = useState(false);
  const [lastChangeSource, setLastChangeSource] = useState<TrustworthinessAssistantChangeSource>("none");

  // detail panel draft
  const [detailDraft, setDetailDraft] = useState<TrustworthinessDraft | null>(null);

  // pillar update modal
  const [pendingPillarUpdate, setPendingPillarUpdate] = useState<PendingPillarUpdate | null>(null);
  const [pillarUpdatePrompt, setPillarUpdatePrompt] = useState("");

  // save confirmation modal
  const [isSaveConfirmationOpen, setIsSaveConfirmationOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveConfirmationError, setSaveConfirmationError] = useState<string | null>(null);

  // transcript
  const [selectedTranscriptMeetingId, setSelectedTranscriptMeetingId] = useState<string | null>(null);
  const [transcriptResponse, setTranscriptResponse] = useState<CoachingTranscriptResponse | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);

  // ui panels & collapsible sections
  const [isSectionPropostaOpen, setIsSectionPropostaOpen] = useState(true);
  const [isSectionEvaluacionOpen, setIsSectionEvaluacionOpen] = useState(false);
  const [isSectionReunionesOpen, setIsSectionReunionesOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isAgentConfigOpen, setIsAgentConfigOpen] = useState(false);
  const [showAllMeetings, setShowAllMeetings] = useState(false);

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const storageKey = userEmail ? buildHistoryStorageKey(userEmail) : null;

  const periodOptions = createPeriods();
  const periodCoverage = getSelectedPeriodCoverage(periodOptions.slice(0, 1));
  const officialPeriodLabel = formatCoverageLabel(periodCoverage);

  const selectedRecord = pendingRecords.find((r) => r.id === selectedRecordId) ?? null;
  const selectedRecordSummary = selectedRecord ? getRecordSummary(selectedRecord) : null;
  const selectedCoachingContext = selectedRecordId ? (coachingContexts[selectedRecordId] ?? null) : null;

  const canUseAssistant =
    contextStatus === "ready" &&
    Boolean(selectedRecordId) &&
    !isResponding &&
    !isSaving &&
    !isSaved;

  const canInteractWithSaveConfirmation =
    Boolean(proposal) && !isResponding && !isSaving && !isSaved;

  const proposalScore = proposal ? calculateTrustworthinessScoreFromProposal(proposal) : null;
  const proposalPercentage = proposal ? formatTrustworthinessPercentageFromProposal(proposal) : null;
  const proposalMeaning = proposalScore !== null ? getTrustworthinessMeaningFromScore(proposalScore) : null;

  const proposalStatusLabel = isSaving
    ? "Guardando..."
    : isSaved ? "Guardado"
    : isSaveReady ? "Lista para guardar"
    : lastProposalChanged ? getChangeSourceLabel(lastChangeSource)
    : "Pendiente por guardar";

  const proposalStatusColor = isSaved
    ? "rgba(147,197,253,0.9)"
    : isSaveReady ? "rgba(134,239,172,0.9)"
    : lastProposalChanged ? "rgba(251,191,36,0.8)"
    : "rgba(255,255,255,0.35)";

  const proposalStatusBorder = isSaved
    ? "1px solid rgba(147,197,253,0.25)"
    : isSaveReady ? "1px solid rgba(134,239,172,0.25)"
    : lastProposalChanged ? "1px solid rgba(251,191,36,0.2)"
    : "1px solid rgba(255,255,255,0.1)";

  const suggestedSaveStatus: TrustworthinessRatingStatus =
    (selectedRecordSummary?.status ?? "").toLowerCase() === "done" ? "Done" : "Pending";

  const selectedRecordGroups: RecordGroup[] = selectedRecord
    ? buildDetailGroups(selectedRecord, {
        aiSuggestions: {},
        draft: detailDraft,
        editable: true,
        feedbackGenerationError: null,
        feedbackRequiredError: null,
        isDirty: isDetailDraftDirty,
        isGeneratingFeedback: false,
        onDiscard: handleDetailDiscard,
        onFeedbackChange: (value) =>
          setDetailDraft((prev) => ({ ...(prev ?? EMPTY_DRAFT), feedback: value })),
        onGenerateFeedback: () => {},
        onPointsChange: handleDetailPointsChange
      })
    : [];

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!periodCoverage) {
        setContextStatus("error");
        setContextError("No fue posible determinar el período actual.");
        return;
      }
      setContextStatus("loading");
      setContextError(null);

      try {
        const url = new URL("/api/trustworthiness", window.location.origin);
        url.searchParams.append("period", periodOptions[0].id);
        const res = await fetch(url, { cache: "no-store" });
        const payload = (await res.json()) as TrustworthinessResponse | { message?: string };
        if (!res.ok) throw new Error(("message" in payload ? payload.message : null) ?? "Error consultando TW.");

        const all = (payload as TrustworthinessResponse).records;
        const pending = all.filter(isEvaluationPending);
        if (!alive) return;
        setPendingRecords(pending);

        const ctxMap: Record<string, CoachingContextResponse> = {};
        await Promise.allSettled(
          pending.map(async (rec) => {
            const s = getRecordSummary(rec);
            const email = s.evaluatedEmail?.trim().toLowerCase();
            if (!email) return;
            const cu = new URL("/api/trustworthiness/coaching-context", window.location.origin);
            cu.searchParams.set("participantEmail", email);
            cu.searchParams.set("start", periodCoverage.start);
            cu.searchParams.set("end", periodCoverage.end);
            const cr = await fetch(cu, { cache: "no-store" });
            if (!cr.ok || !alive) return;
            const cp = (await cr.json()) as { ok?: boolean } & Partial<CoachingContextResponse>;
            if (alive && cp.ok === true && Array.isArray(cp.records)) ctxMap[rec.id] = cp as CoachingContextResponse;
          })
        );

        if (!alive) return;
        setCoachingContexts(ctxMap);

        const names = pending.map((r) => getRecordSummary(r).evaluatedName);
        const greetContent = names.length === 0
          ? "No encontré evaluaciones pendientes para el período actual. ¡Todo está al día!"
          : `Cargué el contexto de ${names.length} evaluación${names.length > 1 ? "es" : ""} pendiente${names.length > 1 ? "s" : ""}: **${names.join(", ")}**. ¿Quieres que revisemos las evaluaciones pendientes?`;

        const greeting: ChatMessage = { content: greetContent, id: TW_BOT_GREETING_ID, role: "assistant" };
        const stored = storageKey ? readHistory(storageKey) : [];
        setMessages([greeting, ...stored]);

        if (pending.length === 1) setSelectedRecordId(pending[0].id);
        setContextStatus("ready");
      } catch (e) {
        if (!alive) return;
        setContextStatus("error");
        setContextError(e instanceof Error ? e.message : "No fue posible cargar el contexto.");
      }
    }

    void load();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  useEffect(() => {
    if (!storageKey || !messages.length) return;
    writeHistory(storageKey, messages);
  }, [messages, storageKey]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, streamingAssistantMessage, isSaveReady, isSaveConfirmationOpen]);

  useEffect(() => {
    setDetailDraft(null);
    setAgentSessionId(null);
    setProposal(null);
    setIsSaveReady(false);
    setIsSaved(false);
    setLastProposalChanged(false);
    setLastChangeSource("none");
    setChatError(null);
    setSaveConfirmationError(null);
    setIsSaveConfirmationOpen(false);
    setPendingPillarUpdate(null);
    setPillarUpdatePrompt("");
  }, [selectedRecordId]);

  useEffect(() => {
    if (!isResponding || streamingAssistantMessage.trim().length > 0) {
      setShowStreamingFallback(false);
      return;
    }
    const t = window.setTimeout(() => setShowStreamingFallback(true), 400);
    return () => window.clearTimeout(t);
  }, [isResponding, streamingAssistantMessage]);

  useEffect(() => {
    if (!selectedTranscriptMeetingId) {
      setTranscriptResponse(null);
      setTranscriptError(null);
      setIsTranscriptLoading(false);
      return;
    }

    const email = selectedRecordSummary?.evaluatedEmail;
    if (!email || !periodCoverage) {
      setTranscriptError("No hay contexto suficiente para consultar el transcript.");
      return;
    }

    let isActive = true;
    const meetingId = selectedTranscriptMeetingId;

    async function loadTranscript() {
      setIsTranscriptLoading(true);
      setTranscriptError(null);
      try {
        const url = new URL(
          `/api/trustworthiness/coaching-context/${encodeURIComponent(meetingId)}/transcript`,
          window.location.origin
        );
        url.searchParams.set("start", periodCoverage!.start);
        url.searchParams.set("end", periodCoverage!.end);
        url.searchParams.set("participantEmail", email);

        const response = await fetch(url, { cache: "no-store" });
        const payload = (await response.json()) as CoachingTranscriptResponse | { message?: string };

        if (!response.ok) {
          const message = "message" in payload ? payload.message : undefined;
          throw new Error(message ?? "No fue posible consultar el transcript de la reunión.");
        }

        if (isActive) setTranscriptResponse(payload as CoachingTranscriptResponse);
      } catch (e) {
        if (!isActive) return;
        setTranscriptResponse(null);
        setTranscriptError(e instanceof Error ? e.message : "No fue posible consultar el transcript.");
      } finally {
        if (isActive) setIsTranscriptLoading(false);
      }
    }

    void loadTranscript();
    return () => { isActive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTranscriptMeetingId, selectedRecordSummary?.evaluatedEmail, periodCoverage?.start, periodCoverage?.end]);

  // ─── Session ────────────────────────────────────────────────────────────────

  async function createSession(ap: TrustworthinessAssistantProposal) {
    if (!selectedRecordId || !selectedRecordSummary || !periodCoverage)
      throw new Error("Falta contexto para preparar la sesión.");
    const email = selectedRecordSummary.evaluatedEmail;
    if (!email) throw new Error("Falta el email del talento.");

    const meetings = buildAssistantMeetings(selectedCoachingContext);
    const r = await fetch(`/api/trustworthiness/${encodeURIComponent(selectedRecordId)}/assistant/session`, {
      body: JSON.stringify({
        end: periodCoverage.end,
        evaluatedName: selectedRecordSummary.evaluatedName,
        meetings,
        participantEmail: email,
        projectContext: selectedRecordSummary.context || null,
        proposal: ap,
        roleLabel: selectedRecordSummary.roleLabel || null,
        start: periodCoverage.start
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    const p = (await r.json()) as unknown;
    if (!r.ok || !isPlainRecord(p) || typeof p.sessionId !== "string") {
      throw new Error((isPlainRecord(p) && typeof p.message === "string" ? p.message : null) ?? "No fue posible preparar la sesión.");
    }
    setAgentSessionId(p.sessionId);
    return p.sessionId;
  }

  async function ensureSession(ap: TrustworthinessAssistantProposal) {
    return agentSessionId ?? createSession(ap);
  }

  function buildRehydrate(ap: TrustworthinessAssistantProposal) {
    if (!selectedRecordSummary?.evaluatedEmail || !periodCoverage) return undefined;
    return {
      end: periodCoverage.end,
      evaluatedName: selectedRecordSummary.evaluatedName,
      evaluatorEmail: userEmail ?? "",
      history: buildConversationHistory(messages),
      meetings: buildAssistantMeetings(selectedCoachingContext),
      participantEmail: selectedRecordSummary.evaluatedEmail.toLowerCase(),
      projectContext: selectedRecordSummary.context || null,
      proposal: ap,
      roleLabel: selectedRecordSummary.roleLabel || null,
      start: periodCoverage.start
    };
  }

  // ─── Stream ─────────────────────────────────────────────────────────────────

  async function readStream(response: Response) {
    if (!response.body) throw new Error("El asistente no devolvió un stream válido.");
    const reader = response.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let finalReply: ReturnType<typeof getFinalReply> = null;
    let expired = false;

    const processLine = async (line: string) => {
      const t = line.trim();
      if (!t) return;
      const ev = JSON.parse(t) as unknown;
      if (!isStreamEvent(ev)) return;
      if (ev.type === "assistant_text_delta") { setStreamingAssistantMessage((s) => `${s}${ev.delta}`); return; }
      if (ev.type === "decision_trace_delta") { setStreamingDecisionTrace((s) => [...s, ev.delta].slice(-5)); return; }
      if (ev.type === "error") { if (ev.code === "SESSION_EXPIRED") { expired = true; return; } throw new Error(ev.message); }
      const fr = getFinalReply(ev);
      if (fr) finalReply = fr;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) await processLine(l);
    }
    if (buf.trim()) await processLine(buf);
    if (expired) return { sessionExpired: true as const };
    if (!finalReply) throw new Error("El asistente no devolvió respuesta final.");
    return { sessionExpired: false as const, reply: finalReply };
  }

  async function callStream(prompt: string, sid: string, rehydrate: ReturnType<typeof buildRehydrate>) {
    const r = await fetch(`/api/trustworthiness/${encodeURIComponent(selectedRecordId)}/assistant/message/stream`, {
      body: JSON.stringify({ prompt, rehydrate, sessionId: sid }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    if (!r.ok) {
      const ep = await r.json().catch(() => null) as { message?: string } | null;
      throw new Error(ep?.message ?? "No fue posible iniciar el stream.");
    }
    return readStream(r);
  }

  // ─── Send message ───────────────────────────────────────────────────────────

  async function sendAssistantMessage(userMessage: string) {
    if (!canUseAssistant || !userMessage.trim()) return;

    const trimmed = userMessage.trim();
    const ap = proposal ?? { credibilityPoints: 5, feedback: "", groupThinkingPoints: 5, intimacyPoints: 5, reliabilityPoints: 5 };

    setDraftMessage("");
    setChatError(null);
    setStreamingAssistantMessage("");
    setStreamingDecisionTrace([]);
    setShowStreamingFallback(false);
    setIsResponding(true);
    setSaveConfirmationError(null);
    setIsSaveReady(false);
    setMessages((prev) => [...prev, { content: trimmed, id: createMessageId(), role: "user" }]);

    try {
      let sid = await ensureSession(ap);
      let reh = buildRehydrate(ap);
      let res = await callStream(trimmed, sid, reh);

      if (res.sessionExpired) {
        setAgentSessionId(null);
        sid = await createSession(ap);
        reh = buildRehydrate(ap);
        res = await callStream(trimmed, sid, reh);
      }

      if (res.sessionExpired || !res.reply) throw new Error("El asistente no devolvió respuesta válida.");

      const { reply } = res;
      setAgentSessionId(reply.sessionId);
      const nextProposal = normalizeProposal(reply.proposal);
      setProposal(nextProposal);
      setLastProposalChanged(reply.proposalChanged);
      setLastChangeSource(reply.changeSource);
      setIsSaveReady(reply.nextIntent === "save");
      setIsSaved(false);
      setMessages((prev) => [
        ...prev,
        {
          changeSource: reply.changeSource,
          citations: reply.citations,
          content: reply.message,
          decisionTrace: reply.decisionTrace ?? [],
          evidenceQuestion: reply.evidenceQuestion,
          focusArea: reply.focusArea,
          id: createMessageId(),
          intent: reply.nextIntent,
          needsOptionalEvidence: reply.needsOptionalEvidence,
          role: "assistant"
        }
      ]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "No fue posible continuar la conversación.");
    } finally {
      setIsResponding(false);
      setStreamingAssistantMessage("");
      setStreamingDecisionTrace([]);
      setShowStreamingFallback(false);
    }
  }

  function handleSubmit() { void sendAssistantMessage(draftMessage); }

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (canUseAssistant && draftMessage.trim()) handleSubmit();
  }

  function handleFocusPrompt(focus: SuggestionPillarKey | "feedback") {
    void sendAssistantMessage(getTrustworthinessAssistantFocusPrompt(focus));
  }

  function handlePrepareSave() {
    void sendAssistantMessage(getTrustworthinessAssistantSavePrompt());
  }

  // ─── Pillar update ──────────────────────────────────────────────────────────

  function handlePillarScoreSelect(p: { currentValue: number; key: SuggestionPillarKey; label: string; nextValue: number }) {
    if (!canUseAssistant || p.currentValue === p.nextValue) return;
    setPendingPillarUpdate(p);
    setPillarUpdatePrompt(createPillarUpdatePrompt(p));
    setChatError(null);
  }

  function handleClosePillarUpdateModal() { setPendingPillarUpdate(null); setPillarUpdatePrompt(""); }

  function handleConfirmPillarUpdate() {
    const prompt = pillarUpdatePrompt.trim();
    if (!pendingPillarUpdate || !prompt) { setChatError("Escribe el prompt de actualización antes de continuar."); return; }
    handleClosePillarUpdateModal();
    void sendAssistantMessage(prompt);
  }

  // ─── Save ───────────────────────────────────────────────────────────────────

  function handleOpenSaveConfirmation() {
    if (!canInteractWithSaveConfirmation) return;
    setIsSaveConfirmationOpen(true);
    setChatError(null);
    setSaveConfirmationError(null);
  }

  function handleCloseSaveConfirmation() { setIsSaveConfirmationOpen(false); setSaveConfirmationError(null); }
  function handleDiscardSaveConfirmation() { setIsSaveConfirmationOpen(false); setIsSaveReady(false); setChatError(null); setSaveConfirmationError(null); }

  async function persistProposal(toSave: TrustworthinessAssistantProposal, status: TrustworthinessRatingStatus) {
    if (!selectedRecordId || !selectedRecordSummary || !periodCoverage) { setSaveConfirmationError("Falta contexto para guardar."); return; }
    const email = selectedRecordSummary.evaluatedEmail;
    if (!email) { setSaveConfirmationError("Falta el email del talento."); return; }

    setIsSaving(true);
    setSaveConfirmationError(null);
    try {
      const r = await fetch(`/api/trustworthiness/${encodeURIComponent(selectedRecordId)}/assistant/save`, {
        body: JSON.stringify({
          agentId: TW_BOT_AGENT_ID,
          agentVersion: TW_BOT_AGENT_VERSION,
          confirmedByUser: true,
          context: { end: periodCoverage.end, meetingsCount: selectedCoachingContext?.records.length ?? 0, participantEmail: email, recordId: selectedRecordId, start: periodCoverage.start },
          proposal: toSave,
          ratingStatus: status,
          twSuggestion: null
        }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const p = (await r.json()) as { ok?: boolean; message?: string };
      if (!r.ok || !p.ok) throw new Error(p.message ?? "No fue posible guardar.");

      setIsSaved(true);
      setIsSaveReady(false);
      setLastProposalChanged(false);
      setLastChangeSource("none");
      setIsSaveConfirmationOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          content: status === "Done"
            ? "La propuesta fue guardada con status Done. Los puntajes y el feedback quedaron actualizados."
            : "La propuesta fue guardada como Draft. Los puntajes y el feedback quedaron actualizados, pero la evaluación sigue en Pending.",
          id: createMessageId(),
          role: "assistant"
        }
      ]);
    } catch (e) {
      setSaveConfirmationError(e instanceof Error ? e.message : "No fue posible guardar la evaluación.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmSave(status: TrustworthinessRatingStatus) {
    if (!proposal) { setSaveConfirmationError("Falta la propuesta activa para guardar."); return; }
    await persistProposal(proposal, status);
  }

  // ─── Detail draft handlers ──────────────────────────────────────────────────

  function handleDetailPointsChange(field: EditableScoreField, value: number) {
    setDetailDraft((prev) => ({ ...(prev ?? EMPTY_DRAFT), [field]: value }));
  }

  function handleDetailDiscard(target: EditableDraftTarget) {
    setDetailDraft((prev) => {
      if (!prev) return null;
      const next = { ...prev, [target]: target === "feedback" ? "" : null };
      const hasAny = Object.entries(next).some(([k, v]) => k === "feedback" ? Boolean(v) : v !== null);
      return hasAny ? next : null;
    });
  }

  function isDetailDraftDirty(target: EditableDraftTarget) {
    if (!detailDraft) return false;
    if (target === "feedback") return Boolean(detailDraft.feedback);
    return detailDraft[target] !== null;
  }

  // ─── Export ─────────────────────────────────────────────────────────────────

  function handleExportChat() {
    if (!selectedRecordSummary || typeof document === "undefined") return;
    const lines = [
      `# Chat de revision TW - ${selectedRecordSummary.evaluatedName}`,
      "",
      `Exportado: ${new Date().toISOString()}`,
      `Agente: TW Bot (${TW_BOT_AGENT_ID} v${TW_BOT_AGENT_VERSION})`,
      `Talento: ${selectedRecordSummary.evaluatedName}`,
      `Rol: ${selectedRecordSummary.roleLabel}`,
      `Periodo: ${officialPeriodLabel}`,
      `Estado: ${isSaved ? "Guardado" : "No guardado"}`,
      "",
      "## Propuesta activa",
      ""
    ];
    if (proposal) {
      lines.push(
        `Reliability: ${proposal.reliabilityPoints}/10`,
        `Intimacy: ${proposal.intimacyPoints}/10`,
        `Group Thinking: ${proposal.groupThinkingPoints}/10`,
        `Credibility: ${proposal.credibilityPoints}/10`,
        "", "Feedback:", proposal.feedback
      );
    } else {
      lines.push("Sin propuesta activa.");
    }
    lines.push("", "## Conversacion", "");
    for (const m of messages) {
      lines.push(`### ${m.role === "assistant" ? "Asistente TW" : "Tu"}`, "", m.content, "");
    }
    const content = `${lines.join("\n")}\n`;
    const slug = selectedRecordSummary.evaluatedName
      .trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    const filename = `chat-tw-${slug || "talento"}-${new Date().toISOString().slice(0, 10)}.md`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ─── Clear history ──────────────────────────────────────────────────────────

  function clearHistory() {
    if (storageKey) try { window.localStorage.removeItem(storageKey); } catch { /* ok */ }
    setMessages((prev) => prev.filter((m) => m.id === TW_BOT_GREETING_ID));
    setProposal(null);
    setDetailDraft(null);
    setAgentSessionId(null);
    setIsSaveReady(false);
    setIsSaved(false);
    setLastProposalChanged(false);
    setLastChangeSource("none");
    setChatError(null);
    setSaveConfirmationError(null);
    setIsSaveConfirmationOpen(false);
    setPendingPillarUpdate(null);
    setPillarUpdatePrompt("");
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const sectionHeaderStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", padding: "12px 20px", background: "none", border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer",
    color: "inherit", textAlign: "left"
  };
  const sectionLabelStyle: React.CSSProperties = {
    fontSize: "11px", letterSpacing: "0.08em",
    textTransform: "uppercase", opacity: 0.45, fontWeight: 600,
    borderLeft: "2px solid rgba(79,109,200,0.6)", paddingLeft: "8px"
  };
  const metaLabelStyle: React.CSSProperties = {
    fontSize: "11px", opacity: 0.4, marginBottom: "3px",
    textTransform: "uppercase", letterSpacing: "0.05em"
  };
  const metaValueStyle: React.CSSProperties = { fontSize: "13px", fontWeight: 500 };
  const quickBtnBase: React.CSSProperties = {
    padding: "6px 14px", borderRadius: "20px", fontSize: "12px",
    cursor: "pointer", color: "inherit", border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)", whiteSpace: "nowrap"
  };

  return (
    <div
      className="tw-bot-workspace"
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* ── Control bar ── */}
      <div className="okr-bot-project-panel">
        <label className="client-okrs-project-filter">
          <span>Evaluación</span>
          <select
            aria-label="Evaluación activa"
            disabled={contextStatus !== "ready" || !pendingRecords.length}
            onChange={(e) => setSelectedRecordId(e.target.value)}
            value={selectedRecordId}
          >
            <option value="">
              {contextStatus === "loading" ? "Cargando evaluaciones..."
                : !pendingRecords.length ? "Sin evaluaciones pendientes"
                : "Selecciona una evaluación"}
            </option>
            {pendingRecords.map((r) => {
              const s = getRecordSummary(r);
              return <option key={r.id} value={r.id}>{s.evaluatedName}</option>;
            })}
          </select>
        </label>

        <div className="okr-bot-context-controls">
          <button
            aria-label="Limpiar historial del chat"
            className="okr-bot-clear-chat-button"
            disabled={messages.length <= 1 || isResponding}
            onClick={clearHistory}
            title="Limpiar historial"
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 12a8 8 0 0 1 13.66-5.66" />
              <path d="M18 3v4h-4" />
              <path d="M20 12a8 8 0 0 1-13.66 5.66" />
              <path d="M6 21v-4h4" />
            </svg>
          </button>

          <button
            aria-label="Exportar chat"
            className="trustworthiness-chatbot-icon"
            disabled={messages.length <= 1}
            onClick={handleExportChat}
            title="Exportar chat"
            type="button"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 17a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V18a1 1 0 0 1 1-1Z" />
            </svg>
          </button>

          <button
            aria-label="Contexto del chat"
            className="trustworthiness-chatbot-icon"
            onClick={() => setIsContextPanelOpen(true)}
            title="Contexto del chat"
            type="button"
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h3a2 2 0 0 1 1.4.57l.86.86a1 1 0 0 0 .7.29h5.04A2.5 2.5 0 0 1 20 8.22v9.28A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z" />
            </svg>
          </button>

          <button
            aria-label="Configuración del agente"
            className="trustworthiness-chatbot-icon"
            onClick={() => setIsAgentConfigOpen(true)}
            title="Configuración del agente"
            type="button"
          >
            <svg viewBox="0 0 24 24">
              <path d="M11 2.75a1 1 0 0 1 2 0V4h2.75A3.25 3.25 0 0 1 19 7.25v6.5A3.25 3.25 0 0 1 15.75 17h-7.5A3.25 3.25 0 0 1 5 13.75v-6.5A3.25 3.25 0 0 1 8.25 4H11V2.75ZM9.5 9.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-4 3.5h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5Z" />
            </svg>
          </button>

          <button
            aria-label={isSaved ? "Evaluación guardada" : "Guardar evaluación"}
            className="trustworthiness-chatbot-icon is-primary-action"
            disabled={!canInteractWithSaveConfirmation}
            onClick={handleOpenSaveConfirmation}
            title={isSaved ? "Evaluación guardada" : "Guardar evaluación"}
            type="button"
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 3h11.2a2 2 0 0 1 1.42.59l2.79 2.79A2 2 0 0 1 21 7.8V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 2v5h8V5H7Zm10 14v-6H7v6h10Z" />
            </svg>
          </button>

          <div className={`okr-bot-context-status${contextStatus === "ready" ? " is-ready" : ""}`}>
            <span>Contexto</span>
            <strong>
              {contextStatus === "loading" ? "Cargando..."
                : contextStatus === "error" ? "Error"
                : !selectedRecordId ? "Selecciona evaluación"
                : "Listo"}
            </strong>
          </div>
        </div>
      </div>

      {contextStatus === "error" && contextError ? (
        <div className="client-okrs-project-error">
          <p>{contextError}</p>
          <button className="okr-bot-clear-chat-button" onClick={() => window.location.reload()} type="button">
            Reintentar
          </button>
        </div>
      ) : null}

      {/* ── Body ── */}
      <div style={{ display: "flex", flexDirection: "row", flex: 1, overflow: "hidden" }}>

        {/* ── Left: detail panel ── */}
        <div style={{ width: "400px", flexShrink: 0, overflowY: "auto", background: "rgba(255,255,255,0.025)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          {selectedRecord && selectedRecordSummary ? (
            <>
              {/* Persona header */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "20px 20px 16px" }}>
                {selectedRecordSummary.avatarUrl ? (
                  <img
                    alt={`Foto de ${selectedRecordSummary.evaluatedName}`}
                    src={selectedRecordSummary.avatarUrl}
                    style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg fill="rgba(255,255,255,0.4)" style={{ width: "22px", height: "22px" }} viewBox="0 0 24 24">
                      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.87 0-7 2.24-7 5v1h14v-1c0-2.76-3.13-5-7-5Z" />
                    </svg>
                  </span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "11px", opacity: 0.4, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "3px" }}>Detalle de evaluación</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedRecordSummary.evaluatedName}</div>
                  {selectedRecordSummary.evaluatedEmail ? (
                    <div style={{ fontSize: "12px", opacity: 0.45, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedRecordSummary.evaluatedEmail}</div>
                  ) : null}
                </div>
              </div>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

              {/* Section 1: PROPUESTA */}
              <button onClick={() => setIsSectionPropostaOpen((p) => !p)} style={sectionHeaderStyle} type="button">
                <span style={sectionLabelStyle}>Propuesta</span>
                <span style={{ opacity: 0.35, fontSize: "11px" }}>{isSectionPropostaOpen ? "▾" : "▸"}</span>
              </button>

              {isSectionPropostaOpen ? (
                <div>
                  {proposal ? (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", margin: "12px 16px 10px", padding: "16px", background: "rgba(79,109,200,0.08)", border: "1px solid rgba(79,109,200,0.18)", borderRadius: "10px" }}>
                        <div>
                          <div style={{ fontSize: "32px", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>{proposalPercentage ?? "—"}</div>
                          {proposalMeaning ? <div style={{ fontSize: "12px", opacity: 0.55, marginTop: "5px" }}>{proposalMeaning}</div> : null}
                        </div>
                        <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "20px", border: proposalStatusBorder, color: proposalStatusColor, whiteSpace: "nowrap", marginTop: "4px" }}>
                          {proposalStatusLabel}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "0 16px" }}>
                        {SUGGESTION_PILLAR_CONFIG.map((pillar) => {
                          const value = proposal[pillar.draftField];
                          return (
                            <div key={pillar.key} style={{ background: "rgba(79,109,200,0.12)", border: "1px solid rgba(79,109,200,0.25)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px" }}>
                              <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.45, marginBottom: "6px" }}>{pillar.label}</div>
                              <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1, marginBottom: "8px" }}>{value}/10</div>
                              <SuggestionStarEditor
                                disabled={!canUseAssistant || pendingPillarUpdate !== null}
                                onChange={(nextValue) => handlePillarScoreSelect({ currentValue: value, key: pillar.key, label: pillar.label, nextValue })}
                                value={value}
                              />
                              <div style={{ fontSize: "12px", opacity: 0.55, marginTop: "6px", lineHeight: 1.4 }}>{getEditablePillarMeaning(pillar.key, value)}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ margin: "10px 16px 20px", padding: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px" }}>
                        <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.45, marginBottom: "8px", fontWeight: 600 }}>Feedback</div>
                        <p style={{ fontSize: "13px", lineHeight: "1.65", color: "rgba(255,255,255,0.72)", margin: 0 }}>{proposal.feedback}</p>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: "28px 20px", textAlign: "center" }}>
                      <p style={{ fontSize: "13px", opacity: 0.4, lineHeight: "1.6", margin: 0 }}>El asistente generará una propuesta cuando inicies la conversación.</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Section 2: EVALUACIÓN */}
              <button onClick={() => setIsSectionEvaluacionOpen((p) => !p)} style={{ ...sectionHeaderStyle, borderTop: "1px solid rgba(255,255,255,0.05)" }} type="button">
                <span style={sectionLabelStyle}>Evaluación</span>
                <span style={{ opacity: 0.35, fontSize: "11px" }}>{isSectionEvaluacionOpen ? "▾" : "▸"}</span>
              </button>

              {isSectionEvaluacionOpen ? (
                <div style={{ padding: "16px 20px 20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                    {([
                      { label: "Trustworthiness", value: selectedRecordSummary.scoreLabel },
                      { label: "Estado", value: selectedRecordSummary.status },
                      { label: "Período", value: selectedRecordSummary.periodLabel },
                      { label: "Actualizado", value: selectedRecordSummary.updatedLabel }
                    ] as const).map(({ label, value }) => (
                      <div key={label}>
                        <div style={metaLabelStyle}>{label}</div>
                        <div style={metaValueStyle}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const sg = selectedRecordGroups.find((g) => g.key === "summary");
                    if (!sg || sg.fields.length === 0) return null;
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                        {sg.fields.map((field) => (
                          <div key={field.name} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px" }}>
                            <div style={{ ...metaLabelStyle, marginBottom: "4px" }}>{field.name}</div>
                            <div style={metaValueStyle}>{renderValue(field.value)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {(() => {
                    const pg = selectedRecordGroups.find((g) => g.key === "people");
                    if (!pg) return null;
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                        {pg.fields.map((field) => (
                          <div key={field.name}>
                            <div style={{ ...metaLabelStyle, marginBottom: "6px" }}>{field.name}</div>
                            <div>{renderValue(field.value)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {(() => {
                    const cg = selectedRecordGroups.find((g) => g.key === "context");
                    if (!cg || cg.fields.length === 0) return null;
                    return (
                      <div>
                        {cg.fields.map((field) => (
                          <div key={field.name}>
                            <div style={metaLabelStyle}>{field.name}</div>
                            <div style={{ ...metaValueStyle, marginTop: "3px" }}>{renderValue(field.value)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              {/* Section 3: REUNIONES */}
              <button onClick={() => { setIsSectionReunionesOpen((p) => !p); setShowAllMeetings(false); }} style={{ ...sectionHeaderStyle, borderTop: "1px solid rgba(255,255,255,0.05)" }} type="button">
                <span style={sectionLabelStyle}>Reuniones</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {selectedCoachingContext ? (
                    <span style={{ fontSize: "11px", opacity: 0.45, background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "12px" }}>
                      {selectedCoachingContext.records.length}
                    </span>
                  ) : null}
                  <span style={{ opacity: 0.35, fontSize: "11px" }}>{isSectionReunionesOpen ? "▾" : "▸"}</span>
                </div>
              </button>

              {isSectionReunionesOpen ? (
                <div style={{ padding: "12px 16px 20px" }}>
                  {contextStatus === "loading" ? <LoadingProgress label="Consultando reuniones..." /> : null}
                  {selectedCoachingContext ? (
                    <>
                      {selectedCoachingContext.filtering.reason ? (
                        <div style={{ fontSize: "12px", opacity: 0.4, marginBottom: "10px", lineHeight: 1.4 }}>{selectedCoachingContext.filtering.reason}</div>
                      ) : null}
                      {selectedCoachingContext.records.length === 0 ? (
                        <div style={{ fontSize: "12px", opacity: 0.4 }}>No hay reuniones en el rango del período.</div>
                      ) : (
                        <>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {(showAllMeetings ? selectedCoachingContext.records : selectedCoachingContext.records.slice(0, 8)).map((meeting) => (
                              <button
                                key={meeting.id}
                                onClick={() => setSelectedTranscriptMeetingId(meeting.id)}
                                title={getCoachingMeetingTitle(meeting) ?? undefined}
                                type="button"
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", gap: "8px", width: "100%", cursor: "pointer", color: "inherit", textAlign: "left" }}
                              >
                                <span style={{ fontSize: "12px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.8 }}>
                                  {truncateMeetingTitle(getCoachingMeetingTitle(meeting) ?? "Sin título", 40)}
                                </span>
                                <span style={{ fontSize: "11px", opacity: 0.4, flexShrink: 0 }}>{getShortMeetingDate(meeting)}</span>
                              </button>
                            ))}
                          </div>
                          {!showAllMeetings && selectedCoachingContext.records.length > 8 ? (
                            <button onClick={() => setShowAllMeetings(true)} style={{ marginTop: "10px", fontSize: "12px", opacity: 0.5, background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }} type="button">
                              Ver todas ({selectedCoachingContext.records.length - 8} más)
                            </button>
                          ) : null}
                        </>
                      )}
                    </>
                  ) : contextStatus === "ready" ? (
                    <p style={{ fontSize: "12px", opacity: 0.4 }}>Sin datos de reuniones para esta evaluación.</p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", padding: "24px" }}>
              <p style={{ fontSize: "13px", opacity: 0.35, textAlign: "center" }}>Selecciona una evaluación para ver su detalle.</p>
            </div>
          )}
        </div>

        {/* ── Right: Chat ── */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div
            className="trustworthiness-chatbot-messages"
            ref={messagesRef}
            style={{ flex: 1, overflowY: "auto", padding: "28px" }}
          >
            {chatError ? <p className="workspace-response-error">{chatError}</p> : null}

            {messages.map((message) => (
              <div key={message.id} style={{ marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: message.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.06em", opacity: 0.35, marginBottom: "5px", textTransform: "uppercase", fontWeight: 600 }}>
                  {message.role === "assistant" ? "Asistente TW" : "Tú"}
                </div>
                <div style={{
                  background: message.role === "user" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${message.role === "user" ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "12px",
                  padding: message.role === "user" ? "12px 16px" : "14px 18px",
                  maxWidth: message.role === "user" ? "75%" : "85%",
                  fontSize: "13px",
                  lineHeight: "1.6"
                }}>
                  {message.focusArea ? (
                    <small className="trustworthiness-chatbot-message-tag">
                      {message.focusArea === "feedback" ? "Feedback" : getPillarLabel(message.focusArea)}
                    </small>
                  ) : null}
                  {renderChatMarkdown(message.content)}
                  {message.role === "assistant" && message.changeSource && message.changeSource !== "none" ? (
                    <div className="trustworthiness-chatbot-change-source">{getChangeSourceLabel(message.changeSource)}</div>
                  ) : null}
                  {message.role === "assistant" && message.decisionTrace && message.decisionTrace.length > 0 ? (
                    <details className="trustworthiness-chatbot-reasoning">
                      <summary>
                        <span>Razonamiento</span>
                        <small>{message.decisionTrace.length} puntos</small>
                      </summary>
                      <ul>
                        {message.decisionTrace.map((trace, index) => (
                          <li key={`${trace}-${index}`}>{trace}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {message.role === "assistant" && message.needsOptionalEvidence && message.evidenceQuestion ? (
                    <div className="trustworthiness-chatbot-evidence-question">
                      <span>Evidencia opcional</span>
                      <p>{message.evidenceQuestion}</p>
                    </div>
                  ) : null}
                  {message.citations && message.citations.length > 0 ? (
                    <details className="trustworthiness-chatbot-citations">
                      <summary>
                        <span>Evidencia citada</span>
                        <small>{message.citations.length}{" "}{message.citations.length === 1 ? "cita" : "citas"}</small>
                      </summary>
                      <div className="trustworthiness-chatbot-citations-list">
                        {message.citations.map((citation) => (
                          <button key={`${citation.meetingId}-${citation.reason}`} type="button">
                            <strong>{citation.meetingTitle}</strong>
                            <small>{citation.reason}</small>
                          </button>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            ))}

            {isResponding ? (
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.06em", opacity: 0.35, marginBottom: "5px", textTransform: "uppercase", fontWeight: 600 }}>Asistente TW</div>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px 18px", maxWidth: "85%", fontSize: "13px", lineHeight: "1.6" }}>
                  {streamingAssistantMessage.trim().length > 0 ? (
                    <>
                      {renderChatMarkdown(streamingAssistantMessage)}
                      {streamingDecisionTrace.length > 0 ? (
                        <details className="trustworthiness-chatbot-reasoning" open>
                          <summary>
                            <span>Cómo está evaluando la IA</span>
                            <small>{streamingDecisionTrace.length} puntos</small>
                          </summary>
                          <ul>
                            {streamingDecisionTrace.map((trace, index) => (
                              <li key={`${trace}-${index}`}>{trace}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", opacity: 0.5 }}>{showStreamingFallback ? "Generando respuesta..." : "Esperando respuesta..."}</span>
                      <span aria-hidden="true" className="trustworthiness-mock-chat-thinking-dots"><span /><span /><span /></span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Composer */}
          <div className="trustworthiness-chatbot-composer">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px 16px 8px" }}>
              <button disabled={!canUseAssistant} onClick={handlePrepareSave} style={{ ...quickBtnBase, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", opacity: canUseAssistant ? 1 : 0.4 }} type="button">
                Está bien, preparar guardado
              </button>
              {SUGGESTION_PILLAR_CONFIG.map((pillar) => (
                <button disabled={!canUseAssistant} key={pillar.key} onClick={() => handleFocusPrompt(pillar.key)} style={{ ...quickBtnBase, opacity: canUseAssistant ? 1 : 0.4 }} type="button">
                  Revisar {pillar.label}
                </button>
              ))}
              <button disabled={!canUseAssistant} onClick={() => handleFocusPrompt("feedback")} style={{ ...quickBtnBase, opacity: canUseAssistant ? 1 : 0.4 }} type="button">
                Revisar feedback
              </button>
            </div>
            <div style={{ position: "relative", padding: "8px 16px 16px" }}>
              <textarea
                disabled={!canUseAssistant}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Escribe una pregunta o ajuste para el asistente de revisión..."
                rows={3}
                style={{ width: "100%", borderRadius: "12px", minHeight: "72px", fontSize: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", padding: "14px 52px 14px 16px", color: "inherit", resize: "none", boxSizing: "border-box", lineHeight: "1.5", fontFamily: "inherit", outline: "none", opacity: canUseAssistant ? 1 : 0.5 }}
                value={draftMessage}
              />
              <button
                aria-label={isResponding ? "Generando respuesta" : "Enviar mensaje"}
                disabled={!canUseAssistant || draftMessage.trim().length === 0}
                onClick={handleSubmit}
                style={{ position: "absolute", bottom: "26px", right: "26px", width: "36px", height: "36px", borderRadius: "50%", background: canUseAssistant && draftMessage.trim() ? "rgba(99,102,241,0.85)" : "rgba(99,102,241,0.3)", border: "none", cursor: canUseAssistant && draftMessage.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}
                type="button"
              >
                <svg fill="currentColor" style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24">
                  <path d="M3.4 4.35a1.4 1.4 0 0 1 1.62-.22l15.2 7.05a.9.9 0 0 1 0 1.64l-15.2 7.05A1.4 1.4 0 0 1 3.1 18.2l1.75-5.16H11a1 1 0 1 0 0-2H4.85L3.1 5.88a1.4 1.4 0 0 1 .3-1.53Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <TrustworthinessSaveConfirmationModal
        description="Se guardarán en una sola operación los puntajes actuales, el feedback trabajado, los datos de IA y el status final que elijas."
        errorMessage={saveConfirmationError}
        eyebrow="Confirmar guardado"
        isOpen={isSaveConfirmationOpen}
        isSaving={isSaving}
        onClose={handleCloseSaveConfirmation}
        onDiscard={handleDiscardSaveConfirmation}
        onSaveAsDone={() => { void handleConfirmSave("Done"); }}
        onSaveAsDraft={() => { void handleConfirmSave("Pending"); }}
        savingStatus={null}
        selectedStatus={suggestedSaveStatus}
        summaryBadges={[officialPeriodLabel, selectedRecordSummary?.evaluatedName ?? ""]}
        title="Guardar evaluación desde el chat"
        walkthroughId="chatbot-save-confirmation"
        zIndex={104}
      />

      <TranscriptSideSheet
        isTranscriptLoading={isTranscriptLoading}
        onClose={() => setSelectedTranscriptMeetingId(null)}
        selectedTranscriptMeetingId={selectedTranscriptMeetingId}
        transcriptError={transcriptError}
        transcriptResponse={transcriptResponse}
        zIndex={210}
      />

      {pendingPillarUpdate && typeof document !== "undefined"
        ? createPortal(
            <div className="trustworthiness-chatbot-confirm-backdrop" onClick={handleClosePillarUpdateModal} style={{ zIndex: 200 }}>
              <div aria-label={`Confirmar cambio de ${pendingPillarUpdate.label}`} aria-modal="true" className="trustworthiness-chatbot-confirm-modal" onClick={(event) => { event.stopPropagation(); }} role="dialog">
                <div className="trustworthiness-chatbot-confirm-copy">
                  <span>Actualizar pilar</span>
                  <h4>{pendingPillarUpdate.label} a {pendingPillarUpdate.nextValue}/10</h4>
                  <p>Esto no cambia la propuesta directamente. Se enviará como instrucción al asistente para actualizar el pilar seleccionado y recalcular el feedback propuesto dentro del chat.</p>
                </div>
                <div className="trustworthiness-chatbot-confirm-summary">
                  <span>Valor actual: {pendingPillarUpdate.currentValue}/10</span>
                  <span>Nuevo valor: {pendingPillarUpdate.nextValue}/10</span>
                </div>
                <label className="trustworthiness-chatbot-confirm-field">
                  <span>Prompt de actualización</span>
                  <textarea onChange={(event) => { setPillarUpdatePrompt(event.target.value); }} placeholder="Indica cómo quieres ajustar el pilar seleccionado..." rows={4} value={pillarUpdatePrompt} />
                </label>
                <div className="trustworthiness-chatbot-confirm-actions">
                  <button className="trustworthiness-chatbot-secondary" onClick={handleClosePillarUpdateModal} type="button">Cancelar</button>
                  <button className="trustworthiness-chatbot-confirm-primary" onClick={handleConfirmPillarUpdate} type="button">Confirmar y enviar</button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isContextPanelOpen && typeof document !== "undefined"
        ? createPortal(
            <aside aria-label="Contexto del chat" className="transcript-side-sheet chat-context-side-sheet" style={{ zIndex: 200 }}>
              <div className="transcript-side-sheet-header">
                <div>
                  <span>Contexto del chat</span>
                  <h4>{selectedRecordSummary?.evaluatedName ?? "Evaluación"}</h4>
                  <p>{selectedRecordSummary?.roleLabel ?? ""}</p>
                </div>
                <button className="trustworthiness-detail-close" onClick={() => setIsContextPanelOpen(false)} type="button">Cerrar</button>
              </div>
              <div className="transcript-side-sheet-body chat-context-side-sheet-body">
                <section className="transcript-section">
                  <h5>Base del contexto</h5>
                  <div className="chat-context-summary-grid">
                    {([
                      { label: "Talento", value: selectedRecordSummary?.evaluatedName },
                      { label: "Período", value: officialPeriodLabel },
                      { label: "Proyecto", value: selectedRecordSummary?.context || "Sin contexto" },
                      { label: "Estado", value: selectedRecordSummary?.status }
                    ] as const).map(({ label, value }) => (
                      <div className="chat-context-summary-item" key={label}>
                        <span>{label}</span>
                        <strong>{value ?? "—"}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="transcript-section">
                  <h5>Reuniones en el período</h5>
                  <div className="trustworthiness-context-panel">
                    <div className="trustworthiness-context-summary">
                      <strong>{selectedCoachingContext ? `${selectedCoachingContext.records.length} reuniones encontradas` : "Reuniones relacionadas"}</strong>
                      <small>{selectedCoachingContext?.filtering.reason ?? `${selectedRecordSummary?.evaluatedEmail ?? "Sin email"} · ${officialPeriodLabel}`}</small>
                    </div>
                    {contextStatus === "loading" ? <LoadingProgress label="Consultando reuniones..." /> : null}
                    {selectedCoachingContext?.records.length === 0 ? (
                      <div className="trustworthiness-empty-state"><strong>No hay reuniones en el rango.</strong></div>
                    ) : null}
                    {selectedCoachingContext && selectedCoachingContext.records.length > 0 ? (
                      <div className="trustworthiness-context-list">
                        {selectedCoachingContext.records.map((meeting) => {
                          const participants = selectedRecordSummary ? getDisplayParticipants(meeting, selectedRecordSummary) : [];
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
                                {participants.map((p) => (
                                  <div className="trustworthiness-context-person" key={p.email}>
                                    {p.avatarUrl ? <img alt={p.name} src={p.avatarUrl} /> : <span aria-hidden="true">{p.name.charAt(0).toUpperCase()}</span>}
                                    <div><strong>{p.name}</strong><small>{p.email}</small></div>
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
            </aside>,
            document.body
          )
        : null}

      {isAgentConfigOpen && typeof document !== "undefined"
        ? createPortal(
            <aside aria-label="Configuración del agente" className="transcript-side-sheet chat-agent-config-side-sheet" style={{ zIndex: 200 }}>
              <div className="transcript-side-sheet-header">
                <div>
                  <span>Configuración del agente</span>
                  <h4>TW Bot</h4>
                  <p>{TW_BOT_AGENT_ID} · v{TW_BOT_AGENT_VERSION}</p>
                </div>
                <button className="trustworthiness-detail-close" onClick={() => setIsAgentConfigOpen(false)} type="button">Cerrar</button>
              </div>
              <div className="transcript-side-sheet-body chat-agent-config-side-sheet-body">
                <section className="transcript-section">
                  <h5>Rol del agente</h5>
                  <p className="chat-agent-config-description">Copiloto conversacional para revisar evaluaciones de Trustworthiness con trazabilidad a evidencia de reuniones reales.</p>
                </section>
                <section className="transcript-section">
                  <h5>Identificación</h5>
                  <div className="chat-context-summary-grid">
                    {([
                      { label: "ID", value: TW_BOT_AGENT_ID },
                      { label: "Versión", value: TW_BOT_AGENT_VERSION },
                      { label: "Modo", value: "Conversacional" },
                      { label: "Historial", value: "localStorage" }
                    ] as const).map(({ label, value }) => (
                      <div className="chat-context-summary-item" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="transcript-section">
                  <h5>Capacidades</h5>
                  <ul className="chat-agent-config-list">
                    {["Explicar el score global y cada pilar", "Responder preguntas sobre evidencia", "Proponer ajustes cuando el evaluador lo pide", "Preparar confirmación final antes de guardar"].map((cap) => (
                      <li key={cap}>{cap}</li>
                    ))}
                  </ul>
                </section>
                <section className="transcript-section">
                  <h5>Guardrails</h5>
                  <ul className="chat-agent-config-list">
                    {["Usar contexto y evidencia explícita", "No inventar reuniones ni hechos", "Distinguir evidencia de inferencia", "Respetar la autoridad final del evaluador"].map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </aside>,
            document.body
          )
        : null}
    </div>
  );
}
