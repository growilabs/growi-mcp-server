import type { SearchPagesParams } from '@growi/sdk-typescript/v1';
import { z } from 'zod';

export const searchPagesParamSchema = z.object({
  q: z
    .string({
      required_error: 'Search query is required',
      invalid_type_error: 'Search query must be a string',
    })
    .min(1, 'Search query cannot be empty'),
  path: z.string().optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).optional(),
}) satisfies z.ZodType<SearchPagesParams>;

export type ValidatedParams = z.infer<typeof searchPagesParamSchema>;
