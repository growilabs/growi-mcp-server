import { z } from 'zod';

export const pageResourceArgsSchema = z.object({
  pagePath: z.string().describe('Path of the page to retrieve'),
});

export type PageResourceArgs = z.infer<typeof pageResourceArgsSchema>;
