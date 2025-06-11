import type { PostPageBody } from '@growi/sdk-typescript/v3';
import { z } from 'zod';

export const createPageParamSchema = z.object({
  path: z.string(),
  body: z.string(),
  grant: z.number().min(0).max(5).optional(),
  grantUserGroupIds: z.string().optional(),
  pageTags: z.array(z.string()).optional(),
}) satisfies z.ZodType<PostPageBody>;

export type ValidatedParams = z.infer<typeof createPageParamSchema>;
