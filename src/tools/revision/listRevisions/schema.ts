import { z } from 'zod';

export const listRevisionsParamSchema = z.object({
  pageId: z.string().describe('Page ID to get revisions for'),
  limit: z.number().optional().describe('Number of revisions to retrieve per page (optional)'),
  offset: z.number().optional().describe('Offset for pagination (optional)'),
});

export type ListRevisionsParam = z.infer<typeof listRevisionsParamSchema>;
