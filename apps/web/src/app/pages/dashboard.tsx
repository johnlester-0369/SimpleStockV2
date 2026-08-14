import { Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import {
  Package,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Clock,
  FileBarChart,
  Settings,
  Truck,
} from 'lucide-react'
import { useDashboardSummaryQuery } from '@/app/features/dashboard/dashboard.queries'
import type { RecentActivityItem } from '@/app/features/dashboard/dashboard.types'
import Card from '@/app/components/ui/data-display/Card'
import Badge from '@/app/components/ui/data-display/Badge'
import Table from '@/app/components/ui/data-display/Table'
import Button from '@/app/components/ui/buttons/Button'
import { ROUTES } from '@/app/routes/routes.constants'
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function currency(value: number): string {
  return `$${value.toFixed(2)}`
}

const activityTypeLabel: Record<RecentActivityItem['type'], string> = {
  sale: 'Sale',
  in: 'Restock',
  adjustment: 'Adjustment',
}

// Tonal Badge color per transaction type — sale draws down stock (info),
// in restores it (success), adjustment is a manual correction (warning)
const activityTypeBadgeColor: Record<
  RecentActivityItem['type'],
  'info' | 'success' | 'warning'
> = {
  sale: 'info',
  in: 'success',
  adjustment: 'warning',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface QuickAction {
  label: string
  description: string
  icon: React.ReactNode
  href: string
  iconBg: string
  iconColor: string
}

// Every entry links to a route that actually exists in routes.constants.ts —
// the previous version of this page linked Customers to ROUTES.ADMIN.CUSTOMER,
// which was never defined anywhere in that file and would have 404'd
const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Products',
    description: 'Search, sell, and restock inventory',
    icon: <Package className="h-5 w-5" />,
    href: ROUTES.ADMIN.PRODUCTS,
    iconBg: 'bg-primary/10 group-hover:bg-primary/20',
    iconColor: 'text-primary',
  },
  {
    label: 'Suppliers',
    description: 'Manage vendor contacts',
    icon: <Truck className="h-5 w-5" />,
    href: ROUTES.ADMIN.SUPPLIER,
    iconBg: 'bg-success/10 group-hover:bg-success/20',
    iconColor: 'text-success',
  },
  {
    label: 'Reports',
    description: 'Revenue and stock-value trends',
    icon: <FileBarChart className="h-5 w-5" />,
    href: ROUTES.ADMIN.REPORTS,
    iconBg: 'bg-info/10 group-hover:bg-info/20',
    iconColor: 'text-info',
  },
  {
    label: 'Settings',
    description: 'Manage your admin account',
    icon: <Settings className="h-5 w-5" />,
    href: ROUTES.ADMIN.ACCOUNT_SETTINGS,
    iconBg: 'bg-warning/10 group-hover:bg-warning/20',
    iconColor: 'text-warning',
  },
]

/**
 * Admin Dashboard — Overview (live data)
 *
 * Implements SPEC.md's `/dashboard` route: total products, total stock
 * value, a low-stock alert widget, and a recent-activity glance (last
 * 5-10 sells/restocks) — all sourced from
 * GET /api/v1/dashboard/summary (see features/dashboard/*).
 *
 * No mx-auto/min-w-0 here — that shared content-slot styling lives once
 * in components/admin/layout.tsx's <main> wrapper div, so every page
 * under the admin shell gets it for free.
 */
export default function DashboardView() {
  const { data, isLoading, isError } = useDashboardSummaryQuery()

  return (
    <>
      <Helmet>
        <title>Admin Dashboard</title>
        <meta
          name="description"
          content="Overview of key inventory metrics across the platform."
        />
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-headline">Dashboard</h1>
          <p className="mt-1 text-muted">
            At-a-glance view of inventory health.
          </p>
        </div>

        {isError && (
          <Card.Root>
            <Card.Body>
              <p className="text-body-sm text-error">
                Failed to load dashboard data. Please try again.
              </p>
            </Card.Body>
          </Card.Root>
        )}

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card.Root padding="md">
            <Card.Body>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-body-sm text-on-surface-variant">
                    Total Products
                  </p>
                  <p className="text-title-lg font-bold text-on-surface">
                    {isLoading ? '—' : (data?.totalProducts ?? 0)}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card.Root>

          <Card.Root padding="md">
            <Card.Body>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-body-sm text-on-surface-variant">
                    Total Stock Value
                  </p>
                  <p className="text-title-lg font-bold text-on-surface">
                    {isLoading ? '—' : currency(data?.totalStockValue ?? 0)}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card.Root>

          <Card.Root padding="md">
            <Card.Body>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-body-sm text-on-surface-variant">
                    Low Stock Items
                  </p>
                  <p className="text-title-lg font-bold text-on-surface">
                    {isLoading ? '—' : (data?.lowStockCount ?? 0)}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card.Root>
        </div>

        {/* Stock value trend chart — mirrors reports.tsx's AreaChart styling
            for visual consistency; last 7 days only, matching the dashboard's
            "at-a-glance" scope (see dashboard.repository.ts stockTrend()) */}
        <Card.Root>
          <Card.Header withDivider>
            <Card.Title as="h3">Stock Value (Last 7 Days)</Card.Title>
          </Card.Header>
          <Card.Body>
            {isLoading ? (
              <p className="text-body-sm text-on-surface-variant">Loading...</p>
            ) : !data?.stockTrend.length ? (
              <p className="text-body-sm text-on-surface-variant">
                No trend data available yet.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.stockTrend}
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
          </Card.Body>
        </Card.Root>

        {/* Low-stock alert widget */}
        <Card.Root>
          <Card.Header withDivider>
            <Card.Title as="h3" className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <Table.ScrollArea>
              <Table.Root variant="bordered" size="md">
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Product</Table.Head>
                    <Table.Head align="right">Quantity</Table.Head>
                    <Table.Head align="right">Reorder Threshold</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {isLoading ? (
                    <Table.Loading colSpan={3} rows={3} />
                  ) : !data?.lowStockItems.length ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={3}
                        className="text-center text-on-surface-variant"
                      >
                        No items are currently low on stock.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    data.lowStockItems.map((item) => (
                      <Table.Row key={item.id}>
                        <Table.Cell className="font-medium">
                          {item.name}
                        </Table.Cell>
                        <Table.Cell align="right">
                          <Badge
                            variant="tonal"
                            color={item.quantity <= 0 ? 'error' : 'warning'}
                          >
                            {item.quantity}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell align="right">
                          {item.reorderThreshold}
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Card.Body>
        </Card.Root>

        {/* Recent activity feed */}
        <Card.Root>
          <Card.Header withDivider>
            <Card.Title as="h3" className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-on-surface-variant" />
              Recent Activity
            </Card.Title>
          </Card.Header>
          <Card.Body>
            {isLoading ? (
              <p className="text-body-sm text-on-surface-variant">Loading...</p>
            ) : !data?.recentActivity.length ? (
              <p className="text-body-sm text-on-surface-variant">
                No sales or restocks recorded yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant">
                {data.recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-body-md text-on-surface">
                        {item.productName}
                        {item.note ? ` — ${item.note}` : ''}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    <Badge
                      variant="tonal"
                      color={activityTypeBadgeColor[item.type]}
                    >
                      {activityTypeLabel[item.type]} ({item.quantity})
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card.Root>

        {/* Quick actions */}
        <Card.Root>
          <Card.Header withDivider>
            <Card.Title as="h3">Quick Actions</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map((action) => (
                <Link key={action.label} to={action.href} className="block">
                  <div className="group flex items-center gap-3 rounded-lg border border-outline-variant p-4 transition-colors hover:border-primary hover:bg-primary/5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${action.iconBg} ${action.iconColor}`}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <p className="font-medium text-on-surface">
                        {action.label}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card.Body>
        </Card.Root>

        <div className="flex justify-end">
          <Link to={ROUTES.ADMIN.PRODUCTS}>
            <Button
              variant="filled"
              color="primary"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Go to Products
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}
