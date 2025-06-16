import { z } from 'zod';

// Root page listing doesn't require any parameters
export const getPageListingRootParamSchema = z.object({});

export type GetPageListingRootParam = z.infer<typeof getPageListingRootParamSchema>;
