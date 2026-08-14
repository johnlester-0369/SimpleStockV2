/**
 * Products Feature (Web) — Read Queries
 * @module features/products/product.queries
 */
import { useQuery } from '@tanstack/react-query'
import { productApi } from './product.api'
import { productKeys } from './product.constants'
import type { ListProductsParams } from './product.types'

export function useProductsQuery(params: ListProductsParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => productApi.list(params, signal),
  })
}
