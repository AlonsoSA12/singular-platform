function normalizeAirtableFieldName(fieldName: string) {
  return fieldName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function getFieldValue(fields: Record<string, unknown>, fieldName: string) {
  if (fieldName in fields) {
    return fields[fieldName];
  }

  const normalizedFieldName = normalizeAirtableFieldName(fieldName);
  const compactFieldName = normalizedFieldName.replaceAll("_", "");
  const entry = Object.entries(fields).find(([key]) => {
    const normalizedKey = normalizeAirtableFieldName(key);

    return normalizedKey === normalizedFieldName || normalizedKey.replaceAll("_", "") === compactFieldName;
  });

  return entry?.[1];
}

export function getTextField(fields: Record<string, unknown>, fieldName: string) {
  const value = getFieldValue(fields, fieldName);

  return typeof value === "string" ? value.trim() : "";
}

export function getNumberField(fields: Record<string, unknown>, fieldName: string) {
  const value = getFieldValue(fields, fieldName);

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getBooleanField(fields: Record<string, unknown>, fieldName: string) {
  return getFieldValue(fields, fieldName) === true;
}

export function getPercentField(fields: Record<string, unknown>, fieldName: string) {
  const value = fields[fieldName];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value <= 1 ? Math.round(value * 100) : Math.round(value);
  }

  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function getLinkedRecordIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getFirstTextValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item.trim();
    }
  }

  return null;
}

export function getFirstPersonEmail(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (typeof item === "object" && item !== null) {
      const email = (item as { email?: unknown }).email;
      if (typeof email === "string" && email.trim().length > 0) {
        return email.trim().toLowerCase();
      }
    }
  }

  return null;
}
