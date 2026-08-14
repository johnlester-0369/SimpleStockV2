import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'

/**
 * Shared "edit in place" state machine — extracted from the identical
 * editingId/editX/startEdit/saveEdit blocks previously hand-duplicated
 * in the admin customer dashboard and the customer items dashboard.
 * Generic over the row's editable field shape (TFields) so each caller
 * only supplies how its own fields map onto its own mutation payload.
 */
export function useInlineEdit<
  TFields extends Record<string, string>,
  TResult = unknown,
  TVariables = unknown,
>(
  mutation: UseMutationResult<TResult, Error, TVariables>,
  buildVariables: (id: string, fields: TFields) => TVariables,
) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fields, setFields] = useState<TFields>({} as TFields)

  function startEdit(id: string, initialFields: TFields) {
    setEditingId(id)
    setFields(initialFields)
  }

  function updateField<K extends keyof TFields>(key: K, value: TFields[K]) {
    // Freeze local edits once the mutation is in flight — per TanStack's
    // docs, isPending stays true until any promise returned from onSuccess
    // settles, so this guard covers the full request+refetch window, not
    // just the initial network call
    if (mutation.isPending) return
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function cancelEdit() {
    // Guard against cancelling out from under an in-flight save — the
    // row must stay in edit mode until the server actually responds
    if (mutation.isPending) return
    setEditingId(null)
  }

  function saveEdit(id: string) {
    mutation.mutate(buildVariables(id, fields), {
      // editingId only clears here — this is what makes the display text
      // wait for server acknowledgement rather than flipping immediately
      onSuccess: () => setEditingId(null),
      // Previously unhandled: a failed save left the row stuck in edit
      // mode with a frozen field and no explanation. Exposing onError to
      // the caller lets each dashboard surface its own error UI (e.g. an
      // Alert) without this generic hook knowing about any specific one.
      onError: (error) => {
        console.error('[useInlineEdit] saveEdit failed:', error)
      },
    })
  }

  return {
    editingId,
    fields,
    // Surfaced separately from the raw mutation so callers don't need
    // to know which mutation object backs a given row's edit state
    isSaving: mutation.isPending,
    startEdit,
    updateField,
    cancelEdit,
    saveEdit,
  }
}
