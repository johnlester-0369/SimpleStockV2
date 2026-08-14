/**
 * Supplier Feature — Service
 *
 * @module app/features/supplier/supplier.service
 */
import { NotFoundError } from '@/infra/lib/errors/app-error.lib.js'
import { supplierRepository } from './supplier.repository.js'
import type {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
} from './supplier.types.js'

export const supplierService = {
  async listSuppliers(): Promise<Supplier[]> {
    return supplierRepository.findAll()
  },

  async getSupplier(id: string): Promise<Supplier> {
    const supplier = await supplierRepository.findById(id)
    if (!supplier) throw new NotFoundError(`Supplier ${id} not found`)
    return supplier
  },

  async createSupplier(input: CreateSupplierInput): Promise<Supplier> {
    return supplierRepository.create(input)
  },

  async updateSupplier(
    id: string,
    input: UpdateSupplierInput,
  ): Promise<Supplier> {
    const updated = await supplierRepository.update(id, input)
    if (!updated) throw new NotFoundError(`Supplier ${id} not found`)
    return updated
  },

  async deleteSupplier(id: string): Promise<void> {
    const deleted = await supplierRepository.delete(id)
    if (!deleted) throw new NotFoundError(`Supplier ${id} not found`)
  },
}
