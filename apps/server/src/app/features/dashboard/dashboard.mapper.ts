/**
 * Dashboard Feature — Mapper
 *
 * @module app/features/dashboard/dashboard.mapper
 */
import type { DashboardSummary } from './dashboard.types.js'

export interface DashboardSummaryResponse {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  lowStockItems: Array<{
    id: string
    name: string
    quantity: number
    reorderThreshold: number
  }>
  recentActivity: Array<{
    id: string
    type: 'sale' | 'in' | 'adjustment'
    productName: string
    quantity: number
    note: string | null
    createdAt: string
  }>
  stockTrend: Array<{ date: string; totalValue: number }>
}

export function toDashboardSummaryResponse(
  summary: DashboardSummary,
): DashboardSummaryResponse {
  return {
    ...summary,
    lowStockItems: [...summary.lowStockItems],
    recentActivity: [...summary.recentActivity],
    stockTrend: [...summary.stockTrend],
  }
}
