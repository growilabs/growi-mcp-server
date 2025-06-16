import { z } from 'zod';

export const getRecentPagesParamSchema = z.object({
  limit: z.number().optional().describe('Number of pages to retrieve per page (optional)'),
  page: z.number().optional().describe('Page number for pagination (optional)'),
  includeWip: z.boolean().optional().describe('Whether to include work-in-progress pages (optional)'),
});

export type GetRecentPagesParam = z.infer<typeof getRecentPagesParamSchema>;
