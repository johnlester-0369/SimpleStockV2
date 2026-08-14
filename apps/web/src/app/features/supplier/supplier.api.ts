/**
 * Supplier Feature (Web) — API Client
 *
 * Full CRUD, unlike account.api.ts's read-only surface — the Supplier
 * page needs create/update/delete against the server's REST endpoints
 * directly (no better-auth client involved here).
 *
 * @module features/supplier/supplier.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type {
  CreateSupplierInput,
  Supplier,
  SupplierListResponse,
  SupplierResponse,
  UpdateSupplierInput,
} from './supplier.types'
import { SUPPLIER_BASE_PATH } from './supplier.constants'
import { env } from '@/infra/core/config/env.config'
import { supplierDemoApi } from './supplier.demo'

export const supplierApi = {
  async list(signal?: AbortSignal): Promise<Supplier[]> {
    if (env.isDemoMode) return supplierDemoApi.list()
    const res = await apiClient.get<SupplierListResponse>(SUPPLIER_BASE_PATH, {
      signal,
    })
    return res.data.data
  },

  async create(input: CreateSupplierInput): Promise<Supplier> {
    if (env.isDemoMode) return supplierDemoApi.create(input)
    const res = await apiClient.post<SupplierResponse, CreateSupplierInput>(
      SUPPLIER_BASE_PATH,
      input,
    )
    return res.data.data
  },

  async update(id: string, input: UpdateSupplierInput): Promise<Supplier> {
    if (env.isDemoMode) return supplierDemoApi.update(id, input)
    const res = await apiClient.put<SupplierResponse, UpdateSupplierInput>(
      `${SUPPLIER_BASE_PATH}/${id}`,
      input,
    )
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    if (env.isDemoMode) return supplierDemoApi.remove(id)
    await apiClient.delete(`${SUPPLIER_BASE_PATH}/${id}`)
  },
}
