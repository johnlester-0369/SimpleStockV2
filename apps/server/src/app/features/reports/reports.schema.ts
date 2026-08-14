/**
 * Reports Feature — Zod Validation Schemas
 *
 * @module app/features/reports/reports.schema
 */
import { z } from 'zod'

export const dateRangeQuerySchema = z
  .object({
    from: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: 'from must be a valid date (YYYY-MM-DD)',
    }),
    to: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: 'to must be a valid date (YYYY-MM-DD)',
    }),
  })
  // Compares parsed timestamps, not raw strings, so date-only ('2026-01-01')
  // and full ISO inputs both compare correctly regardless of format
  .refine((data) => Date.parse(data.from) <= Date.parse(data.to), {
    message: 'from must be before or equal to to',
    path: ['from'],
  })
