import { fetchRecordsByIds } from "../airtable/client.js";
import { getAgileAirtableConnection } from "../airtable/config.js";
import { getFieldValue, getLinkedRecordIds } from "../airtable/field-utils.js";
import {
  compareAgileKeyResultHistoryPoints,
  mapAgileKeyResultHistoryPoint
} from "./airtable-mappers.js";

function getAgileKeyResultHistoryRecordIds(record: { fields: Record<string, unknown> }) {
  return getLinkedRecordIds(
    getFieldValue(record.fields, "Key Result Historic") ??
      getFieldValue(record.fields, "Key Result History") ??
      getFieldValue(record.fields, "key_result_history") ??
      getFieldValue(record.fields, "key_result_historic") ??
      getFieldValue(record.fields, "History")
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

  const keyResultRecords = await fetchRecordsByIds(
    agileConnection.keyResultTableName,
    normalizedKeyResultIds,
    [],
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );
  const historyRecordIds = [
    ...new Set(keyResultRecords.flatMap((record) => getAgileKeyResultHistoryRecordIds(record)))
  ];
  const historyRecords = await fetchRecordsByIds(
    agileConnection.keyResultHistoryTableName,
    historyRecordIds,
    [],
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );
  const historyRecordsById = new Map(historyRecords.map((record) => [record.id, record]));
  const historyByKeyResultId = Object.fromEntries(
    normalizedKeyResultIds.map((keyResultId) => [keyResultId, [] as ReturnType<typeof mapAgileKeyResultHistoryPoint>[]])
  );

  for (const keyResultRecord of keyResultRecords) {
    const keyResultId = keyResultRecord.id;
    const linkedHistoryIds = getAgileKeyResultHistoryRecordIds(keyResultRecord);

    for (const historyId of linkedHistoryIds) {
      const historyRecord = historyRecordsById.get(historyId);
      if (historyRecord) {
        historyByKeyResultId[keyResultId]?.push(mapAgileKeyResultHistoryPoint(historyRecord));
      }
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
