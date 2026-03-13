// src/tests/components/ReceiptCard.test.tsx

import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import ReceiptCard from '@/components/ReceiptCard'
import type { Receipt } from '@/types/receipt'

// ============================================================================
// Global mocks
// ============================================================================

// Mock useRouter
const pushMock = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

// ============================================================================
// Test data
// ============================================================================

const mockReceipt: Receipt = {
  receiptId: 'abc123',
  vendor: 'Woolworths',
  total: 45.5,
  date: '30/09/2025',
  items: [
    { receiptId: 'item1', name: 'Milk', price: 3.2, quantity: 2 },
    { receiptId: 'item2', name: 'Bread', price: 2.5, quantity: 1 },
  ],
}

// ============================================================================
// Test suite
// ============================================================================

describe('ReceiptCard', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders vendor, total, item count, and purchase date', () => {
    // Arrange
    render(<ReceiptCard receipt={mockReceipt} />)

    // Assert
    expect(screen.getByText('Woolworths')).toBeInTheDocument()
    expect(screen.getByText('$45.50')).toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
    expect(screen.getByText('Purchase Date: 30/09/2025')).toBeInTheDocument()
  })

  it('navigates to receipt detail page on click', () => {
    // Arrange
    render(<ReceiptCard receipt={mockReceipt} />)

    // Act
    fireEvent.click(screen.getByRole('button'))

    // Assert
    expect(pushMock).toHaveBeenCalledWith('/app/receipt/abc123')
  })

it('shows 0 items when items array is undefined', () => {
  // Arrange
  const noItemReceipt: Receipt = {
    receiptId: 'r-no-items',
    vendor: 'Aldi',
    total: 0,
    date: '01/10/2025',
    items: undefined,
  }

  // Act
  render(<ReceiptCard receipt={noItemReceipt} />)

  // Assert
  expect(screen.getByText('0 items')).toBeInTheDocument()
})
})