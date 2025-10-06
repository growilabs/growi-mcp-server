import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getUserRecentPagesParamSchema = z.object({
  userId: z.string().describe('User ID to get recent pages for'),
  limit: z.number().optional().describe('Number of pages to retrieve per page (optional)'),
  offset: z.number().optional().describe('Offset for pagination (optional)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetUserRecentPagesParam = z.infer<typeof getUserRecentPagesParamSchema>;
