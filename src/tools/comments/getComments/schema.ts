import { z } from 'zod';

export const getCommentsParamSchema = z.object({
  pageId: z.string().describe('ID of the page to get comments for'),
  revisionId: z.string().optional().describe('ID of the revision to get comments for (optional)'),
});

export type GetCommentsParam = z.infer<typeof getCommentsParamSchema>;
