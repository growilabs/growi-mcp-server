import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const listRevisionsParamSchema = z.object({
  pageId: z.string().describe('Page ID to get revisions for'),
  limit: z.number().optional().describe('Number of revisions to retrieve per page (optional)'),
  offset: z.number().optional().describe('Offset for pagination (optional)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type ListRevisionsParam = z.infer<typeof listRevisionsParamSchema>;
