/**
 * useDashboard hook
 * -----------------
 * Responsibilities
 * - Fetch dashboard category data for the authenticated user.
 * - Provide derived topline metrics and a presentational shape for categories.
 * - Manage a local "current month" cursor when no external date range is supplied.
 *
 * Behavior
 * - If `range` is provided, its [from, to] are used for fetching.
 * - If omitted, the hook derives [from, to] from its internal `currentDate` month.
 * - The hook is presentation-friendly: callers receive `monthLabel` and can render UI without re-deriving.
 *
 * Effects & Dependencies
 * - The fetch effect depends on `userId`, `token`, `currentDate`, and `range?.from/to`.
 * - Callers should pass stable values (Dates from state/useMemo or YYYY-MM-DD strings) to avoid needless refetches.
 *
 * Notes
 * - In React StrictMode (development), effects may mount twice. This hook is written to be idempotent.
 * - Item-level totals are treated as "subtotal"; category-level totals are "total".
 */
// src/features/useDashboard.ts
// Hook to fetch and manage dashboard data (categories, topline) for the authenticated user.
// Consolidates data fetching, sorting, greeting, and current month navigation logic so the page stays presentational.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { fetchCategoriesByUser, computeToplineFromGroups } from '@/lib/dashboardApi'
import type { CategoryGroup } from '@/types/dashboardTypes'
import type { CategoryKey } from '@/types/categoryLabels'

/** Build a month label formatter (e.g., "Oct 2025"); accepts optional locale/format overrides. */
const buildMonthFormatter = (locale?: string, format?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', ...format })

/** First day of the month for a given Date. */
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
/** Last day of the month for a given Date. */
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

type DashboardItem = CategoryGroup['items'][number] & { id: string }
type DashboardCategory = {
  categoryKey: CategoryKey
  category: string
  total: number
  items: DashboardItem[]
}

export type DashboardViewModel = {
  loading: boolean
  error: string | null
  topline: ReturnType<typeof computeToplineFromGroups>
  categories: DashboardCategory[]
  greetingName: string | null
  currentDate: Date
  monthLabel: string
  goPrevMonth: () => void
  goNextMonth: () => void
}

/**
 * Fetches dashboard data and exposes a presentational view model.
 * @param range Optional inclusive date range ({ from, to }) as Date or 'YYYY-MM-DD'.
 * @returns Loading/error flags, topline metrics, normalized categories, month label, and month navigation handlers.
 */
export function useDashboard(range?: { from?: Date | string; to?: Date | string }): DashboardViewModel {
  // --- Identity & Auth ----------------------------------------------------
  const { user } = useAuth()

  // (OIDC token and user id may be undefined during initial handshake)
  // OIDC identity and auth token for the API; both may be undefined during initial auth handshake.
  // Cognito user id (OIDC "sub") and id_token for API auth
  const token = user?.id_token
  const userId = user?.profile?.sub // OIDC user id

  // --- Local State --------------------------------------------------------
  // Local state for data, status, and the internal month cursor (used when no external range is provided).
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [receiptsCount, setReceiptsCount] = useState(0) // backend count for the queried range
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(() => new Date())

  // --- Month Navigation (when external range is not provided) ------------
  // Month navigation (only used when `range` is not supplied by the caller).
  const goPrevMonth = useCallback(() => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() - 1)
      return next
    })
  }, [])

  const goNextMonth = useCallback(() => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + 1)
      return next
    })
  }, [])

  // --- Data Fetch Effect -------------------------------------------------
  // If a range is supplied by the page (date selector), we use it.
  // Otherwise we fall back to the hook's internal month navigation (currentDate).
  // Important: The dependency array includes `range?.from/to` directly.
  // Callers should memoize Dates or pass strings to prevent accidental refetches on each render.
  useEffect(() => {
    // If not authenticated yet, skip for now
    if (!userId) return

    // Guard against state updates after unmount.
    let alive = true // guard against setState after unmount
    ;(async () => {
      // Begin fetch cycle.
      try {
        setLoading(true)
        // Prefer external range; fallback to the hook's current month boundaries.
        const fromDate = range?.from ?? monthStart(currentDate);
        const toDate = range?.to ?? monthEnd(currentDate);
        // Delegate to API layer; it will normalize dates and apply current-month fallback as needed.
        const res = await fetchCategoriesByUser(userId, {
          fromDate,
          toDate,
          authToken: token ?? undefined,
        });
        if (alive) {
          setGroups(res.groups)
          setReceiptsCount(res.receiptsCount ?? 0)
          setError(null)
        }
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Failed to load')
      } finally {
        if (alive) setLoading(false) // Always end loading, even on error, while the component is alive.
      }
    })()
    return () => {
      alive = false
    }
    // Upstream callers provide stable Date instances (memoized or from state), so including raw values is safe and prevents infinite loops.
  }, [
    userId,
    token,
    currentDate,
    range?.from,
    range?.to,
  ])

  // --- Derived Selectors (topline, labels, categories) -------------------
  // Aggregate summary for the header bar (grand total, item count).
  const topline = useMemo(() => computeToplineFromGroups(groups, receiptsCount), [groups, receiptsCount])

  const monthLabel = useMemo(() => {
    const fmt = buildMonthFormatter();
    // External range present: label either a single month or a span (e.g., "Sep 2025 – Oct 2025").
    if (range?.from || range?.to) {
      const from = range?.from ? new Date(range.from) : monthStart(currentDate);
      const to = range?.to ? new Date(range.to) : monthEnd(currentDate);
      const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
      return sameMonth ? fmt.format(from) : `${fmt.format(from)} – ${fmt.format(to)}`;
    }
    // No external range: label based on the hook's internal `currentDate`.
    return fmt.format(currentDate);
  }, [currentDate, range?.from, range?.to])

  // Friendly greeting value; prefer given_name, then name, then email.
  const greetingName =
    user?.profile?.given_name ??
    user?.profile?.name ??
    user?.profile?.email ??
    null

  const categories = useMemo(() => {
    // Sort buckets by category total (descending) for consistent display.
    const normalized = [...groups]
      .sort((a, b) => b.total - a.total) // Sort by total descending (highest first)
      .map<DashboardCategory>(g => ({
        categoryKey: g.categoryKey, // Preserve canonical key for icon/color mapping
        category: g.category, // Human-readable label for display
        total: g.total,
        items: g.items.map<DashboardItem>(item => {
          // Provide a stable render key when backend item id is absent.
          return {
            ...item,
            id: item.id ?? `${g.categoryKey}-${item.name}`,
          }
        }), // Ensure each item has a stable id for rendering
      }))

    return normalized
  }, [groups])

  // --- Return View Model -------------------------------------------------
  // Expose a compact view model for the page component.
  return {
    loading,
    error,
    topline,
    categories,
    greetingName,
    currentDate,
    monthLabel,
    goPrevMonth,
    goNextMonth,
  }
}
