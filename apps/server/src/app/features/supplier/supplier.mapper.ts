/**
 * Supplier Feature — Mapper
 *
 * @module app/features/supplier/supplier.mapper
 */
import type { Supplier } from './supplier.types.js'

export interface SupplierResponse {
  id: string
  name: string
  email: string | null
  phone: string | null
  createdAt: string
  updatedAt: string
}

export function toSupplierResponse(supplier: Supplier): SupplierResponse {
  return {
    id: supplier.id,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  }
}

export function toSupplierResponseList(
  suppliers: Supplier[],
): SupplierResponse[] {
  return suppliers.map(toSupplierResponse)
}
