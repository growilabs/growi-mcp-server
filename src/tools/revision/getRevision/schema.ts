import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getRevisionParamSchema = z.object({
  id: z.string().describe('Revision ID to get details for'),
  pageId: z.string().describe('Page ID that the revision belongs to'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetRevisionParam = z.infer<typeof getRevisionParamSchema>;
