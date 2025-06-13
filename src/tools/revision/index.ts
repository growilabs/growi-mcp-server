import type { FastMCP } from 'fastmcp';
import { registerListRevisionsTool } from './listRevisions';

export function loadRevisionTools(server: FastMCP): void {
  registerListRevisionsTool(server);
}
