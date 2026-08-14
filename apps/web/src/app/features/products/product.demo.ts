/**
 * Products Feature (Web) — Demo Data & CRUD
 *
 * Backs product.api.ts when VITE_DEMO_MODE=true. Also owns the demo
 * transaction log (`demo:product-transactions:v5`) that sell()/restock()
 * append to — reports.demo.ts and dashboard.demo.ts both read it through
 * `listDemoProductTransactions()` instead of duplicating storage logic,
 * so there is exactly one transaction history across every demo feature.
 *
 * SEED_PRODUCTS is generated (not hand-authored) via a seeded PRNG so the
 * 100-item dataset is reproducible across reloads/tests without 100+
 * manually typed objects. supplierId values follow the same
 * `demo-sup-001`..`demo-sup-100` id format supplier.demo.ts generates,
 * resolved by convention rather than an actual cross-module import
 * (matching this codebase's existing feature-isolation style).
 *
 * Transaction shape: dashboard.demo.ts's stockTrend chart covers 60 days
 * (~2 months). Early versions of this generator sampled transaction type
 * uniformly at random across the whole window — averaged over 100
 * products that always regresses to a flat line, since restocks and
 * sales cancel out day over day. generateSeedTransactions() now drives a
 * FLUCTUATION_PHASES schedule instead: the 59-day window is split into 5
 * chronological regimes (rising quickly → steady → falling quickly →
 * steady → rising quickly), each biasing transaction type/quantity/
 * density toward that regime's direction, so the resulting stockTrend
 * line actually rises sharply, plateaus, falls sharply, plateaus, and
 * rises again — a real "unpredictable" wave instead of noise around a
 * flat mean.
 *
 * @module features/products/product.demo
 */
import {
  loadDemoCollection,
  saveDemoCollection,
  generateDemoId,
} from '@/infra/lib/storage/local-storage.lib'
import type {
  CreateProductInput,
  ListProductsParams,
  Product,
  ProductListResponse,
  RestockProductInput,
  SellProductInput,
  StockStatus,
  UpdateProductInput,
} from './product.types'

// Products unchanged since the last generator pass — key stays :v3.
const PRODUCTS_STORAGE_KEY = 'demo:products:v3'
// Transactions bumped to :v5 — the type/quantity distribution changed
// materially (phase-biased regimes vs. uniform random fluctuation), so
// returning browsers must reseed rather than keep serving a cached
// history that still averages out flat.
const TRANSACTIONS_STORAGE_KEY = 'demo:product-transactions:v5'
// Matches the real API's implicit page size closely enough for demo
// pagination controls (products.tsx) to behave the same way
const DEMO_PAGE_SIZE = 10

const PRODUCT_SEED_COUNT = 100
// Fixed seed (not Date.now()) — every fresh browser/session generates the
// exact same products/transactions, matching the old hardcoded array's
// reproducibility guarantee while still being algorithmically generated.
const SEED_VALUE = 20260214

export interface DemoProductTransaction {
  id: string
  productId: string
  type: 'sale' | 'in' | 'adjustment'
  quantity: number
  note: string | null
  createdAt: string
}

/**
 * mulberry32 — small, dependency-free seeded PRNG. Deterministic: the same
 * seed always produces the same sequence, so SEED_PRODUCTS/SEED_TRANSACTIONS
 * are stable across reloads without persisting anything beyond the seed.
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

function randFloat(
  rng: () => number,
  min: number,
  max: number,
  decimals = 2,
): number {
  const value = rng() * (max - min) + min
  return Number(value.toFixed(decimals))
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// 12 categories x 8 items = 96 base templates. EXTRA_PRODUCT_TEMPLATES
// below adds 4 more to reach exactly 100 — kept as a separate small array
// rather than padding a category to 9 so every category stays visually
// balanced in the UI's category filter dropdown.
const CATEGORY_ITEMS: Record<string, string[]> = {
  Beverages: [
    'Roast Coffee Beans',
    'Green Tea Bags',
    'Sparkling Water',
    'Orange Juice',
    'Cola Cans',
    'Energy Drink',
    'Almond Milk',
    'Coconut Water',
  ],
  Dairy: [
    'Whole Milk',
    'Greek Yogurt',
    'Cheddar Cheese',
    'Butter',
    'Cream Cheese',
    'Sour Cream',
    'Cottage Cheese',
    'Mozzarella',
  ],
  Bakery: [
    'Sourdough Bread',
    'Cinnamon Rolls',
    'Bagels',
    'Croissants',
    'Baguette',
    'Blueberry Muffins',
    'Dinner Rolls',
    'Pita Bread',
  ],
  Produce: [
    'Avocados',
    'Baby Spinach',
    'Bananas',
    'Tomatoes',
    'Carrots',
    'Broccoli',
    'Bell Peppers',
    'Strawberries',
  ],
  Frozen: [
    'Mixed Berries',
    'Margherita Pizza',
    'Vanilla Ice Cream',
    'Frozen Peas',
    'Chicken Nuggets',
    'French Fries',
    'Waffles',
    'Frozen Shrimp',
  ],
  Household: [
    'Multi-Surface Cleaner',
    'Paper Towels',
    'Trash Bags',
    'Dish Soap',
    'Laundry Detergent',
    'Air Freshener',
    'Sponges',
    'Aluminum Foil',
  ],
  'Personal Care': [
    'Bamboo Toothbrush',
    'Shampoo',
    'Body Wash',
    'Hand Sanitizer',
    'Deodorant',
    'Sunscreen',
    'Lip Balm',
    'Disposable Razors',
  ],
  Electronics: [
    'USB-C Charging Cable',
    'Wireless Mouse',
    'Bluetooth Speaker',
    'Phone Charger',
    'AA Batteries 4-pack',
    'HDMI Cable',
    'Power Bank',
    'Wireless Earbuds',
  ],
  Stationery: [
    'Recycled Notebook',
    'Gel Ink Pens',
    'Sticky Notes',
    'Highlighters',
    'Mechanical Pencils',
    'Binder Clips',
    'Index Cards',
    'Envelopes',
  ],
  'Meat & Seafood': [
    'Chicken Breast',
    'Ground Beef',
    'Salmon Fillet',
    'Pork Chops',
    'Shrimp',
    'Bacon',
    'Turkey Slices',
    'Tilapia Fillet',
  ],
  'Pet Supplies': [
    'Dry Dog Food',
    'Cat Litter',
    'Pet Treats',
    'Dog Leash',
    'Cat Toy',
    'Bird Seed',
    'Fish Food Flakes',
    'Pet Shampoo',
  ],
  'Health & Wellness': [
    'Vitamin C Tablets',
    'Pain Relief Tablets',
    'Adhesive Bandages',
    'First Aid Kit',
    'Multivitamins',
    'Cough Drops',
    'Antibacterial Wipes',
    'Allergy Relief Tablets',
  ],
}

const EXTRA_PRODUCT_TEMPLATES: { category: string; name: string }[] = [
  { category: 'Beverages', name: 'Iced Herbal Tea (Value Pack)' },
  { category: 'Dairy', name: 'Lactose-Free Milk (Value Pack)' },
  { category: 'Bakery', name: 'Multigrain Bread (Value Pack)' },
  { category: 'Produce', name: 'Organic Kale (Value Pack)' },
]

function buildProductTemplates(): { category: string; name: string }[] {
  const templates: { category: string; name: string }[] = []
  for (const [category, names] of Object.entries(CATEGORY_ITEMS)) {
    for (const name of names) {
      templates.push({ category, name })
    }
  }
  return [...templates, ...EXTRA_PRODUCT_TEMPLATES]
}

/**
 * Generates `count` deterministic products. supplierId cycles through the
 * same `demo-sup-001`..`demo-sup-100` id space supplier.demo.ts generates
 * (by convention, not import) so every product resolves to a real
 * supplier when the Products page joins on supplierId.
 */
function generateSeedProducts(count: number): Product[] {
  const rng = mulberry32(SEED_VALUE)
  const templates = buildProductTemplates().slice(0, count)

  return templates.map((template, index) => {
    const idNumber = String(index + 1).padStart(3, '0')
    // Spread creation dates across the last ~120 days so createdAt sort
    // order (products.tsx's default listing order) has realistic variance
    const createdAt = daysAgoIso(120 - Math.floor((index / count) * 100))

    return {
      id: `demo-prod-${idNumber}`,
      name: template.name,
      category: template.category,
      supplierId: `demo-sup-${String((index % 100) + 1).padStart(3, '0')}`,
      unitPrice: randFloat(rng, 1, 25).toFixed(2),
      quantity: randInt(rng, 0, 150),
      reorderThreshold: randInt(rng, 5, 40),
      createdAt,
      updatedAt: createdAt,
    }
  })
}

const TRANSACTION_NOTES: (string | null)[] = [
  'Weekly delivery',
  'Bulk restock',
  'Clearance sale',
  'Damaged in storage',
  'Promo restock',
  null,
  null,
  null,
]

type TxnBias = 'rising' | 'falling' | 'steady'

/**
 * FLUCTUATION_PHASES — the regime schedule driving the "unpredictable"
 * shape. Read chronologically oldest → newest (daysBack counts DOWN from
 * each phase's `from` to its `to`, so phase order below is also the
 * order the chart will visually trace left-to-right):
 *
 *   1. Rising quickly (days 58–47) — heavy restocks, large quantities
 *   2. Steady          (days 46–35) — light, balanced activity
 *   3. Falling quickly (days 34–24) — heavy sales, large quantities
 *   4. Steady          (days 23–12) — light, balanced activity
 *   5. Rising quickly  (days 11–0)  — heavy restocks, large quantities
 *
 * transactionsPerDay controls burst density (more/larger transactions
 * during "quickly" phases = a visibly steeper slope); quantityRange
 * controls how large each individual swing is.
 */
interface FluctuationPhase {
  label: string
  daysBackFrom: number // older edge of the phase (inclusive)
  daysBackTo: number // newer edge of the phase (inclusive)
  bias: TxnBias
  transactionsPerDay: [number, number]
  quantityRange: [number, number]
}

const FLUCTUATION_PHASES: FluctuationPhase[] = [
  {
    label: 'Rising quickly',
    daysBackFrom: 58,
    daysBackTo: 47,
    bias: 'rising',
    transactionsPerDay: [4, 7],
    quantityRange: [25, 70],
  },
  {
    label: 'Steady',
    daysBackFrom: 46,
    daysBackTo: 35,
    bias: 'steady',
    transactionsPerDay: [1, 3],
    quantityRange: [2, 15],
  },
  {
    label: 'Falling quickly',
    daysBackFrom: 34,
    daysBackTo: 24,
    bias: 'falling',
    transactionsPerDay: [4, 7],
    quantityRange: [25, 70],
  },
  {
    label: 'Steady',
    daysBackFrom: 23,
    daysBackTo: 12,
    bias: 'steady',
    transactionsPerDay: [1, 3],
    quantityRange: [2, 15],
  },
  {
    label: 'Rising quickly',
    daysBackFrom: 11,
    daysBackTo: 0,
    bias: 'rising',
    transactionsPerDay: [4, 7],
    quantityRange: [25, 70],
  },
]

/**
 * Rolls a transaction type weighted by the phase's bias. "rising" phases
 * skew heavily toward 'in' (restocks push the trend up); "falling"
 * phases skew heavily toward 'sale' (sales pull the trend down);
 * "steady" phases stay close to even so net movement is small either way.
 */
function pickBiasedType(
  rng: () => number,
  bias: TxnBias,
): DemoProductTransaction['type'] {
  const roll = rng()
  if (bias === 'rising') {
    if (roll < 0.75) return 'in'
    if (roll < 0.95) return 'sale'
    return 'adjustment'
  }
  if (bias === 'falling') {
    if (roll < 0.75) return 'sale'
    if (roll < 0.95) return 'in'
    return 'adjustment'
  }
  // steady
  if (roll < 0.45) return 'sale'
  if (roll < 0.9) return 'in'
  return 'adjustment'
}

/**
 * Generates the full transaction history in two parts:
 *
 * Part 1 (initial stocking, daysBack 59–64): exactly one 'in' transaction
 * per product, placed just past the dashboard's 60-day window edge. This
 * guarantees every product already has stock by the chart's oldest
 * visible day (daysBack 58) — without this, products with no early
 * transaction would show 0 stock value at the start of the chart.
 *
 * Part 2 (phase-based fluctuation, daysBack 0–58): walks each
 * FLUCTUATION_PHASES entry day-by-day, rolling a random burst of
 * transactions per day (`transactionsPerDay`) with type/quantity biased
 * toward that phase's regime. Consecutive same-direction phases compound
 * across their full span, producing a real sharp slope; steady phases
 * stay flat because gains and losses roughly cancel within a narrow
 * quantity band.
 */
function generateSeedTransactions(
  products: Product[],
): DemoProductTransaction[] {
  const rng = mulberry32(SEED_VALUE + 1)
  const transactions: DemoProductTransaction[] = []
  let counter = 1

  // Part 1 — one guaranteed initial stocking transaction per product.
  for (const product of products) {
    const daysBack = randInt(rng, 59, 64)
    transactions.push({
      id: `demo-txn-${String(counter).padStart(4, '0')}`,
      productId: product.id,
      type: 'in',
      // Roughly matches the product's own quantity scale so the initial
      // stock level looks plausible relative to its current quantity.
      quantity: randInt(rng, 20, 120),
      note: 'Initial stocking',
      createdAt: daysAgoIso(daysBack),
    })
    counter += 1
  }

  // Part 2 — regime-biased bursts, phase by phase, day by day.
  for (const phase of FLUCTUATION_PHASES) {
    for (
      let daysBack = phase.daysBackFrom;
      daysBack >= phase.daysBackTo;
      daysBack -= 1
    ) {
      const burstSize = randInt(
        rng,
        phase.transactionsPerDay[0],
        phase.transactionsPerDay[1],
      )
      for (let n = 0; n < burstSize; n += 1) {
        const product = products[randInt(rng, 0, products.length - 1)]
        if (!product) continue
        const type = pickBiasedType(rng, phase.bias)
        const quantity =
          type === 'adjustment'
            ? // Adjustments stay small regardless of phase — they represent
              // corrections/write-offs, not the phase's bulk restock/sale swing
              randInt(rng, -10, 10) || 1
            : randInt(rng, phase.quantityRange[0], phase.quantityRange[1])

        transactions.push({
          id: `demo-txn-${String(counter).padStart(4, '0')}`,
          productId: product.id,
          type,
          quantity,
          note:
            TRANSACTION_NOTES[randInt(rng, 0, TRANSACTION_NOTES.length - 1)] ??
            null,
          createdAt: daysAgoIso(daysBack),
        })
        counter += 1
      }
    }
  }

  return transactions
}

const SEED_PRODUCTS: Product[] = generateSeedProducts(PRODUCT_SEED_COUNT)
const SEED_TRANSACTIONS: DemoProductTransaction[] =
  generateSeedTransactions(SEED_PRODUCTS)

function readProducts(): Product[] {
  return loadDemoCollection(PRODUCTS_STORAGE_KEY, SEED_PRODUCTS)
}
function writeProducts(items: Product[]): void {
  saveDemoCollection(PRODUCTS_STORAGE_KEY, items)
}

/** Full unpaginated read, for reports.demo.ts/dashboard.demo.ts's
 * aggregation — productDemoApi.list() below always paginates. */
export function listAllDemoProducts(): Product[] {
  return readProducts()
}

export function listDemoProductTransactions(): DemoProductTransaction[] {
  return loadDemoCollection(TRANSACTIONS_STORAGE_KEY, SEED_TRANSACTIONS)
}
function writeTransactions(items: DemoProductTransaction[]): void {
  saveDemoCollection(TRANSACTIONS_STORAGE_KEY, items)
}

function recordTransaction(
  entry: Omit<DemoProductTransaction, 'id' | 'createdAt'>,
): void {
  const items = listDemoProductTransactions()
  // unshift (not push) so listDemoProductTransactions() callers get
  // newest-first order for free, matching dashboard.tsx's "Recent
  // Activity" feed expectation without a separate sort step there
  items.unshift({
    ...entry,
    id: generateDemoId(),
    createdAt: new Date().toISOString(),
  })
  writeTransactions(items)
}

function stockStatusOf(product: Product): StockStatus {
  if (product.quantity <= 0) return 'out'
  if (product.quantity <= product.reorderThreshold) return 'low'
  return 'in_stock'
}

export const productDemoApi = {
  list(params: ListProductsParams): ProductListResponse {
    const search = params.search?.toLowerCase()
    let filtered = readProducts().filter((product) => {
      if (search && !product.name.toLowerCase().includes(search)) return false
      if (params.category && product.category !== params.category) return false
      if (params.supplierId && product.supplierId !== params.supplierId)
        return false
      if (params.stockStatus && stockStatusOf(product) !== params.stockStatus)
        return false
      return true
    })
    // Newest-first, mirroring the likely server ordering (createdAt desc)
    // implied by SEED_PRODUCTS/SEED_TRANSACTIONS above
    filtered = filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const page = params.page && params.page > 0 ? params.page : 1
    const start = (page - 1) * DEMO_PAGE_SIZE
    const pageItems = filtered.slice(start, start + DEMO_PAGE_SIZE)

    return {
      data: pageItems,
      meta: { page, limit: DEMO_PAGE_SIZE, total: filtered.length },
    }
  },

  create(input: CreateProductInput): Product {
    const now = new Date().toISOString()
    const product: Product = {
      id: generateDemoId(),
      name: input.name,
      category: input.category ?? null,
      supplierId: input.supplierId ?? null,
      unitPrice: input.unitPrice,
      quantity: 0,
      reorderThreshold: input.reorderThreshold ?? 0,
      createdAt: now,
      updatedAt: now,
    }
    const items = readProducts()
    items.push(product)
    writeProducts(items)
    return product
  },

  update(id: string, input: UpdateProductInput): Product {
    const items = readProducts()
    const index = items.findIndex((p) => p.id === id)
    const existing = items[index]
    if (index === -1 || !existing)
      throw new Error(`Demo product ${id} not found`)
    const updated: Product = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    }
    items[index] = updated
    writeProducts(items)
    return updated
  },

  remove(id: string): void {
    writeProducts(readProducts().filter((p) => p.id !== id))
  },

  sell(id: string, input: SellProductInput): Product {
    const items = readProducts()
    const index = items.findIndex((p) => p.id === id)
    const existing = items[index]
    if (index === -1 || !existing)
      throw new Error(`Demo product ${id} not found`)
    // Mirrors the sell dialog's max={quantity} guard — quantity never
    // goes negative from a sale, even if called out of band
    const quantity = Math.max(0, existing.quantity - input.quantity)
    const updated: Product = {
      ...existing,
      quantity,
      updatedAt: new Date().toISOString(),
    }
    items[index] = updated
    writeProducts(items)
    recordTransaction({
      productId: id,
      type: 'sale',
      quantity: input.quantity,
      note: input.note ?? null,
    })
    return updated
  },

  restock(id: string, input: RestockProductInput): Product {
    const items = readProducts()
    const index = items.findIndex((p) => p.id === id)
    const existing = items[index]
    if (index === -1 || !existing)
      throw new Error(`Demo product ${id} not found`)
    const quantity = Math.max(0, existing.quantity + input.quantity)
    const updated: Product = {
      ...existing,
      quantity,
      updatedAt: new Date().toISOString(),
    }
    items[index] = updated
    writeProducts(items)
    // A negative signed quantity (per restockForm's "correct or write off
    // stock" hint) records as an adjustment, not an 'in' delivery
    recordTransaction({
      productId: id,
      type: input.quantity < 0 ? 'adjustment' : 'in',
      quantity: input.quantity,
      note: input.note ?? null,
    })
    return updated
  },
}
