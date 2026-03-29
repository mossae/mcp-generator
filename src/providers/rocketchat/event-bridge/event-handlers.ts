import type { WorkflowTemplate, EventSubscription } from "@/types";

export interface EventHandlerDef {
  event: string;
  filter: string | undefined;
  workflowId: string;
  triggerStep: string;
  methodName: string;
}

export function extractEventHandlers(workflows: WorkflowTemplate[]): EventHandlerDef[] {
  const handlers: EventHandlerDef[] = [];

  for (const w of workflows) {
    if (!w.needsEventBridge || !w.eventSubscriptions) continue;

    for (const sub of w.eventSubscriptions) {
      handlers.push({
        event: sub.event,
        filter: sub.filter,
        workflowId: w.id,
        triggerStep: sub.triggerStep,
        methodName: `on${capitalize(sub.event.replace(/[^a-zA-Z]/g, ""))}For${pascalCase(w.id)}`,
      });
    }
  }

  return handlers;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pascalCase(s: string): string {
  return s
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
