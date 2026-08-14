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

export const productApi = {
  async list(
    params: ListProductsParams,
    signal?: AbortSignal,
  ): Promise<ProductListResponse> {
    const res = await apiClient.get<ProductListResponse>(PRODUCT_BASE_PATH, {
      params: { ...params },
      signal,
    })
    return res.data
  },

  async create(input: CreateProductInput): Promise<Product> {
    const res = await apiClient.post<ProductResponse, CreateProductInput>(
      PRODUCT_BASE_PATH,
      input,
    )
    return res.data.data
  },

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const res = await apiClient.put<ProductResponse, UpdateProductInput>(
      `${PRODUCT_BASE_PATH}/${id}`,
      input,
    )
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${PRODUCT_BASE_PATH}/${id}`)
  },

  async sell(id: string, input: SellProductInput): Promise<Product> {
    const res = await apiClient.post<ProductResponse, SellProductInput>(
      `${PRODUCT_BASE_PATH}/${id}/sell`,
      input,
    )
    return res.data.data
  },

  async restock(id: string, input: RestockProductInput): Promise<Product> {
    const res = await apiClient.post<ProductResponse, RestockProductInput>(
      `${PRODUCT_BASE_PATH}/${id}/restock`,
      input,
    )
    return res.data.data
  },
}
