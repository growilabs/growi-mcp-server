import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

const stringEditSchema = z
  .object({
    oldString: z
      .string()
      .min(1)
      .describe('Exact text to find in the page body (literal match, whitespace-sensitive). Must match exactly once unless replaceAll is true.'),
    newString: z.string().describe('Replacement text (an empty string deletes the matched text)'),
    replaceAll: z.boolean().optional().describe('Replace all occurrences of oldString (default false: exactly one match is required)'),
  })
  .refine((edit) => edit.oldString !== edit.newString, { message: 'oldString and newString must differ' });

export const editPageParamSchema = z.object({
  pageId: z.string().optional().describe('ID of the GROWI page to edit (either pageId or path is required)'),
  path: z.string().optional().describe('Path of the GROWI page to edit (either pageId or path is required)'),
  edits: z
    .array(stringEditSchema)
    .min(1)
    .max(20)
    .describe('String replacements applied in order against the latest page body (all-or-nothing: nothing is saved when any edit fails to match)'),
  expectedRevisionId: z
    .string()
    .optional()
    .describe('Optional strict lock: fail without writing when the current head revision differs (as returned by getPageOutline/getPageSection)'),
  dryRun: z.boolean().optional().describe('Validate the edits and return a unified diff preview without saving'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type EditPageParam = z.infer<typeof editPageParamSchema>;
