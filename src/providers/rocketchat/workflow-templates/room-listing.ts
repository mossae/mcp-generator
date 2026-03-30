import type { WorkflowTemplate } from "@/types";

export const roomListing: WorkflowTemplate = {
  id: "room-listing",
  name: "Room Listing",
  intent: "List all rooms and channels the user has access to with filtered fields",
  keywords: ["list", "rooms", "channels", "groups", "fetch rooms", "show rooms"],
  toolName: "rc_list_rooms",
  toolDescription: "List all rooms the current user is a member of. Returns only id, name, and type per room — not the full raw API response.",
  inputs: [],
  steps: [
    {
      id: "get-rooms",
      description: "Fetch the list of rooms",
      operationId: "rooms.get",
      inputMapping: {},
    },
  ],
  decisionPoints: [],
  errorHandlers: [
    { forStep: "get-rooms", strategy: "fail" },
  ],
  rollbackHooks: [],
  requiredOperations: ["rooms.get"],
  needsEventBridge: false,
};
