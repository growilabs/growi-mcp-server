import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const getPageSectionParamSchema = z.object({
  pageId: z.string().optional().describe('ID of the GROWI page (either pageId or path is required)'),
  path: z.string().optional().describe('Path of the GROWI page (either pageId or path is required)'),
  heading: z.string().min(1).optional().describe('Heading text to read (as returned by getPageOutline). Mutually exclusive with startLine/endLine.'),
  includeSubsections: z.boolean().optional().describe('When reading by heading, include nested subsections (default true)'),
  startLine: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('First line to read (1-indexed inclusive, as returned by getPageOutline). Mutually exclusive with heading.'),
  endLine: z.number().int().min(1).optional().describe('Last line to read (1-indexed inclusive, defaults to the end of the page)'),
  maxChars: z
    .number()
    .int()
    .min(100)
    .max(200000)
    .optional()
    .describe('Maximum characters to return (default 20000). When exceeded, the response is cut at a line boundary and marked truncated.'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetPageSectionParam = z.infer<typeof getPageSectionParamSchema>;
