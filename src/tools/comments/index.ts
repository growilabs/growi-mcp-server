import type { FastMCP } from 'fastmcp';
import { registerAddCommentTool } from './addComment';
import { registerGetCommentsTool } from './getComments';
import { registerRemoveCommentTool } from './removeComment';

export async function loadCommentsTools(server: FastMCP): Promise<void> {
  registerGetCommentsTool(server);
  registerAddCommentTool(server);
  registerRemoveCommentTool(server);
}
