import type { AirtableCollaborator } from "../airtable/types.js";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isAirtableCollaborator(value: unknown): value is AirtableCollaborator {
  return typeof value === "object" && value !== null;
}

export function getCollaboratorEmail(value: unknown) {
  if (!isAirtableCollaborator(value)) {
    return null;
  }

  const rawEmail = typeof value.email === "string" ? value.email : "";
  return rawEmail.trim().length > 0 ? normalizeEmail(rawEmail) : null;
}

export function getCollaboratorName(value: unknown) {
  if (!isAirtableCollaborator(value)) {
    return null;
  }

  const rawName = typeof value.name === "string" ? value.name.trim() : "";
  return rawName.length > 0 ? rawName : null;
}

export function getOptionalObjectiveStatus(value: unknown) {
  if (
    value === "Achieved" ||
    value === "In Progress" ||
    value === "Pending Review" ||
    value === "Underachieved"
  ) {
    return value;
  }

  return null;
}

export function getOptionalKeyResultStatus(value: unknown) {
  if (value === "Done" || value === "In progress" || value === "Todo") {
    return value;
  }

  return null;
}

export function getOptionalKeyProjectStatus(value: unknown) {
  if (value === "Active" || value === "Archived" || value === "Suggested by Resource") {
    return value;
  }

  return null;
}

export function requireNonEmptyString(value: string | undefined, fieldName: string) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return trimmedValue;
}

export function normalizeNullablePercentInput(value: number | null | undefined) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }

  return value > 1 ? value / 100 : value;
}

export function compactAirtableCreateFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (value === null || value === undefined) {
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

