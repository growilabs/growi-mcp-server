import { z } from 'zod';

export const deletePagesParamSchema = z.object({
  pageIdToRevisionIdMap: z.record(z.string()).describe('Map of page IDs to their revision IDs'),
  isCompletely: z.boolean().optional().describe('Whether to completely delete the pages'),
  isRecursively: z.boolean().optional().describe('Whether to delete child pages recursively'),
  isAnyoneWithTheLink: z.boolean().optional().describe('Whether to delete pages accessible by anyone with the link'),
});

export type DeletePagesParam = z.infer<typeof deletePagesParamSchema>;

export interface DeletePagesResponse {
  paths: string[];
  isRecursively: boolean;
  isCompletely: boolean;
}
