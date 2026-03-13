// src/components/CategoryCard.tsx
// Category list card that reuses the generic CollapsibleCard header + animation.
// This keeps header/chevron/animation consistent with other cards (e.g., ChartCard).

import React from 'react'
import { CATEGORY_ICONS } from '@/config/categoryIcons'
import { formatCurrency } from '@/lib/utils/numberFormat'
import CollapsibleCard from '@/components/CollapsibleCard'

// Item row type from dashboard payload (lightweight)
type Item = { id: string; name: string; price: number }

export default function CategoryCard(props: {
  categoryKey: keyof typeof CATEGORY_ICONS
  title: string
  total: number
  items: Item[]
  /** If true, header can toggle expand/collapse (default: true) */
  collapsible?: boolean
  /** Initial expanded state when collapsible (default: true) */
  defaultExpanded?: boolean
}) {
  const { categoryKey, title, total, items, collapsible = true, defaultExpanded = true } = props

  return (
    <CollapsibleCard
      title={title}
      icon={CATEGORY_ICONS[categoryKey]}
      extra={<span>{formatCurrency(total)}</span>}
      collapsible={collapsible}
      defaultExpanded={defaultExpanded}
    >
      {/* Items list (content area). CollapsibleCard handles the expand/collapse animation. */}
      <div
        data-testid="category-items"
        style={{
          background: '#fff',
          lineHeight: 'normal', // Per-line spacing controlled by inner spans
          fontSize: 14,
          marginBottom: 12,
        }}
      >
        {items.map((it, index) => (
          <div
            key={it.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto', // Name grows, price autosizes
              columnGap: 10,
              padding: '12px 16px', // Symmetrical vertical padding
              alignItems: 'center',
              minWidth: 0,
              position: 'relative',
            }}
          >
            {/* Name: may wrap to multiple lines if long */}
            <span
              style={{
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                lineHeight: 1.35, // Tighter line height for multi-line names
                margin: 0,
                display: 'block',
              }}
            >
              {it.name}
            </span>

            {/* Price: never wrap, stay right-aligned */}
            <span
              style={{
                whiteSpace: 'nowrap', // Price should never wrap
                textAlign: 'right',
                alignSelf: 'center',
              }}
            >
              {formatCurrency(it.price)}
            </span>

            {/* Divider between rows */}
            {index !== items.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90%',
                  height: '1px',
                  background: '#eee',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}