/**
 * Supplier Feature (Web) — Mutations
 *
 * @module features/supplier/supplier.mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supplierApi } from './supplier.api'
import { supplierKeys } from './supplier.constants'
import type { CreateSupplierInput, UpdateSupplierInput } from './supplier.types'

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => supplierApi.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  })
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSupplierInput }) =>
      supplierApi.update(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  })
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => supplierApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  })
}
