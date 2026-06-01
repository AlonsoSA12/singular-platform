import { fetchAirtableRecords, updateAirtableRecord } from "../airtable/client.js";
import { escapeFormulaValue } from "../airtable/formula-utils.js";
import { getFieldValue, getLinkedRecordIds } from "../airtable/field-utils.js";
import type { AirtableRecord } from "../airtable/types.js";
import {
  compareAgileKeyResultHistoryPoints,
  mapAgileKeyResultHistoryPoint
} from "../okrs/airtable-mappers.js";
import { getSingularAgileConnection } from "./config.js";
import type { SingularAgileFieldIssue, SingularAgileUpdateKeyResultHistoryResult } from "./types.js";

type FieldDefinition = {
  airtableField: string;
  aliases: string[];
  responseField?: string;
  validate: (value: unknown) => { ok: true; value: unknown } | { ok: false; message: string };
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true,
      value: undefined
    } as const;
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      message: "Debe ser texto."
    } as const;
  }

  const trimmedValue = value.trim();

  return {
    ok: true,
    value: trimmedValue.length > 0 ? trimmedValue : undefined
  } as const;
}

function validateOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true,
      value: undefined
    } as const;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      ok: false,
      message: "Debe ser número."
    } as const;
  }

  return {
    ok: true,
    value
  } as const;
}

function validateOptionalStringArray(value: unknown) {
  if (value === undefined || value === null) {
    return {
      ok: true,
      value: undefined
    } as const;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return {
      ok: true,
      value: [value.trim()]
    } as const;
  }

  if (!Array.isArray(value)) {
    return {
      ok: false,
      message: "Debe ser una lista de record IDs."
    } as const;
  }

  const values = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return {
    ok: true,
    value: [...new Set(values.map((item) => item.trim()))]
  } as const;
}

function validateOptionalStatus(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true,
      value: undefined
    } as const;
  }

  if (value === "Todo" || value === "In progress" || value === "Done") {
    return {
      ok: true,
      value
    } as const;
  }

  return {
    ok: false,
    message: "Debe ser Todo, In progress o Done."
  } as const;
}

function validateOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true,
      value: undefined
    } as const;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return {
      ok: false,
      message: "Debe ser una fecha en formato YYYY-MM-DD."
    } as const;
  }

  return {
    ok: true,
    value: value.trim()
  } as const;
}

const keyResultHistoryFieldDefinitions = {
  keyResultIds: {
    aliases: ["keyResultIds", "keyResultId", "Key Result", "key_result"],
    airtableField: "Key Result",
    validate: validateOptionalStringArray
  },
  objectiveIds: {
    aliases: ["objectiveIds", "objectiveId", "Objetive", "Objective", "objective"],
    airtableField: "Objetive",
    validate: validateOptionalStringArray
  },
  projectIds: {
    aliases: ["projectIds", "projectId", "Project", "project"],
    airtableField: "Project",
    validate: validateOptionalStringArray
  },
  metric: {
    aliases: ["metric", "Metric"],
    airtableField: "Metric",
    validate: validateOptionalString
  },
  explanation: {
    aliases: ["explanation", "Explanation"],
    airtableField: "Explanation",
    validate: validateOptionalString
  },
  targetDate: {
    aliases: ["targetDate", "Target Date", "target_date"],
    airtableField: "Target Date",
    validate: validateOptionalDate
  },
  targetValue: {
    aliases: ["targetValue", "Target Value", "target_value"],
    airtableField: "flde3IPyX4wGLSD2l",
    responseField: "Target Value",
    validate: validateOptionalNumber
  },
  initialValue: {
    aliases: ["initialValue", "Initial Value", "initial_value"],
    airtableField: "fld1kOjQQhZIk4kiF",
    responseField: "Initial Value",
    validate: validateOptionalNumber
  },
  currentValue: {
    aliases: ["currentValue", "Current Value", "current_value"],
    airtableField: "fldbGgn6xhnaH6rNi",
    responseField: "Current Value",
    validate: validateOptionalNumber
  },
  status: {
    aliases: ["status", "Status"],
    airtableField: "Status",
    validate: validateOptionalStatus
  },
  scoreKeyResult: {
    aliases: ["scoreKeyResult", "Score Key Result", "score_key"],
    airtableField: "Score Key Result",
    validate: validateOptionalNumber
  }
} satisfies Record<string, FieldDefinition>;

const UPDATE_FIELD_DEFINITIONS: FieldDefinition[] = Object.values(keyResultHistoryFieldDefinitions);

function compactFields(fields: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

function pickResponseFields(
  record: AirtableRecord,
  sentFields: Record<string, unknown>,
  responseFields: Record<string, string>
) {
  return Object.fromEntries(
    Object.keys(sentFields).map((fieldName) => {
      const responseField = responseFields[fieldName] ?? fieldName;

      return [responseField, getFieldValue(record.fields, responseField)];
    })
  );
}

function normalizeRecordId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getSourceId(input: unknown) {
  if (!isPlainObject(input)) {
    return "";
  }

  return normalizeRecordId(input.sourceId ?? input.source_id);
}

async function resolveKeyResultHistoryRecordIdBySourceId(sourceId: string) {
  if (!sourceId) {
    return "";
  }

  const connection = getSingularAgileConnection();
  const records = await fetchAirtableRecords(connection.keyResultHistoryTableName, {
    apiToken: connection.apiToken,
    baseId: connection.baseId,
    filterByFormula: `RECORD_ID()='${escapeFormulaValue(sourceId)}'`
  });

  return records[0]?.id ?? "";
}

async function resolveKeyResultHistoryRecordId(recordId: string) {
  if (!recordId) {
    return "";
  }

  const connection = getSingularAgileConnection();
  const records = await fetchAirtableRecords(connection.keyResultHistoryTableName, {
    apiToken: connection.apiToken,
    baseId: connection.baseId,
    filterByFormula: `RECORD_ID()='${escapeFormulaValue(recordId)}'`
  });

  return records[0]?.id ?? "";
}

function validateSingularAgileKeyResultHistoryUpdateInput(input: unknown) {
  if (!isPlainObject(input)) {
    return {
      acceptedFields: [],
      fields: {},
      invalidFields: [
        {
          field: "$body",
          message: "El cuerpo debe ser un objeto JSON."
        }
      ],
      responseFields: {},
      missingRequiredFields: [] as string[],
      unknownFields: []
    };
  }

  const acceptedFields: string[] = [];
  const fields: Record<string, unknown> = {};
  const responseFields: Record<string, string> = {};
  const invalidFields: SingularAgileFieldIssue[] = [];
  const matchedInputFields = new Set(["sourceId", "source_id"].filter((key) => key in input));

  for (const definition of UPDATE_FIELD_DEFINITIONS) {
    const entry = Object.entries(input).find(([key]) => definition.aliases.includes(key));

    if (!entry) {
      continue;
    }

    const [key, value] = entry;
    matchedInputFields.add(key);
    acceptedFields.push(key);

    const validation = definition.validate(value);

    if (!validation.ok) {
      invalidFields.push({
        field: key,
        message: validation.message
      });
      continue;
    }

    fields[definition.airtableField] = validation.value;
    responseFields[definition.airtableField] = definition.responseField ?? definition.airtableField;
  }

  return {
    acceptedFields,
    fields: compactFields(fields),
    responseFields,
    invalidFields,
    missingRequiredFields: [] as string[],
    unknownFields: Object.keys(input).filter((key) => !matchedInputFields.has(key))
  };
}

function getSingularAgileKeyResultHistoryKeyResultIds(record: { fields: Record<string, unknown> }) {
  return getLinkedRecordIds(
    getFieldValue(record.fields, "Key Result") ??
      getFieldValue(record.fields, "key_result") ??
      getFieldValue(record.fields, "key") ??
      getFieldValue(record.fields, "Key")
  );
}

export async function listSingularAgileKeyResultHistoryBulk(keyResultIds: string[]) {
  const connection = getSingularAgileConnection();
  const normalizedKeyResultIds = [...new Set(keyResultIds.map((id) => id.trim()).filter(Boolean))];

  if (normalizedKeyResultIds.length === 0) {
    return {
      historyByKeyResultId: {},
      keyResultIds: [],
      recordCount: 0,
      tableName: connection.keyResultHistoryTableName
    };
  }

  const requestedKeyResultIds = new Set(normalizedKeyResultIds);
  const historyRecords = await fetchAirtableRecords(connection.keyResultHistoryTableName, {
    apiToken: connection.apiToken,
    baseId: connection.baseId
  });
  const historyByKeyResultId = Object.fromEntries(
    normalizedKeyResultIds.map((keyResultId) => [
      keyResultId,
      [] as ReturnType<typeof mapAgileKeyResultHistoryPoint>[]
    ])
  );

  for (const historyRecord of historyRecords) {
    const linkedKeyResultIds = getSingularAgileKeyResultHistoryKeyResultIds(historyRecord).filter((keyResultId) =>
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
    tableName: connection.keyResultHistoryTableName
  };
}

export async function updateSingularAgileKeyResultHistory(
  recordId: unknown,
  input: unknown
): Promise<SingularAgileUpdateKeyResultHistoryResult> {
  const connection = getSingularAgileConnection();
  const sourceId = getSourceId(input);
  let normalizedRecordId = normalizeRecordId(recordId);
  const validation = validateSingularAgileKeyResultHistoryUpdateInput(input);
  const invalidFields = [...validation.invalidFields];
  const missingRequiredFields = [...validation.missingRequiredFields];

  if (!normalizedRecordId) {
    normalizedRecordId = await resolveKeyResultHistoryRecordIdBySourceId(sourceId);
  } else {
    const validatedRecordId = await resolveKeyResultHistoryRecordId(normalizedRecordId);

    if (validatedRecordId) {
      normalizedRecordId = validatedRecordId;
    } else {
      normalizedRecordId = await resolveKeyResultHistoryRecordIdBySourceId(sourceId);
      if (!normalizedRecordId) {
        missingRequiredFields.push("valid Key Results History recordId");
      }
    }
  }

  if (!normalizedRecordId && missingRequiredFields.length === 0) {
    missingRequiredFields.push(sourceId ? "recordId/source_id match" : "recordId or source_id");
  }

  if (Object.keys(validation.fields).length === 0) {
    invalidFields.push({
      field: "$body",
      message: "Debe enviar al menos un campo editable para actualizar."
    });
  }

  if (missingRequiredFields.length > 0 || invalidFields.length > 0) {
    return {
      ok: false,
      status: "validation_failed",
      updated: false,
      tableName: connection.keyResultHistoryTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields,
      invalidFields
    };
  }

  try {
    const record = await updateAirtableRecord(
      connection.keyResultHistoryTableName,
      normalizedRecordId,
      validation.fields,
      {
        apiToken: connection.apiToken,
        baseId: connection.baseId
      }
    );

    return {
      ok: true,
      status: "updated",
      updated: true,
      tableName: connection.keyResultHistoryTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      record: {
        id: record.id,
        createdTime: record.createdTime,
        fields: pickResponseFields(record, validation.fields, validation.responseFields)
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: "update_failed",
      updated: false,
      tableName: connection.keyResultHistoryTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el histórico del Key Result en Singular Agile."
    };
  }
}
