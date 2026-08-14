/**
 * Reports Feature — Service
 *
 * @module app/features/reports/reports.service
 */
import { reportsRepository } from './reports.repository.js'
import type {
  ReportsDateRangeFilters,
  SalesSummary,
  StockValueSummary,
} from './reports.types.js'

export const reportsService = {
  async getSalesSummary(
    filters: ReportsDateRangeFilters,
  ): Promise<SalesSummary> {
    return reportsRepository.salesSummary(filters)
  },

  async getStockValue(
    filters: ReportsDateRangeFilters,
  ): Promise<StockValueSummary> {
    return reportsRepository.stockValue(filters)
  },
}
