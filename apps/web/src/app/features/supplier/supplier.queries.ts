/**
 * Supplier Feature (Web) — Read Queries
 *
 * @module features/supplier/supplier.queries
 */
import { useQuery } from '@tanstack/react-query'
import { supplierApi } from './supplier.api'
import { supplierKeys } from './supplier.constants'

export function useSuppliersQuery() {
  return useQuery({
    queryKey: supplierKeys.all,
    queryFn: ({ signal }) => supplierApi.list(signal),
  })
}
