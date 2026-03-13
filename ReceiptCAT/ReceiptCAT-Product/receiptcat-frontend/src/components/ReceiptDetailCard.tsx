// src/components/ReceiptDetailCard.tsx
// This component displays detailed information for a single receipt,
// including vendor, total cost, and a list of all purchased items (with icon, name, quantity, and price).

import { CATEGORY_ICONS } from "../config/categoryIcons";
import { normalizeCategoryKey } from "@/types/categoryLabels";
import type { Receipt, ReceiptItem } from "@/types/receipt";

export default function ReceiptDetailCard({ receipt, items }: { receipt: Receipt; items: ReceiptItem[] }) {
  // Fallback: use subtotal sum if backend total is missing, zero, or mismatched with item subtotals
  const subtotalSum = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const computedTotal =
    !receipt.total || Math.abs(receipt.total - subtotalSum) > 0.01
      ? subtotalSum
      : receipt.total;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 0 16px 0 rgba(0, 0, 0, 0.08)",
        border: "1px solid #e6e9ef",
      }}
    >
      {/* Header: Vendor and Total */}
      <div
        style={{
          background: "#FBE1d7",
          display: "flex",
          padding: "8px 16px",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 16,
        }}
      >
        <strong>{receipt.vendor}</strong>
        <span>${computedTotal.toFixed(2)}</span>
      </div>

      {/* Item List */}
      <div style={{ padding: "12px 16px" }}>
        <div
          data-testid="receipt-detail-header"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 40px 80px",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
            color: "#676879",
            fontWeight: 600,
            textTransform: "uppercase",
            paddingBottom: 8,
          }}
        >
          <span>Item</span>
          <span style={{ textAlign: "center" }}>Qty</span>
          <span style={{ textAlign: "right" }}>Subtotal</span>
        </div>
        {items.map((item, index) => {
          const normalizedKey = normalizeCategoryKey(item.category);
          return (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 40px 80px",
                gap: 8,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: index !== items.length - 1 ? "1px solid #eee" : "none",
              }}
            >
              {/* Icon + Name (left side) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  {/* Category Icon */}
                  <span>{normalizedKey ? CATEGORY_ICONS[normalizedKey] : ""}</span>
                  {/* Name */}
                  <span style={{ overflowWrap: "anywhere", wordBreak: "break-word"}}>
                    {item.name}
                  </span>
              </div>

              {/* Quantity (middle) */}
              <span style={{ textAlign: "center" }}>{item.quantity ?? 1}</span>

              {/* Item total (right side) */}
              <span style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                ${(item.price ?? 0).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer: Item count and date */}
      <div
        style={{
          background: "#fff",
          fontSize: 12,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          color: "#676879",
        }}
      >
        <span>{items.length} items</span>
        <span>Purchase Date: {receipt.date}</span>
      </div>
    </div>
  );
}
