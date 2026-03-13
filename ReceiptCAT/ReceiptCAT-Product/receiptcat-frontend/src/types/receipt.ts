// src/types/receipt.ts
export type Money = number;

export interface Receipt {
  receiptId: string;
  vendor: string;
  date: string; 
  total: Money;
  itemsCount?: number;
  image_url?: string;
  items?: ReceiptItem[];
}

export interface ReceiptItem {
  receiptId: string;
  name: string;
  price: Money;
  category?: string;
  quantity?: number;
  purchasedAt?: string;

}

export interface ReceiptSummary {
  totalCost: number;
  totalItems: number;
  totalReceipts: number;
}