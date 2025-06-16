import { z } from 'zod';

export const getPageInfoParamSchema = z.object({
  pageId: z.string().describe('ID of the GROWI page'),
});

export type GetPageInfoParam = z.infer<typeof getPageInfoParamSchema>;
