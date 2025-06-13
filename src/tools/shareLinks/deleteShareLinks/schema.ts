import { z } from 'zod';

export const deleteShareLinksParamSchema = z.object({
  relatedPage: z.string().describe('Page ID to delete all share links for'),
});

export type DeleteShareLinksParam = z.infer<typeof deleteShareLinksParamSchema>;
