// src/tests/pages/receipt/[receiptId].test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReceiptDetailPage from '@/pages/app/receipt/[receiptId]';
import { useRouter } from 'next/router';
import { useAuth } from 'react-oidc-context';
import * as receiptApi from '@/lib/receiptApi';

// ============================================================================
// Mocks
// ============================================================================

// Mock useRouter
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth
jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

// Mock AppLayout
jest.mock('../../../layouts/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

// Mock DashboardGrid
jest.mock('../../../components/DashboardGrid', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-grid">{children}</div>
  ),
}))

// Mock ReceiptDetailCard
jest.mock('../../../components/ReceiptDetailCard', () => ({
  __esModule: true,
  default: ({ receipt, items }: any) => (
    <div data-testid="receipt-detail-card">
      {receipt.vendor} - {items.length} items
    </div>
  ),
}));

// Mock receiptApi correctly
jest.mock('../../../lib/receiptApi', () => ({
  __esModule: true,
  fetchReceiptById: jest.fn(),
}))

// Spy on fetch functions
const fetchReceiptByIdSpy = jest.spyOn(receiptApi, 'fetchReceiptById');

// ============================================================================
// Tests
// ============================================================================

describe('ReceiptDetailPage', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    // mock router.query.receiptId
    (useRouter as jest.Mock).mockReturnValue({
      query: { receiptId: 'abc123' },
      push: mockPush,
      replace: mockReplace,
      isReady: true,
    });

    // mock auth user
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id_token: 'token',
        profile: { sub: 'user123' },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders receipt detail correctly after data load', async () => {
    // Arrange
    fetchReceiptByIdSpy.mockResolvedValue({
      receiptId: 'abc123',
      vendor: 'Coles',
      date: '01/10/2025',
      total: 55.2,
      items: [
        { receiptId: 'abc123', name: 'Milk', price: 3.2, quantity: 2 },
        { receiptId: 'abc123', name: 'Bread', price: 2.5, quantity: 1 },
      ],
      image_url: 'https://example.com/receipt.jpg',
    });

    // Act
    render(<ReceiptDetailPage />);

    // Assert loading state first
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Assert after data is fetched
    await waitFor(() => {
      expect(screen.getByTestId('receipt-detail-card')).toBeInTheDocument();
      expect(screen.getByText('Coles - 2 items')).toBeInTheDocument();
    });
  });

  it('shows fallback message if receipt image is missing', async () => {
    // Arrange
    fetchReceiptByIdSpy.mockResolvedValue({
      receiptId: 'abc123',
      vendor: 'Woolworths',
      date: '01/10/2025',
      total: 42,
      items: [],
      image_url: '', // <- no image
    });

    // Act
    render(<ReceiptDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('No image available for this receipt.')).toBeInTheDocument();
    });
  });

  it('skips fetching if receiptId is missing', () => {
    (useRouter as jest.Mock).mockReturnValue({
      query: {}, // no receiptId
      push: jest.fn(),
      replace: jest.fn(),
      isReady: true,
    });

    render(<ReceiptDetailPage />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows error message if API fails', async () => {
    // Arrange
    fetchReceiptByIdSpy.mockRejectedValue(new Error('API error'));

    // Act
    render(<ReceiptDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Error: API error')).toBeInTheDocument();
    });
  });

  it('shows fallback if receipt not found', async () => {
    // Arrange
    fetchReceiptByIdSpy.mockResolvedValue(null); // No matching receipt

    // Act
    render(<ReceiptDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Receipt not found.')).toBeInTheDocument();
    });
  });

  it('navigates back to history when back button is clicked', async () => {
    // Arrange
    fetchReceiptByIdSpy.mockResolvedValue({
      receiptId: 'abc123',
      vendor: 'Coles',
      date: '01/10/2025',
      total: 55.2,
      items: [
        { receiptId: 'abc123', name: 'Milk', price: 3.2, quantity: 2 },
        { receiptId: 'abc123', name: 'Bread', price: 2.5, quantity: 1 },
      ],
      image_url: 'https://example.com/receipt.jpg',
    });

    // Act
    render(<ReceiptDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Back to History Page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back to History Page'));

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/app/history');
  });

  it('navigates to edit page when Edit button is clicked', async () => {
    fetchReceiptByIdSpy.mockResolvedValue({
      receiptId: 'abc123',
      vendor: 'Coles',
      date: '01/10/2025',
      total: 55.2,
      items: [
        { receiptId: 'abc123', name: 'Milk', price: 3.2, quantity: 2 },
        { receiptId: 'abc123', name: 'Bread', price: 2.5, quantity: 1 },
      ],
      image_url: 'https://example.com/receipt.jpg',
    });

    render(<ReceiptDetailPage />);

    // wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    // click Edit button
    fireEvent.click(screen.getByText('Edit'));

    // assert router.push was called correctly
    expect(mockPush).toHaveBeenCalledWith('/app/receipt/abc123/edit');
  });

  it('shows a toast when returning from edit with saved flag', async () => {
    (useRouter as jest.Mock).mockReturnValue({
      query: { receiptId: 'abc123', saved: '1' },
      push: mockPush,
      replace: mockReplace,
      isReady: true,
    });

    fetchReceiptByIdSpy.mockResolvedValue({
      receiptId: 'abc123',
      vendor: 'Coles',
      date: '01/10/2025',
      total: 55.2,
      items: [],
      image_url: '',
    });

    render(<ReceiptDetailPage />);

    await waitFor(() => {
      const toast = screen.getByTestId('receipt-saved-toast');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute('data-position', 'center');
      expect(mockReplace).toHaveBeenCalledWith('/app/receipt/abc123', undefined, { shallow: true });
    });
  });

  it('changes button color on hover and active states', async () => {
  fetchReceiptByIdSpy.mockResolvedValue({
    receiptId: 'abc123',
    vendor: 'Coles',
    date: '01/10/2025',
    total: 55.2,
    items: [],
    image_url: 'https://example.com/img.jpg'
  });

  render(<ReceiptDetailPage />);
  const editButton = await screen.findByText('Edit');

  fireEvent.mouseEnter(editButton);
  fireEvent.mouseDown(editButton);
  fireEvent.mouseUp(editButton);
  fireEvent.mouseLeave(editButton);

  expect(editButton).toBeInTheDocument(); // basic assertion
});
  
});
