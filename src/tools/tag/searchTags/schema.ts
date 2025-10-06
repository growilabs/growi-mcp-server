import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

export const searchTagsParamSchema = z.object({
  q: z.string().describe('Query string to search tags'),

  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type SearchTagsParam = z.infer<typeof searchTagsParamSchema>;
