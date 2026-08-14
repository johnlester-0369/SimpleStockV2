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

// '| undefined' required by exactOptionalPropertyTypes: true —
// createSupplierSchema's .optional() fields (email/phone) parse to
// 'string | undefined', which a plain 'Partial<Pick<...>>' (no undefined
// in the union) rejects at the controller's service call
export type CreateSupplierInput = Pick<Supplier, 'name'> & {
  [K in 'email' | 'phone']?: Supplier[K] | undefined
}

// Same exactOptionalPropertyTypes rationale as CreateSupplierInput above —
// updateSupplierSchema's .optional() fields all need '| undefined' here
export type UpdateSupplierInput = {
  [K in 'name' | 'email' | 'phone']?: Supplier[K] | undefined
}
