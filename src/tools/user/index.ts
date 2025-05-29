import type { FastMCP } from 'fastmcp';
import { registerRegisterUserTool } from './registerUser';

export async function loadUserTools(server: FastMCP): Promise<void> {
  registerRegisterUserTool(server);
}
