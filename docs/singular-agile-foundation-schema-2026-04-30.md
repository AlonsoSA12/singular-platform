# Singular Agile Foundation Airtable Schema

Generated: 2026-04-30
Source: Airtable Metadata API
Base ID: `appnQUN6OGtDGhS0H`

This document intentionally excludes API tokens and record data. It only captures table and field structure.

## OKR-Relevant Tables

- `Projects` (tblAlkEe98l952t7v)
- `Objective` (tblGRc3HMuMKhQOub)
- `Key Result` (tblwSWyJl7p6NgYUA)
- `Key Project` (tblu9Jj3IFaDzAu3T)

## All Tables

- `Projects` (tblAlkEe98l952t7v)
- `Objective` (tblGRc3HMuMKhQOub)
- `Key Result` (tblwSWyJl7p6NgYUA)
- `Key Project` (tblu9Jj3IFaDzAu3T)
- `chapter_story` (tblvSHO0Fy0vGwGIt)
- `chapter_to_project_story` (tblv0jsJ90f6gnwBg)
- `Chapters` (tbl97gz8SS2lwgvdO)
- `global_utilization` (tblAGgsz3osgqVCLs)
- `Impacts` (tblGbMHDz7eeXMALp)
- `Key Result History` (tbl6vfKhWFgBgUVVJ)
- `Migration Tracker` (tblxO8liXdGP5jI9n)
- `Nature_of_Issue_by_Project` (tblqVSu6KCRw2D1aW)
- `Project_Brief` (tblqDt1h0nfP5dWFm)
- `Project_Brief_v2` (tbloKzGM2lWnuljL2)
- `Project_news` (tblZUHRWMevQPbTNu)
- `Projects_Assets_Hub  ` (tbl9Af5W7w4984bum)
- `Realeses` (tbltCcrmvPhIKEAOp)
- `Resource` (tbltf4CU5Cx6EETtR)
- `User Resource` (tblKObDH5kY3qHllf)

---

## Projects

Table ID: `tblAlkEe98l952t7v`
Primary field: `Clientes` (singleLineText)

| Field | Type | Notes |
|---|---|---|
| `Clientes` | singleLineText |  |
| `Average Rating` | number | Precision: 2 |
| `Stripe ID` | singleLineText |  |
| `PO` | singleSelect | Options: Charlie, Gerardo Molina, Michelle Molina, Claudia Galdamez, Jorge Castañeda, Manuela Barbero, Stephanie Garrido, Inactivo, Joseline Solano, Mirna Lopez, Laura Aguirre, Andrés Vargas, Andrea García Leal, Miguel Pérez |
| `Collaborator` | singleCollaborator |  |
| `Company Logo` | multipleAttachments | Reversed: false |
| `Propuestas y Contratos` | multipleAttachments | Reversed: false |
| `Project Brief` | singleLineText |  |
| `Sprints` | singleLineText |  |
| `Discounted Price/SP` | currency | Precision: 2; Symbol: $ |
| `Stories` | singleLineText |  |
| `Location` | multilineText |  |
| `Google Drive ID` | singleLineText |  |
| `Tech Type` | singleSelect | Options: Full Stack / Flutter, Low Code |
| `Gantt Embed` | singleLineText |  |
| `Email` | email |  |
| `SF Emails` | singleLineText |  |
| `NA` | checkbox | Color: greenBright |
| `User Table` | singleLineText |  |
| `Email Existence Check` | number | Precision: 0 |
| `Client Approvals` | singleLineText |  |
| `Slack Internal Channel` | singleLineText |  |
| `Personal Client Slack ID` | singleLineText |  |
| `Slack Client Mention Formula` | multilineText |  |
| `Client ID` | number | Precision: 0 |
| `Stories Ready for Approval` | number | Precision: 0 |
| `Auto-send SO/SF` | checkbox | Color: cyanBright |
| `Issues by Chapter Leads` | singleLineText |  |
| `Move Stories` | checkbox | Color: greenBright |
| `Formula field for Productivity` | multilineText |  |
| `Sprints Productivity` | singleLineText |  |
| `Health Analysis` | richText |  |
| `Certificate of TIP Template` | multipleAttachments | Reversed: false |
| `Resources SO & SF Meeting` | singleLineText |  |
| `Resource Email *NO DELETE` | singleLineText |  |
| `Stories Pending Authorization` | number | Precision: 0 |
| `Talent Raiting` | singleLineText |  |
| `Stuck Stories` | number | Precision: 0 |
| `Stories Accepted by client` | number | Precision: 0 |
| `Next Sprint` | number | Precision: 0 |
| `Sprint Invoice Rollup (from Sprints)` | currency | Precision: 2; Symbol: $ |
| `Fecha de Inicio` | date | Date format: european |
| `Created` | date | Date format: friendly |
| `Stories Qty` | number | Precision: 0 |
| `Business Objectives` | multilineText |  |
| `Suggested New User Stories` | multilineText |  |
| `Bussiness Value Questions` | multilineText |  |
| `Accepted Stories in last 60d` | multilineText |  |
| `Count QA` | number | Precision: 0 |
| `Multi Approval (New Stories)` | checkbox | Color: greenBright |
| `Active Stories this week` | number | Precision: 0 |
| `Last Active Sprint` | number | Precision: 0 |
| `last sprint created` | number | Precision: 0 |
| `AI List Finished Stories` | multilineText |  |
| `AI List New Stories` | multilineText |  |
| `Impacts` | singleLineText |  |
| `Objectives` | singleLineText |  |
| `Assigned QA` | singleLineText |  |
| `Estatus` | singleSelect | Options: Onboarding Process, Ready for Approval, Active, Semi-Active (Admin), Inactive, Movimientos Internos / Otros |
| `Open Invoices` | number | Precision: 0 |
| `Minimum Level of engagement` | number | Precision: 0 |
| `Ideal Velocity` | number | Precision: 0 |
| `Average Velocity` | number | Precision: 0 |
| `Total Story Points` | number | Precision: 0 |
| `Stories without Rating by Client` | number | Precision: 0 |
| `Initial OKR Conversation with Client` | singleSelect | Options: Initial OKRs added to Singular Stories, Meeting with Client Upcoming to review OKRs, Waiting for Client Validation, Client Accepts OKRs, Whole team is Briefed on OKRs  and execution begins |
| `Multi Approval (Finished Stories)` | checkbox | Color: greenBright |
| `Trustworthiness per Client` | singleLineText |  |
| `Legal Client Name` | singleLineText |  |
| `Total Unused SPs` | number | Precision: 0 |
| `Finished SPs (from Sprints)` | singleLineText |  |
| `Projects Assets Hub` | singleLineText |  |
| `Project News` | singleLineText |  |
| `News Keywords` | singleLineText |  |
| `News Language` | singleLineText |  |
| `AI Week News Resume` | multilineText |  |
| `Gurman's opinion on the news` | multilineText |  |
| `Scrum Master` | multipleCollaborators |  |
| `Scrum Master Ref` | singleLineText |  |
| `QA` | singleLineText |  |
| `Features Reference` | singleLineText |  |
| `Chapter To Project Storie` | singleLineText |  |
| `E-mail PO` | singleLineText |  |
| `Email address (from Scrum Master Ref)` | singleLineText |  |
| `Scrum Master Name` | singleLineText |  |
| `Scrum Master Mail` | singleLineText |  |
| `Finished Stories List` | singleLineText |  |
| `Finished Stories Summary` | multilineText |  |
| `5 Epic Stories Suggested by AI` | multilineText |  |
| `Last sprint SF Date` | date | Date format: local |
| `favorite` | checkbox | Color: greenBright |
| `Pendings TW` | singleLineText |  |
| `Client Email` | singleLineText |  |
| `Client Name` | singleLineText |  |
| `Address Notification` | checkbox | Color: greenBright |
| `Resources` | singleLineText |  |
| `Talents Status` | multipleSelects | Options: Activo, Inactivo |
| `Project Stories Involving AI powered features` | multilineText |  |
| `Project has AI Stories` | singleSelect | Options: AI Stories, Regular Stories |
| `Total AI Stories by Project` | number | Precision: 0 |
| `Stories finish after QA` | multilineText |  |
| `Resources Compilación (de Stories)` | multilineText |  |
| `Project QA Compliance & Readiness Audit` | singleLineText |  |
| `QA Sprint Sign Off` | singleLineText |  |
| `To send` | singleLineText |  |
| `PO Assigned (from Sprints)` | singleLineText |  |
| `Unfinish sprints` | multilineText |  |
| `Epics Names` | multilineText |  |
| `CoS Matrix` | singleLineText |  |
| `Type Project` | singleSelect | Options: Old Project, New Project |
| `Sprint Price` | currency | Precision: 2; Symbol: $ |
| `Additional Sprint Cost` | currency | Precision: 2; Symbol: $ |
| `Share Percentage` | percent | Precision: 2 |
| `Resource Story Point Price` | currency | Precision: 2; Symbol: $ |
| `Remuneration Type` | singleSelect | Options: Value Remuneration, Typical |
| `Resource Exit` | singleLineText |  |
| `Sps Current Sprint` | number | Precision: 0 |
| `Value Points Current Sprint` | number | Precision: 0 |
| `Count Stories Current Sprint` | number | Precision: 0 |
| `Current Sprint Cost` | singleLineText |  |
| `Current Sprint Talent Bonus Pool` | singleLineText |  |
| `Current Sprint Gross Margin` | singleLineText |  |
| `Current Sprint Company Profit` | singleLineText |  |
| `Read Ai Ideation Sync` | singleLineText |  |
| `Welcome Email Sent` | checkbox | Color: greenBright |
| `Natural Person Email` | email |  |
| `Natural Person Name` | singleLineText |  |
| `Minimum Level of Engagement In Contract` | number | Precision: 0 |
| `is MLE Active` | checkbox | Color: greenBright |
| `Assigned Objectives` | singleLineText |  |
| `Workdays Rollup (from Sprints)` | number | Precision: 0 |
| `Nature of Issue by Project` | singleLineText |  |
| `PO Audit Review Feedback` | singleLineText |  |
| `Story Redaction Health Score` | percent | Precision: 2 |
| `Story Valuation Health Score` | percent | Precision: 2 |
| `Key Projects Names Banned Rollup (from Key Projects)` | multilineText |  |
| `urlKeyProjects` | url |  |
| `Avg Key Project Score` | percent | Precision: 2 |
| `Last Month Story Valuation Health Score` | percent | Precision: 2 |
| `Last Month Story Redaction Health Score` | percent | Precision: 2 |
| `Key Results` | singleLineText |  |
| `Avg Key Results Score` | percent | Precision: 0 |
| `Avg Objetives Score` | percent | Precision: 0 |
| `View Key Result Interface URL` | url |  |
| `Objetive Interface URL` | url |  |
| `MAP / PEP` | multilineText |  |
| `Project Brief v2` | singleLineText |  |
| `PO Email` | email |  |
| `Project Sentiment` | singleSelect | Options: Rose, Bud, Thorn |
| `stories count` | number | Precision: 0 |
| `Copilot Tier` | singleLineText |  |
| `Threshold Story Points (from Copilot Tier)` | number | Precision: 1 |
| `Price per Story Point (from Copilot Tier)` | currency | Precision: 2; Symbol: $ |
| `Tier Order (from Copilot Tier)` | number | Precision: 1 |
| `Active (from Copilot Tier)` | checkbox | Color: greenBright |
| `copilot_tiers` | singleLineText |  |
| `copilot_plan` | checkbox | Color: greenBright |

## Objective

Table ID: `tblGRc3HMuMKhQOub`
Primary field: `Name` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Name` | multilineText |  |
| `Priority` | singleLineText |  |
| `Type` | singleLineText |  |
| `AI suggested key results` | richText |  |
| `Objective` | richText |  |
| `Objetive Description` | richText |  |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `po_user` | multipleLookupValues | Lookup/link field: `fldarP0Jowtni01sk`; Linked field: `fldKPCBffB1OIMVi8`; Result type: singleCollaborator |
| `Target Date` | date | Date format: local |
| `Explanation` | richText |  |
| `Metric` | singleLineText |  |
| `Status` | singleSelect | Options: Pending Review, In Progress, Achieved, Underachieved |
| `Quarter` | multilineText |  |
| `No.` | number | Precision: 0 |
| `Key Results` | multipleRecordLinks | Linked table: `tblwSWyJl7p6NgYUA`; Reversed: false; Single record preferred: false |
| `Score Objetives` | number | Precision: 1 |
| `Record Id` | multilineText |  |

## Key Result

Table ID: `tblwSWyJl7p6NgYUA`
Primary field: `Name` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Name` | multilineText |  |
| `Key Result` | richText |  |
| `Objetive` | multipleRecordLinks | Linked table: `tblGRc3HMuMKhQOub`; Reversed: false; Single record preferred: true |
| `Metric` | singleLineText |  |
| `Explanation` | richText |  |
| `Target Date` | date | Date format: local |
| `Quarter` | multilineText |  |
| `Target Value` | percent | Precision: 2 |
| `Initial Value` | percent | Precision: 2 |
| `Current Value` | percent | Precision: 2 |
| `Progress` | percent | Precision: 0 |
| `Progress Number` | number | Precision: 1 |
| `Status` | singleSelect | Options: Todo, In progress, Done |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `No.` | number | Precision: 0 |
| `Created` | dateTime | Date format: local; Time format: 12hour; Timezone: America/Guatemala |
| `Score Key Result` | number | Precision: 1 |
| `Justification Score Key Result` | multilineText |  |
| `Written Explanation Score` | multilineText |  |
| `Key Results History` | singleLineText |  |
| `Record Id` | multilineText |  |
| `Last modified time` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `Rose-Bud-Thorn Segmentación y Razonamiento (AI)` | multilineText |  |
| `Rose-Bud-Thorn Segmentación (AI Select)` | singleSelect | Options: Rose, Bud, Thorn |
| `synced_from_okrs` | checkbox | Color: greenBright |

## Key Project

Table ID: `tblu9Jj3IFaDzAu3T`
Primary field: `ID` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `ID` | multilineText |  |
| `Epic Name` | richText |  |
| `Epic Story` | singleLineText |  |
| `Projects` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `Total Stories` | number | Precision: 0 |
| `AI Stories Assist` | richText |  |
| `Create` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `Epic Updated` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `Status` | singleSelect | Options: Active, Suggested by Resource, Archived |
| `Clarity` | number | Precision: 1 |
| `Strategic Focus` | number | Precision: 1 |
| `Value Orientation` | number | Precision: 1 |
| `finalScore` | number | Precision: 1 |
| `Justification` | multilineText |  |
| `Don't Show In Singular Stories` | checkbox | Color: greenBright |
| `Quality Score` | percent | Precision: 0 |
| `Estatus (from Projects)` | multipleLookupValues | Lookup/link field: `fldptooXL9QXPPf2t`; Linked field: `fldgCHQcPEN0KGlUO`; Result type: singleSelect |
| `Collaborator (from Projects)` | multipleLookupValues | Lookup/link field: `fldptooXL9QXPPf2t`; Linked field: `fldKPCBffB1OIMVi8`; Result type: singleCollaborator |

## chapter_story

Table ID: `tblvSHO0Fy0vGwGIt`
Primary field: `Id` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Id` | multilineText |  |
| `Auto number` | number | Precision: 0 |
| `User Story Name` | singleLineText |  |
| `Details` | multilineText |  |
| `Sub-stage` | singleSelect | Options: Ideation, Suggested by Resource, Pending Story Corrections, Pending Authorization by Client, Client Authorized Story Details (in queue), In Sprint, Pending Progress, In Progress, Stuck, Waiting for QA, Pending QA Corrections, Finished after QA, Accepted by Client |
| `Chapter Story AC` | multilineText |  |
| `Offer Criteria` | singleLineText |  |
| `Chapter` | multipleRecordLinks | Linked table: `tbltf4CU5Cx6EETtR`; Reversed: false; Single record preferred: true |
| `User (from Chapter)` | singleLineText |  |
| `Workshop` | singleLineText |  |
| `Tech` | singleSelect | Options: Flutter, Airtable, Flutterflow, Firebase, Java, Javascript, PandaDoc |
| `Story Point Estimation ` | number | Precision: 1 |
| `Story Point Estimation (Status)` | singleSelect | Options: Low, Medium, High |
| `Creation Date` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `Chapter To Project Storie` | singleLineText |  |
| `Bimester` | multilineText |  |
| `SP minimun` | number | Precision: 0 |
| `SP Maximun` | number | Precision: 0 |
| `Cumulative SP` | number | Precision: 0 |
| `Cumulative SP Sell` | number | Precision: 0 |
| `Missing accepted SP in Sells` | number | Precision: 0 |
| `Percentiles` | singleLineText |  |

## chapter_to_project_story

Table ID: `tblv0jsJ90f6gnwBg`
Primary field: `Id` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Id` | multilineText |  |
| `Auto number` | number | Precision: 0 |
| `Chapter` | multipleRecordLinks | Linked table: `tbltf4CU5Cx6EETtR`; Reversed: false; Single record preferred: true |
| `Chapter Story` | multipleRecordLinks | Linked table: `tblvSHO0Fy0vGwGIt`; Reversed: false; Single record preferred: true |
| `Chapter To Project Storie (Status)` | singleLineText |  |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `Project Brief Summary` | richText |  |
| `Project Project Summary` | richText |  |
| `Sprint` | singleLineText |  |
| `Talent` | multipleRecordLinks | Linked table: `tbltf4CU5Cx6EETtR`; Reversed: false; Single record preferred: true |
| `StoryPoints` | number | Precision: 0 |
| `Invoice Value` | currency | Precision: 2; Symbol: $ |
| `IA Suggestion Story to Sell` | richText |  |
| `IA Suggestion AC to Sell` | multilineText |  |
| `US As An to Sell` | multilineText |  |
| `US I Want To to Sell` | multilineText |  |
| `US So That to Sell` | multilineText |  |
| `US Acceptance Criteria to Sell` | multilineText |  |
| `Linked User Story` | singleLineText |  |
| `SPs (from Linked User Story)` | singleLineText |  |
| `Status (from Linked User Story)` | multipleSelects | Options: Ideation, Suggested by Resource, Pending Story Corrections, Pending Authorization by Client, Client Authorized Story Details (in queue), In Sprint Pending Progress, In Progress, Stuck, Waiting for QA, Waiting for QA Integration, Pending QA Corrections, Finished after QA, Accepted by Client, Paid |
| `Created At` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `Link to create Story` | multilineText |  |
| `Bimester` | multilineText |  |
| `IA Suggestion Story to Sell active` | richText |  |
| `IA Suggestion AC to Sell_prompt` | multilineText |  |
| `IA Suggestion AC to Sell generator` | url |  |
| `IA Suggestion AC to Sell_active` | richText |  |

## Chapters

Table ID: `tbl97gz8SS2lwgvdO`
Primary field: `Name` (singleLineText)

| Field | Type | Notes |
|---|---|---|
| `Name` | singleLineText |  |
| `Chapter Lead` | singleCollaborator |  |
| `Status` | singleSelect | Options: On, Off |
| `Chapter Types 2024` | singleLineText |  |
| `Types of Stories` | singleLineText |  |
| `Resources` | multipleRecordLinks | Linked table: `tbltf4CU5Cx6EETtR`; Reversed: false; Single record preferred: false |
| `Cohort History` | singleLineText |  |
| `Percentil avg TW` | percent | Precision: 0 |
| `Chapter's Utilization` | percent | Precision: 2 |
| `Chapters October IA (de Types of Stories)` | singleLineText |  |
| `Product Owner in Chapter` | singleLineText |  |
| `October IA Stories By Resource` | singleLineText |  |
| `Number of resources not participating in October AI` | number | Precision: 0 |
| `Number of total resources in this chapter` | number | Precision: 0 |
| `Participation Percentage in October AI by Chapter Lead` | percent | Precision: 0 |
| `Number of resources participating in October AI` | number | Precision: 0 |
| `October AI Stories Finished` | singleLineText |  |
| `October AI Winner` | singleLineText |  |
| `Chapter lead User` | multipleRecordLinks | Linked table: `tblKObDH5kY3qHllf`; Reversed: false; Single record preferred: true |
| `Chapter Slack ID` | singleLineText |  |
| `Percentil avg TW Rollup (from Resources)` | percent | Precision: 2 |
| `recordId` | multilineText |  |

## global_utilization

Table ID: `tblAGgsz3osgqVCLs`
Primary field: `Month` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Month` | multilineText |  |
| `Date` | date | Date format: european |
| `Total Daily Capacity` | number | Precision: 0 |
| `Total Monthly Capacity` | number | Precision: 0 |
| `Total SP Delivered` | number | Precision: 0 |
| `AVG Correction Cycles` | number | Precision: 2 |
| `Client Rating AVG ` | number | Precision: 2 |
| `Workdays Late` | number | Precision: 2 |
| `f` | percent | Precision: 0 |
| `Resources` | singleLineText |  |
| `cr` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `Mes` | singleSelect | Options: Abril, Mayo, Junio, Julio, Agosto, Septiembre, Octubre, Noviembre, Diciembre, Enero, Febrero, Marzo |
| `Admin FTEE` | number | Precision: 0 |
| `Talent FTEE` | number | Precision: 0 |
| `Total FTEE` | number | Precision: 0 |
| `Días Promedio de Contratación` | multilineText |  |
| `Calificación Promedio de Contratación` | number | Precision: 2 |
| `Indice de Reclutamiento` | multilineText |  |
| `Month Dif` | number | Precision: 0 |
| `Requests` | singleLineText |  |

## Impacts

Table ID: `tblGbMHDz7eeXMALp`
Primary field: `Name` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Name` | multilineText |  |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `SF Emails (from Project)` | singleLineText |  |
| `Email (from Project)` | singleLineText |  |
| `The "Project" achived` | singleLineText |  |
| `Date` | date | Date format: local |
| `AI Name` | richText |  |
| `Natural Name` | multilineText |  |
| `Quarter` | multilineText |  |
| `No.` | number | Precision: 0 |
| `PO` | singleLineText |  |

## Key Result History

Table ID: `tbl6vfKhWFgBgUVVJ`
Primary field: `Name` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Name` | multilineText |  |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `recordID (from Project)` | singleLineText |  |
| `Key Result` | multipleRecordLinks | Linked table: `tblwSWyJl7p6NgYUA`; Reversed: false; Single record preferred: false |
| `Objetive` | multipleRecordLinks | Linked table: `tblGRc3HMuMKhQOub`; Reversed: false; Single record preferred: true |
| `Email (from Project) (from Objetive)` | singleLineText |  |
| `Objective TXT` | richText |  |
| `Metric` | singleLineText |  |
| `Explanation` | richText |  |
| `Target Date` | date | Date format: local |
| `Target Value` | percent | Precision: 2 |
| `Initial Value` | percent | Precision: 2 |
| `Current Value` | percent | Precision: 2 |
| `Progress` | percent | Precision: 0 |
| `Progress Number` | number | Precision: 1 |
| `Status` | singleSelect | Options: Todo, In progress, Done |
| `Project (from Objetive)` | singleLineText |  |
| `PO (from Objetive)` | singleLineText |  |
| `No.` | number | Precision: 0 |
| `OKR Achieved in Quarter` | number | Precision: 0 |
| `OKR Achieved in Time` | singleSelect | Options: Achieved, Not Achieved |
| `Q` | number | Precision: 0 |
| `Quarter` | multilineText |  |
| `Score Key Result` | number | Precision: 1 |
| `Written Explanation Score` | multilineText |  |

## Migration Tracker

Table ID: `tblxO8liXdGP5jI9n`
Primary field: `#` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `#` | multilineText |  |
| `Table Name` | multilineText |  |
| `Module` | singleSelect | Options: A · Projects & Clients, B · People & Resources, C · Delivery, D · Trustworthiness, E · QA & Testing, F · OKR & Strategy, G · Financial, H · HR & People Ops, I · AI & Automation, J · Config & Framework |
| `Fields (MANTENER)` | number | Precision: 0 |
| `Weight (%)` | formula | Result type: percent |
| `Status` | singleSelect | Options: To Do, Done |

## Nature_of_Issue_by_Project

Table ID: `tblqVSu6KCRw2D1aW`
Primary field: `Nature of issue` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Nature of issue` | multilineText |  |
| `Created At` | date | Date format: local |
| `Description` | multilineText |  |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `QA` | singleLineText |  |
| `Status` | singleSelect | Options: Active, Inactive |
| `Number` | number | Precision: 0 |
| `recordID (from Project)` | singleLineText |  |

## Project_Brief

Table ID: `tblqDt1h0nfP5dWFm`
Primary field: `#` (number)

| Field | Type | Notes |
|---|---|---|
| `#` | number | Precision: 0 |
| `Projects` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `Product Owner` | singleLineText |  |
| `PO email address` | singleLineText |  |
| `Created` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `What's your idea called?` | singleLineText |  |
| `What's your name?` | singleLineText |  |
| `What is your idea about and what do you hope to accomplish with it?` | multilineText |  |
| `What platforms are you interested in building?` | multipleSelects | Options: Branding, Ecommerce, Mobile App, Web App, Website, Other, Not Sure |
| `What's the problem you would like your idea to solve?` | multilineText |  |
| `What is your unfair advantage?` | multilineText |  |
| `Do you want your idea to be its own business or an addition to an existing business?` | multilineText |  |
| `Who's in your team that will work with our product team to develop this idea? What are their responsibilities?` | multilineText |  |
| `Who is your target audience?` | multilineText |  |
| `Who are your local and international competitors?` | multilineText |  |
| `What's your ideal time to market?` | singleSelect | Options: Less than 3 months, Less than a month, Less than 6 months, No defined timeline |
| `Other details regarding you ideal time to market` | richText |  |
| `What's your monetization strategy?` | multilineText |  |
| `Upload any materials you have of your idea. Wireframes, presentations, APKs, etc.` | multipleAttachments | Reversed: false |
| `Enter any relevant links.` | url |  |
| `How familiar are you with agile and scrum?` | singleSelect | Options: 1 Not familiar at all, 2, 3 Somewhat familiar, 4, 5 Extremely familiar |
| `Where are you located? (We pride ourselves in working with people from all over the world and have an interactive map for future clients!)` | singleLineText |  |
| `At what Stage of the idea are you currently?` | singleSelect | Options: Ideation, Prototyping, MVP, Mature Platform, User base is growing, Looking for a version 2, after reaching critical mass |
| `Last Modified By` | singleCollaborator |  |
| `User Table` | singleLineText |  |
| `Auto Executive Summary` | richText |  |
| `Elevator Pitch` | richText |  |
| `Questions for first Meeting` | richText |  |
| `High Level Summary` | multilineText |  |
| `News keywords` | richText |  |
| `Project Brief Updated` | dateTime | Date format: local; Time format: 12hour; Timezone: client |
| `TimeZone` | singleLineText |  |

## Project_Brief_v2

Table ID: `tbloKzGM2lWnuljL2`
Primary field: `Id` (number)

| Field | Type | Notes |
|---|---|---|
| `Id` | number | Precision: 0 |
| `Stage of Project` | singleLineText |  |
| `Stage of Project AI Interpretation` | singleSelect | Options: Ideation, Prototype, MVP, Live, Modernization, Unknown |
| `Urgency` | singleLineText |  |
| `Urgency AI Interpretation` | singleSelect | Options: 0–1 month, 1–3 months, 3–6 months, 6–12 months, 12+ months, Unknown |
| `Problem to Solve` | multilineText |  |
| `Problem to Solve AI Interpretation` | multilineText |  |
| `Differentiator` | multilineText |  |
| `Differentiator AI Interpretation` | multilineText |  |
| `Desired Outcomes` | multilineText |  |
| `AI Assist Interpretation` | multilineText |  |
| `Stakeholders` | multilineText |  |
| `Target Users` | multilineText |  |
| `Competitors / Benchmarks` | multilineText |  |
| `Solution Type` | singleLineText |  |
| `Constraints` | multilineText |  |
| `Materials` | singleLineText |  |
| `ICP Segmentation` | singleLineText |  |
| `Projects` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |

## Project_news

Table ID: `tblZUHRWMevQPbTNu`
Primary field: `Title` (singleLineText)

| Field | Type | Notes |
|---|---|---|
| `Title` | singleLineText |  |
| `Date` | date | Date format: local |
| `Short Description` | multilineText |  |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `SF Emails (from Project)` | singleLineText |  |
| `ProjectRecordID` | singleLineText |  |
| `Image` | multipleAttachments | Reversed: false |
| `URL` | url |  |
| `Show` | checkbox | Color: greenBright |

## Projects_Assets_Hub  

Table ID: `tbl9Af5W7w4984bum`
Primary field: `ID Name` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `ID Name` | multilineText |  |
| `Name` | singleLineText |  |
| `Type` | singleSelect | Options: Build, Development, Design, Legal, Other |
| `Project` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: true |
| `Email (from Project)` | singleLineText |  |
| `SF Emails (from Project)` | singleLineText |  |
| `Sprints` | singleLineText |  |
| `BuildSummary (from Sprints)` | singleLineText |  |
| `Propuestas y Contratos (from Project)` | multipleAttachments | Reversed: false |
| `Attachments` | multipleAttachments | Reversed: false |
| `URL` | url |  |
| `Notes` | richText |  |
| `QR Code` | multipleAttachments | Reversed: false |
| `Project Brief v2` | multipleRecordLinks | Linked table: `tbloKzGM2lWnuljL2`; Reversed: false; Single record preferred: false |

## Realeses

Table ID: `tbltCcrmvPhIKEAOp`
Primary field: `Release` (multilineText)

| Field | Type | Notes |
|---|---|---|
| `Release` | multilineText |  |
| `Status` | singleSelect | Options: Pending, Waiting for QA, Pending QA Corrections, Finished After QA, Accepted by Client |
| `Version` | multilineText |  |
| `Major Change #` | number | Precision: 0 |
| `Number (from Sprint)` | singleLineText |  |
| `Patch #` | number | Precision: 0 |
| `Features` | singleLineText |  |
| `User Stories (from Features)` | singleLineText |  |
| `Sprint` | singleLineText |  |
| `Project (from Sprint)` | singleLineText |  |
| `Release Summary` | richText |  |
| `Project` | multilineText |  |
| `User Stories` | multilineText |  |
| `Sprint_txt` | multilineText |  |

## Resource

Table ID: `tbltf4CU5Cx6EETtR`
Primary field: `Colaborador` (singleLineText)

| Field | Type | Notes |
|---|---|---|
| `Colaborador` | singleLineText |  |
| `Status` | singleSelect | Options: Activo, Inactivo |
| `Departamento` | multipleSelects | Options: Management, Design, Development, Comercial, General Management, Sales, Marketing, QA, Agile Delivery Manager |
| `Fotografia` | multipleAttachments | Reversed: false |
| `Email address` | email |  |
| `User Table` | multipleRecordLinks | Linked table: `tblKObDH5kY3qHllf`; Reversed: false; Single record preferred: false |
| `Projects` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: false |

## User Resource

Table ID: `tblKObDH5kY3qHllf`
Primary field: `Name` (singleLineText)

| Field | Type | Notes |
|---|---|---|
| `Name` | singleLineText |  |
| `E-mail` | email |  |
| `Role` | singleSelect | Options: Team Admin, Client, Talent, UI-UX / QA, Product Owner |
| `Status` | singleSelect | Options: Todo, In progress, Done |
| `Assigned Projects` | multipleRecordLinks | Linked table: `tblAlkEe98l952t7v`; Reversed: false; Single record preferred: false |
| `Resources` | multipleRecordLinks | Linked table: `tbltf4CU5Cx6EETtR`; Reversed: false; Single record preferred: false |
| `Is Active` | checkbox | Color: greenBright |

