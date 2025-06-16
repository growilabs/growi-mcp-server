import { z } from 'zod';

export const getPageTagParamSchema = z.object({
  pageId: z.string().describe('Page ID to get tags for'),
});

export type GetPageTagParam = z.infer<typeof getPageTagParamSchema>;
