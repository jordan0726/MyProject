// src/tests/components/ReceiptDetailCard.test.tsx

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import ReceiptDetailCard from '@/components/ReceiptDetailCard';
import type { Receipt, ReceiptItem } from '@/types/receipt';

// Mock icons to avoid rendering real SVGs or undefined icons
jest.mock('../../config/categoryIcons', () => ({
  CATEGORY_ICONS: {
    fruits_vegetables: '🍔',
    drinks: '🥤',
  },
}));

// ============================================================================
// Test data
// ============================================================================
const mockReceipt: Receipt = {
  receiptId: 'r123',
  vendor: 'Aldi',
  total: 25.75,
  date: '20/09/2025',
};

const mockItems: ReceiptItem[] = [
  { receiptId: 'r123', name: 'Milk', price: 6.4, quantity: 2, category: 'drinks' },
  { receiptId: 'r123', name: 'Bread', price: 2.5, quantity: 1, category: 'fruits_vegetables' },
];

// ============================================================================
// Test suite
// ============================================================================

describe('ReceiptDetailCard', () => {
  it('should render vendor name and total cost', () => {
    // Arrange
    render(<ReceiptDetailCard receipt={mockReceipt} items={mockItems} />);

    // Assert
    expect(screen.getByText('Aldi')).toBeInTheDocument();
    // Assert: header shows computed total fallback (sum of item subtotals)
    expect(screen.getByText('$8.90')).toBeInTheDocument();
  });

  it('should use subtotal fallback when backend total is zero or mismatched', () => {
    // Arrange: backend total intentionally wrong (0)
    const receiptWithWrongTotal: Receipt = { ...mockReceipt, total: 0 };
    const items = [
      { receiptId: 'r123', name: 'Item A', price: 4, quantity: 1, category: 'drinks' },
      { receiptId: 'r123', name: 'Item B', price: 3, quantity: 1, category: 'fruits_vegetables' },
    ];

    // Act
    render(<ReceiptDetailCard receipt={receiptWithWrongTotal} items={items} />);

    // subtotalSum = 7, so header total should fallback to $7.00
    expect(screen.getByText('$7.00')).toBeInTheDocument();
  });

  it('should use subtotal fallback when backend total mismatches by more than 0.01', () => {
    // Arrange: backend total differs from subtotal by > 0.01 (force fallback)
    const receiptWithMismatch: Receipt = { ...mockReceipt, total: 12.34 };
    const items = [
      { receiptId: 'r123', name: 'Item X', price: 6.0, quantity: 1, category: 'drinks' },
      { receiptId: 'r123', name: 'Item Y', price: 4.0, quantity: 1, category: 'fruits_vegetables' },
    ];

    // Act
    render(<ReceiptDetailCard receipt={receiptWithMismatch} items={items} />);

    // subtotalSum = 10.00 -> header should fall back to $10.00
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('should keep backend total when difference is within tolerance (<= 0.01)', () => {
    // Arrange: backend total is within 0.01 of subtotal (no fallback)
    const receiptWithinTolerance: Receipt = { ...mockReceipt, total: 10.01 };
    const items = [
      { receiptId: 'r123', name: 'Item X', price: 6.0, quantity: 1, category: 'drinks' },
      { receiptId: 'r123', name: 'Item Y', price: 4.0, quantity: 1, category: 'fruits_vegetables' },
    ];

    // Act
    render(<ReceiptDetailCard receipt={receiptWithinTolerance} items={items} />);

    // subtotalSum = 10.00, diff = 0.01 -> should use backend total $10.01
    expect(screen.getByText('$10.01')).toBeInTheDocument();
  });

  it('should render all receipt items with name, quantity and price', () => {
    // Arrange
    render(<ReceiptDetailCard receipt={mockReceipt} items={mockItems} />);

    // Assert
    const header = screen.getByTestId('receipt-detail-header');
    expect(within(header).getByText('Item')).toBeInTheDocument();
    expect(within(header).getByText('Qty')).toBeInTheDocument();
    expect(within(header).getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$6.40')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
  });

  it('should render total item count and purchase date in the footer', () => {
    // Arrange
    render(<ReceiptDetailCard receipt={mockReceipt} items={mockItems} />);

    // Assert
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('Purchase Date: 20/09/2025')).toBeInTheDocument();
  });

  it('should render the empty state when no items are provided', () => {
    // Arrange
    render(<ReceiptDetailCard receipt={mockReceipt} items={[]} />);

    // Assert
    expect(screen.getByText('0 items')).toBeInTheDocument();
    expect(screen.getByText('Purchase Date: 20/09/2025')).toBeInTheDocument();
  });

  it('should default quantity to 1 when an item omits quantity', () => {
    // Arrange
    const itemsWithoutQuantity: ReceiptItem[] = [
      { receiptId: 'r123', name: 'Fallback Item', price: 5, category: 'drinks' },
    ];

    // Act
    render(<ReceiptDetailCard receipt={mockReceipt} items={itemsWithoutQuantity} />);

    // Assert
    expect(screen.getByText('Fallback Item')).toBeInTheDocument();
    // Assert: both header total and the single row subtotal render $5.00
    expect(screen.getAllByText('$5.00')).toHaveLength(2);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render unknown categories without breaking the layout', () => {
    // Arrange
    const itemsWithUnknownCategory: ReceiptItem[] = [
      { receiptId: 'r123', name: 'Mystery Item', price: 9.99, quantity: 1, category: 'UnknownCategory' as any },
    ];

    // Act
    render(<ReceiptDetailCard receipt={mockReceipt} items={itemsWithUnknownCategory} />);

    // Assert
    const iconSpans = screen.getAllByText((_, el) => el?.tagName.toLowerCase() === 'span');
    const foundEmptySpan = iconSpans.find((el) => el.textContent === '');
    expect(foundEmptySpan).toBeDefined();
    expect(screen.getByText('Mystery Item')).toBeInTheDocument();
    // Assert: both header total and the single row subtotal render $9.99
    expect(screen.getAllByText('$9.99')).toHaveLength(2);
  });

  it('should fall back to zero subtotal when an item omits price', () => {
    // Arrange
    const noPriceItems: ReceiptItem[] = [
      { receiptId: 'r123', name: 'Free Sample', price: undefined as unknown as number, quantity: 3, category: 'drinks' }, // use undefined (cast) to simulate missing price while satisfying type
    ];
    const receiptWithoutTotal: Receipt = { ...mockReceipt, total: undefined as unknown as number };

    // Act
    render(<ReceiptDetailCard receipt={receiptWithoutTotal} items={noPriceItems} />);

    // Assert
    expect(screen.getByText('Free Sample')).toBeInTheDocument();
    expect(screen.getAllByText('$0.00')).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
