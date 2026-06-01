import { fetchAirtableRecords } from "../airtable/client.js";
import { getAgileAirtableConnection } from "../airtable/config.js";
import { getFieldValue, getLinkedRecordIds } from "../airtable/field-utils.js";
import {
  compareAgileKeyResultHistoryPoints,
  mapAgileKeyResultHistoryPoint
} from "./airtable-mappers.js";

function getAgileKeyResultHistoryKeyResultIds(record: { fields: Record<string, unknown> }) {
  return getLinkedRecordIds(
    getFieldValue(record.fields, "key") ??
      getFieldValue(record.fields, "key_result") ??
      getFieldValue(record.fields, "Key") ??
      getFieldValue(record.fields, "Key Result")
  );
}

export async function listAgileKeyResultHistoryBulk(keyResultIds: string[]) {
  const agileConnection = getAgileAirtableConnection();
  const normalizedKeyResultIds = [...new Set(keyResultIds.map((id) => id.trim()).filter(Boolean))];

  if (normalizedKeyResultIds.length === 0) {
    return {
      historyByKeyResultId: {},
      keyResultIds: [],
      recordCount: 0,
      tableName: agileConnection.keyResultHistoryTableName
    };
  }

  const requestedKeyResultIds = new Set(normalizedKeyResultIds);
  const historyRecords = await fetchAirtableRecords(agileConnection.keyResultHistoryTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });
  const historyByKeyResultId = Object.fromEntries(
    normalizedKeyResultIds.map((keyResultId) => [keyResultId, [] as ReturnType<typeof mapAgileKeyResultHistoryPoint>[]])
  );

  for (const historyRecord of historyRecords) {
    const linkedKeyResultIds = getAgileKeyResultHistoryKeyResultIds(historyRecord).filter((keyResultId) =>
      requestedKeyResultIds.has(keyResultId)
    );

    for (const keyResultId of linkedKeyResultIds) {
      historyByKeyResultId[keyResultId]?.push(mapAgileKeyResultHistoryPoint(historyRecord));
    }
  }

  for (const history of Object.values(historyByKeyResultId)) {
    history.sort(compareAgileKeyResultHistoryPoints);
  }

  return {
    historyByKeyResultId,
    keyResultIds: normalizedKeyResultIds,
    recordCount: historyRecords.length,
    tableName: agileConnection.keyResultHistoryTableName
  };
}
