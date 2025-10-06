import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const deleteShareLinksParamSchema = z.object({
  relatedPage: z.string().describe('Page ID to delete all share links for'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type DeleteShareLinksParam = z.infer<typeof deleteShareLinksParamSchema>;
