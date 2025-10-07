import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getPageInfoParamSchema = z.object({
  pageId: z.string().describe('ID of the GROWI page'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetPageInfoParam = z.infer<typeof getPageInfoParamSchema>;
