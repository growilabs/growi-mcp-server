import { z } from 'zod';

/**
 * Common schema for GROWI API v1 responses
 */
export const apiV1ResponseSchema = z.object({
  ok: z.boolean(),
  code: z.string().optional(),
  error: z.string().optional(),
  data: z.unknown().optional(),
});

export type ApiV1Response<T = unknown> = z.infer<typeof apiV1ResponseSchema> & {
  data?: T;
};
