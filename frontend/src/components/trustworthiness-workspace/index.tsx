"use client";

import { useEffect, useRef, useState } from "react";

import {
  buildDetailAiSuggestions,
  buildDetailGroups,
  clearExpiredSuggestionCache,
  compareRecords,
  createChatbotGreeting,
  createChatbotReply,
  createChatbotSuggestions,
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
  TrustworthinessRecordsSection
} from "./main-sections";
import {
  SuggestionDetailModal,
  TranscriptSideSheet,
  TrustworthinessChatbotModal,
  TrustworthinessFloatingToasts,
  TrustworthinessSuggestionSideSheet
} from "./overlays";
import type {
  ChatMessage,
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

function getGenerationStageToastMessage(stage: TwGenerationStage) {
  const stepIndex = TW_GENERATION_STEPS.findIndex((step) => step.id === stage);
  const baseLabel = getGenerationStageLabel(stage);

  if (stage === "sending_context_to_ai") {
    return `Paso ${stepIndex + 1} de ${TW_GENERATION_STEPS.length}: ${baseLabel}. Esto puede tardar unos segundos.`;
  }

  return `Paso ${stepIndex + 1} de ${TW_GENERATION_STEPS.length}: ${baseLabel}.`;
}

export function TrustworthinessWorkspace({
  isWalkthroughOpen = false,
  walkthroughStepId = null
}: TrustworthinessWorkspaceProps) {
  const selectorRef = useRef<HTMLDetailsElement | null>(null);
  const statusFilterRef = useRef<HTMLDivElement | null>(null);
  const detailShellRef = useRef<HTMLDivElement | null>(null);
  const isResizingDrawerRef = useRef(false);
  const lastCoachingContextKeyRef = useRef<string | null>(null);
  const lastTranscriptKeyRef = useRef<string | null>(null);
  const walkthroughAutoSelectedRecordIdRef = useRef<string | null>(null);
  const walkthroughPreviousSelectedRecordIdRef = useRef<string | null>(null);
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
  const [savingTarget, setSavingTarget] = useState<EditableDraftTarget | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveErrorTarget, setSaveErrorTarget] = useState<EditableDraftTarget | null>(null);
  const [feedbackGenerationError, setFeedbackGenerationError] = useState<string | null>(null);
  const [isFeedbackGenerating, setIsFeedbackGenerating] = useState(false);
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
  const [drawerWidth, setDrawerWidth] = useState(460);

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
      setFeedbackGenerationError(null);
      setIsFeedbackGenerating(false);
      setSaveErrorMessage(null);
      setSaveErrorTarget(null);
      return;
    }

    const activeRecord =
      responsePayload.records.find((record) => record.id === selectedRecordId) ?? null;

    if (!activeRecord || !isPendingRecord(activeRecord)) {
      setDraftRecord(null);
      setFeedbackGenerationError(null);
      setIsFeedbackGenerating(false);
      setSaveErrorMessage(null);
      setSaveErrorTarget(null);
      return;
    }

    setDraftRecord(createDraftFromRecord(activeRecord));
    setFeedbackGenerationError(null);
    setIsFeedbackGenerating(false);
    setSaveErrorMessage(null);
    setSaveErrorTarget(null);
  }, [responsePayload, selectedRecordId]);

  useEffect(() => {
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
  const hasSelectedRecordSummary = selectedRecordSummary !== null;
  const chatbotRecordSummary = chatbotRecord ? getRecordSummary(chatbotRecord) : null;
  const chatbotSuggestions = chatbotRecord ? createChatbotSuggestions(chatbotRecord) : [];
  const selectedPeriodCoverage = getSelectedPeriodCoverage(selectedPeriods);
  const detailAiSuggestions = selectedRecord ? buildDetailAiSuggestions(selectedRecord, twSuggestion) : {};
  const selectedPeriodCoverageStart = selectedPeriodCoverage?.start ?? null;
  const selectedPeriodCoverageEnd = selectedPeriodCoverage?.end ?? null;
  const selectedRecordParticipantEmail = selectedRecordSummary?.evaluatedEmail?.trim().toLowerCase() ?? null;
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
  const transcriptRequestKey =
    selectedTranscriptMeetingId &&
    selectedRecordParticipantEmail &&
    selectedPeriodCoverageStart &&
    selectedPeriodCoverageEnd
      ? [
          selectedTranscriptMeetingId,
          selectedRecordParticipantEmail,
          selectedPeriodCoverageStart,
          selectedPeriodCoverageEnd
        ].join("|")
      : null;
  const suggestionActionLabel = isSuggestionLoading
    ? "Generando sugerencia TW"
    : "Generar sugerencia TW";
  const firstFilteredRecordId = filteredRecords[0]?.id ?? null;
  const pendingStatus = availableStatuses.find(
    (status) => normalizeStatusValue(status) === normalizeStatusValue(DEFAULT_STATUS_FILTERS[0])
  );
  const doneStatus = availableStatuses.find(
    (status) => normalizeStatusValue(status) === normalizeStatusValue(FALLBACK_COMPLETED_STATUS)
  );
  const autoSelectedStatus = pendingStatus ?? doneStatus ?? null;
  const autoSelectedStatusKey = autoSelectedStatus ? normalizeStatusValue(autoSelectedStatus) : "";
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
        errorMessage: saveErrorMessage,
        errorTarget: saveErrorTarget,
        feedbackGenerationError,
        isDirty: isTargetDirty,
        isGeneratingFeedback: isFeedbackGenerating,
        isSaving: isTargetSaving,
        onDiscard: handleDiscardTarget,
        onFeedbackChange: handleDraftFeedbackChange,
        onGenerateFeedback: () => {
          void handleGenerateFeedback();
        },
        onPointsChange: handleDraftPointsChange,
        onSave: (target) => {
          void handleSaveTarget(target);
        }
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
    if (!selectedTranscriptMeetingId) {
      lastTranscriptKeyRef.current = null;
      setTranscriptResponse((current) => (current === null ? current : null));
      setTranscriptError((current) => (current === null ? current : null));
      setIsTranscriptLoading((current) => (current ? false : current));
      return;
    }

    if (!selectedRecordParticipantEmail || !selectedPeriodCoverageStart || !selectedPeriodCoverageEnd) {
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

    if (transcriptRequestKey && lastTranscriptKeyRef.current === transcriptRequestKey) {
      return;
    }

    const transcriptMeetingId = selectedTranscriptMeetingId;
    const transcriptPeriodCoverageStart = selectedPeriodCoverageStart;
    const transcriptPeriodCoverageEnd = selectedPeriodCoverageEnd;
    const transcriptParticipantEmail = selectedRecordParticipantEmail;
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
    transcriptRequestKey,
    selectedPeriodCoverageEnd,
    selectedPeriodCoverageStart,
    selectedRecordParticipantEmail,
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
        : {
            [target]: draftRecord[target],
            ...(detailAiSuggestions[target]
              ? {
                  [getAiJsonPayloadField(target)]: serializePillarSuggestion(detailAiSuggestions[target])
                }
              : {})
          };

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
    if (target === "feedback") {
      setFeedbackGenerationError(null);
    }
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
      end: selectedPeriodCoverage.end,
      evaluatedEmail: selectedRecordSummary.evaluatedEmail,
      recordId: selectedRecord.id,
      start: selectedPeriodCoverage.start
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

    try {
      const response = await fetch(
        `/api/trustworthiness/${encodeURIComponent(selectedRecord.id)}/suggestion/stream`,
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

          if (suggestionGenerationRequestIdRef.current !== requestId) {
            return;
          }

          const nextDraftPoints = createSuggestionDraftPointsFromSuggestion(parsedEvent.data);
          writeCachedTwSuggestion({
            appliedPoints: {},
            draftPoints: nextDraftPoints,
            metadata: suggestionCacheMetadata,
            suggestion: parsedEvent.data
          });
          setSuggestionDraftPoints(nextDraftPoints);
          setAppliedSuggestionPoints({});
          setTwSuggestion(parsedEvent.data);
          setSelectedSuggestionPillar(null);
          setTwGenerationProgress({
            completedStages: TW_GENERATION_STEPS.map((step) => step.id),
            currentStage: null,
            errorMessage: null,
            errorStage: null,
            status: "success"
          });
          finalizeGenerationToast(
            "success",
            "Sugerencia lista",
            "La sugerencia TW ya está lista para revisión.",
            2800
          );
          setIsSuggestionSideSheetOpen(true);
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

            if (suggestionGenerationRequestIdRef.current === requestId) {
              const nextDraftPoints = createSuggestionDraftPointsFromSuggestion(parsedEvent.data);
              writeCachedTwSuggestion({
                appliedPoints: {},
                draftPoints: nextDraftPoints,
                metadata: suggestionCacheMetadata,
                suggestion: parsedEvent.data
              });
              setSuggestionDraftPoints(nextDraftPoints);
              setAppliedSuggestionPoints({});
              setTwSuggestion(parsedEvent.data);
              setSelectedSuggestionPillar(null);
              setTwGenerationProgress({
                completedStages: TW_GENERATION_STEPS.map((step) => step.id),
                currentStage: null,
                errorMessage: null,
                errorStage: null,
                status: "success"
              });
              finalizeGenerationToast(
                "success",
                "Sugerencia lista",
                "La sugerencia TW ya está lista para revisión.",
                2800
              );
              setIsSuggestionSideSheetOpen(true);
            }
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

  function openSuggestionTranscript(meetingId: string) {
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
        isCoachingContextLoading={isCoachingContextLoading}
        isSuggestionLoading={isSuggestionLoading}
        onClose={() => setSelectedRecordId(null)}
        onOpenChatbot={openChatbot}
        onOpenTranscript={setSelectedTranscriptMeetingId}
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
        suggestionActionLabel={suggestionActionLabel}
      />

      <TrustworthinessChatbotModal
        chatbotDraftMessage={chatbotDraftMessage}
        chatbotMessages={chatbotMessages}
        chatbotRecord={chatbotRecord}
        chatbotRecordSummary={chatbotRecordSummary}
        chatbotSuggestions={chatbotSuggestions}
        onClose={closeChatbot}
        onDraftChange={setChatbotDraftMessage}
        onSendPrompt={sendChatbotPrompt}
        onSubmit={handleChatbotSubmit}
      />

      <TranscriptSideSheet
        isTranscriptLoading={isTranscriptLoading}
        onClose={() => setSelectedTranscriptMeetingId(null)}
        selectedTranscriptMeetingId={selectedTranscriptMeetingId}
        transcriptError={transcriptError}
        transcriptResponse={transcriptResponse}
      />

      <TrustworthinessSuggestionSideSheet
        appliedSuggestionPoints={appliedSuggestionPoints}
        isSuggestionLoading={isSuggestionLoading}
        isSuggestionSideSheetOpen={isSuggestionSideSheetOpen}
        onApplyAll={applyAllSuggestionPillars}
        onApplyPillar={applySuggestionPillar}
        onChangePillarPoint={handleSuggestionPointChange}
        onClose={() => setIsSuggestionSideSheetOpen(false)}
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
      />
    </div>
  );
}
