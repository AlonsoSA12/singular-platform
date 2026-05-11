"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOkrsWorkspaceData } from "@/components/okrs-workspace-data-context";
import { useWorkspaceUser } from "@/components/workspace-user-context";
import {
  createSingularAgileKeyProject,
  createSingularAgileKeyResult,
  createSingularAgileObjective,
  sendOkrBotMessage,
  updateSingularAgileKeyResult,
  updateSingularAgileObjective,
  updateSingularAgileKeyProject,
  type AgileGeneratedKeyResultDraft,
  type AgileKeyResult,
  type AgileProject,
  type OkrBotAction,
  type OkrBotChatResponse,
  type OkrBotProposal
} from "@/lib/okrs";
import { OkrBotActions } from "./okr-bot-actions";
import { OkrBotContextSummary } from "./okr-bot-context-summary";
import { OkrBotMessage, type OkrBotChatMessage, type OkrBotUiResponse } from "./okr-bot-message";
import { OkrBotPromptInput } from "./okr-bot-prompt-input";
import { OkrBotToolResult } from "./okr-bot-tool-result";
import type { OkrBotActionItem, OkrBotSaveState } from "./types";

const botActions: OkrBotActionItem[] = [
  {
    icon: "plus",
    label: "Create Objective",
    value: "create_objective",
    description: "Draft a measurable objective for the selected project."
  },
  {
    icon: "bars",
    label: "Edit Objective",
    value: "edit_objective",
    description: "Improve wording, alignment, metric, priority, or target date."
  },
  {
    icon: "chart",
    label: "Create Key Result",
    value: "create_key_result",
    description: "Generate a KR proposal connected to an objective."
  },
  {
    icon: "tool",
    label: "Edit Key Result",
    value: "edit_key_result",
    description: "Adjust metric, status, initial, current, target, or target date."
  },
  {
    icon: "target",
    label: "Create Key Project",
    value: "create_key_project",
    description: "Propose delivery work connected to KR outcomes."
  },
  {
    icon: "spark",
    label: "Edit Key Project",
    value: "edit_key_project",
    description: "Refine scope, status, scores, story, or visibility."
  }
];

const DEFAULT_OKR_BOT_MEMORY_LIMIT = 20;
const OKR_BOT_MEMORY_LIMIT_STORAGE_KEY = "okr-bot-memory-limit";
const OKR_BOT_CHAT_HISTORY_VERSION = 2;
const OKR_BOT_LEGACY_CHAT_HISTORY_VERSION = 1;
const OKR_BOT_LOCAL_HISTORY_LIMIT = 300;
const SKIP_KEY_RESULT_OPTION_ID = "__skip_key_result__";

type OkrBotStoredChatHistory = {
  chatMessages: OkrBotChatMessage[];
  updatedAt: string;
  version: typeof OKR_BOT_CHAT_HISTORY_VERSION;
};

function normalizeMemoryLimit(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : DEFAULT_OKR_BOT_MEMORY_LIMIT;
}

function buildConversationHistory(messages: OkrBotChatMessage[], memoryLimit: number) {
  return messages
    .filter((message) => !message.isThinking && message.text.trim().length > 0)
    .map((message) => ({
      role: message.role,
      text: message.text.trim()
    }))
    .slice(-memoryLimit);
}

function buildChatHistoryStorageKey(params: { projectId: string; userEmail: string }) {
  return `okr-bot-history:v${OKR_BOT_CHAT_HISTORY_VERSION}:${params.userEmail.toLowerCase()}:${params.projectId}`;
}

function buildLegacyChatHistoryStorageKey(params: { projectId: string; userEmail: string }) {
  return `okr-bot-history:v${OKR_BOT_LEGACY_CHAT_HISTORY_VERSION}:${params.userEmail.toLowerCase()}:${params.projectId}`;
}

function isValidStoredProposal(value: unknown): value is OkrBotProposal {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const proposal = value as Partial<OkrBotProposal>;
  const hasValidOperation = proposal.operation === "create" || proposal.operation === "edit";
  const hasValidTargetType =
    proposal.targetType === "key_project" || proposal.targetType === "key_result" || proposal.targetType === "objective";

  return hasValidOperation && hasValidTargetType && "draft" in proposal;
}

function sanitizeStoredUiResponse(value: unknown): OkrBotUiResponse | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const uiResponse = value as Partial<OkrBotUiResponse>;

  if (uiResponse.type !== "proposal" || !isValidStoredProposal(uiResponse.proposal)) {
    return undefined;
  }

  return {
    collapsed: true,
    proposal: uiResponse.proposal,
    type: "proposal"
  };
}

function sanitizeStoredChatMessages(messages: OkrBotChatMessage[], options: { includeUiResponses: boolean }) {
  return messages
    .filter((message) => !message.isThinking && message.text.trim().length > 0)
    .map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text.trim(),
      ...(options.includeUiResponses && message.role === "assistant"
        ? {
            uiResponse:
              sanitizeStoredUiResponse(message.uiResponse) ??
              (isValidStoredProposal(message.proposal)
                ? {
                    collapsed: true,
                    proposal: message.proposal,
                    type: "proposal" as const
                  }
                : undefined)
          }
        : {})
    }))
    .map((message) => (message.uiResponse ? message : { id: message.id, role: message.role, text: message.text }))
    .slice(-OKR_BOT_LOCAL_HISTORY_LIMIT);
}

function readStoredChatHistory(params: {
  includeUiResponses: boolean;
  storageKey: string;
  version: number;
}): OkrBotStoredChatHistory | null {
  try {
    const rawValue = window.localStorage.getItem(params.storageKey);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as Partial<OkrBotStoredChatHistory>;
    if (parsedValue.version !== params.version || !Array.isArray(parsedValue.chatMessages)) {
      return null;
    }

    const chatMessages = sanitizeStoredChatMessages(
      parsedValue.chatMessages.filter(
        (message): message is OkrBotChatMessage =>
          Boolean(message) &&
          (message.role === "assistant" || message.role === "user") &&
          typeof message.id === "string" &&
          typeof message.text === "string"
      ),
      { includeUiResponses: params.includeUiResponses }
    );

    return chatMessages.length > 0
      ? {
          chatMessages,
          updatedAt: typeof parsedValue.updatedAt === "string" ? parsedValue.updatedAt : new Date().toISOString(),
          version: OKR_BOT_CHAT_HISTORY_VERSION
        }
      : null;
  } catch {
    return null;
  }
}

function writeStoredChatHistory(storageKey: string, chatMessages: OkrBotChatMessage[]) {
  const sanitizedMessages = sanitizeStoredChatMessages(chatMessages, { includeUiResponses: true });
  if (sanitizedMessages.length === 0) return;

  const payload: OkrBotStoredChatHistory = {
    chatMessages: sanitizedMessages,
    updatedAt: new Date().toISOString(),
    version: OKR_BOT_CHAT_HISTORY_VERSION
  };

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Browser storage is best-effort; the bot should keep working if it is blocked or full.
  }
}

function getSelectionTypeLabel(action?: OkrBotAction | null) {
  if (action === "create_key_result" || action === "edit_objective") return "Objective";
  if (action === "create_key_project" || action === "edit_key_result") return "Key Result";
  if (action === "edit_key_project") return "Key Project";
  return "Target";
}

function getObjectiveKeyResultsCount(keyResults: AgileKeyResult[]) {
  return keyResults.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getStringField(draft: Record<string, unknown>, field: string) {
  const value = draft[field];
  return typeof value === "string" ? value.trim() : "";
}

function getNumberField(draft: Record<string, unknown>, field: string) {
  const value = draft[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getStringArrayField(draft: Record<string, unknown>, field: string) {
  const value = draft[field];

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function createChatMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createExportFileName(projectName: string) {
  const normalizedProjectName = projectName
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const dateStamp = new Date().toISOString().slice(0, 10);

  return `okr-bot-${normalizedProjectName || "conversation"}-${dateStamp}.md`;
}

function stringifyProposalDraftForExport(proposal: OkrBotProposal) {
  return JSON.stringify(proposal.draft, null, 2).replace(/```/g, "'''");
}

function shouldUsePendingAction(params: {
  action?: OkrBotAction;
  botResponse: OkrBotChatResponse | null;
  hasActiveProposal: boolean;
  hasTargetSelection: boolean;
}) {
  if (params.action) return true;
  if (params.hasTargetSelection) return true;
  if (params.hasActiveProposal) return false;

  return params.botResponse?.nextStep === "provide_prompt";
}

export function OkrBotWorkspace() {
  const { userEmail } = useWorkspaceUser();
  const {
    ensureProjectData,
    ensureProjects,
    invalidateProject,
    projectDataCache,
    projects,
    projectsError,
    projectsStatus
  } = useOkrsWorkspaceData();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [botError, setBotError] = useState<string | null>(null);
  const [botInput, setBotInput] = useState("");
  const [botResponse, setBotResponse] = useState<OkrBotChatResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<OkrBotChatMessage[]>([]);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [saveResult, setSaveResult] = useState<OkrBotSaveState>(null);
  const [pendingAction, setPendingAction] = useState<OkrBotAction | undefined>();
  const [isToolPanelExpanded, setIsToolPanelExpanded] = useState(false);
  const [isMemorySettingsOpen, setIsMemorySettingsOpen] = useState(false);
  const [isClearChatConfirmOpen, setIsClearChatConfirmOpen] = useState(false);
  const [memoryLimitInput, setMemoryLimitInput] = useState(String(DEFAULT_OKR_BOT_MEMORY_LIMIT));
  const initializedBotProjectIdRef = useRef<string | null>(null);
  const selectedProject = useMemo<AgileProject | null>(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const selectedProjectData = selectedProjectId ? projectDataCache[selectedProjectId] : undefined;
  const keyResults = useMemo(
    () => selectedProjectData?.objectives.flatMap((objective) => objective.keyResults ?? []) ?? [],
    [selectedProjectData]
  );
  const contextReady = Boolean(selectedProject && selectedProjectData && !isLoadingContext && !contextError);
  const isLoadingProjects = projectsStatus === "idle" || projectsStatus === "loading";
  const memoryLimit = normalizeMemoryLimit(memoryLimitInput);
  const chatHistoryStorageKey =
    selectedProjectId && userEmail ? buildChatHistoryStorageKey({ projectId: selectedProjectId, userEmail }) : null;
  const legacyChatHistoryStorageKey =
    selectedProjectId && userEmail ? buildLegacyChatHistoryStorageKey({ projectId: selectedProjectId, userEmail }) : null;

  useEffect(() => {
    void ensureProjects().catch(() => undefined);
  }, [ensureProjects]);

  useEffect(() => {
    const storedMemoryLimit = window.localStorage.getItem(OKR_BOT_MEMORY_LIMIT_STORAGE_KEY);

    if (storedMemoryLimit) {
      setMemoryLimitInput(String(normalizeMemoryLimit(storedMemoryLimit)));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProjectContext() {
      if (!selectedProjectId) {
        setContextError(null);
        setIsLoadingContext(false);
        return;
      }

      if (projectDataCache[selectedProjectId]) {
        setContextError(null);
        setIsLoadingContext(false);
        return;
      }

      setIsLoadingContext(true);
      setContextError(null);

      try {
        await ensureProjectData(selectedProjectId);
      } catch (error) {
        if (isMounted) {
          setContextError(error instanceof Error ? error.message : "Could not load OKR context.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingContext(false);
        }
      }
    }

    void loadProjectContext();

    return () => {
      isMounted = false;
    };
  }, [ensureProjectData, projectDataCache, selectedProjectId]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialBotReply() {
      if (!selectedProjectId || !selectedProject) {
        initializedBotProjectIdRef.current = null;
        setBotResponse(null);
        setChatMessages([]);
        setBotError(null);
        setPendingAction(undefined);
        setIsToolPanelExpanded(false);
        return;
      }

      if (initializedBotProjectIdRef.current === selectedProjectId) {
        return;
      }

      initializedBotProjectIdRef.current = selectedProjectId;
      setChatMessages([]);
      setIsToolPanelExpanded(false);
      setIsBotLoading(true);
      setBotError(null);
      setSaveResult(null);
      setPendingAction(undefined);
      setIsClearChatConfirmOpen(false);

      if (chatHistoryStorageKey) {
        const storedHistory =
          readStoredChatHistory({
            includeUiResponses: true,
            storageKey: chatHistoryStorageKey,
            version: OKR_BOT_CHAT_HISTORY_VERSION
          }) ??
          (legacyChatHistoryStorageKey
            ? readStoredChatHistory({
                includeUiResponses: false,
                storageKey: legacyChatHistoryStorageKey,
                version: OKR_BOT_LEGACY_CHAT_HISTORY_VERSION
              })
            : null);

        if (storedHistory) {
          setBotResponse(null);
          setChatMessages(storedHistory.chatMessages);
          setIsBotLoading(false);
          return;
        }
      }

      try {
        const response = await sendOkrBotMessage({
          conversationHistory: [],
          memoryLimit,
          message: "",
          projectId: selectedProjectId,
          projectName: selectedProject.name
        });

        if (isMounted) {
          setBotResponse(response);
          setChatMessages([
            {
              id: createChatMessageId(),
              role: "assistant",
              text: response.message
            }
          ]);
        }
      } catch (error) {
        if (isMounted) {
          initializedBotProjectIdRef.current = null;
          setBotError(error instanceof Error ? error.message : "Could not load OKR Bot.");
        }
      } finally {
        if (isMounted) {
          setIsBotLoading(false);
        }
      }
    }

    void loadInitialBotReply();

    return () => {
      isMounted = false;
    };
  }, [chatHistoryStorageKey, legacyChatHistoryStorageKey, memoryLimit, selectedProject?.name, selectedProjectId]);

  useEffect(() => {
    if (!chatHistoryStorageKey || chatMessages.length === 0) return;

    writeStoredChatHistory(chatHistoryStorageKey, chatMessages);
  }, [chatHistoryStorageKey, chatMessages]);

  function commitMemoryLimit(value: string) {
    const nextMemoryLimit = normalizeMemoryLimit(value);
    const nextValue = String(nextMemoryLimit);
    setMemoryLimitInput(nextValue);
    window.localStorage.setItem(OKR_BOT_MEMORY_LIMIT_STORAGE_KEY, nextValue);
    return nextMemoryLimit;
  }

  async function clearCurrentChatHistory() {
    if (!selectedProjectId || !selectedProject) return;

    if (chatHistoryStorageKey) {
      try {
        window.localStorage.removeItem(chatHistoryStorageKey);
        if (legacyChatHistoryStorageKey) {
          window.localStorage.removeItem(legacyChatHistoryStorageKey);
        }
      } catch {
        // Browser storage is best-effort; resetting in-memory chat still works.
      }
    }

    const nextMemoryLimit = commitMemoryLimit(memoryLimitInput);
    setIsClearChatConfirmOpen(false);
    setIsMemorySettingsOpen(false);
    setBotResponse(null);
    setChatMessages([]);
    setPendingAction(undefined);
    setSaveResult(null);
    setBotError(null);
    setBotInput("");
    setIsToolPanelExpanded(false);
    setIsBotLoading(true);

    try {
      const response = await sendOkrBotMessage({
        conversationHistory: [],
        memoryLimit: nextMemoryLimit,
        message: "",
        projectId: selectedProjectId,
        projectName: selectedProject.name
      });

      setBotResponse(response);
      setChatMessages([
        {
          id: createChatMessageId(),
          role: "assistant",
          text: response.message
        }
      ]);
    } catch (error) {
      setBotError(error instanceof Error ? error.message : "Could not restart OKR Bot.");
    } finally {
      setIsBotLoading(false);
    }
  }

  function exportCurrentChatHistory() {
    if (!selectedProject) return;

    const exportableMessages = chatMessages.filter(
      (message) => !message.isThinking && message.text.trim().length > 0
    );

    if (exportableMessages.length === 0) return;

    const exportedAt = new Date().toLocaleString();
    const markdown = [
      `# OKR Bot Conversation - ${selectedProject.name}`,
      "",
      `- Project: ${selectedProject.name}`,
      `- Exported: ${exportedAt}`,
      `- Messages: ${exportableMessages.length}`,
      "",
      "## Conversation",
      "",
      ...exportableMessages.flatMap((message, index) => {
        const proposal = message.uiResponse?.proposal ?? message.proposal;
        const speaker = message.role === "user" ? "User" : "OKR Bot";
        const messageLines = [`### ${index + 1}. ${speaker}`, "", message.text.trim(), ""];

        if (!proposal) {
          return messageLines;
        }

        return [
          ...messageLines,
          "#### Proposal",
          "",
          `- Operation: ${proposal.operation}`,
          `- Target type: ${proposal.targetType}`,
          "",
          "```json",
          stringifyProposalDraftForExport(proposal),
          "```",
          ""
        ];
      })
    ].join("\n");

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createExportFileName(selectedProject.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function sendBotRequest(
    action?: OkrBotAction,
    overrides?: {
      displayMessage?: string;
      message?: string;
      objectiveId?: string;
      targetLabel?: string;
      targetId?: string;
    }
  ) {
    if (!selectedProjectId || !selectedProject) return;

    const activeTargetId = overrides?.targetId ?? botResponse?.selectedTargetId;
    const activeTargetLabel = overrides?.targetLabel ?? botResponse?.selectedTarget?.label;
    const hasTargetSelection = Boolean(overrides?.objectiveId || activeTargetId);
    const nextAction = shouldUsePendingAction({
      action,
      botResponse,
      hasActiveProposal: Boolean(botResponse?.proposal),
      hasTargetSelection
    })
      ? action ?? pendingAction
      : undefined;
    const message = overrides?.message ?? botInput;
    const trimmedMessage = message.trim();
    const visibleUserMessage = (overrides?.displayMessage ?? trimmedMessage).trim();
    const nextMemoryLimit = commitMemoryLimit(memoryLimitInput);
    const conversationHistory = buildConversationHistory(chatMessages, nextMemoryLimit);
    const thinkingMessageId = createChatMessageId();
    setIsBotLoading(true);
    setBotError(null);
    setSaveResult(null);
    setBotInput("");
    setIsToolPanelExpanded(false);
    setChatMessages((currentMessages) => [
      ...currentMessages,
      ...(visibleUserMessage
        ? [
            {
              id: createChatMessageId(),
              role: "user" as const,
              text: visibleUserMessage
            }
          ]
        : []),
      {
        id: thinkingMessageId,
        isThinking: true,
        role: "assistant",
        text: "Thinking"
      }
    ]);

    try {
      const response = await sendOkrBotMessage({
        action: nextAction,
        activeProposal: botResponse?.proposal,
        conversationHistory,
        memoryLimit: nextMemoryLimit,
        message,
        objectiveId: overrides?.objectiveId,
        projectId: selectedProjectId,
        projectName: selectedProject.name,
        targetLabel: activeTargetLabel,
        targetId: activeTargetId
      });

      setBotResponse(response);
      setChatMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === thinkingMessageId
            ? {
                id: createChatMessageId(),
                role: "assistant",
                text: response.message,
                uiResponse: response.proposal
                  ? {
                      collapsed: true,
                      proposal: response.proposal,
                      type: "proposal" as const
                    }
                  : undefined
              }
            : chatMessage
        )
      );
      setPendingAction(response.nextStep === "provide_prompt" || response.nextStep === "select_target" ? response.action ?? nextAction : undefined);
    } catch (error) {
      setChatMessages((currentMessages) =>
        currentMessages.filter((chatMessage) => chatMessage.id !== thinkingMessageId)
      );
      setBotError(error instanceof Error ? error.message : "Could not contact OKR Bot.");
    } finally {
      setIsBotLoading(false);
    }
  }

  async function confirmProposal() {
    if (!selectedProjectId || !botResponse?.proposal) return;

    const { proposal } = botResponse;
    const draft = proposal.draft;

    if (!isRecord(draft)) {
      setSaveResult({ message: "The proposal payload is not valid.", status: "error" });
      return;
    }

    if (proposal.operation !== "create" && proposal.targetType !== "key_project" && proposal.targetType !== "key_result") {
      setSaveResult({
        message: "Edit proposals are ready for review, but save support is not connected yet.",
        status: "error"
      });
      return;
    }

    const processingMessageId = createChatMessageId();
    setIsBotLoading(true);
    setSaveResult(null);
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: processingMessageId,
        isThinking: true,
        role: "assistant",
        text: "Processing"
      }
    ]);

    try {
      if (proposal.targetType === "objective") {
        const keyResults = Array.isArray(draft.keyResults)
          ? (draft.keyResults as AgileGeneratedKeyResultDraft[])
          : [];
        const singularAgileProjectId = selectedProject?.sourceRecordId?.trim();

        if (!singularAgileProjectId) {
          throw new Error("El Project seleccionado no tiene sourceRecordId para crear Objectives en Singular Agile.");
        }

        if (proposal.operation === "edit") {
          const singularAgileRecordId = getStringField(draft, "sourceRecordId");

          if (!singularAgileRecordId) {
            throw new Error("El Objective seleccionado no tiene sourceRecordId para editar en Singular Agile.");
          }

          await updateSingularAgileObjective({
            description: getStringField(draft, "description"),
            explanation: getStringField(draft, "explanation"),
            metric: getStringField(draft, "metric"),
            objective: getStringField(draft, "objective"),
            priority: getStringField(draft, "priority"),
            recordId: singularAgileRecordId,
            targetDate: getStringField(draft, "targetDate"),
            type: getStringField(draft, "type")
          });
        } else {
          await createSingularAgileObjective({
            aiSuggestedKeyResults: keyResults.length > 0 ? JSON.stringify(keyResults) : undefined,
            description: getStringField(draft, "description"),
            explanation: getStringField(draft, "explanation"),
            metric: getStringField(draft, "metric"),
            objective: getStringField(draft, "objective"),
            priority: getStringField(draft, "priority"),
            projectIds: [singularAgileProjectId],
            targetDate: getStringField(draft, "targetDate"),
            type: getStringField(draft, "type")
          });
        }
      } else if (proposal.targetType === "key_result" && proposal.operation === "create") {
        const objectiveId = getStringField(draft, "objectiveId");
        const selectedObjective = selectedProjectData?.objectives.find((objective) => objective.id === objectiveId);
        const singularAgileProjectId = selectedProject?.sourceRecordId?.trim();
        const singularAgileObjectiveId = selectedObjective?.recordId?.trim();

        if (!singularAgileProjectId) {
          throw new Error("El Project seleccionado no tiene sourceRecordId para crear KRs en Singular Agile.");
        }

        if (objectiveId && !singularAgileObjectiveId) {
          throw new Error("El Objective seleccionado no tiene sourceRecordId para crear KRs en Singular Agile.");
        }

        await createSingularAgileKeyResult({
          currentValue: getNumberField(draft, "currentValue"),
          explanation: getStringField(draft, "explanation"),
          initialValue: getNumberField(draft, "initialValue"),
          keyResult: getStringField(draft, "keyResult"),
          metric: getStringField(draft, "metric"),
          objectiveIds: singularAgileObjectiveId ? [singularAgileObjectiveId] : [],
          projectIds: [singularAgileProjectId],
          status: getStringField(draft, "status") as "Done" | "In progress" | "Todo",
          targetDate: getStringField(draft, "targetDate"),
          targetValue: getNumberField(draft, "targetValue")
        });
      } else if (proposal.targetType === "key_result") {
        const singularAgileRecordId = getStringField(draft, "sourceRecordId");

        if (!singularAgileRecordId) {
          throw new Error("El Key Result seleccionado no tiene sourceRecordId para editar en Singular Agile.");
        }

        await updateSingularAgileKeyResult({
          currentValue: getNumberField(draft, "currentValue"),
          explanation: getStringField(draft, "explanation"),
          initialValue: getNumberField(draft, "initialValue"),
          keyResult: getStringField(draft, "keyResult"),
          metric: getStringField(draft, "metric"),
          recordId: singularAgileRecordId,
          status: getStringField(draft, "status") as "Done" | "In progress" | "Todo",
          targetDate: getStringField(draft, "targetDate"),
          targetValue: getNumberField(draft, "targetValue")
        });
      } else if (proposal.operation === "create") {
        const singularAgileProjectId = selectedProject?.sourceRecordId?.trim();

        if (!singularAgileProjectId) {
          throw new Error("El Project seleccionado no tiene sourceRecordId para crear KPs en Singular Agile.");
        }

        await createSingularAgileKeyProject({
          clarity: getNumberField(draft, "clarity"),
          dontShowInSingularStories: false,
          epicStory: getStringField(draft, "epicStory"),
          finalScore: getNumberField(draft, "finalScore"),
          justification: getStringField(draft, "justification"),
          keyResultIds: getStringArrayField(draft, "keyResultIds"),
          name: getStringField(draft, "name"),
          projectIds: [singularAgileProjectId],
          status: "Suggested by Resource",
          strategicFocus: getNumberField(draft, "strategicFocus"),
          valueOrientation: getNumberField(draft, "valueOrientation")
        });
      } else {
        const singularAgileProjectId = selectedProject?.sourceRecordId?.trim();
        const singularAgileRecordId = getStringField(draft, "recordId");

        if (!singularAgileProjectId) {
          throw new Error("El Project seleccionado no tiene sourceRecordId para editar KPs en Singular Agile.");
        }

        if (!singularAgileRecordId) {
          throw new Error("El Key Project seleccionado no tiene recordId para editar en Singular Agile.");
        }

        await updateSingularAgileKeyProject({
          clarity: getNumberField(draft, "clarity"),
          dontShowInSingularStories: false,
          epicStory: getStringField(draft, "epicStory"),
          finalScore: getNumberField(draft, "finalScore"),
          justification: getStringField(draft, "justification"),
          keyResultIds: getStringArrayField(draft, "keyResultIds"),
          name: getStringField(draft, "name"),
          projectIds: [singularAgileProjectId],
          recordId: singularAgileRecordId,
          status: getStringField(draft, "status") || "Suggested by Resource",
          strategicFocus: getNumberField(draft, "strategicFocus"),
          valueOrientation: getNumberField(draft, "valueOrientation")
        });
      }

      invalidateProject(selectedProjectId);
      await ensureProjectData(selectedProjectId, { force: true });
      setBotResponse({
        ...botResponse,
        action: null,
        message: "Saved. I refreshed the project context.",
        nextStep: "choose_action",
        proposal: undefined
      });
      setPendingAction(undefined);
      setChatMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === processingMessageId
            ? {
                id: createChatMessageId(),
                role: "assistant",
                text: "Saved. I refreshed the project context."
              }
            : chatMessage
        )
      );
      setSaveResult({ message: "The proposal was saved and the project context was refreshed.", status: "success" });
    } catch (error) {
      setChatMessages((currentMessages) =>
        currentMessages.filter((chatMessage) => chatMessage.id !== processingMessageId)
      );
      setSaveResult({
        message: error instanceof Error ? error.message : "The proposal could not be saved.",
        status: "error"
      });
    } finally {
      setIsBotLoading(false);
    }
  }

  const botEntityOptions =
    botResponse?.nextStep === "select_target"
      ? (botResponse.options ?? []).filter(
          (option): option is { id: string; label: string; meta?: string; searchText?: string } =>
            typeof option === "object" && option !== null && "id" in option && "label" in option
        )
      : [];
  const activeProposalMessageId = botResponse?.proposal
    ? [...chatMessages].reverse().find((message) => message.uiResponse?.type === "proposal" || message.proposal)?.id
    : null;

  return (
    <section className="okr-bot-workspace" aria-label="OKR Bot workspace">
      <div className="okr-bot-project-panel">
        <label className="client-okrs-project-filter">
          <span>Project</span>
          <select
            aria-label="Project"
            disabled={isLoadingProjects || projects.length === 0}
            onChange={(event) => setSelectedProjectId(event.target.value)}
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

        <div className="okr-bot-context-controls">
          <div className="okr-bot-memory-settings">
            <button
              aria-expanded={isMemorySettingsOpen}
              aria-label="Configure OKR Bot memory"
              className="okr-bot-memory-settings-button"
              onClick={() => setIsMemorySettingsOpen((isOpen) => !isOpen)}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
                <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.15 2.15 0 0 1-3.04 3.04l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65v.15a2.15 2.15 0 0 1-4.3 0v-.08a1.8 1.8 0 0 0-1.18-1.68 1.8 1.8 0 0 0-1.98.36l-.05.05a2.15 2.15 0 0 1-3.04-3.04l.05-.05A1.8 1.8 0 0 0 3.52 15a1.8 1.8 0 0 0-1.65-1.09h-.15a2.15 2.15 0 0 1 0-4.3h.08a1.8 1.8 0 0 0 1.68-1.18 1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.15 2.15 0 0 1 3.04-3.04l.05.05a1.8 1.8 0 0 0 1.98.36h.07A1.8 1.8 0 0 0 9.3 2.12v-.1a2.15 2.15 0 0 1 4.3 0v.08a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.15 2.15 0 0 1 3.04 3.04l-.05.05a1.8 1.8 0 0 0-.36 1.98v.07a1.8 1.8 0 0 0 1.65 1.09h.1a2.15 2.15 0 0 1 0 4.3h-.08A1.8 1.8 0 0 0 19.4 15Z" />
              </svg>
            </button>

            {isMemorySettingsOpen ? (
              <div className="okr-bot-memory-settings-popover">
                <label>
                  <span>Memory</span>
                  <input
                    inputMode="numeric"
                    min={1}
                    onBlur={(event) => commitMemoryLimit(event.target.value)}
                    onChange={(event) => setMemoryLimitInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitMemoryLimit(memoryLimitInput);
                        setIsMemorySettingsOpen(false);
                      }
                    }}
                    type="number"
                    value={memoryLimitInput}
                  />
                </label>
                <small>Memory: last {memoryLimit} messages</small>
              </div>
            ) : null}
          </div>

          <div className="okr-bot-export-chat">
            <button
              aria-label="Export OKR Bot conversation"
              className="okr-bot-export-chat-button"
              disabled={!selectedProjectId || chatMessages.length === 0}
              onClick={() => {
                setIsMemorySettingsOpen(false);
                setIsClearChatConfirmOpen(false);
                exportCurrentChatHistory();
              }}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 3v11" />
                <path d="m7 9 5 5 5-5" />
                <path d="M5 19h14" />
              </svg>
            </button>
          </div>

          <div className="okr-bot-clear-chat">
            <button
              aria-label="Start new OKR Bot chat"
              className="okr-bot-clear-chat-button"
              disabled={!selectedProjectId || isBotLoading}
              onClick={() => {
                setIsMemorySettingsOpen(false);
                setIsClearChatConfirmOpen(true);
              }}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 12a8 8 0 0 1 13.66-5.66" />
                <path d="M18 3v4h-4" />
                <path d="M20 12a8 8 0 0 1-13.66 5.66" />
                <path d="M6 21v-4h4" />
              </svg>
            </button>

            {isClearChatConfirmOpen ? (
              <div className="okr-bot-clear-chat-popover" role="dialog" aria-label="Start new OKR Bot chat">
                <strong>Start new chat?</strong>
                <p>This clears the local OKR Bot chat history for this project. OKR data will not be deleted.</p>
                <div>
                  <button onClick={() => setIsClearChatConfirmOpen(false)} type="button">
                    Cancel
                  </button>
                  <button className="is-danger" onClick={() => void clearCurrentChatHistory()} type="button">
                    Start new
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className={`okr-bot-context-status${contextReady ? " is-ready" : ""}`}>
            <span>Context</span>
            <strong>
              {!selectedProjectId
                ? "Waiting for project"
                : isLoadingContext
                  ? "Loading OKR data"
                  : contextError
                    ? "Context error"
                    : "Ready"}
            </strong>
          </div>
        </div>
      </div>

      {projectsError ? <p className="client-okrs-project-error">{projectsError}</p> : null}
      {contextError ? <p className="client-okrs-project-error">{contextError}</p> : null}
      {botError ? <p className="client-okrs-project-error">{botError}</p> : null}

      <article className={`okr-bot-card${contextReady ? " is-enabled" : " is-disabled"}`}>
        <OkrBotMessage
          activeProposalMessageId={activeProposalMessageId}
          fallbackMessage={
            isBotLoading
              ? "Loading OKR Bot context..."
              : botResponse?.message ??
                (contextReady
                  ? `Hi, I loaded the context for ${selectedProject?.name}. What should we create or edit?`
                  : "Select a project first so I can load its Objectives, Key Results, Key Projects, and related context.")
          }
          messages={chatMessages}
          onConfirmProposal={() => void confirmProposal()}
          onDiscardProposal={() => {
            if (!botResponse) return;

            setBotResponse({
              ...botResponse,
              action: null,
              message: "Proposal discarded. Choose another action or send a new prompt.",
              nextStep: "choose_action",
              proposal: undefined
            });
            setPendingAction(undefined);
            setChatMessages((currentMessages) => [
              ...currentMessages,
              {
                id: createChatMessageId(),
                role: "assistant",
                text: "Proposal discarded. Choose another action or send a new prompt."
              }
            ]);
            setSaveResult(null);
          }}
          onEditProposal={() => {
            setBotInput(botResponse?.prompt ?? "");
            setSaveResult({
              message: "Send a new instruction in the prompt input to adjust this proposal.",
              status: "success"
            });
          }}
          onSelectOption={(option) => {
            const action = botResponse?.action ?? pendingAction;
            const isOptionalKeyProjectKrSelection =
              action === "create_key_project" &&
              botResponse?.proposal?.targetType === "key_project" &&
              botResponse.nextStep === "select_target";
            const isSkippingKeyResult =
              isOptionalKeyProjectKrSelection && option.id === SKIP_KEY_RESULT_OPTION_ID;
            const selectionType = getSelectionTypeLabel(action);
            const selectionMessage = isSkippingKeyResult
              ? "Continue without linked KR."
              : isOptionalKeyProjectKrSelection
                ? `Selected KR: ${option.label}${option.meta ? ` (${option.meta})` : ""}`
                : `Selected ${selectionType}: ${option.label}${option.meta ? ` (${option.meta})` : ""}`;

            void sendBotRequest(action ?? undefined, {
              displayMessage: selectionMessage,
              message: isOptionalKeyProjectKrSelection ? "" : botResponse?.prompt ?? botInput,
              objectiveId: action === "create_key_result" ? option.id : undefined,
              targetLabel: option.label,
              targetId: action && action !== "create_key_result" ? option.id : undefined
            });
          }}
          options={botEntityOptions}
          optionsDisabled={!contextReady || isBotLoading}
          optionsSuggestionQuery={botResponse?.prompt ?? ""}
          optionsVariant={
            botResponse?.action === "create_key_project" && botResponse.nextStep === "select_target"
              ? "key_result_picker"
              : "default"
          }
          projectSourceRecordId={selectedProject?.sourceRecordId}
        />

        <OkrBotToolResult onDismiss={() => setSaveResult(null)} result={saveResult} />

        <section className={`okr-bot-command-panel${isToolPanelExpanded ? " is-expanded" : " is-collapsed"}`}>
          <button
            aria-controls="okr-bot-command-panel-content"
            aria-expanded={isToolPanelExpanded}
            className="okr-bot-command-toggle"
            onClick={() => setIsToolPanelExpanded((isExpanded) => !isExpanded)}
            type="button"
          >
            <span>
              <strong>Context and actions</strong>
              <small>
                {selectedProjectData?.objectives.length ?? 0} Objectives · {getObjectiveKeyResultsCount(keyResults)}{" "}
                Key Results · {selectedProjectData?.keyProjects.length ?? 0} Key Projects
              </small>
            </span>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              {isToolPanelExpanded ? <path d="m6 15 6-6 6 6" /> : <path d="m6 9 6 6 6-6" />}
            </svg>
          </button>

          <div className="okr-bot-command-panel-content" id="okr-bot-command-panel-content">
            <OkrBotContextSummary
              keyProjectCount={selectedProjectData?.keyProjects.length ?? 0}
              keyResultCount={getObjectiveKeyResultsCount(keyResults)}
              objectiveCount={selectedProjectData?.objectives.length ?? 0}
            />

            <OkrBotActions
              actions={botActions}
              disabled={!contextReady || isBotLoading}
              onSelect={(action) => {
                setPendingAction(action.value);
                void sendBotRequest(action.value);
              }}
            />
          </div>
        </section>

      </article>

      <OkrBotPromptInput
        disabled={!contextReady || isBotLoading}
        onChange={setBotInput}
        onSend={() => void sendBotRequest()}
        placeholder={contextReady ? "Ask the OKR Bot what to create or edit..." : "Select a project to unlock the bot"}
        value={botInput}
      />
    </section>
  );
}
