import React from 'react'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardDateSelector from '@/components/DashboardDateSelector'

const FIXED_TODAY = new Date('2024-03-15T00:00:00.000Z')

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_TODAY)
})

afterEach(() => {
  jest.useRealTimers()
  jest.clearAllMocks()
})

const createUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

describe('DashboardDateSelector', () => {
  it('should render formatted month label and fire navigation callbacks', async () => {
    // Arrange
    const user = createUser()
    const onPrev = jest.fn()
    const onNext = jest.fn()

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-01-10T00:00:00.000Z')}
        onPrev={onPrev}
        onNext={onNext}
        locale="en-US"
      />
    )

    // Assert
    expect(screen.getByTestId('dashboard-date-selector-label')).toHaveTextContent('Jan 2024')

    await user.click(screen.getByTestId('prev-month'))
    expect(onPrev).toHaveBeenCalledTimes(1)

    const next = screen.getByTestId('next-month')
    await user.click(next)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('should reset to current month defaults on cancel when range is uncontrolled', async () => {
    // Arrange
    const user = createUser()

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-03-20T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
      />
    )

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input') as HTMLInputElement
    const endInput = within(dialog).getByTestId('end-date-input') as HTMLInputElement

    // Assert defaults (month start and today: March 15)
    expect(startInput.value).toBe('2024-03-01')
    expect(endInput.value).toBe('2024-03-15')

    // Act: change values then cancel
    await user.clear(startInput)
    await user.type(startInput, '2024-03-05')
    await user.clear(endInput)
    await user.type(endInput, '2024-03-28')

    await user.click(within(dialog).getByTestId('cancel-range'))
    expect(screen.queryByTestId('date-range-dialog')).toBeNull()

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const reopenDialog = await screen.findByTestId('date-range-dialog')
    const startAfter = within(reopenDialog).getByTestId('start-date-input') as HTMLInputElement
    const endAfter = within(reopenDialog).getByTestId('end-date-input') as HTMLInputElement

    // Assert reset values
    expect(startAfter.value).toBe('2024-03-01')
    expect(endAfter.value).toBe('2024-03-15') // Clamped to today
  })

  it('should hide the next button when viewing the current month', () => {
    // Arrange / Act
    render(
      <DashboardDateSelector
        date={new Date('2024-03-05T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
      />
    )

    // Assert
    expect(screen.queryByTestId('next-month')).toBeNull()
  })

  it('should open the popover, apply a custom range, and emit onRangeChange', async () => {
    // Arrange
    const user = createUser()
    const handleRangeChange = jest.fn()

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-01-12T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onRangeChange={handleRangeChange}
        locale="en-US"
      />
    )

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input') as HTMLInputElement
    const endInput = within(dialog).getByTestId('end-date-input') as HTMLInputElement

    // Assert max cap
    expect(endInput.max).toBe('2024-03-15')

    // Act: input a custom range and apply
    await user.clear(startInput)
    await user.type(startInput, '2024-02-02')
    await user.clear(endInput)
    await user.type(endInput, '2024-02-10')

    await user.click(within(dialog).getByTestId('apply-range'))

    // Assert
    expect(handleRangeChange).toHaveBeenCalledTimes(1)
    const [start, end] = handleRangeChange.mock.calls[0]
    expect(start.toISOString()).toContain('2024-02-02')
    expect(end.toISOString()).toContain('2024-02-10')
    expect(screen.getByTestId('dashboard-date-selector-label')).toHaveTextContent('Feb 2, 2024 — Feb 10, 2024')
    expect(screen.queryByTestId('date-range-dialog')).toBeNull()
  })

  it('should restore last committed values on cancel when controlled', async () => {
    // Arrange
    const user = createUser()
    const controlledRange = { start: new Date('2024-01-03T00:00:00.000Z'), end: new Date('2024-01-18T00:00:00.000Z') }

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-01-20T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
        range={controlledRange}
      />
    )

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input') as HTMLInputElement
    const endInput = within(dialog).getByTestId('end-date-input') as HTMLInputElement

    // Assert initial
    expect(startInput.value).toBe('2024-01-03')
    expect(endInput.value).toBe('2024-01-18')

    // Act: edit then cancel
    await user.clear(startInput)
    await user.type(startInput, '2024-01-08')
    await user.clear(endInput)
    await user.type(endInput, '2024-01-21')

    await user.click(within(dialog).getByTestId('cancel-range'))
    expect(screen.queryByTestId('date-range-dialog')).toBeNull()

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const reopenDialog = await screen.findByTestId('date-range-dialog')
    const startAfter = within(reopenDialog).getByTestId('start-date-input') as HTMLInputElement
    const endAfter = within(reopenDialog).getByTestId('end-date-input') as HTMLInputElement

    // Assert restored
    expect(startAfter.value).toBe('2024-01-03')
    expect(endAfter.value).toBe('2024-01-18')
  })

  it('should reflect externally controlled ranges in the label and inputs', async () => {
    // Arrange
    const user = createUser()
    const initialRange = { start: new Date('2023-12-10T00:00:00.000Z'), end: new Date('2024-01-05T00:00:00.000Z') }

    const { rerender } = render(
      <DashboardDateSelector
        date={new Date('2024-01-10T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
        range={initialRange}
      />
    )

    // Assert label reflects initial
    expect(screen.getByTestId('dashboard-date-selector-label')).toHaveTextContent('Dec 10, 2023 — Jan 5, 2024')

    // Act: change to next range
    const nextRange = { start: new Date('2024-02-01T00:00:00.000Z'), end: new Date('2024-02-15T00:00:00.000Z') }
    rerender(
      <DashboardDateSelector
        date={new Date('2024-02-10T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
        range={nextRange}
      />
    )

    // Assert label and inputs reflect next
    expect(screen.getByTestId('dashboard-date-selector-label')).toHaveTextContent('Feb 1, 2024 — Feb 15, 2024')

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input') as HTMLInputElement
    const endInput = within(dialog).getByTestId('end-date-input') as HTMLInputElement
    expect(startInput.value).toBe('2024-02-01')
    expect(endInput.value).toBe('2024-02-15')
  })

  it('should keep end date >= start date while editing', async () => {
    // Arrange
    const user = createUser()

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-01-10T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
      />
    )

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input') as HTMLInputElement
    const endInput = within(dialog).getByTestId('end-date-input') as HTMLInputElement

    // Act: make start > end
    await user.clear(startInput)
    await user.type(startInput, '2024-02-10')
    await user.clear(endInput)
    await user.type(endInput, '2024-02-05')

    // Assert: end coerced up to start
    await waitFor(() => {
      expect(endInput.value).toBe('2024-02-10')
    })
  })

  it('should prevent applying future end dates and keep the dialog open', async () => {
    // Arrange
    const user = createUser()
    const handleRangeChange = jest.fn()

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-03-01T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onRangeChange={handleRangeChange}
        locale="en-US"
      />
    )

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input')
    const endInput = within(dialog).getByTestId('end-date-input')

    await user.clear(startInput)
    await user.type(startInput, '2024-03-10')
    await user.clear(endInput)
    await user.type(endInput, '2024-04-01')

    await user.click(within(dialog).getByTestId('apply-range'))

    // Assert: no emit; dialog stays open
    expect(handleRangeChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('date-range-dialog')).toBeInTheDocument()
  })

  it('should allow closing the popover with Escape', async () => {
    // Arrange / Act
    render(
      <DashboardDateSelector
        date={new Date('2024-02-01T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
      />
    )

    const user = createUser()
    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')

    // Act
    fireEvent.keyDown(dialog, { key: 'Escape' })

    // Assert
    expect(screen.queryByTestId('date-range-dialog')).toBeNull()
  })

  it('should block apply when dates are missing', async () => {
    // Arrange
    const user = createUser()
    const handleRangeChange = jest.fn()

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-04-01T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onRangeChange={handleRangeChange}
        locale="en-US"
      />
    )

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input')
    const endInput = within(dialog).getByTestId('end-date-input')

    await user.clear(startInput)
    await user.clear(endInput)
    await user.click(within(dialog).getByTestId('apply-range'))

    // Assert
    expect(handleRangeChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('date-range-dialog')).toBeInTheDocument()
  })

  it('should normalise when start date is after end date before applying', async () => {
    // Arrange
    const user = createUser()
    const handleRangeChange = jest.fn()

    // Act
    render(
      <DashboardDateSelector
        date={new Date('2024-02-01T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onRangeChange={handleRangeChange}
        locale="en-US"
      />
    )

    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    const dialog = await screen.findByTestId('date-range-dialog')
    const startInput = within(dialog).getByTestId('start-date-input')
    const endInput = within(dialog).getByTestId('end-date-input')

    fireEvent.change(startInput, { target: { value: '2024-02-20' } })
    fireEvent.change(endInput, { target: { value: '2024-02-10' } })

    // Assert: coerced end
    await waitFor(() => {
      expect(endInput).toHaveValue('2024-02-20')
    })

    // Act: apply
    await user.click(within(dialog).getByTestId('apply-range'))

    // Assert
    expect(handleRangeChange).toHaveBeenCalledTimes(1)
    const [start, end] = handleRangeChange.mock.calls[0]
    expect(start.toISOString()).toContain('2024-02-20')
    expect(end.toISOString()).toContain('2024-02-20')
  })

  it('should close the popover when clicking outside', async () => {
    // Arrange / Act
    render(
      <DashboardDateSelector
        date={new Date('2024-02-01T00:00:00.000Z')}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        locale="en-US"
      />
    )

    const user = createUser()
    await user.click(screen.getByTestId('dashboard-date-selector-label'))
    await screen.findByTestId('date-range-dialog')

    // Act
    fireEvent.mouseDown(document.body)

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId('date-range-dialog')).toBeNull()
    })
  })
})
