import type { PostDuplicateForPagesBody } from '@growi/sdk-typescript/v3';
import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

// Input schema
export const duplicatePageSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  pageNameInput: z.string().optional(),
  isRecursively: z.boolean().optional().default(false),
  onlyDuplicateUserRelatedResources: z.boolean().optional().default(false),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type DuplicatePageParams = z.infer<typeof duplicatePageSchema>;
