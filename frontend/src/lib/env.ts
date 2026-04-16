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

function readEnv(name: string) {
  ensureEnvLoaded();

  return process.env[name];
}

function requireEnv(name: string) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getBackendBaseUrl() {
  return requireEnv("BACKEND_BASE_URL");
}

export function getOptionalSessionSecret() {
  return readEnv("SESSION_SECRET");
}

export function getRequiredSessionSecret() {
  return requireEnv("SESSION_SECRET");
}
