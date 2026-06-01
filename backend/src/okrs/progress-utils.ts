export function calculateAgileKeyResultProgress(input: {
  currentValue?: number | null;
  initialValue?: number | null;
  targetValue?: number | null;
}) {
  const initialValue =
    typeof input.initialValue === "number" && Number.isFinite(input.initialValue) ? input.initialValue : null;
  const currentValue =
    typeof input.currentValue === "number" && Number.isFinite(input.currentValue) ? input.currentValue : null;
  const targetValue =
    typeof input.targetValue === "number" && Number.isFinite(input.targetValue) ? input.targetValue : null;

  if (initialValue === null || currentValue === null || targetValue === null || targetValue === initialValue) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(((currentValue - initialValue) / (targetValue - initialValue)) * 100)));
}

export function normalizeScoreObjetives(value: number | null) {
  if (value === null) {
    return null;
  }

  if (value <= 1) {
    return Math.round(value * 100);
  }

  if (value <= 10) {
    return Math.round(value * 10);
  }

  return Math.round(value);
}

export function normalizePercentLike(value: number | null) {
  if (value === null) {
    return 0;
  }

  if (value <= 1) {
    return Math.round(value * 100);
  }

  return Math.round(value);
}
