import { z } from 'zod';

export const publishPageParamSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
});

export type PublishPageParam = z.infer<typeof publishPageParamSchema>;
