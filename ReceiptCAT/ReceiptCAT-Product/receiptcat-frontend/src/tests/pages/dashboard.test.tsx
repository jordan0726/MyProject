// src/tests/pages/dashboard.test.tsx
import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import DashboardHome from '../../pages/app'
import type { CategoryKey } from '../../types/categoryLabels'

// ============================================================================ //
// Component mocks
// ============================================================================ //

jest.mock('../../components/RequireAuth', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('../../layouts/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}))

jest.mock('../../components/DashboardGrid', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-grid">{children}</div>
  ),
}))

let receivedPieProps: any = null
jest.mock('../../components/ChartCard', () => ({
  __esModule: true,
  default: (props: any) => {
    receivedPieProps = props
    return <div data-testid="category-pie-card">PieCard</div>
  },
}))

type CategoryCardProps = {
  categoryKey: string
  title: string
  total: number
  items: Array<{ id: string; name: string; price: number }>
  collapsible?: boolean
  defaultExpanded?: boolean
}
const receivedCategoryCardProps: CategoryCardProps[] = []
jest.mock('../../components/CategoryCard', () => ({
  __esModule: true,
  default: (props: CategoryCardProps) => {
    receivedCategoryCardProps.push(props)
    return <div data-testid="category-card">{props.title}</div>
  },
}))

let receivedDateSelectorProps: any = null
jest.mock('../../components/DashboardDateSelector', () => ({
  __esModule: true,
  default: (props: any) => {
    receivedDateSelectorProps = props
    return <div data-testid="dashboard-date-selector">Date Selector</div>
  },
}))

// ============================================================================ //
// useDashboard mock
// ============================================================================ //

type DashboardHookPayload = {
  loading: boolean
  error: string | null
  topline: { total: number; items: number; receipts: number } | null
  categories: Array<{
    categoryKey: CategoryKey
    category: string
    total: number
    items: Array<{ id: string; name: string; price: number }>
  }>
  greetingName: string | null
  currentDate: Date
  monthLabel: string
  goPrevMonth: () => void
  goNextMonth: () => void
}

const mockUseDashboard = jest.fn<DashboardHookPayload, []>()
let lastUseDashboardArgs: any = null
jest.mock('../../features/useDashboard', () => ({
  __esModule: true,
  useDashboard: (arg?: any) => {
    lastUseDashboardArgs = arg // capture the range passed from the page
    return mockUseDashboard()
  },
}))

const buildDashboardState = (
  overrides: Partial<DashboardHookPayload> = {}
): DashboardHookPayload => ({
  loading: false,
  error: null,
  topline: { total: 123.45, items: 3, receipts: 2 },
  categories: [
    {
      categoryKey: 'health_medicine',
      category: 'Health & Medicine',
      total: 45.67,
      items: [
        { id: 'h1', name: 'Bandage', price: 3.5 },
        { id: 'health_medicine-Aspirin', name: 'Aspirin', price: 5.2 },
      ],
    },
    {
      categoryKey: 'pantry_snacks',
      category: 'Pantry & Snacks',
      total: 77.78,
      items: [{ id: 'p1', name: 'Chips', price: 2.99 }],
    },
  ],
  greetingName: 'Alex',
  currentDate: new Date('2024-09-15T00:00:00.000Z'),
  monthLabel: 'Sep 2024',
  goPrevMonth: jest.fn(),
  goNextMonth: jest.fn(),
  ...overrides,
})

const resetMocks = () => {
  receivedPieProps = null
  receivedCategoryCardProps.length = 0
  receivedDateSelectorProps = null
  mockUseDashboard.mockReset()
  lastUseDashboardArgs = null
  mockUseDashboard.mockReturnValue(buildDashboardState())
}

beforeEach(resetMocks)

// ============================================================================ //
// Tests
// ============================================================================ //

describe('DashboardHome', () => {
  it('should render personalized greeting when provided', () => {
    // Arrange
    mockUseDashboard.mockReturnValue(buildDashboardState({ greetingName: 'John' }))

    // Act
    render(<DashboardHome />)

    // Assert
    expect(screen.getByRole('heading', { name: 'Hello, John' })).toBeInTheDocument()
  })

  it('should fall back to "Dashboard" when greetingName is null', () => {
    // Arrange
    mockUseDashboard.mockReturnValue(buildDashboardState({ greetingName: null }))

    // Act
    render(<DashboardHome />)

    // Assert
    expect(screen.getByRole('heading', { name: 'Hello, Dashboard' })).toBeInTheDocument()
  })

  it('should render category cards and pie chart when data is present', () => {
    // Arrange
    // (default buildDashboardState already provides data)

    // Act
    render(<DashboardHome />)

    // Assert
    const cards = screen.getAllByTestId('category-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Health & Medicine')
    expect(cards[1]).toHaveTextContent('Pantry & Snacks')

    expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument()
    expect(screen.getByTestId('category-pie-card')).toBeInTheDocument()

    const [healthProps, pantryProps] = receivedCategoryCardProps
    expect(healthProps.items).toEqual([
      { id: 'h1', name: 'Bandage', price: 3.5 },
      { id: 'health_medicine-Aspirin', name: 'Aspirin', price: 5.2 },
    ])
    expect(pantryProps.items).toEqual([{ id: 'p1', name: 'Chips', price: 2.99 }])
  })

  it('should pass category data to CategoryPieCard', () => {
    // Arrange
    // (default mock provides categories)

    // Act
    render(<DashboardHome />)

    // Assert
    expect(receivedPieProps).toBeTruthy()
    expect(receivedPieProps.title).toBe('Spend by Category')
    expect(receivedPieProps.currency).toBe('$')
    expect(receivedPieProps.data).toHaveLength(2)
  })

  it('should render DateSelector with current date and local month nav handlers', () => {
    // Arrange: freeze "now" so the component's default selectedDate is deterministic
    jest.useFakeTimers().setSystemTime(new Date('2024-01-10T00:00:00.000Z'))
    const fixedNow = new Date('2024-01-10T00:00:00.000Z')
    mockUseDashboard.mockReturnValue(buildDashboardState())

    // Act
    render(<DashboardHome />)

    // Assert — renders the selector
    expect(screen.getByTestId('dashboard-date-selector')).toBeInTheDocument()

    // The DateSelector now receives the page's local selectedDate (default: new Date())
    // Verify it equals our frozen "now" (value equality, not referential)
    expect(receivedDateSelectorProps.date).toBeInstanceOf(Date)
    expect(receivedDateSelectorProps.date).toEqual(fixedNow)

    // Handlers are page-local (not the hook's goPrev/goNext); verify they exist and adjust month
    expect(typeof receivedDateSelectorProps.onPrev).toBe('function')
    expect(typeof receivedDateSelectorProps.onNext).toBe('function')

    const getYearMonth = (d: Date) => ({ y: d.getFullYear(), m: d.getMonth() })
    const initial = getYearMonth(receivedDateSelectorProps.date)

    // Act: go to previous month
    act(() => {
      receivedDateSelectorProps.onPrev()
    })
    const afterPrev = getYearMonth(receivedDateSelectorProps.date)
    // Expect: Dec 2023
    expect(afterPrev.y).toBe(2023)
    expect(afterPrev.m).toBe(11) // 0-based (Dec)

    // Act: go to next month
    act(() => {
      receivedDateSelectorProps.onNext()
    })
    const afterNext = getYearMonth(receivedDateSelectorProps.date)
    // Expect: back to Jan 2024
    expect(afterNext.y).toBe(initial.y)
    expect(afterNext.m).toBe(initial.m)

    // Cleanup timers
    jest.useRealTimers()
  })

  it('should render empty state when no categories are returned', () => {
    // Arrange
    mockUseDashboard.mockReturnValue(
      buildDashboardState({ categories: [] })
    )

    // Act
    render(<DashboardHome />)

    // Assert
    expect(
      screen.getByText(
        /No categories available yet\. Your data will appear here once you upload receipts\./i
      )
    ).toBeInTheDocument()
    expect(screen.queryByTestId('category-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('category-pie-card')).not.toBeInTheDocument()
  })
  it('should apply a custom range and align selected month to the start date', () => {
    // Arrange: freeze now for determinism; start with default hook payload
    jest.useFakeTimers().setSystemTime(new Date('2024-01-10T00:00:00.000Z'))
    mockUseDashboard.mockReturnValue(buildDashboardState())
    const start = new Date('2024-03-15T00:00:00.000Z')
    const end = new Date('2024-04-02T00:00:00.000Z')

    // Act
    render(<DashboardHome />)

    // Pre-assert: initially no custom range and date equals "now"
    expect(receivedDateSelectorProps.range).toBeUndefined()
    expect(receivedDateSelectorProps.date).toEqual(new Date('2024-01-10T00:00:00.000Z'))

    // Act: apply custom range through the selector (this should set range and align selectedDate to start's month-begin)
    act(() => {
      receivedDateSelectorProps.onRangeChange(start, end)
    })

    // Assert: range is now applied and passed down
    expect(receivedDateSelectorProps.range).toBeTruthy()
    expect(receivedDateSelectorProps.range.start).toEqual(start)
    expect(receivedDateSelectorProps.range.end).toEqual(end)

    // Assert: selectedDate aligns to the first day of the start month (Mar 1, 2024) in local time
    const aligned = receivedDateSelectorProps.date as Date
    expect(aligned).toBeInstanceOf(Date)
    expect(aligned.getFullYear()).toBe(2024)
    expect(aligned.getMonth()).toBe(2) // 0-based: 2 = March
    expect(aligned.getDate()).toBe(1)

    // Assert: useDashboard received the exact [from, to] range we applied (no month-rounding)
    expect(lastUseDashboardArgs).toBeTruthy()
    expect(lastUseDashboardArgs.from).toEqual(start)
    expect(lastUseDashboardArgs.to).toEqual(end)

    jest.useRealTimers()
  })
})

describe('DashboardHome — topline / loading / error branches', () => {
  it('should show month label and topline stats when available', () => {
    // Arrange
    mockUseDashboard.mockReturnValue(
      buildDashboardState({
        monthLabel: 'September',
        topline: { total: 250.5, items: 12, receipts: 4 },
      })
    )

    // Act
    render(<DashboardHome />)

    // Assert
    expect(screen.getByText('September')).toBeInTheDocument()
    expect(screen.getByText('$250.50')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('should hide topline stats when topline is null', () => {
    // Arrange
    mockUseDashboard.mockReturnValue(
      buildDashboardState({ topline: null })
    )

    // Act
    render(<DashboardHome />)

    // Assert
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument()
    expect(screen.queryByText('Items')).not.toBeInTheDocument()
    expect(screen.queryByText('Receipts')).not.toBeInTheDocument()
    expect(screen.getByTestId('category-pie-card')).toBeInTheDocument()
  })

  it('should show loading indicator when loading is true', () => {
    // Arrange
    mockUseDashboard.mockReturnValue(
      buildDashboardState({ loading: true })
    )

    // Act
    render(<DashboardHome />)

    // Assert
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByTestId('category-card')).not.toBeInTheDocument()
  })

  it('should show error message when error is present', () => {
    // Arrange
    mockUseDashboard.mockReturnValue(
      buildDashboardState({
        loading: false,
        error: 'Something went wrong',
        categories: [],
      })
    )

    // Act
    render(<DashboardHome />)

    // Assert
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByTestId('category-card')).not.toBeInTheDocument()
  })
})
