/**
 * Products Feature — Controller
 * @module app/features/products/product.controller
 */
import type { Request, Response } from 'express'
import { asyncHandler } from '@/app/middleware/error-handler.middleware.js'
import { productService } from './product.service.js'
import { toProductResponse, toProductResponseList } from './product.mapper.js'
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  restockProductSchema,
  sellProductSchema,
  updateProductSchema,
} from './product.schema.js'

export const listProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const query = listProductsQuerySchema.parse(req.query)
    const { items, total } = await productService.listProducts(query)
    res.json({
      data: toProductResponseList(items),
      meta: { page: query.page, limit: query.limit, total },
    })
  },
)

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = productIdParamSchema.parse(req.params)
  const found = await productService.getProduct(id)
  res.json({ data: toProductResponse(found) })
})

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const input = createProductSchema.parse(req.body)
    // Zod coerces unitPrice to number for validation, but Product's
    // unitPrice column is numeric mapped to string by Drizzle — convert
    // here so CreateProductInput's string-typed unitPrice is satisfied
    const created = await productService.createProduct({
      ...input,
      unitPrice: String(input.unitPrice),
    })
    res.status(201).json({ data: toProductResponse(created) })
  },
)

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params)
    const input = updateProductSchema.parse(req.body)
    // Same string-conversion rationale as createProduct above; only
    // convert when present since unitPrice is optional on update
    const updated = await productService.updateProduct(id, {
      ...input,
      unitPrice:
        input.unitPrice !== undefined ? String(input.unitPrice) : undefined,
    })
    res.json({ data: toProductResponse(updated) })
  },
)

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params)
    await productService.deleteProduct(id)
    res.status(204).send()
  },
)

// req.user.id comes from requireAdminAuth (see infra/core/types/express.d.ts)
export const sellProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = productIdParamSchema.parse(req.params)
  const input = sellProductSchema.parse(req.body)
  const updated = await productService.sellProduct(id, req.user.id, input)
  res.json({ data: toProductResponse(updated) })
})

export const restockProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params)
    const input = restockProductSchema.parse(req.body)
    const updated = await productService.restockProduct(id, req.user.id, input)
    res.json({ data: toProductResponse(updated) })
  },
)
