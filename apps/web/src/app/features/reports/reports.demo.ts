/**
 * Reports Feature (Web) — Demo Data
 *
 * Derives sales-summary and stock-value figures from the same demo
 * product/transaction storage product.demo.ts owns, so a sale or restock
 * made on the Products page is immediately reflected here too.
 *
 * @module features/reports/reports.demo
 */
import {
  listAllDemoProducts,
  listDemoProductTransactions,
} from '@/app/features/products/product.demo'
import type { DemoProductTransaction } from '@/app/features/products/product.demo'
import type { Product } from '@/app/features/products/product.types'
import type {
  ReportsFilters,
  SalesSummary,
  SalesSummaryProductRow,
  StockValuePoint,
  StockValueSummary,
} from './reports.types'

function inRange(iso: string, from: string, to: string): boolean {
  const date = iso.slice(0, 10)
  return date >= from && date <= to
}

// Sums this product's signed transaction quantities up to (and including)
// the given date — mirrors the real backend's reports.repository.ts
// stockValue() cumulative-replay logic exactly, so the demo chart is
// driven by the actual seeded transaction history below instead of a
// synthetic wobble formula around a single static total.
function stockValueAt(
  products: Product[],
  transactions: DemoProductTransaction[],
  dateIso: string,
): number {
  const cutoff = new Date(dateIso)
  cutoff.setDate(cutoff.getDate() + 1) // exclusive upper bound: end of dateIso
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

export const reportsDemoApi = {
  salesSummary(filters: ReportsFilters): SalesSummary {
    const products = listAllDemoProducts()
    const sales = listDemoProductTransactions().filter(
      (t) =>
        t.type === 'sale' && inRange(t.createdAt, filters.from, filters.to),
    )

    const byProductMap = new Map<string, SalesSummaryProductRow>()
    for (const txn of sales) {
      const product = products.find((p) => p.id === txn.productId)
      if (!product) continue
      const revenue = txn.quantity * Number(product.unitPrice)
      const existing = byProductMap.get(product.id)
      if (existing) {
        existing.quantitySold += txn.quantity
        existing.revenue += revenue
      } else {
        byProductMap.set(product.id, {
          productId: product.id,
          name: product.name,
          quantitySold: txn.quantity,
          revenue,
        })
      }
    }
    const byProduct = Array.from(byProductMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    )

    return {
      from: filters.from,
      to: filters.to,
      totalRevenue: byProduct.reduce((sum, row) => sum + row.revenue, 0),
      totalQuantitySold: byProduct.reduce(
        (sum, row) => sum + row.quantitySold,
        0,
      ),
      byProduct,
    }
  },

  stockValue(filters: ReportsFilters): StockValueSummary {
    const products = listAllDemoProducts()
    const transactions = listDemoProductTransactions()

    // Real per-day replay of the seeded transaction log (mirrors the
    // server's reports.repository.ts stockValue() query) — the chart's
    // ups and downs now come directly from the varied SEED_TRANSACTIONS
    // quantities/dates in product.demo.ts, not a synthetic formula
    const points: StockValuePoint[] = []
    const fromDate = new Date(filters.from)
    const toDate = new Date(filters.to)
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateIso = d.toISOString().slice(0, 10)
      points.push({
        date: dateIso,
        totalValue: Math.max(0, stockValueAt(products, transactions, dateIso)),
      })
    }

    return { from: filters.from, to: filters.to, points }
  },
}
