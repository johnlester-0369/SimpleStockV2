/**
 * Products Feature (Web) — API Client
 * @module features/products/product.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type {
  CreateProductInput,
  ListProductsParams,
  Product,
  ProductListResponse,
  ProductResponse,
  RestockProductInput,
  SellProductInput,
  UpdateProductInput,
} from './product.types'
import { PRODUCT_BASE_PATH } from './product.constants'
import { env } from '@/infra/core/config/env.config'
import { productDemoApi } from './product.demo'

export const productApi = {
  async list(
    params: ListProductsParams,
    signal?: AbortSignal,
  ): Promise<ProductListResponse> {
    // Demo mode never touches apiClient/fetch — this reads and writes
    // apps/web's own localStorage collection instead, so the app works
    // fully offline with no Express backend running.
    if (env.isDemoMode) return productDemoApi.list(params)
    const res = await apiClient.get<ProductListResponse>(PRODUCT_BASE_PATH, {
      params: { ...params },
      signal,
    })
    return res.data
  },

  async create(input: CreateProductInput): Promise<Product> {
    if (env.isDemoMode) return productDemoApi.create(input)
    const res = await apiClient.post<ProductResponse, CreateProductInput>(
      PRODUCT_BASE_PATH,
      input,
    )
    return res.data.data
  },

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    if (env.isDemoMode) return productDemoApi.update(id, input)
    const res = await apiClient.put<ProductResponse, UpdateProductInput>(
      `${PRODUCT_BASE_PATH}/${id}`,
      input,
    )
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    if (env.isDemoMode) return productDemoApi.remove(id)
    await apiClient.delete(`${PRODUCT_BASE_PATH}/${id}`)
  },

  async sell(id: string, input: SellProductInput): Promise<Product> {
    if (env.isDemoMode) return productDemoApi.sell(id, input)
    const res = await apiClient.post<ProductResponse, SellProductInput>(
      `${PRODUCT_BASE_PATH}/${id}/sell`,
      input,
    )
    return res.data.data
  },

  async restock(id: string, input: RestockProductInput): Promise<Product> {
    if (env.isDemoMode) return productDemoApi.restock(id, input)
    const res = await apiClient.post<ProductResponse, RestockProductInput>(
      `${PRODUCT_BASE_PATH}/${id}/restock`,
      input,
    )
    return res.data.data
  },
}
