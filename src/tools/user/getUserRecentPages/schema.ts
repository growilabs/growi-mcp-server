import { z } from 'zod';

export const getUserRecentPagesParamSchema = z.object({
  id: z.string().describe('User ID to get recent pages for'),
});

export type GetUserRecentPagesParam = z.infer<typeof getUserRecentPagesParamSchema>;
