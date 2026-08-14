/**
 * Reports Feature (Web) — Read Queries
 *
 * @module features/reports/reports.queries
 */
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from './reports.api'
import { reportsKeys } from './reports.constants'
import type { ReportsFilters } from './reports.types'

export function useSalesSummaryQuery(filters: ReportsFilters) {
  return useQuery({
    queryKey: reportsKeys.salesSummary(filters.from, filters.to),
    queryFn: ({ signal }) => reportsApi.salesSummary(filters, signal),
  })
}

export function useStockValueQuery(filters: ReportsFilters) {
  return useQuery({
    queryKey: reportsKeys.stockValue(filters.from, filters.to),
    queryFn: ({ signal }) => reportsApi.stockValue(filters, signal),
  })
}
