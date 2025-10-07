import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const pageListingInfoParamSchema = z.object({
  pageIds: z.array(z.string()).optional().describe('Array of page IDs to get summary information for (One of `pageIds` or `path` must be provided)'),
  path: z.string().optional().describe('Path of the page to get summary information for (One of `pageIds` or `path` must be provided)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});
