import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), "../.env") });

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optional(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
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
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-5.2"
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
