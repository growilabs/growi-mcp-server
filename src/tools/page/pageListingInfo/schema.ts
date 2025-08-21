import { z } from 'zod';

export const pageListingInfoParamSchema = z.object({
  pageIds: z.array(z.string()).optional().describe('Array of page IDs to get summary information for (One of `pageIds` or `path` must be provided)'),
  path: z.string().optional().describe('Path of the page to get summary information for (One of `pageIds` or `path` must be provided)'),
});
