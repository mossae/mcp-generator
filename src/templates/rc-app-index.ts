export const rcAppIndexTemplate = `import {
  IAppAccessors,
  IConfigurationExtend,
  ILogger,
  IRead,
  IHttp,
  IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import { IMessage, IPostMessageSent } from "@rocket.chat/apps-engine/definition/messages";

const CALLBACK_URL = process.env.MCP_CALLBACK_URL ?? "http://localhost:4000/events";

export class EventBridgeApp extends App implements IPostMessageSent {
  constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
    super(info, logger, accessors);
  }

  async executePostMessageSent(
    message: IMessage,
    read: IRead,
    http: IHttp,
    persistence: IPersistence,
  ): Promise<void> {
{{{handlerBlocks}}}
  }
}
`;
