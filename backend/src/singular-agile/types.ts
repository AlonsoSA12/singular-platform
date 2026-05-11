export type SingularAgileCreateStatus =
  | "created"
  | "validation_failed"
  | "create_failed";

export type SingularAgileUpdateStatus =
  | "updated"
  | "validation_failed"
  | "update_failed";

export type SingularAgileFieldIssue = {
  field: string;
  message: string;
};

export type SingularAgileCreateKeyProjectResult = {
  ok: boolean;
  status: SingularAgileCreateStatus;
  created: boolean;
  tableName: string;
  acceptedFields: string[];
  unknownFields: string[];
  missingRequiredFields: string[];
  invalidFields: SingularAgileFieldIssue[];
  record?: {
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  };
  message?: string;
};

export type SingularAgileCreateKeyResultResult = {
  ok: boolean;
  status: SingularAgileCreateStatus;
  created: boolean;
  tableName: string;
  acceptedFields: string[];
  unknownFields: string[];
  missingRequiredFields: string[];
  invalidFields: SingularAgileFieldIssue[];
  record?: {
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  };
  message?: string;
};

export type SingularAgileCreateObjectiveResult = {
  ok: boolean;
  status: SingularAgileCreateStatus;
  created: boolean;
  tableName: string;
  acceptedFields: string[];
  unknownFields: string[];
  missingRequiredFields: string[];
  invalidFields: SingularAgileFieldIssue[];
  record?: {
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  };
  message?: string;
};

export type SingularAgileUpdateObjectiveResult = {
  ok: boolean;
  status: SingularAgileUpdateStatus;
  updated: boolean;
  tableName: string;
  acceptedFields: string[];
  unknownFields: string[];
  missingRequiredFields: string[];
  invalidFields: SingularAgileFieldIssue[];
  record?: {
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  };
  message?: string;
};

export type SingularAgileUpdateKeyResultResult = {
  ok: boolean;
  status: SingularAgileUpdateStatus;
  updated: boolean;
  tableName: string;
  acceptedFields: string[];
  unknownFields: string[];
  missingRequiredFields: string[];
  invalidFields: SingularAgileFieldIssue[];
  record?: {
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  };
  message?: string;
};

export type SingularAgileUpdateKeyProjectResult = {
  ok: boolean;
  status: SingularAgileUpdateStatus;
  updated: boolean;
  tableName: string;
  acceptedFields: string[];
  unknownFields: string[];
  missingRequiredFields: string[];
  invalidFields: SingularAgileFieldIssue[];
  record?: {
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  };
  message?: string;
};
