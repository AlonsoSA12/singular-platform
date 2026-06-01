import { createAirtableRecord, fetchRecordsByIds, updateAirtableRecord } from "../airtable/client.js";
import { getAgileAirtableConnection } from "../airtable/config.js";
import { getFieldValue, getLinkedRecordIds } from "../airtable/field-utils.js";
import { calculateAgileKeyResultProgress } from "./progress-utils.js";
import { mapAgileKeyResult } from "./airtable-mappers.js";
import {
  compactAirtableCreateFields,
  getOptionalKeyResultStatus,
  normalizeNullablePercentInput,
  requireNonEmptyString
} from "./airtable-utils.js";
import type { CreateAgileKeyResultInput, UpdateAgileKeyResultInput } from "./types.js";

function compactAirtableUpdateFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (value === undefined) {
        return false;
      }

      if (typeof value === "string" && value.trim().length === 0) {
        return false;
      }

      if (Array.isArray(value) && value.length === 0) {
        return false;
      }

      return true;
    })
  );
}

export async function createAgileKeyResult(input: CreateAgileKeyResultInput) {
  const agileConnection = getAgileAirtableConnection();
  const keyResult = requireNonEmptyString(input.keyResult, "Key Result");
  const objectiveId = requireNonEmptyString(input.objectiveId, "Objective");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const status = getOptionalKeyResultStatus(input.status) ?? "Todo";
  const initialValue = normalizeNullablePercentInput(input.initialValue);
  const currentValue = normalizeNullablePercentInput(input.currentValue);
  const targetValue = normalizeNullablePercentInput(input.targetValue);
  const progress = calculateAgileKeyResultProgress(input);
  const connection = {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  };
  const [objectiveRecord] = await fetchRecordsByIds(
    agileConnection.objectiveTableName,
    [objectiveId],
    ["Project", "Key Results"],
    connection
  );

  if (!objectiveRecord) {
    throw new Error("No se encontró el Objective seleccionado.");
  }

  const objectiveProjectIds = getLinkedRecordIds(getFieldValue(objectiveRecord.fields, "Project"));
  if (!objectiveProjectIds.includes(projectId)) {
    throw new Error("El Objective seleccionado no pertenece al Project indicado.");
  }

  const record = await createAirtableRecord(
    agileConnection.keyResultTableName,
    compactAirtableCreateFields({
      "Current Value": currentValue,
      "Explanation": input.explanation?.trim() ?? "",
      "Initial Value": initialValue,
      "Key Result": keyResult,
      "Metric": input.metric?.trim() ?? "",
      "Name": keyResult,
      "Objetive": [objectiveId],
      "Progress": progress === null ? null : progress / 100,
      "Progress Number": progress,
      "Project": [projectId],
      "Quarter": input.quarter?.trim() ?? "",
      "Status": status,
      "Target Date": input.targetDate?.trim() || null,
      "Target Value": targetValue
    }),
    connection
  );

  const existingKeyResultIds = getLinkedRecordIds(getFieldValue(objectiveRecord.fields, "Key Results"));
  await updateAirtableRecord(
    agileConnection.objectiveTableName,
    objectiveId,
    {
      "Key Results": [...new Set([...existingKeyResultIds, record.id])]
    },
    connection
  );

  return {
    keyResult: mapAgileKeyResult(record),
    objectiveId,
    projectId,
    tableName: agileConnection.keyResultTableName
  };
}

export async function updateAgileKeyResult(input: UpdateAgileKeyResultInput) {
  const agileConnection = getAgileAirtableConnection();
  const recordId = requireNonEmptyString(input.recordId, "Key Result");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const objectiveId = input.objectiveId?.trim();
  const connection = {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  };
  const [currentRecord] = await fetchRecordsByIds(
    agileConnection.keyResultTableName,
    [recordId],
    [
      "Current Value",
      "Explanation",
      "Initial Value",
      "Key Result",
      "Metric",
      "Name",
      "Objetive",
      "Project",
      "Quarter",
      "Status",
      "Target Date",
      "Target Value"
    ],
    connection
  );

  if (!currentRecord) {
    throw new Error("No se encontró el Key Result seleccionado.");
  }

  const currentProjectIds = getLinkedRecordIds(getFieldValue(currentRecord.fields, "Project"));
  if (!currentProjectIds.includes(projectId)) {
    throw new Error("El Key Result seleccionado no pertenece al Project indicado.");
  }

  const currentObjectiveIds = getLinkedRecordIds(getFieldValue(currentRecord.fields, "Objetive"));
  const nextObjectiveId = objectiveId || currentObjectiveIds[0] || "";
  if (!nextObjectiveId) {
    throw new Error("El Key Result seleccionado no tiene Objective asociado.");
  }

  const [objectiveRecord] = await fetchRecordsByIds(
    agileConnection.objectiveTableName,
    [nextObjectiveId],
    ["Project", "Key Results"],
    connection
  );

  if (!objectiveRecord) {
    throw new Error("No se encontró el Objective seleccionado.");
  }

  const objectiveProjectIds = getLinkedRecordIds(getFieldValue(objectiveRecord.fields, "Project"));
  if (!objectiveProjectIds.includes(projectId)) {
    throw new Error("El Objective seleccionado no pertenece al Project indicado.");
  }

  const existingKeyResult = mapAgileKeyResult(currentRecord);
  const keyResult = input.keyResult?.trim() || existingKeyResult.title;
  const status = getOptionalKeyResultStatus(input.status) ?? getOptionalKeyResultStatus(existingKeyResult.status) ?? "Todo";
  const initialValue =
    input.initialValue === undefined
      ? normalizeNullablePercentInput(existingKeyResult.initialValue)
      : normalizeNullablePercentInput(input.initialValue);
  const currentValue =
    input.currentValue === undefined
      ? normalizeNullablePercentInput(existingKeyResult.currentValue)
      : normalizeNullablePercentInput(input.currentValue);
  const targetValue =
    input.targetValue === undefined
      ? normalizeNullablePercentInput(existingKeyResult.targetValue)
      : normalizeNullablePercentInput(input.targetValue);
  const progress = calculateAgileKeyResultProgress({
    currentValue,
    initialValue,
    targetValue
  });

  const record = await updateAirtableRecord(
    agileConnection.keyResultTableName,
    recordId,
    compactAirtableUpdateFields({
      "Current Value": currentValue,
      "Explanation": input.explanation === undefined ? existingKeyResult.explanation : input.explanation.trim(),
      "Initial Value": initialValue,
      "Key Result": keyResult,
      "Metric": input.metric === undefined ? existingKeyResult.metric : input.metric.trim(),
      "Name": keyResult,
      "Objetive": [nextObjectiveId],
      "Progress": progress === null ? null : progress / 100,
      "Progress Number": progress,
      "Project": [projectId],
      "Quarter": input.quarter?.trim() ?? "",
      "Status": status,
      "Target Date": input.targetDate === undefined ? existingKeyResult.targetDate || null : input.targetDate.trim() || null,
      "Target Value": targetValue
    }),
    connection
  );

  if (objectiveId && !currentObjectiveIds.includes(objectiveId)) {
    const existingKeyResultIds = getLinkedRecordIds(getFieldValue(objectiveRecord.fields, "Key Results"));
    await updateAirtableRecord(
      agileConnection.objectiveTableName,
      objectiveId,
      {
        "Key Results": [...new Set([...existingKeyResultIds, record.id])]
      },
      connection
    );

    await Promise.all(
      currentObjectiveIds.map(async (currentObjectiveId) => {
        const [currentObjectiveRecord] = await fetchRecordsByIds(
          agileConnection.objectiveTableName,
          [currentObjectiveId],
          ["Key Results"],
          connection
        );

        if (!currentObjectiveRecord) return;

        const nextKeyResultIds = getLinkedRecordIds(
          getFieldValue(currentObjectiveRecord.fields, "Key Results")
        ).filter((keyResultId) => keyResultId !== record.id);
        await updateAirtableRecord(
          agileConnection.objectiveTableName,
          currentObjectiveId,
          {
            "Key Results": nextKeyResultIds
          },
          connection
        );
      })
    );
  }

  return {
    keyResult: mapAgileKeyResult(record),
    objectiveId: nextObjectiveId,
    projectId,
    tableName: agileConnection.keyResultTableName
  };
}
