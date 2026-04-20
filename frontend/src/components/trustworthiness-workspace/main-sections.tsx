"use client";

import type { RefObject } from "react";
import { createPortal } from "react-dom";

import {
  getCoachingMeetingDatetimeLabel,
  getCoachingMeetingTitle,
  getCoachingUniqueKey,
  getDisplayParticipants,
  getRecordSummary,
  getStatusClassName,
  LoadingProgress,
  normalizeStatusValue,
  renderValue
} from "./helpers";
import type {
  CoachingContextResponse,
  PeriodOption,
  RecordGroup,
  RecordPeriodGroup,
  RecordSummary,
  TrustworthinessRatingStatus,
  TrustworthinessRecord,
  TrustworthinessResponse
} from "./types";

const DETAIL_STATUS_OPTIONS: TrustworthinessRatingStatus[] = ["Pending", "Done"];

type TrustworthinessFiltersProps = {
  isSelectorOpen: boolean;
  isStatusMenuOpen: boolean;
  onTogglePeriod: (periodId: string) => void;
  onToggleSelector: () => void;
  onToggleStatus: (status: string) => void;
  onToggleStatusMenu: () => void;
  periodOptions: PeriodOption[];
  selectedPeriodIds: string[];
  selectedPeriods: PeriodOption[];
  selectedStatuses: string[];
  selectorRef: RefObject<HTMLDetailsElement | null>;
  statusFilterRef: RefObject<HTMLDivElement | null>;
  statusOptions: string[];
  statusSummaryLabel: string;
  summaryLabel: string;
};

export function TrustworthinessFilters(props: TrustworthinessFiltersProps) {
  return (
    <div className="workspace-filter-row workspace-filter-row-primary" data-walkthrough="workspace-filters">
      <div className="workspace-filter-group workspace-period-filter-group">
        <span className="workspace-filter-label">Periodos</span>
        <details className="period-selector" open={props.isSelectorOpen} ref={props.selectorRef}>
          <summary
            className="secondary-button period-selector-trigger"
            onClick={(event) => {
              event.preventDefault();
              props.onToggleSelector();
            }}
          >
            <span className="workspace-filter-trigger-content">
              <span aria-hidden="true" className="workspace-filter-trigger-leading">
                <svg viewBox="0 0 24 24">
                  <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8Z" />
                </svg>
              </span>
              <span>{props.summaryLabel}</span>
            </span>
            <span aria-hidden="true" className={`workspace-status-trigger-icon ${props.isSelectorOpen ? "is-open" : ""}`}>
              ▾
            </span>
          </summary>
          <div className="period-selector-menu">
            {props.periodOptions.map((period) => (
              <label className="period-option" key={period.id}>
                <input
                  checked={props.selectedPeriodIds.includes(period.id)}
                  onChange={() => props.onTogglePeriod(period.id)}
                  type="checkbox"
                />
                <span className="period-option-text">{period.endLabel}: {period.rangeLabel}</span>
              </label>
            ))}
          </div>
          {props.selectedPeriods.length > 0 ? (
            <div className="period-selector-preview" role="status">
              <span className="period-selector-preview-label">Seleccionados</span>
              <div className="period-selector-preview-list">
                {props.selectedPeriods.map((period) => (
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
        <div className="workspace-status-filter" ref={props.statusFilterRef}>
          <button
            aria-expanded={props.isStatusMenuOpen}
            className="secondary-button workspace-status-trigger"
            onClick={props.onToggleStatusMenu}
            type="button"
          >
            <span className="workspace-filter-trigger-content">
              <span aria-hidden="true" className="workspace-filter-trigger-leading">
                <svg viewBox="0 0 24 24">
                  <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 1.6 3.2L15 13.4V20a1 1 0 0 1-1.45.9l-3-1.5A1 1 0 0 1 10 18.5v-5.1L3.4 6.2A2 2 0 0 1 3 5Z" />
                </svg>
              </span>
              <span>{props.statusSummaryLabel}</span>
            </span>
            <span aria-hidden="true" className={`workspace-status-trigger-icon ${props.isStatusMenuOpen ? "is-open" : ""}`}>
              ▾
            </span>
          </button>

          {props.isStatusMenuOpen ? (
            <div className="workspace-status-menu">
              {props.statusOptions.map((status) => {
                const isSelected = props.selectedStatuses.some(
                  (value) => normalizeStatusValue(value) === normalizeStatusValue(status)
                );

                return (
                  <label className="workspace-status-option" key={status}>
                    <input
                      checked={isSelected}
                      onChange={() => props.onToggleStatus(status)}
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
  );
}

type TrustworthinessRecordsSectionProps = {
  error: string | null;
  filteredRecords: TrustworthinessRecord[];
  isLoading: boolean;
  isUpToDateWorkspace: boolean;
  onOpenChatbot: (record: TrustworthinessRecord) => void;
  onSelectRecord: (recordId: string) => void;
  periodGroups: RecordPeriodGroup[];
  responsePayload: TrustworthinessResponse | null;
  selectedRecordId: string | null;
};

export function TrustworthinessRecordsSection(props: TrustworthinessRecordsSectionProps) {
  return (
    <section className={`trustworthiness-data ${props.filteredRecords.length === 0 ? "is-empty" : ""}`}>
      <div className="trustworthiness-data-header">
        <div>
          <h3>Evaluaciones</h3>
        </div>
      </div>

      {props.isLoading ? <p className="workspace-response-state">Consultando Airtable...</p> : null}
      {props.error ? <p className="workspace-response-error">{props.error}</p> : null}
      {!props.isLoading && !props.error && !props.responsePayload ? (
        <p className="workspace-response-state">Selecciona al menos un periodo para consultar.</p>
      ) : null}
      {!props.isLoading && !props.error && props.responsePayload && props.filteredRecords.length === 0 ? (
        <div className="trustworthiness-empty-state">
          <strong>
            {props.isUpToDateWorkspace
              ? "No hay evaluaciones pendientes. Esta persona está al día."
              : "No hay evaluaciones para los filtros seleccionados."}
          </strong>
          <p>
            {props.isUpToDateWorkspace
              ? "Encontramos evaluaciones en status Done, pero no hay registros Pending dentro de los periodos activos."
              : "Prueba agregando otro periodo o activando otros status para ampliar la consulta."}
          </p>
        </div>
      ) : null}

      {!props.isLoading && !props.error && props.filteredRecords.length > 0 ? (
        <div className="trustworthiness-content">
          <div className="trustworthiness-table">
            {props.periodGroups.map((periodGroup, index) => (
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
                      {periodGroup.records.map((record, recordIndex) => {
                        const summary = getRecordSummary(record);
                        const isSelected = record.id === props.selectedRecordId;

                        return (
                          <article
                            className={`trustworthiness-record ${isSelected ? "is-active" : ""}`}
                            key={`${periodGroup.id}-${record.id}`}
                          >
                            <div
                              className="trustworthiness-record-summary"
                              onClick={() => props.onSelectRecord(record.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  props.onSelectRecord(record.id);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="trustworthiness-cell trustworthiness-index-cell">
                                <span className="trustworthiness-mobile-label">#</span>
                                <strong>{recordIndex + 1}</strong>
                                <button
                                  aria-label={`Generar TW y abrir chat de revisión para ${summary.evaluatedName}`}
                                  className="trustworthiness-index-action"
                                  data-walkthrough={
                                    index === 0 && recordIndex === 0 ? "chatbot-entry" : undefined
                                  }
                                  data-tooltip="Generar TW y abrir chat de revisión"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    props.onOpenChatbot(record);
                                  }}
                                  onKeyDown={(event) => {
                                    event.stopPropagation();
                                  }}
                                  title="Generar TW y abrir chat de revisión"
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
  );
}

type TrustworthinessDetailDrawerProps = {
  coachingContextError: string | null;
  coachingContextResponse: CoachingContextResponse | null;
  drawerWidth: number;
  hasPendingChanges: boolean;
  isCoachingContextLoading: boolean;
  isManualSavePending: boolean;
  isSuggestionLoading: boolean;
  onClose: () => void;
  onOpenChatbot: (record: TrustworthinessRecord) => void;
  onOpenSaveConfirmation: () => void;
  onOpenTranscript: (meetingId: string) => void;
  onStatusChange: (nextStatus: TrustworthinessRatingStatus) => void;
  onStartResize: () => void;
  onStartSuggestionGeneration: () => void;
  manualSaveErrorMessage: string | null;
  selectedPeriodIds: string[];
  selectedRecord: TrustworthinessRecord | null;
  selectedRecordGroups: RecordGroup[];
  selectedRecordSummary: RecordSummary | null;
  shellRef: RefObject<HTMLDivElement | null>;
  statusValue: TrustworthinessRatingStatus;
  suggestionActionLabel: string;
};

export function TrustworthinessDetailDrawer(props: TrustworthinessDetailDrawerProps) {
  if (!props.selectedRecord || !props.selectedRecordSummary || typeof document === "undefined") {
    return null;
  }

  const selectedRecord = props.selectedRecord;
  const selectedRecordSummary = props.selectedRecordSummary;
  const getGroupWalkthroughId = (groupKey: RecordGroup["key"]) => {
    if (groupKey === "summary") {
      return "detail-summary";
    }

    if (groupKey === "scores") {
      return "detail-trustworthiness";
    }

    return undefined;
  };

  return createPortal(
    <aside
      className="trustworthiness-detail-drawer is-open"
      data-walkthrough="detail-drawer"
      style={{ width: `${props.drawerWidth}px` }}
    >
      <button
        aria-label="Redimensionar panel de detalle"
        className="trustworthiness-detail-resize-handle"
        onPointerDown={props.onStartResize}
        type="button"
      />
      <div className="trustworthiness-detail-shell" ref={props.shellRef}>
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
              aria-label={props.suggestionActionLabel}
              className={`trustworthiness-detail-icon-action ${props.isSuggestionLoading ? "is-loading" : ""}`}
              data-tooltip={props.suggestionActionLabel}
              disabled={props.isSuggestionLoading}
              onClick={props.onStartSuggestionGeneration}
              title={props.suggestionActionLabel}
              type="button"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2.5a1 1 0 0 1 .95.68l1.23 3.7a1 1 0 0 0 .63.63l3.7 1.23a1 1 0 0 1 0 1.9l-3.7 1.23a1 1 0 0 0-.63.63l-1.23 3.7a1 1 0 0 1-1.9 0l-1.23-3.7a1 1 0 0 0-.63-.63l-3.7-1.23a1 1 0 0 1 0-1.9l3.7-1.23a1 1 0 0 0 .63-.63l1.23-3.7a1 1 0 0 1 .95-.68Zm6.5 12a.9.9 0 0 1 .85.61l.46 1.38a.9.9 0 0 0 .57.57l1.38.46a.9.9 0 0 1 0 1.7l-1.38.46a.9.9 0 0 0-.57.57l-.46 1.38a.9.9 0 0 1-1.7 0l-.46-1.38a.9.9 0 0 0-.57-.57l-1.38-.46a.9.9 0 0 1 0-1.7l1.38-.46a.9.9 0 0 0 .57-.57l.46-1.38a.9.9 0 0 1 .85-.61Z" />
              </svg>
            </button>
            <button
              aria-label="Generar TW y abrir chat de revisión"
              className="trustworthiness-detail-icon-action"
              data-tooltip="Generar TW y abrir chat de revisión"
              onClick={() => props.onOpenChatbot(selectedRecord)}
              title="Generar TW y abrir chat de revisión"
              type="button"
            >
              <svg viewBox="0 0 24 24">
                <path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v5.5A2.75 2.75 0 0 1 16.25 14H11.4l-3.55 3.03c-.8.69-1.85.12-1.85-.94V14A2.75 2.75 0 0 1 5 11.25Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h.75v2.2l2.79-2.2h4.96c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25Z" />
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

        <div className="trustworthiness-detail-meta" data-walkthrough="detail-snapshot">
          <div>
            <span>Trustworthiness</span>
            <strong>{selectedRecordSummary.scoreLabel}</strong>
          </div>
          <div className="trustworthiness-detail-meta-status" data-walkthrough="detail-status">
            <span>Estado</span>
            <label className="trustworthiness-detail-status-control">
              <select
                className="trustworthiness-detail-status-select"
                disabled={props.isManualSavePending}
                onChange={(event) => props.onStatusChange(event.target.value as TrustworthinessRatingStatus)}
                value={props.statusValue}
              >
                {DETAIL_STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </label>
            {props.isManualSavePending ? (
              <small className="trustworthiness-detail-status-hint">Guardando evaluación...</small>
            ) : (
              <small className="trustworthiness-detail-status-hint">
                El cambio de estado se confirma al guardar.
              </small>
            )}
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

        {props.hasPendingChanges ? (
          <section className="trustworthiness-detail-save-bar" data-walkthrough="detail-save">
            <div className="trustworthiness-detail-save-copy">
              <strong>Cambios pendientes</strong>
              <p>Puntajes, feedback y estado se confirman juntos al final.</p>
              {props.manualSaveErrorMessage ? (
                <small className="trustworthiness-detail-save-error">{props.manualSaveErrorMessage}</small>
              ) : null}
            </div>
            <button
              className="detail-card-action detail-card-action-primary"
              disabled={props.isManualSavePending}
              onClick={props.onOpenSaveConfirmation}
              type="button"
            >
              {props.isManualSavePending ? "Guardando..." : "Guardar evaluación"}
            </button>
          </section>
        ) : null}

        <div className="trustworthiness-detail-groups" data-walkthrough="detail-groups">
          {props.selectedRecordGroups.map((group) => (
            <section
              className={`trustworthiness-group trustworthiness-group-${group.key}`}
              data-walkthrough={getGroupWalkthroughId(group.key)}
              key={`${selectedRecord.id}-${group.key}`}
            >
              <div className="trustworthiness-group-header">
                <h4>{group.label}</h4>
                <span>{group.fields.length} campos</span>
              </div>
              <div className="trustworthiness-group-grid">
                {group.fields.map((field) => (
                  <div
                    className="trustworthiness-field"
                    data-walkthrough={field.walkthroughId}
                    key={`${selectedRecord.id}-${field.name}`}
                  >
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

            <div className="trustworthiness-context-panel" data-walkthrough="detail-transcript">
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
                      `${selectedRecordSummary.evaluatedEmail ?? "Sin email"} · ${props.selectedPeriodIds.length} periodos activos`}
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
                  <strong>No encontramos reuniones para este talento en los periodos seleccionados.</strong>
                  <p>
                    Se filtró por `received_at` y por coincidencia conjunta de emails dentro de
                    `participant`.
                  </p>
                </div>
              ) : null}

              {!props.isCoachingContextLoading &&
              !props.coachingContextError &&
              props.coachingContextResponse &&
              props.coachingContextResponse.records.length > 0 ? (
                <div className="trustworthiness-context-list">
                  {props.coachingContextResponse.records.map((meeting) => {
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
      </div>
    </aside>,
    document.body
  );
}

type TrustworthinessSaveConfirmationModalProps = {
  description: string;
  discardLabel?: string;
  doneLabel?: string;
  draftLabel?: string;
  errorMessage?: string | null;
  eyebrow: string;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSaveAsDone: () => void;
  onSaveAsDraft: () => void;
  savingStatus: TrustworthinessRatingStatus | null;
  selectedStatus: TrustworthinessRatingStatus;
  summaryBadges: string[];
  title: string;
  walkthroughId?: string;
  zIndex: number;
};

export function TrustworthinessSaveConfirmationModal(
  props: TrustworthinessSaveConfirmationModalProps
) {
  if (!props.isOpen || typeof document === "undefined") {
    return null;
  }

  const selectedStatusLabel =
    props.selectedStatus === "Done" ? "Done" : "Draft (se guarda como Pending)";

  return createPortal(
    <div
      className="trustworthiness-chatbot-confirm-backdrop"
      onClick={() => {
        if (!props.isSaving) {
          props.onClose();
        }
      }}
      style={{ zIndex: props.zIndex }}
    >
      <div
        aria-label={props.title}
        aria-modal="true"
        className="trustworthiness-chatbot-confirm-modal"
        data-walkthrough={props.walkthroughId}
        onClick={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <div className="trustworthiness-chatbot-confirm-copy">
          <span>{props.eyebrow}</span>
          <h4>{props.title}</h4>
          <p>{props.description}</p>
        </div>

        <div className="trustworthiness-chatbot-confirm-summary">
          {props.summaryBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>

        <div className="trustworthiness-chatbot-confirm-selection">
          <span>Selección actual</span>
          <strong>{selectedStatusLabel}</strong>
          <small>El botón que elijas a continuación es el estado que realmente se guardará.</small>
        </div>

        {props.errorMessage ? (
          <p className="trustworthiness-chatbot-confirm-error">{props.errorMessage}</p>
        ) : null}

        <div className="trustworthiness-chatbot-confirm-actions is-multi">
          <button
            className="trustworthiness-chatbot-secondary"
            disabled={props.isSaving}
            onClick={props.onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="trustworthiness-chatbot-secondary is-danger"
            disabled={props.isSaving}
            onClick={props.onDiscard}
            type="button"
          >
            {props.discardLabel ?? "Discard"}
          </button>
          <button
            className={`trustworthiness-chatbot-confirm-option ${
              props.selectedStatus === "Pending" ? "is-selected" : ""
            }`}
            disabled={props.isSaving}
            onClick={props.onSaveAsDraft}
            type="button"
          >
            {props.isSaving && props.savingStatus === "Pending"
              ? "Guardando draft..."
              : props.draftLabel ?? "Guardar como Draft"}
          </button>
          <button
            className={`trustworthiness-chatbot-confirm-primary ${
              props.selectedStatus === "Done" ? "is-selected" : ""
            }`}
            disabled={props.isSaving}
            onClick={props.onSaveAsDone}
            type="button"
          >
            {props.isSaving && props.savingStatus === "Done"
              ? "Guardando done..."
              : props.doneLabel ?? "Guardar como Done"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
