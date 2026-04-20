import type { ReactNode } from "react";

export type PeriodOption = {
  endLabel: string;
  id: string;
  rangeLabel: string;
};

export type TrustworthinessRecord = {
  id: string;
  fields: Record<string, unknown>;
};

export type TrustworthinessResponse = {
  evaluatorEmail: string;
  filtering: {
    applied: boolean;
    reason: string;
  };
  ok: true;
  recordCount: number;
  records: TrustworthinessRecord[];
  selectedPeriods: string[];
  tableName: string;
};

export type GroupKey =
  | "summary"
  | "people"
  | "context"
  | "scores"
  | "delivery"
  | "roles"
  | "narrative"
  | "references"
  | "other";

export type FieldEntry = {
  name: string;
  value: ReactNode | unknown;
  walkthroughId?: string;
};

export type RecordGroup = {
  key: GroupKey;
  label: string;
  fields: FieldEntry[];
};

export type RecordSummary = {
  avatarUrl: string | null;
  context: string;
  evaluatedEmail: string | null;
  evaluatedName: string;
  periodLabel: string;
  roleLabel: string;
  scoreLabel: string;
  status: string;
  strengths: string | null;
  updatedLabel: string;
  weaknesses: string | null;
};

export type TrustworthinessRatingStatus = "Pending" | "Done";

export type RecordPeriodMeta = {
  key: string;
  label: string;
  sortValue: string;
};

export type RecordPeriodGroup = {
  id: string;
  label: string;
  records: TrustworthinessRecord[];
  sortValue: string;
};

export type SelectedPeriodMeta = {
  end: string;
  id: string;
  label: string;
  start: string;
};

export type SelectedPeriodCoverage = {
  end: string;
  start: string;
};

export type DetailPerson = {
  avatarUrl: string | null;
  email: string | null;
  name: string;
  role: string | null;
};

export type CoachingParticipant = {
  avatarUrl: string | null;
  email: string;
  name: string;
  role: string | null;
};

export type CoachingContextRecord = {
  id: string;
  fields: Record<string, unknown>;
  participantEmails: string[];
  participants?: CoachingParticipant[];
};

export type CoachingContextResponse = {
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

export type CoachingTranscriptResponse = {
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

export type SuggestionConfidence = "low" | "medium" | "high";
export type SuggestionPillarKey = "reliability" | "intimacy" | "groupThinking" | "credibility";

export type EvidenceSignal = {
  evidenceText: string;
  impact: "raises_score" | "lowers_score" | "supports_current_score";
  interpretation: string;
  meetingDatetime: string;
  meetingId: string;
  meetingTitle: string;
  sourceType:
    | "coaching_summary"
    | "coaching_analysis"
    | "transcript_summary"
    | "topic"
    | "action_item"
    | "metric_score";
};

export type MetricInput = {
  interpretation: string;
  mappedTo: SuggestionPillarKey;
  metricName: string;
  value: number | null;
};

export type PillarSuggestion = {
  confidence: SuggestionConfidence;
  decisionDetail: {
    conclusion: string;
    metricInputs: MetricInput[];
    negativeSignals: EvidenceSignal[];
    positiveSignals: EvidenceSignal[];
    uncertainty: string[];
  };
  meaning: string;
  points: number;
  shortReason: string;
};

export type TwSuggestionResponse = {
  generatedAt: string;
  meetingsUsed: number;
  ok: true;
  pillars: Record<SuggestionPillarKey, PillarSuggestion>;
  recordId: string;
  trustworthiness: {
    confidence: SuggestionConfidence;
    explanation: string;
    meaning: string;
    percentage: string;
    score: number;
  };
};

export type TwGenerationStage =
  | "validating_evaluation_data"
  | "fetching_airtable_meetings"
  | "building_meeting_evidence"
  | "sending_context_to_ai"
  | "validating_structured_response"
  | "calculating_tw_score";

export type TwGenerationPhase = "idle" | "running" | "success" | "error";

export type TwGenerationProgress = {
  completedStages: TwGenerationStage[];
  currentStage: TwGenerationStage | null;
  errorMessage: string | null;
  errorStage: TwGenerationStage | null;
  status: TwGenerationPhase;
};

export type TwSuggestionStreamEvent =
  | {
      label: string;
      stage: TwGenerationStage;
      type: "stage";
    }
  | {
      data: TwSuggestionResponse;
      type: "result";
    }
  | {
      message: string;
      stage: TwGenerationStage | null;
      type: "error";
    };

export type SuggestionAppliedPoints = Partial<Record<SuggestionPillarKey, number>>;

export type SuggestionNotification = {
  id: number;
  message: string;
};

export type TrustworthinessFloatingToast = {
  id: number;
  isClosing: boolean;
  message: string;
  title: string | null;
  tone: "progress" | "success" | "error";
};

export type TwSuggestionCacheMetadata = {
  end: string;
  evaluatedEmail: string;
  recordId: string;
  start: string;
};

export type CachedTwSuggestion = TwSuggestionCacheMetadata & {
  appliedPoints: SuggestionAppliedPoints;
  cachedAt: number;
  draftPoints: Record<SuggestionPillarKey, number>;
  expiresAt: number;
  suggestion: TwSuggestionResponse;
  version: 2;
};

export type RestoredTwSuggestion = TwSuggestionCacheMetadata & {
  appliedPoints: SuggestionAppliedPoints;
  cachedAt: number;
  draftPoints: Record<SuggestionPillarKey, number>;
  suggestion: TwSuggestionResponse;
};

export type SuggestionCacheNotice = {
  cachedAt: number;
};

export type EditableScoreField =
  | "reliabilityPoints"
  | "intimacyPoints"
  | "groupThinkingPoints"
  | "credibilityPoints";

export type EditableDraftTarget = EditableScoreField | "feedback";

export type TrustworthinessDraft = {
  credibilityPoints: number | null;
  feedback: string;
  groupThinkingPoints: number | null;
  intimacyPoints: number | null;
  reliabilityPoints: number | null;
};

export type TrustworthinessAssistantIntent =
  | "review"
  | "edit_pillar"
  | "edit_feedback"
  | "save"
  | "clarify";

export type TrustworthinessAssistantFocus = SuggestionPillarKey | "feedback" | null;
export type TrustworthinessAssistantChangeSource =
  | "model_evidence"
  | "human_override"
  | "mixed"
  | "none";

export type TrustworthinessAssistantProposal = {
  credibilityPoints: number;
  feedback: string;
  groupThinkingPoints: number;
  intimacyPoints: number;
  reliabilityPoints: number;
};

export type TrustworthinessAssistantMeeting = {
  actionItems: string[];
  coachingAnalysis: string | null;
  coachingSummary: string | null;
  meetingDatetime: string | null;
  meetingId: string;
  metricsScores: Record<string, number | null>;
  title: string;
  topics: string[];
  transcriptSummary: string | null;
};

export type TrustworthinessAssistantCitation = {
  meetingId: string;
  meetingTitle: string;
  pillar?: SuggestionPillarKey | null;
  reason: string;
};

export type ChatMessage = {
  changeSource?: TrustworthinessAssistantChangeSource;
  citations?: TrustworthinessAssistantCitation[];
  content: string;
  evidenceQuestion?: string | null;
  focusArea?: TrustworthinessAssistantFocus;
  id: string;
  intent?: TrustworthinessAssistantIntent;
  needsOptionalEvidence?: boolean;
  role: "assistant" | "user";
};

export type WalkthroughVariant = "manual" | "chatbot";

export type TrustworthinessWorkspaceProps = {
  isWalkthroughOpen?: boolean;
  onWalkthroughAbort?: (message?: string) => void;
  onWalkthroughComplete?: () => void;
  onWalkthroughToast?: (message: string) => void;
  walkthroughStepId?: string | null;
  walkthroughVariant?: WalkthroughVariant | null;
};

export type TrustworthinessAssistantSessionResponse = {
  meetings: TrustworthinessAssistantMeeting[];
  ok: true;
  proposal: TrustworthinessAssistantProposal;
  suggestion: TwSuggestionResponse;
};

export type TrustworthinessAssistantReplyResponse = {
  changeSource: TrustworthinessAssistantChangeSource;
  citations: TrustworthinessAssistantCitation[];
  evidenceQuestion: string | null;
  focusArea: TrustworthinessAssistantFocus;
  message: string;
  needsOptionalEvidence: boolean;
  nextIntent: TrustworthinessAssistantIntent;
  ok: true;
  proposal: TrustworthinessAssistantProposal;
  proposalChanged: boolean;
};

export type DetailGroupsOptions = {
  aiSuggestions: Partial<Record<EditableScoreField, PillarSuggestion>>;
  draft: TrustworthinessDraft | null;
  editable: boolean;
  feedbackGenerationError: string | null;
  isDirty: (target: EditableDraftTarget) => boolean;
  isGeneratingFeedback: boolean;
  onDiscard: (target: EditableDraftTarget) => void;
  onFeedbackChange: (value: string) => void;
  onGenerateFeedback: () => void;
  onPointsChange: (field: EditableScoreField, value: number) => void;
};

export type ScoreEditorConfig = {
  draftField: EditableScoreField;
  label: string;
  meaningField: string;
  pointsField: string;
  questionField: string;
};
