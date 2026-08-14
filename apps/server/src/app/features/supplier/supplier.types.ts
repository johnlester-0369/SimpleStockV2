/**
 * Supplier Feature — Type Definitions
 *
 * email/phone are `string | null` (not `string | undefined`) because
 * exactOptionalPropertyTypes is on and the Drizzle column itself is
 * nullable, not merely optional-on-insert.
 *
 * @module app/features/supplier/supplier.types
 */

export interface Supplier {
  readonly id: string
  name: string
  email: string | null
  phone: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export type CreateSupplierInput = Pick<Supplier, 'name'> &
  Partial<Pick<Supplier, 'email' | 'phone'>>

export type UpdateSupplierInput = Partial<
  Pick<Supplier, 'name' | 'email' | 'phone'>
>
