// src/pages/app/receipt/[receiptId].tsx
/**
 * Receipt Detail Page
 *
 * This page displays detailed information about a specific receipt selected from the history page.
 * It shows the vendor, date, total amount, and all items included in that receipt using the <ReceiptDetailCard> component.
 * Additionally, it displays the receipt image if available.
 *
 * Features:
 * - Fetches receipt data by receipt ID and authenticated user.
 * - Provides navigation back to the history page.
 * - Allows editing of the receipt via an edit button.
 * - Shows a toast notification when changes are saved.
 *
 * Accessibility:
 * - Buttons include aria-labels for clarity.
 * - Receipt image includes descriptive alt text.
 */

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { Receipt } from "@/types/receipt";
import { fetchReceiptById } from "../../../lib/receiptApi";
import AppLayout from "../../../layouts/AppLayout";
import { useAuth } from "react-oidc-context";
import Icon from "@mdi/react";
import { mdiArrowLeft, mdiPencil } from "@mdi/js";
import ReceiptDetailCard from "../../../components/ReceiptDetailCard";
import DashboardGrid from '../../../components/DashboardGrid';
import Toast from "@/components/Toast";

export default function ReceiptDetailPage() {
  const router = useRouter();
  const { receiptId, saved } = router.query;

  // ---------------- Navigation ----------------
  // Navigate to edit page for this receipt (guard when id not ready)
  const goToEdit = () => {
    if (receiptId) {
      router.push(`/app/receipt/${receiptId}/edit`);
    }
  };

  // Auth context to get user ID and token for API calls
  const { user } = useAuth();
  const token = user?.id_token;
  const userId = user?.profile?.sub;

  // ---------------- State Variables ----------------
  // Holds the fetched receipt data
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // Indicates if data is currently loading
  const [loading, setLoading] = useState(false);
  // Holds error message if fetching fails
  const [error, setError] = useState<string | null>(null);

  // UI state for edit button hover effect
  const [isHover, setIsHover] = useState(false);
  // UI state for edit button active (pressed) effect
  const [isActive, setIsActive] = useState(false);
  // Controls visibility of the "Changes saved" toast notification
  const [showSavedToast, setShowSavedToast] = useState(false);

  // ---------------- Data Fetch ----------------
  // Fetch receipt and related items when receiptId and userId are available
  useEffect(() => {
    if (!receiptId || typeof receiptId !== "string" || !userId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // use the new function to fetch a single receipt
        const receiptDetail = await fetchReceiptById(userId, receiptId, token);

        // If component is still mounted, update state
        if (alive) {
          setReceipt(receiptDetail ?? null);
          setError(null);
        }
      } catch (err: any) {
        if (alive) setError(err.message ?? "Failed to load receipt detail.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [receiptId, userId, token]);

  // Show saved toast notification if redirected after saving changes
  useEffect(() => {
    if (!router.isReady) return;
    if (saved === '1') {
      setShowSavedToast(true);
      // Replace the URL to remove the 'saved' query parameter without reloading the page
      if (typeof receiptId === 'string') {
        router.replace(`/app/receipt/${receiptId}`, undefined, { shallow: true });
      }
    }
  }, [router, saved, receiptId]);

  // ---------------- Render ----------------
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!receipt) return <p>Receipt not found.</p>;

  return (
    
    <AppLayout>
        <div style={{ padding: 24 }}>
          <button
          onClick={() => router.push("/app/history")}
            style={{
              marginBottom: 24,
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 16px",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: 6,
              cursor: "pointer",
            }}
            aria-label="Back to History Page"
            title="Back to History Page"
          >
            <Icon path={mdiArrowLeft} size="1em" style={{ marginRight: 8 }} />
            Back to History Page
          </button>
          <DashboardGrid>
            {/* Receipt detail */}
            <div>            
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  maxWidth: "100%",
                  boxSizing: "border-box"
                }}
              >
                <h2 style={{ margin: 0 }}>Receipt Detail</h2>
                <button
                  onClick={goToEdit}
                  onMouseEnter={() => setIsHover(true)}
                  onMouseLeave={() => { setIsHover(false); setIsActive(false); }}
                  onMouseDown={() => setIsActive(true)}
                  onMouseUp={() => setIsActive(false)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: isActive ? "#CC5200" : "#FF6600",
                    cursor: "pointer",
                    marginRight: 4,
                  }}
                  aria-label="Edit receipt"
                  title="Edit receipt"
                >
                  <span
                    style={{
                      display: "inline-flex", // keep icon/text in a single row
                      alignItems: "center", // vertical centering
                      // Use border-bottom so the underline spans icon + text
                      borderBottom: isHover ? "1px solid currentColor" : "1px solid transparent",
                      fontSize: "1.1em", // make the label slightly larger
                      transition: "border-color 120ms ease" // subtle hover animation
                    }}
                  >
                    <Icon path={mdiPencil} size="1em" style={{ marginRight: 4, color: isActive ? "#CC5200" : "#FF6600" }} />
                    Edit
                  </span>
                </button>
              </div>
              <ReceiptDetailCard receipt={receipt} items={receipt.items ?? []} />
            </div>
            {/* Receipt image */}
            <div>
              <h2>Receipt Image</h2>
                {receipt.image_url ? (
                  <img
                    src={receipt.image_url}
                    alt="Image of the receipt"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      border: '1px solid #ccc',
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  <p>No image available for this receipt.</p>
                )}
            </div>
          </DashboardGrid>
        </div>
        <Toast
          open={showSavedToast}
          message="Changes saved"
          onClose={() => setShowSavedToast(false)}
          data-testid="receipt-saved-toast"
          position="center"
          duration={1500}
        />
    </AppLayout>

  );
}
