/**
 * Reports Feature — Repository (Drizzle-backed, raw SQL for aggregates)
 *
 * Both queries are read-only aggregates over `product_transaction` — there
 * is no repository "create/update/delete" here, matching SPEC.md's note
 * that transactions are never exposed as their own CRUD resource, only
 * read in aggregate via `/api/v1/reports/*`.
 *
 * @module app/features/reports/reports.repository
 */
import { sql } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import { product } from '@/infra/lib/database/schema/product.schema.js'
import type {
  ReportsDateRangeFilters,
  SalesSummary,
  SalesSummaryProductRow,
  StockValuePoint,
  StockValueSummary,
} from './reports.types.js'

export const reportsRepository = {
  async salesSummary(filters: ReportsDateRangeFilters): Promise<SalesSummary> {
    // Revenue uses the transaction's snapshotted unit_price (see
    // product.schema.ts) — never the product's current price — so figures
    // stay accurate even if a product's price changes after the sale
    // node-postgres returns a pg QueryResult, not an array — .rows is the
    // actual row set (postgres-js would differ; keep destructure explicit)
    const { rows } = await db.execute<{
      product_id: string
      name: string
      quantity_sold: string
      revenue: string
    }>(sql`
      SELECT
        pt.product_id,
        p.name,
        SUM(pt.quantity)::text AS quantity_sold,
        SUM(pt.quantity * pt.unit_price)::text AS revenue
      FROM product_transaction pt
      INNER JOIN product p ON p.id = pt.product_id
      WHERE pt.type = 'sale'
        AND pt.created_at >= ${filters.from}::date
        AND pt.created_at < (${filters.to}::date + interval '1 day')
      GROUP BY pt.product_id, p.name
      ORDER BY revenue DESC
    `)

    const byProduct: SalesSummaryProductRow[] = rows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      quantitySold: Number(r.quantity_sold),
      revenue: Number(r.revenue),
    }))

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

  async stockValue(
    filters: ReportsDateRangeFilters,
  ): Promise<StockValueSummary> {
    // generate_series produces one row per calendar day in range; the
    // LATERAL subquery reconstructs each product's quantity AS OF that day
    // by replaying every transaction up to and including it — 'sale' is
    // stored positive but decreases stock (see product.schema.ts comment),
    // so it is subtracted here while 'in'/'adjustment' are added as-is.
    // Multiplying by the product's CURRENT unit_price (not a historical
    // price) is the exact simplification SPEC.md documents for this report.
    const { rows } = await db.execute<{
      date: string
      total_value: string
    }>(sql`
      SELECT
        gs.day::date::text AS date,
        SUM(COALESCE(cum.qty, 0) * p.unit_price) AS total_value
      FROM generate_series(${filters.from}::date, ${filters.to}::date, interval '1 day') AS gs(day)
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

    const points: StockValuePoint[] = rows.map((r) => ({
      date: r.date,
      totalValue: Number(r.total_value ?? 0),
    }))

    return { from: filters.from, to: filters.to, points }
  },
}
