/**
 * Products Feature — Zod Validation Schemas
 * @module app/features/products/product.schema
 */
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  category: z.string().max(60).optional(),
  supplierId: z.string().uuid().optional(),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or more'),
  reorderThreshold: z.coerce.number().int().min(0).optional(),
})

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    category: z.string().max(60).optional(),
    supplierId: z.string().uuid().nullable().optional(),
    unitPrice: z.coerce.number().min(0).optional(),
    reorderThreshold: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export const productIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  stockStatus: z.enum(['in_stock', 'low', 'out']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const sellProductSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  note: z.string().max(500).optional(),
})

export const restockProductSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, 'Quantity cannot be zero'),
  note: z.string().max(500).optional(),
})
