/**
 * Reports Feature — Routes
 *
 * Mounted under /reports by app/routes.ts. GET-only, same rationale as
 * account.routes.ts — no strictRateLimit layer since there are no
 * mutating endpoints here (SPEC.md: reports are read/export only).
 *
 * @module app/features/reports/reports.routes
 */
import { Router } from 'express'
import { getSalesSummary, getStockValue } from './reports.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'

const router = Router()

// Every route on this router requires an authenticated admin session
router.use(requireAdminAuth, requireAdmin)

router.get('/sales-summary', getSalesSummary)
router.get('/stock-value', getStockValue)

export default router
