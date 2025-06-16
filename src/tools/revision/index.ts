import type { FastMCP } from 'fastmcp';
import { registerGetRevisionTool } from './getRevision';
import { registerListRevisionsTool } from './listRevisions';

export function loadRevisionTools(server: FastMCP): void {
  registerListRevisionsTool(server);
  registerGetRevisionTool(server);
}
