/**
 * Products Feature — Service
 * @module app/features/products/product.service
 */
import { NotFoundError } from '@/infra/lib/errors/app-error.lib.js'
import { productRepository } from './product.repository.js'
import type {
  CreateProductInput,
  ListProductsFilters,
  Product,
  RestockProductInput,
  SellProductInput,
  UpdateProductInput,
} from './product.types.js'

export const productService = {
  async listProducts(filters: ListProductsFilters) {
    return productRepository.findAll(filters)
  },

  async getProduct(id: string): Promise<Product> {
    const found = await productRepository.findById(id)
    if (!found) throw new NotFoundError(`Product ${id} not found`)
    return found
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    return productRepository.create(input)
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const updated = await productRepository.update(id, input)
    if (!updated) throw new NotFoundError(`Product ${id} not found`)
    return updated
  },

  async deleteProduct(id: string): Promise<void> {
    const deleted = await productRepository.delete(id)
    if (!deleted) throw new NotFoundError(`Product ${id} not found`)
  },

  async sellProduct(
    id: string,
    userId: string,
    input: SellProductInput,
  ): Promise<Product> {
    return productRepository.sell(id, userId, input)
  },

  async restockProduct(
    id: string,
    userId: string,
    input: RestockProductInput,
  ): Promise<Product> {
    return productRepository.restock(id, userId, input)
  },
}
