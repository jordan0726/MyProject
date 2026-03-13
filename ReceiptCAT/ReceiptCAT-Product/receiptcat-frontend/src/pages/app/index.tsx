// src/pages/app/index.tsx
// -------------------------
// Dashboard landing page for ReceiptCAT.
// Auth-gated via <RequireAuth> and displayed inside <AppLayout>.
// Shows monthly summary (total spend, items, receipts) and categorized breakdowns.
// Provides month navigation via <DashboardDateSelector>.
// Uses data from the useDashboard() hook — handles all state and data fetching.

// --- Imports -----------------------------------------------------------
import AppLayout from '../../layouts/AppLayout'
import RequireAuth from '../../components/RequireAuth'
import { useDashboard } from '@/features/useDashboard'
import CategoryCard from '../../components/CategoryCard'
import CategoryPieCard from '../../components/ChartCard'
import DashboardGrid from '../../components/DashboardGrid'
import DashboardDateSelector from '../../components/DashboardDateSelector'
import s from './Dashboard.module.css'
import { useState, useMemo } from 'react'

// --- Component Definition ---------------------------------------------
/**
 * DashboardHome Component
 * -----------------------
 * Renders the main authenticated dashboard view.
 *
 * Responsibilities:
 * - Displays a greeting using user info from the useDashboard() hook.
 * - Shows topline monthly stats (total, item count, receipt count).
 * - Provides navigation between months (previous/next).
 * - Displays category cards and a pie chart summary for spending by category.
 * - Handles loading and error states.
 *
 * Note: This component does not fetch data directly — it relies entirely on useDashboard().
 */
export default function DashboardHome() {
  // --- Local State -----------------------------------------------------
  // Local date selection state drives the range passed into useDashboard()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  // Optional custom range selected from the popover; when set, it overrides month range
  const [range, setRange] = useState<{ start?: Date; end?: Date } | undefined>(undefined)

  // --- Month Boundary Helpers -----------------------------------------
  // Compute first/last day of the selected month (Date objects)
  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1) // first day of month
  const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0) // last day of month

  // --- Derived Month Range (Memoized) ---------------------------------
  // Memoize month boundaries derived from selectedDate to avoid recreating Date objects on each render
  const computedFrom = useMemo(() => monthStart(selectedDate), [selectedDate]) // first day of month
  const computedTo = useMemo(() => monthEnd(selectedDate), [selectedDate])     // last day of month

  // --- Data Fetch Hook -------------------------------------------------
  const {
    loading,
    error,
    topline,
    categories,
    greetingName,
    monthLabel,
  } = useDashboard({
    from: range?.start ?? computedFrom,
    to: range?.end ?? computedTo,
  })

  // --- Greeting Logic --------------------------------------------------
  // Fallback greeting if user name is not available
  const heroGreeting = greetingName ?? 'Dashboard'

  // --- Render ----------------------------------------------------------
  return (
    // Ensure only authenticated users can access this page
    <RequireAuth>
      {/* Common layout (header, nav, etc.) shared across app routes */}
      <AppLayout>
        <div className={s.container}>
          {/* --- Hero Section ------------------------------------------ */}
          {/* Hero section — greeting + topline summary for the selected month */}
          <section className={s.hero}>
            <h2 className={s.greeting}>Hello, {heroGreeting}</h2>
            <div className={s.topline}>
              <div className={s.topLeft}>
                <div className={s.month}>{monthLabel}</div>
                {topline && <div className={s.total}>${topline.total.toFixed(2)}</div>}
              </div>

              {topline && (
                <div className={s.stats}>
                  <div className={s.statBox}>
                    <div className={s.statValue}>{topline.items}</div>
                    <div className={s.statLabel}>Items</div>
                  </div>
                  <div className={s.statBox}>
                    <div className={s.statValue}>{topline.receipts}</div>
                    <div className={s.statLabel}>Receipts</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* --- Divider ---------------------------------------------- */}
          {/* Divider separating hero section and content */}
          <hr className={s.divider} />

          {/* --- Date Selector ---------------------------------------- */}
          {/* Date selector supports two modes:
              1) Month nav (prev/next) — clears custom range and queries full month.
              2) Custom range — sets [start,end] and overrides month range for API. */}
          <DashboardDateSelector
            date={selectedDate}
            // Month chevrons switch the month and clear any custom range so the whole month is queried
            onPrev={() => {
              setRange(undefined) // clear custom range
              setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) // go to previous month
            }}
            onNext={() => {
              setRange(undefined) // clear custom range
              setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) // go to next month
            }}
            // When user applies a custom range in the popover, store it and (optionally) align selected month to start
            onRangeChange={(start, end) => {
              setRange({ start, end }) // override month range with custom range
              // Align the center month label to the start's month for consistency
              if (start) setSelectedDate(new Date(start.getFullYear(), start.getMonth(), 1))
            }}
            range={range}
          />

          {/* --- Loading & Error States ------------------------------- */}
          {/* Loading and error display */}
          {loading && <div style={{ padding: 16 }}>Loading…</div>}
          {error && !loading && (
            <div style={{ padding: 16, color: 'crimson' }}>{error}</div>
          )}

          {/* --- Main Content (Category Grid / Placeholder) ----------- */}
          {/* Main content — category grid or placeholder message when empty */}
          {!loading && !error && (
            categories.length === 0 ? (
              // Message shown when no categorized data available yet
              <div style={{ padding: 16, textAlign: 'center', color: '#555' }}>
                No categories available yet. Your data will appear here once you upload receipts.
              </div>
            ) : (
              <>
                {/* Dashboard grid containing chart and category cards */}
                <DashboardGrid>
                  {/* Pie chart summarizing spending by category */}
                  <div className="span-2">
                    <CategoryPieCard
                      data={categories}
                      title="Spend by Category"
                      currency="$"
                      style={{ minWidth: 320 }}
                    />
                  </div>
                  {/* Category cards list — each shows total and item details per category */}
                  {categories.map(cat => (
                    <CategoryCard
                      key={cat.categoryKey}
                      categoryKey={cat.categoryKey}
                      title={cat.category}
                      total={cat.total}
                      items={cat.items}
                      collapsible
                      defaultExpanded
                    />
                  ))}
                </DashboardGrid>
              </>
            )
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
