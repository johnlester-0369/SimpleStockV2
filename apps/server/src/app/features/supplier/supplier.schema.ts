/**
 * Supplier Feature — Zod Validation Schemas
 *
 * @module app/features/supplier/supplier.schema
 */
import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().email('Enter a valid email').optional(),
  phone: z.string().max(30, 'Phone is too long').optional(),
})

export const updateSupplierSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export const supplierIdParamSchema = z.object({
  id: z.string().uuid(),
})
