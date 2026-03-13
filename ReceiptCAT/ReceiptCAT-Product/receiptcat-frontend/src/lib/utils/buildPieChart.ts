// src/lib/utils/buildPieChart.ts
// Helpers to prepare pie chart data and build the @ant-design/plots Pie options in one place.

// Importing types used for category keys and chart data structures
import type { CategoryKey } from '@/types/categoryLabels'
import type { PieDatum, CategorySummary } from '../../types/chartTypes'

// CategoryRow represents a single category's data in a consistent format used internally before chart rendering.
// It contains a stable key, a display name, and a numeric total value.
export type CategoryRow = {
  key: CategoryKey;    // Unique, stable identifier for the category
  name: string;        // Display label for the category
  total: number;       // Numeric total amount for the category (always >= 0)
}

/**
 * Converts raw API category summary data into a normalized list of CategoryRow objects.
 * - Ensures all totals are numbers, coercing strings or missing values to 0.
 * - Provides a stable structure with consistent keys and names for downstream processing.
 * 
 * @param categories Array of CategorySummary objects from the API
 * @returns Array of normalized CategoryRow objects
 */
export function normalizeCategoryData(categories: CategorySummary[]): CategoryRow[] {
  return categories.map((category) => ({
    key: category.categoryKey,
    name: category.category,
    total: Number(category.total ?? 0),
  }))
}

/**
 * Filters out categories that are currently hidden based on user toggles in the legend.
 * 
 * @param categories List of CategoryRow objects to filter
 * @param hiddenCategories Set of CategoryKey values representing hidden categories
 * @returns Filtered list of CategoryRow objects that are visible
 */
export function filterVisibleCategories(categories: readonly CategoryRow[], hiddenCategories: ReadonlySet<CategoryKey>): CategoryRow[] {
  return categories.filter((category) => !hiddenCategories.has(category.key))
}

/**
 * Calculates the sum of the total values for all visible categories.
 * This is used to compute percentages for pie chart slices.
 * 
 * @param visibleCategories List of visible CategoryRow objects
 * @returns Sum of totals for visible categories
 */
export function calculateVisibleTotal(visibleCategories: readonly CategoryRow[]): number {
  return visibleCategories.reduce((sum, category) => sum + (Number(category.total) || 0), 0)
}

/**
 * Constructs the data needed to render a pie chart from visible category data.
 * - Excludes categories with zero or negative totals from the chart.
 * - Calculates the percentage each category contributes relative to the visible total.
 * 
 * @param visibleCategories List of visible CategoryRow objects
 * @returns An object containing:
 *   - chartData: Array of PieDatum objects formatted for the pie chart component
 *   - total: The total sum of visible category totals used for normalization
 */
export function createPieChartData(visibleCategories: readonly CategoryRow[]): { chartData: PieDatum[]; total: number } {
  const total = calculateVisibleTotal(visibleCategories)
  const chartData: PieDatum[] = visibleCategories
    .filter((category) => Number(category.total) > 0)
    .map((category) => {
      const value = Number(category.total) || 0
      const percent = total ? value / total : 0
      return { key: category.key, type: category.name, value, percent } // Use 'type' to match PieDatum in chartTypes
    })
  return { chartData, total }
}

// Infer options type from the Pie React component (keeps version compatibility)
export type AntdPieOptions = React.ComponentProps<typeof import('@ant-design/plots').Pie>

/**
 * Build options for @ant-design/plots Pie using prepared data and chart settings.
 * This keeps visual config in one place and avoids duplication inside components.
 */
export function buildPieOptions(params: {
  data: PieDatum[];
  allKeys: CategoryKey[];
  colorMap: Record<CategoryKey, string>;
  size: number;
  currency: string;
  title: string;
  total: number;
}): AntdPieOptions {
  const { data, allKeys, colorMap, size, currency, title, total } = params
  return {
    data,
    angleField: 'value',
    colorField: 'key',
    scale: {
      color: {
        domain: allKeys,
        range: allKeys.map((k) => colorMap[k] || '#ccc'),
      },
    },
    width: size,
    height: size,
    padding: [0, 0, 0, 0],
    autoFit: false,
    animation: false,
    radius: 0.97, // minimize outer whitespace
    innerRadius: 0.6, // readable donut thickness
    legend: false, // custom legend handled externally
    tooltip: {
      title: 'type', // Matches PieDatum.type used across the app
      items: [
        { name: 'Amount', field: 'value', valueFormatter: (v: number) => `${currency}${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { name: 'Percent', field: 'percent', valueFormatter: (v: number) => `${((v || 0) * 100).toFixed(1)}%` },
      ],
    },
    label: {
      position: 'inside',
      text: (d: PieDatum) => {
        const pct = (d?.percent || 0) * 100;
        return pct >= 5 ? `${pct.toFixed(1)}%` : '';
      },
      style: { fontSize: 12 },
    },
    interactions: [{ type: 'element-active' }],
    statistic: {
      title: { content: title },
      content: { content: `${currency}${(Number(total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    },
  }
}
