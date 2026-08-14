import { useState } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  ShoppingCart,
  PackagePlus,
  Search,
} from 'lucide-react'
import { useProductsQuery } from '@/app/features/products/product.queries'
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useSellProductMutation,
  useRestockProductMutation,
} from '@/app/features/products/product.mutations'
import {
  productFormSchema,
  sellFormSchema,
  restockFormSchema,
  type ProductFormValues,
  type SellFormValues,
  type RestockFormValues,
} from '@/app/features/products/product.schema'
import type {
  Product,
  StockStatus,
} from '@/app/features/products/product.types'
import { useSuppliersQuery } from '@/app/features/supplier/supplier.queries'
import Button from '@/app/components/ui/buttons/Button'
import Input from '@/app/components/ui/forms/Input'
import Combobox, {
  type ComboboxOption,
} from '@/app/components/ui/forms/Combobox'
import { Field } from '@/app/components/ui/forms/Field'
import Card from '@/app/components/ui/data-display/Card'
import Table from '@/app/components/ui/data-display/Table'
import Badge from '@/app/components/ui/data-display/Badge'
import EmptyState from '@/app/components/ui/data-display/EmptyState'
import Alert from '@/app/components/ui/feedback/Alert'
import Dialog from '@/app/components/ui/overlay/Dialog'
import { cn } from '@/infra/core/utils/cn.util'

function stockStatusOf(product: Product): StockStatus {
  if (product.quantity <= 0) return 'out'
  if (product.quantity <= product.reorderThreshold) return 'low'
  return 'in_stock'
}

const stockStatusBadge: Record<
  StockStatus,
  { label: string; color: 'success' | 'warning' | 'error' }
> = {
  in_stock: { label: 'In stock', color: 'success' },
  low: { label: 'Low stock', color: 'warning' },
  out: { label: 'Out of stock', color: 'error' },
}

const STOCK_STATUS_OPTIONS: ComboboxOption[] = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
]

// Select.tsx's prop contract wasn't available to safely build against, but
// Combobox.tsx's was — supplier/stock-status filters and the product form's
// supplier field now use Combobox instead of a native <select>. Textareas
// still fall back to this plain className since Textarea.tsx's contract
// remains unread.
const selectClassName = cn(
  'h-10 rounded-lg border border-outline-variant bg-surface px-3 text-body-sm text-on-surface',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
)

export default function ProductsView() {
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [stockStatus, setStockStatus] = useState<StockStatus | ''>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useProductsQuery({
    search: search || undefined,
    supplierId: supplierId || undefined,
    stockStatus: stockStatus || undefined,
    page,
  })
  const { data: suppliers } = useSuppliersQuery()

  const createProduct = useCreateProductMutation()
  const updateProduct = useUpdateProductMutation()
  const deleteProduct = useDeleteProductMutation()
  const sellProduct = useSellProductMutation()
  const restockProduct = useRestockProductMutation()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null)
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(
    null,
  )
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      supplierId: '',
      unitPrice: 0,
      reorderThreshold: 0,
    },
  })

  const sellForm = useForm<SellFormValues>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: { quantity: 1, note: '' },
  })

  const restockForm = useForm<RestockFormValues>({
    resolver: zodResolver(restockFormSchema),
    defaultValues: { quantity: 1, note: '' },
  })

  function openCreateForm() {
    setEditingProduct(null)
    setFormError(null)
    reset({
      name: '',
      supplierId: '',
      unitPrice: 0,
      reorderThreshold: 0,
    })
    setIsFormOpen(true)
  }

  function openEditForm(product: Product) {
    setEditingProduct(product)
    setFormError(null)
    reset({
      name: product.name,
      supplierId: product.supplierId ?? '',
      unitPrice: Number(product.unitPrice),
      reorderThreshold: product.reorderThreshold,
    })
    setIsFormOpen(true)
  }

  async function onSubmit(values: ProductFormValues) {
    setFormError(null)
    const payload = {
      name: values.name,
      supplierId: values.supplierId || undefined,
      // Product.unitPrice is typed string (server returns Postgres numeric
      // as a string) — the form works in number, so convert at the boundary
      unitPrice: String(values.unitPrice),
      reorderThreshold: values.reorderThreshold ?? 0,
    }
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          input: payload,
        })
      } else {
        await createProduct.mutateAsync(payload)
      }
      setIsFormOpen(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save product',
      )
    }
  }

  async function confirmDelete() {
    if (!deletingProduct) return
    try {
      await deleteProduct.mutateAsync(deletingProduct.id)
      setDeletingProduct(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to delete product',
      )
    }
  }

  function openSellDialog(product: Product) {
    setSellingProduct(product)
    setFormError(null)
    sellForm.reset({ quantity: 1, note: '' })
  }

  async function onSell(values: SellFormValues) {
    if (!sellingProduct) return
    setFormError(null)
    try {
      await sellProduct.mutateAsync({
        id: sellingProduct.id,
        input: { quantity: values.quantity, note: values.note || undefined },
      })
      setSellingProduct(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record sale')
    }
  }

  function openRestockDialog(product: Product) {
    setRestockingProduct(product)
    setFormError(null)
    restockForm.reset({ quantity: 1, note: '' })
  }

  async function onRestock(values: RestockFormValues) {
    if (!restockingProduct) return
    setFormError(null)
    try {
      await restockProduct.mutateAsync({
        id: restockingProduct.id,
        input: { quantity: values.quantity, note: values.note || undefined },
      })
      setRestockingProduct(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to record restock',
      )
    }
  }

  const items = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1

  // True whenever the visible rows are shaped by a search term or a filter
  // combobox rather than reflecting the entire product catalog — drives
  // which of the two empty-state variants renders below.
  const hasActiveFilters = !!(search || supplierId || stockStatus)

  // Resets every filter control (and pagination, since page 1 is the only
  // valid page once filters are cleared) so the table falls back to the
  // full, unfiltered catalog.
  function clearFilters() {
    setPage(1)
    setSearch('')
    setSupplierId('')
    setStockStatus('')
  }

  return (
    <>
      <Helmet>
        <title>Products | SimpleStock V2</title>
        <meta name="description" content="View, sell, and restock inventory." />
      </Helmet>
      <div className="space-y-6">
        {/* Stacks vertically on phones (title above button, full-width) and
            switches to a horizontal row from sm (tablet) up — the previous
            fixed row let "Add Product" overlap the heading under ~380px. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-headline">Products</h1>
            <p className="mt-1 text-muted">
              Search, sell, restock, and manage your inventory.
            </p>
          </div>
          <Button
            variant="filled"
            color="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreateForm}
          >
            Add Product
          </Button>
        </div>

        {isError && (
          <Alert
            variant="tonal"
            color="error"
            title="Error"
            message="Failed to load products. Please try again."
          />
        )}

        {/* Card groups the filter controls visually, matching the table's own
            Card.Root/Card.Body treatment below — filters and results now read
            as two distinct surfaces instead of the filter row floating loose
            above the table. */}
        <Card.Root>
          <Card.Body>
            {/* flex-col-first: filters stack full-width on mobile (each
                control easy to tap); switches to a wrapped row from sm: up
                where there's enough width for an inline layout */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setPage(1)
                    setSearch(e.target.value)
                  }}
                  placeholder="Search products..."
                  className="pl-9"
                />
              </div>
              {/* clearable + placeholder mimic the native <select>'s "All ..."
                  option — Combobox has no built-in empty/reset entry.
                  w-full sm:w-44: full-bleed touch target on mobile (stacked
                  layout above), fixed width once the row goes inline at sm: */}
              <Combobox
                options={
                  suppliers?.map((s) => ({ value: s.id, label: s.name })) ?? []
                }
                value={supplierId}
                onChange={(value) => {
                  setPage(1)
                  setSupplierId(value)
                }}
                placeholder="All suppliers"
                clearable
                fullWidth={false}
                className="w-full sm:w-44"
              />
              <Combobox
                options={STOCK_STATUS_OPTIONS}
                value={stockStatus}
                onChange={(value) => {
                  setPage(1)
                  setStockStatus(value as StockStatus | '')
                }}
                placeholder="All stock levels"
                clearable
                fullWidth={false}
                className="w-full sm:w-44"
              />
            </div>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Body>
            {isLoading ? (
              <Table.ScrollArea>
                <Table.Root variant="bordered" size="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Name</Table.Head>
                      <Table.Head>Category</Table.Head>
                      <Table.Head>Supplier</Table.Head>
                      <Table.Head align="right">Unit Price</Table.Head>
                      <Table.Head align="right">Quantity</Table.Head>
                      <Table.Head>Status</Table.Head>
                      <Table.Head align="right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Loading colSpan={7} rows={5} />
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            ) : items.length === 0 ? (
              // Two distinct empty states: a filtered search/combobox query
              // returning zero rows is not the same situation as a genuinely
              // empty catalog, and conflating them ("No products yet" +
              // "Add Product") misleads a user who is mid-search.
              hasActiveFilters ? (
                <EmptyState
                  icon={Search}
                  title="No results found"
                  description="No products match your search or filters. Try adjusting them."
                  action={{
                    label: 'Clear filters',
                    onClick: clearFilters,
                    icon: <Search className="h-4 w-4" />,
                  }}
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title="No products yet"
                  description="Add your first product to start tracking inventory."
                  action={{
                    label: 'Add Product',
                    onClick: openCreateForm,
                    icon: <Plus className="h-4 w-4" />,
                  }}
                />
              )
            ) : (
              <>
                <Table.ScrollArea>
                  <Table.Root variant="bordered" size="md">
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>Name</Table.Head>
                        <Table.Head>Category</Table.Head>
                        <Table.Head>Supplier</Table.Head>
                        <Table.Head align="right">Unit Price</Table.Head>
                        <Table.Head align="right">Quantity</Table.Head>
                        <Table.Head>Status</Table.Head>
                        <Table.Head align="right">Actions</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {items.map((product) => {
                        const status = stockStatusOf(product)
                        const supplierName = suppliers?.find(
                          (s) => s.id === product.supplierId,
                        )?.name
                        return (
                          <Table.Row key={product.id}>
                            <Table.Cell className="font-medium">
                              {product.name}
                            </Table.Cell>
                            <Table.Cell>{product.category || '—'}</Table.Cell>
                            <Table.Cell>{supplierName || '—'}</Table.Cell>
                            <Table.Cell align="right">
                              ${Number(product.unitPrice).toFixed(2)}
                            </Table.Cell>
                            <Table.Cell align="right">
                              {product.quantity}
                            </Table.Cell>
                            <Table.Cell>
                              <Badge
                                variant="tonal"
                                color={stockStatusBadge[status].color}
                              >
                                {stockStatusBadge[status].label}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell align="right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="text"
                                  color="neutral"
                                  size="sm"
                                  iconOnly
                                  leftIcon={
                                    <ShoppingCart className="h-4 w-4" />
                                  }
                                  onClick={() => openSellDialog(product)}
                                  aria-label={`Sell ${product.name}`}
                                />
                                <Button
                                  variant="text"
                                  color="neutral"
                                  size="sm"
                                  iconOnly
                                  leftIcon={<PackagePlus className="h-4 w-4" />}
                                  onClick={() => openRestockDialog(product)}
                                  aria-label={`Restock ${product.name}`}
                                />
                                <Button
                                  variant="text"
                                  color="neutral"
                                  size="sm"
                                  iconOnly
                                  leftIcon={<Pencil className="h-4 w-4" />}
                                  onClick={() => openEditForm(product)}
                                  aria-label={`Edit ${product.name}`}
                                />
                                <Button
                                  variant="text"
                                  color="error"
                                  size="sm"
                                  iconOnly
                                  leftIcon={<Trash2 className="h-4 w-4" />}
                                  onClick={() => setDeletingProduct(product)}
                                  aria-label={`Delete ${product.name}`}
                                />
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        )
                      })}
                    </Table.Body>
                  </Table.Root>
                </Table.ScrollArea>

                {meta && totalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-body-sm text-on-surface-variant">
                      Page {meta.page} of {totalPages} ({meta.total} products)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        color="neutral"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        color="neutral"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
                {editingProduct ? 'Edit Product' : 'Add Product'}
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
                  <Field.Root invalid={!!errors.supplierId}>
                    <Field.Label>
                      Supplier
                      <Field.RequiredIndicator fallback=" (optional)" />
                    </Field.Label>
                    {/* Combobox emits value via onChange(value), not a native
                        change event — register()'s spread pattern doesn't fit,
                        so Controller bridges react-hook-form to it directly. */}
                    <Controller
                      name="supplierId"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={
                            suppliers?.map((s) => ({
                              value: s.id,
                              label: s.name,
                            })) ?? []
                          }
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="No supplier"
                          clearable
                        />
                      )}
                    />
                  </Field.Root>
                  <Field.Root required invalid={!!errors.unitPrice}>
                    <Field.Label>Unit price</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('unitPrice')}
                    />
                    {errors.unitPrice && (
                      <p className="text-body-sm text-error">
                        {errors.unitPrice.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root invalid={!!errors.reorderThreshold}>
                    <Field.Label>
                      Reorder threshold
                      <Field.RequiredIndicator fallback=" (optional)" />
                    </Field.Label>
                    <Input
                      type="number"
                      min="0"
                      {...register('reorderThreshold')}
                    />
                  </Field.Root>
                  {editingProduct && (
                    <p className="text-body-sm text-on-surface-variant">
                      Quantity ({editingProduct.quantity}) is only changed via
                      Sell / Restock.
                    </p>
                  )}
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
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Sell dialog */}
      <Dialog.Root
        open={!!sellingProduct}
        onOpenChange={(open) => !open && setSellingProduct(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Sell {sellingProduct?.name}</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <form onSubmit={sellForm.handleSubmit(onSell)} noValidate>
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
                  <p className="text-body-sm text-on-surface-variant">
                    Current stock: {sellingProduct?.quantity ?? 0}
                  </p>
                  <Field.Root
                    required
                    invalid={!!sellForm.formState.errors.quantity}
                  >
                    <Field.Label>Quantity to sell</Field.Label>
                    <Input
                      type="number"
                      min="1"
                      max={sellingProduct?.quantity}
                      {...sellForm.register('quantity')}
                    />
                    {sellForm.formState.errors.quantity && (
                      <p className="text-body-sm text-error">
                        {sellForm.formState.errors.quantity.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      Note
                      <Field.RequiredIndicator fallback=" (optional)" />
                    </Field.Label>
                    <textarea
                      {...sellForm.register('note')}
                      rows={2}
                      className={cn(selectClassName, 'h-auto w-full py-2')}
                    />
                  </Field.Root>
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="text"
                  color="neutral"
                  onClick={() => setSellingProduct(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="filled"
                  color="primary"
                  isLoading={sellForm.formState.isSubmitting}
                >
                  Confirm Sale
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Restock dialog */}
      <Dialog.Root
        open={!!restockingProduct}
        onOpenChange={(open) => !open && setRestockingProduct(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Restock {restockingProduct?.name}</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <form onSubmit={restockForm.handleSubmit(onRestock)} noValidate>
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
                  <p className="text-body-sm text-on-surface-variant">
                    Current stock: {restockingProduct?.quantity ?? 0}. Use a
                    negative number to correct or write off stock.
                  </p>
                  <Field.Root
                    required
                    invalid={!!restockForm.formState.errors.quantity}
                  >
                    <Field.Label>Quantity (signed)</Field.Label>
                    <Input
                      type="number"
                      {...restockForm.register('quantity')}
                    />
                    {restockForm.formState.errors.quantity && (
                      <p className="text-body-sm text-error">
                        {restockForm.formState.errors.quantity.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      Note
                      <Field.RequiredIndicator fallback=" (optional)" />
                    </Field.Label>
                    <textarea
                      {...restockForm.register('note')}
                      rows={2}
                      className={cn(selectClassName, 'h-auto w-full py-2')}
                    />
                  </Field.Root>
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="text"
                  color="neutral"
                  onClick={() => setRestockingProduct(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="filled"
                  color="primary"
                  isLoading={restockForm.formState.isSubmitting}
                >
                  Confirm Restock
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Delete Product</Dialog.Title>
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
                <span className="font-semibold">{deletingProduct?.name}</span>?
                This cannot be undone.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="text"
                color="neutral"
                onClick={() => setDeletingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                color="error"
                onClick={confirmDelete}
                isLoading={deleteProduct.isPending}
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
