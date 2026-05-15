import type { OkrBotActionIconName } from "./types";

export function OkrBotActionIcon({ icon }: { icon: OkrBotActionIconName }) {
  if (icon === "bars") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 7h10" />
        <path d="M5 12h7" />
        <path d="M5 17h5" />
        <path d="m15 18 4-4 2 2-4 4h-2z" />
      </svg>
    );
  }

  if (icon === "chart") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 15v-3" />
        <path d="M12 15V9" />
        <path d="M16 15v-5" />
      </svg>
    );
  }

  if (icon === "tool") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m14 7 3 3" />
        <path d="m5 19 7-7" />
        <path d="M14 5a4 4 0 0 0 5 5l-7 7-5-5z" />
      </svg>
    );
  }

  if (icon === "target") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
      </svg>
    );
  }

  if (icon === "spark") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3v5" />
        <path d="M12 16v5" />
        <path d="M4 12h5" />
        <path d="M15 12h5" />
        <path d="m7 7 3 3" />
        <path d="m14 14 3 3" />
        <path d="m17 7-3 3" />
        <path d="m10 14-3 3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
