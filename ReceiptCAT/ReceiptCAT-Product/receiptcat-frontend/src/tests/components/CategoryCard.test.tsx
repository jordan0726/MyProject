// src/tests/components/CategoryCard.test.tsx
// Tests for CategoryCard after refactor to use CollapsibleCard.
// Scope: verify header content (title + formatted total), icon rendering, and items list rendering.
// Note: Expand/collapse behavior is covered in CollapsibleCard tests; we only assert integration surface here.

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
// Use relative imports to avoid alias resolution issues in Jest
import CategoryCard from '../../components/CategoryCard'

/**
 * Mock the CATEGORY_ICONS map so each icon is a stable, queryable node.
 * We only need deterministic markup to assert the icon is rendered.
 */
jest.mock('../../config/categoryIcons', () => ({
  CATEGORY_ICONS: {
    clothing_footwear: <span data-testid="category-icon">👟</span>,
    drinks: <span data-testid="category-icon">🥤</span>,
  },
}))

// Local item type for test data
 type Item = { id: string; name: string; price: number }

// Helper to build default props with optional overrides
function makeProps(overrides?: Partial<React.ComponentProps<typeof CategoryCard>>) {
  const base: React.ComponentProps<typeof CategoryCard> = {
    categoryKey: 'clothing_footwear',
    title: 'Clothing & Footwear',
    total: 123.456,
    items: [
      { id: 'i1', name: 'T-shirt', price: 15.5 },
      { id: 'i2', name: 'Sneakers', price: 80 },
    ] as Item[],
    collapsible: true,
    defaultExpanded: true,
  }
  return { ...base, ...overrides }
}

describe('<CategoryCard />', () => {
  it('should load the component (smoke test)', () => {
    // Arrange / Act
    // (Nothing to render; we only verify the symbol is a function)

    // Assert
    expect(typeof CategoryCard).toBe('function')
  })

  // ---------- Header rendering ----------

  it('should render the title and the formatted total inside the header button', () => {
    // Arrange
    render(<CategoryCard {...makeProps()} />)

    // Act
    const headerButton = screen.getByRole('button', { name: /Clothing & Footwear/i })

    // Assert
    expect(headerButton).toBeInTheDocument()
    // Total is formatted by formatCurrency to 2 decimals and appears inside the header
    expect(within(headerButton).getByText('$123.46')).toBeInTheDocument()
  })

  it('should render the mapped category icon for the given categoryKey', () => {
    // Arrange
    render(
      <CategoryCard
        {...makeProps({
          categoryKey: 'drinks',
          title: 'Drinks',
          total: 10,
          items: [{ id: 'i1', name: 'Latte', price: 5 }],
        })}
      />
    )

    // Act
    const icon = screen.getByTestId('category-icon')

    // Assert
    expect(icon).toBeInTheDocument()
    expect(screen.getByText('Drinks')).toBeInTheDocument()
  })

  // ---------- Items rendering ----------

  it('should render item rows with name (left) and formatted price (right)', () => {
    // Arrange
    render(
      <CategoryCard
        {...makeProps({
          title: 'Clothing',
          total: 95,
          items: [
            { id: 'i1', name: 'Hat', price: 10 },
            { id: 'i2', name: 'Jacket', price: 85.25 },
          ],
        })}
      />
    )

    // Act
    const nameHat = screen.getByText('Hat')
    const nameJacket = screen.getByText('Jacket')

    // Assert
    expect(nameHat).toBeInTheDocument()
    expect(nameJacket).toBeInTheDocument()
    // Prices are formatted with 2 decimals via formatCurrency
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('$85.25')).toBeInTheDocument()
  })

  it('should render gracefully with an empty items list', () => {
    // Arrange
    render(
      <CategoryCard
        {...makeProps({
          title: 'Empty Category',
          total: 0,
          items: [],
        })}
      />
    )

    // Act
    const headerButton = screen.getByRole('button', { name: /Empty Category/i })
    const list = screen.getByTestId('category-items')

    // Assert
    expect(screen.getByText('Empty Category')).toBeInTheDocument()
    expect(within(headerButton).getByText('$0.00')).toBeInTheDocument()
    // Items container exists but has no rows
    expect(list.childElementCount).toBe(0)
  })
})
