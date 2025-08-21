import type { PutPageBody } from '@growi/sdk-typescript/v3';
import { z } from 'zod';

export const updatePageParamSchema = z.object({
  pageId: z.string().describe('ID of the page to update'),
  body: z.string().describe('New content of the page'),
  revisionId: z.string().describe('Current revision ID of the page (required for version control)'),
  grant: z.number().min(0).max(5).optional().describe('Grant level for the page (0-5)'),
  userRelatedGrantUserGroupIds: z
    .array(
      z.object({
        type: z.string().optional(),
        item: z.string().optional(),
      }),
    )
    .optional()
    .describe('IDs of the user groups to grant access to'),
  overwriteScopesOfDescendants: z.boolean().optional().describe('Whether to overwrite grant settings of descendant pages'),
  wip: z.boolean().optional().describe('Whether the page is work in progress'),
} satisfies { [K in keyof PutPageBody]: z.ZodType<PutPageBody[K]> });

export type UpdatePageParam = z.infer<typeof updatePageParamSchema>;
