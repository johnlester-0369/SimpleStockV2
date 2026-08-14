/**
 * Dashboard Feature — Service
 *
 * @module app/features/dashboard/dashboard.service
 */
import { dashboardRepository } from './dashboard.repository.js'
import type { DashboardSummary } from './dashboard.types.js'

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    // All four reads are independent of each other — running them
    // concurrently instead of sequentially avoids paying four round-trip
    // latencies in series for a single page load
    const [
      totalProducts,
      totalStockValue,
      lowStockCount,
      lowStockItems,
      recentActivity,
      stockTrend,
    ] = await Promise.all([
      dashboardRepository.countProducts(),
      dashboardRepository.totalStockValue(),
      dashboardRepository.lowStockCount(),
      dashboardRepository.lowStockItems(),
      dashboardRepository.recentActivity(),
      dashboardRepository.stockTrend(),
    ])

    return {
      totalProducts,
      totalStockValue,
      lowStockCount,
      lowStockItems,
      recentActivity,
      stockTrend,
    }
  },
}
