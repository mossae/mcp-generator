import type { WorkflowTemplate } from "../../../types/index.js";

export const fileSharing: WorkflowTemplate = {
  id: "file-sharing",
  name: "File Sharing",
  intent: "Upload files to a room and notify the channel about the shared content",
  keywords: [
    "file", "upload", "share", "attachment", "document",
    "image", "send file",
  ],
  toolName: "rc_share_file",
  toolDescription: "Upload a file to a room and post a notification message about the shared content.",
  inputs: [
    { name: "roomId", type: "string", description: "Room to upload to", required: true },
    { name: "filePath", type: "string", description: "Local file path to upload", required: true },
    { name: "description", type: "string", description: "File description", required: false },
    { name: "notifyMessage", type: "string", description: "Message to post about the file", required: false },
  ],
  steps: [
    {
      id: "get-room",
      description: "Verify the target room exists",
      operationId: "rooms.info",
      inputMapping: {
        roomId: { type: "toolInput", field: "roomId" },
      },
    },
    {
      id: "upload-file",
      description: "Upload the file to the room",
      operationId: "rooms.upload",
      inputMapping: {
        file: { type: "toolInput", field: "filePath" },
        description: { type: "toolInput", field: "description" },
      },
      dependsOn: ["get-room"],
    },
    {
      id: "notify-channel",
      description: "Post a notification about the shared file",
      operationId: "chat.postMessage",
      inputMapping: {
        roomId: { type: "toolInput", field: "roomId" },
        text: { type: "expression", expr: "notifyMessage || `File shared: ${description}`" },
      },
      dependsOn: ["upload-file"],
    },
  ],
  decisionPoints: [],
  errorHandlers: [
    { forStep: "get-room", strategy: "fail" },
    { forStep: "upload-file", strategy: "fail" },
    { forStep: "notify-channel", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["rooms.info", "rooms.upload", "chat.postMessage"],
  needsEventBridge: false,
};
