import { getBackendBaseUrl } from "@/lib/env";

type TrustworthinessRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type CoachingContextRecord = {
  id: string;
  fields: Record<string, unknown>;
  participantEmails: string[];
  participants?: Array<{
    avatarUrl: string | null;
    email: string;
    name: string;
    role: string | null;
  }>;
};

type TrustworthinessSuccess = {
  evaluatorEmail: string;
  ok: true;
  filtering: {
    applied: boolean;
    reason: string;
  };
  recordCount: number;
  records: TrustworthinessRecord[];
  selectedPeriods: string[];
  tableName: string;
};

type CoachingContextSuccess = {
  activeSessionEmail: string | null;
  filtering: {
    applied: boolean;
    reason: string;
  };
  ok: true;
  participantEmail: string;
  recordCount: number;
  records: CoachingContextRecord[];
  selectedPeriods: string[];
  tableName: string;
};

type TrustworthinessFailure = {
  ok: false;
  message?: string;
};

type UpdateTrustworthinessPayload = {
  credibilityPoints?: number | null;
  feedback?: string;
  groupThinkingPoints?: number | null;
  intimacyPoints?: number | null;
  reliabilityPoints?: number | null;
};

type CoachingTranscriptSuccess = {
  actionItems: string[];
  chapterSummaries: Array<{
    description: string;
    title: string;
  }>;
  meetingDatetime: string | null;
  meetingTitle: string;
  ok: true;
  speakerBlocks: Array<{
    endTime: number | null;
    id: string;
    speaker: string;
    startTime: number | null;
    words: string;
  }>;
  summary: string | null;
  topics: string[];
  uniqueKey: string;
};

type SuggestionPayload = {
  end: string;
  participantEmail: string;
  start: string;
};

export async function fetchTrustworthinessFromBackend(
  selectedPeriods: string[],
  evaluatorEmail: string
) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(`${backendBaseUrl}/trustworthiness`);

  for (const period of selectedPeriods) {
    url.searchParams.append("period", period);
  }

  url.searchParams.set("evaluatorEmail", evaluatorEmail);

  const response = await fetch(url, {
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as TrustworthinessSuccess | TrustworthinessFailure;

  if (!response.ok || !payload.ok) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible consultar Trustworthiness.");
  }

  return payload;
}

export async function updateTrustworthinessRecordInBackend(
  recordId: string,
  evaluatorEmail: string,
  payload: UpdateTrustworthinessPayload
) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(`${backendBaseUrl}/trustworthiness/${encodeURIComponent(recordId)}`);

  url.searchParams.set("evaluatorEmail", evaluatorEmail);

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const parsedPayload = (await response.json()) as
    | { ok: true; record: TrustworthinessRecord }
    | TrustworthinessFailure;

  if (!response.ok || !parsedPayload.ok) {
    const message = "message" in parsedPayload ? parsedPayload.message : undefined;
    throw new Error(message ?? "No fue posible actualizar la evaluación.");
  }

  return parsedPayload.record;
}

export async function fetchCoachingContextFromBackend(
  dateRange: { end: string; start: string },
  participantEmail: string,
  activeSessionEmail: string
) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(`${backendBaseUrl}/trustworthiness/coaching-context`);

  url.searchParams.set("start", dateRange.start);
  url.searchParams.set("end", dateRange.end);
  url.searchParams.set("activeEmail", activeSessionEmail);
  url.searchParams.set("participantEmail", participantEmail);

  const response = await fetch(url, {
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as CoachingContextSuccess | TrustworthinessFailure;

  if (!response.ok || !payload.ok) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible consultar el contexto de reuniones.");
  }

  return payload;
}

export async function fetchCoachingTranscriptFromBackend(
  recordId: string,
  dateRange: { end: string; start: string },
  participantEmail: string,
  activeSessionEmail: string
) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(
    `${backendBaseUrl}/trustworthiness/coaching-context/${encodeURIComponent(recordId)}/transcript`
  );

  url.searchParams.set("start", dateRange.start);
  url.searchParams.set("end", dateRange.end);
  url.searchParams.set("activeEmail", activeSessionEmail);
  url.searchParams.set("participantEmail", participantEmail);

  const response = await fetch(url, {
    cache: "no-store"
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const payload = (await response.json()) as CoachingTranscriptSuccess | TrustworthinessFailure;

  if (!response.ok || !payload.ok) {
    const message = "message" in payload ? payload.message : undefined;
    throw new Error(message ?? "No fue posible consultar el transcript de la reunión.");
  }

  return payload;
}

export async function fetchTrustworthinessSuggestionFromBackend(
  recordId: string,
  evaluatorEmail: string,
  activeSessionEmail: string,
  payload: SuggestionPayload
) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(
    `${backendBaseUrl}/trustworthiness/${encodeURIComponent(recordId)}/suggestion`
  );

  url.searchParams.set("activeEmail", activeSessionEmail);
  url.searchParams.set("evaluatorEmail", evaluatorEmail);

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "El backend no devolvio JSON. Revisa BACKEND_BASE_URL o la proteccion del deployment."
    );
  }

  const parsedPayload = (await response.json()) as Record<string, unknown> | TrustworthinessFailure;

  if (!response.ok || !("ok" in parsedPayload && parsedPayload.ok)) {
    const message =
      "message" in parsedPayload && typeof parsedPayload.message === "string"
        ? parsedPayload.message
        : undefined;
    throw new Error(message ?? "No fue posible generar la sugerencia TW.");
  }

  return parsedPayload;
}
