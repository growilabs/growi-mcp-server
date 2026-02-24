import type { FastMCP } from 'fastmcp';
import { registerSuggestPathTool } from './suggestPath/index.js';

export function loadAiToolsTools(server: FastMCP): void {
  registerSuggestPathTool(server);
}
