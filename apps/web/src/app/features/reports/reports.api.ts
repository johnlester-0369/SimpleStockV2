/**
 * Reports Feature (Web) — API Client
 *
 * Read-only per SPEC.md — no create/update/delete methods, unlike
 * supplier.api.ts's full CRUD surface.
 *
 * @module features/reports/reports.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type {
  ReportsFilters,
  SalesSummary,
  SalesSummaryResponse,
  StockValueResponse,
  StockValueSummary,
} from './reports.types'
import { REPORTS_BASE_PATH } from './reports.constants'
import { env } from '@/infra/core/config/env.config'
import { reportsDemoApi } from './reports.demo'

export const reportsApi = {
  async salesSummary(
    filters: ReportsFilters,
    signal?: AbortSignal,
  ): Promise<SalesSummary> {
    if (env.isDemoMode) return reportsDemoApi.salesSummary(filters)
    const res = await apiClient.get<SalesSummaryResponse>(
      `${REPORTS_BASE_PATH}/sales-summary`,
      { params: { ...filters }, signal },
    )
    return res.data.data
  },

  async stockValue(
    filters: ReportsFilters,
    signal?: AbortSignal,
  ): Promise<StockValueSummary> {
    if (env.isDemoMode) return reportsDemoApi.stockValue(filters)
    const res = await apiClient.get<StockValueResponse>(
      `${REPORTS_BASE_PATH}/stock-value`,
      { params: { ...filters }, signal },
    )
    return res.data.data
  },
}
