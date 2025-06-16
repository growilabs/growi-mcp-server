import type { FastMCP } from 'fastmcp';
import { registerCreateShareLinkTool } from './createShareLink/index.js';
import { registerDeleteShareLinkByIdTool } from './deleteShareLinkById/index.js';
import { registerDeleteShareLinksTool } from './deleteShareLinks/index.js';

export function loadShareLinksTools(server: FastMCP): void {
  registerCreateShareLinkTool(server);
  registerDeleteShareLinksTool(server);
  registerDeleteShareLinkByIdTool(server);
}
