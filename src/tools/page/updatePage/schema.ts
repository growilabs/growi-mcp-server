import { z } from 'zod';

export const updatePageParamSchema = z.object({
  pageId: z.string().describe('ID of the page to update'),
  body: z.string().describe('New content of the page'),
  grant: z.number().min(0).max(5).optional().describe('Grant level for the page (0-5)'),
  grantUserGroupId: z.string().optional().describe('ID of the user group to grant access to'),
  pageTags: z.array(z.string()).optional().describe('Array of tags to apply to the page'),
  revision: z.string().optional().describe('Revision ID for the page'),
});

export type UpdatePageParam = z.infer<typeof updatePageParamSchema>;
