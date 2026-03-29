import type { WorkflowTemplate } from "@/types/workflow-template";

export interface ApiEndpoint {
  operationId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  summary: string;
  description?: string;
  category: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  requiresAuth: boolean;
}

export interface ApiParameter {
  name: string;
  in: "query" | "path" | "header";
  description: string;
  required: boolean;
  type: string;
}

export interface ApiRequestBody {
  contentType: string;
  schema: Record<string, unknown>;
  required: boolean;
}

export type AuthScheme =
  | { type: "token"; headerName: string; userIdHeader: string }
  | { type: "oauth"; provider: string }
  | { type: "apiKey"; headerName: string };

export interface EventSystemSpec {
  transport: "websocket" | "webhook" | "sse";
  connectionUrl: string;
  eventTypes: string[];
}

export interface ApiCategory {
  id: string;
  label: string;
  description: string;
  operationIds: string[];
}

export interface ProviderSpec {
  name: string;
  displayName: string;
  baseUrl: string;
  authScheme: AuthScheme;
  eventSystem?: EventSystemSpec;
  categories: ApiCategory[];
  endpoints: ApiEndpoint[];
  workflowTemplates: WorkflowTemplate[];
}
