import type { WorkflowTemplate } from "@/types";

export const roomListing: WorkflowTemplate = {
  id: "room-listing",
  name: "Room Listing",
  intent: "Fetch all rooms the user is part of, including channels and groups.",
  keywords: ["list", "rooms", "channels", "groups", "fetch rooms", "show rooms"],
  toolName: "rc_list_rooms",
  toolDescription: "List all rooms the current user is a member of, including public/private channels and groups.",
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
