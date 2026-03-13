// src/tests/components/ChartCardLegend.test.tsx
import '@testing-library/jest-dom'
// Unit tests for ChartCardLegend. 

import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChartCardLegend, type ChartCardLegendProps, type LegendItem } from '../../components/ChartCardLegend'
import type { CategoryKey } from '../../types/categoryLabels'

// Minimal mock for CATEGORY_ICONS rendering (keeps DOM simple & predictable)
jest.mock('../../config/categoryIcons', () => ({
  CATEGORY_ICONS: new Proxy(
    {},
    {
      get: (_target, prop: string) => React.createElement('i', { 'data-testid': `icon-${prop}` }), // Inline icon placeholder
    }
  ),
}))

// Helpers --------------------------------------------------------------
const k1 = 'health' as CategoryKey
const k2 = 'pantry' as CategoryKey

const makeSource = (overrides?: Partial<LegendItem>[]) => (
  [
    { key: k1, name: 'Health & Medicine' },
    { key: k2, name: 'Pantry' },
  ].map((base, i) => ({ ...base, ...(overrides?.[i] ?? {}) }))
)

const makeProps = (partial?: Partial<ChartCardLegendProps>): ChartCardLegendProps => ({
  source: makeSource(),
  hidden: new Set<CategoryKey>(),
  colorMap: { [k1]: '#ff00aa', [k2]: '#12ab34' } as Record<CategoryKey, string>,
  isCompact: false,
  onToggle: jest.fn(),
  onReset: jest.fn(),
  ...(partial ?? {}),
})

// Tests ---------------------------------------------------------------
describe('<ChartCardLegend />', () => {
  it('should render one pill per source item with correct aria labels and pressed states', () => {
    // Arrange
    const props = makeProps({ hidden: new Set<CategoryKey>([k2]) }) // k2 hidden, k1 visible

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert — two buttons exist with accessible labels
    const btn1 = screen.getByRole('button', { name: /toggle health & medicine/i })
    const btn2 = screen.getByRole('button', { name: /toggle pantry/i })
    expect(btn1).toBeInTheDocument()
    expect(btn2).toBeInTheDocument()

    // Assert — number of legend toggle buttons equals the number of source items
    const allToggles = screen.getAllByRole('button', { name: /toggle /i })
    expect(allToggles).toHaveLength(2)

    // Assert — aria-pressed reflects visibility (true = visible)
    expect(btn1).toHaveAttribute('aria-pressed', 'true')
    expect(btn2).toHaveAttribute('aria-pressed', 'false')
  })

  it('should toggle via keyboard (Enter) on the focused pill', async () => {
    // Arrange
    const props = makeProps()

    // Act
    render(<ChartCardLegend {...props} />)
    const btn1 = screen.getByRole('button', { name: /toggle health & medicine/i })
    btn1.focus()
    const user = userEvent.setup() // Simulate real keyboard sequence (keydown/keypress/keyup + click on button)
    await user.keyboard('{Enter}')  // Press Enter to trigger native click on a focused <button>

    // Assert
    expect(props.onToggle).toHaveBeenCalledTimes(1)
    expect(props.onToggle).toHaveBeenCalledWith(k1)
  })

  it('should call onToggle with the correct key when a pill is clicked', () => {
    // Arrange
    const props = makeProps()

    // Act
    render(<ChartCardLegend {...props} />)
    const btn1 = screen.getByRole('button', { name: /toggle health & medicine/i })
    fireEvent.click(btn1)

    // Assert
    expect(props.onToggle).toHaveBeenCalledTimes(1)
    expect(props.onToggle).toHaveBeenCalledWith(k1)
  })

  it('should show Reset only when all categories are hidden, and call onReset when clicked', () => {
    // Arrange
    const propsVisible = makeProps({ hidden: new Set<CategoryKey>([k2]) }) // not all hidden
    const propsAllHidden = makeProps({ hidden: new Set<CategoryKey>([k1, k2]) }) // all hidden

    // Act & Assert — not all hidden: no Reset button
    const { rerender } = render(<ChartCardLegend {...propsVisible} />)
    expect(screen.queryByRole('button', { name: /show all categories/i })).toBeNull()

    // Act & Assert — all hidden: Reset appears and clicks through
    rerender(<ChartCardLegend {...propsAllHidden} />)
    const resetBtn = screen.getByRole('button', { name: /show all categories/i })
    expect(resetBtn).toBeInTheDocument()
    const resetItem = screen.getByTestId('legend-reset-item')
    expect(resetItem).toBeInTheDocument()
    fireEvent.click(resetBtn)
    expect(propsAllHidden.onReset).toHaveBeenCalledTimes(1)
  })

  it('should expose stable test hooks and a11y attributes (data-compact, aria-label, data-key, data-hidden, aria-describedby)', () => {
    // Arrange: k2 hidden
    const props = makeProps({ hidden: new Set<CategoryKey>([k2]) })

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert — wrapper exposes data-compact and aria-label
    const list = screen.getByTestId('chartcard-legend')
    expect(list).toHaveAttribute('data-compact', 'false')
    expect(list).toHaveAttribute('aria-label', 'Chart legend')

    // Each item li has test id and data-key
    const item1 = screen.getByTestId(`legend-item-${k1}`)
    const item2 = screen.getByTestId(`legend-item-${k2}`)
    expect(item1).toHaveAttribute('data-key', k1)
    expect(item2).toHaveAttribute('data-key', k2)

    // Button reflects hidden state via both aria-pressed and data-hidden
    const btn1 = screen.getByRole('button', { name: /toggle health & medicine/i })
    const btn2 = screen.getByRole('button', { name: /toggle pantry/i })
    expect(btn1).toHaveAttribute('aria-pressed', 'true')
    expect(btn1).toHaveAttribute('data-hidden', 'false')
    expect(btn2).toHaveAttribute('aria-pressed', 'false')
    expect(btn2).toHaveAttribute('data-hidden', 'true')

    // aria-describedby links to the visible label span id
    const lbl1 = screen.getByTestId(`legend-label-${k1}`)
    const lbl2 = screen.getByTestId(`legend-label-${k2}`)
    expect(btn1).toHaveAttribute('aria-describedby', lbl1.id)
    expect(btn2).toHaveAttribute('aria-describedby', lbl2.id)
  })

  it('should reflect isCompact spacing via wrapper inline style (marginTop)', () => {
    // Arrange — wide (isCompact=false)
    const wide = makeProps({ isCompact: false })
    const narrow = makeProps({ isCompact: true })

    // Act & Assert — wide
    const { rerender } = render(<ChartCardLegend {...wide} />)
    const wrapper = screen.getByTestId('chartcard-legend') as HTMLElement
    expect(wrapper).toBeInTheDocument()
    expect(wrapper.style.marginTop).toBe('18px') // per component inline style

    // Act & Assert — compact
    rerender(<ChartCardLegend {...narrow} />)
    const wrapper2 = screen.getByTestId('chartcard-legend') as HTMLElement
    expect(wrapper2.style.marginTop).toBe('6px')
  })

  it('should expose data-compact attribute that flips with isCompact changes', () => {
    // Arrange — start wide
    const wide = makeProps({ isCompact: false })
    const narrow = makeProps({ isCompact: true })

    // Act & Assert — wide
    const { rerender } = render(<ChartCardLegend {...wide} />)
    const list = screen.getByTestId('chartcard-legend')
    expect(list.getAttribute('data-compact')).toBe('false')

    // Act & Assert — compact
    rerender(<ChartCardLegend {...narrow} />)
    const list2 = screen.getByTestId('chartcard-legend')
    expect(list2.getAttribute('data-compact')).toBe('true')
  })

  it('should style border and swatch color from colorMap when visible, and grey when hidden', () => {
    // Arrange: k1 visible, k2 hidden
    const props = makeProps({ hidden: new Set<CategoryKey>([k2]) })

    // Act
    render(<ChartCardLegend {...props} />)
    const btn1 = screen.getByRole('button', { name: /toggle health & medicine/i })
    const btn2 = screen.getByRole('button', { name: /toggle pantry/i })

    // Assert — button border colors (inline style uses the literal values)
    expect(btn1.style.border).toBe('1px solid #ff00aa') // visible uses colorMap
    expect(btn2.style.border).toBe('1px solid #ddd') // hidden uses grey border

    // Assert — swatch background colors
    const swatch1 = screen.getByTestId(`legend-swatch-${k1}`) as HTMLElement // use explicit test id
    const swatch2 = screen.getByTestId(`legend-swatch-${k2}`) as HTMLElement
    expect(swatch1.style.background).toBe('rgb(255, 0, 170)')
    expect(swatch2.style.background).toBe('rgb(221, 221, 221)')
  })

  it('should render category icons from CATEGORY_ICONS map', () => {
    // Arrange 
    const props = makeProps()

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert — our icon mock creates <i data-testid="icon-${key}">
    expect(screen.getByTestId('icon-health')).toBeInTheDocument()
    expect(screen.getByTestId('icon-pantry')).toBeInTheDocument()
  })

  it('should render one <li> per legend item (stable test id selection)', () => {
    // Arrange
    const props = makeProps()

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert
    const items = screen.getAllByTestId(/legend-item-/)
    expect(items).toHaveLength(2)
  })

  it('should strike through hidden labels only', () => {
    // Arrange: k2 hidden
    const props = makeProps({ hidden: new Set<CategoryKey>([k2]) })

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert — label styles
    const label1 = screen.getByText('Health & Medicine') as HTMLElement
    const label2 = screen.getByText('Pantry') as HTMLElement
    expect(label1.style.textDecoration).toBe('none') // visible (no strike-through)
    expect(label2.style.textDecoration).toMatch(/line-through/i)
  })

  it('should normalize source: skip falsy, dedupe by key, trim label, and fallback to key when empty', () => {
    // Arrange — craft a source with: null item, duplicate key, trimmable name, and empty/whitespace name
    const noisySource = [
      null as unknown as LegendItem, // falsy should be skipped
      { key: k1, name: '  Custom Name  ' } as LegendItem, // should be trimmed to "Custom Name"
      { key: k1, name: 'Duplicate Should Be Ignored' } as LegendItem, // duplicate key — ignored
      { key: k2, name: '   ' } as LegendItem, // empty after trim — fallback to key string "pantry"
    ]

    const props = makeProps({ source: noisySource as unknown as LegendItem[] })

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert — only first occurrence per key survives; null skipped ⇒ 2 items total
    const items = screen.getAllByTestId(/legend-item-/)
    expect(items).toHaveLength(2)

    // Labels: k1 trimmed to "Custom Name"; k2 falls back to its key string
    expect(screen.getByTestId(`legend-label-${k1}`)).toHaveTextContent('Custom Name')
    expect(screen.getByTestId(`legend-label-${k2}`)).toHaveTextContent('pantry')

    // Ensure the duplicate label is not present
    expect(screen.queryByText(/Duplicate Should Be Ignored/i)).toBeNull()
  })
  it('should coalesce undefined name to empty string before trim and then fallback to key', () => {
    // Arrange — k1 has undefined name to trigger (it.name ?? '') branch
    const src: LegendItem[] = [
      { key: k1, name: undefined as unknown as string },
      { key: k2, name: 'Pantry' },
    ]
    const props = makeProps({ source: src })

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert — k1 label falls back to its key string after coalescing and trim
    expect(screen.getByTestId(`legend-label-${k1}`)).toHaveTextContent('health')
  })

  it('should render icon when provided in iconMap and render nothing when missing (nullish coalescing path)', () => {
    // Arrange — provide a partial iconMap: k1 has an icon, k2 intentionally missing
    const customIconMap = {
      [k1]: React.createElement('i', { 'data-testid': 'custom-icon-health' }),
    } as unknown as Record<CategoryKey, React.ReactNode>

    const props = makeProps({ iconMap: customIconMap })

    // Act
    render(<ChartCardLegend {...props} />)

    // Assert — k1 icon is rendered from custom iconMap
    expect(screen.getByTestId('custom-icon-health')).toBeInTheDocument()

    // Assert — k2 icon is absent because iconMap[k2] is undefined ⇒ (iconMap[k2] ?? null) yields null
    expect(screen.queryByTestId('icon-pantry')).toBeNull()
  })
})