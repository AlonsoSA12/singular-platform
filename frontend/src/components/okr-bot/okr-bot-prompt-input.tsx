import { useEffect, useRef } from "react";

type OkrBotPromptInputProps = {
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  value: string;
};

export function OkrBotPromptInput({
  disabled,
  onChange,
  onSend,
  placeholder,
  value
}: OkrBotPromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [value]);

  return (
    <form
      className="okr-bot-input-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && value.trim().length > 0) {
          onSend();
        }
      }}
    >
      <textarea
        ref={textareaRef}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!disabled && value.trim().length > 0) {
              onSend();
            }
          }
        }}
        placeholder={placeholder}
        rows={1}
        value={value}
      />
      <button disabled={disabled || value.trim().length === 0} type="submit">
        Send
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m5 12 14-7-5 14-3-5z" />
          <path d="m11 14 4-4" />
        </svg>
      </button>
    </form>
  );
}
