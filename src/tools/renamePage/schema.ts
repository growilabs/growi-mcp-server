import type { IPage } from '@growi/core/dist/interfaces';
import { z } from 'zod';

export const renamePageParamSchema = z.object({
  pageId: z.string().describe('ID of the page to rename'),
  newPagePath: z.string().describe('New path for the page'),
  revisionId: z.string().optional().describe('Revision ID of the page'),
  isRenameRedirect: z.boolean().optional().describe('Whether to create a redirect from the old path'),
  isRecursively: z.boolean().optional().describe('Whether to rename child pages recursively'),
  isMoveMode: z.boolean().optional().describe('Whether to use move mode'),
  updateMetadata: z.boolean().optional().describe('Whether to update page metadata'),
});

export type RenamePageParam = z.infer<typeof renamePageParamSchema>;
export type { IPage };
