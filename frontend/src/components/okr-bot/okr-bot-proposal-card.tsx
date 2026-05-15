import type { OkrBotChatResponse } from "@/lib/okrs";

type OkrBotProposalCardProps = {
  disabled: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  onEdit: () => void;
  proposal: NonNullable<OkrBotChatResponse["proposal"]>;
  projectSourceRecordId?: string;
};

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} items` : "None";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const KEY_PROJECT_CREATE_FIELDS = [
  "name",
  "projectId",
  "epicStory",
  "keyResultIds",
  "clarity",
  "strategicFocus",
  "valueOrientation",
  "finalScore",
  "justification"
];

const KEY_PROJECT_EDIT_FIELDS = [
  "name",
  "epicStory",
  "keyResultIds",
  "clarity",
  "strategicFocus",
  "valueOrientation",
  "finalScore",
  "justification"
];

const KEY_PROJECT_FIELD_TOOLTIPS: Record<string, string> = {
  clarity: "Numeric clarity score sent to Singular Agile.",
  dontShowInSingularStories: "Controls whether this Epic is hidden from Singular Stories.",
  epicStory: "Description or scope for the Key Project proposal.",
  finalScore: "Final score value sent to Singular Agile.",
  justification: "Reasoning behind the Key Project proposal.",
  keyResultIds: "Linked Singular Agile Key Result record IDs. Empty means no linked KRs yet.",
  name: "Epic Name in Singular Agile.",
  projectId: "Source project record ID in Singular Agile.",
  strategicFocus: "Numeric strategic focus score sent to Singular Agile.",
  valueOrientation: "Numeric value orientation score sent to Singular Agile."
};

const KEY_PROJECT_NUMBER_FIELDS = new Set(["clarity", "strategicFocus", "valueOrientation", "finalScore"]);

const KEY_RESULT_FIELDS = [
  "keyResult",
  "metric",
  "explanation",
  "status",
  "initialValue",
  "currentValue",
  "targetValue",
  "targetDate"
];

function getProposalFields(proposal: NonNullable<OkrBotChatResponse["proposal"]>, projectSourceRecordId?: string) {
  const { draft } = proposal;

  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return [];
  }

  const draftRecord = draft as Record<string, unknown>;

  if (proposal.targetType === "key_project") {
    const fields = proposal.operation === "edit" ? KEY_PROJECT_EDIT_FIELDS : KEY_PROJECT_CREATE_FIELDS;

    return fields.map((key) => ({
      label: key === "projectId" ? "Source ID" : formatLabel(key),
      tooltip: KEY_PROJECT_FIELD_TOOLTIPS[key],
      value:
        key === "projectId" && projectSourceRecordId
          ? projectSourceRecordId
          : KEY_PROJECT_NUMBER_FIELDS.has(key) && (draftRecord[key] === undefined || draftRecord[key] === null)
            ? "0"
            : formatValue(draftRecord[key])
    }));
  }

  if (proposal.targetType === "key_result") {
    return KEY_RESULT_FIELDS.map((key) => ({
      label: formatLabel(key),
      tooltip: undefined,
      value: formatValue(draftRecord[key])
    }));
  }

  return Object.entries(draftRecord)
    .filter(([key, value]) => key !== "status" && !Array.isArray(value) && typeof value !== "object")
    .slice(0, 8)
    .map(([key, value]) => ({
      label: formatLabel(key),
      tooltip: undefined,
      value: formatValue(value)
    }));
}

export function OkrBotProposalCard({
  disabled,
  onConfirm,
  onDiscard,
  onEdit,
  proposal,
  projectSourceRecordId
}: OkrBotProposalCardProps) {
  const fields = getProposalFields(proposal, projectSourceRecordId);
  const isCreate = proposal.operation === "create";

  return (
    <section className="okr-bot-proposal-card" aria-label="OKR Bot proposal">
      <header>
        <div>
          <span>{isCreate ? "Create proposal" : "Edit proposal"}</span>
          <h3>{formatLabel(proposal.targetType)}</h3>
        </div>
        <strong>{proposal.operation}</strong>
      </header>

      <div className="okr-bot-proposal-fields">
        {fields.map((field) => (
          <div
            className={field.tooltip ? "has-tooltip" : undefined}
            data-tooltip={field.tooltip}
            key={field.label}
            tabIndex={field.tooltip ? 0 : undefined}
            title={field.tooltip}
          >
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </div>
        ))}
      </div>

      <div className="okr-bot-confirm-actions">
        <button disabled={disabled} onClick={onDiscard} type="button">
          Discard
        </button>
        <button disabled={disabled} onClick={onEdit} type="button">
          Edit proposal
        </button>
        <button className="is-primary" disabled={disabled} onClick={onConfirm} type="button">
          Confirm
        </button>
      </div>
    </section>
  );
}
