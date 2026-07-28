import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const addCommentParamSchema = z.object({
  pageId: z.string().describe('ID of the page to add a comment to'),
  revisionId: z.string().optional().describe('ID of the revision to attach the comment to (optional)'),
  comment: z.string().min(1).describe('Comment body text'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type AddCommentParam = z.infer<typeof addCommentParamSchema>;
