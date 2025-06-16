import { z } from 'zod';

export const getCommentsParamSchema = z.object({
  page_id: z.string().describe('ID of the page to get comments for'),
  revision_id: z.string().optional().describe('ID of the revision to get comments for (optional)'),
});

export type GetCommentsParam = z.infer<typeof getCommentsParamSchema>;
