/**
 * src/components/ChartCard.tsx
 * A reusable Pie (donut) chart card for "Spend by Category".
 *
 * Features
 * - Accepts raw category totals and re-normalizes percentages for only-visible categories.
 * - Encapsulates @ant-design/plots (G2 v5) Pie config to avoid duplication across pages.
 * - Custom legend that toggles categories without reordering colors, keeping a stable domain.
 * - Responsive: chart resizes with its container; grid layout stacks on narrow screens.
 *
 * Accessibility
 * - The custom legend uses <button> elements (keyboard and screen reader friendly).
 * - Each control has aria-label and aria-pressed to reflect its state.
 *
 * Layout strategy
 * - Outer card uses CSS Grid: [ chart | legend ] on wide screens, stacked on narrow screens.
 * - The chart uses near-zero padding and a large outer radius to minimize visual whitespace.
 *
 * Data flow (high level)
 * 1) Normalize → filter visible → aggregate to Pie data (value/percent) → build Pie options.
 * 2) Maintain a stable key domain (allKeysRef) so slice colors do not shuffle between renders.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Small helpers & constants
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)) // Inline helper: constrain v within [min, max]

import React, { useMemo, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { CategoryKey } from '../types/categoryLabels'
import { buildCategoryColorMap } from '../config/categoryColors' // Centralized category colors
import type { CategoryPieCardProps } from '@/types/chartTypes' // Centralized chart types
import { ChartCardLegend } from './ChartCardLegend'
import { useResizeObserver } from '../features/chart/useResizeObserver' // Observe element size
import { normalizeCategoryData, filterVisibleCategories, createPieChartData, buildPieOptions, type AntdPieOptions } from '../lib/utils/buildPieChart' // Data + options builder

import CollapsibleCard from '@/components/CollapsibleCard' // Shared collapsible header wrapper (unified file-name casing)
import Icon from '@mdi/react'
import { mdiChartPie } from '@mdi/js'
import { formatCurrency } from '@/lib/utils/numberFormat'

// Narrow Pie datum shape used locally to avoid `any`
type PieDatumLike = { key?: CategoryKey; categoryKey?: CategoryKey; percent?: number }

// ──────────────────────────────────────────────────────────────────────────────
// Design tokens (layout & sizing)
const CHART_MIN = 250;            // Min chart square (px)
const CHART_MAX = 300;            // Max chart square (px)
const CHART_SCALE = 0.95;         // Convert box width → chart square
const GRID_GAP = 24;              // Gap between chart and legend (px)
const COMPACT_BREAKPOINT = 640;   // Stack chart + legend when container < 640px
const EMPTY_MSG = 'All categories are hidden. Use the legend to show some categories.'; // Empty-state (i18n-friendly)

// Dynamic import keeps SSR safe; Pie renders only on client
const Pie = dynamic(() => import('@ant-design/plots').then(m => m.Pie), { ssr: false })
// Note: Pie is only rendered client-side; dynamic import prevents SSR issues

// Disable built-in legend; use custom legend that re-normalizes percentages.

export default function CategoryPieCard({
  data,
  title = 'Spend by Category',
  currency = '$',
  style,
}: CategoryPieCardProps) {
  // ── Derive source data
  // Normalize numeric totals first (guard against strings/nulls)
  const source = useMemo(() => normalizeCategoryData(data), [data]) // Normalize API payload → numeric rows {key,name,total}

  // ── Stable key domain (prevents color shuffle)
  // Stable color domain across renders: keep discovered keys in order (do not shrink when items are hidden)
  const allKeysRef = useRef<CategoryKey[]>([])
  if (allKeysRef.current.length === 0 && source.length > 0) {
    // Initialize once with the first full set of keys in order
    allKeysRef.current = source.map(d => d.key) // Initialize domain once (first full set)
  } else if (source.length > allKeysRef.current.length) {
    // If new keys appear later, append them in discovered order
    const known = new Set(allKeysRef.current)
    source.forEach(d => { if (!known.has(d.key)) allKeysRef.current.push(d.key) }) // Append unseen keys in discovered order
  }
  const allKeys = allKeysRef.current

  // Build a stable key→color map once per discovered key order (keeps slice colors consistent)
  const colorMapByKey = useMemo(() => buildCategoryColorMap(allKeys), [allKeys]) // Build stable key→color map (consistent slice colors)

  // ── Legend items (labels only; normalization happens inside legend)
  // Legend data: simple list of {key, name} for the pill buttons
  const legendItems = useMemo(
    () => source.map(({ key, name }) => ({ key, name })),
    [source]
  ) // Pass-through labels; legend normalizes/trim/fallback for display

  // ── Legend state
  // Track which categories are hidden via our custom legend (using category keys as keys)
  const [hidden, setHidden] = useState<Set<CategoryKey>>(new Set())

  // Derive visible dataset by excluding hidden categories (filter by key)
  const visible = useMemo(() => filterVisibleCategories(source, hidden), [source, hidden]) // Filter out hidden keys
  
  // ── Aggregate for Pie (value + percent)
  // Build PieDatum[] and sum
  const { chartData, total } = useMemo(() => createPieChartData(visible), [visible])

  // Build a key → percent map for legend (percent of *visible* categories only)
  const percentMap = useMemo(() => {
    const percentMap: Partial<Record<CategoryKey, number>> = {} // percent as 0-100
    for (const datum of chartData as PieDatumLike[]) {
      if (!datum) continue
      const categoryKey = (datum.key ?? datum.categoryKey) as CategoryKey
      if (!categoryKey) continue
      const percent = typeof datum.percent === 'number' ? datum.percent * 100 : 0
      percentMap[categoryKey] = percent
    }
    return percentMap
  }, [chartData])

  // ── Measure layout (responsive)
  // Measure chart container and clamp the square size using CHART_MIN/CHART_MAX (responsive)
  const chartBoxRef = useRef<HTMLDivElement | null>(null) // Container to observe
  const [chartSize, setChartSize] = useState<number>(CHART_MIN) // Initial fallback aligns with token
  
  // Measure the card's inner container to switch layout when space is tight (grid cell)
  const containerRef = useRef<HTMLDivElement | null>(null) // Grid container for chart+legend
  const [containerW, setContainerW] = useState<number>(0)   // Observed width of the container

  // Use shared resize observers to get latest rects (DOMRectReadOnly or null)
  const chartRect = useResizeObserver(chartBoxRef)   // Observe pie container rect
  const containerRect = useResizeObserver(containerRef) // Observe grid wrapper rect

  // ── Effects
  React.useEffect(() => {
    if (!chartRect) return // Guard: not yet measured
    setChartSize(prev => {
      const next = clamp(chartRect.width * CHART_SCALE, CHART_MIN, CHART_MAX) // Derive chart square; clamp within MIN/MAX
      return next === prev ? prev : next
    })
  }, [chartRect])

  React.useEffect(() => {
    if (!containerRect) return // Guard: not yet measured
    setContainerW(containerRect.width)
  }, [containerRect])

  // Compact breakpoint — when the dashboard grid cell is narrow, stack legend below the chart
  const isCompact = containerW > 0 && containerW < COMPACT_BREAKPOINT // Single-column layout below breakpoint

  // ── Legend actions
  const handleToggle = useCallback((k: CategoryKey) => { // Toggle one key's visibility
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }, [])

  const handleReset = useCallback(() => { // Show all keys again
    setHidden(new Set())
  }, [])

  // ── Build Pie options
  // Build and memoize Pie options; only recompute when data/size/currency/title/total change
  // Config for @ant-design/plots Pie; typed via React.ComponentProps of the Pie component
  const config = useMemo<AntdPieOptions>(() => buildPieOptions({
    data: chartData,
    allKeys,
    colorMap: colorMapByKey,
    size: chartSize,
    currency,
    title,
    total,
  }), [chartData, allKeys, colorMapByKey, chartSize, currency, title, total]) // Ant Design Plots Pie options

  // ── Styles (memoized to avoid recreating objects)
  const chartBoxStyle = useMemo<React.CSSProperties>(
    () =>
      isCompact
        ? { width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center' } // Center on mobile
        : { width: '100%', minWidth: 0 },
    [isCompact]
  )

  const pieWrapperStyle = useMemo<React.CSSProperties | undefined>(
    () => (isCompact ? { width: chartSize, margin: '0 auto' } : undefined), // Constrain & center plot
    [isCompact, chartSize]
  )

  const legendWrapperStyle = useMemo<React.CSSProperties | undefined>(
    () => (isCompact ? { padding: '4px 12px 12px 12px' } : undefined), // Extra padding on mobile
    [isCompact]
  )

  // ── Render
  return (
    <CollapsibleCard
      title={title}                          // Header title
      icon={<Icon path={mdiChartPie} size={0.9} color="#444" />} // Optional chart icon
      extra={<span data-testid="chartcard-total">{formatCurrency(total, currency)}</span>}    // Show total in header
      collapsible={true}                     // Allow collapse
      defaultExpanded={true}                 // Start expanded
    >
      {/* Body: padding only; CollapsibleCard handles chrome */}
      <div data-testid="chartcard-root" style={{ padding: '8px 8px 4px 8px', width: '100%', minWidth: 0, overflow: 'hidden', ...style }}>
        {/* Responsive layout: grid with 2 columns (chart | legend); stacks when space is tight */}
        <div
          ref={containerRef}
          role="region" // A11y landmark
          aria-label={title} // Screen reader label
          data-testid="chartcard-container"
          data-compact={isCompact}
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : 'minmax(300px, 2fr) minmax(220px, 3fr)', // Desktop: ~40% (chart) / 60% (legend) with sensible minimums
            alignItems: 'flex-start',
            gap: GRID_GAP, // Space between columns
            minWidth: 0,
          }}
        >
          {/* Left: Pie chart area */}
          <div
            ref={chartBoxRef}
            aria-hidden="true"
            style={chartBoxStyle}
            data-testid="chartcard-chartbox"
          >
            {/* Pie mount point (observed for width) */}
            {chartData.length > 0 ? (
              // Pie chart component
              <div style={pieWrapperStyle}>
                <Pie {...config} />
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: '#555' }} data-testid="chartcard-empty">
                {/* Empty state when no visible slices */}
                {EMPTY_MSG}
              </div>
            )}
          </div>

          {/* Right: Custom legend (toggles visibility without affecting color order) */}
          <div
            style={legendWrapperStyle}
            data-testid="chartcard-legend-wrapper"
          >
            <ChartCardLegend
              source={legendItems}
              hidden={hidden}
              colorMap={colorMapByKey}
              isCompact={isCompact} // Legend spacing adapts to layout
              onToggle={handleToggle}
              onReset={handleReset}
              percentMap={percentMap}
            />
          </div>
        </div>
      </div>
    </CollapsibleCard>
  )
}