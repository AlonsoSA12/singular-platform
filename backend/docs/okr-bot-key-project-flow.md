# OKR Bot Key Project Flow

This document summarizes how Key Project creation and editing works inside the OKR Bot.

## Scope

This flow covers only Key Projects (`KP`) inside the chatbot. The Key Result creation flow is separate and should not be changed as part of this flow.

## Main Files

- `backend/src/okrs/bot-assistant.ts`
  - Owns the OKR Bot conversation flow.
  - Decides when the user is creating, editing, reading, selecting, or confirming.
- `backend/src/okrs/ai-drafts.ts`
  - Re-exports AI draft generators used by OKR flows.
- `backend/src/trustworthiness/service.ts`
  - Contains `generateAgileKeyProjectDraft`.
  - Contains `generateAgileKeyProjectEditDraft`.
  - Defines the structured JSON schema for AI-generated Key Project drafts.
- `backend/api/okrs/ai/key-project-draft.ts`
  - Backend HTTP endpoint for generating a Key Project draft.
- `backend/api/singular-agile/key-projects.ts`
  - Backend HTTP endpoint for creating or updating a Key Project in Singular Agile.
- `backend/src/singular-agile/key-projects.ts`
  - Validates Key Project write payloads.
  - Maps accepted fields to Airtable fields.
- `frontend/src/components/okr-bot/okr-bot-workspace.tsx`
  - Handles UI state, confirm action, save action, and project context refresh.
- `frontend/src/lib/okrs.ts`
  - Defines frontend OKR types and API helpers.

## Key Concepts

In this codebase, `KP` means `Key Project`.

A Key Project is delivery work, similar to an Epic, intended to move one or more Key Results. It sits in the operational layer of the OKR model:

```text
Project -> Objective -> Key Result -> Key Project
```

The chatbot treats Key Projects as proposal-first records. The user reviews the proposal before anything is saved.

The chatbot must use only the Key Project chatbot contract. It must not expose or ask for the full Airtable/Singular Agile Key Project schema.

Allowed chatbot fields:

- `name`
- `epicStory`
- `justification`
- `clarity`
- `strategicFocus`
- `valueOrientation`
- `finalScore`
- `status`
- `keyResultIds`

Disallowed in this flow unless the user explicitly asks about them:

- Stories
- Total Stories
- AI Stories Assist
- calculated fields
- internal Airtable fields
- fields from the complete Key Project entity that are not in the chatbot contract

## Create Flow

1. The user selects a Project in the OKR Bot workspace.
2. The bot loads project context:
   - Objectives.
   - Key Results.
   - Key Projects.
   - Key Result history.
3. The user asks to create a KP, or clicks `Create Key Project`.
   - The bot uses deterministic rules first.
   - When wording is ambiguous, an AI intent classifier may route the message into `create_key_project`.
   - The classifier may extract the KP idea, a mentioned KR, or whether the user wants to continue without a linked KR.
   - The classifier only chooses intent and hints; it does not create, edit, or save records.
   - The classifier returns `responseMode`. `proposal` enters the saveable UI flow. `chat` answers conversationally only, without target selection, proposal UI, or save confirmation.
   - Use `chat` when the user asks for ideas, options, examples, multiple candidate KPs, or explicitly says to answer in chat / not create yet.
4. If the input is too vague, the bot asks for the delivery idea.
5. Once the user provides enough detail, the bot calls `generateAgileKeyProjectDraft`.
6. The AI draft receives:
   - User idea.
   - Selected project.
   - Existing Objectives.
   - Existing Key Results.
   - Existing Key Projects.
   - Selected Key Result, when available.
7. The generated draft is returned to the UI as a proposal.
8. The bot asks whether the KP should be connected to a Key Result.
9. If the user selects a KR, the bot refines the proposal again using that selected KR.
10. The user confirms or edits the proposal.
11. On confirm, the frontend calls the Singular Agile Key Project API.
12. After save, the project context is invalidated and refreshed.

## Generated Draft Shape

`generateAgileKeyProjectDraft` returns a structured draft:

```ts
{
  clarity: number;
  epicStory: string;
  finalScore: number;
  justification: string;
  keyResultIds: string[];
  name: string;
  projectId: string;
  status: "Active" | "Archived" | "Suggested by Resource";
  strategicFocus: number;
  valueOrientation: number;
}
```

The numeric scores are generated from `0` to `1` so the user can review and confirm them:

- `clarity`: how understandable and well-scoped the delivery work is.
- `strategicFocus`: how directly the work supports the selected KR or strongest related OKR outcome.
- `valueOrientation`: how clearly the work improves user, client, or product value.
- `finalScore`: overall quality signal.

## Why AI Generation Is Required

The earlier KP flow copied the user's prompt into `name` and `epicStory`, then used a generic fallback justification. That produced weak proposals even when the bot had enough project and KR context.

The current flow uses AI generation so the KP draft is rewritten into a useful execution proposal:

- concise action-oriented name;
- richer epic story;
- justification connected to the OKR context;
- explicit KR relationship when selected;
- reviewable quality scores.

## Key Result Selection

The bot can connect a KP to a KR in two ways:

1. Detecting a mentioned KR in the user's message.
2. Asking the user to select a KR from the options list.

The user can also explicitly continue without a linked KR. In that case, the proposal must keep `keyResultIds` empty and can go directly to confirmation.

When a KR is selected, the bot does not only add `keyResultIds`. It regenerates/refines the proposal with that KR as context, so `name`, `epicStory`, and `justification` can become more relevant.

## Edit Flow

When a KP proposal is active, proposal edits take priority over intent classification. Natural correction messages such as `no es KPI es KP`, `cambia KPI por KP`, or `reemplaza KPI por KP` must update the active KP proposal instead of selecting or editing an already saved KP.

1. The user asks to edit a Key Project, or clicks `Edit Key Project`.
2. If there is no selected target, the bot asks the user to choose a Key Project.
3. Once selected, that Key Project is the fixed edit target.
4. The bot must not ask whether the user wants to change Key Project unless the user explicitly says so.
5. The user's next message is treated as edit instructions for the selected Key Project.
6. When wording is indirect, such as `hazlo`, `actualiza`, `con esta data`, or references prior context, the AI intent classifier should route the message into `edit_key_project` instead of returning a free-text answer.
7. If there is exactly one KP and the user asks to edit a KP generically, the bot can select that KP and ask what change the user wants.
8. If the user gives concrete edit instructions and the target KP is clear from the current selection, conversation history, KP name, or the fact that only one KP exists, the bot must generate the edit proposal UI directly.
9. The bot calls `generateAgileKeyProjectEditDraft`.
10. The AI receives:
   - selected Key Project;
   - user edit instructions;
   - project context;
   - Objectives;
   - Key Results.
11. The edit proposal returns only fields from the chatbot contract.
12. `keyResultIds` are preserved unless the user explicitly asks to change, connect, replace, or remove the KR association.
13. The user confirms before save.

Explicit target-change phrases include requests like:

- `edit another`
- `change Key Project`
- `select another`
- `me equivoqué`
- `editar otro`
- `cambiar KP`
- `usa otro`

## Save Flow

The UI saves through:

```text
frontend /api/singular-agile/key-projects
  -> backend /singular-agile/key-projects
  -> backend/src/singular-agile/key-projects.ts
  -> Airtable Singular Agile table
```

Accepted write fields include:

- `name` -> `Epic Name`
- `status` -> `Status`
- `projectIds` -> `Projects`
- `keyResultIds` -> `key_result`
- `dontShowInSingularStories` -> `Don't Show In Singular Stories`
- `epicStory` -> `Epic Story`
- `clarity` -> `Clarity`
- `strategicFocus` -> `Strategic Focus`
- `valueOrientation` -> `Value Orientation`
- `finalScore` -> `finalScore`
- `justification` -> `Justification`

The UI shows a short `Processing...` assistant message while the save is running. On success, it replaces that message with the saved confirmation.

## Important Runtime Detail

The frontend proxy depends on `BACKEND_BASE_URL`.

For local development, `.env` currently points to:

```text
BACKEND_BASE_URL=http://localhost:4000
```

The backend must be running for save actions to work:

```bash
npm --prefix backend run dev
```

If the backend is not running, the frontend save endpoint can return:

```json
{ "message": "fetch failed" }
```

That error indicates the backend proxy target is unavailable. It is not caused by proposal field values.

## Current Guarantees

- KP proposals are generated before save.
- Save requires explicit user confirmation.
- Selecting a KR refines the proposal instead of only attaching an ID.
- The AI intent classifier can route ambiguous KP create/edit wording into the structured proposal flow.
- Editing a KP keeps the selected target fixed unless the user explicitly asks to switch target.
- KP create/edit conversations stay limited to the chatbot Key Project contract.
- The user sees processing feedback while save is in progress.
- The project context refreshes after save.

## Current Boundaries

- This flow should not alter the Key Result creation flow.
- KP creation is saved through Singular Agile, not the legacy OKR Key Project create endpoint.
- `Epic Story` is part of the chatbot contract and is sent through the Singular Agile write path.
