import { getSingularAgileAirtableConfig } from "../config.js";

export function getSingularAgileConnection() {
  const config = getSingularAgileAirtableConfig();
  const resolveKeyResultHistoryTableName = (tableName: string) =>
    tableName === "Key Results History" || tableName === "Key Result History"
      ? "tblxEEyU86CDWFjDo"
      : tableName;

  return {
    apiToken: config.airtableSingularAgileApiToken,
    baseId: config.airtableSingularAgileBaseId,
    keyProjectTableName: config.airtableSingularAgileKeyProjectTableName,
    keyResultTableName: config.airtableSingularAgileKeyResultTableName || "Key Results",
    keyResultHistoryTableName: resolveKeyResultHistoryTableName(config.airtableSingularAgileKeyResultHistoryTableName),
    objectiveTableName: config.airtableSingularAgileObjectiveTableName || "Objectives"
  };
}
