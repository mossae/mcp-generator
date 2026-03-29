import type { WorkflowTemplate } from "@/types";

export interface RcAppManifest {
  id: string;
  version: string;
  requiredApiVersion: string;
  name: string;
  nameSlug: string;
  description: string;
  classFile: string;
}

export function buildAppManifest(
  serverName: string,
  workflows: WorkflowTemplate[],
): RcAppManifest {
  const slug = serverName.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const eventWorkflows = workflows.filter((w) => w.needsEventBridge);
  const eventTypes = new Set<string>();

  for (const w of eventWorkflows) {
    for (const sub of w.eventSubscriptions ?? []) {
      eventTypes.add(sub.event);
    }
  }

  return {
    id: `${slug}-event-bridge`,
    version: "1.0.0",
    requiredApiVersion: "^1.4.0",
    name: `${serverName} Event Bridge`,
    nameSlug: slug,
    description: `Event bridge for ${serverName}. Listens for: ${[...eventTypes].join(", ")}`,
    classFile: "dist/index.js",
  };
}
