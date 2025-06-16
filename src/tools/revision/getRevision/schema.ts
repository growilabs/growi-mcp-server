import { z } from 'zod';

export const getRevisionParamSchema = z.object({
  id: z.string().describe('Revision ID to get details for'),
  pageId: z.string().describe('Page ID that the revision belongs to'),
});

export type GetRevisionParam = z.infer<typeof getRevisionParamSchema>;
