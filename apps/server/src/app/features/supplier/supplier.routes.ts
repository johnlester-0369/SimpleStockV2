/**
 * Supplier Feature — Routes
 *
 * Mounted under /suppliers by app/routes.ts.
 *
 * @module app/features/supplier/supplier.routes
 */
import { Router } from 'express'
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from './supplier.controller.js'
import requireAdminAuth from '@/app/middleware/auth/require-admin-auth.middleware.js'
import requireAdmin from '@/app/middleware/admin/require-admin.middleware.js'
import strictRateLimit from '@/app/middleware/strict-rate-limit.middleware.js'

const router = Router()

// Every route on this router requires an authenticated admin session
router.use(requireAdminAuth, requireAdmin)

router.get('/', listSuppliers)
router.get('/:id', getSupplier)
// strictRateLimit layered on mutating routes only, same as customer.routes.ts
router.post('/', strictRateLimit, createSupplier)
router.put('/:id', strictRateLimit, updateSupplier)
router.delete('/:id', strictRateLimit, deleteSupplier)

export default router
