import { z } from 'zod';

export const getPageParamSchema = z.object({
  pageId: z.string().optional().describe('ID of the GROWI page'),
  path: z.string().optional().describe('Path of the GROWI page'),
});

export type GetPageParam = z.infer<typeof getPageParamSchema>;
