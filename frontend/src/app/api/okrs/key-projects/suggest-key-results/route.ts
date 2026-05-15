import { NextResponse } from "next/server";
import type { AgileKeyResult, AgileObjective } from "@/lib/okrs";
import { fetchAgileProjectsFromBackend } from "@/lib/okrs";
import { readSession } from "@/lib/session";

type SuggestionInputKeyProject = {
  id?: string;
  justification?: string;
  keyProjectId?: string;
  name?: string;
  story?: string;
};

type ScoredSuggestion = {
  confidence: number;
  keyResult: AgileKeyResult;
  objective: {
    id: string;
    title: string;
  };
  reason: string;
};

const STOP_WORDS = new Set([
  "a",
  "al",
  "and",
  "con",
  "de",
  "del",
  "el",
  "en",
  "for",
  "la",
  "las",
  "los",
  "of",
  "o",
  "para",
  "por",
  "que",
  "the",
  "to",
  "un",
  "una",
  "y"
]);

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";
}

function tokenize(value: unknown) {
  return normalizeText(value)
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function uniqueTokens(value: unknown) {
  return [...new Set(tokenize(value))];
}

function getObjectiveTitle(objective: AgileObjective) {
  return objective.objective || objective.name || objective.id;
}

function getKeyProjectText(keyProject: SuggestionInputKeyProject) {
  return [
    keyProject.keyProjectId,
    keyProject.name,
    keyProject.story,
    keyProject.justification
  ].filter(Boolean).join(" ");
}

function getKeyResultText(keyResult: AgileKeyResult, objective: AgileObjective) {
  return [
    keyResult.code,
    keyResult.title,
    keyResult.metric,
    keyResult.explanation,
    getObjectiveTitle(objective),
    objective.description,
    objective.explanation,
    objective.metric
  ].filter(Boolean).join(" ");
}

function scoreTokenOverlap(leftTokens: string[], rightTokens: string[]) {
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const rightSet = new Set(rightTokens);
  const overlap = leftTokens.filter((token) => rightSet.has(token)).length;

  return overlap / Math.sqrt(leftTokens.length * rightTokens.length);
}

function buildReason(params: {
  keyProjectTokens: string[];
  keyResult: AgileKeyResult;
  keyResultTokens: string[];
  objective: AgileObjective;
}) {
  const sharedTokens = params.keyProjectTokens
    .filter((token) => params.keyResultTokens.includes(token))
    .slice(0, 4);
  const objectiveTitle = getObjectiveTitle(params.objective);
  const parts = [
    sharedTokens.length > 0
      ? `Comparte contexto sobre ${sharedTokens.join(", ")}.`
      : "Tiene cercania por el objetivo y la metrica del KR.",
    objectiveTitle ? `Pertenece al Objective "${objectiveTitle}".` : "",
    params.keyResult.metric ? `Metrica relacionada: ${params.keyResult.metric}.` : ""
  ];

  return parts.filter(Boolean).join(" ");
}

function clampConfidence(score: number, rank: number) {
  const base = Math.round(48 + score * 48 - rank * 4);

  return Math.max(45, Math.min(96, base));
}

function collectKeyResults(objectives: AgileObjective[]) {
  return objectives.flatMap((objective) =>
    (objective.keyResults ?? []).map((keyResult) => ({
      keyResult,
      objective
    }))
  );
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
    const projectName = typeof body?.projectName === "string" ? body.projectName.trim() : "";
    const keyProject = (body?.keyProject ?? {}) as SuggestionInputKeyProject;
    const objectives = Array.isArray(body?.objectives) ? (body.objectives as AgileObjective[]) : [];

    if (!projectId) {
      return NextResponse.json({ message: "El projectId es obligatorio." }, { status: 400 });
    }

    const projectsPayload = await fetchAgileProjectsFromBackend(session.email);
    const canReadProject = projectsPayload.projects.some(
      (project) => project.id === projectId || project.sourceRecordId === projectId
    );

    if (!canReadProject) {
      return NextResponse.json({ message: "No autorizado para consultar este proyecto." }, { status: 403 });
    }

    const keyProjectTokens = uniqueTokens(`${projectName} ${getKeyProjectText(keyProject)}`);
    const scored = collectKeyResults(objectives)
      .map(({ keyResult, objective }) => {
        const keyResultTokens = uniqueTokens(getKeyResultText(keyResult, objective));
        const tokenScore = scoreTokenOverlap(keyProjectTokens, keyResultTokens);
        const metricBoost = keyResult.metric ? scoreTokenOverlap(keyProjectTokens, uniqueTokens(keyResult.metric)) * 0.25 : 0;
        const objectiveBoost = scoreTokenOverlap(keyProjectTokens, uniqueTokens(getObjectiveTitle(objective))) * 0.2;
        const score = tokenScore + metricBoost + objectiveBoost;

        return {
          keyResult,
          keyResultTokens,
          objective,
          score
        };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map<ScoredSuggestion>((item, index) => {
        const confidence = clampConfidence(item.score, index);

        return {
          confidence,
          keyResult: item.keyResult,
          objective: {
            id: item.objective.id,
            title: getObjectiveTitle(item.objective)
          },
          reason: buildReason({
            keyProjectTokens,
            keyResult: item.keyResult,
            keyResultTokens: item.keyResultTokens,
            objective: item.objective
          })
        };
      });

    return NextResponse.json({
      ok: true,
      model: "semantic-key-result-matcher-v1",
      suggestions: scored
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "No fue posible sugerir Key Results para este Key Project."
      },
      { status: 502 }
    );
  }
}
