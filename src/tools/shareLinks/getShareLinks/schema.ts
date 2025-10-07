import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getShareLinksParamSchema = z.object({
  relatedPage: z.string().describe('Page ID to get share links for'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetShareLinksParam = z.infer<typeof getShareLinksParamSchema>;
