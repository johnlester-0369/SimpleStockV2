/**
 * Reports Feature — Mapper
 *
 * @module app/features/reports/reports.mapper
 */
import type { SalesSummary, StockValueSummary } from './reports.types.js'

export interface SalesSummaryResponse {
  from: string
  to: string
  totalRevenue: number
  totalQuantitySold: number
  byProduct: Array<{
    productId: string
    name: string
    quantitySold: number
    revenue: number
  }>
}

export interface StockValueResponse {
  from: string
  to: string
  points: Array<{ date: string; totalValue: number }>
}

export function toSalesSummaryResponse(
  summary: SalesSummary,
): SalesSummaryResponse {
  return { ...summary, byProduct: [...summary.byProduct] }
}

export function toStockValueResponse(
  summary: StockValueSummary,
): StockValueResponse {
  return { ...summary, points: [...summary.points] }
}
