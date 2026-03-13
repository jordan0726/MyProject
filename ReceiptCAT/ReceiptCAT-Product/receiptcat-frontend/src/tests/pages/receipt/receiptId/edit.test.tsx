/**
 * EditReceiptPage — Unit/Integration Tests
 * ----------------------------------------
 * Scope:
 * - Verifies the edit screen renders current receipt details, supports inline editing,
 *   saves changes, and handles error/empty states.
 * - Confirms navigation behaviors (back, save-confirm dialogs) and accessibility affordances.
 *
 * Notes:
 * - Tests follow the AAA pattern (Arrange – Act – Assert) with explicit section comments.
 * - The editing logic itself lives in `useReceiptEditor`; here we mock/spy to control flows.
 * - The UI-only components (EditableItemRow, DashboardGrid, AppLayout) are shallowly mocked
 *   to keep tests focused on page behavior.
 */

import React from 'react'; // Test renderer base
import { render, screen, waitFor, within } from '@testing-library/react'; // RTL helpers
import userEvent from '@testing-library/user-event'; // User interaction simulator
import '@testing-library/jest-dom'; // Jest DOM matchers
import { useAuth } from 'react-oidc-context'; // OIDC auth hook to be mocked
import { useRouter } from 'next/router'; // Next.js router to be mocked
import EditReceiptPage from '@/pages/app/receipt/[receiptId]/edit'; // SUT (System Under Test)
import * as receiptApi from '@/lib/receiptApi'; // API module — spied for fetch/update
import * as receiptEditorModule from '../../../../features/receipt-edit/useReceiptEditor'; // Hook module to be mocked/spied
import type { AuthContextProps } from 'react-oidc-context'; // Type-only import for auth mocks

// =============================================================================
// Mocks
// =============================================================================

/** Mock Next.js router — we control navigation via a push mock. */
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

/** Mock OIDC auth — provide id_token and sub for authorized flows. */
jest.mock('react-oidc-context');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

/** Stub RequireAuth to a pass-through so auth gating does not affect tests. */
jest.mock('../../../../components/RequireAuth', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/** Stub AppLayout to a plain div to avoid layout side-effects in snapshots. */
jest.mock('../../../../layouts/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Mock EditableItemRow with a minimal test double:
 * - "Change" triggers onChange with deterministic values
 * - "Delete" calls onDelete
 * - When isNew, shows Cancel/Done to drive add-new-item flows
 */
jest.mock('../../../../components/EditableItemRow', () => ({
  __esModule: true,
  default: ({ item, onChange, onDone, isNew, onDelete }: any) => (
    <div data-testid={isNew ? 'editable-new-row' : 'editable-row'}>
      <span>{item.name}</span>
      <button
        onClick={() =>
          onChange &&
          onChange({
            ...item,
            name: 'ChangedName',
            quantity: 1,
            price: 5,
            category: 'Groceries',
          })
        }
      >
        Change
      </button>
      <button onClick={onDelete}>Delete</button>
      {isNew && (
        <>
          <button onClick={() => onDone('cancel')}>Cancel</button>
          <button onClick={() => onDone('done')}>Done</button>
        </>
      )}
    </div>
  ),
}));

/** Mock DashboardGrid to a simple wrapper to avoid grid layout complexity. */
jest.mock('../../../../components/DashboardGrid', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-grid">{children}</div>
  ),
}));

/** Auto-mock receipt API; individual methods will be spied/overridden per test. */
jest.mock('../../../../lib/receiptApi');

/**
 * Partially mock useReceiptEditor:
 * - Keep actual exports for types/utilities
 * - Replace the hook with a jest.fn so we can queue deterministic responses
 */
jest.mock('../../../../features/receipt-edit/useReceiptEditor', () => {
  const actual = jest.requireActual('../../../../features/receipt-edit/useReceiptEditor');
  return {
    __esModule: true,
    ...actual,
    useReceiptEditor: jest.fn(actual.useReceiptEditor),
  };
});

const actualUseReceiptEditor = jest.requireActual('../../../../features/receipt-edit/useReceiptEditor').useReceiptEditor;

/* ----------------------------- Helpers & Types ----------------------------- */

// =============================================================================
// Test Suite
// =============================================================================

// Narrow model used by tests to avoid importing full app types
type ReceiptLike = {
  receiptId: string;
  date: string;
  vendor: string;
  total: number;
  image_url: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    category: string;
    receiptId: string;
  }>;
};

// Minimal shape of useReceiptEditor.state the page consumes
type EditorHookState = {
  receipt: ReceiptLike | null;
  vendor: string;
  items: ReceiptLike['items'];
  loading: boolean;
  error: string | null;
  newItem: ReceiptLike['items'][number] | null;
  saveStatus: 'idle';
};

// Minimal shape of useReceiptEditor.actions the page invokes
type EditorHookActions = {
  setVendor: jest.Mock;
  setItems: jest.Mock;
  setNewItem: jest.Mock;
  isFormValid: jest.Mock<any, any>;
  calculateTotal: jest.Mock<any, any>;
  loadReceipt: jest.Mock;
  saveChanges: jest.Mock<any, any>;
};

/**
 * Build a baseline editor state with safe defaults; can be overridden per test.
 * Using literal types (e.g., 'idle') avoids widening to string and TS mismatches.
 */
const buildEditorState = (overrides: Partial<EditorHookState> = {}): EditorHookState => ({
  receipt: null,
  vendor: '',
  items: [] as ReceiptLike['items'],
  loading: false,
  error: null,
  newItem: null,
  saveStatus: 'idle',
  ...overrides,
});

/**
 * Build editor actions with jest.fn defaults; override selectively to simulate flows.
 * e.g., pass { saveChanges: jest.fn().mockResolvedValue(false) } to simulate failure.
 */
const buildEditorActions = (overrides: Partial<EditorHookActions> = {}): EditorHookActions => ({
  setVendor: jest.fn(),
  setItems: jest.fn(),
  setNewItem: jest.fn(),
  isFormValid: jest.fn().mockReturnValue(true),
  calculateTotal: jest.fn().mockReturnValue(0),
  loadReceipt: jest.fn(),
  saveChanges: jest.fn().mockResolvedValue(true),
  ...overrides,
});

/**
 * Compose the hook return value { state, actions } for queued mock implementations.
 * This lets tests simulate successive hook snapshots across renders.
 */
const buildEditorHook = (config: { state?: Partial<EditorHookState>; actions?: Partial<EditorHookActions> } = {}) => ({
  state: buildEditorState(config.state),
  actions: buildEditorActions(config.actions),
});

describe('EditReceiptPage', () => {
  // Reusable router push spy; asserted in navigation expectations
  const pushMock = jest.fn();
  const mockUseReceiptEditor = receiptEditorModule
    .useReceiptEditor as jest.MockedFunction<typeof receiptEditorModule.useReceiptEditor>;

  const buildReceipt = (overrides: Partial<ReceiptLike> = {}): ReceiptLike => ({
    receiptId: 'test-receipt',
    date: '2023-10-01',
    vendor: 'Vendor',
    total: 0,
    image_url: '',
    items: [],
    ...overrides,
  });

  // Configure the router mock for each test (default: receiptId present)
  const setRouterState = (query: Record<string, unknown> = { receiptId: 'test-receipt' }) => {
    (useRouter as jest.Mock).mockReturnValue({
      query,
      push: pushMock,
    });
  };

  // Spy on fetchReceiptById and resolve once with provided payload (or null/error)
  const mockFetchReceipt = (receipt: ReceiptLike | null) =>
    jest.spyOn(receiptApi, 'fetchReceiptById').mockResolvedValueOnce(receipt as any);

  // SUT renderer with the current mock wiring
  const renderPage = () => render(<EditReceiptPage />);

  // Utility to click the Save CTA and then confirm in the modal dialog
  const clickSaveAndConfirm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByTestId('receipt-edit-save'));
    const saveConfirm = await screen.findByTestId('receipt-edit-save-confirm');
    await user.click(within(saveConfirm).getByRole('button', { name: /save changes/i }));
  };

  // Queue successive useReceiptEditor returns to emulate state changes across renders
  const queueEditorHooks = (
    ...entries: Array<{ state?: Partial<EditorHookState>; actions?: Partial<EditorHookActions> }>
  ) => {
    if (!entries.length) return;
    entries.slice(0, -1).forEach((entry) => {
      mockUseReceiptEditor.mockImplementationOnce(() => buildEditorHook(entry));
    });
    mockUseReceiptEditor.mockImplementation(() => buildEditorHook(entries[entries.length - 1]));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReceiptEditor.mockImplementation(actualUseReceiptEditor); // Default to real hook unless overridden
    window.alert = jest.fn(); // Silence alerts; allows assertion on messages
    setRouterState(); // Default router: { receiptId: 'test-receipt' }

    mockUseAuth.mockReturnValue({
      user: {
        id_token: 'mock-token',
        profile: { sub: 'user123' },
      },
    } as AuthContextProps);
  });

  describe('Happy path editing', () => {
    it('should render current receipt details and persist edits', async () => {
      // AAA — Arrange / Act / Assert
      const user = userEvent.setup();
      // Arrange — seed API with a populated receipt payload
      mockFetchReceipt(
        buildReceipt({
          vendor: 'Woolworths',
          total: 20,
          image_url: 'https://example.com/image.jpg',
          items: [
            { name: 'Milk', quantity: 2, price: 3, category: 'Dairy', receiptId: 'test-receipt' },
          ],
        })
      );
      // Spy — capture update calls to assert on the payload
      const updateReceiptMock = jest.spyOn(receiptApi, 'updateReceiptData').mockResolvedValue();

      // Act — render page with current mocks
      renderPage();

      // Locate vendor input and update it to a new value (simulates user editing)
      const vendorInput = await screen.findByTestId('receipt-edit-vendor');
      expect(vendorInput).toHaveValue('Woolworths');
      await user.clear(vendorInput);
      await user.type(vendorInput, 'Woolworths Market');
      await waitFor(() => {
        expect(vendorInput).toHaveValue('Woolworths Market');
      });
      expect(await screen.findByText('Milk')).toBeInTheDocument(); // Existing line item is visible
      expect(screen.getByAltText('Receipt')).toHaveAttribute('src', 'https://example.com/image.jpg'); // Image preview rendered

      // Simulate inline row edit via mocked EditableItemRow
      await user.click(screen.getByText('Change'));
      // Click Save and confirm in modal to persist changes
      await clickSaveAndConfirm(user);

      // Assert — update API called with edited vendor, computed total, and changed item name
      await waitFor(() => {
        expect(updateReceiptMock).toHaveBeenCalledWith(
          'user123',
          'test-receipt',
          expect.objectContaining({
            vendor: 'Woolworths Market',
            total: expect.any(Number),
            items: [expect.objectContaining({ name: 'ChangedName' })],
          }),
          'mock-token'
        );
      });

      // Additionally assert on computed fields inside the payload
      const payload = updateReceiptMock.mock.calls[0][2] as ReceiptLike;
      expect(payload.items[0].price).toBe(5);
      expect(pushMock).toHaveBeenCalledWith({ // Navigates back to detail with saved=1 flag
        pathname: '/app/receipt/test-receipt',
        query: { saved: '1' },
      });
    });
  });

  describe('Loading & error states', () => {
    it('should show error messaging when the fetch fails', async () => {
      // Arrange — simulate network/API failure on fetch
      const errorMessage = 'Oops!';
      jest.spyOn(receiptApi, 'fetchReceiptById').mockRejectedValueOnce(new Error(errorMessage));

      // Act — render page to trigger fetch
      renderPage();

      // Assert — error message surfaced to the user
      await waitFor(() => {
        expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
      });
    });

    it('should render empty-state messaging when receipt detail is missing', async () => {
      // Arrange — API returns no receipt detail
      mockFetchReceipt(null);

      // Act
      renderPage();

      // Assert — empty state copy and $0 total are displayed
      await waitFor(() => {
        expect(screen.getByText('Gross Total: $0.00')).toBeInTheDocument();
        expect(screen.getByText('No image available for this receipt.')).toBeInTheDocument();
      });
    });

    it('should hide the Save button when receipt data is unavailable', async () => {
      // Arrange — no data disables primary actions
      mockFetchReceipt(null);

      // Act
      renderPage();

      // Assert — Save button hidden (no actionable form)
      await waitFor(() => {
        expect(screen.queryByTestId('receipt-edit-save')).not.toBeInTheDocument();
      });
    });
  });

  describe('Save workflow', () => {
    it('should disable Save when the form contains invalid data', async () => {
      // Arrange — invalid vendor and item fields
      mockFetchReceipt(
        buildReceipt({
          vendor: '',
          items: [
            { name: '', quantity: 0, price: 0, category: '', receiptId: 'test-receipt' },
          ],
        })
      );

      // Act
      renderPage();
      const saveButton = await screen.findByTestId('receipt-edit-save');

      // Assert — form-level validation disables Save
      expect(saveButton).toBeDisabled();
    });

    it('should alert the user when persisting changes fails', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(
        buildReceipt({
          vendor: 'Test',
          items: [
            { name: 'Item', quantity: 1, price: 1, category: 'Misc', receiptId: 'test-receipt' },
          ],
        })
      );
      const errorMessage = 'Update failed';
      // Arrange — simulate backend failure on update
      jest.spyOn(receiptApi, 'updateReceiptData').mockRejectedValue(new Error(errorMessage));

      // Act — invoke Save and confirm
      renderPage();
      const saveButton = await screen.findByTestId('receipt-edit-save');
      await user.click(saveButton);
      const saveConfirm = await screen.findByTestId('receipt-edit-save-confirm');
      await user.click(within(saveConfirm).getByRole('button', { name: /save changes/i }));

      // Assert — error surfaced via alert fallback
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should surface unexpected save errors via the handler fallback', async () => {
      const user = userEvent.setup();
      // Arrange — unexpected non-Error rejection
      const saveError = {} as Error;
      mockUseReceiptEditor.mockImplementation(() =>
        buildEditorHook({
          state: {
            receipt: { receiptId: 'test-receipt', image_url: '' } as any,
            vendor: 'Vendor',
          },
          actions: {
            saveChanges: jest.fn().mockRejectedValue(saveError),
          },
        })
      );

      // Act
      renderPage();
      const saveButton = screen.getByTestId('receipt-edit-save');
      await user.click(saveButton);
      const saveConfirm = await screen.findByTestId('receipt-edit-save-confirm');
      await user.click(within(saveConfirm).getByRole('button', { name: /save changes/i }));

      // Assert — generic fallback message used
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Save failed.');
      });
    });

    it('should navigate with a saved flag after persisting changes', async () => {
      const user = userEvent.setup();
      // Arrange — valid receipt ready to save
      mockFetchReceipt(
        buildReceipt({
          vendor: 'New Vendor',
        })
      );
      jest.spyOn(receiptApi, 'updateReceiptData').mockResolvedValueOnce(undefined);

      // Act — save flow
      renderPage();
      await screen.findByTestId('receipt-edit-vendor');
      await user.click(screen.getByTestId('receipt-edit-save'));
      const saveConfirm = await screen.findByTestId('receipt-edit-save-confirm');
      await user.click(within(saveConfirm).getByRole('button', { name: /save changes/i }));

      // Assert — navigates with saved flag; no alert shown
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith({
          pathname: '/app/receipt/test-receipt',
          query: { saved: '1' },
        });
      });
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('New item management', () => {
    it('should remove the pending row when the user cancels', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(buildReceipt());

      // Act — open inline new-item editor
      renderPage();
      const addNewItemTrigger = await screen.findByTestId('receipt-edit-add-item');
      await user.click(addNewItemTrigger);
      const newRow = await screen.findByTestId('editable-new-row');
      // Simulate deleting draft content inside the new row
      await user.click(within(newRow).getByText('Delete'));
      await user.click(screen.getByText('Cancel'));

      // Assert — pending row removed
      expect(screen.queryByTestId('editable-new-row')).not.toBeInTheDocument();
    });

    it('should block completion of an incomplete new item', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(buildReceipt());

      // Act
      renderPage();
      const addNewItemTrigger = await screen.findByTestId('receipt-edit-add-item');
      await user.click(addNewItemTrigger);
      // Attempt to complete without filling required fields
      await user.click(screen.getByText('Done'));

      // Assert — validation message shown
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Please fill all fields for the new item before done.');
      });
    });

    it('should add a new item once all fields are satisfied', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(buildReceipt());

      // Act
      renderPage();
      const addNewItemTrigger = await screen.findByTestId('receipt-edit-add-item');
      await user.click(addNewItemTrigger);
      // Use mocked row "Change" to populate required fields
      await user.click(screen.getByText('Change'));
      await user.click(screen.getByText('Done'));

      // Assert — new item added and editor closed
      await waitFor(() => {
        expect(screen.getByText('ChangedName')).toBeInTheDocument();
        expect(screen.queryByTestId('editable-new-row')).not.toBeInTheDocument();
      });
    });

    it('should seed a blank receiptId when the route parameter is missing', async () => {
      const user = userEvent.setup();
      // Simulate missing route param; component should seed blank receiptId for new items
      setRouterState({});
      const setNewItem = jest.fn();
      mockUseReceiptEditor.mockImplementation(() =>
        buildEditorHook({
          state: {
            receipt: { receiptId: 'existing', image_url: '' } as any,
            vendor: 'Vendor',
          },
          actions: {
            setNewItem,
          },
        })
      );

      // Act
      renderPage();
      await user.click(screen.getByTestId('receipt-edit-add-item'));

      // Assert — receiptId seeded as empty string
      expect(setNewItem).toHaveBeenCalledWith(expect.objectContaining({ receiptId: '' }));
    });
  });

  describe('Navigation & UI polish', () => {
    it('should navigate back to the detail page when the Back button is clicked', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(buildReceipt());

      // Act — click Back button
      renderPage();
      await screen.findByTestId('receipt-edit-save');
      await user.click(screen.getByRole('button', { name: /back to receipt detail/i }));

      // Assert — navigates to detail page
      expect(pushMock).toHaveBeenCalledWith('/app/receipt/test-receipt');
    });

    it('should warn the user before leaving when changes are pending', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(buildReceipt({ vendor: 'Start Vendor' }));

      // Act — make page dirty, then request to leave
      renderPage();
      const vendorInput = await screen.findByTestId('receipt-edit-vendor');
      await user.clear(vendorInput);
      await user.type(vendorInput, 'Updated Vendor');
      await user.click(screen.getByRole('button', { name: /back to receipt detail/i }));

      // Assert — leave-confirm dialog appears and blocks navigation
      const confirm = await screen.findByTestId('receipt-edit-leave-confirm');
      expect(confirm).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();

      // Confirm — leaving without saving proceeds after user confirmation
      await user.click(screen.getByText(/leave without saving/i));

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/app/receipt/test-receipt');
      });
    });

    it('should show hover styling for the Save button', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(
        buildReceipt({
          items: [
            { name: 'Item', quantity: 1, price: 10, category: 'Misc', receiptId: 'test-receipt' },
          ],
        })
      );

      // Baseline — underline hidden
      renderPage();
      const saveButton = await screen.findByTestId('receipt-edit-save');
      expect(saveButton).toHaveStyle({ borderBottom: '1px solid transparent' });

      // Act — hover to show underline
      await user.hover(saveButton);
      await waitFor(() => {
        expect(saveButton).toHaveStyle({ borderBottom: '1px solid currentColor' });
      });

      // Act — unhover to hide underline
      await user.unhover(saveButton);
      await waitFor(() => {
        expect(saveButton).toHaveStyle({ borderBottom: '1px solid transparent' });
      });
    });

    it('should activate the add item trigger via keyboard', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(buildReceipt());

      // Act
      renderPage();
      const addTrigger = await screen.findByTestId('receipt-edit-add-item');
      addTrigger.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(await screen.findByTestId('editable-new-row')).toBeInTheDocument();
    });

    it('should also open the add item editor when space is pressed', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(buildReceipt());

      // Act
      renderPage();
      const addTrigger = await screen.findByTestId('receipt-edit-add-item');
      addTrigger.focus();
      await user.keyboard('[Space]');

      // Assert
      expect(await screen.findByTestId('editable-new-row')).toBeInTheDocument();
    });
  });

  describe('Snapshot maintenance', () => {
    it('should retain the empty snapshot when a blank receipt disappears', async () => {
      const user = userEvent.setup();
      const blankReceipt = buildReceipt({
        vendor: '',
        date: '2024-01-01',
        total: 0,
      });

      // Arrange — initial blank receipt, then disappearance
      queueEditorHooks(
        {
          state: {
            receipt: blankReceipt,
            vendor: '',
            items: blankReceipt.items,
          },
        },
        {
          state: {
            receipt: null,
            vendor: '',
            items: [],
          },
        }
      );

      // Act — re-render to consume queued snapshots
      const { rerender } = renderPage();
      await screen.findByTestId('receipt-edit-save');

      rerender(<EditReceiptPage />);
      await screen.findByTestId('receipt-edit-save');

      await user.click(screen.getByRole('button', { name: /back to receipt detail/i }));
      // Assert — no unsaved prompt because snapshot stayed empty
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/app/receipt/test-receipt');
      });
      expect(screen.queryByTestId('receipt-edit-leave-confirm')).not.toBeInTheDocument();
    });

    it('should keep the snapshot when identical payloads are received', async () => {
      const user = userEvent.setup();
      const baseReceipt = buildReceipt({
        vendor: 'Stable Vendor',
        date: '2023-10-01',
        total: 10,
        items: [
          { name: 'Bread', quantity: 1, price: 10, category: 'Bakery', receiptId: 'test-receipt' },
        ],
      });

      // Arrange — stable payload across renders
      queueEditorHooks(
        {
          state: {
            receipt: baseReceipt,
            vendor: baseReceipt.vendor,
            items: baseReceipt.items,
          },
        },
        {
          state: {
            receipt: {
              ...baseReceipt,
              items: baseReceipt.items.map((item) => ({ ...item })),
            },
            vendor: baseReceipt.vendor,
            items: baseReceipt.items,
          },
        }
      );

      const { rerender } = renderPage();
      await screen.findByTestId('receipt-edit-save');

      rerender(<EditReceiptPage />);
      await screen.findByTestId('receipt-edit-save');

      await user.click(screen.getByRole('button', { name: /back to receipt detail/i }));

      // Assert — identical payload preserves snapshot; leaving is allowed
      expect(screen.queryByTestId('receipt-edit-leave-confirm')).not.toBeInTheDocument();
      expect(pushMock).toHaveBeenCalledWith('/app/receipt/test-receipt');
    });

    it('should refresh the snapshot when the payload changes', async () => {
      const user = userEvent.setup();
      const firstReceipt = buildReceipt({
        vendor: 'Vendor Alpha',
        date: '2024-02-01',
        total: 12,
        items: [
          { name: 'Coffee', quantity: 2, price: 6, category: 'Cafe', receiptId: 'test-receipt' },
        ],
      });

      const updatedReceipt = {
        ...firstReceipt,
        vendor: 'Vendor Beta',
        items: [
          { name: 'Coffee', quantity: 2, price: 6, category: 'Cafe', receiptId: 'test-receipt' },
          { name: 'Muffin', quantity: 1, price: 3, category: 'Bakery', receiptId: 'test-receipt' },
        ],
      };

      // Arrange — payload changes (vendor + extra item)
      queueEditorHooks(
        {
          state: {
            receipt: firstReceipt,
            vendor: firstReceipt.vendor,
            items: firstReceipt.items,
          },
        },
        {
          state: {
            receipt: firstReceipt,
            vendor: firstReceipt.vendor,
            items: firstReceipt.items,
          },
        },
        {
          state: {
            receipt: updatedReceipt,
            vendor: updatedReceipt.vendor,
            items: updatedReceipt.items,
          },
        }
      );

      const { rerender } = renderPage();
      // Baseline — old vendor visible
      const vendorInput = await screen.findByTestId('receipt-edit-vendor');
      expect(vendorInput).toHaveValue('Vendor Alpha');

      rerender(<EditReceiptPage />);
      // Assert — snapshot refreshes to new vendor
      await waitFor(() => {
        expect(screen.getByTestId('receipt-edit-vendor')).toHaveValue('Vendor Beta');
      });

      await user.click(screen.getByRole('button', { name: /back to receipt detail/i }));
      // Confirm — no unsaved dialog since snapshot updated
      expect(screen.queryByTestId('receipt-edit-leave-confirm')).not.toBeInTheDocument();
      expect(pushMock).toHaveBeenCalledWith('/app/receipt/test-receipt');
    });

    it('should retain the snapshot when data repeats and skip prompts when the receipt disappears', async () => {
      const user = userEvent.setup();
      const baseReceipt = buildReceipt({
        vendor: 'Stable Vendor',
        date: '2023-10-01',
        total: 10,
        items: [
          { name: 'Bread', quantity: 1, price: 10, category: 'Bakery', receiptId: 'test-receipt' },
        ],
      });

      // Arrange — repeat data then disappearance
      queueEditorHooks(
        {
          state: {
            receipt: baseReceipt,
            vendor: 'Stable Vendor',
            items: baseReceipt.items,
          },
        },
        {
          state: {
            receipt: baseReceipt,
            vendor: 'Stable Vendor',
            items: baseReceipt.items,
          },
        },
        {
          state: {
            receipt: null,
            vendor: '',
            items: [],
          },
        }
      );

      const { rerender } = renderPage();
      await screen.findByTestId('receipt-edit-save');

      rerender(<EditReceiptPage />);
      await screen.findByTestId('receipt-edit-save');

      await user.click(screen.getByRole('button', { name: /back to receipt detail/i }));

      // Assert — leaving allowed without prompt
      expect(screen.queryByTestId('receipt-edit-leave-confirm')).not.toBeInTheDocument();
      expect(pushMock).toHaveBeenCalledWith('/app/receipt/test-receipt');
    });
  });

  describe('Existing items', () => {
    it('should remove an item when Delete is clicked', async () => {
      const user = userEvent.setup();
      // Arrange
      mockFetchReceipt(
        buildReceipt({
          receiptId: 'r2',
          vendor: 'Coles',
          total: 5.97,
          date: '2023-09-29',
          items: [
            {
              receiptId: 'r2',
              name: 'Banana',
              price: 1.99,
              quantity: 3,
              category: 'Fruits & Vegetables',
            },
          ],
        })
      );

      // Act — mutate then delete the item via mocked row controls
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Banana')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /change/i }));
      await user.click(screen.getByRole('button', { name: /delete/i }));

      // Assert — item removed from view
      await waitFor(() => {
        expect(screen.queryByText('ChangedName')).not.toBeInTheDocument();
      });
    });
  });
});
