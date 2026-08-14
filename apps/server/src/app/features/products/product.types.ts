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

export type CreateProductInput = Pick<Product, 'name' | 'unitPrice'> &
  Partial<Pick<Product, 'category' | 'supplierId' | 'reorderThreshold'>>

// quantity intentionally absent — only sell()/restock() mutate it (SPEC.md)
export type UpdateProductInput = Partial<
  Pick<
    Product,
    'name' | 'category' | 'supplierId' | 'unitPrice' | 'reorderThreshold'
  >
>

export interface ListProductsFilters {
  search?: string
  category?: string
  supplierId?: string
  stockStatus?: StockStatus
  page: number
  limit: number
}

export interface SellProductInput {
  quantity: number
  note?: string
}

export interface RestockProductInput {
  quantity: number
  note?: string
}
