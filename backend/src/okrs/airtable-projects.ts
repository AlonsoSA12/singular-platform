import { fetchAirtableRecords } from "../airtable/client.js";
import { getAgileAirtableConnection } from "../airtable/config.js";
import { mapAgileProject } from "./airtable-mappers.js";
import { normalizeEmail } from "./airtable-utils.js";

export async function listAgileProjectsForCollaborator(collaboratorEmail: string) {
  const normalizedCollaboratorEmail = normalizeEmail(collaboratorEmail);
  const agileConnection = getAgileAirtableConnection();
  const records = await fetchAirtableRecords(agileConnection.projectsTableName, {
    apiToken: agileConnection.apiToken,
    baseId: agileConnection.baseId
  });
  const projects = records
    .map(mapAgileProject)
    .filter((project) => project.collaborator.email === normalizedCollaboratorEmail)
    .filter((project) => !project.status || project.status === "Active")
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

  return {
    collaboratorEmail: normalizedCollaboratorEmail,
    projects,
    recordCount: projects.length,
    tableName: agileConnection.projectsTableName
  };
}
