import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const createShareLinkParamSchema = z.object({
  relatedPage: z.string().describe('Page ID to create share link for'),
  description: z.string().optional().describe('Description for the share link'),
  expiredAt: z.string().optional().describe('Expiration date for the share link (ISO string)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type CreateShareLinkParam = z.infer<typeof createShareLinkParamSchema>;
