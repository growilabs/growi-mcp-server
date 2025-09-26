import type { PostPageBody } from '@growi/sdk-typescript/v3';
import { z } from 'zod';
import { appNameSchema } from '../../commons/schemas.js';

export const createPageParamSchema = z.object({
  path: z.string(),
  body: z.string(),
  grant: z.number().min(0).max(5).optional(),
  grantUserGroupIds: z
    .array(
      z.object({
        type: z.string().optional(),
        item: z.string().optional(),
      }),
    )
    .optional(),
  pageTags: z.array(z.string()).optional(),
  ...appNameSchema.shape,
}) satisfies z.ZodType<PostPageBody>;

export type ValidatedParams = z.infer<typeof createPageParamSchema>;
