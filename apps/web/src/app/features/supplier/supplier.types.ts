/**
 * Supplier Feature (Web) — Type Definitions
 *
 * Mirrors the server's app/features/supplier/supplier.mapper.ts response
 * shape.
 *
 * @module features/supplier/supplier.types
 */

export interface Supplier {
  readonly id: string
  name: string
  email: string | null
  phone: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SupplierResponse {
  data: Supplier
}

export interface SupplierListResponse {
  data: Supplier[]
}

export type CreateSupplierInput = Pick<Supplier, 'name'> &
  Partial<Pick<Supplier, 'email' | 'phone'>>

export type UpdateSupplierInput = Partial<
  Pick<Supplier, 'name' | 'email' | 'phone'>
>
