import { createAirtableRecord, updateAirtableRecord } from "../airtable/client.js";
import type { AirtableRecord } from "../airtable/types.js";
import { getSingularAgileConnection } from "./config.js";
import type {
  SingularAgileCreateObjectiveResult,
  SingularAgileFieldIssue,
  SingularAgileUpdateObjectiveResult
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

function validateOptionalObjectiveStatus(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true,
      value: undefined
    } as const;
  }

  if (value === "Achieved" || value === "In Progress" || value === "Pending Review" || value === "Underachieved") {
    return {
      ok: true,
      value
    } as const;
  }

  return {
    ok: false,
    message: "Debe ser Achieved, In Progress, Pending Review o Underachieved."
  } as const;
}

const objectiveFieldDefinitions = {
  objective: {
    aliases: ["objective", "Objective", "objetivo"],
    airtableField: "Objective",
    required: true,
    validate: validateRequiredString
  },
  description: {
    aliases: ["description", "descripcion", "descripción", "Objetive Description"],
    airtableField: "Objetive Description",
    validate: validateOptionalString
  },
  explanation: {
    aliases: ["explanation", "Explanation"],
    airtableField: "Explanation",
    validate: validateOptionalString
  },
  metric: {
    aliases: ["metric", "Metric"],
    airtableField: "Metric",
    validate: validateOptionalString
  },
  priority: {
    aliases: ["priority", "Priority"],
    airtableField: "Priority",
    validate: validateOptionalString
  },
  status: {
    aliases: ["status", "Status"],
    airtableField: "Status",
    validate: validateOptionalObjectiveStatus
  },
  targetDate: {
    aliases: ["targetDate", "Target Date", "target_date"],
    airtableField: "Target Date",
    validate: validateOptionalString
  },
  type: {
    aliases: ["type", "Type"],
    airtableField: "Type",
    validate: validateOptionalString
  },
  aiSuggestedKeyResults: {
    aliases: ["aiSuggestedKeyResults", "AI suggested key results", "suggestedKeyResults"],
    airtableField: "AI suggested key results",
    validate: validateOptionalString
  },
  keyResultIds: {
    aliases: ["keyResultIds", "keyResults", "Key Results"],
    airtableField: "Key Results",
    validate: validateOptionalStringArray
  },
  projectIds: {
    aliases: ["projectIds", "projectId", "Project", "projects"],
    airtableField: "Project",
    validate: validateOptionalStringArray
  }
} satisfies Record<string, FieldDefinition>;

export const singularAgileObjectiveFields = {
  create: objectiveFieldDefinitions,
  update: objectiveFieldDefinitions
};

const CREATE_FIELD_DEFINITIONS: FieldDefinition[] = Object.values(singularAgileObjectiveFields.create);
const UPDATE_FIELD_DEFINITIONS: FieldDefinition[] = Object.values(singularAgileObjectiveFields.update);
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

function pickResponseFields(record: AirtableRecord, sentFields: Record<string, unknown>) {
  const responseFields = record.fields ?? {};

  return Object.fromEntries(
    Object.keys(sentFields).map((fieldName) => [fieldName, responseFields[fieldName] ?? sentFields[fieldName]])
  );
}

function validateSingularAgileObjectiveFields(
  input: unknown,
  fieldDefinitions: FieldDefinition[],
  requireRequiredFields: boolean
) {
  const source = isPlainObject(input) ? input : {};
  const fields: Record<string, unknown> = {};
  const acceptedFields: string[] = [];
  const unknownFields: string[] = [];
  const invalidFields: SingularAgileFieldIssue[] = [];

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

  if (requireRequiredFields && fields["Status"] === undefined) {
    fields["Status"] = "Pending Review";
  }

  const compactedFields = compactFields(fields);
  const missingRequiredFields = requireRequiredFields
    ? fieldDefinitions
        .filter(
          (definition) =>
            definition.required &&
            !Object.prototype.hasOwnProperty.call(compactedFields, definition.airtableField)
        )
        .map((definition) => definition.aliases[0])
    : [];

  return {
    acceptedFields,
    fields: compactedFields,
    invalidFields,
    missingRequiredFields,
    unknownFields
  };
}

function validateSingularAgileObjectiveInput(input: unknown) {
  return validateSingularAgileObjectiveFields(input, CREATE_FIELD_DEFINITIONS, true);
}

function validateSingularAgileObjectiveUpdateInput(input: unknown) {
  return validateSingularAgileObjectiveFields(input, UPDATE_FIELD_DEFINITIONS, false);
}

function normalizeRecordId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createSingularAgileObjective(input: unknown): Promise<SingularAgileCreateObjectiveResult> {
  const connection = getSingularAgileConnection();
  const validation = validateSingularAgileObjectiveInput(input);

  if (validation.missingRequiredFields.length > 0 || validation.invalidFields.length > 0) {
    return {
      ok: false,
      status: "validation_failed",
      created: false,
      tableName: connection.objectiveTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: validation.missingRequiredFields,
      invalidFields: validation.invalidFields
    };
  }

  try {
    const record = await createAirtableRecord(connection.objectiveTableName, validation.fields, {
      apiToken: connection.apiToken,
      baseId: connection.baseId
    });

    return {
      ok: true,
      status: "created",
      created: true,
      tableName: connection.objectiveTableName,
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
      tableName: connection.objectiveTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      message: error instanceof Error ? error.message : "No fue posible crear el Objective en Singular Agile."
    };
  }
}

export async function updateSingularAgileObjective(
  recordId: unknown,
  input: unknown
): Promise<SingularAgileUpdateObjectiveResult> {
  const connection = getSingularAgileConnection();
  const normalizedRecordId = normalizeRecordId(recordId);
  const validation = validateSingularAgileObjectiveUpdateInput(input);
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
      tableName: connection.objectiveTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields,
      invalidFields
    };
  }

  try {
    const record = await updateAirtableRecord(
      connection.objectiveTableName,
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
      tableName: connection.objectiveTableName,
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
      tableName: connection.objectiveTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      message: error instanceof Error ? error.message : "No fue posible actualizar el Objective en Singular Agile."
    };
  }
}
