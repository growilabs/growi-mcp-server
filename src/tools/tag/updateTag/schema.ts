import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const updateTagParamSchema = z.object({
  pageId: z.string().describe('Page ID to update tags for'),
  revisionId: z.string().describe('Revision ID of the page'),
  tags: z.array(z.string()).describe('Array of tag names to set for the page'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});
