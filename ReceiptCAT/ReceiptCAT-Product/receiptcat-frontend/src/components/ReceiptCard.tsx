// src/components/ReceiptCard.tsx

// This component renders a summary card for a single receipt
// It shows vendor name, total cost, number of items, and purchase date
// Clicking the card navigates to the receipt detail page

import { useRouter } from "next/router";
import Icon from '@mdi/react';
import { mdiChevronRight } from "@mdi/js";
import type { Receipt } from "@/types/receipt";

export default function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const router = useRouter();
  const itemCount = receipt.itemsCount ?? receipt.items?.length ?? 0; // prefer itemsCount (new API), fallback to items length (legacy)
  // Handle navigation to receipt detail page on click
  const handleClick = () => {
    router.push(`/app/receipt/${receipt.receiptId}`);
  };

  return (
    <div
        style={{
        background: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 0 16px 0 rgba(0, 0, 0, 0.08)',
        border: '1px solid #e6e9ef',
      }}
    >
      {/* Clickable header: vendor name + total */}
        <button
        onClick={handleClick}
                style={{
                    width: '100%',
                    background: '#FBE1d7',
                    display: 'flex',
                    padding: '8px 16px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    alignSelf: 'stretch',
                    fontSize: 16,
                    border: 0,
                    textAlign: 'left',
                    gap:8,
        }}>
            {/* Left: Vendor name */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>{receipt.vendor}</strong >
            </div>
            {/* Right: Total price + icon */}
            <div>
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8  }}>${receipt.total.toFixed(2)}
              <Icon path={mdiChevronRight} size={1} color="#444" />
              </span>
            </div>
        </button>
    
        {/* Footer: items count + purchase date */}
        <div         
            style={{
                background: '#fff',
                lineHeight: 'normal', // per-line spacing now controlled by inner spans to make multi-line items tighter
                fontSize: 12,
                overflow: 'hidden',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#676879',
            }}
        >
              <span>{itemCount} items</span>
              <span>Purchase Date: {receipt.date}</span>
        </div>

    </div>

  );
}