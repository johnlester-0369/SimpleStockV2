/**
 * Supplier Feature — Repository (Drizzle-backed)
 *
 * @module app/features/supplier/supplier.repository
 */
import { eq } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import { supplier } from '@/infra/lib/database/schema/supplier.schema.js'
import type {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
} from './supplier.types.js'

function toSupplier(row: typeof supplier.$inferSelect): Supplier {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const supplierRepository = {
  async findAll(): Promise<Supplier[]> {
    // Newest-first so a freshly added supplier is immediately visible at
    // the top of the admin table without requiring a manual sort/refresh
    const rows = await db.query.supplier.findMany({
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    })
    return rows.map(toSupplier)
  },

  async findById(id: string): Promise<Supplier | undefined> {
    const row = await db.query.supplier.findFirst({
      where: eq(supplier.id, id),
    })
    return row ? toSupplier(row) : undefined
  },

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const [row] = await db.insert(supplier).values(input).returning()
    // Drizzle's .returning() on a single-row insert always yields exactly
    // one row — the non-null assertion documents that guarantee rather
    // than silently widening the return type to `Supplier | undefined`
    return toSupplier(row!)
  },

  async update(
    id: string,
    input: UpdateSupplierInput,
  ): Promise<Supplier | undefined> {
    const [row] = await db
      .update(supplier)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(supplier.id, id))
      .returning()
    return row ? toSupplier(row) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const [row] = await db
      .delete(supplier)
      .where(eq(supplier.id, id))
      .returning({ id: supplier.id })
    return !!row
  },
}
