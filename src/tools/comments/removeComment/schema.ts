import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const removeCommentParamSchema = z.object({
  commentId: z.string().describe('ID of the comment to remove'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type RemoveCommentParam = z.infer<typeof removeCommentParamSchema>;
