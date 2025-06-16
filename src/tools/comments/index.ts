import type { FastMCP } from 'fastmcp';
import { registerGetCommentsTool } from './getComments';

export async function loadCommentsTools(server: FastMCP): Promise<void> {
  registerGetCommentsTool(server);
}
