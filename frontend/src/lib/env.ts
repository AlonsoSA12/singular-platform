import path from "node:path";
import { config as loadEnv } from "dotenv";

let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  loadEnv({ path: path.resolve(process.cwd(), "../.env") });
  envLoaded = true;
}

function requireEnv(name: string) {
  ensureEnvLoaded();

  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getFrontendServerEnv() {
  return {
    backendBaseUrl: requireEnv("BACKEND_BASE_URL"),
    sessionSecret: requireEnv("SESSION_SECRET")
  };
}
