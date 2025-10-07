import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getPageListingChildrenParamSchema = z.object({
  id: z.string().optional().describe('Page ID to get children for (optional)'),
  path: z.string().optional().describe('Page path to get children for (optional)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetPageListingChildrenParam = z.infer<typeof getPageListingChildrenParamSchema>;
