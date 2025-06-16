import { z } from 'zod';

export const searchTagsParamSchema = z.object({
  q: z.string().optional().describe('Search query for tags (optional)'),
});

export type SearchTagsParam = z.infer<typeof searchTagsParamSchema>;
