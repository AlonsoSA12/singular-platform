# OKR Bot Objective Flow

This document defines the chatbot rules for Objective creation and editing.

## Scope

This flow covers only Objectives inside the OKR Bot. KR and KP behavior is documented separately.

Objectives are proposal-first records. The user must review and confirm before anything is saved.

## Create Contract

The create proposal shown to the user is limited to:

```ts
{
  objective: string;
  description: string;
  explanation: string;
  metric: string;
  priority: string;
  targetDate: string;
  type: string;
  keyResults?: AgileGeneratedKeyResultDraft[];
}
```

On save, the frontend may add:

```ts
{
  aiSuggestedKeyResults?: string;
  projectIds: string[];
  status?: "Achieved" | "In Progress" | "Pending Review" | "Underachieved";
}
```

Default status is `Pending Review`.

## Edit Contract

The edit proposal shown to the user is limited to:

```ts
{
  recordId: string;
  sourceRecordId?: string;
  objective: string;
  description: string;
  explanation: string;
  metric: string;
  priority: string;
  status: "Achieved" | "In Progress" | "Pending Review" | "Underachieved";
  targetDate: string;
  type: string;
}
```

`sourceRecordId` is used to save edits in Singular Agile.

## Singular Agile Mapping

- `objective` -> `Objective`
- `description` -> `Objetive Description`
- `explanation` -> `Explanation`
- `metric` -> `Metric`
- `priority` -> `Priority`
- `status` -> `Status`
- `targetDate` -> `Target Date`
- `type` -> `Type`
- `aiSuggestedKeyResults` -> `AI suggested key results`
- `keyResultIds` -> `Key Results`
- `projectIds` -> `Project`

The chatbot must not write:

- `Name`
- `Quarter`
- `Score Objetives`
- `No.`
- `po_user`
- calculated, lookup, or rollup fields

## Create Flow

1. The user selects a Project.
2. The bot loads Objectives, KRs, KPs, and KR history.
3. The user asks to create an Objective or clicks `Create Objective`.
4. If the idea is missing or too vague, the bot asks for the Objective idea.
5. Once there is enough detail, the bot calls `generateAgileObjectiveDraft`.
6. The generated proposal is returned to the UI.
7. The user confirms or edits the proposal.
8. On confirm, the frontend calls `POST /singular-agile/objectives`.
9. After save, project context is refreshed.

## Edit Flow

1. The user asks to edit an Objective or clicks `Edit Objective`.
2. If there is no selected target, the bot asks the user to choose an Objective.
3. If there is exactly one Objective and the user asks generically, the bot can select it and ask what change is needed.
4. Once selected, the Objective target is fixed.
5. If the user gives concrete edit instructions and the target is clear, the bot generates an Objective edit proposal UI directly.
6. The bot calls `generateAgileObjectiveEditDraft`.
7. The user confirms or edits the proposal.
8. On confirm, the frontend calls `PATCH /singular-agile/objectives`.

## Intent Classifier

The bot uses deterministic rules first. When wording is ambiguous, the backend may use an AI intent classifier to route the message into:

- `create_objective`
- `edit_objective`
- `read`
- `unknown`

The classifier only chooses intent, target hints, and instructions. It does not create, edit, or save records.

The classifier also returns `responseMode`:

- `proposal`: enter the saveable proposal UI flow.
- `chat`: answer conversationally only, without target selection, proposal UI, or save confirmation.

Use `chat` when the user asks for ideas, options, examples, multiple candidate Objectives, or explicitly says to answer in chat / not create yet.

## Active Proposal Edits

When an Objective proposal is active, proposal edits take priority over intent classification.

Natural correction messages such as:

- `no es KPI es KP`
- `cambia KPI por KP`
- `reemplaza KPI por KP`

must update the active Objective proposal instead of selecting or editing an already saved Objective.

These replacements apply to:

- `objective`
- `description`
- `explanation`
- `metric`

## Current Guarantees

- Objective create saves through Singular Agile.
- Objective edit saves through Singular Agile.
- Objective save requires explicit confirmation.
- Objective create/edit conversations stay limited to the chatbot Objective contract.
- The chatbot does not write calculated fields.
