/**
 * PreviewImageFrame
 * -----------------
 * A focused UI section for the receipt preview page that groups:
 *   1) The header (file name/size and allowed types),
 *   2) The image editing canvas (crop/blackout), and
 *   3) The hidden file input plus the visible "Reselect Photo" button.
 *
 * Accessibility
 * - The image container is a plain region with a stable `data-testid` for tests.
 * - The reselect button uses `aria-disabled` and a descriptive `aria-label`.
 *
 * Testing
 * - `data-testid` attributes are provided for filename, file size, max size,
 *   image container, and the reselect button to enable deterministic tests.
 *
 * Notes
 * - This component is intentionally stateless; it delegates all stateful work
 *   to the parent page via props (e.g., edit apply, file reselection).
 */
import React from "react";
import Icon from "@mdi/react";
import { mdiRefresh } from "@mdi/js";
import { ImageEditingCanvas } from "./PreviewEditingTool"; // Import canvas and its ref contract from local toolset
import type { EditingToolHandle } from "./PreviewEditingTool";

/**
 * Props contract for PreviewImageFrame
 * - The `editingRef` is a ref to the editing tool handle; it starts as `null` until mounted.
 * - The `fileInputRef` is a ref to the hidden `<input type="file">` used to trigger reselection.
 * - All actions flow upward via callbacks so this component stays presentational.
 */
export type PreviewImageFrameProps = {
  fileName: string;                                // Filename shown in header
  fileSizeLabel: string;                           // Preformatted file size label
  maxSizeMB: number;                               // Maximum allowed size in MB
  image: string;                                   // Image URL for display
  editingRef: React.RefObject<EditingToolHandle | null>; // Child editing API (ref starts as null)
  onApplyEdit: (f: File) => Promise<void>;         // Persist edited image
  fileInputRef: React.RefObject<HTMLInputElement | null>; // Hidden file input (ref starts as null)
  disabled: boolean;                               // Disable reselect while busy or editing modes are active
  onReselectFile: (e: React.ChangeEvent<HTMLInputElement>) => void; // File input change handler
  onEditError?: (err: unknown) => void; // Optional: report edit errors to parent (tests can assert without alert)
  testIds?: { container?: string; fileName?: string; fileSize?: string; maxSize?: string; reselect?: string; input?: string; }; // Optional: override default test ids for isolated tests
};

// Combines header, image frame (with editing canvas), and reselect button
// into a single, focused component used by the Preview page.
export function PreviewImageFrame({
  fileName,
  fileSizeLabel,
  maxSizeMB,
  image,
  editingRef,
  onApplyEdit,
  fileInputRef,
  disabled,
  onReselectFile,
  onEditError,
  testIds,
}: PreviewImageFrameProps) {
  const ids = {
    container: testIds?.container ?? "preview-image-container",
    fileName: testIds?.fileName ?? "preview-filename",
    fileSize: testIds?.fileSize ?? "preview-file-size",
    maxSize: testIds?.maxSize ?? "preview-max-size",
    reselect: testIds?.reselect ?? "reselect-button",
    input: testIds?.input ?? "reselect-input",
  } as const;

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 16 }}> {/* Header: file meta and guidance */}
        <h1 style={{ margin: 0 }}>Preview Receipt</h1> {/* Page title */}
        <p style={{ marginTop: 8, fontSize: 14, color: "#555" }}> {/* Filename */}
          File Name: <span data-testid={ids.fileName}>{fileName}</span>
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: "#555" }}> {/* File size */}
          File Size: <span data-testid={ids.fileSize}>{fileSizeLabel}</span>
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: "#777" }}>
          Allowed: JPG, JPEG, PNG · Max size: <span data-testid={ids.maxSize}>{maxSizeMB}&nbsp;MB</span>
        </p>
      </div>

      <div
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
          border: "1px solid #d9d9d9",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          overflow: "hidden", // Contain the canvas within the frame
        }}
        data-testid={ids.container}
        role="region"
        aria-label="Receipt preview"
      >
        <ImageEditingCanvas
          ref={editingRef}
          image={image}
          fileName={fileName}
          onEditOutput={async (editedFile: File) => {
            try {
              await onApplyEdit(editedFile); // Persist edited image upstream
            } catch (err) {
              if (onEditError) {
                onEditError(err); // Delegate to parent/test
              } else {
                console.error("Edit output handling failed:", err); // Log for diagnostics
                alert("Processing failed, please try again."); // Fallback lightweight feedback
              }
            }
          }}
        />
      </div>

      <input
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg" // Only JPEG/PNG are allowed
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={onReselectFile}
        data-testid={ids.input}
      />

      <button
        type="button"
        disabled={disabled}
        title={disabled ? "Uploading… please wait" : "Reselect a different photo"}
        aria-label={disabled ? "Uploading… please wait" : "Reselect a different photo"}
        aria-disabled={disabled}
        style={{
          width: "100%",
          padding: "8px 16px",
          background: "white",
          color: "black",
          border: "1px solid #d9d9d9",
          borderRadius: "0 0 6px 6px",
          cursor: disabled ? "not-allowed" : "pointer", // Disabled look for the reselect button
          opacity: disabled ? 0.5 : 1,
          filter: disabled ? "grayscale(40%)" : "none",
          pointerEvents: disabled ? "none" : "auto",
          userSelect: "none",
        }}
        onClick={() => fileInputRef.current?.click()} // Open native file picker
        data-testid={ids.reselect}
      >
        <Icon path={mdiRefresh} size="1em" style={{ marginRight: 8, verticalAlign: "text-bottom" }} />
        Reselect Photo
      </button>
    </>
  );
}

export default PreviewImageFrame;