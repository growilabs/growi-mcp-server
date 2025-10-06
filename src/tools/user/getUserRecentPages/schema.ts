import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getUserRecentPagesParamSchema = z.object({
  id: z.string().describe('User ID to get recent pages for'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetUserRecentPagesParam = z.infer<typeof getUserRecentPagesParamSchema>;
