import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getPageTagParamSchema = z.object({
  pageId: z.string().describe('Page ID to get tags for'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetPageTagParam = z.infer<typeof getPageTagParamSchema>;
