import type { AirtableRecord } from "./types.js";

export function dedupeAirtableRecords(records: AirtableRecord[]) {
  const seenRecordIds = new Set<string>();

  return records.filter((record) => {
    if (seenRecordIds.has(record.id)) {
      return false;
    }

    seenRecordIds.add(record.id);
    return true;
  });
}

export function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
