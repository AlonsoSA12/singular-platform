import { createAirtableRecord, fetchAirtableRecords, fetchRecordsByIds } from "../airtable/client.js";
import { getAgileAirtableConnection } from "../airtable/config.js";
import {
  mapAgileKeyResult,
  mapAgileObjective
} from "./airtable-mappers.js";
import {
  compactAirtableCreateFields,
  getOptionalObjectiveStatus,
  requireNonEmptyString
} from "./airtable-utils.js";
import type { CreateAgileObjectiveInput } from "./types.js";

export async function listAgileObjectivesForProject(projectId: string) {
  const agileConnection = getAgileAirtableConnection();
  const records = await fetchAirtableRecords(agileConnection.objectiveTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });
  const objectives = records
    .map(mapAgileObjective)
    .filter((objective) => objective.projectIds.includes(projectId))
    .sort((left, right) => {
      const leftCreatedAt = Date.parse(left.createdAt);
      const rightCreatedAt = Date.parse(right.createdAt);

      if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt)) {
        return rightCreatedAt - leftCreatedAt;
      }

      if (Number.isFinite(leftCreatedAt)) {
        return -1;
      }

      if (Number.isFinite(rightCreatedAt)) {
        return 1;
      }

      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });

  const keyResultRecords = await fetchRecordsByIds(
    agileConnection.keyResultTableName,
    objectives.flatMap((objective) => objective.keyResultIds),
    [],
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );
  const keyResultsById = new Map(keyResultRecords.map((record) => [record.id, mapAgileKeyResult(record)]));
  const hydratedObjectives = objectives.map((objective) => ({
    ...objective,
    keyResults: objective.keyResultIds
      .map((keyResultId) => keyResultsById.get(keyResultId))
      .filter((keyResult): keyResult is ReturnType<typeof mapAgileKeyResult> => Boolean(keyResult))
  }));

  return {
    objectives: hydratedObjectives,
    projectId,
    recordCount: hydratedObjectives.length,
    tableName: agileConnection.objectiveTableName
  };
}

export async function createAgileObjective(input: CreateAgileObjectiveInput) {
  const agileConnection = getAgileAirtableConnection();
  const objective = requireNonEmptyString(input.objective, "Objective");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const status = getOptionalObjectiveStatus(input.status) ?? "Pending Review";

  const record = await createAirtableRecord(
    agileConnection.objectiveTableName,
    compactAirtableCreateFields({
      "AI suggested key results": input.aiSuggestedKeyResults?.trim() ?? "",
      "Explanation": input.explanation?.trim() ?? "",
      "Metric": input.metric?.trim() ?? "",
      "Name": objective,
      "Objective": objective,
      "Objetive Description": input.description?.trim() ?? "",
      "Priority": input.priority?.trim() ?? "",
      "Project": [projectId],
      "Quarter": input.quarter?.trim() ?? "",
      "Status": status,
      "Target Date": input.targetDate?.trim() || null,
      "Type": input.type?.trim() ?? ""
    }),
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );

  return {
    objective: mapAgileObjective(record),
    tableName: agileConnection.objectiveTableName
  };
}
