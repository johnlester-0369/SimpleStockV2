/**
 * Products Feature — Mapper
 * @module app/features/products/product.mapper
 */
import type { Product } from './product.types.js'

export interface ProductResponse {
  id: string
  name: string
  category: string | null
  supplierId: string | null
  unitPrice: string
  quantity: number
  reorderThreshold: number
  createdAt: string
  updatedAt: string
}

export function toProductResponse(p: Product): ProductResponse {
  return { ...p }
}

export function toProductResponseList(items: Product[]): ProductResponse[] {
  return items.map(toProductResponse)
}
