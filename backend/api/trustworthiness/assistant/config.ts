import { getAssistantRuntimeConfig } from "../../../src/config.js";

export async function GET() {
  return Response.json({
    config: getAssistantRuntimeConfig(),
    ok: true
  });
}
