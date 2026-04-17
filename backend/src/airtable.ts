import { getAirtableConfig, getOpenAIConfig } from "./config.js";

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type AirtableResponse = {
  offset?: string;
  records: AirtableRecord[];
};

type TrustworthinessRecordUpdateFields = {
  "Credibility Points"?: number | null;
  "Credibility AI JSON"?: string | null;
  "Feedback"?: string;
  "Group Thinking Points"?: number | null;
  "Group Thinking Points AI JSON"?: string | null;
  "Intimacy Points"?: number | null;
  "Intimacy AI JSON"?: string | null;
  "Reliability Points"?: number | null;
  "Reliability AI JSON"?: string | null;
};

type FetchAirtableRecordsOptions = {
  apiToken?: string;
  baseId?: string;
  fields?: string[];
  filterByFormula?: string;
};

type DateRangeLiteral = {
  end: string;
  start: string;
};

type PeriodRange = {
  endsAt: Date;
  exclusiveEndAt: Date;
  id: string;
  startsAt: Date;
};

type CoachingParticipant = {
  avatarUrl: string | null;
  email: string;
  name: string;
  role: string | null;
};

type CoachingEvidenceMeeting = {
  actionItems: string[];
  coachingAnalysis: string | null;
  coachingSummary: string | null;
  metricsScores: Record<string, number | null>;
  rawRecordId: string;
  title: string;
  topics: string[];
  transcriptSummary: string | null;
  when: string | null;
};

type Confidence = "low" | "medium" | "high";
type PillarKey = "reliability" | "intimacy" | "groupThinking" | "credibility";
type FeedbackGenerationInput = {
  evaluatedName: string;
  existingFeedback?: string | null;
  pillars: Record<
    PillarKey,
    {
      aiSuggestion?: unknown;
      meaning: string;
      points: number;
    }
  >;
  projectContext?: string | null;
  roleLabel?: string | null;
};
export type TrustworthinessSuggestionStage =
  | "validating_evaluation_data"
  | "fetching_airtable_meetings"
  | "building_meeting_evidence"
  | "sending_context_to_ai"
  | "validating_structured_response"
  | "calculating_tw_score";

export const TRUSTWORTHINESS_SUGGESTION_STAGE_LABELS: Record<
  TrustworthinessSuggestionStage,
  string
> = {
  validating_evaluation_data: "Validando datos de la evaluación",
  fetching_airtable_meetings: "Consultando reuniones en Airtable",
  building_meeting_evidence: "Preparando evidencia de reuniones",
  sending_context_to_ai: "Enviando contexto a IA",
  validating_structured_response: "Validando respuesta estructurada",
  calculating_tw_score: "Calculando score final de TW"
};

type TrustworthinessSuggestionStageEmitter = (
  stage: TrustworthinessSuggestionStage
) => void | Promise<void>;

const TRUSTWORTHINESS_START_FIELD = "Start Date Range";
const TRUSTWORTHINESS_END_FIELD = "End Date Range";
const TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD = "Email address from Evaluator";
const COACHING_INPUT_LOG_PARTICIPANT_FIELD = "participant";
const COACHING_INPUT_LOG_RECEIVED_AT_FIELD = "received_at";
const COACHING_INPUT_LOG_UNIQUE_KEY_FIELD = "unique_key";
const COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD = "raw_payload";
const COACHING_INPUT_LOG_METRICS_JSON_FIELD = "metrics_json";
const SPRINT_TABLE_NAME = "Sprints";
const SPRINT_NAME_FIELD = "Sprint Name";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function escapeFormulaValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function escapeRegexValue(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

function createPeriodRange(periodId: string): PeriodRange | null {
  const startsAt = new Date(`${periodId}T00:00:00.000Z`);

  if (Number.isNaN(startsAt.getTime())) {
    return null;
  }

  const exclusiveEndAt = new Date(
    Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + 1, 25, 0, 0, 0, 0)
  );
  const endsAt = new Date(
    Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + 1, 24, 23, 59, 59, 999)
  );

  return {
    id: periodId,
    exclusiveEndAt,
    startsAt,
    endsAt
  };
}

function parseIsoDateLiteral(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function toIsoDateLiteral(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildEvaluatorFilterFormula(evaluatorEmail: string) {
  const normalizedEmail = normalizeEmail(evaluatorEmail);
  const escapedRegex = escapeFormulaValue(escapeRegexValue(normalizedEmail));

  return `REGEX_MATCH("," & LOWER(ARRAYJOIN({${TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD}}, ",")) & ",", ",${escapedRegex},")`;
}

function buildPeriodFilterFormula(periods: PeriodRange[]) {
  if (periods.length === 0) {
    return "";
  }

  const formulas = periods.map((period) => {
    const periodStart = escapeFormulaValue(toIsoDateLiteral(period.startsAt));
    const periodEnd = escapeFormulaValue(toIsoDateLiteral(period.endsAt));

    return `AND({${TRUSTWORTHINESS_START_FIELD}} <= DATETIME_PARSE("${periodEnd}", "YYYY-MM-DD"), {${TRUSTWORTHINESS_END_FIELD}} >= DATETIME_PARSE("${periodStart}", "YYYY-MM-DD"))`;
  });

  if (formulas.length === 1) {
    return formulas[0];
  }

  return `OR(${formulas.join(",")})`;
}

function buildSingleDateFieldRangeFilterFormula(fieldName: string, startsAt: Date, exclusiveEndAt: Date) {
  const periodStart = escapeFormulaValue(toIsoDateLiteral(startsAt));
  const periodExclusiveEnd = escapeFormulaValue(toIsoDateLiteral(exclusiveEndAt));

  return `AND({${fieldName}} >= DATETIME_PARSE("${periodStart}", "YYYY-MM-DD"), {${fieldName}} < DATETIME_PARSE("${periodExclusiveEnd}", "YYYY-MM-DD"))`;
}

function buildTrustworthinessFilterFormula(selectedPeriods: string[], evaluatorEmail: string) {
  const periodRanges = selectedPeriods
    .map((periodId) => createPeriodRange(periodId))
    .filter((period): period is PeriodRange => period !== null);
  const formulas = [buildEvaluatorFilterFormula(evaluatorEmail)];
  const periodFormula = buildPeriodFilterFormula(periodRanges);

  if (periodFormula) {
    formulas.push(periodFormula);
  }

  return {
    filterByFormula: formulas.length === 1 ? formulas[0] : `AND(${formulas.join(",")})`,
    selectedPeriods: periodRanges.map((period) => period.id)
  };
}

function buildParticipantFilterFormula(participantEmail: string) {
  const normalizedEmail = escapeFormulaValue(escapeRegexValue(normalizeEmail(participantEmail)));

  return `REGEX_MATCH(LOWER({${COACHING_INPUT_LOG_PARTICIPANT_FIELD}} & ""), "${normalizedEmail}")`;
}

function getTotalPeriodCoverage(selectedPeriods: string[], explicitRange?: DateRangeLiteral) {
  if (explicitRange?.start && explicitRange?.end) {
    const startsAt = parseIsoDateLiteral(explicitRange.start);
    const endsAtInclusive = parseIsoDateLiteral(explicitRange.end);

    if (startsAt && endsAtInclusive) {
      const exclusiveEndAt = new Date(endsAtInclusive.getTime() + 24 * 60 * 60 * 1000);

      return {
        exclusiveEndAt,
        selectedPeriods,
        startsAt
      };
    }
  }

  const periodRanges = selectedPeriods
    .map((periodId) => createPeriodRange(periodId))
    .filter((period): period is PeriodRange => period !== null);
  if (periodRanges.length === 0) {
    return null;
  }

  return {
    exclusiveEndAt: new Date(Math.max(...periodRanges.map((period) => period.exclusiveEndAt.getTime()))),
    selectedPeriods: periodRanges.map((period) => period.id),
    startsAt: new Date(Math.min(...periodRanges.map((period) => period.startsAt.getTime())))
  };
}

function buildCoachingInputLogFilterFormula(
  selectedPeriods: string[],
  participantEmail: string,
  activeSessionEmail?: string,
  explicitRange?: DateRangeLiteral
) {
  const formulas = [buildParticipantFilterFormula(participantEmail)];

  if (activeSessionEmail && normalizeEmail(activeSessionEmail) !== normalizeEmail(participantEmail)) {
    formulas.push(buildParticipantFilterFormula(activeSessionEmail));
  }

  const totalRange = getTotalPeriodCoverage(selectedPeriods, explicitRange);
  const periodFormula = totalRange
    ? buildSingleDateFieldRangeFilterFormula(
        COACHING_INPUT_LOG_RECEIVED_AT_FIELD,
        totalRange.startsAt,
        totalRange.exclusiveEndAt
      )
    : "";

  if (periodFormula) {
    formulas.push(periodFormula);
  }

  return {
    filterByFormula: formulas.length === 1 ? formulas[0] : `AND(${formulas.join(",")})`,
    selectedPeriods: totalRange?.selectedPeriods ?? []
  };
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
  url.searchParams.append("fields[]", airtableConfig.airtableRoleField);

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
  const rawRole = record.fields[airtableConfig.airtableRoleField];

  return {
    authenticated: true,
    email: normalizedEmail,
    name: rawName ? String(rawName) : null,
    role: rawRole ? String(rawRole) : null
  };
}

async function fetchAirtableRecords(
  tableName: string,
  options: FetchAirtableRecordsOptions = {}
) {
  const airtableConfig = getAirtableConfig();
  const baseId = options.baseId || airtableConfig.airtableBaseId;
  const apiToken = options.apiToken || airtableConfig.airtableApiToken;
  const records: AirtableRecord[] = [];
  let offset = "";

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
    );

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

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`
      }
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

function dedupeAirtableRecords(records: AirtableRecord[]) {
  const uniqueRecords = new Map<string, AirtableRecord>();

  for (const record of records) {
    if (!uniqueRecords.has(record.id)) {
      uniqueRecords.set(record.id, record);
    }
  }

  return [...uniqueRecords.values()];
}

function getTrustworthinessTableName() {
  const airtableConfig = getAirtableConfig();

  if (!airtableConfig.airtableTrustworthinessTableName) {
    throw new Error(
      "Missing trustworthiness Airtable table name. Set AIRTABLE_TRUSTWORTHINESS_TABLE_NAME in the root .env."
    );
  }

  return airtableConfig.airtableTrustworthinessTableName;
}

function getCoachingInputLogTableName() {
  const airtableConfig = getAirtableConfig();

  return airtableConfig.airtableCoachingInputLogTableName || "coaching_input_log";
}

function getCoachingInputLogConnection() {
  const airtableConfig = getAirtableConfig();

  return {
    apiToken: airtableConfig.airtableCoachingInputLogApiToken || airtableConfig.airtableApiToken,
    baseId: airtableConfig.airtableCoachingInputLogBaseId || airtableConfig.airtableBaseId,
    tableName: getCoachingInputLogTableName()
  };
}

function extractEmailsFromParticipant(value: string) {
  const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

  return [...new Set(matches.map((email) => normalizeEmail(email)))];
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildRecordIdsFilterFormula(recordIds: string[]) {
  if (recordIds.length === 0) {
    return "";
  }

  if (recordIds.length === 1) {
    return `RECORD_ID()="${escapeFormulaValue(recordIds[0])}"`;
  }

  return `OR(${recordIds
    .map((recordId) => `RECORD_ID()="${escapeFormulaValue(recordId)}"`)
    .join(",")})`;
}

async function fetchRecordsByIds(tableName: string, recordIds: string[], fields: string[]) {
  const uniqueIds = [...new Set(recordIds.filter((recordId) => recordId.trim().length > 0))];

  if (uniqueIds.length === 0) {
    return [] as AirtableRecord[];
  }

  const records = await Promise.all(
    chunkArray(uniqueIds, 25).map((recordIdChunk) =>
      fetchAirtableRecords(tableName, {
        fields,
        filterByFormula: buildRecordIdsFilterFormula(recordIdChunk)
      })
    )
  );

  return dedupeAirtableRecords(records.flat());
}

async function updateAirtableRecord(
  tableName: string,
  recordId: string,
  fields: TrustworthinessRecordUpdateFields
) {
  const airtableConfig = getAirtableConfig();
  const url = new URL(
    `https://api.airtable.com/v0/${airtableConfig.airtableBaseId}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`
  );

  const response = await fetch(url, {
    body: JSON.stringify({
      fields,
      typecast: true
    }),
    headers: {
      Authorization: `Bearer ${airtableConfig.airtableApiToken}`,
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
    } catch {
      details = "";
    }

    throw new Error(`Airtable request failed for table ${tableName} with status ${response.status}${details}`);
  }

  return (await response.json()) as AirtableRecord;
}

function getLinkedRecordIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getFirstTextValue(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
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

function parseJsonRecord(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;

    return typeof parsedValue === "object" && parsedValue !== null
      ? (parsedValue as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonRecordFromFields(record: AirtableRecord, fieldName: string) {
  return parseJsonRecord(record.fields[fieldName]);
}

function getNestedValue(record: Record<string, unknown> | null, path: string[]) {
  if (!record) {
    return null;
  }

  let currentValue: unknown = record;

  for (const key of path) {
    if (!isPlainRecord(currentValue)) {
      return null;
    }

    currentValue = currentValue[key];
  }

  return currentValue;
}

function getNestedTextValue(record: Record<string, unknown> | null, path: string[]) {
  const currentValue = getNestedValue(record, path);

  return typeof currentValue === "string" && currentValue.trim().length > 0
    ? currentValue.trim()
    : null;
}

function getNestedArrayValue(record: Record<string, unknown> | null, path: string[]) {
  const value = getNestedValue(record, path);

  return Array.isArray(value) ? value : [];
}

function getNestedRecordValue(record: Record<string, unknown> | null, path: string[]) {
  const value = getNestedValue(record, path);

  return isPlainRecord(value) ? value : null;
}

function getTextItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (isPlainRecord(item) && typeof item.text === "string") {
        return item.text.trim();
      }

      return "";
    })
    .filter((item) => item.length > 0);
}

function getNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function createFallbackPersonName(email: string) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getParticipantRecords(rawPayload: Record<string, unknown> | null) {
  return [
    ...getNestedArrayValue(rawPayload, ["participants"]),
    ...getNestedArrayValue(rawPayload, ["transcript", "participants"])
  ].filter(isPlainRecord);
}

function getCoachingParticipantsForEmails(
  rawPayload: Record<string, unknown> | null,
  emails: string[]
) {
  const normalizedEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  const participantRecords = getParticipantRecords(rawPayload);

  return normalizedEmails.map((email) => {
    const participant = participantRecords.find(
      (record) => typeof record.email === "string" && normalizeEmail(record.email) === email
    );
    const name =
      typeof participant?.name === "string" && participant.name.trim().length > 0
        ? participant.name.trim()
        : createFallbackPersonName(email);
    const role =
      typeof participant?.role === "string" && participant.role.trim().length > 0
        ? participant.role.trim()
        : null;

    return {
      avatarUrl: null,
      email,
      name,
      role
    } satisfies CoachingParticipant;
  });
}

function getCoachingMeetingTitle(rawPayload: Record<string, unknown> | null) {
  return (
    getNestedTextValue(rawPayload, ["meeting_title"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meeting_title"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meta", "meeting_title"]) ??
    getNestedTextValue(rawPayload, ["transcript", "title"]) ??
    "Reunión sin título"
  );
}

function getCoachingMeetingDatetime(rawPayload: Record<string, unknown> | null, record: AirtableRecord) {
  return (
    getNestedTextValue(rawPayload, ["meeting_datetime"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meeting_datetime"]) ??
    getNestedTextValue(rawPayload, ["metrics", "meta", "meeting_datetime"]) ??
    getNestedTextValue(rawPayload, ["transcript", "start_time"]) ??
    getFirstTextValue(record.fields[COACHING_INPUT_LOG_RECEIVED_AT_FIELD])
  );
}

function getCoachingMetricsScores(
  rawPayload: Record<string, unknown> | null,
  metricsJson: Record<string, unknown> | null
) {
  const scores =
    getNestedRecordValue(metricsJson, ["scores"]) ??
    getNestedRecordValue(rawPayload, ["metrics", "scores"]) ??
    {};
  const normalizedScores: Record<string, number | null> = {};

  for (const [key, value] of Object.entries(scores)) {
    normalizedScores[key] = getNumberOrNull(value);
  }

  return normalizedScores;
}

function createCoachingContextRecord(
  record: AirtableRecord,
  normalizedParticipantEmail: string,
  normalizedActiveSessionEmail?: string
) {
  const participantValue = getFirstTextValue(record.fields[COACHING_INPUT_LOG_PARTICIPANT_FIELD]) ?? "";
  const participantEmails = extractEmailsFromParticipant(participantValue);
  const rawPayload = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD);
  const relevantEmails = normalizedActiveSessionEmail &&
    normalizedActiveSessionEmail !== normalizedParticipantEmail
    ? [normalizedParticipantEmail, normalizedActiveSessionEmail]
    : [normalizedParticipantEmail];

  return {
    id: record.id,
    fields: {
      [COACHING_INPUT_LOG_UNIQUE_KEY_FIELD]:
        getFirstTextValue(record.fields[COACHING_INPUT_LOG_UNIQUE_KEY_FIELD]) ?? record.id,
      meeting_datetime: getCoachingMeetingDatetime(rawPayload, record),
      meeting_title: getCoachingMeetingTitle(rawPayload)
    },
    participantEmails,
    participants: getCoachingParticipantsForEmails(rawPayload, relevantEmails)
  };
}

function getRecordSprintIds(record: AirtableRecord) {
  const linkedSprintIds = getLinkedRecordIds(record.fields["Sprints"]);

  if (linkedSprintIds.length > 0) {
    return linkedSprintIds;
  }

  return getLinkedRecordIds(record.fields["Sprint"]);
}

async function resolveSprintDisplayNames(records: AirtableRecord[]) {
  const sprintIds = [...new Set(records.flatMap((record) => getRecordSprintIds(record)))];

  if (sprintIds.length === 0) {
    return new Map<string, string>();
  }

  const sprintRecords = await fetchRecordsByIds(SPRINT_TABLE_NAME, sprintIds, [SPRINT_NAME_FIELD]);
  const sprintDisplayNameById = new Map<string, string>();

  for (const sprintRecord of sprintRecords) {
    const sprintName = getFirstTextValue(sprintRecord.fields[SPRINT_NAME_FIELD]);

    if (sprintName) {
      sprintDisplayNameById.set(sprintRecord.id, sprintName);
    }
  }

  return sprintDisplayNameById;
}

async function hydrateTrustworthinessRecords(records: AirtableRecord[]) {
  const sprintDisplayNameById = await resolveSprintDisplayNames(records);

  return records.map((record) => ({
    id: record.id,
    fields: {
      ...record.fields,
      "Project / Sprint": getRecordSprintIds(record)
        .map((sprintId) => sprintDisplayNameById.get(sprintId) ?? null)
        .filter((value): value is string => value !== null)
    }
  }));
}

function canEditTrustworthinessRecord(record: AirtableRecord, evaluatorEmail: string) {
  const normalizedEvaluatorEmail = normalizeEmail(evaluatorEmail);
  const rawEvaluatorField = record.fields[TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD];
  const evaluatorEmails = Array.isArray(rawEvaluatorField)
    ? rawEvaluatorField
    : rawEvaluatorField
      ? [rawEvaluatorField]
      : [];

  const isOwnedByEvaluator = evaluatorEmails.some(
    (value) => typeof value === "string" && normalizeEmail(value) === normalizedEvaluatorEmail
  );
  const ratingStatus = record.fields["Rating Status"];
  const normalizedStatus =
    typeof ratingStatus === "string" ? normalizeEmail(ratingStatus) : "";

  if (!isOwnedByEvaluator) {
    throw new Error("No autorizado para editar esta evaluación.");
  }

  if (normalizedStatus !== "pending") {
    throw new Error("Solo se pueden editar evaluaciones con status Pending.");
  }
}

export async function listTrustworthinessRecords(selectedPeriods: string[], evaluatorEmail: string) {
  const tableName = getTrustworthinessTableName();

  const { filterByFormula, selectedPeriods: normalizedSelectedPeriods } =
    buildTrustworthinessFilterFormula(selectedPeriods, evaluatorEmail);
  const records = dedupeAirtableRecords(
    await fetchAirtableRecords(tableName, {
      filterByFormula
    })
  );
  const hydratedRecords = await hydrateTrustworthinessRecords(records);

  return {
    evaluatorEmail,
    selectedPeriods: normalizedSelectedPeriods,
    filtering: {
      applied: true,
      reason: `Filtrado en Airtable por ${TRUSTWORTHINESS_START_FIELD}, ${TRUSTWORTHINESS_END_FIELD} y ${TRUSTWORTHINESS_EVALUATOR_EMAIL_FIELD}.`
    },
    recordCount: records.length,
    records: hydratedRecords,
    tableName
  };
}

export async function updateTrustworthinessRecord(
  recordId: string,
  evaluatorEmail: string,
  fields: TrustworthinessRecordUpdateFields
) {
  const tableName = getTrustworthinessTableName();
  const [existingRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!existingRecord) {
    throw new Error("No se encontró la evaluación solicitada.");
  }

  canEditTrustworthinessRecord(existingRecord, evaluatorEmail);

  await updateAirtableRecord(tableName, recordId, fields);

  const [updatedRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!updatedRecord) {
    throw new Error("No fue posible refrescar la evaluación actualizada.");
  }

  const [hydratedRecord] = await hydrateTrustworthinessRecords([updatedRecord]);

  if (!hydratedRecord) {
    throw new Error("No fue posible hidratar la evaluación actualizada.");
  }

  return hydratedRecord;
}

export async function listCoachingInputLogs(
  selectedPeriods: string[],
  participantEmail: string,
  activeSessionEmail?: string,
  explicitRange?: DateRangeLiteral
) {
  const normalizedParticipantEmail = normalizeEmail(participantEmail);
  const normalizedActiveSessionEmail = activeSessionEmail
    ? normalizeEmail(activeSessionEmail)
    : undefined;
  const connection = getCoachingInputLogConnection();
  const { filterByFormula, selectedPeriods: normalizedSelectedPeriods } =
    buildCoachingInputLogFilterFormula(
      selectedPeriods,
      normalizedParticipantEmail,
      normalizedActiveSessionEmail,
      explicitRange
    );
  const records = dedupeAirtableRecords(
    await fetchAirtableRecords(connection.tableName, {
      apiToken: connection.apiToken,
      baseId: connection.baseId,
      fields: [
        COACHING_INPUT_LOG_UNIQUE_KEY_FIELD,
        COACHING_INPUT_LOG_PARTICIPANT_FIELD,
        COACHING_INPUT_LOG_RECEIVED_AT_FIELD,
        COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD
      ],
      filterByFormula
    })
  )
    .map((record) =>
      createCoachingContextRecord(
        record,
        normalizedParticipantEmail,
        normalizedActiveSessionEmail
      )
    )
    .filter((record) => record.participantEmails.includes(normalizedParticipantEmail))
    .sort((left, right) => {
      const leftReceivedAt = String(left.fields.meeting_datetime ?? "");
      const rightReceivedAt = String(right.fields.meeting_datetime ?? "");

      return rightReceivedAt.localeCompare(leftReceivedAt);
    });

  return {
    filtering: {
      applied: true,
      reason: normalizedActiveSessionEmail &&
        normalizedActiveSessionEmail !== normalizedParticipantEmail
        ? `Filtrado en Airtable por ${COACHING_INPUT_LOG_RECEIVED_AT_FIELD} y coincidencia conjunta de ${normalizedParticipantEmail} + ${normalizedActiveSessionEmail} dentro de ${COACHING_INPUT_LOG_PARTICIPANT_FIELD}.`
        : `Filtrado en Airtable por ${COACHING_INPUT_LOG_RECEIVED_AT_FIELD} y coincidencia de email dentro de ${COACHING_INPUT_LOG_PARTICIPANT_FIELD}.`
    },
    activeSessionEmail: normalizedActiveSessionEmail ?? null,
    participantEmail: normalizedParticipantEmail,
    recordCount: records.length,
    records,
    selectedPeriods: normalizedSelectedPeriods,
    tableName: connection.tableName
  };
}

async function fetchCoachingInputLogRecordsForContext(
  participantEmail: string,
  activeSessionEmail: string | undefined,
  explicitRange: DateRangeLiteral,
  recordIds?: string[]
) {
  const normalizedParticipantEmail = normalizeEmail(participantEmail);
  const normalizedActiveSessionEmail = activeSessionEmail
    ? normalizeEmail(activeSessionEmail)
    : undefined;
  const connection = getCoachingInputLogConnection();
  const { filterByFormula } = buildCoachingInputLogFilterFormula(
    [],
    normalizedParticipantEmail,
    normalizedActiveSessionEmail,
    explicitRange
  );
  const recordFilter = recordIds && recordIds.length > 0
    ? buildRecordIdsFilterFormula(recordIds)
    : "";
  const combinedFilter = recordFilter
    ? `AND(${recordFilter},${filterByFormula})`
    : filterByFormula;

  return dedupeAirtableRecords(
    await fetchAirtableRecords(connection.tableName, {
      apiToken: connection.apiToken,
      baseId: connection.baseId,
      fields: [
        COACHING_INPUT_LOG_UNIQUE_KEY_FIELD,
        COACHING_INPUT_LOG_PARTICIPANT_FIELD,
        COACHING_INPUT_LOG_RECEIVED_AT_FIELD,
        COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD,
        COACHING_INPUT_LOG_METRICS_JSON_FIELD
      ],
      filterByFormula: combinedFilter
    })
  );
}

function createTranscriptSpeakerBlocks(rawPayload: Record<string, unknown> | null) {
  return getNestedArrayValue(rawPayload, ["transcript", "transcript", "speaker_blocks"])
    .filter(isPlainRecord)
    .map((block, index) => {
      const speaker = isPlainRecord(block.speaker) ? block.speaker : {};
      const speakerName =
        typeof speaker.name === "string" && speaker.name.trim().length > 0
          ? speaker.name.trim()
          : "UNKNOWN_SPEAKER";

      return {
        id: `${index}-${String(block.start_time ?? "")}`,
        endTime: typeof block.end_time === "number" ? block.end_time : null,
        speaker: speakerName,
        startTime: typeof block.start_time === "number" ? block.start_time : null,
        words: typeof block.words === "string" ? block.words.trim() : ""
      };
    })
    .filter((block) => block.words.length > 0);
}

function createCoachingEvidenceMeeting(record: AirtableRecord): CoachingEvidenceMeeting {
  const rawPayload = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD);
  const metricsJson = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_METRICS_JSON_FIELD);
  const actionItems = [
    ...getTextItems(getNestedValue(rawPayload, ["action_items"])),
    ...getTextItems(getNestedValue(rawPayload, ["transcript", "action_items"]))
  ];
  const topics = [
    ...getTextItems(getNestedValue(rawPayload, ["topics"])),
    ...getTextItems(getNestedValue(rawPayload, ["transcript", "topics"]))
  ];

  return {
    actionItems,
    coachingAnalysis:
      getNestedTextValue(rawPayload, ["coaching_analysis"]) ??
      getNestedTextValue(rawPayload, ["report"]),
    coachingSummary:
      getNestedTextValue(rawPayload, ["coaching_summary"]) ??
      getNestedTextValue(rawPayload, ["summary"]),
    metricsScores: getCoachingMetricsScores(rawPayload, metricsJson),
    rawRecordId: record.id,
    title: getCoachingMeetingTitle(rawPayload),
    topics,
    transcriptSummary: getNestedTextValue(rawPayload, ["transcript", "summary"]),
    when: getCoachingMeetingDatetime(rawPayload, record)
  };
}

function getTrustworthinessMeaning(score: number) {
  if (score >= 0.8) {
    return "Excellence in Trust";
  }

  if (score >= 0.6) {
    return "High Trust";
  }

  if (score >= 0.4) {
    return "Moderate Trust";
  }

  if (score >= 0.2) {
    return "Basic Trust";
  }

  return "Initial Trust Development";
}

const TALENT_PILLAR_MEANINGS: Record<PillarKey, string[]> = {
  credibility: [
    "Shows a lack of knowledge and competence; contributions are erroneous.",
    "Has deficiencies in the necessary knowledge, affecting performance.",
    "Presents shortcomings in knowledge, generating doubts about capability.",
    "Possesses some knowledge, but competence is limited and requires supervision.",
    "Has basic knowledge, but is inconsistent in its application.",
    "Possesses acceptable competence, though does not fully master the role.",
    "Demonstrates a good level of knowledge and competence, being reliable in most situations.",
    "Has a high level of competence, is reliable, and consistently adds value.",
    "Is very competent, with respected contributions and rarely questioned judgment.",
    "Is exceptional in knowledge and competence, a reference within the team whose decisions are valued."
  ],
  groupThinking: [
    "Does not collaborate at all and acts solely in self-interest.",
    "Rarely collaborates, prioritizing personal interests.",
    "Shows little willingness to collaborate and acts in an individualistic manner.",
    "Sometimes collaborates, but prioritizes personal interests over the team's.",
    "Has a moderately collaborative attitude, although does not always prioritize the common good.",
    "Generally collaborates, though in some situations individual interests are evident.",
    "Actively collaborates in most decisions and tends to prioritize team interests.",
    "Is collaborative and prioritizes the group's well-being over personal interests.",
    "Always collaborates effectively and advocates for group thinking, prioritizing collective well-being.",
    "Is an exemplary collaborator, consistently prioritizing team interests and working for the common good."
  ],
  intimacy: [
    "Does not demonstrate the ability to understand or connect with the client.",
    "Minimum understanding and superficial connection with the client.",
    "Basic understanding and limited emotional connection.",
    "Moderate understanding and occasional empathetic connection.",
    "Clear understanding and regular empathetic, trustworthy relationship.",
    "Solid understanding and frequent close, trusting relationship.",
    "Good understanding and consistent close, empathetic connection.",
    "Deep understanding and frequent empathetic, trustworthy relationship.",
    "Exceptional understanding and deep, empathetic trust-based relationships.",
    "Outstanding understanding and authentic, lasting emotional connection."
  ],
  reliability: [
    "Never fulfills commitments, affecting reliability.",
    "Rarely keeps promises; frequently misses deadlines.",
    "Fulfills some commitments, but is unreliable in most cases.",
    "Occasionally meets deadlines, but lack of consistency raises concerns.",
    "Moderately meets deadlines, although often delays or fails to fulfill completely.",
    "Generally meets commitments, although there are times when he/she does not.",
    "Is reliable and meets most established deadlines.",
    "Consistently fulfills commitments and is considered reliable by the team.",
    "Always meets deadlines and is considered highly reliable.",
    "Not only fulfills commitments but exceeds expectations, being an example of reliability."
  ]
};

function getPillarMeaning(pillar: PillarKey, points: number) {
  return TALENT_PILLAR_MEANINGS[pillar][Math.max(1, Math.min(10, points)) - 1];
}

function calculateTrustworthinessScore(points: Record<PillarKey, number>) {
  return (
    points.credibility +
    points.reliability +
    points.intimacy * 2 +
    points.groupThinking * 2
  ) / 60;
}

function hasEvidenceText(meeting: CoachingEvidenceMeeting) {
  return Boolean(
    meeting.coachingAnalysis ||
    meeting.coachingSummary ||
    meeting.transcriptSummary ||
    meeting.actionItems.length > 0 ||
    meeting.topics.length > 0 ||
    Object.values(meeting.metricsScores).some((value) => typeof value === "number")
  );
}

function createSuggestionPrompt(meetings: CoachingEvidenceMeeting[]) {
  return [
    "Generate JSON only. You are assisting a human evaluator with Monthly Trustworthiness for a talent.",
    "Use only the supplied meeting evidence. Do not invent evidence, events, names, or scores.",
    "The four TW pillars are Reliability, Intimacy, Group Thinking, and Credibility.",
    "Formula context: TW = (Credibility + Reliability + 2*Intimacy + 2*Group Thinking) / 60.",
    "Reliability: commitments, deadlines, consistency, decision documentation, risk handling.",
    "Intimacy: empathy, understanding needs, trustful relationship, stakeholder communication.",
    "Group Thinking: collaboration, team alignment, prioritizing collective interest.",
    "Credibility: knowledge, competence, judgment, clear ownership, confidence generated.",
    "Return integer points 1-10 per pillar. Include concrete evidence by meeting and source type.",
    "Separate positive signals, negative signals/risks, uncertainty, and metric inputs.",
    `Evidence package:\n${JSON.stringify(meetings, null, 2)}`
  ].join("\n\n");
}

const TW_SUGGESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["trustworthiness", "pillars"],
  properties: {
    trustworthiness: {
      type: "object",
      additionalProperties: false,
      required: ["confidence", "explanation"],
      properties: {
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        explanation: { type: "string" }
      }
    },
    pillars: {
      type: "object",
      additionalProperties: false,
      required: ["reliability", "intimacy", "groupThinking", "credibility"],
      properties: {
        reliability: { $ref: "#/$defs/pillarSuggestion" },
        intimacy: { $ref: "#/$defs/pillarSuggestion" },
        groupThinking: { $ref: "#/$defs/pillarSuggestion" },
        credibility: { $ref: "#/$defs/pillarSuggestion" }
      }
    }
  },
  $defs: {
    pillarSuggestion: {
      type: "object",
      additionalProperties: false,
      required: ["points", "confidence", "shortReason", "decisionDetail"],
      properties: {
        points: { type: "integer", minimum: 1, maximum: 10 },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        shortReason: { type: "string" },
        decisionDetail: {
          type: "object",
          additionalProperties: false,
          required: ["conclusion", "positiveSignals", "negativeSignals", "uncertainty", "metricInputs"],
          properties: {
            conclusion: { type: "string" },
            positiveSignals: {
              type: "array",
              items: { $ref: "#/$defs/evidenceSignal" }
            },
            negativeSignals: {
              type: "array",
              items: { $ref: "#/$defs/evidenceSignal" }
            },
            uncertainty: {
              type: "array",
              items: { type: "string" }
            },
            metricInputs: {
              type: "array",
              items: { $ref: "#/$defs/metricInput" }
            }
          }
        }
      }
    },
    evidenceSignal: {
      type: "object",
      additionalProperties: false,
      required: [
        "meetingId",
        "meetingTitle",
        "meetingDatetime",
        "sourceType",
        "evidenceText",
        "interpretation",
        "impact"
      ],
      properties: {
        meetingId: { type: "string" },
        meetingTitle: { type: "string" },
        meetingDatetime: { type: "string" },
        sourceType: {
          type: "string",
          enum: [
            "coaching_summary",
            "coaching_analysis",
            "transcript_summary",
            "topic",
            "action_item",
            "metric_score"
          ]
        },
        evidenceText: { type: "string" },
        interpretation: { type: "string" },
        impact: {
          type: "string",
          enum: ["raises_score", "lowers_score", "supports_current_score"]
        }
      }
    },
    metricInput: {
      type: "object",
      additionalProperties: false,
      required: ["metricName", "value", "mappedTo", "interpretation"],
      properties: {
        metricName: { type: "string" },
        value: {
          anyOf: [{ type: "number" }, { type: "null" }]
        },
        mappedTo: {
          type: "string",
          enum: ["reliability", "intimacy", "groupThinking", "credibility"]
        },
        interpretation: { type: "string" }
      }
    }
  }
};

const FEEDBACK_SUGGESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["feedback"],
  properties: {
    feedback: {
      type: "string"
    }
  }
};

function extractOpenAIOutputText(payload: unknown) {
  if (isPlainRecord(payload) && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!isPlainRecord(payload) || !Array.isArray(payload.output)) {
    return null;
  }

  for (const item of payload.output) {
    if (!isPlainRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (isPlainRecord(content) && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function normalizeConfidence(value: unknown, meetingsUsed: number): Confidence {
  const confidence =
    value === "high" || value === "medium" || value === "low" ? value : "low";

  if (meetingsUsed <= 1 && confidence === "high") {
    return "medium";
  }

  return confidence;
}

function validatePillarSuggestion(value: unknown, pillar: PillarKey, meetingsUsed: number) {
  if (!isPlainRecord(value)) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  const points = getNumberOrNull(value.points);

  if (typeof points !== "number" || !Number.isInteger(points) || points < 1 || points > 10) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  const normalizedPoints = Number(points);
  const decisionDetail = isPlainRecord(value.decisionDetail) ? value.decisionDetail : {};

  return {
    points: normalizedPoints,
    confidence: normalizeConfidence(value.confidence, meetingsUsed),
    meaning: getPillarMeaning(pillar, normalizedPoints),
    shortReason: typeof value.shortReason === "string" ? value.shortReason : "",
    decisionDetail: {
      conclusion:
        typeof decisionDetail.conclusion === "string" ? decisionDetail.conclusion : "",
      positiveSignals: Array.isArray(decisionDetail.positiveSignals)
        ? decisionDetail.positiveSignals
        : [],
      negativeSignals: Array.isArray(decisionDetail.negativeSignals)
        ? decisionDetail.negativeSignals
        : [],
      uncertainty: Array.isArray(decisionDetail.uncertainty)
        ? decisionDetail.uncertainty.filter((item): item is string => typeof item === "string")
        : [],
      metricInputs: Array.isArray(decisionDetail.metricInputs)
        ? decisionDetail.metricInputs
        : []
    }
  };
}

async function callOpenAIForSuggestion(meetings: CoachingEvidenceMeeting[]) {
  const openAIConfig = getOpenAIConfig();

  if (!openAIConfig.apiKey || !openAIConfig.model) {
    throw new Error("No hay modelo configurado para generar sugerencias.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: createSuggestionPrompt(meetings),
      model: openAIConfig.model,
      text: {
        format: {
          type: "json_schema",
          name: "tw_suggestion",
          strict: true,
          schema: TW_SUGGESTION_SCHEMA
        }
      }
    }),
    headers: {
      Authorization: `Bearer ${openAIConfig.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    let message = `OpenAI request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      message = `OpenAI request failed with status ${response.status}`;
    }

    throw new Error(message);
  }

  const payload = await response.json();
  const outputText = extractOpenAIOutputText(payload);

  if (!outputText) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  try {
    return JSON.parse(outputText) as unknown;
  } catch {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }
}

function createFeedbackPrompt(input: FeedbackGenerationInput) {
  const pillarLines = (Object.entries(input.pillars) as Array<
    [PillarKey, FeedbackGenerationInput["pillars"][PillarKey]]
  >)
    .map(([pillarKey, pillar]) => {
      const aiContext =
        pillar.aiSuggestion !== undefined && pillar.aiSuggestion !== null
          ? JSON.stringify(pillar.aiSuggestion, null, 2)
          : "No AI context available for this pillar.";

      return [
        `${pillarKey.toUpperCase()}`,
        `points: ${pillar.points}/10`,
        `meaning: ${pillar.meaning}`,
        `ai_context:`,
        aiContext
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are writing a final performance feedback narrative for a trustworthiness evaluation.",
    "Write in professional English.",
    "Return one concise final narrative in 1 or 2 short paragraphs.",
    "Do not use bullets, headers, markdown, JSON, or labels.",
    "Do not mention AI, confidence scores, or that a model generated the text.",
    "Use the pillar points and meanings as the source of truth.",
    "If AI context is available for a pillar, use it as supporting evidence and nuance.",
    "Balance strengths, risks, and concrete improvement areas.",
    "If evidence is limited, say so briefly in natural language without sounding robotic.",
    "",
    `Evaluated person: ${input.evaluatedName}`,
    `Role: ${input.roleLabel && input.roleLabel.trim().length > 0 ? input.roleLabel : "Unknown"}`,
    `Project context: ${
      input.projectContext && input.projectContext.trim().length > 0
        ? input.projectContext
        : "No project context available"
    }`,
    `Existing feedback draft: ${
      input.existingFeedback && input.existingFeedback.trim().length > 0
        ? input.existingFeedback
        : "None"
    }`,
    "",
    "Pillar data:",
    pillarLines,
    "",
    'Return JSON with this shape only: {"feedback":"..."}'
  ].join("\n");
}

async function callOpenAIForFeedback(input: FeedbackGenerationInput) {
  const openAIConfig = getOpenAIConfig();

  if (!openAIConfig.apiKey || !openAIConfig.model) {
    throw new Error("No hay modelo configurado para generar feedback.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: createFeedbackPrompt(input),
      model: openAIConfig.model,
      text: {
        format: {
          type: "json_schema",
          name: "tw_feedback",
          strict: true,
          schema: FEEDBACK_SUGGESTION_SCHEMA
        }
      }
    }),
    headers: {
      Authorization: `Bearer ${openAIConfig.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    let message = `OpenAI request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      message = `OpenAI request failed with status ${response.status}`;
    }

    throw new Error(message);
  }

  const payload = await response.json();
  const outputText = extractOpenAIOutputText(payload);

  if (!outputText) {
    throw new Error("No fue posible generar el feedback con IA.");
  }

  try {
    const parsedOutput = JSON.parse(outputText) as { feedback?: unknown };

    if (typeof parsedOutput.feedback !== "string" || parsedOutput.feedback.trim().length === 0) {
      throw new Error("No fue posible generar el feedback con IA.");
    }

    return parsedOutput.feedback.trim();
  } catch {
    throw new Error("No fue posible generar el feedback con IA.");
  }
}

export async function getCoachingInputLogTranscript(
  recordId: string,
  participantEmail: string,
  activeSessionEmail: string | undefined,
  explicitRange: DateRangeLiteral
) {
  const [record] = await fetchCoachingInputLogRecordsForContext(
    participantEmail,
    activeSessionEmail,
    explicitRange,
    [recordId]
  );

  if (!record) {
    throw new Error("No se encontró una reunión válida para este contexto.");
  }

  const rawPayload = parseJsonRecordFromFields(record, COACHING_INPUT_LOG_RAW_PAYLOAD_FIELD);
  const speakerBlocks = createTranscriptSpeakerBlocks(rawPayload);

  return {
    actionItems: [
      ...getTextItems(getNestedValue(rawPayload, ["action_items"])),
      ...getTextItems(getNestedValue(rawPayload, ["transcript", "action_items"]))
    ],
    chapterSummaries: getNestedArrayValue(rawPayload, ["transcript", "chapter_summaries"])
      .filter(isPlainRecord)
      .map((chapter) => ({
        description:
          typeof chapter.description === "string" ? chapter.description.trim() : "",
        title: typeof chapter.title === "string" ? chapter.title.trim() : "Capítulo"
      })),
    meetingDatetime: getCoachingMeetingDatetime(rawPayload, record),
    meetingTitle: getCoachingMeetingTitle(rawPayload),
    speakerBlocks,
    summary:
      getNestedTextValue(rawPayload, ["transcript", "summary"]) ??
      getNestedTextValue(rawPayload, ["summary"]),
    topics: [
      ...getTextItems(getNestedValue(rawPayload, ["topics"])),
      ...getTextItems(getNestedValue(rawPayload, ["transcript", "topics"]))
    ],
    uniqueKey: getFirstTextValue(record.fields[COACHING_INPUT_LOG_UNIQUE_KEY_FIELD]) ?? record.id
  };
}

export async function createTrustworthinessSuggestion(
  recordId: string,
  participantEmail: string,
  activeSessionEmail: string | undefined,
  explicitRange: DateRangeLiteral,
  emitStage?: TrustworthinessSuggestionStageEmitter
) {
  await emitStage?.("fetching_airtable_meetings");
  const records = await fetchCoachingInputLogRecordsForContext(
    participantEmail,
    activeSessionEmail,
    explicitRange
  );
  await emitStage?.("building_meeting_evidence");
  const meetings = records.map(createCoachingEvidenceMeeting).filter(hasEvidenceText);

  if (records.length === 0) {
    throw new Error("No hay reuniones suficientes para sugerir TW.");
  }

  if (meetings.length === 0) {
    throw new Error("Hay reuniones, pero no hay evidencia textual suficiente.");
  }

  await emitStage?.("sending_context_to_ai");
  const suggestionPayload = await callOpenAIForSuggestion(meetings);

  await emitStage?.("validating_structured_response");
  if (!isPlainRecord(suggestionPayload) || !isPlainRecord(suggestionPayload.pillars)) {
    throw new Error("No fue posible generar una sugerencia estructurada. Intenta regenerar.");
  }

  const pillars = {
    credibility: validatePillarSuggestion(
      suggestionPayload.pillars.credibility,
      "credibility",
      meetings.length
    ),
    groupThinking: validatePillarSuggestion(
      suggestionPayload.pillars.groupThinking,
      "groupThinking",
      meetings.length
    ),
    intimacy: validatePillarSuggestion(
      suggestionPayload.pillars.intimacy,
      "intimacy",
      meetings.length
    ),
    reliability: validatePillarSuggestion(
      suggestionPayload.pillars.reliability,
      "reliability",
      meetings.length
    )
  };
  await emitStage?.("calculating_tw_score");
  const score = calculateTrustworthinessScore({
    credibility: pillars.credibility.points,
    groupThinking: pillars.groupThinking.points,
    intimacy: pillars.intimacy.points,
    reliability: pillars.reliability.points
  });
  const trustworthiness = isPlainRecord(suggestionPayload.trustworthiness)
    ? suggestionPayload.trustworthiness
    : {};

  return {
    generatedAt: new Date().toISOString(),
    meetingsUsed: meetings.length,
    pillars,
    recordId,
    trustworthiness: {
      confidence: normalizeConfidence(trustworthiness.confidence, meetings.length),
      explanation:
        typeof trustworthiness.explanation === "string"
          ? trustworthiness.explanation
          : "Sugerencia generada a partir de evidencia de reuniones.",
      meaning: getTrustworthinessMeaning(score),
      percentage: `${Math.round(score * 100)}%`,
      score
    }
  };
}

export async function createTrustworthinessFeedback(
  recordId: string,
  evaluatorEmail: string,
  input: FeedbackGenerationInput
) {
  const tableName = getTrustworthinessTableName();
  const [existingRecord] = await fetchRecordsByIds(tableName, [recordId], []);

  if (!existingRecord) {
    throw new Error("No se encontró la evaluación solicitada.");
  }

  canEditTrustworthinessRecord(existingRecord, evaluatorEmail);

  for (const [pillarKey, pillar] of Object.entries(input.pillars) as Array<
    [PillarKey, FeedbackGenerationInput["pillars"][PillarKey]]
  >) {
    if (!Number.isInteger(pillar.points) || pillar.points < 1 || pillar.points > 10) {
      throw new Error(`El pilar ${pillarKey} no tiene un puntaje válido para generar feedback.`);
    }

    if (typeof pillar.meaning !== "string" || pillar.meaning.trim().length === 0) {
      throw new Error(`El pilar ${pillarKey} no tiene meaning suficiente para generar feedback.`);
    }
  }

  return callOpenAIForFeedback(input);
}
