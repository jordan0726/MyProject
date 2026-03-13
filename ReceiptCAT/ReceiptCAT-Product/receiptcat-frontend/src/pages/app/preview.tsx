/**
 * Preview screen for a picked receipt image.
 * Users can review, edit (crop/blackout), reselect, or confirm upload.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import AppLayout from "../../layouts/AppLayout";
import type { EditingToolHandle } from "../../components/PreviewEditingTool";
import Icon from "@mdi/react";
import { mdiArrowLeft, mdiUpload } from "@mdi/js";
import { PreviewImageFrame } from "../../components/PreviewImageFrame";
import ImageEditingButton from "../../components/PreviewEditingButton";
import Toast from "../../components/Toast";
import { usePreviewPageController, MAX_FILE_SIZE_MB } from "../../features/upload/usePreviewPageController";
import styles from "./Preview.module.css";

// Tiny helper to join classes safely
const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export default function PreviewPage() {
  const router = useRouter(); // Next.js router
  const [toastOpen, setToastOpen] = useState(false); // Toast visibility flag

  const {
    previewUrl,
    fileName,
    fileSizeLabel,
    isUploading,
    error,
    isFileTypeValid,
    confirmLabel,
    onConfirm,
    onBack,
    onReselectFile,
    storeCropped,
    resetToOriginal,
    isRouting,
  } = usePreviewPageController();

  const fileInputRef = useRef<HTMLInputElement | null>(null); // Hidden file input
  const editingRef = useRef<EditingToolHandle | null>(null);
  const [isMounted, setIsMounted] = useState(false); // Track mount (portal)
  const [blackoutActive, setBlackoutActive] = useState(false); // Blackout drawing mode
  const [cropActive, setCropActive] = useState(false); // Track crop mode state for disabling actions
  useEffect(() => { setIsMounted(true); }, []); // Enable portal after mount

  // Enable blackout mode via child API and reflect in local state
  const handleEnableBlackout = () => {
    editingRef.current?.enableBlackoutMode?.(); // Guarded call
    setBlackoutActive(true);
  };
  // Disable blackout mode via child API and reflect in local state
  const handleDisableBlackout = () => {
    editingRef.current?.disableBlackoutModeAndApply?.(); // Guarded call
    setBlackoutActive(false);
  };

  // Reset to original and exit all editing modes
  function handleResetAll() {
    // Exit blackout mode without applying any rectangles
    if (blackoutActive) {
      editingRef.current?.cancelBlackoutMode?.(); // Cancel pending blackout overlays
      setBlackoutActive(false);
    }
    // Exit crop mode in parent state
    setCropActive(false);
    // Reset viewport and restore original file
    editingRef.current?.fitToBounds?.(); // Recenter/fit the canvas if available
    resetToOriginal(); // Restore original file from session
  }

  // If preview data missing, return null
  if (!previewUrl || !fileName) return null;

  // Show file type error only when not uploading and not routing away
  if (!isFileTypeValid && !isUploading && !isRouting) {
    return (
      <AppLayout>
        <div className={styles.page} data-testid="preview-page">
          <h1>Preview Receipt</h1>
          <div
            data-testid="preview-error"
            role="alert"
            aria-live="assertive"   // Announce immediately
            className={styles.errorBox}
            style={{ marginBottom: 16 }} // One-off spacing remains inline
          >
            Unsupported file type. Please upload JPG, JPEG, or PNG images (max {MAX_FILE_SIZE_MB} MB).
          </div>
          <button
            type="button"            // Prevent accidental form submit
            onClick={() => onBack()}
            className={cx(styles.btn, styles.btnSecondary)}
          >
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout disableHeaderInteractions={isUploading}>
      {/* Main container */}
      <div className={styles.page} data-testid="preview-page" aria-busy={isUploading}>
        {/* Content wrapper */}
        <div className={styles.wrapper}>
          <PreviewImageFrame
            fileName={fileName}
            fileSizeLabel={fileSizeLabel}
            maxSizeMB={MAX_FILE_SIZE_MB}
            image={previewUrl}
            editingRef={editingRef}
            onApplyEdit={async (editedFile: File) => {
              await storeCropped(editedFile); // Persist edited image (crop/blackout) to session
              setCropActive(false); // Ensure parent state exits crop mode after apply
            }}
            fileInputRef={fileInputRef}
            disabled={isUploading || blackoutActive || cropActive}
            onReselectFile={onReselectFile}
          />

          {/* Error notice under image (if any) */}
          {error && (
            <div
              data-testid="upload-error"
              role="alert"
              aria-live="assertive"   // Announce immediately
              className={styles.errorBox}
            >
              {error}
            </div>
          )}

          {/* Action buttons (50/50) */}
          <div className={styles.btnRow}>
            {/* Back button (secondary) */}
            <button
              type="button"
              onClick={() => onBack()}
              disabled={isUploading}
              aria-disabled={isUploading}
              title={isUploading ? "Uploading… please wait" : undefined}
              className={cx(
                styles.btn,
                styles.btnSecondary,
                isUploading && styles.btnDisabled
              )}
              data-testid="preview-back"
            >
              <span className={styles.btnIcon}>
                {/* Keep minor spacing inline for simplicity */}
                <Icon path={mdiArrowLeft} size="1em" style={{ marginRight: 8, verticalAlign: "text-bottom" }} />
              </span>
              Back to Dashboard
            </button>

            {/* Confirm button (primary) */}
            <button
              type="button"
              onClick={async () => {
                const ok = await onConfirm(); // Upload via controller
                if (ok) setToastOpen(true);   // Show success toast; navigation continues on toast close
              }}
              disabled={isUploading || blackoutActive || cropActive}
              title={confirmLabel}
              aria-label={confirmLabel}
              className={cx(
                styles.btn,
                (isUploading || blackoutActive || cropActive) ? styles.btnPrimaryDisabled : styles.btnPrimary
              )}
              data-testid="preview-confirm"
            >
              {confirmLabel}
              <span className={styles.btnIcon}>
                <Icon path={mdiUpload} size="1em" style={{ marginLeft: 8, verticalAlign: "text-bottom" }} />
              </span>
            </button>
          </div>

          {/* Success toast */}
          <Toast
            open={toastOpen}
            message="Upload Success!"
            position="center"
            zIndex={2147483647}
            duration={2500}
            onClose={() => {
              setToastOpen(false);
              router.push("/app/history");
            }}
            style={{ pointerEvents: toastOpen ? "auto" : "none" }} // Keep this one-off inline
          />

          {/* Floating action rail (desktop & mobile); styled via CSS Module class */}
          {isMounted && createPortal(
            <aside className={styles.floatingActionsRail} aria-label="Image actions">
              <div className={styles.actionsDesktop}>
                <ImageEditingButton
                  onReset={handleResetAll}
                  onEnableCropMode={() => { // Enter crop mode
                    editingRef.current?.enableCropMode(); // Call child API
                    setCropActive(true); // Parent marks crop mode active
                  }}
                  onDisableCropModeAndApply={() => { // Apply crop and exit
                    editingRef.current?.disableCropModeAndApply(); // Call child API
                    setCropActive(false); // Parent marks crop mode inactive
                  }}
                  cropActive={cropActive} // Keep child visuals in sync with parent
                  disabled={isUploading}
                  variant="desktop"
                  size={48}
                  resetTestId="editing-reset-button-desktop"
                  onEnableBlackout={handleEnableBlackout}
                  onDisableBlackout={handleDisableBlackout}
                  blackoutActive={blackoutActive}
                  addBlackoutTestId="editing-blackout-button-desktop"
                />
              </div>
              <div className={styles.actionsMobile}>
                <ImageEditingButton
                  onReset={handleResetAll}
                  onEnableCropMode={() => { // Enter crop mode
                    editingRef.current?.enableCropMode(); // Call child API
                    setCropActive(true); // Parent marks crop mode active
                  }}
                  onDisableCropModeAndApply={() => { // Apply crop and exit
                    editingRef.current?.disableCropModeAndApply(); // Call child API
                    setCropActive(false); // Parent marks crop mode inactive
                  }}
                  cropActive={cropActive} // Keep child visuals in sync with parent
                  disabled={isUploading}
                  variant="mobile"
                  size={48}
                  resetTestId="editing-reset-button"
                  onEnableBlackout={handleEnableBlackout}
                  onDisableBlackout={handleDisableBlackout}
                  blackoutActive={blackoutActive}
                  addBlackoutTestId="editing-blackout-button"
                />
              </div>
            </aside>,
            document.body
          )}
        </div>
      </div>
    </AppLayout>
  );
}