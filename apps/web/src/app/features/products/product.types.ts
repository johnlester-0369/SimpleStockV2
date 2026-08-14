/**
 * Products Feature (Web) — Type Definitions
 * Mirrors the server's product.mapper.ts response shape.
 * @module features/products/product.types
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

export interface ProductResponse {
  data: Product
}

export interface ProductListResponse {
  data: Product[]
  meta: { page: number; limit: number; total: number }
}

export interface ListProductsParams {
  search?: string
  category?: string
  supplierId?: string
  stockStatus?: StockStatus
  page?: number
}

export type CreateProductInput = Pick<Product, 'name' | 'unitPrice'> &
  Partial<Pick<Product, 'category' | 'supplierId' | 'reorderThreshold'>>

export type UpdateProductInput = Partial<
  Pick<
    Product,
    'name' | 'category' | 'supplierId' | 'unitPrice' | 'reorderThreshold'
  >
>

export interface SellProductInput {
  quantity: number
  note?: string
}

export interface RestockProductInput {
  quantity: number
  note?: string
}
