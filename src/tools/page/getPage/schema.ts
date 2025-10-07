import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getPageParamSchema = z.object({
  pageId: z.string().optional().describe('ID of the GROWI page'),
  path: z.string().optional().describe('Path of the GROWI page'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetPageParam = z.infer<typeof getPageParamSchema>;
