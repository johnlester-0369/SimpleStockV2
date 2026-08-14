/**
 * Reports Feature (Web) — Type Definitions
 *
 * Mirrors the server's app/features/reports/reports.mapper.ts response
 * shape.
 *
 * @module features/reports/reports.types
 */

export interface SalesSummaryProductRow {
  productId: string
  name: string
  quantitySold: number
  revenue: number
}

export interface SalesSummary {
  from: string
  to: string
  totalRevenue: number
  totalQuantitySold: number
  byProduct: SalesSummaryProductRow[]
}

export interface SalesSummaryResponse {
  data: SalesSummary
}

export interface StockValuePoint {
  date: string
  totalValue: number
}

export interface StockValueSummary {
  from: string
  to: string
  points: StockValuePoint[]
}

export interface StockValueResponse {
  data: StockValueSummary
}

export interface ReportsFilters {
  from: string
  to: string
}
