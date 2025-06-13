import { z } from 'zod';

export const deleteShareLinkByIdParamSchema = z.object({
  id: z.string().describe('Share link ID to delete'),
});

export type DeleteShareLinkByIdParam = z.infer<typeof deleteShareLinkByIdParamSchema>;
