import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getTagListParamSchema = z.object({
  limit: z.number().optional().describe('Number of tags to retrieve per page (optional)'),
  offset: z.number().optional().describe('Offset for pagination (optional)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetTagListParam = z.infer<typeof getTagListParamSchema>;
