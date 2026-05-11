import { createAirtableRecord, updateAirtableRecord } from "../airtable/client.js";
import type { AirtableRecord } from "../airtable/types.js";
import { getSingularAgileConnection } from "./config.js";
import type {
  SingularAgileCreateKeyProjectResult,
  SingularAgileFieldIssue,
  SingularAgileUpdateKeyProjectResult
} from "./types.js";

type FieldDefinition = {
  airtableField: string;
  aliases: string[];
  required?: boolean;
  validate: (value: unknown) => { ok: true; value: unknown } | { ok: false; message: string };
};

const keyProjectFieldDefinitions = {
  name: {
    aliases: ["name", "epicName", "Epic Name", "epic_name"],
    airtableField: "Epic Name",
    required: true,
    validate: validateRequiredString
  },
  status: {
    aliases: ["status", "Status"],
    airtableField: "Status",
    validate: validateOptionalString
  },
  projectIds: {
    aliases: ["projectIds", "projects", "Projects"],
    airtableField: "Projects",
    validate: validateOptionalStringArray
  },
  keyResultIds: {
    aliases: ["keyResultIds", "keyResults", "Key Results", "key_results"],
    airtableField: "key_result",
    validate: validateOptionalStringArray
  },
  dontShowInSingularStories: {
    aliases: ["dontShowInSingularStories", "Don't Show In Singular Stories", "dont_show_in_singular_stories"],
    airtableField: "Don't Show In Singular Stories",
    validate: validateOptionalBoolean
  },
  clarity: {
    aliases: ["clarity", "Clarity"],
    airtableField: "Clarity",
    validate: validateOptionalNumber
  },
  strategicFocus: {
    aliases: ["strategicFocus", "Strategic Focus", "strategic_focus"],
    airtableField: "Strategic Focus",
    validate: validateOptionalNumber
  },
  valueOrientation: {
    aliases: ["valueOrientation", "Value Orientation", "value_orientation"],
    airtableField: "Value Orientation",
    validate: validateOptionalNumber
  },
  finalScore: {
    aliases: ["finalScore", "finalscore"],
    airtableField: "finalScore",
    validate: validateOptionalNumber
  },
  justification: {
    aliases: ["justification", "Justification"],
    airtableField: "Justification",
    validate: validateOptionalString
  }
} satisfies Record<string, FieldDefinition>;

export const singularAgileKeyProjectFields = {
  create: keyProjectFieldDefinitions,
  update: keyProjectFieldDefinitions
};

const CREATE_FIELD_DEFINITIONS: FieldDefinition[] = [
  singularAgileKeyProjectFields.create.name,
  singularAgileKeyProjectFields.create.status,
  singularAgileKeyProjectFields.create.projectIds,
  singularAgileKeyProjectFields.create.keyResultIds,
  singularAgileKeyProjectFields.create.dontShowInSingularStories,
  singularAgileKeyProjectFields.create.clarity,
  singularAgileKeyProjectFields.create.strategicFocus,
  singularAgileKeyProjectFields.create.valueOrientation,
  singularAgileKeyProjectFields.create.finalScore,
  singularAgileKeyProjectFields.create.justification
];

const UPDATE_FIELD_DEFINITIONS: FieldDefinition[] = [
  singularAgileKeyProjectFields.update.name,
  singularAgileKeyProjectFields.update.status,
  singularAgileKeyProjectFields.update.projectIds,
  singularAgileKeyProjectFields.update.keyResultIds,
  singularAgileKeyProjectFields.update.dontShowInSingularStories,
  singularAgileKeyProjectFields.update.clarity,
  singularAgileKeyProjectFields.update.strategicFocus,
  singularAgileKeyProjectFields.update.valueOrientation,
  singularAgileKeyProjectFields.update.finalScore,
  singularAgileKeyProjectFields.update.justification
];

const LEGACY_CREATE_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    aliases: ["epicStory", "story", "Epic Story", "epic_story"],
    airtableField: "Epic Story",
    validate: validateOptionalString
  },
  {
    aliases: ["aiStoriesAssist", "AI Stories Assist", "ai_stories_assist"],
    airtableField: "AI Stories Assist",
    validate: validateOptionalString
  },
];

const aliasToDefinition = new Map(
  [...UPDATE_FIELD_DEFINITIONS, ...LEGACY_CREATE_FIELD_DEFINITIONS].flatMap((definition) =>
    definition.aliases.map((alias) => [alias, definition] as const)
  )
);

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

function validateOptionalBoolean(value: unknown) {
  if (value === undefined || value === null) {
    return {
      ok: true,
      value: undefined
    } as const;
  }

  if (typeof value !== "boolean") {
    return {
      ok: false,
      message: "Debe ser booleano."
    } as const;
  }

  return {
    ok: true,
    value
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

  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && item.trim().length > 0)
  ) {
    return {
      ok: false,
      message: "Debe ser un record id o una lista de record ids."
    } as const;
  }

  return {
    ok: true,
    value: [...new Set(value.map((item) => item.trim()))]
  } as const;
}

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

export function validateSingularAgileKeyProjectInput(input: unknown) {
  return validateSingularAgileKeyProjectFields(input, CREATE_FIELD_DEFINITIONS, true);
}

export function validateSingularAgileKeyProjectUpdateInput(input: unknown) {
  return validateSingularAgileKeyProjectFields(input, UPDATE_FIELD_DEFINITIONS, false);
}

function validateSingularAgileKeyProjectFields(
  input: unknown,
  fieldDefinitions: FieldDefinition[],
  requireRequiredFields: boolean
) {
  const fields: Record<string, unknown> = {};
  const acceptedFields: string[] = [];
  const unknownFields: string[] = [];
  const invalidFields: SingularAgileFieldIssue[] = [];

  if (!isPlainObject(input)) {
    return {
      acceptedFields,
      fields,
      invalidFields: [
        {
          field: "$body",
          message: "El payload debe ser un objeto JSON."
        }
      ],
      missingRequiredFields: requireRequiredFields
        ? fieldDefinitions.filter((definition) => definition.required).map((definition) => definition.airtableField)
        : [],
      unknownFields
    };
  }

  for (const [inputField, value] of Object.entries(input)) {
    const definition = aliasToDefinition.get(inputField);

    if (!definition) {
      unknownFields.push(inputField);
      continue;
    }

    const validation = definition.validate(value);

    if (!validation.ok) {
      invalidFields.push({
        field: inputField,
        message: validation.message
      });
      continue;
    }

    fields[definition.airtableField] = validation.value;
    acceptedFields.push(inputField);
  }

  const compactedFields = compactFields(fields);
  const missingRequiredFields = requireRequiredFields
    ? fieldDefinitions
        .filter(
          (definition) =>
            definition.required &&
            !Object.prototype.hasOwnProperty.call(compactedFields, definition.airtableField)
        )
        .map((definition) => definition.airtableField)
    : [];

  return {
    acceptedFields,
    fields: compactedFields,
    invalidFields,
    missingRequiredFields,
    unknownFields
  };
}

function normalizeRecordId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createSingularAgileKeyProject(input: unknown): Promise<SingularAgileCreateKeyProjectResult> {
  const connection = getSingularAgileConnection();
  const validation = validateSingularAgileKeyProjectInput(input);

  if (validation.missingRequiredFields.length > 0 || validation.invalidFields.length > 0) {
    return {
      ok: false,
      status: "validation_failed",
      created: false,
      tableName: connection.keyProjectTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: validation.missingRequiredFields,
      invalidFields: validation.invalidFields
    };
  }

  try {
    const record = await createAirtableRecord(connection.keyProjectTableName, validation.fields, {
      apiToken: connection.apiToken,
      baseId: connection.baseId
    });

    return {
      ok: true,
      status: "created",
      created: true,
      tableName: connection.keyProjectTableName,
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
      tableName: connection.keyProjectTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      message: error instanceof Error ? error.message : "No fue posible crear el Key Project en Singular Agile."
    };
  }
}

export async function updateSingularAgileKeyProject(
  recordId: unknown,
  input: unknown
): Promise<SingularAgileUpdateKeyProjectResult> {
  const connection = getSingularAgileConnection();
  const normalizedRecordId = normalizeRecordId(recordId);
  const validation = validateSingularAgileKeyProjectUpdateInput(input);
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
      tableName: connection.keyProjectTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields,
      invalidFields
    };
  }

  try {
    const record = await updateAirtableRecord(
      connection.keyProjectTableName,
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
      tableName: connection.keyProjectTableName,
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
      tableName: connection.keyProjectTableName,
      acceptedFields: validation.acceptedFields,
      unknownFields: validation.unknownFields,
      missingRequiredFields: [],
      invalidFields: [],
      message: error instanceof Error ? error.message : "No fue posible actualizar el Key Project en Singular Agile."
    };
  }
}
