import { z } from 'zod';

export const activitySchema = z.object({
  name: z.string().min(2).max(80),
  category: z.string().min(2).max(40),
  type: z.enum(['BOOLEAN', 'NUMERIC_0_10'])
});

export const activityUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.string().min(2).max(40).optional(),
  type: z.enum(['BOOLEAN', 'NUMERIC_0_10']).optional(),
  archived: z.boolean().optional()
});

export const checkInSchema = z.object({
  timestamp: z.string().datetime().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mood: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  journal: z.string().max(2000).optional(),
  clientEventId: z.string().max(120).optional(),
  values: z
    .array(
      z.object({
        activityId: z.string().min(1),
        booleanValue: z.boolean().optional(),
        numericValue: z.number().int().min(0).max(10).optional()
      })
    )
    .max(200)
});
