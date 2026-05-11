import { getSingularAgileAirtableConfig } from "../config.js";

export function getSingularAgileConnection() {
  const config = getSingularAgileAirtableConfig();

  return {
    apiToken: config.airtableSingularAgileApiToken,
    baseId: config.airtableSingularAgileBaseId,
    keyProjectTableName: config.airtableSingularAgileKeyProjectTableName,
    keyResultTableName: config.airtableSingularAgileKeyResultTableName || "Key Results",
    objectiveTableName: config.airtableSingularAgileObjectiveTableName || "Objectives"
  };
}
