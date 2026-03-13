// src/lib/receiptUtils.ts
export type Money = number;

export interface Receipt {
  receiptId: string;
  date: string;
  vendor: string;
  total: Money;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  receiptId: string;
  name: string;
  category?: string;
  price: Money;
  quantity?: number;
  purchasedAt?: string;
}

export interface CategoryItem {
  name: string;
  price: Money;
  quantity?: number;
}

export interface CategoryGroup {
  category: string;
  items: CategoryItem[];
  total: Money;
}

// Helper function to safely parse amounts based on potential malformed values stored in DynamoDB
export function sanitiseAmount(raw: any): number {
  if (!raw) return 0.0;
  let str = String(raw).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0.0 : parseFloat(num.toFixed(2));
}

export function buildCategoryGroups(receipts: Receipt[]): CategoryGroup[] {
  const groups: Record<string, CategoryGroup> = {};
  for (const r of receipts) {
    for (const i of r.items) {
      const category = i.category ?? "Other";
      const price = i.price;
      const quantity = i.quantity ? Number(i.quantity) : 1;
      if (!groups[category]) groups[category] = { category, items: [], total: 0 };
      groups[category].items.push({ name: i.name, price, quantity });
      groups[category].total += price * quantity;
    }
  }
  return Object.values(groups);
}
