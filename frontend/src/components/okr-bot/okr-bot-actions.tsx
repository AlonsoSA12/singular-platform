import { OkrBotActionCard } from "./okr-bot-action-card";
import type { OkrBotActionItem } from "./types";

type OkrBotActionsProps = {
  actions: OkrBotActionItem[];
  disabled: boolean;
  onSelect: (action: OkrBotActionItem) => void;
};

export function OkrBotActions({ actions, disabled, onSelect }: OkrBotActionsProps) {
  return (
    <div className="okr-bot-actions" aria-label="OKR Bot actions">
      {actions.map((action) => (
        <OkrBotActionCard action={action} disabled={disabled} key={action.label} onSelect={onSelect} />
      ))}
    </div>
  );
}
