/**
 * Products Feature (Web) — Mutations
 * @module features/products/product.mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productApi } from './product.api'
import { productKeys } from './product.constants'
import type {
  CreateProductInput,
  RestockProductInput,
  SellProductInput,
  UpdateProductInput,
} from './product.types'

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProductInput) => productApi.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      productApi.update(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useSellProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SellProductInput }) =>
      productApi.sell(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useRestockProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RestockProductInput }) =>
      productApi.restock(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}
