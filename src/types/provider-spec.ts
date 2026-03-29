/**
 * ProviderSpec defines the generic platform contract.
 * Rocket.Chat is the first implementation, but Slack, Mattermost, GitHub
 * could plug in with their own ProviderSpec without touching core logic.
 */

import type { WorkflowTemplate } from "./workflow-template.js";

export interface ApiEndpoint {
  /** Unique operation ID (e.g., "chat.postMessage") */
  operationId: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** URL path (e.g., "/api/v1/chat.postMessage") */
  path: string;
  /** Human-readable summary */
  summary: string;
  /** Detailed description */
  description?: string;
  /** Logical category (e.g., "messaging", "channels") */
  category: string;
  /** Request parameters */
  parameters: ApiParameter[];
  /** Request body schema (for POST/PUT) */
  requestBody?: ApiRequestBody;
  /** Whether this endpoint requires authentication */
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
  /** Transport type for real-time events */
  transport: "websocket" | "webhook" | "sse";
  /** Connection URL pattern */
  connectionUrl: string;
  /** Available event types */
  eventTypes: string[];
}

export interface ApiCategory {
  id: string;
  label: string;
  description: string;
  operationIds: string[];
}

export interface ProviderSpec {
  /** Provider identifier (e.g., "rocketchat") */
  name: string;
  /** Display name */
  displayName: string;
  /** Base URL pattern */
  baseUrl: string;
  /** Authentication scheme */
  authScheme: AuthScheme;
  /** Real-time event system (optional) */
  eventSystem?: EventSystemSpec;
  /** All API categories */
  categories: ApiCategory[];
  /** All API endpoints */
  endpoints: ApiEndpoint[];
  /** All curated workflow templates */
  workflowTemplates: WorkflowTemplate[];
}
