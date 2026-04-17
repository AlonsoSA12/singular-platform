"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  formatMeetingDatetimeValue,
  formatSuggestionCacheAge,
  formatTranscriptTime,
  getConfidenceLabel,
  getEditablePillarMeaning,
  getImpactLabel,
  getPillarLabel,
  getSourceLabel,
  LoadingProgress,
  SUGGESTION_PILLAR_CONFIG,
  SuggestionStarEditor,
  TW_GENERATION_STEPS
} from "./helpers";
import type {
  ChatMessage,
  ChatbotSuggestion,
  CoachingTranscriptResponse,
  RecordSummary,
  SuggestionAppliedPoints,
  SuggestionCacheNotice,
  SuggestionNotification,
  SuggestionPillarKey,
  TrustworthinessFloatingToast,
  TrustworthinessRecord,
  TwGenerationProgress,
  TwSuggestionResponse
} from "./types";

type TrustworthinessChatbotModalProps = {
  chatbotDraftMessage: string;
  chatbotMessages: ChatMessage[];
  chatbotRecord: TrustworthinessRecord | null;
  chatbotRecordSummary: RecordSummary | null;
  chatbotSuggestions: ChatbotSuggestion[];
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSendPrompt: (prompt: string) => void;
  onSubmit: () => void;
};

export function TrustworthinessChatbotModal(props: TrustworthinessChatbotModalProps) {
  if (!props.chatbotRecord || !props.chatbotRecordSummary) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="trustworthiness-chatbot-backdrop"
      onClick={props.onClose}
      role="dialog"
    >
      <div
        className="trustworthiness-chatbot-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="trustworthiness-chatbot-header">
          <div className="trustworthiness-chatbot-header-copy">
            <span>Asistente de evaluación</span>
            <h4>{props.chatbotRecordSummary.evaluatedName}</h4>
            <p>
              {props.chatbotRecordSummary.roleLabel} · {props.chatbotRecordSummary.status}
            </p>
          </div>
          <div className="trustworthiness-chatbot-header-actions">
            <button
              className="trustworthiness-chatbot-close"
              onClick={props.onClose}
              type="button"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="trustworthiness-chatbot-context-grid">
          <div className="trustworthiness-chatbot-context">
            <span>Contexto</span>
            <strong>{props.chatbotRecordSummary.context}</strong>
          </div>
          <div className="trustworthiness-chatbot-context">
            <span>Periodo</span>
            <strong>{props.chatbotRecordSummary.periodLabel}</strong>
          </div>
          <div className="trustworthiness-chatbot-context">
            <span>Trustworthiness actual</span>
            <strong>{props.chatbotRecordSummary.scoreLabel}</strong>
          </div>
        </div>

        <div className="trustworthiness-chatbot-suggestions">
          {props.chatbotSuggestions.map((suggestion) => (
            <button
              className="trustworthiness-chatbot-suggestion"
              key={suggestion.id}
              onClick={() => props.onSendPrompt(suggestion.prompt)}
              type="button"
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <div className="trustworthiness-chatbot-messages">
          {props.chatbotMessages.map((message) => (
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
            onChange={(event) => props.onDraftChange(event.target.value)}
            placeholder="Describe el desempeño del talento para construir la evaluación..."
            rows={4}
            value={props.chatbotDraftMessage}
          />
          <div className="trustworthiness-chatbot-actions">
            <small>
              Úsalo para pensar la evaluación antes de mover estrellas o guardar la narrativa.
            </small>
            <button
              className="trustworthiness-chatbot-send"
              onClick={props.onSubmit}
              type="button"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type TranscriptSideSheetProps = {
  isTranscriptLoading: boolean;
  onClose: () => void;
  selectedTranscriptMeetingId: string | null;
  transcriptError: string | null;
  transcriptResponse: CoachingTranscriptResponse | null;
};

export function TranscriptSideSheet(props: TranscriptSideSheetProps) {
  if (!props.selectedTranscriptMeetingId) {
    return null;
  }

  return (
    <aside className="transcript-side-sheet" aria-label="Transcript de reunión">
      <div className="transcript-side-sheet-header">
        <div>
          <span>Transcript</span>
          <h4>{props.transcriptResponse?.meetingTitle ?? "Detalle de reunión"}</h4>
          <p>{formatMeetingDatetimeValue(props.transcriptResponse?.meetingDatetime ?? null)}</p>
        </div>
        <button
          className="trustworthiness-detail-close"
          onClick={props.onClose}
          type="button"
        >
          Cerrar
        </button>
      </div>

      <div className="transcript-side-sheet-body">
        {props.isTranscriptLoading ? <LoadingProgress label="Consultando transcript..." /> : null}

        {props.transcriptError ? (
          <p className="workspace-response-error">{props.transcriptError}</p>
        ) : null}

        {!props.isTranscriptLoading && !props.transcriptError && props.transcriptResponse ? (
          <>
            <section className="transcript-section">
              <h5>Resumen</h5>
              <p>{props.transcriptResponse.summary ?? "Esta reunión no tiene resumen disponible."}</p>
            </section>

            <section className="transcript-section">
              <h5>Action items</h5>
              {props.transcriptResponse.actionItems.length > 0 ? (
                <ul>
                  {props.transcriptResponse.actionItems.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No hay action items disponibles.</p>
              )}
            </section>

            <section className="transcript-section">
              <h5>Topics</h5>
              {props.transcriptResponse.topics.length > 0 ? (
                <ul>
                  {props.transcriptResponse.topics.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No hay topics disponibles.</p>
              )}
            </section>

            <section className="transcript-section">
              <h5>Conversación</h5>
              {props.transcriptResponse.speakerBlocks.length > 0 ? (
                <div className="transcript-speaker-list">
                  {props.transcriptResponse.speakerBlocks.map((block) => (
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
  );
}

type TrustworthinessSuggestionSideSheetProps = {
  appliedSuggestionPoints: SuggestionAppliedPoints;
  isSuggestionLoading: boolean;
  isSuggestionSideSheetOpen: boolean;
  onApplyAll: () => void;
  onApplyPillar: (pillar: SuggestionPillarKey) => void;
  onChangePillarPoint: (pillar: SuggestionPillarKey, value: number) => void;
  onClose: () => void;
  onOpenPillarDetail: (pillar: SuggestionPillarKey) => void;
  onRegenerate: () => void;
  selectedRecord: TrustworthinessRecord | null;
  selectedRecordIsPending: boolean;
  selectedRecordSummary: RecordSummary | null;
  suggestionCacheNotice: SuggestionCacheNotice | null;
  suggestionDraftPoints: Record<SuggestionPillarKey, number> | null;
  suggestionError: string | null;
  twSuggestion: TwSuggestionResponse | null;
};

export function TrustworthinessSuggestionSideSheet(props: TrustworthinessSuggestionSideSheetProps) {
  if (
    !props.selectedRecord ||
    !props.selectedRecordSummary ||
    !props.isSuggestionSideSheetOpen ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const twSuggestion = props.twSuggestion;
  const currentDraftPoints = twSuggestion
    ? (props.suggestionDraftPoints ?? {
        credibility: twSuggestion.pillars.credibility.points,
        groupThinking: twSuggestion.pillars.groupThinking.points,
        intimacy: twSuggestion.pillars.intimacy.points,
        reliability: twSuggestion.pillars.reliability.points
      })
    : null;
  const isAllApplied =
    currentDraftPoints !== null &&
    SUGGESTION_PILLAR_CONFIG.every(
      (pillarConfig) => props.appliedSuggestionPoints[pillarConfig.key] === currentDraftPoints[pillarConfig.key]
    );

  return (
    <>
      {createPortal(
        <aside className="transcript-side-sheet tw-suggestion-side-sheet" aria-label="Sugerencia TW">
          <div className="transcript-side-sheet-header">
            <div>
              <span>Sugerencia TW</span>
              <h4>{props.selectedRecordSummary.evaluatedName}</h4>
              <p>
                {props.isSuggestionLoading
                  ? "Generando sugerencia..."
                  : props.twSuggestion
                    ? `${props.twSuggestion.trustworthiness.percentage} · ${props.twSuggestion.trustworthiness.meaning}`
                    : "Sin sugerencia disponible"}
              </p>
            </div>
            <div className="trustworthiness-detail-header-actions">
              <button
                className={`trustworthiness-detail-icon-action ${props.isSuggestionLoading ? "is-loading" : ""}`}
                data-tooltip="Regenerar sugerencia"
                disabled={props.isSuggestionLoading}
                onClick={props.onRegenerate}
                title="Regenerar sugerencia"
                type="button"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 2.5a1 1 0 0 1 .95.68l1.23 3.7a1 1 0 0 0 .63.63l3.7 1.23a1 1 0 0 1 0 1.9l-3.7 1.23a1 1 0 0 0-.63.63l-1.23 3.7a1 1 0 0 1-1.9 0l-1.23-3.7a1 1 0 0 0-.63-.63l-3.7-1.23a1 1 0 0 1 0-1.9l3.7-1.23a1 1 0 0 0 .63-.63l1.23-3.7a1 1 0 0 1 .95-.68Zm6.5 12a.9.9 0 0 1 .85.61l.46 1.38a.9.9 0 0 0 .57.57l1.38.46a.9.9 0 0 1 0 1.7l-1.38.46a.9.9 0 0 0-.57.57l-.46 1.38a.9.9 0 0 1-1.7 0l-.46-1.38a.9.9 0 0 0-.57-.57l-1.38-.46a.9.9 0 0 1 0-1.7l1.38-.46a.9.9 0 0 0 .57-.57l.46-1.38a.9.9 0 0 1 .85-.61Z" />
                </svg>
              </button>
              <button
                className="trustworthiness-detail-close"
                onClick={props.onClose}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="transcript-side-sheet-body tw-suggestion-side-sheet-body">
            {props.isSuggestionLoading ? <LoadingProgress label="Analizando evidencia de reuniones..." /> : null}

            {props.suggestionError ? <p className="workspace-response-error">{props.suggestionError}</p> : null}

            {!props.isSuggestionLoading && !props.suggestionError && !props.twSuggestion ? (
              <div className="trustworthiness-empty-state">
                <strong>No hay sugerencia disponible todavía.</strong>
                <p>Presiona el botón de regenerar para consultar la IA con el contexto actual.</p>
              </div>
            ) : null}

            {twSuggestion ? (
              <div className="tw-suggestion-panel">
                {props.suggestionCacheNotice ? (
                  <div className="tw-suggestion-cache-note" role="status">
                    <span>Cache local</span>
                    <p>
                      Sugerencia recuperada de cache local. Generada{" "}
                      {formatSuggestionCacheAge(props.suggestionCacheNotice.cachedAt)}.
                    </p>
                  </div>
                ) : null}
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
                      aria-label={
                        isAllApplied
                          ? "Toda la sugerencia ya fue aplicada al detalle"
                          : "Aplicar toda la sugerencia al detalle"
                      }
                      className={`detail-card-action ${
                        isAllApplied ? "detail-card-action-primary" : "detail-card-action-secondary"
                      } tw-suggestion-apply-all-action ${isAllApplied ? "is-applied" : ""}`}
                      disabled={!props.selectedRecordIsPending || isAllApplied}
                      onClick={props.onApplyAll}
                      title={
                        isAllApplied
                          ? "Toda la sugerencia ya fue aplicada al detalle"
                          : "Aplicar toda la sugerencia al detalle"
                      }
                      type="button"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        {isAllApplied ? (
                          <path d="M9.2 16.4 4.9 12.1a1.15 1.15 0 1 1 1.63-1.63l2.67 2.67 8.27-8.27a1.15 1.15 0 0 1 1.63 1.63l-9.08 9.08a1.15 1.15 0 0 1-1.63 0Z" />
                        ) : (
                          <path d="M11.1 3.25a1.1 1.1 0 0 1 2.2 0v9.24l2.9-2.9a1.1 1.1 0 0 1 1.56 1.56l-4.78 4.78a1.1 1.1 0 0 1-1.56 0l-4.78-4.78a1.1 1.1 0 0 1 1.56-1.56l2.9 2.9V3.25ZM5.2 18.55a1.1 1.1 0 0 1 1.1-1.1h11.4a1.1 1.1 0 1 1 0 2.2H6.3a1.1 1.1 0 0 1-1.1-1.1Z" />
                        )}
                      </svg>
                      <span>{isAllApplied ? "Todo aplicado" : "Aplicar todo"}</span>
                    </button>
                  </div>
                </div>

                <p className="tw-suggestion-explanation">{twSuggestion.trustworthiness.explanation}</p>

                {props.selectedRecordIsPending ? (
                  <div className="tw-suggestion-edit-hint" role="note">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M12 3.1a1.1 1.1 0 0 1 1.1 1.1v6.7l4.62 2.67a1.1 1.1 0 1 1-1.1 1.9l-5.17-2.98a1.1 1.1 0 0 1-.55-.95V4.2A1.1 1.1 0 0 1 12 3.1Zm0 18.8a9.9 9.9 0 1 1 0-19.8 9.9 9.9 0 0 1 0 19.8Zm0-2.2a7.7 7.7 0 1 0 0-15.4 7.7 7.7 0 0 0 0 15.4Z" />
                    </svg>
                    <p>Ajusta las estrellas por pilar antes de aplicar la sugerencia.</p>
                  </div>
                ) : null}

                <div className="tw-suggestion-pillars">
                  {SUGGESTION_PILLAR_CONFIG.map((pillarConfig) => {
                    const pillar = twSuggestion.pillars[pillarConfig.key];
                    const editableValue = props.suggestionDraftPoints?.[pillarConfig.key] ?? pillar.points;
                    const isPillarApplied = props.appliedSuggestionPoints[pillarConfig.key] === editableValue;

                    return (
                      <article className="tw-suggestion-pillar" key={pillarConfig.key}>
                        <div className="tw-suggestion-pillar-header">
                          <div>
                            <span>{pillarConfig.label}</span>
                            <strong>{editableValue}/10</strong>
                          </div>
                          <small>{getConfidenceLabel(pillar.confidence)}</small>
                        </div>
                        {props.selectedRecordIsPending ? (
                          <SuggestionStarEditor
                            onChange={(value) => props.onChangePillarPoint(pillarConfig.key, value)}
                            value={editableValue}
                          />
                        ) : (
                          <div className="detail-score-stars" aria-label={`${editableValue} estrellas`}>
                            <span className="detail-score-stars-filled">{"★".repeat(editableValue)}</span>
                            <span className="detail-score-stars-empty">
                              {"☆".repeat(Math.max(0, 10 - editableValue))}
                            </span>
                          </div>
                        )}
                        <p>{pillar.shortReason}</p>
                        <small>{getEditablePillarMeaning(pillarConfig.key, editableValue)}</small>
                        <div className="tw-suggestion-pillar-actions">
                          <button
                            className="detail-card-action detail-card-action-secondary"
                            onClick={() => props.onOpenPillarDetail(pillarConfig.key)}
                            type="button"
                          >
                            Ver por qué
                          </button>
                          <button
                            aria-label={
                              isPillarApplied
                                ? `${pillarConfig.label} aplicado al detalle`
                                : `Aplicar ${pillarConfig.label}`
                            }
                            className={`detail-card-action detail-card-action-primary tw-suggestion-apply-action ${
                              isPillarApplied ? "is-applied" : ""
                            }`}
                            disabled={!props.selectedRecordIsPending}
                            onClick={() => props.onApplyPillar(pillarConfig.key)}
                            title={
                              isPillarApplied
                                ? `${pillarConfig.label} aplicado al detalle`
                                : `Aplicar ${pillarConfig.label}`
                            }
                            type="button"
                          >
                            {isPillarApplied ? (
                              <svg aria-hidden="true" viewBox="0 0 24 24">
                                <path d="M9.2 16.4 4.9 12.1a1.15 1.15 0 1 1 1.63-1.63l2.67 2.67 8.27-8.27a1.15 1.15 0 0 1 1.63 1.63l-9.08 9.08a1.15 1.15 0 0 1-1.63 0Z" />
                              </svg>
                            ) : (
                              "Aplicar"
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>,
        document.body
      )}
    </>
  );
}

type TrustworthinessFloatingToastsProps = {
  generationToasts: TrustworthinessFloatingToast[];
  suggestionNotification: SuggestionNotification | null;
  twGenerationProgress: TwGenerationProgress;
};

export function TrustworthinessFloatingToasts(props: TrustworthinessFloatingToastsProps) {
  const [isGenerationToastExpanded, setIsGenerationToastExpanded] = useState(false);
  const activeGenerationToastId =
    props.generationToasts.find((toast) => toast.tone === "progress")?.id ?? null;

  useEffect(() => {
    setIsGenerationToastExpanded(false);
  }, [activeGenerationToastId]);

  const items = [
    ...props.generationToasts,
    ...(props.suggestionNotification
      ? [
          {
            id: props.suggestionNotification.id,
            isClosing: false,
            message: props.suggestionNotification.message,
            title: null,
            tone: "success" as const
          }
        ]
      : [])
  ].sort((left, right) => left.id - right.id);

  if (items.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div aria-live="polite" className="tw-suggestion-toast-layer">
      {items.map((item) => {
        const isExpandableProgressToast =
          item.id === activeGenerationToastId && item.tone === "progress";
        const showExpandedSteps =
          isExpandableProgressToast && isGenerationToastExpanded;
        const completedStagesCount = props.twGenerationProgress.completedStages.length;

        return (
          <div
            className={`tw-suggestion-notification is-${item.tone} ${item.isClosing ? "is-closing" : ""}`}
            key={item.id}
            role="status"
          >
            <span aria-hidden="true">
              {item.tone === "error" ? "!" : item.tone === "success" ? "✓" : "⋯"}
            </span>
            <div className="tw-suggestion-notification-copy">
              <div className="tw-suggestion-notification-main">
                {item.title ? <strong>{item.title}</strong> : null}
                <p>{item.message}</p>
              </div>

              {isExpandableProgressToast ? (
                <div className="tw-suggestion-notification-actions">
                  <small>
                    {completedStagesCount} de {TW_GENERATION_STEPS.length} pasos completados
                  </small>
                  <button
                    aria-controls={`tw-generation-toast-steps-${item.id}`}
                    aria-expanded={showExpandedSteps}
                    className="tw-suggestion-notification-toggle"
                    onClick={() => setIsGenerationToastExpanded((current) => !current)}
                    type="button"
                  >
                    {showExpandedSteps ? "Ocultar pasos" : "Ver pasos"}
                  </button>
                </div>
              ) : null}

              {showExpandedSteps ? (
                <div
                  className="tw-generation-toast-steps"
                  id={`tw-generation-toast-steps-${item.id}`}
                >
                  {TW_GENERATION_STEPS.map((step, index) => {
                    const isCurrent =
                      props.twGenerationProgress.status === "running" &&
                      props.twGenerationProgress.currentStage === step.id;
                    const isError =
                      props.twGenerationProgress.status === "error" &&
                      props.twGenerationProgress.errorStage === step.id;
                    const isComplete =
                      props.twGenerationProgress.status === "success" ||
                      props.twGenerationProgress.completedStages.includes(step.id);
                    const statusLabel = isError
                      ? "Error"
                      : isCurrent
                        ? "En progreso"
                        : isComplete
                          ? "Listo"
                          : "Pendiente";
                    const statusClass = isError
                      ? "is-error"
                      : isCurrent
                        ? "is-current"
                        : isComplete
                          ? "is-complete"
                          : "is-pending";

                    return (
                      <div
                        className={`tw-generation-toast-step ${statusClass}`}
                        key={step.id}
                      >
                        <div className="tw-generation-toast-step-indicator" aria-hidden="true">
                          {isError ? "!" : isComplete ? "✓" : index + 1}
                        </div>
                        <div className="tw-generation-toast-step-copy">
                          <strong>{step.label}</strong>
                          <small>{statusLabel}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

type SuggestionDetailModalProps = {
  isSuggestionSideSheetOpen: boolean;
  onClose: () => void;
  onOpenTranscript: (meetingId: string) => void;
  selectedSuggestionPillar: SuggestionPillarKey | null;
  twSuggestion: TwSuggestionResponse | null;
};

export function SuggestionDetailModal(props: SuggestionDetailModalProps) {
  if (
    !props.isSuggestionSideSheetOpen ||
    !props.selectedSuggestionPillar ||
    !props.twSuggestion ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const selectedPillar = props.twSuggestion.pillars[props.selectedSuggestionPillar];

  return createPortal(
    <aside
      aria-label={`Detalle de ${getPillarLabel(props.selectedSuggestionPillar)}`}
      className="transcript-side-sheet suggestion-detail-side-sheet"
      role="dialog"
    >
      <div
        className="suggestion-detail-panel"
      >
        <div className="suggestion-detail-header">
          <div>
            <span>Por qué la IA sugirió esto</span>
            <h4>{getPillarLabel(props.selectedSuggestionPillar)}</h4>
            <p>
              {selectedPillar.points}/10 · Confianza{" "}
              {getConfidenceLabel(selectedPillar.confidence)}
            </p>
          </div>
          <button
            className="trustworthiness-detail-close"
            onClick={props.onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>

        <div className="suggestion-detail-body">
          <section>
            <h5>Conclusión</h5>
            <p>{selectedPillar.decisionDetail.conclusion}</p>
          </section>

          <section>
            <h5>Señales positivas</h5>
            {selectedPillar.decisionDetail.positiveSignals.length > 0 ? (
              <div className="suggestion-evidence-list">
                {selectedPillar.decisionDetail.positiveSignals.map((signal, index) => (
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
                      onClick={() => props.onOpenTranscript(signal.meetingId)}
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
            {selectedPillar.decisionDetail.negativeSignals.length > 0 ? (
              <div className="suggestion-evidence-list">
                {selectedPillar.decisionDetail.negativeSignals.map((signal, index) => (
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
                      onClick={() => props.onOpenTranscript(signal.meetingId)}
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
            {selectedPillar.decisionDetail.metricInputs.length > 0 ? (
              <div className="suggestion-metric-list">
                {selectedPillar.decisionDetail.metricInputs.map((metric, index) => (
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
            {selectedPillar.decisionDetail.uncertainty.length > 0 ? (
              <ul>
                {selectedPillar.decisionDetail.uncertainty.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No se reportó incertidumbre adicional.</p>
            )}
          </section>
        </div>
      </div>
    </aside>,
    document.body
  );
}
