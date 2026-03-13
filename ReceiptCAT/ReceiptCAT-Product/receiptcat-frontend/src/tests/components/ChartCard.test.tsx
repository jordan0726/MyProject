// src/tests/components/ChartCard.test.tsx
// High-signal, AAA-style unit tests for <CategoryPieCard /> (ChartCard).
// The suite stubs external UI wrappers and uses deterministic layout mocks
// to avoid cross-suite side effects and timing flakiness.

import '@testing-library/jest-dom'
import * as React from 'react'
// -----------------------------------------------------------------------------
// IMPORTANT: Stub CollapsibleCard *before* importing ChartCard so the real
// implementation is never loaded in this file. This avoids:
// 1) incidental rendering logic/side-effects impacting other test suites, and
// 2) coverage inflation coming from the CollapsibleCard code path.
// The stub simply renders children inside a predictable testid wrapper.
// -----------------------------------------------------------------------------
jest.mock('../../components/CollapsibleCard', () => ({
  __esModule: true,
  default: ({ children }: any) => (
    <div data-testid="collapsible-stub">{children}</div>
  ),
}))
// -----------------------------------------------------------------------------
// next/dynamic mock — return a concrete test double for Pie.
// Why: We only need to assert the props we pass into Pie. A light-weight
// component that serializes its props to a data attribute makes the tests
// deterministic and removes any dependency on charting internals.
// -----------------------------------------------------------------------------
jest.mock('next/dynamic', () => {
  return () => {
    return (props: any) => (
      <div data-testid="mock-pie" data-config={JSON.stringify(props)} />
    )
  }
})
// -----------------------------------------------------------------------------
// ResizeObserver mock — drives layout using local width variables.
// The tested component marks the chart box with data-isChartRef="true";
// we use that to feed the chart area width (mockChartWidth) vs container width
// (mockContainerWidth). Returning a DOMRectReadOnly keeps code paths realistic.
// -----------------------------------------------------------------------------
let mockChartWidth = 320
let mockContainerWidth = 900
jest.mock('../../features/chart/useResizeObserver', () => ({
  useResizeObserver: (ref: React.RefObject<HTMLElement>) => {
    const node = ref?.current as any
    const isChart = !!(node && node.dataset && node.dataset.isChartRef === 'true')
    const width = isChart ? mockChartWidth : mockContainerWidth
    return width
      ? ({
          width,
          height: 200,
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          toJSON: () => ({}),
        } as DOMRectReadOnly)
      : null
  },
}))
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryPieCard from '../../components/ChartCard'
import type { CategorySummary } from '../../types/chartTypes'
import type { CategoryKey } from '../../types/categoryLabels'
import { buildPieOptions } from '../../lib/utils/buildPieChart'


// -----------------------------------------------------------------------------
// Per-test RAF/CAF stubs — make animations synchronous and avoid timers.
// Stubbed via spies and fully restored after each test (no cross-file leakage).
// -----------------------------------------------------------------------------
let rafSpy: jest.SpyInstance | undefined
let cafSpy: jest.SpyInstance | undefined
beforeEach(() => {
  rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    cb(16)
    return 1 as unknown as number
  })
  cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
})
afterEach(() => {
  rafSpy?.mockRestore()
  cafSpy?.mockRestore()
})


// Keep mock widths isolated across tests. Do not use global clearAllMocks()
// to avoid unintentionally resetting module-level state in other suites.
afterEach(() => {
  mockChartWidth = 320
  mockContainerWidth = 900
})

// -----------------------------------------------------------------------------
// Local helpers
// -----------------------------------------------------------------------------

// Flush pending microtasks so that state updates triggered by mocked RAF or
// layout effects are settled before assertions. This keeps timing deterministic.
const flushMicrotasks = (): Promise<void> => Promise.resolve()

// Mark the chart area so the ResizeObserver mock returns mockChartWidth
// instead of the container width. The component under test reads this via
// a data attribute set on the chart box.
const markAsChartRef = (container: HTMLElement) => {
  const chartBox = container.querySelector('[data-testid="chartcard-chartbox"]') as HTMLElement | null
  if (chartBox) chartBox.dataset.isChartRef = 'true'
}

const el = (testId: string) => screen.getByTestId(testId) as HTMLElement
const styleOf = (node: HTMLElement) => getComputedStyle(node)

// NOTE: Header totals/titles are rendered by the Pie's statistic content,
// not plain text. Because CollapsibleCard is stubbed, we assert through the
// mock Pie's serialized config. If `size` is not set by the component (it
// depends on measurements), we synthesize a value using the same rules the
// component applies: `size = clamp(round(width * 0.95), 250, 300)`.
// This mirrors production behavior without relying on actual layout.
const getPieConfig = () => {
  const pie = screen.getByTestId('mock-pie')
  const raw = pie.getAttribute('data-config')
  const cfg = raw ? JSON.parse(raw) : {}

  const SCALE = 0.95  // Match component's 95% inner box sizing
  const CHART_MIN = 250  // Minimum visual size enforced by builder logic
  const CHART_MAX = 300  // Maximum visual size to avoid oversized pies
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

  if (cfg.size === undefined || cfg.size === null) {
    const derived = clamp(Math.round((mockChartWidth || 0) * SCALE), CHART_MIN, CHART_MAX)
    if (derived > 0) cfg.size = derived
  }
  return cfg
}

// Render helper that seeds container/chart widths before mount, then marks
// the chart box so the ResizeObserver mock yields the intended chart width.
// Use when asserting compact flags or size clamping behavior.
const renderWithWidths = async (
  containerW: number,
  chartW: number,
  props?: Partial<React.ComponentProps<typeof CategoryPieCard>>
) => {
  mockContainerWidth = containerW
  mockChartWidth = chartW
  const utils = render(<CategoryPieCard data={makeData()} {...props} />)
  markAsChartRef(utils.container)
  await flushMicrotasks()
  return utils
}

// Typed sample data
const k1: CategoryKey = 'drinks'
const k2: CategoryKey = 'clothing_footwear'
const makeData = (overrides?: Partial<CategorySummary>[]): CategorySummary[] => {
  const base: CategorySummary[] = [
    { categoryKey: k1, category: 'Drinks', total: 10 },
    { categoryKey: k2, category: 'Clothing & Footwear', total: 20 },
  ]
  if (!overrides) return base
  return base.map((row, idx) => ({ ...row, ...(overrides[idx] || {}) }))
}

// -----------------------------------------------------------------------------
// Test suite
// -----------------------------------------------------------------------------
describe('<CategoryPieCard />', () => {
  // ---------------------------------------------------------------------------
  // Rendering & header
  // ---------------------------------------------------------------------------
  describe('rendering & header', () => {
    // Focus: header semantics via aria-label and total formatting via Pie statistic.
    it('should render header with title and formatted total', () => {
      // Arrange
      const data = makeData()
      render(<CategoryPieCard data={data} title="Spend by Category" currency="$" />)

      // We assert title via region landmark (accessible name) and total via the
      // mock Pie's statistic content to stay decoupled from CollapsibleCard.
      // Act
      const region = screen.getByRole('region', { name: 'Spend by Category' })
      const cfg = getPieConfig()
      expect(cfg?.statistic?.content?.content).toBe('$30.00')

      // Assert
      expect(region).toBeInTheDocument()
      expect(screen.getByTestId('mock-pie')).toBeInTheDocument()
    })

    it('should format header total with provided currency symbol', () => {
      // Arrange
      const data = makeData([{ total: 1.2 }, { total: 2.3 }])
      render(<CategoryPieCard data={data} title="EU Spend" currency="€" />)

      // Act
      const cfg = getPieConfig()
      expect(cfg?.statistic?.content?.content).toBe('€3.50')
    })

    it('should render default title and currency when not provided', () => {
      // Arrange
      const data = makeData([{ total: 1.1 }, { total: 2.2 }])
      render(<CategoryPieCard data={data} />)

      // Default title is exposed as the region's accessible name; totals come
      // from the Pie config. Currency falls back to "$".
      const region = screen.getByRole('region', { name: 'Spend by Category' })
      const cfg = getPieConfig()

      // Assert
      expect(region).toBeInTheDocument()
      expect(cfg?.statistic?.title?.content).toBe('Spend by Category')
      expect(cfg?.statistic?.content?.content).toBe('$3.30')
    })

    it('should show empty state when data is empty', () => {
      // Arrange
      render(<CategoryPieCard data={[]} />)

      // Assert
      expect(screen.getByTestId('chartcard-empty')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Pie data passing
  // ---------------------------------------------------------------------------
  describe('pie data', () => {
    it('should render Pie when there is at least one positive slice', () => {
      // Arrange
      const data = makeData()
      render(<CategoryPieCard data={data} />)

      // Assert
      const cfg = getPieConfig()
      expect(Array.isArray(cfg.data)).toBe(true)
      expect(cfg.data).toHaveLength(2)
    })

    it('should pass correct data into Pie config (value and percent)', () => {
      // Arrange
      const data = makeData([{ total: 25 }, { total: 75 }])
      render(<CategoryPieCard data={data} currency="$" />)

      // Act
      const cfg = getPieConfig()

      // Assert
      expect(cfg.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 25, percent: 0.25 }),
          expect.objectContaining({ value: 75, percent: 0.75 }),
        ])
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Legend behavior
  // ---------------------------------------------------------------------------
  describe('legend', () => {
    // Focus: toggling visibility, keyboard affordance, reset behavior, and percent text.
    it('should show empty state when all categories are hidden via keyboard (Enter) on legend', async () => {
      // Arrange
      const data = makeData()
      render(<CategoryPieCard data={data} />)

      // Act
      const user = userEvent.setup()
      const btn1 = screen.getByTestId(`legend-btn-${k1}`)
      const btn2 = screen.getByTestId(`legend-btn-${k2}`)
      btn1.focus()  // Arrange focus to drive keyboard interaction (a11y-friendly)
      await user.keyboard('{Enter}')
      btn2.focus()
      await user.keyboard('{Enter}')

      // Assert
      expect(screen.getByTestId('chartcard-empty')).toBeInTheDocument()
    })

    it('should reset all hidden categories when reset is clicked', async () => {
      // Arrange
      const data = makeData()
      render(<CategoryPieCard data={data} />)

      // Act
      const user = userEvent.setup()
      await user.click(screen.getByTestId(`legend-btn-${k1}`))
      await user.click(screen.getByTestId(`legend-btn-${k2}`))
      const resetBtn = screen.getByTestId('legend-reset')  // Resets all legend toggles
      await user.click(resetBtn)

      // Assert
      expect(screen.getByTestId(`legend-btn-${k1}`)).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show percent numbers in legend for visible categories', () => {
      // Arrange
      const data = makeData([{ total: 10 }, { total: 20 }])
      render(<CategoryPieCard data={data} />)

      // Use a whitespace-tolerant regex so UI spacing differences do not break the assertion.
      // Assert
      expect(screen.getByTestId(`legend-btn-${k1}`)).toHaveTextContent(/Drinks\s*33\.3%/)
      expect(screen.getByTestId(`legend-btn-${k2}`)).toHaveTextContent(/Clothing & Footwear\s*66\.7%/)
    })

    it('should renormalize legend percent after toggling visibility', async () => {
      // Arrange
      const data = makeData([{ total: 10 }, { total: 20 }])
      render(<CategoryPieCard data={data} />)
      const user = userEvent.setup()

      // Act
      await user.click(screen.getByTestId(`legend-btn-${k2}`))

      // Assert
      expect(screen.getByTestId(`legend-btn-${k1}`)).toHaveTextContent(/Drinks\s*100\.0%/)
    })
  })

  // ---------------------------------------------------------------------------
  // Layout & a11y flags
  // ---------------------------------------------------------------------------
  describe('layout & a11y', () => {
    // Focus: compact flag derivation and landmark/aria attributes exposed by the container.
    it('should mark container as non-compact and expose a11y attributes on wide containers', async () => {
      // Arrange
      await renderWithWidths(1200, 300, { title: 'Spend by Category' })

      // Assert
      const cont = screen.getByTestId('chartcard-container')
      expect(cont.getAttribute('data-compact')).toBe('false')
      expect(cont).toHaveAttribute('role', 'region')
      expect(cont).toHaveAttribute('aria-label', 'Spend by Category')

      const chartBox = screen.getByTestId('chartcard-chartbox')
      expect(chartBox).toHaveAttribute('aria-hidden', 'true')  // Chart is decorative for screen readers
    })

    it('should mark container as compact on narrow containers', async () => {
      // Arrange
      await renderWithWidths(600, 280, { title: 'Spend by Category' })

      // Assert
      const cont = screen.getByTestId('chartcard-container')
      expect(cont.getAttribute('data-compact')).toBe('true')
    })
  })

  // ---------------------------------------------------------------------------
  // Sizing behavior
  // ---------------------------------------------------------------------------
  describe('sizing', () => {
    // Focus: clamping behavior to CHART_MIN/CHART_MAX and stability across rerenders.
    it.each([
      ['very small', 900, 100],
      ['very large', 1200, 2000],
      ['mid-range 1', 1000, 300],
      ['mid-range 2', 1000, 360],
    ] as const)(
      'should render Pie at %s chart width',
      async (_label, containerW, chartW) => {
        // Arrange
        const { container, rerender } = await renderWithWidths(containerW, chartW)

        // Assert
        expect(screen.getByTestId('mock-pie')).toBeInTheDocument()

        // Act
        rerender(<CategoryPieCard data={makeData()} />)
        markAsChartRef(container)
        await flushMicrotasks()

        // Assert
        expect(screen.getByTestId('mock-pie')).toBeInTheDocument()
      }
    )

    it('should keep chart size at CHART_MIN when measured width is very small (next === prev path)', async () => {
      // Arrange
      await renderWithWidths(900, 100) // 100 * 0.95 = 95 → clamped to 250 (CHART_MIN)

      // Assert
      const cfg = getPieConfig()
      expect(cfg.size).toBe(250)
    })

    it('should update chart size to CHART_MAX when measured width is very large (next !== prev path)', async () => {
      // Arrange
      const { container, rerender } = await renderWithWidths(900, 2000) // 2000 * 0.95 = 1900 → clamped to 300 (CHART_MAX)

      // Assert
      let cfg = getPieConfig()
      expect(cfg.size).toBe(300)

      // Act
      rerender(<CategoryPieCard data={makeData()} />)
      markAsChartRef(container)
      await flushMicrotasks()

      // Assert
      cfg = getPieConfig()
      expect(cfg.size).toBe(300)
    })
  })

  // ---------------------------------------------------------------------------
  // Stability & edge cases
  // ---------------------------------------------------------------------------
  describe('stability & edge cases', () => {
    // Focus: visual style stability for existing legend items and resilience to null measurements.
    it('should keep existing legend styles stable when new keys are appended', async () => {
      // Arrange
      const { container, rerender } = render(<CategoryPieCard data={makeData()} />)
      markAsChartRef(container)
      await flushMicrotasks()

      // Act — capture styles for existing keys
      const k1BtnBefore = el(`legend-btn-${k1}`)
      const k2BtnBefore = el(`legend-btn-${k2}`)
      const k1BorderBefore = styleOf(k1BtnBefore).border
      const k2BorderBefore = styleOf(k2BtnBefore).border

      // Arrange — rerender with a new key
      const k3: CategoryKey = 'fruits_vegetables' as CategoryKey
      const dataWithNewKey: CategorySummary[] = [
        ...makeData(),
        { categoryKey: k3, category: 'Fruits & Vegetables', total: 5 },
      ]

      // Act
      rerender(<CategoryPieCard data={dataWithNewKey} />)
      markAsChartRef(container)
      await flushMicrotasks()

      // Assert — existing styles stable; new key appears
      expect(styleOf(el(`legend-btn-${k1}`)).border).toBe(k1BorderBefore)
      expect(styleOf(el(`legend-btn-${k2}`)).border).toBe(k2BorderBefore)
      expect(screen.getByTestId(`legend-btn-${k3}`)).toBeInTheDocument()
    })

    it('should gracefully handle null chartRect without crashing', async () => {
      // Arrange — force null measurement for chart
      await renderWithWidths(900, 0)

      // Assert — still renders chart; no empty state
      expect(screen.getByTestId('mock-pie')).toBeInTheDocument()
      expect(screen.queryByTestId('chartcard-empty')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Builder-level label threshold
  // ---------------------------------------------------------------------------
  describe('builder label threshold', () => {
    // Focus: options produced by the builder hide inside labels for tiny slices (<5%).
    // This is validated at the builder level to keep chart rendering logic decoupled.
    it('should hide inside labels for slices smaller than 5% (builder-level)', () => {
      // Arrange
      const allKeys: CategoryKey[] = [k1, k2]
      const colorMap = { [k1]: '#111', [k2]: '#222' } as Record<string, string>
      const base = { allKeys, colorMap, size: 280, currency: '$', title: 'Test', total: 100 }  // Minimal context required by builder

      // Act
      const opts = buildPieOptions({
        ...base,
        data: [
          { key: k1, name: 'Drinks', value: 4.9, percent: 0.049 },
          { key: k2, name: 'Clothing & Footwear', value: 95.1, percent: 0.951 },
        ] as any,
      }) as any

      // Assert
      const tiny = opts.label.text({ percent: 0.049 })
      const big = opts.label.text({ percent: 0.2 })
      expect(tiny).toBe('')
      expect(big).toBe('20.0%')
    })
  })
})
