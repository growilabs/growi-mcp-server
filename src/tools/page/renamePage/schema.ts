import type { IPage } from '@growi/core/dist/interfaces';
import { z } from 'zod';

export const renamePageParamSchema = z.object({
  pageId: z.string().describe('ID of the page to rename'),
  newPagePath: z.string().describe('New path for the page'),
  revisionId: z.string().describe('Revision ID of the page'),
  isRenameRedirect: z.boolean().optional().default(false).describe('Whether to create a redirect from the old path'),
  isRecursively: z.boolean().optional().default(false).describe('Whether to rename child pages recursively'),
  updateMetadata: z.boolean().optional().default(false).describe('Whether to update page metadata'),
});

export type RenamePageParam = z.infer<typeof renamePageParamSchema>;
export type { IPage };
