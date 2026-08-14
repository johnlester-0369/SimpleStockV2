/**
 * Supplier Feature (Web) — Centralized Constants
 *
 * @module features/supplier/supplier.constants
 */

// Matches server's apiRouter.use('/suppliers', ...) mounted under /api/v1
export const SUPPLIER_BASE_PATH = '/api/v1/suppliers'

export const supplierKeys = {
  all: [SUPPLIER_BASE_PATH] as const,
  detail: (id: string) => [SUPPLIER_BASE_PATH, id] as const,
}
