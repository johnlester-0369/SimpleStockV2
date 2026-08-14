/**
 * Dashboard Feature — Routes
 *
 * Mounted under /dashboard by app/routes.ts. GET-only — no strictRateLimit
 * layer, matching reports.routes.ts's rationale (no mutating endpoints here).
 *
 * @module app/features/dashboard/dashboard.routes
 */
import { Router } from 'express'
import { getDashboardSummary } from './dashboard.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'

const router = Router()

// Every route on this router requires an authenticated admin session
router.use(requireAdminAuth, requireAdmin)

router.get('/summary', getDashboardSummary)

export default router
