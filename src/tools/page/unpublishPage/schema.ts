import { z } from 'zod';

export const unpublishPageParamSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
});

export type UnpublishPageParam = z.infer<typeof unpublishPageParamSchema>;
