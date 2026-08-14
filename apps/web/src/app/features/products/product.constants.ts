/**
 * Products Feature (Web) — Centralized Constants
 * @module features/products/product.constants
 */

// Matches server's apiRouter.use('/products', ...) mounted under /api/v1
export const PRODUCT_BASE_PATH = '/api/v1/products'

export const productKeys = {
  all: [PRODUCT_BASE_PATH] as const,
  list: (params?: Record<string, unknown>) =>
    [PRODUCT_BASE_PATH, 'list', params ?? {}] as const,
  detail: (id: string) => [PRODUCT_BASE_PATH, id] as const,
}
