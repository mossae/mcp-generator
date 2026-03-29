/**
 * WorkflowTemplate is the core type that differentiates this generator from
 * simple API wrapper generators. It encodes decision logic, error handling
 * strategies, and rollback hooks that produce MCP tools with real business
 * logic — not just sequenced API calls.
 */

export interface WorkflowStep {
  /** Unique step identifier within the workflow */
  id: string;
  /** Human-readable description of what this step does */
  description: string;
  /** The API operation to call (e.g., "users.info", "channels.invite") */
  operationId: string;
  /** Maps step input fields to sources: literal values, tool inputs, or previous step outputs */
  inputMapping: Record<string, InputSource>;
  /** Steps that must complete before this one runs */
  dependsOn?: string[];
}

export type InputSource =
  | { type: "toolInput"; field: string }
  | { type: "stepOutput"; stepId: string; path: string }
  | { type: "literal"; value: unknown }
  | { type: "expression"; expr: string };

export interface DecisionPoint {
  /** The step after which this decision is evaluated */
  afterStep: string;
  /** TypeScript expression that evaluates to boolean */
  condition: string;
  /** Steps to execute when condition is true */
  ifTrue: string[];
  /** Steps to execute when condition is false */
  ifFalse: string[];
}

export type ErrorStrategy = "retry" | "skip" | "rollback" | "fail";

export interface ErrorHandler {
  /** The step this handler applies to */
  forStep: string;
  /** How to handle failure */
  strategy: ErrorStrategy;
  /** Max retry attempts (only for "retry" strategy) */
  maxRetries?: number;
  /** Steps to run on rollback (only for "rollback" strategy) */
  rollbackSteps?: string[];
}

export interface RollbackHook {
  /** The step that triggers rollback on failure */
  triggerOnFailure: string;
  /** Steps to execute for rollback, in order */
  steps: WorkflowStep[];
}

export interface ToolInputParam {
  name: string;
  type: "string" | "number" | "boolean" | "string[]";
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface WorkflowTemplate {
  /** Unique workflow identifier (e.g., "onboard-team-member") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Natural language description of what the workflow does */
  intent: string;
  /** Keywords for fuzzy search matching */
  keywords: string[];
  /** The MCP tool name that will be generated */
  toolName: string;
  /** Description shown in the MCP tool definition */
  toolDescription: string;
  /** Input parameters for the generated MCP tool */
  inputs: ToolInputParam[];
  /** Ordered steps of the workflow */
  steps: WorkflowStep[];
  /** Branching logic between steps */
  decisionPoints: DecisionPoint[];
  /** Per-step error handling strategies */
  errorHandlers: ErrorHandler[];
  /** Rollback hooks for critical failures */
  rollbackHooks: RollbackHook[];
  /** API operations used (for token counting and dependency tracking) */
  requiredOperations: string[];
  /** Whether this workflow needs real-time events (RC App) */
  needsEventBridge: boolean;
  /** Event subscriptions if needsEventBridge is true */
  eventSubscriptions?: EventSubscription[];
}

export interface EventSubscription {
  /** Event type (e.g., "message", "user-joined", "mention") */
  event: string;
  /** Filter condition (e.g., "mention includes @support") */
  filter?: string;
  /** Workflow step to trigger when event fires */
  triggerStep: string;
}
