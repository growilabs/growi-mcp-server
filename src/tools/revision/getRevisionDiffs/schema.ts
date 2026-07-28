import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const revisionDiffPairSchema = z.object({
  pageId: z.string().describe('Page ID of the target page'),
  toRevisionId: z.string().describe('Revision ID of the "to" revision'),
  fromRevisionId: z.string().nullable().optional().describe('Revision ID of the "from" revision, or null for page-creation baseline (optional)'),
});

export const getRevisionDiffsParamSchema = z.object({
  pairs: z.array(revisionDiffPairSchema).min(1).max(20).describe('Revision pairs to compute diffs for (up to 20 pairs)'),
  contextLines: z.number().int().min(0).max(20).optional().describe('Number of context lines in the unified diff output (0-20, default 3, optional)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetRevisionDiffsParam = z.infer<typeof getRevisionDiffsParamSchema>;
