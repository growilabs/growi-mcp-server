import type { PostDuplicateForPagesBody } from '@growi/sdk-typescript/v3';
import { z } from 'zod';

// Input schema
export const duplicatePageSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  pageNameInput: z.string().optional(),
  isRecursively: z.boolean().optional().default(false),
  onlyDuplicateUserRelatedResources: z.boolean().optional().default(false),
});

export type DuplicatePageParams = z.infer<typeof duplicatePageSchema>;
