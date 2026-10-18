import { z } from 'zod';
export const emailFormatSchema = z.email().max(254);
export const submissionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('newsletter'),
    email: emailFormatSchema,
    website: z.string().max(0).optional(),
  }),
  z.object({
    kind: z.literal('request'),
    email: emailFormatSchema,
    name: z.string().trim().max(100).optional(),
    product: z.string().trim().min(1).max(1000),
    notes: z.string().max(5000).optional(),
    website: z.string().max(0).optional(),
  }),
]);
