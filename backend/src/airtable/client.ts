import { getAirtableConfig } from "../config.js";
import { buildRecordIdsFilterFormula } from "./formula-utils.js";
import { chunkArray, dedupeAirtableRecords } from "./record-utils.js";
import type { AirtableRecord, AirtableResponse } from "./types.js";

type FetchAirtableRecordsOptions = {
  apiToken?: string;
  baseId?: string;
  fields?: string[];
  filterByFormula?: string;
};

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getAirtableRetryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfter ? Number.parseFloat(retryAfter) : Number.NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return [750, 1500, 3000][attempt] ?? 3000;
}

async function fetchAirtableWithRetry(url: URL, apiToken: string) {
  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`
      }
    });

    if (response.ok || (response.status !== 429 && response.status < 500) || attempt === maxAttempts - 1) {
      return response;
    }

    await wait(getAirtableRetryDelay(response, attempt));
  }

  throw new Error("Airtable request failed before receiving a response.");
}

export async function fetchAirtableRecords(tableName: string, options: FetchAirtableRecordsOptions = {}) {
  const airtableConfig = getAirtableConfig();
  const baseId = options.baseId || airtableConfig.airtableBaseId;
  const apiToken = options.apiToken || airtableConfig.airtableApiToken;
  const records: AirtableRecord[] = [];
  let offset = "";

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);

    url.searchParams.set("pageSize", "100");
    if (options.filterByFormula) {
      url.searchParams.set("filterByFormula", options.filterByFormula);
    }
    for (const field of options.fields ?? []) {
      url.searchParams.append("fields[]", field);
    }

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetchAirtableWithRetry(url, apiToken);

    if (!response.ok) {
      let details = "";

      try {
        const payload = (await response.json()) as {
          error?: {
            message?: string;
            type?: string;
          };
        };
        details = payload.error?.message
          ? `: ${payload.error.message}`
          : payload.error?.type
            ? `: ${payload.error.type}`
            : "";
      } catch {
        details = "";
      }

      throw new Error(`Airtable request failed for table ${tableName} with status ${response.status}${details}`);
    }

    const payload = (await response.json()) as AirtableResponse;
    records.push(...payload.records);
    offset = payload.offset ?? "";
  } while (offset);

  return records;
}

export async function fetchRecordsByIds(
  tableName: string,
  recordIds: string[],
  fields: string[],
  connection?: { apiToken: string; baseId: string }
) {
  const uniqueIds = [...new Set(recordIds.filter((recordId) => recordId.trim().length > 0))];

  if (uniqueIds.length === 0) {
    return [] as AirtableRecord[];
  }

  const records = await Promise.all(
    chunkArray(uniqueIds, 25).map((recordIdChunk) =>
      fetchAirtableRecords(tableName, {
        apiToken: connection?.apiToken,
        baseId: connection?.baseId,
        fields,
        filterByFormula: buildRecordIdsFilterFormula(recordIdChunk)
      })
    )
  );

  return dedupeAirtableRecords(records.flat());
}

export async function updateAirtableRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>,
  connection?: { apiToken: string; baseId: string }
) {
  const airtableConfig = getAirtableConfig();
  const baseId = connection?.baseId || airtableConfig.airtableBaseId;
  const apiToken = connection?.apiToken || airtableConfig.airtableApiToken;
  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`
  );

  const response = await fetch(url, {
    body: JSON.stringify({
      fields,
      typecast: true
    }),
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  if (!response.ok) {
    let details = "";

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
          type?: string;
        };
      };
      details = payload.error?.message
        ? `: ${payload.error.message}`
        : payload.error?.type
          ? `: ${payload.error.type}`
          : "";

      if (payload.error?.message?.toLowerCase().includes("externally synced")) {
        throw new Error(
          `La tabla ${tableName} en Airtable está sincronizada externamente y no permite crear registros desde la API. Crea el registro en la tabla fuente o configura una tabla editable para OKRs.`
        );
      }
    } catch {
      details = "";
    }

    throw new Error(`Airtable request failed for table ${tableName} with status ${response.status}${details}`);
  }

  return (await response.json()) as AirtableRecord;
}

export async function createAirtableRecord(
  tableName: string,
  fields: Record<string, unknown>,
  connection?: { apiToken: string; baseId: string }
) {
  const airtableConfig = getAirtableConfig();
  const baseId = connection?.baseId || airtableConfig.airtableBaseId;
  const apiToken = connection?.apiToken || airtableConfig.airtableApiToken;
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);

  const response = await fetch(url, {
    body: JSON.stringify({
      fields,
      typecast: true
    }),
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    let details = "";
    let syncedTableError: string | null = null;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
          type?: string;
        };
      };
      details = payload.error?.message
        ? `: ${payload.error.message}`
        : payload.error?.type
          ? `: ${payload.error.type}`
          : "";
      if (payload.error?.message?.toLowerCase().includes("externally synced")) {
        syncedTableError = `La tabla ${tableName} en Airtable está sincronizada externamente y no permite crear registros desde la API. Crea el registro en la tabla fuente o configura una tabla editable para OKRs.`;
      }
    } catch {
      details = "";
    }

    if (syncedTableError) {
      throw new Error(syncedTableError);
    }

    throw new Error(`Airtable create failed for table ${tableName} with status ${response.status}${details}`);
  }

  return (await response.json()) as AirtableRecord;
}
