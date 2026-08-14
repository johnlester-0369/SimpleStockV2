/**
 * Supplier Feature (Web) — Demo Data & CRUD
 *
 * Backs supplier.api.ts when VITE_DEMO_MODE=true — every method here
 * mirrors supplierApi's real signatures exactly so supplier.api.ts's
 * demo branch is a one-line delegation per method, never a reshaping.
 *
 * SEED_SUPPLIERS is generated (not hand-authored) via a seeded PRNG so the
 * dataset is reproducible across reloads/tests while scaling to 100 items
 * without 100 lines of manually typed objects. IDs stay fixed-format
 * (`demo-sup-001`..`demo-sup-100`) so product.demo.ts's generated
 * supplierId references resolve deterministically without either module
 * importing the other.
 *
 * @module features/supplier/supplier.demo
 */
import {
  loadDemoCollection,
  saveDemoCollection,
  generateDemoId,
} from '@/infra/lib/storage/local-storage.lib'
import type {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
} from './supplier.types'

// :v3 suffix — bumped so returning browsers with a stale cached demo
// session (pre-dating the 100-item generated dataset) fall through
// loadDemoCollection's cache-miss branch and actually reseed, instead of
// silently keeping the old 15-item cached array forever.
const SUPPLIERS_STORAGE_KEY = 'demo:suppliers:v3'

const SEED_COUNT = 100
// Fixed seed (not Date.now()) — every fresh browser/session generates the
// exact same 100 suppliers, matching the old hardcoded array's
// reproducibility guarantee while still being algorithmically generated.
const SEED_VALUE = 20260114

/**
 * mulberry32 — small, dependency-free seeded PRNG. Deterministic: the same
 * seed always produces the same sequence, so SEED_SUPPLIERS is stable
 * across reloads without persisting anything beyond the seed itself.
 */
function mulberry32(seed: number): () => number {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/** Fisher-Yates shuffle driven by the seeded RNG — keeps company-name
 * pairing deterministic instead of relying on array declaration order. */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, 0, i)
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return result
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// 25 prefixes x 10 suffixes = 250 combinations, comfortably covering the
// 100 suppliers needed without repeats when shuffled and sliced below.
const COMPANY_PREFIXES = [
  'Pacific',
  'Golden Valley',
  'Northwind',
  'Evergreen',
  'Frostline',
  'Homestead',
  'Clearwater',
  'Sunrise',
  'BrightWell',
  'Circuit & Byte',
  'Paper Trail',
  'Coastal',
  'Meadowbrook',
  'Artisan',
  'Riverside',
  'Silver Peak',
  'Cedar Grove',
  'Blue Harbor',
  'Ironwood',
  'Maple Ridge',
  'Stonebridge',
  'Amber Fields',
  'Crescent Bay',
  'Willow Creek',
  'Granite Hill',
]

const COMPANY_SUFFIXES = [
  'Co.',
  'Supply',
  'Traders',
  'Foods',
  'Distributors',
  'Wholesale',
  'Group',
  'Partners',
  'Imports',
  'Market',
]

function buildCompanyNamePool(): string[] {
  const pool: string[] = []
  for (const prefix of COMPANY_PREFIXES) {
    for (const suffix of COMPANY_SUFFIXES) {
      pool.push(`${prefix} ${suffix}`)
    }
  }
  return pool
}

/**
 * Generates `count` deterministic suppliers. Every 7th supplier (by
 * generation order) gets a null email or phone — mirrors the small number
 * of intentionally-incomplete records in the original hand-authored seed
 * (demo-sup-06, demo-sup-08, demo-sup-15) so the UI's "—" empty-field
 * rendering still has real data to exercise.
 */
function generateSeedSuppliers(count: number): Supplier[] {
  const rng = mulberry32(SEED_VALUE)
  const names = shuffle(buildCompanyNamePool(), rng).slice(0, count)

  return names.map((name, index) => {
    const idNumber = String(index + 1).padStart(3, '0')
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '')
    // Spread creation dates across the last ~150 days so createdAt sort
    // order (used implicitly by the account/supplier list views) has
    // realistic variance instead of all suppliers sharing one timestamp.
    const createdAt = daysAgoIso(150 - Math.floor((index / count) * 150))

    const missingEmail = index % 7 === 5
    const missingPhone = index % 7 === 3

    return {
      id: `demo-sup-${idNumber}`,
      name,
      email: missingEmail ? null : `orders@${slug}.demo`,
      phone: missingPhone ? null : `555-${String(1000 + index).slice(-4)}`,
      createdAt,
      updatedAt: createdAt,
    }
  })
}

const SEED_SUPPLIERS: Supplier[] = generateSeedSuppliers(SEED_COUNT)

function readSuppliers(): Supplier[] {
  return loadDemoCollection(SUPPLIERS_STORAGE_KEY, SEED_SUPPLIERS)
}
function writeSuppliers(items: Supplier[]): void {
  saveDemoCollection(SUPPLIERS_STORAGE_KEY, items)
}

export const supplierDemoApi = {
  list(): Supplier[] {
    return readSuppliers()
  },

  create(input: CreateSupplierInput): Supplier {
    const now = new Date().toISOString()
    const supplier: Supplier = {
      id: generateDemoId(),
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const items = readSuppliers()
    items.push(supplier)
    writeSuppliers(items)
    return supplier
  },

  update(id: string, input: UpdateSupplierInput): Supplier {
    const items = readSuppliers()
    const index = items.findIndex((s) => s.id === id)
    const existing = items[index]
    if (index === -1 || !existing)
      throw new Error(`Demo supplier ${id} not found`)
    const updated: Supplier = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    }
    items[index] = updated
    writeSuppliers(items)
    return updated
  },

  remove(id: string): void {
    writeSuppliers(readSuppliers().filter((s) => s.id !== id))
  },
}
