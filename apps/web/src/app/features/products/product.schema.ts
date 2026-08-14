/**
 * Products Feature (Web) — Zod Validation Schemas
 * @module features/products/product.schema
 */
import { z } from 'zod'

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  category: z
    .string()
    .max(60, 'Category is too long')
    .optional()
    .or(z.literal('')),
  supplierId: z.string().optional().or(z.literal('')),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or more'),
  reorderThreshold: z.coerce
    .number()
    .int()
    .min(0, 'Must be 0 or more')
    .optional(),
})
export type ProductFormValues = z.infer<typeof productFormSchema>

export const sellFormSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  note: z.string().max(500).optional().or(z.literal('')),
})
export type SellFormValues = z.infer<typeof sellFormSchema>

export const restockFormSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, 'Quantity cannot be zero'),
  note: z.string().max(500).optional().or(z.literal('')),
})
export type RestockFormValues = z.infer<typeof restockFormSchema>
