import { z } from 'zod';
export const submissionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('newsletter'),
    email: z.email().max(254),
    website: z.string().max(0).optional(),
  }),
  z.object({
    kind: z.literal('request'),
    email: z.email().max(254),
    name: z.string().trim().max(100).optional(),
    product: z.string().trim().min(1).max(1000),
    notes: z.string().max(5000).optional(),
    website: z.string().max(0).optional(),
  }),
]);
