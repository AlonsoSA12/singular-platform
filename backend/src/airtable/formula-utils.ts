export function escapeFormulaValue(value: string) {
  return value.replace(/'/g, "\\'");
}

export function escapeRegexValue(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildRecordIdsFilterFormula(recordIds: string[]) {
  const uniqueRecordIds = [...new Set(recordIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueRecordIds.length === 0) {
    return "FALSE()";
  }

  return `OR(${uniqueRecordIds.map((id) => `RECORD_ID()='${escapeFormulaValue(id)}'`).join(",")})`;
}
