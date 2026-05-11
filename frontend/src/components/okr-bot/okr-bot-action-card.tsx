import { OkrBotActionIcon } from "./okr-bot-action-icon";
import type { OkrBotActionItem } from "./types";

type OkrBotActionCardProps = {
  action: OkrBotActionItem;
  disabled: boolean;
  onSelect: (action: OkrBotActionItem) => void;
};

export function OkrBotActionCard({ action, disabled, onSelect }: OkrBotActionCardProps) {
  return (
    <button disabled={disabled} onClick={() => onSelect(action)} type="button">
      <span className="okr-bot-action-heading">
        <strong>{action.label}</strong>
        <OkrBotActionIcon icon={action.icon} />
      </span>
      <span>{action.description}</span>
    </button>
  );
}
