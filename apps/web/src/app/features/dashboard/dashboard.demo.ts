/**
 * Dashboard Feature (Web) — Demo Data
 *
 * Aggregates the same demo product/transaction storage product.demo.ts
 * owns into the DashboardSummary shape dashboard.tsx expects.
 *
 * @module features/dashboard/dashboard.demo
 */
import {
  listAllDemoProducts,
  listDemoProductTransactions,
} from '@/app/features/products/product.demo'
import type {
  DashboardSummary,
  LowStockItem,
  RecentActivityItem,
  StockTrendPoint,
} from './dashboard.types'

// Sums every product's signed transaction quantities up to (and including)
// the given date — same cumulative-replay approach reports.demo.ts uses
// for its stock-value chart, duplicated here since these sibling demo
// files share no util module. Ties this trend directly to the varied
// SEED_TRANSACTIONS quantities/dates in product.demo.ts.
function stockValueAt(
  products: ReturnType<typeof listAllDemoProducts>,
  transactions: ReturnType<typeof listDemoProductTransactions>,
  dateIso: string,
): number {
  const cutoff = new Date(dateIso)
  cutoff.setDate(cutoff.getDate() + 1)
  let total = 0
  for (const p of products) {
    let qty = 0
    for (const txn of transactions) {
      if (txn.productId !== p.id) continue
      if (new Date(txn.createdAt) >= cutoff) continue
      qty += txn.type === 'sale' ? -txn.quantity : txn.quantity
    }
    total += qty * Number(p.unitPrice)
  }
  return total
}

export const dashboardDemoApi = {
  getSummary(): DashboardSummary {
    const products = listAllDemoProducts()
    const transactions = listDemoProductTransactions()

    const lowStockItems: LowStockItem[] = products
      .filter((p) => p.quantity <= p.reorderThreshold)
      .map((p) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        reorderThreshold: p.reorderThreshold,
      }))

    const recentActivity: RecentActivityItem[] = transactions
      .slice(0, 8)
      .map((t) => {
        const product = products.find((p) => p.id === t.productId)
        return {
          id: t.id,
          type: t.type,
          productName: product?.name ?? 'Unknown product',
          quantity: t.quantity,
          note: t.note,
          createdAt: t.createdAt,
        }
      })

    const totalStockValue = products.reduce(
      (sum, p) => sum + p.quantity * Number(p.unitPrice),
      0,
    )
    // Real per-day replay of the seeded transaction log (mirrors the
    // server's dashboard.repository.ts stockTrend() query) — window
    // widened from 7 to 60 days (~2 months) so the chart shows real
    // day-to-day fluctuation instead of a short, mostly-flat tail;
    // product.demo.ts now seeds transactions across the full window
    // instead of only the last week, so every day has genuine data.
    const stockTrend: StockTrendPoint[] = []
    for (let daysBack = 59; daysBack >= 0; daysBack -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - daysBack)
      const dateIso = d.toISOString().slice(0, 10)
      stockTrend.push({
        date: dateIso,
        totalValue: Math.max(0, stockValueAt(products, transactions, dateIso)),
      })
    }
    return {
      totalProducts: products.length,
      totalStockValue,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      recentActivity,
      stockTrend,
    }
  },
}
