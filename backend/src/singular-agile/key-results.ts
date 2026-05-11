import { createAirtableRecord, updateAirtableRecord } from "../airtable/client.js";
import type { AirtableRecord } from "../airtable/types.js";
import { getSingularAgileConnection } from "./config.js";
import type {
  SingularAgileCreateKeyResultResult,
  SingularAgileFieldIssue,
  SingularAgileUpdateKeyResultResult
} from "./types.js";

type FieldDefinition = {
  airtableField: string;
  aliases: string[];
  required?: boolean;
  validate: (value: unknown) => { ok: true; value: unknown } | { ok: false; message: string };
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequiredString(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      ok: false,
      message: "Debe ser un texto no vacío."
    } as const;
  }

  return {
    ok: true,
    value: value.trim()
  } as const;
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

const keyResultFieldDefinitions = {
  keyResult: {
    aliases: ["keyResult", "Key Result", "kr"],
    airtableField: "Key Result",
    required: true,
    validate: validateRequiredString
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
  status: {
    aliases: ["status", "Status"],
    airtableField: "Status",
    validate: validateOptionalStatus
  },
  initialValue: {
    aliases: ["initialValue", "Initial Value", "initial_value"],
    airtableField: "Initial Value",
    validate: validateOptionalNumber
  },
  currentValue: {
    aliases: ["currentValue", "Current Value", "current_value"],
    airtableField: "Current Value",
    validate: validateOptionalNumber
  },
  targetValue: {
    aliases: ["targetValue", "Target Value", "target_value"],
    airtableField: "Target Value",
    validate: validateOptionalNumber
  },
  targetDate: {
    aliases: ["targetDate", "Target Date", "target_date"],
    airtableField: "Target Date",
    validate: validateOptionalString
  },
  projectIds: {
    aliases: ["projectIds", "projectId", "Project", "projects"],
    airtableField: "Project",
    validate: validateOptionalStringArray
  },
  objectiveIds: {
    aliases: ["objectiveIds", "objectiveId", "Objetive", "Objective"],
    airtableField: "Objetive",
    validate: validateOptionalStringArray
  }
} satisfies Record<string, FieldDefinition>;

export const singularAgileKeyResultFields = {
  create: keyResultFieldDefinitions,
  update: keyResultFieldDefinitions
};

const CREATE_FIELD_DEFINITIONS: FieldDefinition[] = Object.values(singularAgileKeyResultFields.create);
const UPDATE_FIELD_DEFINITIONS: FieldDefinition[] = Object.values(singularAgileKeyResultFields.update);
const aliasToDefinition = new Map(
  UPDATE_FIELD_DEFINITIONS.flatMap((definition) => definition.aliases.map((alias) => [alias, definition] as const))
);

function compactFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim().length === 0) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

function pickResponseFields(record: AirtableRecord, fields: Record<string, unknown>) {
  const fieldNames = Object.keys(fields);

  return Object.fromEntries(fieldNames.map((fieldName) => [fieldName, record.fields[fieldName]]));
}

function validateSingularAgileKeyResultFields(
  input: unknown,
  fieldDefinitions: FieldDefinition[],
  requireRequiredFields: boolean
) {
  const source = isPlainObject(input) ? input : {};
  const fields: Record<string, unknown> = {};
  const acceptedFields: string[] = [];
  const unknownFields: string[] = [];
  const invalidFields: SingularAgileFieldIssue[] = [];
  const missingRequiredFields: string[] = [];

  for (const [key, value] of Object.entries(source)) {
    const definition = aliasToDefinition.get(key);

    if (!definition) {
      unknownFields.push(key);
      continue;
    }

    const validation = definition.validate(value);
    if (!validation.ok) {
      invalidFields.push({
        field: key,
        message: validation.message
      });
      continue;
    }

    if (validation.value !== undefined) {
      acceptedFields.push(key);
      fields[definition.airtableField] = validation.value;
    }
  }

  for (const definition of fieldDefinitions) {
    if (requireRequiredFields && definition.required && fields[definition.airtableField] === undefined) {
      missingRequiredFields.push(definition.aliases[0]);
    }
  }

  if (requireRequiredFields && fields["Status"] === undefined) {
    fields["Status"] = "Todo";
  }

  return {
    acceptedFields,
    fields: compactFields(fields),
    invalidFields,
    missingRequiredFields,
    unknownFields
  };
}

function validateSingularAgileKeyResultInput(input: unknown) {
  return validateSingularAgileKeyResultFields(input, CREATE_FIELD_DEFINITIONS, true);
}

function validateSingularAgileKeyResultUpdateInput(input: unknown) {
  return validateSingularAgileKeyResultFields(input, UPDATE_FIELD_DEFINITIONS, false);
}

function normalizeRecordId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createSingularAgileKeyResult(input: unknown): Promise<SingularAgileCreateKeyResultResult> {
  const connection = getSingularAgileConnection();
  const validation = validateSingularAgileKeyResultInput(input);

  if (validation.missingRequiredFields.length > 0 || validation.invalidFields.length > 0) {
    return {
      ok: false,
      status: "validation_failed",
      created: false,
      tableName: connection.keyResultTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: validation.missingRequiredFields,
      invalidFields: validation.invalidFields
    };
  }

  try {
    const record = await createAirtableRecord(connection.keyResultTableName, validation.fields, {
      apiToken: connection.apiToken,
      baseId: connection.baseId
    });

    return {
      ok: true,
      status: "created",
      created: true,
      tableName: connection.keyResultTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      record: {
        id: record.id,
        createdTime: record.createdTime,
        fields: pickResponseFields(record, validation.fields)
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: "create_failed",
      created: false,
      tableName: connection.keyResultTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      message: error instanceof Error ? error.message : "No fue posible crear el Key Result en Singular Agile."
    };
  }
}

export async function updateSingularAgileKeyResult(
  recordId: unknown,
  input: unknown
): Promise<SingularAgileUpdateKeyResultResult> {
  const connection = getSingularAgileConnection();
  const normalizedRecordId = normalizeRecordId(recordId);
  const validation = validateSingularAgileKeyResultUpdateInput(input);
  const invalidFields = [...validation.invalidFields];
  const missingRequiredFields = [...validation.missingRequiredFields];

  if (!normalizedRecordId) {
    missingRequiredFields.push("recordId");
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
      tableName: connection.keyResultTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields,
      invalidFields
    };
  }

  try {
    const record = await updateAirtableRecord(
      connection.keyResultTableName,
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
      tableName: connection.keyResultTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      record: {
        id: record.id,
        createdTime: record.createdTime,
        fields: pickResponseFields(record, validation.fields)
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: "update_failed",
      updated: false,
      tableName: connection.keyResultTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      message: error instanceof Error ? error.message : "No fue posible actualizar el Key Result en Singular Agile."
    };
  }
}
