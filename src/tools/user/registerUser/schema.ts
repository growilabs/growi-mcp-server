import { z } from 'zod';

export const registerUserSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().optional().describe('User display name'),
    email: z.string().email('Invalid email format').optional(),
  })
  .strict()
  .describe('Registration parameters matching subset of IUser interface');

export type RegisterUserSchema = z.infer<typeof registerUserSchema>;
