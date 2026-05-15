import { getOpenAIConfig } from "../config.js";
import { extractDeepSeekOutputText, extractOpenAIOutputText } from "../ai/response-parser.js";
import {
  generateAgileKeyProjectDraft,
  generateAgileKeyProjectEditDraft,
  generateAgileKeyResultEditDraft,
  generateAgileKeyResultDraft,
  generateAgileObjectiveEditDraft,
  generateAgileObjectiveDraft
} from "./ai-drafts.js";
import { listAgileKeyProjectsForProject } from "./airtable-key-projects.js";
import { listAgileKeyResultHistoryBulk } from "./airtable-key-result-history.js";
import { listAgileObjectivesForProject } from "./airtable-objectives.js";
import { listAgileProjectsForCollaborator } from "./airtable-projects.js";

export type OkrBotAction =
  | "create_key_project"
  | "create_key_result"
  | "create_objective"
  | "edit_key_project"
  | "edit_key_result"
  | "edit_objective";

type OkrBotReadIntent =
  | "read_counts"
  | "read_key_projects"
  | "read_key_results"
  | "read_objectives"
  | "read_summary";

type OkrBotRequestInput = {
  action?: OkrBotAction;
  activeProposal?: {
    draft?: unknown;
    operation?: "create" | "edit";
    targetType?: "key_project" | "key_result" | "objective";
  };
  collaboratorEmail?: string;
  conversationHistory?: Array<{
    role?: "assistant" | "user";
    text?: string;
  }>;
  memoryLimit?: number;
  message?: string;
  objectiveId?: string;
  projectId: string;
  projectName?: string;
  targetLabel?: string;
  targetId?: string;
};

type OkrBotEntityOption = {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
};

type OkrBotConversationMessage = {
  role: "assistant" | "user";
  text: string;
};

type OkrBotProposalPayload = NonNullable<OkrBotRequestInput["activeProposal"]>;

type OkrBotKrIntentClassification = {
  action: "create_key_result" | "edit_key_result" | "read" | "unknown";
  confidence: "high" | "low" | "medium";
  count?: number;
  createIdea?: string;
  editInstructions?: string;
  responseMode: "chat" | "proposal";
  targetHint?: string;
};

type OkrBotKpIntentClassification = {
  action: "create_key_project" | "edit_key_project" | "read" | "unknown";
  confidence: "high" | "low" | "medium";
  count?: number;
  createIdea?: string;
  editInstructions?: string;
  linkedKeyResultHint?: string;
  responseMode: "chat" | "proposal";
  skipKeyResult?: boolean;
  targetHint?: string;
};

type OkrBotObjectiveIntentClassification = {
  action: "create_objective" | "edit_objective" | "read" | "unknown";
  confidence: "high" | "low" | "medium";
  count?: number;
  createIdea?: string;
  editInstructions?: string;
  responseMode: "chat" | "proposal";
  targetHint?: string;
};

type OkrBotContext = {
  historyByKeyResultId: Record<string, unknown[]>;
  keyProjects: Awaited<ReturnType<typeof listAgileKeyProjectsForProject>>["keyProjects"];
  keyResultHistoryCount: number;
  keyResults: Awaited<ReturnType<typeof listAgileObjectivesForProject>>["objectives"][number]["keyResults"];
  objectives: Awaited<ReturnType<typeof listAgileObjectivesForProject>>["objectives"];
  project: {
    id: string;
    name: string;
  };
  warnings: string[];
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MEMORY_LIMIT = 20;
const SKIP_KEY_RESULT_OPTION_ID = "__skip_key_result__";
const SKIP_OBJECTIVE_OPTION_ID = "__skip_objective__";

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeMemoryLimit(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : DEFAULT_MEMORY_LIMIT;
}

function normalizeConversationHistory(
  conversationHistory: OkrBotRequestInput["conversationHistory"],
  memoryLimit: number
): OkrBotConversationMessage[] {
  if (!Array.isArray(conversationHistory)) return [];

  return conversationHistory
    .filter((message): message is OkrBotConversationMessage => {
      const text = normalizeText(message.text);
      return (message.role === "assistant" || message.role === "user") && text.length > 0;
    })
    .map((message) => ({
      role: message.role,
      text: normalizeText(message.text)
    }))
    .slice(-memoryLimit);
}

function inferAction(message: string): OkrBotAction | null {
  const normalized = message.toLowerCase();
  const isEdit = /\b(edit|update|improve|change|ajusta|actualiza|edita|editar|mejora|mejorar)\b/.test(normalized);
  const isCreate = /\b(create|new|add|genera|generar|crear|crea|nuevo|agrega)\b/.test(normalized);
  const mentionsKeyProject = /\b(key project|kp|proyecto clave|key proyect)\b/.test(normalized);
  const mentionsKeyResult = /\b(key result|kr|resultado clave)\b/.test(normalized);
  const mentionsObjective = /\b(objective|objetivo)\b/.test(normalized);
  const asksKeyResultProposal =
    mentionsKeyResult &&
    /\b(propuesta|proposal|draft|sugiere|sugerir|sugiereme|sugiéreme|propon|propón|dame|hazme|armame|ármame)\b/.test(
      normalized
    );
  const statesThisIsForKeyResult = /\b(esto|todo esto|esta idea|lo anterior)\b.*\b(para|como)\s+(un\s+)?(kr|key result|resultado clave)\b/.test(
    normalized
  );

  if (isEdit && mentionsKeyProject) return "edit_key_project";
  if (isEdit && mentionsKeyResult) return "edit_key_result";
  if (isEdit && mentionsObjective) return "edit_objective";
  if (isCreate && mentionsKeyProject) return "create_key_project";
  if ((isCreate && mentionsKeyResult) || asksKeyResultProposal || statesThisIsForKeyResult) {
    return "create_key_result";
  }
  if (isCreate && mentionsObjective) return "create_objective";

  return null;
}

function hasKeyProjectEditIntent(message: string) {
  const normalized = message.toLowerCase();

  return /\b(edit|update|improve|change|ajusta|actualiza|actualicemos|edita|editar|mejora|mejorar)\b/.test(
    normalized
  );
}

function inferReadIntent(message: string): OkrBotReadIntent | null {
  const normalized = message.toLowerCase();
  const asksCount = /\b(count|counts|how many|total|cuantos|cuántos|cuantas|cuántas)\b/.test(normalized);
  const asksRead = /\b(read|show|list|review|see|tell me|ver|muestra|listar|lista|revisar|dime|lee)\b/.test(
    normalized
  );
  const mentionsKeyProject = /\b(key project|key projects|kp|proyecto clave|proyectos clave)\b/.test(normalized);
  const mentionsKeyResult = /\b(key result|key results|kr|krs|resultado clave|resultados clave)\b/.test(normalized);
  const mentionsObjective = /\b(objective|objectives|objetivo|objetivos)\b/.test(normalized);
  const asksSummary = /\b(summary|resumen|context|contexto|status|estado|overview)\b/.test(normalized);
  const asksCreateKeyResult =
    mentionsKeyResult &&
    /\b(create|new|add|genera|generar|crear|crea|nuevo|agrega|propuesta|proposal|draft|sugiere|sugerir|sugiereme|sugiéreme|propon|propón|dame|hazme|armame|ármame)\b/.test(
      normalized
    );

  if (asksCreateKeyResult) return null;

  if (asksCount) return "read_counts";
  if (asksRead && mentionsObjective) return "read_objectives";
  if (asksRead && mentionsKeyResult) return "read_key_results";
  if (asksRead && mentionsKeyProject) return "read_key_projects";
  if (asksSummary || asksRead) return "read_summary";

  return null;
}

function hasConversationalReference(message: string) {
  return /\b(that|those|previous|last one|second|third|este|esta|ese|esa|esos|esas|anterior|segundo|tercero|lo anterior|la anterior|la propuesta)\b/i.test(
    message
  );
}

function asksToSwitchKeyProjectTarget(message: string) {
  return /\b(edit another|change key project|switch key project|select another|choose another|wrong key project|use another|editar otro|editar otra|cambiar kp|cambia kp|cambiar key project|seleccionar otro|selecciona otro|elegir otro|escoger otro|me equivoque|me equivoqué|usa otro|usar otro)\b/i.test(
    message
  );
}

function shouldBuildProposalFromConversation(message: string, action: OkrBotAction) {
  const normalized = message.toLowerCase();
  const referencesPrevious = hasConversationalReference(message);
  const asksForProposalFormat =
    /\b(format|formato|draft|proposal|propuesta)\b/.test(normalized) &&
    /\b(create|crear|crea|creemos|key project|kp|proyecto clave)\b/.test(normalized);
  const asksToUsePrevious =
    /\b(use|usa|usar|tomar|toma|mantener|mantén|dejalo|déjalo|asi|así|ese|esa|eso|lo anterior|la anterior|creemos ese|crea ese)\b/.test(
      normalized
    );

  return action === "create_key_project" && (referencesPrevious || asksForProposalFormat || asksToUsePrevious);
}

function isVagueKeyProjectIdea(message: string) {
  const normalized = message
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return true;

  const stripped = normalized
    .replace(
      /\b(i|yo|quiero|quisiera|necesito|puedes|podemos|please|por favor|want|need|create|crear|crea|genera|generar|hacer|haz|make|build|nuevo|nueva|new|un|una|el|la|los|las|de|del|para|sobre|key project|key projects|kp|kps|proyecto clave|proyectos clave|proyecto|epic|formato|proposal|propuesta|damelo|dámelo)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);

  return stripped.length < 8 || words.length < 2;
}

function isVagueObjectiveIdea(message: string) {
  const normalized = message
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return true;

  const stripped = normalized
    .replace(
      /\b(i|yo|quiero|quisiera|necesito|puedes|podemos|please|por favor|want|need|create|crear|crea|genera|generar|hacer|haz|make|build|nuevo|nueva|new|un|una|el|la|los|las|de|del|para|sobre|objective|objectives|objetivo|objetivos|propuesta|proposal|draft)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);

  return stripped.length < 10 || words.length < 3;
}

function isVagueObjectiveEditInstruction(message: string) {
  const normalized = message
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return true;

  const stripped = normalized
    .replace(
      /\b(i|yo|quiero|quisiera|necesito|puedes|podemos|please|por favor|want|need|edit|editar|edita|update|actualiza|actualizar|change|cambiar|ajustar|ajusta|mejorar|mejora|un|una|el|la|los|las|de|del|para|sobre|objective|objectives|objetivo|objetivos)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);

  return stripped.length < 8 || words.length < 2;
}

function isVagueKeyProjectEditInstruction(message: string) {
  const normalized = message
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return true;

  const stripped = normalized
    .replace(
      /\b(i|yo|quiero|quisiera|necesito|puedes|podemos|please|por favor|want|need|edit|editar|edita|update|actualiza|actualizar|change|cambiar|ajustar|ajusta|mejorar|mejora|un|una|el|la|los|las|de|del|para|sobre|key project|key projects|kp|kps|proyecto clave|proyectos clave|proyecto|epic)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);

  return stripped.length < 8 || words.length < 2;
}

function isVagueKeyResultIdea(message: string) {
  const normalized = message
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return true;

  const stripped = normalized
    .replace(
      /\b(i|yo|quiero|quisiera|necesito|puedes|podemos|please|por favor|want|need|create|crear|crea|genera|generar|hacer|haz|make|build|nuevo|nueva|new|un|una|el|la|los|las|de|del|para|sobre|key result|key results|kr|krs|resultado clave|resultados clave|propuesta|proposal|draft|damelo|dámelo)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);

  return stripped.length < 10 || words.length < 3;
}

function isSkipObjectiveMessage(message: string) {
  return /\b(skip|omit|omitelo|omítelo|saltar|saltarlo|sin objective|sin objetivo|no objective|no objetivo|despues|después|luego)\b/i.test(
    message
  );
}

function isVagueKeyResultEditInstruction(message: string) {
  const normalized = message
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return true;

  const stripped = normalized
    .replace(
      /\b(i|yo|quiero|quisiera|necesito|puedes|podemos|please|por favor|want|need|edit|editar|edita|update|actualiza|actualizar|change|cambiar|ajustar|ajusta|mejorar|mejora|un|una|el|la|los|las|de|del|para|sobre|key result|key results|kr|krs|resultado clave|resultados clave)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);

  return stripped.length < 8 || words.length < 2;
}

function isGenericBotInstruction(text: string) {
  const normalized = text.toLowerCase();

  return (
    normalized.includes("i loaded the project context") ||
    normalized.includes("tell me whether you want to create or edit") ||
    normalized.includes("choose the") ||
    normalized.includes("escoge el objective") ||
    normalized.includes("review it before saving") ||
    normalized.includes("send the changes you want") ||
    normalized.includes("select a project first")
  );
}

function pickLatestUsefulConversationText(conversationHistory: OkrBotConversationMessage[]) {
  return [...conversationHistory]
    .reverse()
    .map((message) => message.text.trim())
    .find((text) => text.length > 0 && !isGenericBotInstruction(text));
}

function pickLatestUsefulUserConversationText(conversationHistory: OkrBotConversationMessage[]) {
  return [...conversationHistory]
    .reverse()
    .filter((message) => message.role === "user")
    .map((message) => message.text.trim())
    .find((text) => text.length > 0 && !/^\d+$/.test(text) && !isGenericBotInstruction(text));
}

function findLatestMentionedKeyResultInConversation(
  context: OkrBotContext,
  conversationHistory: OkrBotConversationMessage[]
) {
  for (const conversationMessage of [...conversationHistory].reverse()) {
    const keyResult = findMentionedKeyResult(context, conversationMessage.text);

    if (keyResult) {
      return keyResult;
    }
  }

  return undefined;
}

function getOptionIndexSelection(message: string) {
  const trimmed = message.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const selectedIndex = Number(trimmed);
  return Number.isInteger(selectedIndex) && selectedIndex > 0 ? selectedIndex - 1 : null;
}

function stripMarkdownNoise(value: string) {
  return value
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

function extractLabeledValue(source: string, labels: string[]) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?(?:${labelPattern})(?:\\*\\*)?\\s*[:：-]\\s*(.+)$`, "i");

  for (const line of lines) {
    const match = pattern.exec(line);
    if (match?.[1]) {
      return stripMarkdownNoise(match[1]);
    }
  }

  return "";
}

function getFirstMeaningfulLine(source: string) {
  return (
    source
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(stripMarkdownNoise)
      .find((line) => line.length > 0 && !/^[-_]{3,}$/.test(line) && !/^propuesta\s+\d+/i.test(line)) ?? ""
  );
}

function truncateDraftText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}…` : normalized;
}

function getKeyProjectNameCandidate(source: string, fallbackMessage: string) {
  const labeledName = extractLabeledValue(source, ["name", "nombre"]);

  if (labeledName) {
    return labeledName;
  }

  const firstLine = getFirstMeaningfulLine(source) || fallbackMessage;
  const cleanedLine = firstLine
    .replace(
      /^(?:dame|crea|crear|genera|generar|haz|hacer|ayudame|ayúdame)\s+(?:un|una)?\s*(?:kp|key project|proyecto clave)?\s*(?:que\s+sea\s+)?(?:de\s+)?/i,
      ""
    )
    .replace(/^(?:para|sobre|relacionado\s+a)\s+/i, "")
    .trim();

  if (cleanedLine.length > 0 && cleanedLine.length < firstLine.trim().length) {
    return cleanedLine;
  }

  return firstLine;
}

function buildKeyProjectDraftFromText(params: {
  context: OkrBotContext;
  fallbackMessage: string;
  sourceText: string;
}) {
  const sourceText = params.sourceText.trim() || params.fallbackMessage.trim();
  const name = truncateDraftText(getKeyProjectNameCandidate(sourceText, params.fallbackMessage), 90);
  const epicStory =
    extractLabeledValue(sourceText, [
      "description",
      "descripcion",
      "descripción",
      "epic story",
      "historia",
      "alcance",
      "scope"
    ]) || truncateDraftText(sourceText, 500);
  const justification =
    extractLabeledValue(sourceText, [
      "justification",
      "justificacion",
      "justificación",
      "resultado esperado",
      "expected outcome",
      "criterios de éxito",
      "criterios de exito",
      "success criteria"
    ]) || "Generated from the OKR Bot conversation.";

  return {
    epicStory,
    justification,
    name,
    projectId: params.context.project.id,
    status: "Suggested by Resource"
  };
}

function getKeyProjectIdeaFromDraft(draft: unknown) {
  if (!isPlainRecord(draft)) return "";

  return [draft.epicStory, draft.justification, draft.name]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .trim();
}

function buildEditableKeyProjectForPrompt(
  keyProject: OkrBotContext["keyProjects"][number],
  context: OkrBotContext
) {
  const singularAgileRecordId = normalizeText(keyProject.sourceRecordId);

  if (!singularAgileRecordId) {
    throw new Error(
      `No puedo actualizar "${keyProject.name || keyProject.id}" porque no tiene sourceRecordId para Singular Agile.`
    );
  }

  return {
    clarity: keyProject.clarity ?? 0,
    epicStory: keyProject.story || "",
    finalScore: keyProject.finalScore ?? 0,
    justification: keyProject.justification || "",
    keyResultIds: keyProject.keyResultIds,
    name: keyProject.name,
    recordId: singularAgileRecordId,
    status: "Suggested by Resource",
    strategicFocus: keyProject.strategicFocus ?? 0,
    valueOrientation: keyProject.valueOrientation ?? 0,
    projectId: context.project.id
  };
}

async function generateKeyProjectProposalDraft(params: {
  context: OkrBotContext;
  idea: string;
  selectedKeyResult?: OkrBotContext["keyResults"][number] | null;
}) {
  const draft = await generateAgileKeyProjectDraft({
    existingKeyProjects: params.context.keyProjects,
    existingKeyResults: params.context.keyResults,
    idea: params.idea,
    objectives: params.context.objectives,
    projectId: params.context.project.id,
    projectName: params.context.project.name,
    selectedKeyResult: params.selectedKeyResult ?? null
  });

  return draft.draft;
}

function buildEditableKeyResultForPrompt(
  keyResult: OkrBotContext["keyResults"][number],
  context: OkrBotContext
) {
  const objective = findObjectiveForKeyResult(context, keyResult.id);

  return {
    currentValue: keyResult.currentValue,
    explanation: keyResult.explanation || "",
    initialValue: keyResult.initialValue,
    keyResult: keyResult.title,
    metric: keyResult.metric || "",
    objectiveId: objective?.id || "",
    progress: keyResult.progress,
    recordId: keyResult.id,
    sourceRecordId: keyResult.sourceRecordId,
    status: keyResult.status || "Todo",
    targetDate: keyResult.targetDate || "",
    targetValue: keyResult.targetValue
  };
}

async function generateKeyResultEditProposalDraft(params: {
  context: OkrBotContext;
  message: string;
  targetId: string;
}) {
  const keyResult = findKeyResultByAnyId(params.context, params.targetId);
  if (!keyResult) return null;

  const objective = findObjectiveForKeyResult(params.context, keyResult.id);
  const draft = await generateAgileKeyResultEditDraft({
    currentKeyResult: buildEditableKeyResultForPrompt(keyResult, params.context),
    editInstructions: params.message,
    keyResultHistory: params.context.historyByKeyResultId[keyResult.id] ?? [],
    objective: objective ?? null,
    projectId: params.context.project.id,
    projectName: params.context.project.name,
    siblingKeyResults: objective?.keyResults ?? []
  });

  return {
    ...(isPlainRecord(draft.draft) ? draft.draft : {}),
    objectiveId: objective?.id || "",
    recordId: keyResult.id,
    sourceRecordId: keyResult.sourceRecordId || ""
  };
}

function buildEditableObjectiveForPrompt(objective: OkrBotContext["objectives"][number]) {
  return {
    description: objective.description || "",
    explanation: objective.explanation || "",
    metric: objective.metric || "",
    objective: objective.objective || objective.name || "",
    priority: objective.priority || "",
    recordId: objective.id,
    sourceRecordId: objective.recordId,
    status: objective.status || "Pending Review",
    targetDate: objective.targetDate || "",
    type: objective.type || ""
  };
}

async function generateObjectiveEditProposalDraft(params: {
  context: OkrBotContext;
  message: string;
  targetId: string;
}) {
  const objective = params.context.objectives.find(
    (item) => item.id === params.targetId || item.recordId === params.targetId
  );
  if (!objective) return null;

  const draft = await generateAgileObjectiveEditDraft({
    currentObjective: buildEditableObjectiveForPrompt(objective),
    editInstructions: params.message,
    keyProjects: params.context.keyProjects,
    keyResults: objective.keyResults ?? [],
    projectId: params.context.project.id,
    projectName: params.context.project.name
  });

  return {
    ...(isPlainRecord(draft.draft) ? draft.draft : {}),
    recordId: objective.id,
    sourceRecordId: objective.recordId || ""
  };
}

async function generateKeyProjectEditProposalDraft(params: {
  context: OkrBotContext;
  message: string;
  targetId: string;
}) {
  const keyProject = params.context.keyProjects.find((item) => item.id === params.targetId);
  if (!keyProject) return null;

  const draft = await generateAgileKeyProjectEditDraft({
    currentKeyProject: buildEditableKeyProjectForPrompt(keyProject, params.context),
    editInstructions: params.message,
    existingKeyResults: params.context.keyResults,
    objectives: params.context.objectives,
    projectId: params.context.project.id,
    projectName: params.context.project.name
  });

  return draft.draft;
}

function buildEntityOptions(
  items: Array<{
    explanation?: string;
    id: string;
    metric?: string;
    name?: string;
    objective?: string;
    status?: string | null;
    title?: string;
  }>
) {
  return items.map((item) => ({
    id: item.id,
    label: item.objective || item.title || item.name || item.id,
    meta: item.status ?? undefined,
    searchText: [item.id, item.objective, item.title, item.name, item.metric, item.explanation, item.status]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
  }));
}

function buildKeyResultOptions(context: OkrBotContext) {
  return context.keyResults.map((keyResult) => {
    const objective = context.objectives.find((item) =>
      (item.keyResults ?? []).some((objectiveKeyResult) => objectiveKeyResult.id === keyResult.id)
    );
    const label = keyResult.title || keyResult.id;

    return {
      id: keyResult.id,
      label,
      meta: keyResult.status ?? undefined,
      searchText: [
        keyResult.id,
        label,
        keyResult.metric,
        keyResult.explanation,
        keyResult.status,
        objective?.objective,
        objective?.name
      ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" ")
    };
  });
}

function buildOptionalKeyResultOptions(context: OkrBotContext) {
  return [
    {
      id: SKIP_KEY_RESULT_OPTION_ID,
      label: "Continue without linked KR",
      meta: "Optional",
      searchText: "continue without linked key result skip no kr optional"
    },
    ...buildKeyResultOptions(context)
  ];
}

function buildOptionalObjectiveOptions(context: OkrBotContext) {
  return [
    ...buildEntityOptions(context.objectives),
    {
      id: SKIP_OBJECTIVE_OPTION_ID,
      label: "Continue without Objective",
      meta: "Optional",
      searchText: "continue without objective skip no objective optional saltar sin objetivo"
    }
  ];
}

function findKeyResultByAnyId(context: OkrBotContext, id: string | undefined) {
  const targetId = normalizeText(id);
  if (!targetId) return undefined;

  return context.keyResults.find(
    (keyResult) => keyResult.id === targetId || keyResult.sourceRecordId === targetId || keyResult.code === targetId
  );
}

function findMentionedKeyResult(context: OkrBotContext, message: string) {
  const normalizedMessage = message.toLowerCase();

  return context.keyResults.find((keyResult) => {
    const tokens = [keyResult.id, keyResult.sourceRecordId, keyResult.code, keyResult.title]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.toLowerCase());

    return tokens.some((token) => normalizedMessage.includes(token));
  });
}

function findMentionedKeyProject(context: OkrBotContext, message: string) {
  const normalizedMessage = message.toLowerCase();

  return context.keyProjects.find((keyProject) => {
    const tokens = [keyProject.id, keyProject.sourceRecordId, keyProject.keyProjectId, keyProject.name]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.toLowerCase());

    return tokens.some((token) => normalizedMessage.includes(token));
  });
}

function findMentionedObjective(context: OkrBotContext, message: string) {
  const normalizedMessage = message.toLowerCase();

  return context.objectives.find((objective) => {
    const tokens = [objective.id, objective.recordId, objective.objective, objective.name]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.toLowerCase());

    return tokens.some((token) => normalizedMessage.includes(token));
  });
}

function findMentionedObjectiveInConversation(
  context: OkrBotContext,
  conversationHistory: OkrBotConversationMessage[]
) {
  for (const conversationMessage of [...conversationHistory].reverse()) {
    const objective = findMentionedObjective(context, conversationMessage.text);

    if (objective) {
      return objective;
    }
  }

  return undefined;
}

function findMentionedKeyProjectInConversation(
  context: OkrBotContext,
  conversationHistory: OkrBotConversationMessage[]
) {
  for (const conversationMessage of [...conversationHistory].reverse()) {
    const keyProject = findMentionedKeyProject(context, conversationMessage.text);

    if (keyProject) {
      return keyProject;
    }
  }

  return undefined;
}

function getKeyResultLinkId(keyResult: OkrBotContext["keyResults"][number]) {
  return keyResult.sourceRecordId || keyResult.id;
}

function findObjectiveForKeyResult(context: OkrBotContext, keyResultId: string | undefined) {
  const targetId = normalizeText(keyResultId);
  if (!targetId) return undefined;

  return context.objectives.find((objective) =>
    (objective.keyResults ?? []).some(
      (keyResult) =>
        keyResult.id === targetId || keyResult.sourceRecordId === targetId || keyResult.code === targetId
    )
  );
}

function pickProjectName(params: {
  collaboratorEmail?: string;
  projectId: string;
  projectName?: string;
  projects?: Awaited<ReturnType<typeof listAgileProjectsForCollaborator>>["projects"];
}) {
  return (
    params.projectName?.trim() ||
    params.projects?.find((project) => project.id === params.projectId)?.name ||
    params.projectId
  );
}

async function loadOkrBotContext(input: OkrBotRequestInput): Promise<OkrBotContext> {
  const projectId = normalizeText(input.projectId);

  if (!projectId) {
    throw new Error("El projectId es obligatorio.");
  }

  const [projectsPayload, objectivesPayload, keyProjectsPayload] = await Promise.all([
    input.collaboratorEmail
      ? listAgileProjectsForCollaborator(input.collaboratorEmail)
      : Promise.resolve(undefined),
    listAgileObjectivesForProject(projectId),
    listAgileKeyProjectsForProject(projectId)
  ]);
  const keyResults = objectivesPayload.objectives.flatMap((objective) => objective.keyResults ?? []);
  const warnings: string[] = [];
  let historyByKeyResultId: Record<string, unknown[]> = {};
  let keyResultHistoryCount = 0;

  try {
    const historyPayload = await listAgileKeyResultHistoryBulk(keyResults.map((keyResult) => keyResult.id));
    historyByKeyResultId = Object.fromEntries(
      Object.entries(historyPayload.historyByKeyResultId).map(([keyResultId, history]) => [
        keyResultId,
        history.slice(-100)
      ])
    );
    keyResultHistoryCount = Object.values(historyByKeyResultId).reduce(
      (total, history) => total + history.length,
      0
    );
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `KR history could not be loaded: ${error.message}`
        : "KR history could not be loaded."
    );
  }

  return {
    historyByKeyResultId,
    keyProjects: keyProjectsPayload.keyProjects,
    keyResultHistoryCount,
    keyResults,
    objectives: objectivesPayload.objectives,
    project: {
      id: projectId,
      name: pickProjectName({
        collaboratorEmail: input.collaboratorEmail,
        projectId,
        projectName: input.projectName,
        projects: projectsPayload?.projects
      })
    },
    warnings
  };
}

function buildContextSummary(context: OkrBotContext) {
  return {
    keyProjectCount: context.keyProjects.length,
    keyResultCount: context.keyResults.length,
    keyResultHistoryCount: context.keyResultHistoryCount,
    objectiveCount: context.objectives.length,
    project: context.project,
    warnings: context.warnings
  };
}

function buildSelectionResponse(params: {
  action: OkrBotAction;
  context: OkrBotContext;
  message: string;
  options: OkrBotEntityOption[];
  prompt: string;
}) {
  return {
    action: params.action,
    context: buildContextSummary(params.context),
    message: params.message,
    nextStep: "select_target",
    ok: true,
    options: params.options,
    prompt: params.prompt
  };
}

function getSelectedTargetLabel(params: {
  action: OkrBotAction;
  context: OkrBotContext;
  targetId?: string;
  targetLabel?: string;
}) {
  const explicitLabel = normalizeText(params.targetLabel);

  if (explicitLabel) return explicitLabel;

  if (params.action === "edit_objective") {
    const objective = params.context.objectives.find((item) => item.id === params.targetId);
    return objective?.objective || objective?.name || params.targetId || "selected Objective";
  }

  if (params.action === "edit_key_result") {
    const keyResult = params.context.keyResults.find((item) => item.id === params.targetId);
    return keyResult?.title || params.targetId || "selected Key Result";
  }

  if (params.action === "edit_key_project") {
    const keyProject = params.context.keyProjects.find((item) => item.id === params.targetId);
    return keyProject?.name || params.targetId || "selected Key Project";
  }

  return params.targetId || "selected target";
}

function getSelectedTargetType(action: OkrBotAction) {
  if (action === "edit_objective") return "Objective";
  if (action === "edit_key_result") return "Key Result";
  if (action === "edit_key_project") return "Key Project";
  return "target";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanDraftValue(value: string) {
  return value
    .trim()
    .replace(/^["'“”]+|["'“”.]+$/g, "")
    .trim();
}

function coerceDraftValue(currentValue: unknown, nextValue: string) {
  const cleanedValue = cleanDraftValue(nextValue);

  if (typeof currentValue === "number") {
    const numericValue = Number(cleanedValue.replace(/%$/, ""));
    return Number.isFinite(numericValue) ? numericValue : currentValue;
  }

  if (typeof currentValue === "boolean") {
    return /^(true|yes|si|sí)$/i.test(cleanedValue);
  }

  return cleanedValue;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getDraftFieldAliases(targetType?: string) {
  const aliases: Array<{ aliases: string[]; key: string }> = [
    { aliases: ["description", "descripcion", "descripción"], key: "description" },
    { aliases: ["explanation", "explicacion", "explicación"], key: "explanation" },
    { aliases: ["metric", "metrica", "métrica"], key: "metric" },
    { aliases: ["objective", "objetivo"], key: "objective" },
    { aliases: ["priority", "prioridad"], key: "priority" },
    { aliases: ["target date", "targetDate", "fecha objetivo", "fecha"], key: "targetDate" },
    { aliases: ["type", "tipo"], key: "type" },
    { aliases: ["status", "estado"], key: "status" },
    { aliases: ["current", "current value", "currentValue", "actual"], key: "currentValue" },
    { aliases: ["initial", "initial value", "initialValue", "inicial"], key: "initialValue" },
    { aliases: ["target", "target value", "targetValue", "meta"], key: "targetValue" },
    { aliases: ["key result", "keyResult", "kr", "resultado clave"], key: "keyResult" },
    { aliases: ["name", "nombre"], key: "name" },
    { aliases: ["justification", "justificacion", "justificación"], key: "justification" },
    { aliases: ["epic story", "epicStory", "story", "historia"], key: "epicStory" },
    { aliases: ["clarity", "claridad", "clarity score"], key: "clarity" },
    { aliases: ["strategic focus", "strategicFocus", "foco estratégico", "foco estrategico"], key: "strategicFocus" },
    { aliases: ["value orientation", "valueOrientation", "orientación a valor", "orientacion a valor"], key: "valueOrientation" },
    { aliases: ["final score", "finalScore", "score final"], key: "finalScore" }
  ];

  if (targetType === "objective") {
    return aliases.filter(({ key }) =>
      ["description", "explanation", "metric", "objective", "priority", "targetDate", "type"].includes(key)
    );
  }

  if (targetType === "key_result") {
    return aliases.filter(({ key }) =>
      [
        "currentValue",
        "explanation",
        "initialValue",
        "keyResult",
        "metric",
        "status",
        "targetDate",
        "targetValue"
      ].includes(key)
    );
  }

  if (targetType === "key_project") {
    return aliases.filter(({ key }) =>
      [
        "clarity",
        "epicStory",
        "finalScore",
        "justification",
        "name",
        "status",
        "strategicFocus",
        "valueOrientation"
      ].includes(key)
    );
  }

  return aliases;
}

function applyMessageToProposalDraft(proposal: OkrBotProposalPayload, message: string) {
  if (!isPlainRecord(proposal.draft)) return null;

  const draft = { ...proposal.draft };
  const normalizedMessage = message.trim();
  let changedField: string | null = null;
  const replacementMatch =
    /\b(?:no\s+es|no\s+era|cambia|cambiar|reemplaza|reemplazar|sustituye|sustituir)\s+["'“”]?(.+?)["'“”]?\s+(?:es|por|a)\s+["'“”]?(.+?)["'“”]?[.!?]?$/i.exec(
      normalizedMessage
    );

  if (
    (proposal.targetType === "key_result" || proposal.targetType === "key_project" || proposal.targetType === "objective") &&
    replacementMatch?.[1] &&
    replacementMatch[2]
  ) {
    const searchText = cleanDraftValue(replacementMatch[1]);
    const replacementText = cleanDraftValue(replacementMatch[2]);
    const replacementPattern = new RegExp(`\\b${escapeRegExp(searchText)}\\b`, "gi");
    const changedFields: string[] = [];
    const replacementFields =
      proposal.targetType === "key_result"
        ? (["keyResult", "metric", "explanation"] as const)
        : proposal.targetType === "key_project"
          ? (["name", "epicStory", "justification"] as const)
          : (["objective", "description", "explanation", "metric"] as const);

    for (const fieldName of replacementFields) {
      const currentValue = draft[fieldName];

      if (typeof currentValue !== "string" || !replacementPattern.test(currentValue)) {
        replacementPattern.lastIndex = 0;
        continue;
      }

      replacementPattern.lastIndex = 0;
      draft[fieldName] = currentValue.replace(replacementPattern, replacementText);
      changedFields.push(fieldName);
    }

    if (changedFields.length > 0) {
      return {
        changedField: changedFields.join(", "),
        draft
      };
    }
  }

  for (const field of getDraftFieldAliases(proposal.targetType)) {
    for (const alias of field.aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `(?:^|\\b)(?:change|set|update|cambia|cambiar|actualiza|pon|poner|el|la|los|las)?\\s*${escapedAlias}\\s*(?:is|to|as|=|:|es|a|como|por)\\s+(.+)$`,
        "i"
      );
      const match = pattern.exec(normalizedMessage);

      if (match?.[1]) {
        draft[field.key] = coerceDraftValue(draft[field.key], match[1]);
        changedField = field.key;
        break;
      }
    }

    if (changedField) break;
  }

  if (!changedField) return null;

  return {
    changedField,
    draft
  };
}

function serializeOkrContextForAssistant(context: OkrBotContext) {
  const keyResultsByAnyId = buildKeyResultsByAnyId(context);

  return {
    project: context.project,
    counts: {
      keyProjects: context.keyProjects.length,
      keyResults: context.keyResults.length,
      keyResultHistoryRecords: context.keyResultHistoryCount,
      objectives: context.objectives.length
    },
    objectives: context.objectives.map((objective) => ({
      id: objective.id,
      title: objective.objective || objective.name,
      description: objective.description,
      explanation: objective.explanation,
      metric: objective.metric,
      priority: objective.priority,
      quarter: objective.quarter,
      score: objective.score,
      status: objective.status,
      targetDate: objective.targetDate,
      type: objective.type,
      keyResults: (objective.keyResults ?? []).map((keyResult) => ({
        id: keyResult.id,
        sourceRecordId: keyResult.sourceRecordId,
        title: keyResult.title,
        metric: keyResult.metric,
        explanation: keyResult.explanation,
        status: keyResult.status,
        initialValue: keyResult.initialValue,
        currentValue: keyResult.currentValue,
        targetValue: keyResult.targetValue,
        progress: keyResult.progress,
        targetDate: keyResult.targetDate,
        keyProjects: context.keyProjects
          .filter((keyProject) => keyResultMatchesKeyProject(keyResult, keyProject))
          .filter(Boolean)
          .map((keyProject) => ({
            id: keyProject.id,
            name: keyProject.name,
            status: keyProject.status,
            totalStories: keyProject.totalStories
          })),
        history: (context.historyByKeyResultId[keyResult.id] ?? []).slice(-20)
      }))
    })),
    keyProjects: context.keyProjects.map((keyProject) => ({
      id: keyProject.id,
      name: keyProject.name,
      story: keyProject.story,
      justification: keyProject.justification,
      status: keyProject.status,
      totalStories: keyProject.totalStories,
      finalScore: keyProject.finalScore,
      qualityScore: keyProject.qualityScore,
      clarity: keyProject.clarity,
      strategicFocus: keyProject.strategicFocus,
      valueOrientation: keyProject.valueOrientation,
      keyResultIds: keyProject.keyResultIds,
      keyResults: findRelatedKeyResultsForKeyProject(keyProject, context, keyResultsByAnyId)
        .map((keyResult) => ({
          id: keyResult.id,
          sourceRecordId: keyResult.sourceRecordId,
          title: keyResult.title
        }))
    })),
    warnings: context.warnings
  };
}

async function callOkrBotModel(params: {
  context: OkrBotContext;
  conversationHistory: OkrBotConversationMessage[];
  message: string;
}) {
  const openAIConfig = getOpenAIConfig();
  const model = openAIConfig.assistantModel || openAIConfig.model;

  if (!openAIConfig.apiKey || !model) {
    throw new Error("No hay modelo configurado para el OKR Bot.");
  }

  const input = [
    "You are OKR Bot, a practical assistant for OKR analysis and OKR data management.",
    "Answer the user's question using only the provided OKR context.",
    "Use the same language as the user. If the user writes Spanish, answer in Spanish.",
    "Be concise but useful. For summaries, synthesize objectives, KR progress, risks, and next actions.",
    "If the requested data is missing, say what is missing and what is available.",
    "Do not invent records, metrics, dates, or scores.",
    "When the user asks to create or edit data, explain that you can generate a proposal and ask for the missing fields if needed.",
    "Use the recent conversation history to resolve references like 'that KR', 'the previous one', 'este', 'lo anterior', or 'la propuesta anterior'.",
    "",
    "Recent conversation history JSON:",
    JSON.stringify(params.conversationHistory),
    "",
    `User question: ${params.message}`,
    "",
    "OKR context JSON:",
    JSON.stringify(serializeOkrContextForAssistant(params.context))
  ].join("\n");

  if (openAIConfig.provider === "deepseek") {
    const response = await fetch(`${openAIConfig.deepSeekBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      body: JSON.stringify({
        messages: [
          {
            content:
              "You are OKR Bot. Answer with plain text only, no markdown table unless explicitly requested.",
            role: "system"
          },
          {
            content: input,
            role: "user"
          }
        ],
        model,
        max_tokens: 1200,
        stream: false
      }),
      headers: {
        Authorization: `Bearer ${openAIConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed with status ${response.status}`);
    }

    return extractDeepSeekOutputText(await response.json())?.trim() || null;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input,
      max_output_tokens: 1200,
      model,
      reasoning: openAIConfig.reasoningEffort
        ? {
            effort: openAIConfig.reasoningEffort
          }
        : undefined
    }),
    headers: {
      Authorization: `Bearer ${openAIConfig.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  return extractOpenAIOutputText(await response.json())?.trim() || null;
}

function parseJsonObject(text: string | null) {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    const match = /\{[\s\S]*\}/.exec(text);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
}

function normalizeKrIntentClassification(value: unknown): OkrBotKrIntentClassification | null {
  if (!isPlainRecord(value)) return null;

  const action = value.action;
  const confidence = value.confidence;
  const responseMode = value.responseMode;

  if (
    action !== "create_key_result" &&
    action !== "edit_key_result" &&
    action !== "read" &&
    action !== "unknown"
  ) {
    return null;
  }

  if (confidence !== "high" && confidence !== "medium" && confidence !== "low") {
    return null;
  }

  return {
    action,
    confidence,
    count: typeof value.count === "number" && Number.isFinite(value.count) ? Math.max(1, Math.round(value.count)) : undefined,
    createIdea: typeof value.createIdea === "string" ? value.createIdea.trim() : undefined,
    editInstructions: typeof value.editInstructions === "string" ? value.editInstructions.trim() : undefined,
    responseMode: responseMode === "chat" ? "chat" : "proposal",
    targetHint: typeof value.targetHint === "string" ? value.targetHint.trim() : undefined
  };
}

function normalizeKpIntentClassification(value: unknown): OkrBotKpIntentClassification | null {
  if (!isPlainRecord(value)) return null;

  const action = value.action;
  const confidence = value.confidence;
  const responseMode = value.responseMode;

  if (
    action !== "create_key_project" &&
    action !== "edit_key_project" &&
    action !== "read" &&
    action !== "unknown"
  ) {
    return null;
  }

  if (confidence !== "high" && confidence !== "medium" && confidence !== "low") {
    return null;
  }

  return {
    action,
    confidence,
    count: typeof value.count === "number" && Number.isFinite(value.count) ? Math.max(1, Math.round(value.count)) : undefined,
    createIdea: typeof value.createIdea === "string" ? value.createIdea.trim() : undefined,
    editInstructions: typeof value.editInstructions === "string" ? value.editInstructions.trim() : undefined,
    linkedKeyResultHint: typeof value.linkedKeyResultHint === "string" ? value.linkedKeyResultHint.trim() : undefined,
    responseMode: responseMode === "chat" ? "chat" : "proposal",
    skipKeyResult: typeof value.skipKeyResult === "boolean" ? value.skipKeyResult : undefined,
    targetHint: typeof value.targetHint === "string" ? value.targetHint.trim() : undefined
  };
}

function normalizeObjectiveIntentClassification(value: unknown): OkrBotObjectiveIntentClassification | null {
  if (!isPlainRecord(value)) return null;

  const action = value.action;
  const confidence = value.confidence;
  const responseMode = value.responseMode;

  if (action !== "create_objective" && action !== "edit_objective" && action !== "read" && action !== "unknown") {
    return null;
  }

  if (confidence !== "high" && confidence !== "medium" && confidence !== "low") {
    return null;
  }

  return {
    action,
    confidence,
    count: typeof value.count === "number" && Number.isFinite(value.count) ? Math.max(1, Math.round(value.count)) : undefined,
    createIdea: typeof value.createIdea === "string" ? value.createIdea.trim() : undefined,
    editInstructions: typeof value.editInstructions === "string" ? value.editInstructions.trim() : undefined,
    responseMode: responseMode === "chat" ? "chat" : "proposal",
    targetHint: typeof value.targetHint === "string" ? value.targetHint.trim() : undefined
  };
}

async function classifyKeyResultIntentWithAI(params: {
  context: OkrBotContext;
  conversationHistory: OkrBotConversationMessage[];
  message: string;
}) {
  const openAIConfig = getOpenAIConfig();
  const model = openAIConfig.assistantModel || openAIConfig.model;

  if (!openAIConfig.apiKey || !model || !params.message) return null;

  const keyResultSummaries = params.context.keyResults.slice(0, 25).map((keyResult) => ({
    id: keyResult.id,
    sourceRecordId: keyResult.sourceRecordId,
    code: keyResult.code,
    title: keyResult.title,
    metric: keyResult.metric,
    targetValue: keyResult.targetValue,
    targetDate: keyResult.targetDate,
    status: keyResult.status
  }));
  const input = [
    "Classify only whether the user wants to create or edit a Key Result (KR).",
    "Return JSON only. Do not answer the user.",
    "Use recent conversation to resolve references like 'ese', 'esta data', 'actualiza', 'hazlo', or an earlier mentioned KR code.",
    "If the user asks to change, update, adjust, correct, or apply data to an existing KR, classify as edit_key_result.",
    "If the user asks for a new KR or a KR proposal, classify as create_key_result.",
    "Set responseMode to chat when the user asks only for ideas, alternatives, examples, a list, a recommendation, or explicitly says to answer in chat / not create yet.",
    "Set responseMode to chat when the user asks for multiple KRs unless they explicitly asks to create/save proposals now.",
    "Set responseMode to proposal only when the user wants the bot to prepare a saveable proposal UI.",
    "If the user is only asking to list, show, explain, or summarize KRs, classify as read.",
    "If unsure, classify as unknown with low confidence.",
    "For edit_key_result, include targetHint when a KR code, id, sourceRecordId, or clear title is available. If there is exactly one KR and the user refers to editing a KR, use that KR as targetHint.",
    "For edit_key_result, include editInstructions as the concrete change request, preserving numbers and business meaning.",
    "For create_key_result, include createIdea only when the user provided the actual KR idea, not just a generic intent.",
    "",
    "JSON shape:",
    JSON.stringify({
      action: "create_key_result | edit_key_result | read | unknown",
      confidence: "high | medium | low",
      count: 1,
      createIdea: "optional KR idea",
      editInstructions: "optional edit instructions",
      responseMode: "proposal | chat",
      targetHint: "optional KR id/code/title/sourceRecordId"
    }),
    "",
    "Recent conversation history JSON:",
    JSON.stringify(params.conversationHistory.slice(-8)),
    "",
    `User message: ${params.message}`,
    "",
    "Available Key Results JSON:",
    JSON.stringify(keyResultSummaries)
  ].join("\n\n");

  try {
    if (openAIConfig.provider === "deepseek") {
      const response = await fetch(`${openAIConfig.deepSeekBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        body: JSON.stringify({
          messages: [
            {
              content: "Return valid JSON only. No markdown fences.",
              role: "system"
            },
            {
              content: input,
              role: "user"
            }
          ],
          model,
          max_tokens: 500,
          response_format: {
            type: "json_object"
          },
          stream: false
        }),
        headers: {
          Authorization: `Bearer ${openAIConfig.apiKey}`,
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) return null;

      return normalizeKrIntentClassification(parseJsonObject(extractDeepSeekOutputText(await response.json()) ?? null));
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      body: JSON.stringify({
        input,
        max_output_tokens: 500,
        model,
        reasoning: openAIConfig.reasoningEffort
          ? {
              effort: openAIConfig.reasoningEffort
            }
          : undefined,
        text: {
          format: {
            type: "json_schema",
            name: "okr_bot_kr_intent",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: {
                  type: "string",
                  enum: ["create_key_result", "edit_key_result", "read", "unknown"]
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"]
                },
                count: {
                  type: "number"
                },
                createIdea: {
                  type: "string"
                },
                editInstructions: {
                  type: "string"
                },
                responseMode: {
                  type: "string",
                  enum: ["proposal", "chat"]
                },
                targetHint: {
                  type: "string"
                }
              },
              required: ["action", "confidence", "count", "createIdea", "editInstructions", "responseMode", "targetHint"]
            }
          }
        }
      }),
      headers: {
        Authorization: `Bearer ${openAIConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) return null;

    return normalizeKrIntentClassification(parseJsonObject(extractOpenAIOutputText(await response.json()) ?? null));
  } catch {
    return null;
  }
}

async function classifyKeyProjectIntentWithAI(params: {
  context: OkrBotContext;
  conversationHistory: OkrBotConversationMessage[];
  message: string;
}) {
  const openAIConfig = getOpenAIConfig();
  const model = openAIConfig.assistantModel || openAIConfig.model;

  if (!openAIConfig.apiKey || !model || !params.message) return null;

  const keyProjectSummaries = params.context.keyProjects.slice(0, 25).map((keyProject) => ({
    id: keyProject.id,
    sourceRecordId: keyProject.sourceRecordId,
    keyProjectId: keyProject.keyProjectId,
    name: keyProject.name,
    status: keyProject.status,
    justification: keyProject.justification
  }));
  const keyResultSummaries = params.context.keyResults.slice(0, 25).map((keyResult) => ({
    id: keyResult.id,
    sourceRecordId: keyResult.sourceRecordId,
    code: keyResult.code,
    title: keyResult.title
  }));
  const input = [
    "Classify only whether the user wants to create or edit a Key Project (KP).",
    "Return JSON only. Do not answer the user.",
    "Use recent conversation to resolve references like 'ese', 'esta data', 'actualiza', 'hazlo', 'sin KR', or an earlier mentioned KP/KR.",
    "If the user asks to change, update, adjust, correct, or apply data to an existing KP, classify as edit_key_project.",
    "If the user asks for a new KP, Key Project, Proyecto Clave, Epic, delivery work, or proposal for implementation work, classify as create_key_project.",
    "Set responseMode to chat when the user asks only for ideas, alternatives, examples, a list, a recommendation, or explicitly says to answer in chat / not create yet.",
    "Set responseMode to chat when the user asks for multiple KPs unless they explicitly asks to create/save proposals now.",
    "Set responseMode to proposal only when the user wants the bot to prepare a saveable proposal UI.",
    "If the user wants to link or not link a KR to a new KP, set linkedKeyResultHint or skipKeyResult.",
    "If the user is only asking to list, show, explain, or summarize KPs, classify as read.",
    "If unsure, classify as unknown with low confidence.",
    "For edit_key_project, include targetHint when a KP id, sourceRecordId, keyProjectId, or clear name is available. If there is exactly one KP and the user refers to editing a KP, use that KP as targetHint.",
    "For edit_key_project, include editInstructions as the concrete change request.",
    "For create_key_project, include createIdea only when the user provided the actual project/delivery idea, not just a generic intent.",
    "",
    "JSON shape:",
    JSON.stringify({
      action: "create_key_project | edit_key_project | read | unknown",
      confidence: "high | medium | low",
      count: 1,
      createIdea: "optional KP idea",
      editInstructions: "optional edit instructions",
      linkedKeyResultHint: "optional KR id/code/title/sourceRecordId",
      responseMode: "proposal | chat",
      skipKeyResult: false,
      targetHint: "optional KP id/name/sourceRecordId"
    }),
    "",
    "Recent conversation history JSON:",
    JSON.stringify(params.conversationHistory.slice(-8)),
    "",
    `User message: ${params.message}`,
    "",
    "Available Key Projects JSON:",
    JSON.stringify(keyProjectSummaries),
    "",
    "Available Key Results JSON:",
    JSON.stringify(keyResultSummaries)
  ].join("\n\n");

  try {
    if (openAIConfig.provider === "deepseek") {
      const response = await fetch(`${openAIConfig.deepSeekBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        body: JSON.stringify({
          messages: [
            {
              content: "Return valid JSON only. No markdown fences.",
              role: "system"
            },
            {
              content: input,
              role: "user"
            }
          ],
          model,
          max_tokens: 600,
          response_format: {
            type: "json_object"
          },
          stream: false
        }),
        headers: {
          Authorization: `Bearer ${openAIConfig.apiKey}`,
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) return null;

      return normalizeKpIntentClassification(parseJsonObject(extractDeepSeekOutputText(await response.json()) ?? null));
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      body: JSON.stringify({
        input,
        max_output_tokens: 600,
        model,
        reasoning: openAIConfig.reasoningEffort
          ? {
              effort: openAIConfig.reasoningEffort
            }
          : undefined,
        text: {
          format: {
            type: "json_schema",
            name: "okr_bot_kp_intent",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: {
                  type: "string",
                  enum: ["create_key_project", "edit_key_project", "read", "unknown"]
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"]
                },
                count: {
                  type: "number"
                },
                createIdea: {
                  type: "string"
                },
                editInstructions: {
                  type: "string"
                },
                linkedKeyResultHint: {
                  type: "string"
                },
                responseMode: {
                  type: "string",
                  enum: ["proposal", "chat"]
                },
                skipKeyResult: {
                  type: "boolean"
                },
                targetHint: {
                  type: "string"
                }
              },
              required: [
                "action",
                "confidence",
                "count",
                "createIdea",
                "editInstructions",
                "linkedKeyResultHint",
                "responseMode",
                "skipKeyResult",
                "targetHint"
              ]
            }
          }
        }
      }),
      headers: {
        Authorization: `Bearer ${openAIConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) return null;

    return normalizeKpIntentClassification(parseJsonObject(extractOpenAIOutputText(await response.json()) ?? null));
  } catch {
    return null;
  }
}

async function classifyObjectiveIntentWithAI(params: {
  context: OkrBotContext;
  conversationHistory: OkrBotConversationMessage[];
  message: string;
}) {
  const openAIConfig = getOpenAIConfig();
  const model = openAIConfig.assistantModel || openAIConfig.model;

  if (!openAIConfig.apiKey || !model || !params.message) return null;

  const objectiveSummaries = params.context.objectives.slice(0, 25).map((objective) => ({
    id: objective.id,
    sourceRecordId: objective.recordId,
    title: objective.objective || objective.name,
    metric: objective.metric,
    status: objective.status,
    targetDate: objective.targetDate,
    type: objective.type
  }));
  const input = [
    "Classify only whether the user wants to create or edit an Objective.",
    "Return JSON only. Do not answer the user.",
    "Use recent conversation to resolve references like 'ese', 'esta data', 'actualiza', 'hazlo', or an earlier mentioned Objective.",
    "If the user asks to change, update, adjust, correct, or apply data to an existing Objective, classify as edit_objective.",
    "If the user asks for a new Objective or Objective proposal, classify as create_objective.",
    "Set responseMode to chat when the user asks only for ideas, alternatives, examples, a list, a recommendation, or explicitly says to answer in chat / not create yet.",
    "Set responseMode to chat when the user asks for multiple Objectives unless they explicitly asks to create/save proposals now.",
    "Set responseMode to proposal only when the user wants the bot to prepare a saveable proposal UI.",
    "If the user is only asking to list, show, explain, or summarize Objectives, classify as read.",
    "If unsure, classify as unknown with low confidence.",
    "For edit_objective, include targetHint when an Objective id, sourceRecordId, or clear title is available. If there is exactly one Objective and the user refers to editing an Objective, use that Objective as targetHint.",
    "For edit_objective, include editInstructions as the concrete change request.",
    "For create_objective, include createIdea only when the user provided the actual Objective idea, not just a generic intent.",
    "",
    "JSON shape:",
    JSON.stringify({
      action: "create_objective | edit_objective | read | unknown",
      confidence: "high | medium | low",
      count: 1,
      createIdea: "optional Objective idea",
      editInstructions: "optional edit instructions",
      responseMode: "proposal | chat",
      targetHint: "optional Objective id/title/sourceRecordId"
    }),
    "",
    "Recent conversation history JSON:",
    JSON.stringify(params.conversationHistory.slice(-8)),
    "",
    `User message: ${params.message}`,
    "",
    "Available Objectives JSON:",
    JSON.stringify(objectiveSummaries)
  ].join("\n\n");

  try {
    if (openAIConfig.provider === "deepseek") {
      const response = await fetch(`${openAIConfig.deepSeekBaseUrl.replace(/\/$/, "")}/chat/completions`, {
        body: JSON.stringify({
          messages: [
            {
              content: "Return valid JSON only. No markdown fences.",
              role: "system"
            },
            {
              content: input,
              role: "user"
            }
          ],
          model,
          max_tokens: 500,
          response_format: {
            type: "json_object"
          },
          stream: false
        }),
        headers: {
          Authorization: `Bearer ${openAIConfig.apiKey}`,
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) return null;

      return normalizeObjectiveIntentClassification(
        parseJsonObject(extractDeepSeekOutputText(await response.json()) ?? null)
      );
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      body: JSON.stringify({
        input,
        max_output_tokens: 500,
        model,
        reasoning: openAIConfig.reasoningEffort
          ? {
              effort: openAIConfig.reasoningEffort
            }
          : undefined,
        text: {
          format: {
            type: "json_schema",
            name: "okr_bot_objective_intent",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: {
                  type: "string",
                  enum: ["create_objective", "edit_objective", "read", "unknown"]
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"]
                },
                count: {
                  type: "number"
                },
                createIdea: {
                  type: "string"
                },
                editInstructions: {
                  type: "string"
                },
                responseMode: {
                  type: "string",
                  enum: ["proposal", "chat"]
                },
                targetHint: {
                  type: "string"
                }
              },
              required: ["action", "confidence", "count", "createIdea", "editInstructions", "responseMode", "targetHint"]
            }
          }
        }
      }),
      headers: {
        Authorization: `Bearer ${openAIConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) return null;

    return normalizeObjectiveIntentClassification(parseJsonObject(extractOpenAIOutputText(await response.json()) ?? null));
  } catch {
    return null;
  }
}

function buildOptionsList(items: string[]) {
  if (items.length === 0) return "No records found.";

  return items
    .slice(0, 6)
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");
}

function buildKeyResultsByAnyId(context: OkrBotContext) {
  const keyResultsByAnyId = new Map<string, OkrBotContext["keyResults"][number]>();

  for (const keyResult of context.keyResults) {
    if (keyResult.id) {
      keyResultsByAnyId.set(keyResult.id, keyResult);
    }

    if (keyResult.sourceRecordId) {
      keyResultsByAnyId.set(keyResult.sourceRecordId, keyResult);
    }
  }

  return keyResultsByAnyId;
}

function normalizeAssociationLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^#\d+\s*-\s*/, "")
    .trim();
}

function keyResultMatchesKeyProject(
  keyResult: OkrBotContext["keyResults"][number],
  keyProject: OkrBotContext["keyProjects"][number]
) {
  if (keyResult.keyProjectIds?.includes(keyProject.id)) {
    return true;
  }

  if (keyProject.sourceRecordId && keyResult.keyProjectIds?.includes(keyProject.sourceRecordId)) {
    return true;
  }

  const keyProjectLabels = [
    keyProject.keyProjectId,
    keyProject.name,
    keyProject.sourceRecordId,
    keyProject.id
  ]
    .filter((label): label is string => Boolean(label?.trim()))
    .map(normalizeAssociationLabel);

  return (keyResult.keyProjectLabels ?? [])
    .map(normalizeAssociationLabel)
    .some((label) => keyProjectLabels.includes(label));
}

function findRelatedKeyResultsForKeyProject(
  keyProject: OkrBotContext["keyProjects"][number],
  context: OkrBotContext,
  keyResultsByAnyId: Map<string, OkrBotContext["keyResults"][number]>
) {
  const relatedByDirectIds = keyProject.keyResultIds
    .map((keyResultId) => keyResultsByAnyId.get(keyResultId))
    .filter((keyResult): keyResult is OkrBotContext["keyResults"][number] => Boolean(keyResult));

  const keyProjectKeyResultLabels = (keyProject.keyResultLabels ?? []).map(normalizeAssociationLabel);
  const relatedByLabels = context.keyResults.filter((keyResult) => {
    if (keyResultMatchesKeyProject(keyResult, keyProject)) {
      return true;
    }

    if (keyProjectKeyResultLabels.length === 0) {
      return false;
    }

    const keyResultLabels = [keyResult.title, keyResult.code, keyResult.sourceRecordId, keyResult.id]
      .filter((label): label is string => Boolean(label?.trim()))
      .map(normalizeAssociationLabel);

    return keyProjectKeyResultLabels.some((label) => keyResultLabels.includes(label));
  });

  return [...new Map([...relatedByDirectIds, ...relatedByLabels].map((keyResult) => [keyResult.id, keyResult])).values()];
}

function formatKeyProjectReadItem(
  keyProject: OkrBotContext["keyProjects"][number],
  context: OkrBotContext,
  keyResultsByAnyId: Map<string, OkrBotContext["keyResults"][number]>
) {
  const relatedKeyResults = findRelatedKeyResultsForKeyProject(keyProject, context, keyResultsByAnyId)
    .map((keyResult) => keyResult?.title || keyResult?.id)
    .filter((label): label is string => Boolean(label?.trim()));
  const relatedLabel =
    relatedKeyResults.length > 0 ? `KR related: ${relatedKeyResults.join(", ")}` : "KR related: none assigned";
  const statusLabel = keyProject.status ? `Status: ${keyProject.status}` : "Status: Not set";

  return `${keyProject.name || keyProject.id}\n   - ${statusLabel}\n   - ${relatedLabel}`;
}

function buildReadResponse(params: {
  context: OkrBotContext;
  intent: OkrBotReadIntent;
}) {
  const { context, intent } = params;
  const summary = buildContextSummary(context);

  if (intent === "read_counts") {
    return {
      action: null,
      context: summary,
      message: `${context.project.name} has ${context.objectives.length} Objectives, ${context.keyResults.length} Key Results, and ${context.keyProjects.length} Key Projects loaded.`,
      nextStep: "choose_action",
      ok: true
    };
  }

  if (intent === "read_objectives") {
    return {
      action: null,
      context: summary,
      message: `Objectives in ${context.project.name}:\n${buildOptionsList(
        context.objectives.map((objective) => objective.objective || objective.name || objective.id)
      )}`,
      nextStep: "choose_action",
      ok: true
    };
  }

  if (intent === "read_key_results") {
    return {
      action: null,
      context: summary,
      message: `Key Results in ${context.project.name}:\n${buildOptionsList(
        context.keyResults.map((keyResult) => keyResult.title || keyResult.id)
      )}`,
      nextStep: "choose_action",
      ok: true
    };
  }

  if (intent === "read_key_projects") {
    const keyResultsByAnyId = buildKeyResultsByAnyId(context);

    return {
      action: null,
      context: summary,
      message: `Key Projects in ${context.project.name}:\n${buildOptionsList(
        context.keyProjects.map((keyProject) => formatKeyProjectReadItem(keyProject, context, keyResultsByAnyId))
      )}`,
      nextStep: "choose_action",
      ok: true
    };
  }

  return {
    action: null,
    context: summary,
    message: `${context.project.name} context is loaded: ${context.objectives.length} Objectives, ${context.keyResults.length} Key Results, ${context.keyProjects.length} Key Projects, and ${context.keyResultHistoryCount} KR history records. I can read this context or help create/edit Objective, Key Result, or Key Project proposals.`,
    nextStep: "choose_action",
    ok: true
  };
}

export async function createOkrBotReply(input: OkrBotRequestInput) {
  const message = normalizeText(input.message);
  const memoryLimit = normalizeMemoryLimit(input.memoryLimit);
  const conversationHistory = normalizeConversationHistory(input.conversationHistory, memoryLimit);
  const context = await loadOkrBotContext(input);
  let action = input.action ?? inferAction(message);
  let classifiedKrIntent: OkrBotKrIntentClassification | null = null;
  let classifiedKpIntent: OkrBotKpIntentClassification | null = null;
  let classifiedObjectiveIntent: OkrBotObjectiveIntentClassification | null = null;
  const inferredKeyProjectTarget =
    message && hasKeyProjectEditIntent(message)
      ? findMentionedKeyProject(context, message) ?? findMentionedKeyProjectInConversation(context, conversationHistory)
      : undefined;
  let targetId = normalizeText(input.targetId) || inferredKeyProjectTarget?.id || "";
  let targetLabel = normalizeText(input.targetLabel) || inferredKeyProjectTarget?.name || "";

  if (!action && inferredKeyProjectTarget) {
    action = "edit_key_project";
  }

  if (input.activeProposal && message) {
    const proposalUpdate = applyMessageToProposalDraft(input.activeProposal, message);

    if (proposalUpdate) {
      return {
        action: action ?? null,
        context: buildContextSummary(context),
        message: `I updated the ${proposalUpdate.changedField} in the active proposal. Review it before saving.`,
        nextStep: "confirm_proposal",
        ok: true,
        proposal: {
          draft: proposalUpdate.draft,
          operation: input.activeProposal.operation ?? "create",
          targetType: input.activeProposal.targetType ?? "objective"
        }
      };
    }
  }

  if (!action && message) {
    classifiedKpIntent = await classifyKeyProjectIntentWithAI({
      context,
      conversationHistory,
      message
    });

    if (
      classifiedKpIntent &&
      classifiedKpIntent.action !== "read" &&
      classifiedKpIntent.action !== "unknown" &&
      classifiedKpIntent.confidence !== "low"
    ) {
      action = classifiedKpIntent.action;

      if (classifiedKpIntent.action === "edit_key_project" && !targetId) {
        const targetFromHint = classifiedKpIntent.targetHint
          ? findMentionedKeyProject(context, classifiedKpIntent.targetHint)
          : undefined;
        const targetFromConversation = findMentionedKeyProjectInConversation(context, conversationHistory);
        const inferredKeyProjectTarget =
          targetFromHint ??
          targetFromConversation ??
          (context.keyProjects.length === 1 ? context.keyProjects[0] : undefined);

        if (inferredKeyProjectTarget) {
          targetId = inferredKeyProjectTarget.id;
          targetLabel =
            inferredKeyProjectTarget.name ||
            inferredKeyProjectTarget.keyProjectId ||
            inferredKeyProjectTarget.id;
        }
      }
    }
  }

  if (!action && message) {
    classifiedKrIntent = await classifyKeyResultIntentWithAI({
      context,
      conversationHistory,
      message
    });

    if (
      classifiedKrIntent &&
      classifiedKrIntent.action !== "read" &&
      classifiedKrIntent.action !== "unknown" &&
      classifiedKrIntent.confidence !== "low"
    ) {
      action = classifiedKrIntent.action;

      if (classifiedKrIntent.action === "edit_key_result" && !targetId) {
        const targetFromHint = classifiedKrIntent.targetHint
          ? findMentionedKeyResult(context, classifiedKrIntent.targetHint)
          : undefined;
        const targetFromConversation = findLatestMentionedKeyResultInConversation(context, conversationHistory);
        const inferredKeyResultTarget =
          targetFromHint ?? targetFromConversation ?? (context.keyResults.length === 1 ? context.keyResults[0] : undefined);

        if (inferredKeyResultTarget) {
          targetId = inferredKeyResultTarget.id;
          targetLabel = inferredKeyResultTarget.title || inferredKeyResultTarget.code || inferredKeyResultTarget.id;
        }
      }
    }
  }

  if (!action && message) {
    classifiedObjectiveIntent = await classifyObjectiveIntentWithAI({
      context,
      conversationHistory,
      message
    });

    if (
      classifiedObjectiveIntent &&
      classifiedObjectiveIntent.action !== "read" &&
      classifiedObjectiveIntent.action !== "unknown" &&
      classifiedObjectiveIntent.confidence !== "low"
    ) {
      action = classifiedObjectiveIntent.action;

      if (classifiedObjectiveIntent.action === "edit_objective" && !targetId) {
        const targetFromHint = classifiedObjectiveIntent.targetHint
          ? findMentionedObjective(context, classifiedObjectiveIntent.targetHint)
          : undefined;
        const targetFromConversation = findMentionedObjectiveInConversation(context, conversationHistory);
        const inferredObjectiveTarget =
          targetFromHint ??
          targetFromConversation ??
          (context.objectives.length === 1 ? context.objectives[0] : undefined);

        if (inferredObjectiveTarget) {
          targetId = inferredObjectiveTarget.id;
          targetLabel = inferredObjectiveTarget.objective || inferredObjectiveTarget.name || inferredObjectiveTarget.id;
        }
      }
    }
  }

  if (
    message &&
    !classifiedKpIntent &&
    (action === "create_key_project" || action === "edit_key_project")
  ) {
    classifiedKpIntent = await classifyKeyProjectIntentWithAI({
      context,
      conversationHistory,
      message
    });

    if (classifiedKpIntent?.action === "edit_key_project" && !targetId && classifiedKpIntent.confidence !== "low") {
      const targetFromHint = classifiedKpIntent.targetHint
        ? findMentionedKeyProject(context, classifiedKpIntent.targetHint)
        : undefined;
      const targetFromConversation = findMentionedKeyProjectInConversation(context, conversationHistory);
      const inferredKeyProjectTarget =
        targetFromHint ??
        targetFromConversation ??
        (context.keyProjects.length === 1 ? context.keyProjects[0] : undefined);

      if (inferredKeyProjectTarget) {
        targetId = inferredKeyProjectTarget.id;
        targetLabel =
          inferredKeyProjectTarget.name ||
          inferredKeyProjectTarget.keyProjectId ||
          inferredKeyProjectTarget.id;
      }
    }
  }

  if (
    message &&
    !classifiedKrIntent &&
    (action === "create_key_result" || action === "edit_key_result")
  ) {
    classifiedKrIntent = await classifyKeyResultIntentWithAI({
      context,
      conversationHistory,
      message
    });

    if (classifiedKrIntent?.action === "edit_key_result" && !targetId && classifiedKrIntent.confidence !== "low") {
      const targetFromHint = classifiedKrIntent.targetHint
        ? findMentionedKeyResult(context, classifiedKrIntent.targetHint)
        : undefined;
      const targetFromConversation = findLatestMentionedKeyResultInConversation(context, conversationHistory);
      const inferredKeyResultTarget =
        targetFromHint ?? targetFromConversation ?? (context.keyResults.length === 1 ? context.keyResults[0] : undefined);

      if (inferredKeyResultTarget) {
        targetId = inferredKeyResultTarget.id;
        targetLabel = inferredKeyResultTarget.title || inferredKeyResultTarget.code || inferredKeyResultTarget.id;
      }
    }
  }

  if (
    message &&
    !classifiedObjectiveIntent &&
    (action === "create_objective" || action === "edit_objective")
  ) {
    classifiedObjectiveIntent = await classifyObjectiveIntentWithAI({
      context,
      conversationHistory,
      message
    });

    if (classifiedObjectiveIntent?.action === "edit_objective" && !targetId && classifiedObjectiveIntent.confidence !== "low") {
      const targetFromHint = classifiedObjectiveIntent.targetHint
        ? findMentionedObjective(context, classifiedObjectiveIntent.targetHint)
        : undefined;
      const targetFromConversation = findMentionedObjectiveInConversation(context, conversationHistory);
      const inferredObjectiveTarget =
        targetFromHint ??
        targetFromConversation ??
        (context.objectives.length === 1 ? context.objectives[0] : undefined);

      if (inferredObjectiveTarget) {
        targetId = inferredObjectiveTarget.id;
        targetLabel = inferredObjectiveTarget.objective || inferredObjectiveTarget.name || inferredObjectiveTarget.id;
      }
    }
  }

  const chatModeIntent =
    classifiedKrIntent?.responseMode === "chat" && classifiedKrIntent.confidence !== "low"
      ? classifiedKrIntent
      : classifiedKpIntent?.responseMode === "chat" && classifiedKpIntent.confidence !== "low"
        ? classifiedKpIntent
        : classifiedObjectiveIntent?.responseMode === "chat" && classifiedObjectiveIntent.confidence !== "low"
          ? classifiedObjectiveIntent
          : null;

  if (message && chatModeIntent) {
    try {
      const countInstruction =
        chatModeIntent.count && chatModeIntent.count > 1
          ? ` Provide exactly ${chatModeIntent.count} items if the user asked for options.`
          : "";
      const aiMessage = await callOkrBotModel({
        context,
        conversationHistory,
        message: `${message}\n\nImportant: respond in chat only. Do not create a proposal, do not ask for target selection, do not ask for save confirmation, and do not imply anything was saved.${countInstruction}`
      });

      if (aiMessage) {
        return {
          action: null,
          context: buildContextSummary(context),
          message: aiMessage,
          nextStep: "choose_action",
          ok: true
        };
      }
    } catch (error) {
      context.warnings.push(
        error instanceof Error ? `OKR Bot chat-mode response failed: ${error.message}` : "OKR Bot chat-mode response failed."
      );
    }
  }

  if (!action) {
    const readIntent = message ? inferReadIntent(message) : null;

    if (readIntent === "read_counts" && !hasConversationalReference(message)) {
      return buildReadResponse({ context, intent: readIntent });
    }

    if (
      readIntent &&
      readIntent !== "read_summary" &&
      !hasConversationalReference(message)
    ) {
      return buildReadResponse({ context, intent: readIntent });
    }

    if (message) {
      try {
        const aiMessage = await callOkrBotModel({ context, conversationHistory, message });

        if (aiMessage) {
          return {
            action: null,
            context: buildContextSummary(context),
            message: aiMessage,
            nextStep: "choose_action",
            ok: true
          };
        }
      } catch (error) {
        context.warnings.push(
          error instanceof Error ? `OKR Bot AI response failed: ${error.message}` : "OKR Bot AI response failed."
        );
      }

      if (readIntent) {
        return buildReadResponse({ context, intent: readIntent });
      }

      return {
        action: null,
        context: buildContextSummary(context),
        message: `${context.project.name} is loaded. I can answer questions about its Objectives, Key Results, Key Projects, and KR history, or help you create/edit OKR records. What would you like to review or change?`,
        nextStep: "choose_action",
        ok: true,
        options: [
          "read_summary",
          "read_objectives",
          "read_key_results",
          "read_key_projects",
          "create_objective",
          "edit_objective",
          "create_key_result",
          "edit_key_result",
          "create_key_project",
          "edit_key_project"
        ]
      };
    }

    return {
      action: null,
      context: buildContextSummary(context),
      message:
        "I loaded the project context. Tell me whether you want to create or edit an Objective, Key Result, or Key Project.",
      nextStep: "choose_action",
      ok: true,
      options: [
        "create_objective",
        "edit_objective",
        "create_key_result",
        "edit_key_result",
        "create_key_project",
        "edit_key_project"
      ]
    };
  }

  if (action === "create_objective") {
    const objectiveCreateMessage = classifiedObjectiveIntent?.createIdea || message;

    if (!objectiveCreateMessage || isVagueObjectiveIdea(objectiveCreateMessage)) {
      return {
        action,
        context: buildContextSummary(context),
        message: "Tell me the Objective idea you want to create for this project.",
        nextStep: "provide_prompt",
        ok: true
      };
    }

    const draft = await generateAgileObjectiveDraft({
      existingObjectives: context.objectives,
      idea: objectiveCreateMessage,
      keyProjects: context.keyProjects,
      projectId: context.project.id,
      projectName: context.project.name
    });

    return {
      action,
      context: buildContextSummary(context),
      message: "I created an Objective proposal. Review it before saving.",
      nextStep: "confirm_proposal",
      ok: true,
      proposal: {
        draft: draft.draft,
        operation: "create",
        targetType: "objective"
      }
    };
  }

  if (action === "create_key_result") {
    const keyResultCreateMessage = classifiedKrIntent?.createIdea || message;

    if (!keyResultCreateMessage) {
      return {
        action,
        context: buildContextSummary(context),
        message: "Tell me the Key Result idea you want to create.",
        nextStep: "provide_prompt",
        ok: true
      };
    }

    const selectedObjectiveIndex = getOptionIndexSelection(keyResultCreateMessage);
    const wantsToSkipObjective =
      input.objectiveId === SKIP_OBJECTIVE_OPTION_ID || isSkipObjectiveMessage(keyResultCreateMessage);
    const objective =
      (wantsToSkipObjective ? undefined : context.objectives.find((item) => item.id === input.objectiveId)) ??
      (selectedObjectiveIndex === null ? undefined : context.objectives[selectedObjectiveIndex]);
    const keyResultIdea =
      selectedObjectiveIndex === null && !wantsToSkipObjective
        ? keyResultCreateMessage
        : pickLatestUsefulUserConversationText(conversationHistory) ?? "";

    if (
      !keyResultIdea ||
      (selectedObjectiveIndex === null && !wantsToSkipObjective && isVagueKeyResultIdea(keyResultCreateMessage))
    ) {
      return {
        action,
        context: buildContextSummary(context),
        message: "Dime la idea del KR que quieres crear.",
        nextStep: "provide_prompt",
        ok: true
      };
    }

    if (!objective && !wantsToSkipObjective) {
      return buildSelectionResponse({
        action,
        context,
        message: "¿Quieres escoger un Objective para unir este KR o prefieres saltarlo por ahora?",
        options: buildOptionalObjectiveOptions(context),
        prompt: keyResultIdea
      });
    }

    const draft = await generateAgileKeyResultDraft({
      existingKeyResults: objective?.keyResults ?? context.keyResults,
      idea: keyResultIdea,
      objective: objective ?? null,
      projectId: context.project.id,
      projectName: context.project.name
    });

    return {
      action,
      context: buildContextSummary(context),
      message: "I created a Key Result proposal. Review it before saving.",
      nextStep: "confirm_proposal",
      ok: true,
      proposal: {
        draft: {
          ...draft.draft,
          ...(objective ? { objectiveId: objective.id } : {})
        },
        operation: "create",
        targetType: "key_result"
      }
    };
  }

  if (action === "create_key_project") {
    const keyProjectCreateMessage = classifiedKpIntent?.createIdea || message;
    const activeKeyProjectProposal =
      input.activeProposal?.targetType === "key_project" && input.activeProposal.operation === "create"
        ? input.activeProposal
        : null;

    if (activeKeyProjectProposal && targetId) {
      const selectedKeyResult = findKeyResultByAnyId(context, targetId);
      const isSkippingKeyResult = targetId === SKIP_KEY_RESULT_OPTION_ID;

      if (isSkippingKeyResult || selectedKeyResult) {
        const existingDraft = isPlainRecord(activeKeyProjectProposal.draft) ? activeKeyProjectProposal.draft : {};
        const draftIdea = getKeyProjectIdeaFromDraft(existingDraft) || normalizeText(input.targetLabel);
        const generatedDraft =
          selectedKeyResult && draftIdea
            ? await generateKeyProjectProposalDraft({
                context,
                idea: draftIdea,
                selectedKeyResult
              })
            : existingDraft;
        const nextDraft = {
          ...(isPlainRecord(generatedDraft) ? generatedDraft : existingDraft),
          keyResultIds: selectedKeyResult ? [getKeyResultLinkId(selectedKeyResult)] : []
        };

        return {
          action,
          context: buildContextSummary(context),
          message: selectedKeyResult
            ? `I refined this Key Project proposal using KR: ${
                normalizeText(input.targetLabel) || selectedKeyResult.title || selectedKeyResult.id
              }. Review it before saving.`
            : "I left this Key Project proposal without a linked Key Result. Review it before saving.",
          nextStep: "confirm_proposal",
          ok: true,
          proposal: {
            draft: nextDraft,
            operation: "create",
            targetType: "key_project"
          }
        };
      }
    }

    if (!keyProjectCreateMessage || isVagueKeyProjectIdea(keyProjectCreateMessage)) {
      return {
        action,
        context: buildContextSummary(context),
        message: "Tell me the Key Project idea or delivery work you want to create.",
        nextStep: "provide_prompt",
        ok: true
      };
    }

    const sourceText = shouldBuildProposalFromConversation(keyProjectCreateMessage, action)
      ? pickLatestUsefulConversationText(conversationHistory) ?? keyProjectCreateMessage
      : keyProjectCreateMessage;
    const sourceIdea = isVagueKeyProjectIdea(sourceText) ? keyProjectCreateMessage : sourceText;

    if (isVagueKeyProjectIdea(sourceIdea)) {
      return {
        action,
        context: buildContextSummary(context),
        message: "Tell me the Key Project idea or delivery work you want to create.",
        nextStep: "provide_prompt",
        ok: true
      };
    }

    const mentionedKeyResult =
      (classifiedKpIntent?.linkedKeyResultHint
        ? findMentionedKeyResult(context, classifiedKpIntent.linkedKeyResultHint)
        : undefined) ?? findMentionedKeyResult(context, keyProjectCreateMessage);
    const draft = await generateKeyProjectProposalDraft({
      context,
      idea: sourceIdea,
      selectedKeyResult: mentionedKeyResult ?? null
    });
    const nextDraft = {
      ...draft,
      keyResultIds: mentionedKeyResult ? [getKeyResultLinkId(mentionedKeyResult)] : []
    };

    if (classifiedKpIntent?.skipKeyResult) {
      return {
        action,
        context: buildContextSummary(context),
        message: "I created a Key Project proposal without a linked Key Result. Review it before saving.",
        nextStep: "confirm_proposal",
        ok: true,
        proposal: {
          draft: nextDraft,
          operation: "create",
          targetType: "key_project"
        }
      };
    }

    return {
      action,
      context: buildContextSummary(context),
      message: mentionedKeyResult
        ? `I created a Key Project proposal and detected KR: ${
            mentionedKeyResult.title || mentionedKeyResult.id
          }. Do you want to keep this Key Result link, choose another one, or continue without a linked KR?`
        : "I created a Key Project proposal. Do you want to connect this Key Project to a Key Result, or continue without a linked KR?",
      nextStep: "select_target",
      ok: true,
      options: buildOptionalKeyResultOptions(context),
      prompt: sourceIdea,
      proposal: {
        draft: nextDraft,
        operation: "create",
        targetType: "key_project"
      }
    };
  }

  if (
    action === "edit_objective" &&
    !targetId &&
    context.objectives.length === 1 &&
    (!message || isVagueObjectiveEditInstruction(message))
  ) {
    const objective = context.objectives[0];
    const selectedTargetLabel = objective.objective || objective.name || objective.id;

    return {
      action,
      context: buildContextSummary(context),
      message: `¿Qué cambio quieres hacer sobre el Objective ${selectedTargetLabel}?`,
      nextStep: "provide_prompt",
      ok: true,
      selectedTarget: {
        id: objective.id,
        label: selectedTargetLabel
      },
      selectedTargetId: objective.id
    };
  }

  if (action === "edit_objective" && !targetId) {
    return buildSelectionResponse({
      action,
      context,
      message: "Choose the Objective you want to edit.",
      options: buildEntityOptions(context.objectives),
      prompt: message
    });
  }

  if (action === "edit_objective" && targetId && message) {
    const objectiveEditMessage = classifiedObjectiveIntent?.editInstructions || message;
    const selectedTargetLabel = getSelectedTargetLabel({
      action,
      context,
      targetId,
      targetLabel
    });

    if (isVagueObjectiveEditInstruction(objectiveEditMessage)) {
      return {
        action,
        context: buildContextSummary(context),
        message: `¿Qué cambio quieres hacer sobre el Objective ${selectedTargetLabel}?`,
        nextStep: "provide_prompt",
        ok: true,
        selectedTarget: {
          id: targetId,
          label: selectedTargetLabel
        },
        selectedTargetId: targetId
      };
    }

    const referencedPreviousEdit =
      hasConversationalReference(objectiveEditMessage) ||
      /\b(esta data|esa data|eso|ese|esa|actualicemos|actualizarlo|guardalo|guárdalo|guardar)\b/i.test(
        objectiveEditMessage
      );
    const editInstructions = referencedPreviousEdit
      ? [pickLatestUsefulConversationText(conversationHistory), objectiveEditMessage].filter(Boolean).join("\n\n")
      : objectiveEditMessage;
    const draft = await generateObjectiveEditProposalDraft({
      context,
      message: editInstructions,
      targetId
    });

    if (!draft) {
      return buildSelectionResponse({
        action,
        context,
        message: "Choose the Objective you want to edit.",
        options: buildEntityOptions(context.objectives),
        prompt: message
      });
    }

    return {
      action,
      context: buildContextSummary(context),
      message: "I created an Objective edit proposal. Review it before saving.",
      nextStep: "confirm_proposal",
      ok: true,
      proposal: {
        draft,
        operation: "edit",
        targetType: "objective"
      },
      selectedTarget: {
        id: targetId,
        label: selectedTargetLabel
      },
      selectedTargetId: targetId
    };
  }

  if (action === "edit_key_result" && !targetId) {
    return buildSelectionResponse({
      action,
      context,
      message: "Choose the Key Result you want to edit.",
      options: buildKeyResultOptions(context),
      prompt: message
    });
  }

  if (action === "edit_key_result" && targetId && message) {
    const keyResultEditMessage = classifiedKrIntent?.editInstructions || message;
    const selectedTargetLabel = getSelectedTargetLabel({
      action,
      context,
      targetId,
      targetLabel
    });

    if (isVagueKeyResultEditInstruction(keyResultEditMessage)) {
      return {
        action,
        context: buildContextSummary(context),
        message: `¿Qué cambio quieres hacer sobre el KR ${selectedTargetLabel}?`,
        nextStep: "provide_prompt",
        ok: true,
        selectedTarget: {
          id: targetId,
          label: selectedTargetLabel
        },
        selectedTargetId: targetId
      };
    }

    const referencedPreviousEdit =
      hasConversationalReference(keyResultEditMessage) ||
      /\b(esta data|esa data|eso|ese|esa|actualicemos|actualizarlo|guardalo|guárdalo|guardar)\b/i.test(
        keyResultEditMessage
      );
    const editInstructions = referencedPreviousEdit
      ? [pickLatestUsefulConversationText(conversationHistory), keyResultEditMessage].filter(Boolean).join("\n\n")
      : keyResultEditMessage;
    const draft = await generateKeyResultEditProposalDraft({
      context,
      message: editInstructions,
      targetId
    });

    if (!draft) {
      return buildSelectionResponse({
        action,
        context,
        message: "Choose the Key Result you want to edit.",
        options: buildKeyResultOptions(context),
        prompt: message
      });
    }

    return {
      action,
      context: buildContextSummary(context),
      message: "I created a Key Result edit proposal. Review it before saving.",
      nextStep: "confirm_proposal",
      ok: true,
      proposal: {
        draft,
        operation: "edit",
        targetType: "key_result"
      },
      selectedTarget: {
        id: targetId,
        label: selectedTargetLabel
      },
      selectedTargetId: targetId
    };
  }

  if (
    action === "edit_key_project" &&
    !targetId &&
    context.keyProjects.length === 1 &&
    (!message || isVagueKeyProjectEditInstruction(message))
  ) {
    const keyProject = context.keyProjects[0];
    const selectedTargetLabel = keyProject.name || keyProject.keyProjectId || keyProject.id;

    return {
      action,
      context: buildContextSummary(context),
      message: `¿Qué cambio quieres hacer sobre el KP ${selectedTargetLabel}?`,
      nextStep: "provide_prompt",
      ok: true,
      selectedTarget: {
        id: keyProject.id,
        label: selectedTargetLabel
      },
      selectedTargetId: keyProject.id
    };
  }

  if (action === "edit_key_project" && (!targetId || (message && asksToSwitchKeyProjectTarget(message)))) {
    return buildSelectionResponse({
      action,
      context,
      message: "Choose the Key Project you want to edit.",
      options: buildEntityOptions(context.keyProjects),
      prompt: message
    });
  }

  if (action === "edit_key_project" && targetId && message) {
    const keyProjectEditMessage = classifiedKpIntent?.editInstructions || message;
    const selectedTargetLabel = getSelectedTargetLabel({
      action,
      context,
      targetId,
      targetLabel
    });

    if (isVagueKeyProjectEditInstruction(keyProjectEditMessage)) {
      return {
        action,
        context: buildContextSummary(context),
        message: `¿Qué cambio quieres hacer sobre el KP ${selectedTargetLabel}?`,
        nextStep: "provide_prompt",
        ok: true,
        selectedTarget: {
          id: targetId,
          label: selectedTargetLabel
        },
        selectedTargetId: targetId
      };
    }

    const referencedPreviousEdit =
      hasConversationalReference(keyProjectEditMessage) ||
      /\b(esta data|esa data|eso|ese|esa|actualicemos|actualizarlo|guardalo|guárdalo|guardar)\b/i.test(
        keyProjectEditMessage
      );
    const editInstructions = referencedPreviousEdit
      ? [pickLatestUsefulConversationText(conversationHistory), keyProjectEditMessage].filter(Boolean).join("\n\n")
      : keyProjectEditMessage;
    const draft = await generateKeyProjectEditProposalDraft({
      context,
      message: editInstructions,
      targetId
    });

    if (!draft) {
      return buildSelectionResponse({
        action,
        context,
        message: "Choose the Key Project you want to edit.",
        options: buildEntityOptions(context.keyProjects),
        prompt: message
      });
    }

    return {
      action,
      context: buildContextSummary(context),
      message: "I created a Key Project edit proposal. Review it before saving.",
      nextStep: "confirm_proposal",
      ok: true,
      proposal: {
        draft,
        operation: "edit",
        targetType: "key_project"
      },
      selectedTarget: {
        id: targetId,
        label: selectedTargetLabel
      },
      selectedTargetId: targetId
    };
  }

  const selectedTargetLabel = getSelectedTargetLabel({
    action,
    context,
    targetId,
    targetLabel
  });
  const selectedTargetType = getSelectedTargetType(action);

  return {
    action,
    context: buildContextSummary(context),
    message: `I have selected ${selectedTargetType}: ${selectedTargetLabel}. Send the changes you want and I will generate an edit proposal before saving.`,
    nextStep: "provide_prompt",
    ok: true,
    selectedTarget: {
      id: targetId,
      label: selectedTargetLabel
    },
    selectedTargetId: targetId || undefined
  };
}
