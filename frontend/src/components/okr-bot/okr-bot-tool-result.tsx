import type { OkrBotSaveState } from "./types";

export function OkrBotToolResult({
  onDismiss,
  result
}: {
  onDismiss?: () => void;
  result: OkrBotSaveState;
}) {
  if (!result) {
    return null;
  }

  return (
    <section className={`okr-bot-tool-result is-${result.status}`} aria-live="polite">
      <div>
        <span>{result.status === "success" ? "Saved" : "Error"}</span>
        {onDismiss ? (
          <button aria-label="Dismiss save message" onClick={onDismiss} type="button">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        ) : null}
      </div>
      <strong>{result.message}</strong>
    </section>
  );
}
