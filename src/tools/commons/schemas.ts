import { z } from 'zod';

export const appNameSchema = z.object({
  appName: z.string().optional().describe('GROWI app name to operate on (optional, uses default if not specified)'),
});
