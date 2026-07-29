import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getPageOutlineParamSchema = z.object({
  pageId: z.string().optional().describe('ID of the GROWI page (either pageId or path is required)'),
  path: z.string().optional().describe('Path of the GROWI page (either pageId or path is required)'),
  maxDepth: z.number().int().min(1).max(6).optional().describe('Maximum heading level to include in the outline (1-6, default 6)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetPageOutlineParam = z.infer<typeof getPageOutlineParamSchema>;
