import { createAirtableRecord, fetchAirtableRecords } from "../airtable/client.js";
import { getAgileAirtableConnection } from "../airtable/config.js";
import { mapAgileKeyProject } from "./airtable-mappers.js";
import {
  compactAirtableCreateFields,
  getOptionalKeyProjectStatus,
  requireNonEmptyString
} from "./airtable-utils.js";
import type { CreateAgileKeyProjectInput } from "./types.js";

export async function listAgileKeyProjectsForProject(projectId: string) {
  const agileConnection = getAgileAirtableConnection();
  const records = await fetchAirtableRecords(agileConnection.keyProjectTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });
  const keyProjects = records
    .map(mapAgileKeyProject)
    .filter((keyProject) => keyProject.projectIds.includes(projectId))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

  return {
    keyProjects,
    projectId,
    recordCount: keyProjects.length,
    tableName: agileConnection.keyProjectTableName
  };
}

export async function createAgileKeyProject(input: CreateAgileKeyProjectInput) {
  const agileConnection = getAgileAirtableConnection();
  const name = requireNonEmptyString(input.name, "Key Project Name");
  const projectId = requireNonEmptyString(input.projectId, "Project");
  const status = getOptionalKeyProjectStatus(input.status) ?? "Suggested by Resource";

  const record = await createAirtableRecord(
    agileConnection.keyProjectTableName,
    compactAirtableCreateFields({
      "Don't Show In Singular Stories": input.dontShowInSingularStories === true,
      "Epic Name": name,
      "Epic Story": input.epicStory?.trim() ?? "",
      "Justification": input.justification?.trim() ?? "",
      "Projects": [projectId],
      "Status": status,
      "Total Stories": input.totalStories ?? null
    }),
    {
      apiToken: agileConnection.apiToken,
      baseId: agileConnection.baseId
    }
  );

  return {
    keyProject: mapAgileKeyProject(record),
    projectId,
    tableName: agileConnection.keyProjectTableName
  };
}
