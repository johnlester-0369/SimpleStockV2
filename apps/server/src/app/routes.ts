/**
 * API Router — /api/v1
 *
 * Single wiring point for every feature router. app.ts mounts this one
 * router at the version prefix, so bumping to /api/v2 later is a one-line
 * change in app.ts rather than touching every feature file.
 *
 * @module app/routes
 */
import { Router } from 'express'
import adminAccountRoutes from '@/app/features/settings/account/account.routes.js'
import adminSupplierRoutes from '@/app/features/supplier/supplier.routes.js'
import adminProductRoutes from '@/app/features/products/product.routes.js'
import adminReportsRoutes from '@/app/features/reports/reports.routes.js'
import adminDashboardRoutes from '@/app/features/dashboard/dashboard.routes.js'

const apiRouter = Router()

apiRouter.use('/settings/account', adminAccountRoutes)
apiRouter.use('/suppliers', adminSupplierRoutes)
apiRouter.use('/products', adminProductRoutes)
apiRouter.use('/reports', adminReportsRoutes)
apiRouter.use('/dashboard', adminDashboardRoutes)

export default apiRouter
