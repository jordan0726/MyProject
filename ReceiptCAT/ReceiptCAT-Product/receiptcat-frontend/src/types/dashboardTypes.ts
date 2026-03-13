// src/types/dashboard.ts
// Month payload that works for both Dashboard (by category) and
// future "Receipt History" (by receipt).
import type { CategoryKey } from '@/types/categoryLabels'; // canonical category key used across the app
export type Money = number;
export interface CategoryItem {
  id?: string;          // optional,  absent from backend for now
  name: string;
  price: Money;         // unified as number
  quantity?: number;    // optional, default is 1?
}

export interface CategoryGroup { // a "bucket" of items under the same category
  categoryKey: CategoryKey;   // canonical key for icon/color mapping and logic
  category: string;           // human-readable label
  items: CategoryItem[];
  total: Money;               // sum of items' price * quantity under the current category
}



// Future-friendly types for month/receipt-based views
export interface Receipt {
  id: string;
  date: string;       // ISO "2025-07-12"
  store?: string;
  total?: Money;
}

export interface ReceiptItem {
  // id: string;
  receiptId: string;
  name: string;
  category: string;   // e.g. "Fresh Fruits", "Coffee"
  price: Money;
  purchasedAt: string; // ISO date
}

export interface MonthData {
  month: string;      // "2025-07"
  receipts: Receipt[];
  items: ReceiptItem[];
}
