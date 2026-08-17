export const INTEGRATION_SCHEMA_VERSION = "1.0.0" as const;

export type IntegrationTarget = "ITSM" | "POP" | "SAP" | "AMS" | "SLACK";
export type IntegrationSyncStatus = "not_connected" | "pending" | "synced" | "failed";

export type IntegrationField = {
  key: string;
  label: string;
  value: string;
};

export type ExternalReference = {
  system: IntegrationTarget;
  externalId: string;
  status: string;
  lastSyncedAt?: string;
};

export type IntegrationEnvelope = {
  schemaVersion: typeof INTEGRATION_SCHEMA_VERSION;
  source: "workplace-portal";
  requestId: string;
  idempotencyKey: string;
  correlationId: string;
  createdAt: string;
  channel: "web" | "slack" | "teams" | "email";
  actor: {
    type: "employee" | "contractor";
    subjectId?: string;
    departmentCode?: string;
  };
  catalog: {
    categoryCode: string;
    itemCode: string;
  };
  request: {
    title: string;
    priority: "일반" | "긴급";
    location: string;
    description: string;
    fields: IntegrationField[];
  };
  workflow: {
    status: "접수" | "처리 중" | "완료";
    route?: string;
    approval?: string;
    sla: string;
  };
  sync: {
    status: IntegrationSyncStatus;
    externalReferences: ExternalReference[];
  };
};

type CreateIntegrationEnvelopeInput = {
  requestId: string;
  categoryCode: string;
  itemCode: string;
  title: string;
  priority: "일반" | "긴급";
  location: string;
  description: string;
  fields?: Array<{ key?: string; label: string; value: string }>;
  route?: string;
  approval?: string;
  sla: string;
  actor?: IntegrationEnvelope["actor"];
  channel?: IntegrationEnvelope["channel"];
  createdAt?: string;
};

export function createIntegrationEnvelope(input: CreateIntegrationEnvelopeInput): IntegrationEnvelope {
  return {
    schemaVersion: INTEGRATION_SCHEMA_VERSION,
    source: "workplace-portal",
    requestId: input.requestId,
    idempotencyKey: `workplace:${input.requestId}`,
    correlationId: input.requestId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    channel: input.channel ?? "web",
    actor: input.actor ?? { type: "employee" },
    catalog: {
      categoryCode: input.categoryCode,
      itemCode: input.itemCode,
    },
    request: {
      title: input.title,
      priority: input.priority,
      location: input.location,
      description: input.description,
      fields: (input.fields ?? []).map((field) => ({
        key: field.key ?? field.label,
        label: field.label,
        value: field.value,
      })),
    },
    workflow: {
      status: "접수",
      route: input.route,
      approval: input.approval,
      sla: input.sla,
    },
    sync: {
      status: "not_connected",
      externalReferences: [],
    },
  };
}
