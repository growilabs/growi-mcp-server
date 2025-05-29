import { z } from 'zod';

export const createPageParamSchema = z.object({
  path: z.string().describe('Path of the page to create'),
  body: z.string().describe('Content of the page'),
  grant: z.number().min(0).max(5).optional().describe('Grant level for the page (0-5)'),
  overwrite: z.boolean().optional().describe('Whether to overwrite existing page'),
});

export type CreatePageParam = z.infer<typeof createPageParamSchema>;
