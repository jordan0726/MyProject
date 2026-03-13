//src/features/useReceiptHistory.ts

import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import type { ReceiptSummary, Receipt } from "@/types/receipt";
import { fetchReceipts, type ReceiptsListResponse } from "@/lib/receiptApi";
import { normalizeDate } from "@/lib/formatDate"; //

/**
 * Custom hook to fetch, organize, and return receipt history data
 * for the currently logged-in user.
 */

export function useReceiptHistory() {
  // Get user info and auth token from OIDC context
  const { user } = useAuth();
  const userId = user?.profile?.sub;
  const token = user?.id_token;

  // Local state to store normalized receipts and summary info
  const [receipts, setReceipts] = useState<
    Array<Pick<Receipt, "receiptId" | "date" | "vendor" | "total"> & { itemsCount: number }>
  >([]);
  const [summary, setSummary] = useState<ReceiptSummary>({
    totalCost: 0,
    totalItems: 0,
    totalReceipts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let alive = true; // Prevent state updates if component unmounted

    (async () => {
      try {
        setLoading(true);

        // Fetch receipts and destructure response
        const { receiptsCount, receipts } = await fetchReceipts(userId, token) as ReceiptsListResponse;
        if (!alive) return;

        // Normalize date for each receipt
        const normalizedReceipts = receipts.map((r) => ({
          ...r,
          date: normalizeDate(r.date),
        }));

        // Update state
        setReceipts(normalizedReceipts.reverse());
        setSummary({
          totalCost: Number(
            normalizedReceipts.reduce((sum, r) => sum + (r.total ?? 0), 0).toFixed(2)
          ),
          totalItems: normalizedReceipts.reduce(
            (sum, r) => sum + (r.itemsCount ?? 0),
            0
          ),
          totalReceipts: receiptsCount,
        });
        setError(null);
      } catch (err: any) {
        if (alive) setError(err.message ?? "Failed to load receipt history.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [userId, token]);

  return { loading, error, receipts, summary };
}
