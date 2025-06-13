import { z } from 'zod';

export const shareLinksParamSchema = z.object({
  relatedPage: z.string().describe('Page ID to get share links for'),
});

export type ShareLinksParam = z.infer<typeof shareLinksParamSchema>;
