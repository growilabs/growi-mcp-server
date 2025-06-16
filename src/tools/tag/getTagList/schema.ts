import { z } from 'zod';

export const getTagListParamSchema = z.object({
  limit: z.number().optional().describe('Number of tags to retrieve per page (optional)'),
  offset: z.number().optional().describe('Offset for pagination (optional)'),
});

export type GetTagListParam = z.infer<typeof getTagListParamSchema>;
