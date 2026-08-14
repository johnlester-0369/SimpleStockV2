/**
 * Supplier Feature (Web) — Zod Validation Schema
 *
 * Empty-string is accepted for email/phone (via `.or(z.literal(''))`)
 * since react-hook-form's uncontrolled inputs default to '' rather than
 * undefined — supplier.tsx converts '' to undefined before POST/PUT so
 * the server's `.optional()` schema sees the field omitted, not blank.
 *
 * @module features/supplier/supplier.schema
 */
import { z } from 'zod'

export const supplierFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().max(30, 'Phone is too long').optional().or(z.literal('')),
})

export type SupplierFormValues = z.infer<typeof supplierFormSchema>
