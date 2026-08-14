/**
 * Products Feature — Type Definitions
 * @module app/features/products/product.types
 */

export interface Product {
  readonly id: string
  name: string
  category: string | null
  supplierId: string | null
  unitPrice: string
  quantity: number
  reorderThreshold: number
  readonly createdAt: string
  readonly updatedAt: string
}

export type StockStatus = 'in_stock' | 'low' | 'out'

// '| undefined' on each mapped field is required by exactOptionalPropertyTypes:
// true — createProductSchema's .optional() fields (category/supplierId/
// reorderThreshold) type as 'T | undefined' when parsed, and a plain
// 'Partial<Pick<Product, ...>>' (field?: T, no undefined in the union)
// rejects that assignment at the controller call site
export type CreateProductInput = Pick<Product, 'name' | 'unitPrice'> & {
  [K in 'category' | 'supplierId' | 'reorderThreshold']?: Product[K] | undefined
}

// quantity intentionally absent — only sell()/restock() mutate it (SPEC.md).
// Same exactOptionalPropertyTypes rationale as CreateProductInput above.
export type UpdateProductInput = {
  [
    K in 'name' | 'category' | 'supplierId' | 'unitPrice' | 'reorderThreshold'
  ]?: Product[K] | undefined
}

export interface ListProductsFilters {
  // listProductsQuerySchema's .optional() fields parse to 'T | undefined' —
  // exactOptionalPropertyTypes requires that union spelled out here too
  search?: string | undefined
  category?: string | undefined
  supplierId?: string | undefined
  stockStatus?: StockStatus | undefined
  page: number
  limit: number
}

export interface SellProductInput {
  quantity: number
  note?: string | undefined
}

export interface RestockProductInput {
  quantity: number
  note?: string | undefined
}
