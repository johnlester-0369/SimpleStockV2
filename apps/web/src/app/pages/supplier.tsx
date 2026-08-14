import { useState } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { useSuppliersQuery } from '@/app/features/supplier/supplier.queries'
import {
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from '@/app/features/supplier/supplier.mutations'
import {
  supplierFormSchema,
  type SupplierFormValues,
} from '@/app/features/supplier/supplier.schema'
import type { Supplier } from '@/app/features/supplier/supplier.types'
import Button from '@/app/components/ui/buttons/Button'
import Input from '@/app/components/ui/forms/Input'
import { Field } from '@/app/components/ui/forms/Field'
import Card from '@/app/components/ui/data-display/Card'
import Table from '@/app/components/ui/data-display/Table'
import EmptyState from '@/app/components/ui/data-display/EmptyState'
import Alert from '@/app/components/ui/feedback/Alert'
import Dialog from '@/app/components/ui/overlay/Dialog'

/**
 * Supplier — /suppliers
 *
 * Full CRUD per SPEC.md's `/suppliers` route (list, add, edit, delete).
 * SPEC's `product_count` column is intentionally omitted from the table:
 * the `products` feature doesn't exist yet anywhere in this codebase
 * (server has no products table/routes), so there is nothing to count
 * against — wiring in an always-zero column would be actively misleading.
 * Re-add once /products ships.
 */
export default function SupplierView() {
  const { data: suppliers, isLoading, isError } = useSuppliersQuery()
  const createSupplier = useCreateSupplierMutation()
  const updateSupplier = useUpdateSupplierMutation()
  const deleteSupplier = useDeleteSupplierMutation()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null,
  )
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: '', email: '', phone: '' },
  })

  function openCreateForm() {
    setEditingSupplier(null)
    setFormError(null)
    reset({ name: '', email: '', phone: '' })
    setIsFormOpen(true)
  }

  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier)
    setFormError(null)
    reset({
      name: supplier.name,
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
    })
    setIsFormOpen(true)
  }

  async function onSubmit(values: SupplierFormValues) {
    setFormError(null)
    // '' means "not provided" for the optional fields — the server's
    // z.string().email().optional() rejects '' as an invalid email, so
    // it must become undefined before the request is sent
    const payload = {
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
    }
    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({
          id: editingSupplier.id,
          input: payload,
        })
      } else {
        await createSupplier.mutateAsync(payload)
      }
      setIsFormOpen(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save supplier',
      )
    }
  }

  async function confirmDelete() {
    if (!deletingSupplier) return
    try {
      await deleteSupplier.mutateAsync(deletingSupplier.id)
      setDeletingSupplier(null)
    } catch (err) {
      // Keep the confirm dialog open on failure (e.g. a 404 race) rather
      // than silently closing as if the delete had succeeded
      setFormError(
        err instanceof Error ? err.message : 'Failed to delete supplier',
      )
    }
  }

  return (
    <>
      <Helmet>
        <title>Suppliers</title>
        <meta
          name="description"
          content="Manage vendor and supplier contacts."
        />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-headline">Suppliers</h1>
            <p className="mt-1 text-muted">
              Manage vendor/supplier contacts tied to products.
            </p>
          </div>
          <Button
            variant="filled"
            color="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreateForm}
          >
            Add Supplier
          </Button>
        </div>

        {isError && (
          <Alert
            variant="tonal"
            color="error"
            title="Error"
            message="Failed to load suppliers. Please try again."
          />
        )}

        <Card.Root>
          <Card.Body>
            {isLoading ? (
              <Table.ScrollArea>
                <Table.Root variant="bordered" size="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Name</Table.Head>
                      <Table.Head>Email</Table.Head>
                      <Table.Head>Phone</Table.Head>
                      <Table.Head align="right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Loading colSpan={4} rows={4} />
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            ) : !suppliers || suppliers.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No suppliers yet"
                description="Add your first supplier to start linking products to vendors."
                action={{
                  label: 'Add Supplier',
                  onClick: openCreateForm,
                  icon: <Plus className="h-4 w-4" />,
                }}
              />
            ) : (
              <Table.ScrollArea>
                <Table.Root variant="bordered" size="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Name</Table.Head>
                      <Table.Head>Email</Table.Head>
                      <Table.Head>Phone</Table.Head>
                      <Table.Head align="right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {suppliers.map((supplier) => (
                      <Table.Row key={supplier.id}>
                        <Table.Cell className="font-medium">
                          {supplier.name}
                        </Table.Cell>
                        <Table.Cell>{supplier.email || '—'}</Table.Cell>
                        <Table.Cell>{supplier.phone || '—'}</Table.Cell>
                        <Table.Cell align="right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="text"
                              color="neutral"
                              size="sm"
                              iconOnly
                              leftIcon={<Pencil className="h-4 w-4" />}
                              onClick={() => openEditForm(supplier)}
                              aria-label={`Edit ${supplier.name}`}
                            />
                            <Button
                              variant="text"
                              color="error"
                              size="sm"
                              iconOnly
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() => setDeletingSupplier(supplier)}
                              aria-label={`Delete ${supplier.name}`}
                            />
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            )}
          </Card.Body>
        </Card.Root>
      </div>

      {/* Add/Edit dialog */}
      <Dialog.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Dialog.Body>
                <div className="flex flex-col gap-4">
                  {formError && (
                    <Alert
                      variant="tonal"
                      color="error"
                      title="Error"
                      message={formError}
                    />
                  )}
                  <Field.Root required invalid={!!errors.name}>
                    <Field.Label>Name</Field.Label>
                    <Input {...register('name')} />
                    {errors.name && (
                      <p className="text-body-sm text-error">
                        {errors.name.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root invalid={!!errors.email}>
                    <Field.Label>
                      Email
                      <Field.RequiredIndicator fallback=" (optional)" />
                    </Field.Label>
                    <Input type="email" {...register('email')} />
                    {errors.email && (
                      <p className="text-body-sm text-error">
                        {errors.email.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root invalid={!!errors.phone}>
                    <Field.Label>
                      Phone
                      <Field.RequiredIndicator fallback=" (optional)" />
                    </Field.Label>
                    <Input type="tel" {...register('phone')} />
                    {errors.phone && (
                      <p className="text-body-sm text-error">
                        {errors.phone.message}
                      </p>
                    )}
                  </Field.Root>
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="text"
                  color="neutral"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="filled"
                  color="primary"
                  isLoading={isSubmitting}
                >
                  {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={!!deletingSupplier}
        onOpenChange={(open) => !open && setDeletingSupplier(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Delete Supplier</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              {formError && (
                <Alert
                  variant="tonal"
                  color="error"
                  title="Error"
                  message={formError}
                  className="mb-4"
                />
              )}
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold">{deletingSupplier?.name}</span>?
                This cannot be undone.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="text"
                color="neutral"
                onClick={() => setDeletingSupplier(null)}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                color="error"
                onClick={confirmDelete}
                isLoading={deleteSupplier.isPending}
              >
                Delete
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  )
}
