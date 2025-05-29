import type { IPage } from '@growi/core/dist/interfaces';
import { z } from 'zod';

export const getRootPagesParamSchema = z.object({
  limit: z.number().int().min(1).optional().describe('Maximum number of pages to return'),
  offset: z.number().int().min(0).optional().describe('Number of pages to skip'),
  sort: z.string().optional().describe('Sort order (e.g. "createdAt", "-updatedAt")'),
});

export type GetRootPagesParam = z.infer<typeof getRootPagesParamSchema>;

export interface RootPagesResponse {
  pages: IPage[];
  totalCount: number;
  offset?: number;
  limit?: number;
}
