# OKR Bot Key Result Flow

This document defines the desired rules for Key Result creation and editing inside the OKR Bot.

It is a working specification. Implementation should happen only after these rules are reviewed and approved.

## Scope

This flow covers only Key Results (`KR`) inside the chatbot.

The Key Project (`KP`) creation and editing flow is separate and must not be changed as part of this document.

## Main Files

- `backend/src/okrs/bot-assistant.ts`
  - Owns the OKR Bot conversation flow.
  - Decides when the user is creating, editing, reading, selecting, or confirming.
- `backend/src/okrs/ai-drafts.ts`
  - Re-exports AI draft generators used by OKR flows.
- `backend/src/trustworthiness/service.ts`
  - Contains `generateAgileKeyResultDraft`.
  - Should contain `generateAgileKeyResultEditDraft` when KR editing is implemented.
  - Defines the structured JSON schema for AI-generated Key Result drafts.
- `backend/api/okrs/ai/key-result-draft.ts`
  - Backend HTTP endpoint for generating a Key Result create draft.
- `backend/api/okrs/key-results.ts`
  - Backend HTTP endpoint for updating a Foundation Key Result.
- `backend/api/singular-agile/key-results.ts`
  - Backend HTTP endpoint for creating a Key Result in Singular Agile.
- `backend/src/singular-agile/key-results.ts`
  - Validates Singular Agile Key Result create payloads.
  - Maps accepted chatbot fields to Singular Agile Airtable fields.
- `backend/src/okrs/airtable-key-results.ts`
  - Validates Foundation Key Result update payloads.
  - Maps accepted edit fields to Airtable fields.
- `frontend/src/components/okr-bot/okr-bot-workspace.tsx`
  - Handles UI state, confirm action, save action, and project context refresh.
- `frontend/src/lib/okrs.ts`
  - Defines frontend OKR types and API helpers.

## Key Concepts

In this codebase, `KR` means `Key Result`.

A Key Result is the measurable outcome attached to an Objective. It should make target, current value, status, and timing explicit.

The operational OKR hierarchy is:

```text
Project -> Objective -> Key Result -> Key Project
```

The chatbot treats Key Results as proposal-first records. The user reviews the proposal before anything is saved.

The chatbot must use only the Key Result chatbot contract. It must not expose or ask for the full Airtable Key Result schema.

Create payload contract:

- `keyResult`
- `metric`
- `explanation`
- `status`
- `initialValue`
- `currentValue`
- `targetValue`
- `targetDate`
- `objectiveIds`
- `projectIds`

The create payload must contain only these fields. The bot may use internal selected Project and Objective IDs during the conversation, but those internal IDs must be converted to `projectIds` and `objectiveIds` before save.

Allowed only for edit proposals:

- `recordId`

The bot must not ask for, suggest, display, or save any create field outside the create payload contract.

## Quality Rules

Every generated KR proposal must be:

- measurable;
- time-bound;
- connected to one Objective when the user chooses an Objective during creation;
- coherent with the selected Project;
- specific enough to be tracked later;
- free of duplicated intent when compared with existing KRs under the same Objective.

The bot should improve vague user input into a stronger KR, but it must preserve the user's business intent.

The bot must not create a KR that is only an activity, feature, task, or Key Project. If the user asks for delivery work, the bot should clarify whether they mean a KR or KP.

## Metric And Value Rules

The KR must include a clear `metric`.

Numeric values must follow these rules:

- `initialValue` is the starting point.
- `currentValue` is the current measured state.
- `targetValue` is the desired measured state.
- New KRs should usually set `currentValue` equal to `initialValue` unless the user provides a different current value.
- Percentage values must use decimals in system payloads: `0.35` means `35%`.
- Count, money, time, rating, and other non-percentage metrics should use their natural numeric value.
- Empty numeric values are allowed only when the user has not provided enough information and the proposal is still useful.

The bot should infer values only when the user gives enough context. If not, it should use safe defaults and make the assumption visible in the proposal.

## Status Rules

Allowed KR statuses:

- `Todo`
- `In progress`
- `Done`

New KRs should default to `Todo` unless the user clearly says work is already underway or completed.

Editing a KR should preserve the current status unless the user explicitly asks to change it or the edit instructions clearly imply a status change.

## Target Date Rules

`targetDate` should use `YYYY-MM-DD` when available.

If the user gives a relative date, the system should resolve it to an absolute date before saving.

If no date is provided, the bot may suggest a reasonable date based on the Objective, Project, or surrounding context. If no reliable date exists, the bot should leave the field blank or ask for the missing timing, depending on how important the date is to the requested KR.

## Create Flow

The bot uses deterministic rules first. When wording is ambiguous, the backend may use an AI intent classifier to decide whether the message should enter the structured KR create or edit flow. The classifier only chooses intent, target hints, and instructions; it does not create, edit, or save records.

The classifier also returns `responseMode`:

- `proposal`: enter the saveable proposal UI flow.
- `chat`: answer conversationally only, without target selection, proposal UI, or save confirmation.

Use `chat` when the user asks for ideas, options, examples, multiple candidate KRs, or explicitly says to answer in chat / not create yet.

1. The user selects a Project in the OKR Bot workspace.
2. The bot loads project context:
   - Objectives.
   - Key Results.
   - Key Projects.
   - Key Result history.
3. The user asks to create a KR, or clicks `Create Key Result`.
4. The bot first collects the user's KR idea when the idea is missing or too vague.
5. After the user gives the KR idea, the bot asks whether the user wants to choose an Objective or skip that relationship for now.
6. The bot should make Objective selection visible even when there is only one available Objective.
7. The user may explicitly continue without an Objective.
8. If the user already selected an Objective before giving the idea, the bot can keep that Objective and should make that relationship visible in the proposal before save.
9. Once an Objective is selected, that Objective becomes the fixed creation parent. If Objective selection is skipped, the proposal must not include `objectiveId`.
10. Once the user provides enough detail and either selects or skips the Objective, the bot calls `generateAgileKeyResultDraft`.
11. The AI draft receives:
   - User idea.
   - Selected project.
   - Selected Objective, if selected.
   - Existing Key Results under that Objective, or all project Key Results when Objective selection is skipped.
12. The generated draft is returned to the UI as a proposal.
13. The user confirms or edits the proposal.
14. On confirm, the frontend calls the Key Result create API.
15. After save, the project context is invalidated and refreshed.

## Generated Create Proposal Shape

The create proposal shown to the user must stay limited to user-reviewable create fields:

```ts
{
  currentValue: number | null;
  explanation: string;
  initialValue: number | null;
  keyResult: string;
  metric: string;
  status: "Done" | "In progress" | "Todo";
  targetDate: string;
  targetValue: number | null;
}
```

The AI must not return or discuss fields outside this shape.

The bot/frontend add relationship fields only at save time, using the selected Project and selected Objective:

```ts
{
  objectiveIds: string[];
  projectIds: string[];
}
```

These relationship IDs come from the selected Objective and selected Project. They are not generated by the AI.

## Edit Flow

The bot uses deterministic rules first. When the user asks to update a KR in indirect language, such as `hazlo`, `actualiza`, `con esta data`, or references prior context, the AI intent classifier should route the message into `edit_key_result` instead of returning a free-text answer.

1. The user asks to edit a Key Result, or clicks `Edit Key Result`.
2. If there is no selected target, the bot asks the user to choose a Key Result.
3. Once selected, that Key Result is the fixed edit target.
4. The bot must not ask whether the user wants to change Key Result unless the user explicitly says so.
5. The user's next message is treated as edit instructions for the selected Key Result.
6. If there is exactly one KR and the user asks to edit a KR generically, the bot can select that KR and ask what change the user wants.
7. If the user gives concrete edit instructions and the target KR is clear from the current selection, conversation history, KR code, or the fact that only one KR exists, the bot must generate the edit proposal UI directly.
8. The bot must not ask the user to choose or change Objective during a normal KR edit.
9. Objective selection rules from KR creation do not apply to KR editing.
10. The Objective relationship must be preserved unless the user explicitly asks to move the KR to another Objective.
11. The bot calls `generateAgileKeyResultEditDraft`.
12. The AI receives:
   - selected Key Result;
   - user edit instructions;
   - selected Objective, when available;
   - project context;
   - sibling Key Results under the same Objective;
   - relevant Key Result history, when useful for current value or status decisions.
13. The edit proposal returns only fields from the chatbot contract.
14. `objectiveId` is preserved unless the user explicitly asks to move the KR to another Objective.
15. `recordId` is required for save.
16. The user confirms before save.

Explicit target-change phrases include requests like:

- `edit another`
- `change Key Result`
- `select another`
- `wrong KR`
- `me equivoqué`
- `editar otro`
- `cambiar KR`
- `usa otro`

## Generated Edit Draft Shape

`generateAgileKeyResultEditDraft` should return a structured draft:

```ts
{
  currentValue: number | null;
  explanation: string;
  initialValue: number | null;
  keyResult: string;
  metric: string;
  objectiveId: string;
  recordId: string;
  status: "Done" | "In progress" | "Todo";
  targetDate: string;
  targetValue: number | null;
}
```

The edit draft should preserve existing values unless the user's edit instructions require a change.

## Save Flow

Create saves through Singular Agile:

```text
frontend /api/singular-agile/key-results
  -> backend /singular-agile/key-results
  -> backend/src/singular-agile/key-results.ts
  -> Airtable Singular Agile Key Results table
```

Edit saves through Singular Agile:

```text
frontend /api/singular-agile/key-results
  -> backend /singular-agile/key-results
  -> backend/src/singular-agile/key-results.ts
  -> Airtable Singular Agile Key Results table
```

Accepted Singular Agile create fields include:

- `keyResult` -> `Key Result`
- `metric` -> `Metric`
- `explanation` -> `Explanation`
- `status` -> `Status`
- `initialValue` -> `Initial Value`
- `currentValue` -> `Current Value`
- `targetValue` -> `Target Value`
- `targetDate` -> `Target Date`
- `objectiveIds` -> `Objetive`
- `projectIds` -> `Project`

The Singular Agile `Name` field is computed and must never be written by the chatbot.

Accepted Singular Agile edit fields include:

- `recordId` -> Singular Agile Key Result Airtable record ID from `sourceRecordId`
- `keyResult` -> `Key Result`
- `metric` -> `Metric`
- `explanation` -> `Explanation`
- `status` -> `Status`
- `initialValue` -> `Initial Value`
- `currentValue` -> `Current Value`
- `targetValue` -> `Target Value`
- `targetDate` -> `Target Date`

Normal KR edit does not write `Project`, `Objetive`, `Name`, `Quarter`, `Progress`, or `Progress Number`.

The UI shows a short `Processing...` assistant message while the save is running. On success, it replaces that message with the saved confirmation.

## Progress Calculation

`Progress` and `Progress Number` are read-only/calculated fields for the chatbot write flow.

The chatbot should not ask the AI to calculate final progress as an authoritative value. The AI may reason about whether values are coherent, but `Progress` and `Progress Number` must not be sent during create or edit.

When values change, Airtable or the downstream operational system owns any calculated progress behavior.

## Relationship Rules

A KR must belong to one selected Project.

A KR may belong to one selected Objective during the chatbot create flow, but Objective selection can be skipped when the user explicitly chooses to continue without it.

When creating a KR:

- the bot should collect the KR idea first when it is missing;
- after the KR idea is available, the bot should ask whether the user wants to choose an Objective or skip it;
- Objective selection or explicit skip is part of the create flow and should happen before generating the final saveable proposal;
- if an Objective is selected, it must belong to the selected Project;
- if an Objective is selected, the KR must be added to the Objective linked-record field after creation;
- if Objective selection is skipped, the proposal and create payload must omit the Objective relationship;
- the bot must not silently attach the KR to a different Objective.

When editing a KR:

- the selected KR target is fixed;
- the Objective relationship is preserved by default;
- the bot must not ask for Objective selection during normal edits;
- moving a KR to another Objective requires explicit user intent and should be treated as a separate, high-friction edit.

## Confirmation And Manual Edits

The user must confirm before save.

Before confirmation, the user can edit proposal fields in the conversation.

When a KR proposal is active, proposal edits take priority over intent classification. Natural correction messages such as `no es KPI es KP`, `cambia KPI por KP`, or `reemplaza KPI por KP` must update the active KR proposal instead of selecting or editing an already saved KR.

Allowed conversational field edits:

- change `keyResult`
- change `metric`
- change `explanation`
- change `status`
- change `initialValue`
- change `currentValue`
- change `targetValue`
- change `targetDate`

If the user tries to edit a disallowed field, the bot should explain that the field is outside the KR chatbot contract.

## Current Guarantees

- KR create proposals are generated before save.
- KR create save requires explicit user confirmation.
- KR creation collects the idea first, then asks the user to choose an Objective or skip it.
- KR create is connected to a selected Objective only when the user selects one.
- KR create validates that the selected Objective belongs to the selected Project.
- KR edit proposals are generated before save.
- Editing a KR keeps the selected target fixed unless the user explicitly asks to switch target.
- KR edit preserves Objective relationship unless the user explicitly asks to move it.
- KR edit does not ask for Objective selection during normal edits.
- KR edit conversations stay limited to the chatbot Key Result contract.
- KR edit save requires explicit user confirmation.
- KR create/edit does not write `Progress` or `Progress Number`.
- The user sees processing feedback while save is in progress.
- The project context refreshes after save.

## Current Boundaries

- This document does not change the KP flow.
- This document does not define Key Result History creation or bulk history updates.
- This document does not define Objective creation or editing behavior.
- This document does not define Key Project creation or editing behavior.

## Implementation Notes

KR edit support includes:

- `generateAgileKeyResultEditDraft`.
- A structured JSON schema for KR edit drafts.
- Backend update support for `/okrs/key-results`.
- Frontend API helper for updating KRs.
- OKR Bot branch for `edit_key_result` proposal generation.
- Frontend confirm-save support for `targetType: "key_result"` and `operation: "edit"`.
- Typecheck verification for backend and frontend.
