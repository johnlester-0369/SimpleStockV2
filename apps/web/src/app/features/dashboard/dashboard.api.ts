/**
 * Dashboard Feature (Web) — API Client
 *
 * Single Read call against /api/v1/dashboard/summary — this feature has
 * no mutations, matching account.api.ts's read-only shape.
 *
 * @module features/dashboard/dashboard.api
 */
import apiClient from '@/infra/lib/http/api-client.lib'
import type {
  DashboardSummary,
  DashboardSummaryResponse,
} from './dashboard.types'
import { DASHBOARD_BASE_PATH } from './dashboard.constants'

export const dashboardApi = {
  // signal is forwarded from useQuery's queryFn context — without it,
  // react-query's automatic cancellation never reaches the underlying
  // fetch() call in apiClient
  async getSummary(signal?: AbortSignal): Promise<DashboardSummary> {
    const res = await apiClient.get<DashboardSummaryResponse>(
      `${DASHBOARD_BASE_PATH}/summary`,
      { signal },
    )
    return res.data.data
  },
}
