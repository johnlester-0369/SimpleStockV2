/**
 * Dashboard Feature — Type Definitions
 *
 * Read-only aggregation types over `product` and `product_transaction`
 * (SPEC.md's `/dashboard` route). No CRUD types — this feature only ever
 * reads, matching the reports feature's shape (see reports.types.ts).
 *
 * @module app/features/dashboard/dashboard.types
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
  // Full count of items at/below reorder threshold — independent of how
  // many rows lowStockItems actually returns, since that list is capped
  readonly lowStockCount: number
  readonly lowStockItems: LowStockItem[]
  readonly recentActivity: RecentActivityItem[]
  readonly stockTrend: StockTrendPoint[]
}
