/**
 * Dashboard Feature — Repository (Drizzle-backed)
 *
 * All four reads run independently (no shared transaction needed — this
 * is a point-in-time snapshot view, not a mutation). The low-stock
 * comparison (quantity <= reorderThreshold) is a column-to-column
 * comparison, so it uses a `sql` template literal rather than `lte()` —
 * same approach product.repository.ts's findAll() already uses for its
 * `stock_status=low` filter, kept consistent rather than introducing a
 * second pattern for the same comparison.
 *
 * @module app/features/dashboard/dashboard.repository
 */
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import {
  product,
  productTransaction,
} from '@/infra/lib/database/schema/product.schema.js'
import type {
  LowStockItem,
  RecentActivityItem,
  StockTrendPoint,
} from './dashboard.types.js'

// Caps how many rows the low-stock widget and activity feed return —
// SPEC.md calls the activity feed "a read-only glance, not a full log"
// and the low-stock widget a "widget", not a paginated table
const LOW_STOCK_LIMIT = 10
const RECENT_ACTIVITY_LIMIT = 10

// Fixed 7-day lookback window for the dashboard's lightweight trend chart —
// reports.repository.ts's stockValue() covers arbitrary date ranges instead
const STOCK_TREND_DAYS = 7

export const dashboardRepository = {
  async countProducts(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(product)
    return row?.count ?? 0
  },

  async totalStockValue(): Promise<number> {
    // COALESCE guards the empty-table case — SUM() over zero rows is
    // NULL in Postgres, which would otherwise surface as NaN on the client
    const [row] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${product.quantity} * ${product.unitPrice}), 0)`,
      })
      .from(product)
    return Number(row?.total ?? 0)
  },

  async lowStockCount(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(product)
      .where(sql`${product.quantity} <= ${product.reorderThreshold}`)
    return row?.count ?? 0
  },

  async lowStockItems(): Promise<LowStockItem[]> {
    // Ordered ascending by quantity so the most urgent (closest to/at
    // zero) items surface first in the widget
    return db
      .select({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        reorderThreshold: product.reorderThreshold,
      })
      .from(product)
      .where(sql`${product.quantity} <= ${product.reorderThreshold}`)
      .orderBy(product.quantity)
      .limit(LOW_STOCK_LIMIT)
  },

  async recentActivity(): Promise<RecentActivityItem[]> {
    const rows = await db
      .select({
        id: productTransaction.id,
        type: productTransaction.type,
        productName: product.name,
        quantity: productTransaction.quantity,
        note: productTransaction.note,
        createdAt: productTransaction.createdAt,
      })
      .from(productTransaction)
      .innerJoin(product, eq(product.id, productTransaction.productId))
      .orderBy(desc(productTransaction.createdAt))
      .limit(RECENT_ACTIVITY_LIMIT)

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }))
  },
  async stockTrend(): Promise<StockTrendPoint[]> {
    // Last STOCK_TREND_DAYS trend for the dashboard's at-a-glance chart —
    // reports.repository.ts's stockValue() serves the full date-range-filtered
    // version; this is intentionally a fixed, unfiltered window
    const { rows } = await db.execute<{
      date: string
      total_value: string
    }>(sql`
      SELECT
        gs.day::date::text AS date,
        SUM(COALESCE(cum.qty, 0) * p.unit_price) AS total_value
      FROM generate_series(
        (CURRENT_DATE - ${STOCK_TREND_DAYS - 1} * interval '1 day'),
        CURRENT_DATE,
        interval '1 day'
      ) AS gs(day)
      CROSS JOIN ${product} p
      LEFT JOIN LATERAL (
        SELECT SUM(
          CASE
            WHEN pt.type = 'sale' THEN -pt.quantity
            ELSE pt.quantity
          END
        ) AS qty
        FROM product_transaction pt
        WHERE pt.product_id = p.id
          AND pt.created_at < (gs.day + interval '1 day')
      ) cum ON true
      GROUP BY gs.day
      ORDER BY gs.day
    `)

    return rows.map((row) => ({
      date: row.date,
      totalValue: Number(row.total_value ?? 0),
    }))
  },
}
