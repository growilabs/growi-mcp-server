import type { FastMCP } from 'fastmcp';
import { registerGrowiPageResource } from './growiPageResource.js';
// Import other resource definition files here in the future
// import { registerAnotherResource } from './anotherResource.js';

export async function loadResources(server: FastMCP): Promise<void> {
  // Current resource registration
  registerGrowiPageResource(server);

  // Add other resource registration functions here in the future
  // registerAnotherResource(server);
}
