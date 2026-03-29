#!/usr/bin/env node

import { program } from "commander";
import { generateCommand } from "@/cli/commands/generate";
import { listCommand } from "@/cli/commands/list";
import { measureCommand } from "@/cli/commands/measure";

program
  .name("mcp-generator")
  .description("Generate minimal MCP servers with only the tools your project needs")
  .version("0.1.0");

program.addCommand(generateCommand);
program.addCommand(listCommand);
program.addCommand(measureCommand);

program.parse();
