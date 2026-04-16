import { getAirtableConfig } from "./config.js";

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type AirtableResponse = {
  records: AirtableRecord[];
};

function escapeFormulaValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

export async function findUserByEmail(email: string) {
  const airtableConfig = getAirtableConfig();
  const escapedEmail = escapeFormulaValue(email.trim().toLowerCase());
  const fieldName = airtableConfig.airtableEmailField;
  const filterByFormula = `LOWER({${fieldName}})="${escapedEmail}"`;

  const url = new URL(
    `https://api.airtable.com/v0/${airtableConfig.airtableBaseId}/${encodeURIComponent(airtableConfig.airtableTableName)}`
  );

  url.searchParams.set("maxRecords", "1");
  url.searchParams.set("filterByFormula", filterByFormula);
  url.searchParams.append("fields[]", airtableConfig.airtableEmailField);

  if (airtableConfig.airtableNameField) {
    url.searchParams.append("fields[]", airtableConfig.airtableNameField);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${airtableConfig.airtableApiToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Airtable request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AirtableResponse;
  const record = payload.records[0];

  if (!record) {
    return null;
  }

  const normalizedEmail = String(record.fields[airtableConfig.airtableEmailField] ?? "")
    .trim()
    .toLowerCase();
  const rawName = airtableConfig.airtableNameField
    ? record.fields[airtableConfig.airtableNameField]
    : null;

  return {
    email: normalizedEmail,
    name: rawName ? String(rawName) : null
  };
}
