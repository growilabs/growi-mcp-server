import { z } from 'zod';

export const meSchema = z.object({
  user: z.object({
    _id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string(),
    admin: z.boolean(),
    imageUrlCached: z.string(),
    isGravatarEnabled: z.boolean(),
    isEmailPublished: z.boolean(),
    lang: z.string(),
    status: z.number(),
    createdAt: z.string().or(z.date()),
    lastLoginAt: z.string().or(z.date()).optional(),
    introduction: z.string(),
    isQuestionnaireEnabled: z.boolean(),
  }),
});

export const getExternalAccountsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const getUserPagesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  limit: z.number().min(1).optional(),
  offset: z.number().min(0).optional(),
  sort: z.string().optional(),
  status: z.string().optional(),
});
