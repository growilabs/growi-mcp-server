import { z } from 'zod';
import { appNameSchema } from '../../commons/app-name-schemas';

// Root page listing doesn't require any parameters
export const getPageListingRootParamSchema = z.object({
  // Name used to identify the GROWI App registered with the MCP Server
  ...appNameSchema.shape,
});

export type GetPageListingRootParam = z.infer<typeof getPageListingRootParamSchema>;
