/**
 * Products Feature — Routes
 * Mounted under /products by app/routes.ts.
 * @module app/features/products/product.routes
 */
import { Router } from 'express'
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  restockProduct,
  sellProduct,
  updateProduct,
} from './product.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'
import strictRateLimit from '@/app/middleware/strict-rate-limit.middleware.js'

const router = Router()

router.use(requireAdminAuth, requireAdmin)

router.get('/', listProducts)
router.get('/:id', getProduct)
router.post('/', strictRateLimit, createProduct)
router.put('/:id', strictRateLimit, updateProduct)
router.delete('/:id', strictRateLimit, deleteProduct)
router.post('/:id/sell', strictRateLimit, sellProduct)
router.post('/:id/restock', strictRateLimit, restockProduct)

export default router
