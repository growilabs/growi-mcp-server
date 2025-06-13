import { z } from 'zod';

export const pageListingInfoParamSchema = z.object({
  pageIds: z.array(z.string()).optional().describe('Array of page IDs to get summary information for'),
  paths: z.array(z.string()).optional().describe('Array of page paths to get summary information for'),
});
