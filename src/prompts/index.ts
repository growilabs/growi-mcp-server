import type { FastMCP } from 'fastmcp';
import { registerSummarizePagePrompt } from './summarizePagePrompt.js';
// Other prompt definition files can be imported here

export async function loadPrompts(server: FastMCP): Promise<void> {
  // Register each prompt
  registerSummarizePagePrompt(server);
  // Additional prompt registrations can be added in the future
  // Example: await registerAnotherPrompt(server);
}
