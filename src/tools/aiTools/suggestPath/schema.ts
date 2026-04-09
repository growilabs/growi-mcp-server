import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const suggestPathParamSchema = z.object({
  body: z.string().describe('The content body to analyze for path suggestions (GROWI AI will extract keywords from this)'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type ValidatedParams = z.infer<typeof suggestPathParamSchema>;
