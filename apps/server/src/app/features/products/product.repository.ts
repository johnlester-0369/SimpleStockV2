/**
 * Products Feature — Repository (Drizzle-backed)
 *
 * sell()/restock() use a single atomic UPDATE guarded by a WHERE clause
 * (rather than read-then-write) so two concurrent requests can never both
 * pass a separate stock check and combine to oversell/underflow.
 *
 * @module app/features/products/product.repository
 */
import { and, desc, eq, gte, ilike, sql } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import {
  product,
  productTransaction,
} from '@/infra/lib/database/schema/product.schema.js'
import {
  ConflictError,
  NotFoundError,
} from '@/infra/lib/errors/app-error.lib.js'
import type {
  CreateProductInput,
  ListProductsFilters,
  Product,
  RestockProductInput,
  SellProductInput,
  UpdateProductInput,
} from './product.types.js'

function toProduct(row: typeof product.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supplierId: row.supplierId,
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    reorderThreshold: row.reorderThreshold,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const productRepository = {
  async findAll(
    filters: ListProductsFilters,
  ): Promise<{ items: Product[]; total: number }> {
    // stock_status is derived (quantity vs reorderThreshold), not a stored
    // column — expressed as SQL comparisons so a threshold edit never needs
    // a backfill migration on existing rows
    const conditions = [
      filters.search ? ilike(product.name, `%${filters.search}%`) : undefined,
      filters.category ? eq(product.category, filters.category) : undefined,
      filters.supplierId
        ? eq(product.supplierId, filters.supplierId)
        : undefined,
      filters.stockStatus === 'out' ? eq(product.quantity, 0) : undefined,
      filters.stockStatus === 'low'
        ? and(
            sql`${product.quantity} > 0`,
            sql`${product.quantity} <= ${product.reorderThreshold}`,
          )
        : undefined,
      filters.stockStatus === 'in_stock'
        ? sql`${product.quantity} > ${product.reorderThreshold}`
        : undefined,
    ].filter(Boolean)

    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ count }]] = await Promise.all([
      db
        .select()
        .from(product)
        .where(where)
        .orderBy(desc(product.createdAt))
        .limit(filters.limit)
        .offset((filters.page - 1) * filters.limit),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(product)
        .where(where),
    ])

    return { items: rows.map(toProduct), total: count }
  },

  async findById(id: string): Promise<Product | undefined> {
    const row = await db.query.product.findFirst({ where: eq(product.id, id) })
    return row ? toProduct(row) : undefined
  },

  async create(input: CreateProductInput): Promise<Product> {
    const [row] = await db
      .insert(product)
      .values({
        name: input.name,
        category: input.category ?? null,
        supplierId: input.supplierId ?? null,
        unitPrice: String(input.unitPrice),
        reorderThreshold: input.reorderThreshold ?? 0,
      })
      .returning()
    return toProduct(row!)
  },

  async update(
    id: string,
    input: UpdateProductInput,
  ): Promise<Product | undefined> {
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (input.name !== undefined) patch['name'] = input.name
    if (input.category !== undefined) patch['category'] = input.category
    if (input.supplierId !== undefined) patch['supplierId'] = input.supplierId
    if (input.unitPrice !== undefined)
      patch['unitPrice'] = String(input.unitPrice)
    if (input.reorderThreshold !== undefined)
      patch['reorderThreshold'] = input.reorderThreshold

    const [row] = await db
      .update(product)
      .set(patch)
      .where(eq(product.id, id))
      .returning()
    return row ? toProduct(row) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const [row] = await db
      .delete(product)
      .where(eq(product.id, id))
      .returning({ id: product.id })
    return !!row
  },

  async sell(
    id: string,
    userId: string,
    input: SellProductInput,
  ): Promise<Product> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(product)
        .set({
          quantity: sql`${product.quantity} - ${input.quantity}`,
          updatedAt: new Date(),
        })
        .where(and(eq(product.id, id), gte(product.quantity, input.quantity)))
        .returning()

      if (!row) {
        const exists = await tx.query.product.findFirst({
          where: eq(product.id, id),
        })
        if (!exists) throw new NotFoundError('Product not found')
        throw new ConflictError('Insufficient stock for this sale')
      }

      await tx.insert(productTransaction).values({
        productId: id,
        type: 'sale',
        quantity: input.quantity,
        note: input.note ?? null,
        unitPrice: row.unitPrice,
        userId,
      })

      return toProduct(row)
    })
  },

  async restock(
    id: string,
    userId: string,
    input: RestockProductInput,
  ): Promise<Product> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(product)
        .set({
          quantity: sql`${product.quantity} + ${input.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(product.id, id),
            gte(sql`${product.quantity} + ${input.quantity}`, 0),
          ),
        )
        .returning()

      if (!row) {
        const exists = await tx.query.product.findFirst({
          where: eq(product.id, id),
        })
        if (!exists) throw new NotFoundError('Product not found')
        throw new ConflictError('Adjustment would reduce stock below zero')
      }

      // Positive input → `in` restock; negative → corrective `adjustment` (SPEC.md)
      await tx.insert(productTransaction).values({
        productId: id,
        type: input.quantity >= 0 ? 'in' : 'adjustment',
        quantity: input.quantity,
        note: input.note ?? null,
        userId,
      })

      return toProduct(row)
    })
  },
}
