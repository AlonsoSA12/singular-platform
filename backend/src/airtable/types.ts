export type AirtableRecord = {
  createdTime?: string;
  id: string;
  fields: Record<string, unknown>;
};

export type AirtableResponse = {
  offset?: string;
  records: AirtableRecord[];
};

export type AirtableCollaborator = {
  email?: string;
  id?: string;
  name?: string;
};

