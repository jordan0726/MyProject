// src/components/ChartCardLegend.tsx
// Legend component extracted from ChartCard. All comments in English.

import React from 'react'
import type { CategoryKey } from '../types/categoryLabels'
import { CATEGORY_ICONS } from '../config/categoryIcons'

const PILL_GAP = 8;              // Spacing between swatch and text // Inline comment
const PILL_PADDING_Y = 4;        // Vertical padding for legend pill // Inline comment
const PILL_PADDING_X = 8;        // Horizontal padding for legend pill // Inline comment
const PILL_BORDER_RADIUS = 14;   // Rounded corners for pill // Inline comment
const SWATCH_SIZE = 10;          // Square swatch size // Inline comment
const RESET_FONT_SIZE = 13;      // Font size for reset button // Inline comment
const LABEL_FONT_SIZE = 14;      // Font size for legend label // Inline comment
const COMPACT_TOP_MARGIN = 6;    // Top margin in compact mode // Inline comment
const REGULAR_TOP_MARGIN = 18;   // Top margin in regular mode // Inline comment

/**
 * LegendItem represents a simple mapping of a category key to its display name.
 */
export type LegendItem = { key: CategoryKey; name: string }

/**
 * Props for ChartCardLegend component.
 * - source: array of legend items to render (each with key and label)
 * - hidden: set of category keys currently hidden
 * - colorMap: mapping from category key to color string for swatches
 * - isCompact: layout mode flag to adjust spacing
 * - onToggle: callback to toggle visibility of a category
 * - onReset: callback to reset all categories to visible
 */
export type ChartCardLegendProps = {
  source: LegendItem[]                 // Items to render (key + label)
  hidden: Set<CategoryKey>             // Hidden set from parent
  colorMap: Record<CategoryKey, string>// Color swatches by key
  isCompact: boolean                   // Layout mode from parent
  onToggle: (key: CategoryKey) => void // Toggle handler
  onReset: () => void                  // Reset handler
  iconMap?: Record<CategoryKey, React.ReactNode> // Optional icon mapping (defaults to CATEGORY_ICONS)
  percentMap?: Partial<Record<CategoryKey, number>> // Optional percentage values (partial is OK)
}

/**
 * normalizeLegendSource creates a stable, deduplicated list of legend items.
 * - Dedupe by key (first occurrence wins).
 * - Trim name; if empty/undefined, fallback to key string.
 * - Preserves original order of first occurrences.
 */
export function normalizeLegendSource(source: LegendItem[] | undefined | null): LegendItem[] { // Export for unit tests
  const seen = new Set<CategoryKey>();
  const out: LegendItem[] = [];
  if (!source || source.length === 0) return out;
  for (const it of source) {
    if (!it) continue; // Guard // Inline comment
    const k = it.key as CategoryKey;
    if (seen.has(k)) continue; // Dedupe by key // Inline comment
    seen.add(k);
    const trimmed = (it.name ?? '').trim();
    out.push({ key: k, name: trimmed.length > 0 ? trimmed : String(k) }); // Fallback // Inline comment
  }
  return out;
}

/**
 * allHiddenForLegendSource returns true iff every item in `items` is hidden by the given set.
 */
export function allHiddenForLegendSource(items: LegendItem[], hidden: Set<CategoryKey>): boolean { // Export for unit tests
  return items.length > 0 && items.every(it => hidden.has(it.key));
}

// NOTE: Do not mutate the `hidden` Set in place. Always pass a new Set reference from the parent to ensure React.memo works correctly.
export function ChartCardLegend({ source, hidden, colorMap, isCompact, onToggle, onReset, iconMap = CATEGORY_ICONS, percentMap = {} }: ChartCardLegendProps) {
  const items = React.useMemo(() => normalizeLegendSource(source), [source]);

  const allHiddenForSource = React.useMemo(() => allHiddenForLegendSource(items, hidden), [items, hidden]);

  return (
    <ul
      data-testid="chartcard-legend"
      data-compact={isCompact}
      aria-label="Chart legend"
      // Wrapper keeps legend inside the card; spacing mirrors previous inline styles
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: PILL_GAP,
        listStyle: 'none',
        padding: 0,
        margin: 0,
        minWidth: 0,
        marginTop: isCompact ? COMPACT_TOP_MARGIN : REGULAR_TOP_MARGIN,
      }}
    >
      {items.map(({ key, name }) => {
        // Determine if this category is currently hidden
        const isHidden = hidden.has(key)

        return (
          <li
            key={key}
            data-testid={`legend-item-${key}`}
            data-key={key}
            style={{ display: 'inline-flex' }}
          >
            <button
              type="button"
              data-name={name}
              data-testid={`legend-btn-${key}`}
              onClick={() => onToggle(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: PILL_GAP,
                padding: `${PILL_PADDING_Y}px ${PILL_PADDING_X}px`,
                borderRadius: PILL_BORDER_RADIUS,
                border: isHidden ? '1px solid #ddd' : `1px solid ${colorMap[key] || '#ddd'}`,
                background: isHidden ? '#f5f5f5' : 'transparent',
                color: isHidden ? '#999' : '#333',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: LABEL_FONT_SIZE,
                lineHeight: 1,
                justifyContent: 'flex-start',
                maxWidth: '100%',
              }}
              aria-pressed={!isHidden}
              aria-label={`Toggle ${name}`}
              title={`Toggle ${name}`}
              data-hidden={isHidden}
              aria-describedby={`legend-label-${key}`}
            >
              <span
                data-testid={`legend-swatch-${key}`}
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: SWATCH_SIZE,
                  height: SWATCH_SIZE,
                  borderRadius: 2,
                  background: isHidden ? '#ddd' : (colorMap[key] || '#ccc'),
                  border: '1px solid #ccc',
                  flex: `0 0 ${SWATCH_SIZE}px`,
                }}
              />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {iconMap[key] ?? null}
                <span
                  id={`legend-label-${key}`}
                  data-testid={`legend-label-${key}`}
                  style={{
                    textDecoration: isHidden ? 'line-through' : 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {name}
                  {percentMap[key] !== undefined && (
                    <span style={{ marginLeft: 4, color: 'inherit', fontSize: LABEL_FONT_SIZE - 1 }}>
                      {percentMap[key].toFixed(1)}%
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}

      {/* Show Reset button only when all categories are hidden */}
      {allHiddenForSource && (
        <li data-testid="legend-reset-item" style={{ display: 'inline-flex' }}>
          <button
            data-testid="legend-reset"
            onClick={onReset}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              color: '#333',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: RESET_FONT_SIZE,
            }}
            title="Show all categories"
            aria-label="Show all categories"
          >
            Reset
          </button>
        </li>
      )}
    </ul>
  )
}

export const MemoizedChartCardLegend = React.memo(ChartCardLegend); // Optimize re-renders // Inline comment