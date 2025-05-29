import { z } from 'zod';

export const getPageParamSchema = z.object({
  pagePath: z.string().describe('Path of the page to retrieve'),
});

export type GetPageParam = z.infer<typeof getPageParamSchema>;
