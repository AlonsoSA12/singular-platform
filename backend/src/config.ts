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

export const appConfig = {
  port: Number(process.env.BACKEND_PORT ?? "4000"),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000"
};

export function getAirtableConfig() {
  return {
    airtableApiToken: required("AIRTABLE_API_TOKEN"),
    airtableBaseId: required("AIRTABLE_BASE_ID"),
    airtableTableName: required("AIRTABLE_TABLE_NAME"),
    airtableEmailField: required("AIRTABLE_EMAIL_FIELD"),
    airtableNameField: process.env.AIRTABLE_NAME_FIELD ?? ""
  };
}
