import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getCommentsParamSchema = z.object({
  pageId: z.string().describe('ID of the page to get comments for'),
  revisionId: z
    .string()
    .optional()
    .describe(
      'ID of a revision of the page (optional). Returns only the comments created before the next revision after this one. Omit it to get all comments.',
    ),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetCommentsParam = z.infer<typeof getCommentsParamSchema>;
