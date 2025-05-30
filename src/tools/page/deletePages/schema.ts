import { z } from 'zod';

const deleteOptionsSchema = z.object({
  isCompletely: z.boolean(),
  isRecursively: z.boolean(),
});

/**
 * Schema for request parameters - Common for both v1 and v3
 */
export const deletePagesParamSchema = z.object({
  pageIdToRevisionIdMap: z.record(z.string()).describe('Map of page IDs to their revision IDs'),
  isCompletely: z.boolean().optional().describe('Whether to completely delete the pages'),
  isRecursively: z.boolean().optional().describe('Whether to delete child pages recursively'),
  isAnyoneWithTheLink: z.boolean().optional().describe('Whether to delete pages accessible by anyone with the link'),
});

export type DeletePagesParam = z.infer<typeof deletePagesParamSchema>;

/**
 * Schema for API v1 single page delete response
 */
export const pageDeleteV1ResponseSchema = deleteOptionsSchema.extend({
  path: z.string(),
});

export type PageDeleteV1Response = z.infer<typeof pageDeleteV1ResponseSchema>;

/**
 * Schema for API v3 multiple pages delete response
 */
export interface PagesDeleteV3Response extends z.infer<typeof deleteOptionsSchema> {
  paths: string[];
}

export type DeletePagesResponse = PagesDeleteV3Response;
