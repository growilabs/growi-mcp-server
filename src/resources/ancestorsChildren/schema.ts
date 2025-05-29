import type { IPage } from '@growi/core/dist/interfaces';
import { z } from 'zod';

// Input parameter schema
export const getAncestorsChildrenParamSchema = z.object({
  pageId: z.string().describe('ID of the page to get ancestors and children for'),
});

export type GetAncestorsChildrenParam = z.infer<typeof getAncestorsChildrenParamSchema>;

// Response type
export interface GetAncestorsChildrenResponse {
  ancestorsChildren: {
    ancestor: IPage;
    children: IPage[];
  }[];
}
