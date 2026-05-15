import type { AirtableRecord } from "../airtable/types.js";
import {
  getBooleanField,
  getFieldValue,
  getFirstTextValue,
  getLinkedRecordIds,
  getNumberField,
  getPercentField,
  getTextField
} from "../airtable/field-utils.js";
import {
  calculateAgileKeyResultProgress,
  normalizePercentLike,
  normalizeScoreObjetives
} from "./progress-utils.js";
import {
  getCollaboratorEmail,
  getCollaboratorName,
  getOptionalObjectiveStatus
} from "./airtable-utils.js";

function formatCollaboratorLookup(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  const labels = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (typeof item === "object" && item !== null) {
        const collaborator = item as { email?: string; name?: string };
        return collaborator.name?.trim() || collaborator.email?.trim() || "";
      }

      return "";
    })
    .filter((item) => item.length > 0);

  return [...new Set(labels)].join(", ");
}

function getTextValues(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export function mapAgileProject(record: AirtableRecord) {
  const collaborator = record.fields["Collaborator"] ?? record.fields["collaborator"];
  const rawName =
    record.fields["Clientes"] ??
    record.fields["clients"] ??
    record.fields["Project"] ??
    record.fields["Project Name"] ??
    record.fields["client_name"] ??
    record.fields["Name"];
  const rawStatus = record.fields["Estatus"] ?? record.fields["status"];
  const name = typeof rawName === "string" && rawName.trim().length > 0 ? rawName.trim() : record.id;

  return {
    id: record.id,
    sourceRecordId:
      getFirstTextValue(getFieldValue(record.fields, "source_record_id")) ??
      getFirstTextValue(getFieldValue(record.fields, "recordID")) ??
      getFirstTextValue(getFieldValue(record.fields, "recordid")) ??
      "",
    name,
    collaborator: {
      email: getCollaboratorEmail(collaborator),
      name: getCollaboratorName(collaborator)
    },
    status: typeof rawStatus === "string" ? rawStatus.trim() : null
  };
}

export function mapAgileKeyResult(record: AirtableRecord) {
  const fields = record.fields;
  const currentValue = getNumberField(fields, "Current Value");
  const initialValue = getNumberField(fields, "Initial Value");
  const title = getTextField(fields, "Key Result") || getTextField(fields, "key_result");
  const displayName = getTextField(fields, "Name") || title || record.id;
  const keyProjectIds = getLinkedRecordIds(
    getFieldValue(fields, "key_projects") ??
      getFieldValue(fields, "Key Projects") ??
      getFieldValue(fields, "key_project") ??
      getFieldValue(fields, "Key Project")
  );
  const keyProjectLabels = getTextValues(getFieldValue(fields, "Epics"));
  const targetValue = getNumberField(fields, "Target Value");
  const storedProgress = getPercentField(fields, "Progress") || getPercentField(fields, "Progress Number");
  const progress =
    calculateAgileKeyResultProgress({
      currentValue,
      initialValue,
      targetValue
    }) ?? storedProgress;

  return {
    id: record.id,
    code: getTextField(fields, "#"),
    currentValue,
    displayName,
    explanation: getTextField(fields, "Explanation"),
    initialValue,
    keyProjectIds,
    keyProjectLabels,
    metric: getTextField(fields, "Metric"),
    progress,
    sourceRecordId:
      getFirstTextValue(getFieldValue(fields, "record_id")) ??
      getFirstTextValue(getFieldValue(fields, "Record Id")) ??
      getFirstTextValue(getFieldValue(fields, "recordId")) ??
      "",
    status: getTextField(fields, "Status"),
    targetDate: getTextField(fields, "Target Date"),
    targetValue,
    title
  };
}

export function mapAgileKeyResultHistoryPoint(record: AirtableRecord) {
  const fields = record.fields;
  const currentValue = getNumberField(fields, "Current Value");
  const initialValue = getNumberField(fields, "Initial Value");
  const targetValue = getNumberField(fields, "Target Value");
  const storedProgress = getPercentField(fields, "Progress") || getPercentField(fields, "Progress Number");
  const progress =
    calculateAgileKeyResultProgress({
      currentValue,
      initialValue,
      targetValue
    }) ?? storedProgress;

  return {
    created: record.createdTime ?? getTextField(fields, "Created"),
    id: record.id,
    currentValue,
    explanation: getTextField(fields, "Explanation"),
    initialValue,
    justificationScoreKeyResult: getTextField(fields, "Justification Score Key Result"),
    keyResultIds: getLinkedRecordIds(
      getFieldValue(fields, "Key Result") ??
        getFieldValue(fields, "key_result") ??
        getFieldValue(fields, "key")
    ),
    metric: getTextField(fields, "Metric"),
    name: getTextField(fields, "Name"),
    no: getNumberField(fields, "No."),
    objectiveIds: getLinkedRecordIds(
      getFieldValue(fields, "Objetive") ??
        getFieldValue(fields, "Objective") ??
        getFieldValue(fields, "objective")
    ),
    progress,
    progressNumber: getNumberField(fields, "Progress Number"),
    projectIds: getLinkedRecordIds(getFieldValue(fields, "Project") ?? getFieldValue(fields, "project")),
    quarter: getTextField(fields, "Quarter"),
    scoreKeyResult: getNumberField(fields, "Score Key Result") ?? getNumberField(fields, "score_key"),
    sourceId: getTextField(fields, "source_id") || getTextField(fields, "sourceId"),
    status: getTextField(fields, "Status"),
    targetDate: getTextField(fields, "Target Date"),
    targetValue,
    writtenExplanationScore: getTextField(fields, "Written Explanation Score")
  };
}

export function compareAgileKeyResultHistoryPoints(
  left: ReturnType<typeof mapAgileKeyResultHistoryPoint>,
  right: ReturnType<typeof mapAgileKeyResultHistoryPoint>
) {
  if (left.no !== null && right.no !== null) {
    return left.no - right.no;
  }

  if (left.no !== null) {
    return -1;
  }

  if (right.no !== null) {
    return 1;
  }

  const leftDate = Date.parse(left.targetDate);
  const rightDate = Date.parse(right.targetDate);

  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    return leftDate - rightDate;
  }

  if (Number.isFinite(leftDate)) {
    return -1;
  }

  if (Number.isFinite(rightDate)) {
    return 1;
  }

  return 0;
}

export function mapAgileObjective(record: AirtableRecord) {
  const fields = record.fields;
  const name = getTextField(fields, "Name");
  const objective = getTextField(fields, "Objective");
  const description = getTextField(fields, "Objetive Description");
  const explanation = getTextField(fields, "Explanation");
  const projectIds = getLinkedRecordIds(getFieldValue(fields, "Project"));
  const keyResultIds = getLinkedRecordIds(getFieldValue(fields, "Key Results"));
  const score = normalizeScoreObjetives(getNumberField(fields, "Score Objetives"));

  return {
    id: record.id,
    aiSuggestedKeyResults: getTextField(fields, "AI suggested key results"),
    createdAt: record.createdTime ?? getTextField(fields, "Created"),
    description,
    explanation,
    keyResultIds,
    keyResults: [],
    metric: getTextField(fields, "Metric"),
    name: name || objective || record.id,
    no: getNumberField(fields, "No."),
    objective,
    poUser: getFieldValue(fields, "po_user") ?? null,
    poUserLabel: formatCollaboratorLookup(getFieldValue(fields, "po_user")),
    priority: getTextField(fields, "Priority"),
    projectIds,
    quarter: getTextField(fields, "Quarter"),
    recordId:
      getFirstTextValue(getFieldValue(fields, "record_id")) ??
      getFirstTextValue(getFieldValue(fields, "Record Id")) ??
      getFirstTextValue(getFieldValue(fields, "recordId")) ??
      "",
    score,
    status: getOptionalObjectiveStatus(getFieldValue(fields, "Status")),
    targetDate: getTextField(fields, "Target Date"),
    type: getTextField(fields, "Type")
  };
}

export function mapAgileKeyProject(record: AirtableRecord) {
  const fields = record.fields;
  const qualityScore = normalizePercentLike(getNumberField(fields, "Quality Score"));
  const finalScore = normalizePercentLike(getNumberField(fields, "finalScore"));
  const keyResultIds = getLinkedRecordIds(
    getFieldValue(fields, "key_result") ??
      getFieldValue(fields, "Key Result") ??
      getFieldValue(fields, "key_results") ??
      getFieldValue(fields, "Key Results")
  );
  const keyResultLabels = getTextValues(getFieldValue(fields, "key"));
  const projectIds = getLinkedRecordIds(getFieldValue(fields, "Projects"));

  return {
    id: record.id,
    aiStoriesAssist: getTextField(fields, "AI Stories Assist"),
    clarity: getNumberField(fields, "Clarity"),
    createdAt: getTextField(fields, "Create"),
    dontShowInSingularStories: getBooleanField(fields, "Don't Show In Singular Stories"),
    epicUpdatedAt: getTextField(fields, "Epic Updated"),
    finalScore,
    keyProjectId: getTextField(fields, "ID"),
    keyResultIds,
    keyResultLabels,
    justification: getTextField(fields, "Justification"),
    name: getTextField(fields, "Epic Name"),
    projectIds,
    qualityScore,
    sourceRecordId:
      getFirstTextValue(getFieldValue(fields, "record_id")) ??
      getFirstTextValue(getFieldValue(fields, "source_record_id")) ??
      getFirstTextValue(getFieldValue(fields, "Record Id")) ??
      getFirstTextValue(getFieldValue(fields, "recordId")) ??
      "",
    strategicFocus: getNumberField(fields, "Strategic Focus"),
    story: getTextField(fields, "Epic Story"),
    status: getTextField(fields, "Status"),
    totalStories: getNumberField(fields, "Total Stories"),
    valueOrientation: getNumberField(fields, "Value Orientation")
  };
}
