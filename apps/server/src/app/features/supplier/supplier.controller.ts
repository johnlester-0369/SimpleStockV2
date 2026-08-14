/**
 * Supplier Feature — Controller
 *
 * @module app/features/supplier/supplier.controller
 */
import type { Request, Response } from 'express'
import { asyncHandler } from '@/app/middleware/error-handler.middleware.js'
import { supplierService } from './supplier.service.js'
import {
  toSupplierResponse,
  toSupplierResponseList,
} from './supplier.mapper.js'
import {
  createSupplierSchema,
  supplierIdParamSchema,
  updateSupplierSchema,
} from './supplier.schema.js'

export const listSuppliers = asyncHandler(
  async (_req: Request, res: Response) => {
    const suppliers = await supplierService.listSuppliers()
    res.json({ data: toSupplierResponseList(suppliers) })
  },
)

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = supplierIdParamSchema.parse(req.params)
  const supplier = await supplierService.getSupplier(id)
  res.json({ data: toSupplierResponse(supplier) })
})

export const createSupplier = asyncHandler(
  async (req: Request, res: Response) => {
    const input = createSupplierSchema.parse(req.body)
    const supplier = await supplierService.createSupplier(input)
    res.status(201).json({ data: toSupplierResponse(supplier) })
  },
)

export const updateSupplier = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = supplierIdParamSchema.parse(req.params)
    const input = updateSupplierSchema.parse(req.body)
    const supplier = await supplierService.updateSupplier(id, input)
    res.json({ data: toSupplierResponse(supplier) })
  },
)

export const deleteSupplier = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = supplierIdParamSchema.parse(req.params)
    await supplierService.deleteSupplier(id)
    // 204: delete succeeded, no representation to return — matches the
    // Sell/Restock-style mutating-endpoint conventions used elsewhere
    res.status(204).send()
  },
)
