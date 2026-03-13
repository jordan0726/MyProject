// src/features/receipt-edit/useReceiptEditor.ts
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Receipt, ReceiptItem } from '@/types/receipt';
import { fetchReceiptById, updateReceiptData } from '@/lib/receiptApi';

// ────────────────────────────────────────────────────────────────────────────────
// Hook overview
// ────────────────────────────────────────────────────────────────────────────────
// `useReceiptEditor` consolidates all state and actions required by the receipt
// edit page: loading the receipt, tracking form fields, validating before save,
// and persisting updates. This keeps the page component focused on rendering.

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

// Shape of the state payload returned to the page component.
export interface ReceiptEditorState {
  receipt: Receipt | null;
  vendor: string;
  items: ReceiptItem[];
  loading: boolean;
  error: string | null;
  newItem: ReceiptItem | null;
  saveStatus: SaveStatus;
}

// Public actions exposed to the page component.
export interface ReceiptEditorActions {
  setVendor: (value: string) => void;
  setItems: Dispatch<SetStateAction<ReceiptItem[]>>;
  setNewItem: Dispatch<SetStateAction<ReceiptItem | null>>;
  isFormValid: (overrideItems?: ReceiptItem[], overrideVendor?: string) => boolean;
  calculateTotal: (overrideItems?: ReceiptItem[]) => number;
  loadReceipt: () => Promise<void>;
  saveChanges: () => Promise<boolean>;
}

export function useReceiptEditor({
  receiptId,
  userId,
  token,
}: {
  receiptId?: string | string[];
  userId?: string;
  token?: string;
}): { state: ReceiptEditorState; actions: ReceiptEditorActions } {
  // Core form state (currently loaded receipt, editable items, vendor field, etc.).
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [vendor, setVendor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<ReceiptItem | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Next.js dynamic routes may provide `string[]`; normalize to `string | undefined`.
  const normalizedReceiptId = typeof receiptId === 'string' ? receiptId : undefined;

  // Validate vendor and every item before save.
  const isFormValid = (
    overrideItems: ReceiptItem[] = items,
    overrideVendor: string = vendor
  ) => (
    overrideVendor.trim() !== '' &&
    overrideItems.every(
      (item) =>
        item.name.trim() !== '' &&
        typeof item.quantity === 'number' && item.quantity > 0 &&
        typeof item.price === 'number' && item.price > 0 &&
        item.category?.trim() !== ''
    )
  );

  // Sum all line totals; each `item.price` already represents the line total.
  const calculateTotal = (overrideItems: ReceiptItem[] = items) =>
    overrideItems.reduce((sum, item) => {
      const total = typeof item.price === 'number' && !Number.isNaN(item.price) ? item.price : 0;
      return sum + total;
    }, 0);

  // Fetch receipt data from the API and hydrate the form state.
  const loadReceipt = async () => {
    if (!normalizedReceiptId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const receiptDetail = await fetchReceiptById(userId, normalizedReceiptId, token);
      if (receiptDetail) {
        setReceipt(receiptDetail);
        setItems(receiptDetail.items ?? []);
        setVendor(receiptDetail.vendor ?? '');
      } else {
        setReceipt(null);
        setItems([]);
        setVendor('');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  // Reload receipt whenever identifiers or token change.
  useEffect(() => {
    loadReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedReceiptId, userId, token]);

  // Persist the current form state back to the backend; returns success flag.
  const saveChanges = async () => {
    if (!receipt || !userId || !normalizedReceiptId) return false;
    if (!isFormValid()) {
      setSaveStatus('error');
      return false;
    }

    setSaveStatus('saving');
    try {
      const itemsToPersist = items.map((item) => ({
        ...item,
        price: typeof item.price === 'number' && !Number.isNaN(item.price) ? item.price : 0,
      }));

      await updateReceiptData(
        userId,
        normalizedReceiptId,
        {
          vendor,
          total: calculateTotal(itemsToPersist),
          items: itemsToPersist,
        },
        token
      );

      setSaveStatus('success');
      return true;
    } catch (err: any) {
      setSaveStatus('error');
      throw err;
    }
  };

  return {
    state: {
      receipt,
      vendor,
      items,
      loading,
      error,
      newItem,
      saveStatus,
    },
    actions: {
      setVendor,
      setItems,
      setNewItem,
      isFormValid,
      calculateTotal,
      loadReceipt,
      saveChanges,
    },
  };
}
