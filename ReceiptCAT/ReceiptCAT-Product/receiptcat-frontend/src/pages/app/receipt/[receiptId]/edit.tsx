// src/pages/app/receipt/[receiptId]/edit.tsx
/**
 * EditReceiptPage
 * ----------------
 * A receipt editing screen that allows users to:
 *  - Edit vendor name
 *  - Edit/delete existing line items
 *  - Add a new line item inline
 *  - Review gross total and the original receipt image
 *  - Save changes with confirmation, or leave with unsaved-change warning
 *
 * State management is centralized in `useReceiptEditor`, which encapsulates:
 *  - Data fetching (by receiptId)
 *  - Form state (vendor, items, newItem)
 *  - Validation and persistence (isFormValid, calculateTotal, saveChanges)
 *
 * Accessibility:
 *  - Buttons have accessible names via `aria-label`/titles
 *  - Confirmation overlays use `role="dialog"` with `aria-modal="true"`
 *
 * Navigation:
 *  - Back to the receipt detail page if no unsaved changes; otherwise show a confirm dialog
 */

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import Icon from "@mdi/react";
import { mdiArrowLeft } from "@mdi/js";
import AppLayout from "@/layouts/AppLayout";
import EditableItemRow from "@/components/EditableItemRow";
import DashboardGrid from "../../../../components/DashboardGrid";
import { useReceiptEditor } from "@/features/receipt-edit/useReceiptEditor";
import type { ReceiptItem } from "@/types/receipt";
import { editableItemRowStyles as itemRowStyles } from "@/components/Styles/EditableItemRow.styles";

export default function EditReceiptPage() {
  const router = useRouter(); // Next.js router for navigation
  const { receiptId } = router.query; // Dynamic route param: receipt ID

  // Auth tokens for secured API calls (OIDC)
  const { user } = useAuth();
  const token = user?.id_token; // ID token used by API auth
  const userId = user?.profile?.sub; // OIDC subject identifier as userId

  // Centralised editor state: fetch, validation, persistence.
  // NOTE: `useReceiptEditor` abstracts async fetch and local form state so this component focuses on rendering and UX.
  const {
    state: { receipt, vendor, items, loading, error, newItem },
    actions: { setVendor, setItems, setNewItem, isFormValid, calculateTotal, saveChanges },
  } = useReceiptEditor({ receiptId, userId, token });

  // Local UI states for subtle button interactions (hover/active)
  const [isHover, setIsHover] = useState(false); // Hover state for the Save button
  const [isActive, setIsActive] = useState(false); // Active (pressed) state for the Save button

  const isItemComplete = (item: ReceiptItem) =>
    item.name.trim() !== "" &&
    typeof item.quantity === "number" &&
    !Number.isNaN(item.quantity) &&
    item.quantity > 0 &&
    typeof item.price === "number" &&
    !Number.isNaN(item.price) &&
    item.price > 0 &&
    Boolean(item.category?.trim());

  const itemsForValidation = useMemo(
    () => (newItem ? [...items, newItem] : items),
    [items, newItem]
  );

  const canSave = isFormValid(itemsForValidation, vendor);

  // -------------------------- Unsaved-change guard --------------------------
  // Show confirm dialog when navigating away or saving
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false); // Leave-without-save confirmation flag
  const [showSaveConfirm, setShowSaveConfirm] = useState(false); // Save confirmation flag

  // Snapshot of initial server state to detect dirty form
  const [initialSnapshot, setInitialSnapshot] = useState<{
    vendor: string;
    items: ReceiptItem[];
  } | null>(null);

  // Capture the server state once data is available so we can compare later.
  useEffect(() => {
    if (loading) return; // Avoid snapshotting during loading to prevent flicker

    if (!receipt) {
      // If no receipt is found, snapshot an empty baseline to avoid null comparisons
      setInitialSnapshot((current) => {
        if (current && current.vendor === "" && current.items.length === 0) return current; // Reuse if identical
        return { vendor: "", items: [] };
      });
      return;
    }

    // Clone to avoid reference mutations; compare via JSON below
    const nextSnapshot = {
      vendor: receipt.vendor ?? "",
      items: (receipt.items ?? []).map((entry) => ({ ...entry })), // Shallow clone props for stable comparison
    };

    // Only update snapshot if it actually changed from previous
    setInitialSnapshot((current) => {
      if (!current) return nextSnapshot;
      const sameVendor = current.vendor === nextSnapshot.vendor;
      const sameItems = JSON.stringify(current.items) === JSON.stringify(nextSnapshot.items);
      return sameVendor && sameItems ? current : nextSnapshot;
    });
  }, [loading, receipt]);

  // Determine whether anything on screen differs from the initial snapshot.
  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshot) return false; // No baseline yet → treat as clean
    const vendorDirty = vendor !== initialSnapshot.vendor; // Vendor changed
    const itemsDirty = JSON.stringify(items) !== JSON.stringify(initialSnapshot.items); // Line items changed
    const pendingNewItem = Boolean(newItem); // Inline editor has a pending item
    return vendorDirty || itemsDirty || pendingNewItem;
  }, [initialSnapshot, items, newItem, vendor]);

  // ------------------------------ Navigation -------------------------------
  // Helper to go back to the detail page for the same receipt
  const navigateBackToDetail = () => {
    setShowLeaveConfirm(false); // Close dialog before navigating
    router.push(`/app/receipt/${receiptId}`); // Navigate to detail page
  };

  // Back button handler that respects unsaved changes
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirm(true); // Ask user to confirm leaving
      return;
    }
    navigateBackToDetail(); // No changes → navigate immediately
  };

  // ------------------------------ Persistence ------------------------------
  // Execute save and redirect back to detail with a saved flag for downstream UI (e.g., toast)
  const executeSave = async () => {
    try {
      const success = await saveChanges(); // Persist changes via editor hook
      if (success && receiptId) {
        router.push({
          pathname: `/app/receipt/${receiptId}`,
          query: { saved: "1" }, // Signal success to detail page
        });
      }
    } catch (err: unknown) {
      // Fallback message if error is not an Error instance
      const message =
        err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "Save failed.";
      alert(message); // Simple UX for error surfacing
    }
  };

  // Loading and error placeholders
  if (loading) return <AppLayout><p>Loading...</p></AppLayout>; // Show skeleton/placeholder while fetching
  if (error) return <AppLayout><p>Error: {error}</p></AppLayout>; // Render error from editor state

  // ----------------------------- Item handlers -----------------------------
  // Update an existing item in-place by index
  const handleExistingItemChange = (index: number, updatedItem: ReceiptItem) => {
    const updated = [...items]; // Copy to maintain immutability
    updated[index] = updatedItem; // Replace at index
    setItems(updated); // Commit to editor state
  };

  // Remove an item by index
  const handleExistingItemDelete = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index); // Filter out by index
    setItems(updated); // Commit to editor state
  };

  // Create an inline "new item" editor
  const handleCreateNewItem = () => {
    setNewItem({
      name: "", // Start with empty name
      quantity: 1, // Default quantity is 1
      price: 0, // Default price is 0
      category: "", // Category empty until selected
      receiptId: (receiptId as string) || "", // Ensure receipt linkage for persistence
    });
  };

  // --------------------------------- Render --------------------------------
  return (
    <AppLayout>
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        {/* Back to detail page */}
        <button
          onClick={handleBackClick}
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
          aria-label="Back to receipt detail" // Accessible name for assistive tech
          title="Back"
        >
          <Icon path={mdiArrowLeft} size="1em" style={{ marginRight: 8 }} />
          Back to Receipt Detail Page
        </button>

        {/* Header row: page title + Save CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 8,
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <h2 style={{ margin: 0 }}>Edit Mode</h2>

          {/* Save action always routes through a confirmation modal before persisting changes */}
          <button
            onClick={() => setShowSaveConfirm(true)} // Open save confirm dialog
            onMouseEnter={() => setIsHover(true)} // Hover effect on label underline
            onMouseLeave={() => {
              setIsHover(false);
              setIsActive(false);
            }}
            onMouseDown={() => setIsActive(true)} // Active state on press
            onMouseUp={() => setIsActive(false)} // Reset active on release
            disabled={!canSave} // Disable if form is invalid
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "transparent",
              border: "none",
              padding: 0,
              color: isActive ? "#CC5200" : canSave ? "#FF6600" : "#aaa", // Active/valid/disabled colors
              borderBottom: isHover ? "1px solid currentColor" : "1px solid transparent", // Subtle underline on hover
              cursor: canSave ? "pointer" : "not-allowed", // Cursor feedback
              marginRight: 4,
              fontSize: "1.1em", // Slightly larger label for prominence
              transition: "border-color 120ms ease", // Subtle hover animation
            }}
            aria-label="Save" // Accessible name
            title="Save"
            data-testid="receipt-edit-save"
          >
            Save
          </button>
        </div>

        {/* Vendor field */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "8px",
            border: "1px solid #E6E9EF",
            background: "#FFF",
            boxShadow: "0 0 16px 0 rgba(0, 0, 0, 0.08)",
            padding: "12px 16px",
            marginBottom: 16,
          }}
        >
          <label
            htmlFor="vendor"
            style={{
              fontWeight: 400,
              fontSize: "1rem",
              color: "#434343",
              marginRight: 16,
              whiteSpace: "nowrap",
            }}
          >
            Vendor
          </label>
          <input
            id="vendor"
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)} // Update vendor in editor state
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "1rem",
              fontWeight: 500,
              textAlign: "right", // Right-align to mirror mobile patterns
              color: "#1E0803",
            }}
            data-testid="receipt-edit-vendor"
            placeholder="Enter vendor name" // Helps users understand empty field purpose
            aria-invalid={vendor.trim() === ""} // Signal invalid state for screen readers
          />
        </div>

        {/* Items grid */}
        <h3>Items</h3>
        <DashboardGrid>
          {/* Existing items remain editable inline */}
          {items.map((item, index) => (
            <EditableItemRow
              key={index} // Index is acceptable here due to stable list within edit context
              item={item}
              onChange={(updatedItem) => handleExistingItemChange(index, updatedItem)} // Update by index
              onDelete={() => handleExistingItemDelete(index)} // Delete by index
            />
          ))}

          {/* Inline new-item editor (shown when user taps "+ Add New Item") */}
          {newItem ? (
            <EditableItemRow
              key="new"
              item={newItem}
              onChange={(updatedItem) => {
                setNewItem(updatedItem); // Live-update "new item" draft
              }}
              onDelete={() => {}} // No-op for new item (cannot delete via row)
              isNew
              onDone={(mode) => {
                if (mode === "cancel") {
                  setNewItem(null); // Discard draft and close editor
                  return;
                }
                /* c8 ignore next -- guard against double-submit race */
                if (!newItem) return; // Defensive check for async edge cases

                if (isItemComplete(newItem)) {
                  const completedItem = { ...newItem }; // Freeze current draft snapshot
                  setItems((current) => [...current, completedItem]); // Commit appended list
                  setNewItem(null); // Close inline editor
                } else {
                  alert("Please fill all fields for the new item before done."); // Simple validation message
                }
              }}
            />
          ) : (
            <div
              onClick={handleCreateNewItem} // Open inline new-item editor
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#fff",
                borderRadius: "8px",
                border: "1px solid #E6E9EF",
                marginBottom: 12,
                cursor: "pointer",
              }}
              data-testid="receipt-edit-add-item"
              role="button" // Hint semantics for assistive tech
              aria-label="Add new item" // Accessible name
              tabIndex={0} // Make div focusable for keyboard users
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleCreateNewItem(); // Keyboard activation
              }}
            >
              <div style={{ fontWeight: 500, color: "#999" }}>+ Add New Item</div>
            </div>
          )}
        </DashboardGrid>

        {/* Gross total summary */}
        <div style={{ fontWeight: "bold", marginBottom: 12 }}>
          Gross Total: ${calculateTotal().toFixed(2)} {/* Calculate from editor state */}
        </div>

        {/* Receipt image preview */}
        <div>
          <h2>Receipt Image</h2>
          {receipt?.image_url ? (
            <img
              src={receipt.image_url}
              alt="Receipt"
              style={{
                maxWidth: "100%",
                height: "auto",
                border: "1px solid #ccc",
                borderRadius: 6,
              }}
            />
          ) : (
            <p>No image available for this receipt.</p>
          )}
        </div>
      </div>

      {/* ------------------------- Confirmation dialogs ------------------------- */}
      {showLeaveConfirm && (
        // Unsaved-change confirmation overlay (shares styles with item delete modal).
        <div
          style={itemRowStyles.confirmOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-dialog-title" // Associate title for screen readers
          data-testid="receipt-edit-leave-confirm"
        >
          <div style={itemRowStyles.confirmBox}>
            <p id="leave-dialog-title" style={{ marginBottom: 16 }}>
              You have unsaved changes. Leave edit mode without saving?
            </p>
            <div style={itemRowStyles.confirmButtons}>
              <button
                style={itemRowStyles.confirmCancelBtn}
                onClick={() => setShowLeaveConfirm(false)} // Stay in edit mode
              >
                Stay
              </button>
              <button
                style={itemRowStyles.confirmConfirmBtn}
                onClick={navigateBackToDetail} // Discard and navigate back
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirm && (
        // Save confirmation overlay: protects against accidental commits.
        <div
          style={itemRowStyles.confirmOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-dialog-title" // Associate title for screen readers
          data-testid="receipt-edit-save-confirm"
        >
          <div style={itemRowStyles.confirmBox}>
            <p id="save-dialog-title" style={{ marginBottom: 16 }}>
              Save changes to this receipt?
            </p>
            <div style={itemRowStyles.confirmButtons}>
              <button
                style={itemRowStyles.confirmCancelBtn}
                onClick={() => setShowSaveConfirm(false)} // Cancel and close dialog
              >
                Cancel
              </button>
              <button
                style={itemRowStyles.confirmConfirmBtn}
                onClick={() => {
                  setShowSaveConfirm(false); // Close dialog first to avoid double-submit
                  void executeSave(); // Persist and navigate back
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
