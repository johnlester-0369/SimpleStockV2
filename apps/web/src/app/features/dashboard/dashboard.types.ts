/**
 * Dashboard Feature (Web) — Type Definitions
 *
 * Mirrors the server's app/features/dashboard/dashboard.mapper.ts response
 * shape.
 *
 * @module features/dashboard/dashboard.types
 */

export interface LowStockItem {
  readonly id: string
  readonly name: string
  readonly quantity: number
  readonly reorderThreshold: number
}

export interface RecentActivityItem {
  readonly id: string
  readonly type: 'sale' | 'in' | 'adjustment'
  readonly productName: string
  readonly quantity: number
  readonly note: string | null
  readonly createdAt: string
}

export interface StockTrendPoint {
  readonly date: string
  readonly totalValue: number
}

export interface DashboardSummary {
  readonly totalProducts: number
  readonly totalStockValue: number
  readonly lowStockCount: number
  readonly lowStockItems: LowStockItem[]
  readonly recentActivity: RecentActivityItem[]
  readonly stockTrend: StockTrendPoint[]
}

export interface DashboardSummaryResponse {
  data: DashboardSummary
}
