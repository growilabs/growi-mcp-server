import { z } from 'zod';

export interface GetPageTagParam {
  pageId: string;
}

export interface GetPageTagResponse {
  tags: Array<{
    name: string;
    count: number;
  }>;
}

export const getPageTagParamSchema = z.object({
  pageId: z.string().describe('ID of the page to get tags for'),
});
