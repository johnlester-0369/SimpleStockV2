import { useMemo, useState } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import {
  useSalesSummaryQuery,
  useStockValueQuery,
} from '@/app/features/reports/reports.queries'
import type { SalesSummaryProductRow } from '@/app/features/reports/reports.types'
import Button from '@/app/components/ui/buttons/Button'
import DatePicker from '@/app/components/ui/forms/DatePicker'
import Card from '@/app/components/ui/data-display/Card'
import Table from '@/app/components/ui/data-display/Table'
import Alert from '@/app/components/ui/feedback/Alert'
import { cn } from '@/infra/core/utils/cn.util'
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// select/native-input styling reused verbatim from products.tsx/supplier.tsx
// (Select.tsx's contract wasn't available to safely build against there either)
const selectClassName = cn(
  'h-10 rounded-lg border border-outline-variant bg-surface px-3 text-body-sm text-on-surface',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
)

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function currency(value: number): string {
  return `$${value.toFixed(2)}`
}

// Builds a downloadable CSV client-side — SPEC.md asks for CSV/PDF export
// but defines no server endpoint for it, so this derives the file from data
// already on-screen rather than adding a new API surface or a PDF dependency
function buildSalesCsv(rows: SalesSummaryProductRow[]): string {
  const header = 'Product,Quantity Sold,Revenue'
  const lines = rows.map(
    (r) =>
      `"${r.name.replace(/"/g, '""')}",${r.quantitySold},${r.revenue.toFixed(2)}`,
  )
  return [header, ...lines].join('\n')
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Reports — /reports
 *
 * Read-only per SPEC.md: revenue over a date range, stock value over time,
 * best/worst moving products, CSV export. No create/update/delete here —
 * the "CRUD" in this feature is entirely Read against the internal
 * transaction log, aggregated server-side by reports.repository.ts.
 */
export default function ReportsView() {
  const [from, setFrom] = useState(daysAgoIso(30))
  const [to, setTo] = useState(todayIso())

  const filters = { from, to }
  const {
    data: salesSummary,
    isLoading: isSalesLoading,
    isError: isSalesError,
  } = useSalesSummaryQuery(filters)
  const {
    data: stockValue,
    isLoading: isStockLoading,
    isError: isStockError,
  } = useStockValueQuery(filters)

  const byProduct = salesSummary?.byProduct ?? []
  const bestMovers = byProduct.slice(0, 5)
  const worstMovers = [...byProduct].reverse().slice(0, 5)

  const maxStockValue = useMemo(
    () => Math.max(1, ...(stockValue?.points.map((p) => p.totalValue) ?? [0])),
    [stockValue],
  )

  function handleExport() {
    if (!byProduct.length) return
    downloadCsv(`sales-summary-${from}-to-${to}.csv`, buildSalesCsv(byProduct))
  }

  return (
    <>
      <Helmet>
        <title>Reports | SimpleStock V2</title>
        <meta
          name="description"
          content="Sales revenue, stock value trends, and top/bottom movers."
        />
      </Helmet>
      <div className="space-y-6">
        {/* Stacks vertically on phones and switches to a wrapped horizontal
            row from sm (tablet) up — the previous fixed flex row let the
            Export button crowd the heading under ~380px. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-headline">Reports</h1>
            <p className="mt-1 text-muted">
              Business insights summarizing sell/restock activity over time.
            </p>
          </div>
          <Button
            variant="outline"
            color="neutral"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={!byProduct.length}
          >
            Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <DatePicker
            id="report-from"
            label="From"
            value={from}
            maxDate={to}
            onChange={setFrom}
          />
          <DatePicker
            id="report-to"
            label="To"
            value={to}
            minDate={from}
            maxDate={todayIso()}
            onChange={setTo}
          />
        </div>

        {(isSalesError || isStockError) && (
          <Alert
            variant="tonal"
            color="error"
            title="Error"
            message="Failed to load report data. Please try again."
          />
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card.Root padding="md">
            <Card.Body>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-body-sm text-on-surface-variant">
                    Total Revenue
                  </p>
                  <p className="text-title-lg font-bold text-on-surface">
                    {isSalesLoading
                      ? '—'
                      : currency(salesSummary?.totalRevenue ?? 0)}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card.Root>
          <Card.Root padding="md">
            <Card.Body>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-body-sm text-on-surface-variant">
                    Units Sold
                  </p>
                  <p className="text-title-lg font-bold text-on-surface">
                    {isSalesLoading
                      ? '—'
                      : (salesSummary?.totalQuantitySold ?? 0)}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card.Root>
        </div>

        {/* Stock value trend rendered via Recharts AreaChart — replaces the
            previous manual CSS bar visualization for smoother interpolation,
            built-in tooltips, and axis labeling with minimal custom code */}
        <Card.Root>
          <Card.Header withDivider>
            <Card.Title as="h3">Stock Value Over Time</Card.Title>
          </Card.Header>
          <Card.Body>
            {isStockLoading ? (
              <p className="text-body-sm text-on-surface-variant">Loading...</p>
            ) : !stockValue?.points.length ? (
              <p className="text-body-sm text-on-surface-variant">
                No data for this range.
              </p>
            ) : (
              // Chart grows with viewport (h-64 phone → h-72 tablet → h-80
              // laptop/desktop), matching dashboard.tsx's trend chart so
              // both pages use the available width/height consistently.
              <div className="h-64 w-full sm:h-72 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stockValue.points}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgb(var(--rgb-outline-variant) / 0.5)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="rgb(var(--rgb-on-surface-variant))"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="rgb(var(--rgb-on-surface-variant))"
                      tickFormatter={(value: number) => currency(value)}
                      width={80}
                    />
                    {/* formatter/labelFormatter keep the tooltip in the same
                        currency + date shape the old hover badge used, so
                        the on-hover reading experience is unchanged */}
                    <Tooltip
                      formatter={(value: number) => currency(value)}
                      labelFormatter={(label: string) => label}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalValue"
                      stroke="rgb(var(--rgb-primary))"
                      fill="rgb(var(--rgb-primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-3 text-body-sm text-on-surface-variant">
              Uses each product&apos;s current price — not a full historical
              price table — so this is a rough trend, not exact historical
              accounting.
            </p>
          </Card.Body>
        </Card.Root>

        {/* Best / worst movers */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card.Root>
            <Card.Header withDivider>
              <Card.Title as="h3" className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Best Movers
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <Table.ScrollArea>
                <Table.Root variant="bordered" size="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Product</Table.Head>
                      <Table.Head align="right">Qty</Table.Head>
                      <Table.Head align="right">Revenue</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {isSalesLoading ? (
                      <Table.Loading colSpan={3} rows={3} />
                    ) : bestMovers.length === 0 ? (
                      <Table.Row>
                        <Table.Cell
                          colSpan={3}
                          className="text-center text-on-surface-variant"
                        >
                          No sales in this range.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      bestMovers.map((row) => (
                        <Table.Row key={row.productId}>
                          <Table.Cell className="font-medium">
                            {row.name}
                          </Table.Cell>
                          <Table.Cell align="right">
                            {row.quantitySold}
                          </Table.Cell>
                          <Table.Cell align="right">
                            {currency(row.revenue)}
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header withDivider>
              <Card.Title as="h3" className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-error" />
                Worst Movers
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <Table.ScrollArea>
                <Table.Root variant="bordered" size="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Product</Table.Head>
                      <Table.Head align="right">Qty</Table.Head>
                      <Table.Head align="right">Revenue</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {isSalesLoading ? (
                      <Table.Loading colSpan={3} rows={3} />
                    ) : worstMovers.length === 0 ? (
                      <Table.Row>
                        <Table.Cell
                          colSpan={3}
                          className="text-center text-on-surface-variant"
                        >
                          No sales in this range.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      worstMovers.map((row) => (
                        <Table.Row key={row.productId}>
                          <Table.Cell className="font-medium">
                            {row.name}
                          </Table.Cell>
                          <Table.Cell align="right">
                            {row.quantitySold}
                          </Table.Cell>
                          <Table.Cell align="right">
                            {currency(row.revenue)}
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            </Card.Body>
          </Card.Root>
        </div>
      </div>
    </>
  )
}
