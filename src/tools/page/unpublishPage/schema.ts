import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const unpublishPageParamSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type UnpublishPageParam = z.infer<typeof unpublishPageParamSchema>;
