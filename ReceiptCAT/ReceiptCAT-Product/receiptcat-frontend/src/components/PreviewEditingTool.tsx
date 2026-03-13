// ============================================================
// ============ ReceiptCAT — Preview Editing Canvas ===========
// This renderer is UI-only. All logic/state live in
// src/features/upload/usePreviewEditingCore.ts
// ============================================================

import React, { useImperativeHandle } from "react";
import type { ReactCropperElement } from "react-cropper";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

// Pull editing core (logic + state + handlers)
import {
  usePreviewEditingCore,
  type UsePreviewEditingCoreParams,
} from "../features/upload/usePreviewEditingCore";
import {
  blackoutRectStyle,
  cropperGlobalStyles,
  cropperStyle,
  cursorHintStyle,
  draftRectStyle,
  overlayStyle,
  rootBaseStyle,
} from "./Styles/PreviewEditingTool.styles";

// ----------------------
// Public Props (UI layer)
// ----------------------
export type EditingToolProps = React.HTMLAttributes<HTMLDivElement> & {
  image: string;                     // Source URL (object URL or data URL)
  fileName: string;                  // Output file name (used by core)
  aspectRatio?: number | "free";     // Fixed ratio or "free"
  restoreState?: { data?: any; cropBox?: any }; // Optional: restore crop on ready

  // Callbacks (forwarded into core)
  onEditOutput?: UsePreviewEditingCoreParams["onEditOutput"];           // Edited output (preferred)
  onCropStateChange?: UsePreviewEditingCoreParams["onCropStateChange"]; // Lift crop state
  onError?: UsePreviewEditingCoreParams["onError"];                     // Non-fatal error sink
};

// ---------------------------
// Imperative API (via ref)
// ---------------------------
export type EditingToolHandle = {
  fitToBounds: () => void;                 // Fit image to container and clear any selection
  enableCropMode: () => void;              // Enter crop mode
  disableCropModeAndApply: () => void;     // Exit crop mode and apply if valid
  enableBlackoutMode: () => void;          // Enter blackout mode
  cancelBlackoutMode: () => void;          // Cancel blackout rectangles
  disableBlackoutModeAndApply: () => void; // Bake blackouts and exit mode
};

// -------------------------
// Component (UI-only shell)
// -------------------------
const ImageEditingCanvas = React.forwardRef<EditingToolHandle, EditingToolProps>(function ImageEditingCanvas(
  { image, fileName, aspectRatio = "free", restoreState, onEditOutput, onCropStateChange, onError, ...rest },
  ref
) {
  // Hook up editing core (provides refs, state, and handlers)
  const core = usePreviewEditingCore({
    fileName,
    onEditOutput,
    onCropStateChange,
    onError,
  });

  // Expose imperative API by delegating to the core
  useImperativeHandle(
    ref,
    () => ({
      fitToBounds: core.fitToBounds,                          // Delegate to core
      enableCropMode: core.enableCropMode,                    // Delegate to core
      disableCropModeAndApply: core.disableCropModeAndApply,  // Delegate to core
      enableBlackoutMode: core.enableBlackoutMode,            // Delegate to core
      cancelBlackoutMode: core.cancelBlackoutMode,            // Delegate to core
      disableBlackoutModeAndApply: core.disableBlackoutModeAndApply, // Delegate to core
    }),
    [core]
  );

  // Merge incoming style with required positioning
  const { style: incomingStyle, ...restDiv } = rest;
  const rootStyle: React.CSSProperties = {
    ...(incomingStyle as React.CSSProperties),
    position: "relative", // Needed for overlay positioning
  };

  return (
    <div
      data-testid="editing-tool-root"
      {...restDiv}
      style={{
        ...rootStyle,
        ...rootBaseStyle,
      }}
      lang="zxx"
      translate="no"
    >
      {/* Cropper: purely presentation + wiring to core refs/state */}
      <Cropper
        src={image}
        ref={core.cropperRef as React.RefObject<ReactCropperElement>}
        data-testid="editing-canvas"
        style={cropperStyle} // Fill container width; preserve aspect ratio

        // --- Cropping visuals/behavior (UI-config) ---
        viewMode={1}                   // Keep image fully within the canvas
        zoomable={false}               // Disable zoom to reduce UX complexity
        scalable={false}               // Disable scale controls
        zoomOnWheel={false}            // No wheel zoom
        zoomOnTouch={false}            // No pinch zoom
        toggleDragModeOnDblclick={false} // Do not toggle on double click
        dragMode={core.isCropMode ? "crop" : "none"} // Crop mode only when enabled
        autoCrop={false}               // Do not auto-create selection on load
        guides={true}                  // Show grid lines
        background={false}             // Clean transparent background
        responsive={true}              // Reflow with container
        checkOrientation={false}       // Ignore EXIF auto-rotation

        // Crop box affordances (keep UI feel consistent)
        movable={false}                // Lock image movement
        cropBoxMovable={true}          // Allow crop box drag
        cropBoxResizable={true}        // Allow resizing
        aspectRatio={aspectRatio === "free" ? NaN : aspectRatio} // Respect ratio

        // Lift crop state continuously if provided
        crop={() => {
          if (!onCropStateChange) return; // No-op if not needed
          const c = core.cropperRef.current?.cropper; // Safe access
          if (c) {
            onCropStateChange({
              data: c.getData(true),
              cropBox: c.getCropBoxData(),
            });
          }
        }}

        // Optionally restore saved crop on ready (UI concern)
        ready={() => {
          const cropper = core.cropperRef.current?.cropper;
          if (!cropper) return; // Guard for missing instance
          if (restoreState?.data || restoreState?.cropBox) { 
            try { if (restoreState.data) cropper.setData(restoreState.data); } catch { /* no-op */ } // Restore image-space data
            try { if (restoreState.cropBox) cropper.setCropBoxData(restoreState.cropBox); } catch { /* no-op */ } // Restore canvas-space box
          }
        }}
      />

      {/* Cursor hint for crop mode */}
      <div
        data-testid="editing-cursor-hint"
        aria-hidden
        style={cursorHintStyle(core.isCropMode)}
      />

      {/* Blackout overlay (delegates all logic to core handlers) */}
      <div
        ref={core.overlayRef}
        data-testid="blackout-overlay"
        role="presentation"
        aria-hidden={!core.isBlackoutMode}
        onPointerDown={core.handlePointerDown}
        onPointerMove={core.handlePointerMove}
        onPointerUp={core.handlePointerUp}
        onPointerCancel={(e) => core.finalizeDraft(e.currentTarget as HTMLElement, e.pointerId)} // Unify cancel with release
        onPointerLeave={(e) => core.finalizeDraft(e.currentTarget as HTMLElement, e.pointerId)}  // Commit/clear when leaving
        style={overlayStyle(core.isBlackoutMode)}
      >
        {/* Committed blackout rectangles (visual only) */}
        {core.blackouts.map((r, i) => (
          <div
            key={i}
            style={blackoutRectStyle(r)}
          />
        ))}

        {/* Draft rectangle while dragging (visual only) */}
        {core.draftRect && (
          <div
            style={draftRectStyle(core.draftRect)}
          />
        )}
      </div>

      {/* ----------------
          Global Styles
          ---------------- */}
      <style jsx global>{cropperGlobalStyles}</style>
    </div>
  );
});

export type { UsePreviewEditingCoreParams }; // Re-export type for callers
export { ImageEditingCanvas };
export default ImageEditingCanvas;
