import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const listRevisionChangesParamSchema = z.object({
  since: z.string().optional().describe('Inclusive lower bound on revision createdAt (ISO 8601, optional)'),
  fromDate: z
    .string()
    .optional()
    .describe('Start of the date range (inclusive, ISO 8601, optional). Combined with `since`: the effective lower bound is the later of the two values'),
  toDate: z.string().optional().describe('End of the date range (inclusive, ISO 8601, optional). Must not be earlier than `fromDate`'),
  limit: z.number().int().min(1).max(100).optional().describe('Maximum number of run entries to return (1-100, default 20, optional)'),
  cursor: z.string().optional().describe('Opaque pagination cursor returned in the `next` field of a prior response (optional)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type ListRevisionChangesParam = z.infer<typeof listRevisionChangesParamSchema>;
