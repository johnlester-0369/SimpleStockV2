/**
 * Reports Feature — Controller
 *
 * Both endpoints are GET-only aggregates per SPEC.md — there is no
 * write side to this feature.
 *
 * @module app/features/reports/reports.controller
 */
import type { Request, Response } from 'express'
import { asyncHandler } from '@/app/middleware/error-handler.middleware.js'
import { reportsService } from './reports.service.js'
import {
  toSalesSummaryResponse,
  toStockValueResponse,
} from './reports.mapper.js'
import { dateRangeQuerySchema } from './reports.schema.js'

export const getSalesSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = dateRangeQuerySchema.parse(req.query)
    const summary = await reportsService.getSalesSummary({ from, to })
    res.json({ data: toSalesSummaryResponse(summary) })
  },
)

export const getStockValue = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = dateRangeQuerySchema.parse(req.query)
    const summary = await reportsService.getStockValue({ from, to })
    res.json({ data: toStockValueResponse(summary) })
  },
)
