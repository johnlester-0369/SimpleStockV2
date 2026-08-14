/**
 * Reports Feature — Type Definitions
 *
 * Read-only aggregation types over the `product_transaction` log (SPEC.md's
 * `/reports` route). No CRUD types here — reports are derived, never
 * created/updated/deleted directly; see SPEC.md's "transactions is an
 * internal table only" note.
 *
 * @module app/features/reports/reports.types
 */

export interface SalesSummaryProductRow {
  readonly productId: string
  readonly name: string
  readonly quantitySold: number
  readonly revenue: number
}

export interface SalesSummary {
  readonly from: string
  readonly to: string
  readonly totalRevenue: number
  readonly totalQuantitySold: number
  // Sorted desc by revenue by the repository — first row is the best
  // mover, last row is the worst mover, so the client needs no re-sort
  readonly byProduct: SalesSummaryProductRow[]
}

export interface StockValuePoint {
  readonly date: string
  readonly totalValue: number
}

export interface StockValueSummary {
  readonly from: string
  readonly to: string
  // Per SPEC.md's documented simplification: quantity-at-each-point-in-time
  // × the product's CURRENT price (no historical price table exists)
  readonly points: StockValuePoint[]
}

export interface ReportsDateRangeFilters {
  readonly from: string
  readonly to: string
}
