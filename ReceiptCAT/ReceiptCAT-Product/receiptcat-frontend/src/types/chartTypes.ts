// src/types/charts.ts
// Centralised types for chart-related components (reusing core types from dashboard).

import type { CategoryKey } from './categoryLabels'
import type { CSSProperties } from 'react'
import type { CategoryGroup } from './dashboardTypes' // Reuse canonical dashboard grouping type

// Lightweight summary view derived from CategoryGroup
export type CategorySummary = Pick<CategoryGroup, 'categoryKey' | 'category' | 'total'>

// Normalised datum consumed by Pie charts
export type PieDatum = {
  key: CategoryKey   // Stable category key for color domain
  type: string       // Display name (label)
  value: number      // Numeric amount
  percent: number    // 0..1 share after re-normalisation
}

// Public props for CategoryPieCard (ChartCard)
export type CategoryPieCardProps = {
  data: CategorySummary[]    // Raw category summary from dashboard hook
  title?: string             // Optional title for the card
  currency?: string          // Currency symbol, default '$'
  style?: CSSProperties      // Optional style override
}