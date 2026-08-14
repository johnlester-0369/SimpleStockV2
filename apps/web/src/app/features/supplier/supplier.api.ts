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

export const supplierApi = {
  async list(signal?: AbortSignal): Promise<Supplier[]> {
    const res = await apiClient.get<SupplierListResponse>(SUPPLIER_BASE_PATH, {
      signal,
    })
    return res.data.data
  },

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const res = await apiClient.post<SupplierResponse, CreateSupplierInput>(
      SUPPLIER_BASE_PATH,
      input,
    )
    return res.data.data
  },

  async update(id: string, input: UpdateSupplierInput): Promise<Supplier> {
    const res = await apiClient.put<SupplierResponse, UpdateSupplierInput>(
      `${SUPPLIER_BASE_PATH}/${id}`,
      input,
    )
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${SUPPLIER_BASE_PATH}/${id}`)
  },
}
