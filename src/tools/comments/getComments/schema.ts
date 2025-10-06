import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getCommentsParamSchema = z.object({
  pageId: z.string().describe('ID of the page to get comments for'),
  revisionId: z.string().optional().describe('ID of the revision to get comments for (optional)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetCommentsParam = z.infer<typeof getCommentsParamSchema>;
