type OkrBotContextSummaryProps = {
  keyProjectCount: number;
  keyResultCount: number;
  objectiveCount: number;
};

export function OkrBotContextSummary({
  keyProjectCount,
  keyResultCount,
  objectiveCount
}: OkrBotContextSummaryProps) {
  return (
    <div className="okr-bot-context-grid" aria-label="Loaded OKR context">
      <div>
        <span>Objectives</span>
        <strong>{objectiveCount}</strong>
      </div>
      <div>
        <span>Key Results</span>
        <strong>{keyResultCount}</strong>
      </div>
      <div>
        <span>Key Projects</span>
        <strong>{keyProjectCount}</strong>
      </div>
    </div>
  );
}
