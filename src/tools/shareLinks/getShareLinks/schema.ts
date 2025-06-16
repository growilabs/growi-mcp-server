import { z } from 'zod';

export const getShareLinksParamSchema = z.object({
  relatedPage: z.string().describe('Page ID to get share links for'),
});

export type GetShareLinksParam = z.infer<typeof getShareLinksParamSchema>;
