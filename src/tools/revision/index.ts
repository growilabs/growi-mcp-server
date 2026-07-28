import type { FastMCP } from 'fastmcp';
import { registerGetRevisionTool } from './getRevision';
import { registerGetRevisionDiffsTool } from './getRevisionDiffs';
import { registerListRevisionChangesTool } from './listRevisionChanges';
import { registerListRevisionsTool } from './listRevisions';

export function loadRevisionTools(server: FastMCP): void {
  registerListRevisionsTool(server);
  registerGetRevisionTool(server);
  registerListRevisionChangesTool(server);
  registerGetRevisionDiffsTool(server);
}
