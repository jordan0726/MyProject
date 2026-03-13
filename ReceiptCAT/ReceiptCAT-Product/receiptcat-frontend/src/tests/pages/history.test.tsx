// src/tests/pages/history.test.tsx

import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import type { AuthContextProps } from 'react-oidc-context'
import { useAuth } from 'react-oidc-context'
import HistoryPage from '../../pages/app/history'

// =============================================================================
// Mocks & Setup
// =============================================================================

// --- Mock auth context ---
jest.mock('react-oidc-context')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// --- Mock RequireAuth and Layout shells ---
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

// --- Mock ReceiptCard to capture props ---
const receivedReceiptCardProps: any[] = []
jest.mock('../../components/ReceiptCard', () => ({
  __esModule: true,
  default: (props: any) => {
    receivedReceiptCardProps.push(props.receipt)
    return <div data-testid="receipt-card">{props.receipt.vendor}</div>
  },
}))

// --- Mock useReceiptHistory hook ---
const mockUseReceiptHistory = jest.fn()
jest.mock('../../features/useReceiptHistory', () => ({
  __esModule: true,
  useReceiptHistory: () => mockUseReceiptHistory(),
}))

// --- Global cleanup ---
afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
  receivedReceiptCardProps.length = 0
})

// =============================================================================
// Test Suite: HistoryPage
// =============================================================================

describe('HistoryPage', () => {
  // --------------------------------------------------------------------------
  // Normal render with receipts and summary
  // --------------------------------------------------------------------------
  it('renders total cost, items, receipts and receipt cards correctly', () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { profile: { given_name: 'Alex' }, id_token: 'token' },
    } as AuthContextProps)

    mockUseReceiptHistory.mockReturnValue({
      loading: false,
      error: null,
      summary: {
        totalCost: 123.45,
        totalItems: 10,
        totalReceipts: 2,
      },
      receipts: [
        { receiptId: 'r1', vendor: 'Woolworths' },
        { receiptId: 'r2', vendor: 'Coles' },
      ],
    })

    // Act
    render(<HistoryPage />)

    // Assert
    expect(screen.getByText('$123.45')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Receipts')).toBeInTheDocument()

    const cards = screen.getAllByTestId('receipt-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Woolworths')
    expect(cards[1]).toHaveTextContent('Coles')
  })

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------
  it('shows loading state when loading is true', () => {
    mockUseReceiptHistory.mockReturnValue({
      loading: true,
      error: null,
      summary: { totalCost: 0, totalItems: 0, totalReceipts: 0 },
      receipts: [],
    })

    render(<HistoryPage />)

    // Loading indicator text: adjust if actual component uses ellipsis (…) vs ...
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  // --------------------------------------------------------------------------
  // Error state
  // --------------------------------------------------------------------------
  it('shows error message when error is present', () => {
    mockUseReceiptHistory.mockReturnValue({
      loading: false,
      error: 'Failed to load receipts',
      summary: { totalCost: 0, totalItems: 0, totalReceipts: 0 },
      receipts: [],
    })

    render(<HistoryPage />)

    // More robust match using RegExp for fallback when span wrapping occurs
    expect(screen.getByText(/Failed to load receipts/i)).toBeInTheDocument()
  })

  // --------------------------------------------------------------------------
  // Empty state
  // --------------------------------------------------------------------------
  it('shows empty state when there are no receipts', () => {
    mockUseReceiptHistory.mockReturnValue({
      loading: false,
      error: null,
      summary: { totalCost: 0, totalItems: 0, totalReceipts: 0 },
      receipts: [],
    })

    render(<HistoryPage />)

    expect(screen.getByText('No receipts yet.')).toBeInTheDocument()
  })
})