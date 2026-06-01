import type { OkrBotEntityOption } from "./types";

type OkrBotSelectionListProps = {
  disabled: boolean;
  onSelect: (option: OkrBotEntityOption) => void;
  options: OkrBotEntityOption[];
};

export function OkrBotSelectionList({ disabled, onSelect, options }: OkrBotSelectionListProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="okr-bot-options-shell" aria-label="OKR Bot selectable targets">
      <div className="okr-bot-options-scroll">
        <div className="okr-bot-options">
          {options.map((option) => (
            <button
              disabled={disabled}
              key={option.id}
              onClick={() => onSelect(option)}
              title={option.label}
              type="button"
            >
              <strong>{option.label}</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
