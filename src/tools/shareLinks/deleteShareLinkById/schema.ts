import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const deleteShareLinkByIdParamSchema = z.object({
  id: z.string().describe('Share link ID to delete'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type DeleteShareLinkByIdParam = z.infer<typeof deleteShareLinkByIdParamSchema>;
