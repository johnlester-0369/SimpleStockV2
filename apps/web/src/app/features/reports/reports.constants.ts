/**
 * Reports Feature (Web) — Centralized Constants
 *
 * @module features/reports/reports.constants
 */

// Matches server's apiRouter.use('/reports', ...) mounted under /api/v1
export const REPORTS_BASE_PATH = '/api/v1/reports'

export const reportsKeys = {
  // Keyed by from/to so switching the date range fetches fresh data
  // instead of reusing a stale cache entry under one flat key
  salesSummary: (from: string, to: string) =>
    [REPORTS_BASE_PATH, 'sales-summary', from, to] as const,
  stockValue: (from: string, to: string) =>
    [REPORTS_BASE_PATH, 'stock-value', from, to] as const,
}
