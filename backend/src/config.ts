import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), "../.env") });
loadEnv({ path: path.resolve(process.cwd(), "../frontend/.env") });

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optional(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

export const appConfig = {
  port: Number(process.env.BACKEND_PORT ?? "4000"),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000"
};

export function getOpenAIConfig() {
  const deepSeekApiKey = optional("DEEPSEEK_API_KEY");
  const configuredProvider = optional("AI_PROVIDER").toLowerCase();
  const provider =
    configuredProvider === "deepseek" || (!configuredProvider && deepSeekApiKey)
      ? "deepseek"
      : "openai";
  const deepSeekModel = optional("DEEPSEEK_MODEL") || "deepseek-chat";
  const openAIModel = optional("OPENAI_MODEL") || "gpt-5.4-mini";
  const openAIReasoningEffort = optional("OPENAI_REASONING_EFFORT") || "low";

  return {
    apiKey: provider === "deepseek" ? deepSeekApiKey : optional("OPENAI_API_KEY"),
    assistantModel:
      provider === "deepseek"
        ? optional("DEEPSEEK_ASSISTANT_MODEL") || deepSeekModel
        : optional("OPENAI_ASSISTANT_MODEL"),
    deepSeekBaseUrl: optional("DEEPSEEK_BASE_URL") || "https://api.deepseek.com",
    feedbackModel:
      provider === "deepseek"
        ? optional("DEEPSEEK_FEEDBACK_MODEL") || deepSeekModel
        : optional("OPENAI_FEEDBACK_MODEL"),
    model:
      provider === "deepseek"
        ? deepSeekModel
        : openAIModel,
    provider,
    reasoningEffort: provider === "deepseek" ? "" : openAIReasoningEffort,
    suggestionModel:
      provider === "deepseek"
        ? optional("DEEPSEEK_SUGGESTION_MODEL") || deepSeekModel
        : optional("OPENAI_SUGGESTION_MODEL")
  };
}

export function getAssistantRuntimeConfig() {
  const aiConfig = getOpenAIConfig();
  const assistantModel = aiConfig.assistantModel || aiConfig.model;
  const suggestionModel = aiConfig.suggestionModel || aiConfig.model;
  const feedbackModel = aiConfig.feedbackModel || assistantModel || aiConfig.model;

  return {
    apiMode: aiConfig.provider === "deepseek" ? "chat_completions" : "responses",
    baseUrl:
      aiConfig.provider === "deepseek"
        ? aiConfig.deepSeekBaseUrl
        : "https://api.openai.com/v1/responses",
    feedbackModel,
    hasApiKey: Boolean(aiConfig.apiKey),
    model: aiConfig.model,
    provider: aiConfig.provider,
    reasoningEffort: aiConfig.reasoningEffort,
    responseFormat: aiConfig.provider === "deepseek" ? "json_object" : "json_schema",
    suggestionModel,
    assistantModel
  };
}

export function getAirtableConfig() {
  return {
    airtableApiToken: required("AIRTABLE_API_TOKEN"),
    airtableBaseId: required("AIRTABLE_BASE_ID"),
    airtableCoachingInputLogApiToken: optional(
      "AIRTABLE_API_TOKEN_FOR_COACHING",
      "AIRTABLE_COACHING_INPUT_LOG_API_TOKEN",
      "AIRTABLE_COACHING_API_TOKEN",
      "COACHING_INPUT_LOG_API_TOKEN",
      "COACHING_API_TOKEN"
    ),
    airtableCoachingInputLogBaseId: optional(
      "AIRTABLE_BASE_ID_FOR_COACHING",
      "AIRTABLE_COACHING_INPUT_LOG_BASE_ID",
      "AIRTABLE_COACHING_BASE_ID",
      "COACHING_INPUT_LOG_BASE_ID",
      "COACHING_BASE_ID"
    ),
    airtableCoachingInputLogTableName: optional(
      "AIRTABLE_TABLE_NAME_FOR_COACHING_LOGS",
      "AIRTABLE_COACHING_INPUT_LOG_TABLE_NAME",
      "AIRTABLE_COACHING_INPUT_LOG_TABLE",
      "COACHING_INPUT_LOG_TABLE_NAME",
      "COACHING_INPUT_LOG_TABLE"
    ),
    airtableTableName: required("AIRTABLE_TABLE_NAME"),
    airtableTrustworthinessTableName: optional(
      "AIRTABLE_TRUSTWORTHINESS_TABLE_NAME",
      "AIRTABLE_TRUSTWORTHINESS_TABLE",
      "TRUSTWORTHINESS_TABLE_NAME",
      "TRUSTWORTHINESS_TABLE",
      "AIRTABLE_MONTHLY_TRUSTWORTHYNESS_FIELD"
    ),
    airtableEmailField: required("AIRTABLE_EMAIL_FIELD"),
    airtableNameField: process.env.AIRTABLE_NAME_FIELD ?? "",
    airtableRoleField: required("AIRTABLE_ROLE_FIELD")
  };
}

export function getAgileAirtableConfig() {
  return {
    airtableAgileApiToken: required("AIRTABLE_AGILE_FUNDATION_TOKEN"),
    airtableAgileBaseId: required("AIRTABLE_AGILE_FUNDATION_BASE_ID"),
    airtableAgileKeyProjectTableName:
      optional("AIRTABLE_AGILE_KEY_PROYECT_TABLE_NAME", "AIRTABLE_AGILE_KEY_PROJECT_TABLE_NAME") ||
      "Key Project",
    airtableAgileKeyResultTableName: required("AIRTABLE_AGILE_KEY_RESULT_TABLE_NAME"),
    airtableAgileKeyResultHistoryTableName:
      optional("AIRTABLE_AGILE_KEY_RESULT_HISTORY_TABLE_NAME") || "Key Result History",
    airtableAgileObjectiveTableName:
      optional("AIRTABLE_AGILE_OBJECTIVE_TABLE_NAME", "AIRTABLE_AGILE_OBJECTIBE_TABLE_NAME") ||
      required("AIRTABLE_AGILE_OBJECTIBE_TABLE_NAME"),
    airtableAgileProjectsTableName: optional("AIRTABLE_AGILE_PROJECTS_TABLE_NAME") || "Projects"
  };
}
