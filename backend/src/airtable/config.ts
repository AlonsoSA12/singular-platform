import { getAgileAirtableConfig, getAirtableConfig } from "../config.js";

export function getTrustworthinessTableName() {
  const airtableConfig = getAirtableConfig();

  if (!airtableConfig.airtableTrustworthinessTableName) {
    throw new Error(
      "Missing trustworthiness Airtable table name. Set AIRTABLE_TRUSTWORTHINESS_TABLE_NAME in the root .env."
    );
  }

  return airtableConfig.airtableTrustworthinessTableName;
}

function getCoachingInputLogTableName() {
  const airtableConfig = getAirtableConfig();

  return airtableConfig.airtableCoachingInputLogTableName || "coaching_input_log";
}

export function getCoachingInputLogConnection() {
  const airtableConfig = getAirtableConfig();

  return {
    apiToken: airtableConfig.airtableCoachingInputLogApiToken || airtableConfig.airtableApiToken,
    baseId: airtableConfig.airtableCoachingInputLogBaseId || airtableConfig.airtableBaseId,
    tableName: getCoachingInputLogTableName()
  };
}

export function getAgileAirtableConnection() {
  const agileConfig = getAgileAirtableConfig();
  const resolveTableName = (tableName: string, tableId: string) =>
    tableName === "Key Result" || tableName === "Key Project" || tableName === "Key Result History"
      ? tableId
      : tableName;

  return {
    apiToken: agileConfig.airtableAgileApiToken,
    baseId: agileConfig.airtableAgileBaseId,
    keyProjectTableName: resolveTableName(agileConfig.airtableAgileKeyProjectTableName, "tblu9Jj3IFaDzAu3T"),
    keyResultHistoryTableName: resolveTableName(
      agileConfig.airtableAgileKeyResultHistoryTableName,
      "tbl6vfKhWFgBgUVVJ"
    ),
    keyResultTableName: resolveTableName(agileConfig.airtableAgileKeyResultTableName, "tblwSWyJl7p6NgYUA"),
    objectiveTableName: agileConfig.airtableAgileObjectiveTableName,
    projectsTableName: agileConfig.airtableAgileProjectsTableName
  };
}
