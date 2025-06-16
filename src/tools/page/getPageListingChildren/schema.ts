import { z } from 'zod';

export const getPageListingChildrenParamSchema = z.object({
  id: z.string().optional().describe('Page ID to get children for (optional)'),
  path: z.string().optional().describe('Page path to get children for (optional)'),
});

export type GetPageListingChildrenParam = z.infer<typeof getPageListingChildrenParamSchema>;
