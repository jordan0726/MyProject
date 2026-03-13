// ============================================================
// ============ ReceiptCAT — Preview Editing Styles ===========
// This file centralizes inline style objects for the
// PreviewEditingTool component, separating presentation
// from logic for better readability and reusability.
// ============================================================

import type { CSSProperties } from "react";

// RectLike — simple geometry type for blackout/draft rectangles
export type RectLike = { x: number; y: number; w: number; h: number };

// Root container base — disables text selection
export const rootBaseStyle: CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
};

// Cropper element sizing — full width, auto height
export const cropperStyle: CSSProperties = {
  width: "100%",
  height: "auto",
};

// Cursor overlay — shows crosshair when in crop mode
export const cursorHintStyle = (isCropMode: boolean): CSSProperties => ({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  cursor: isCropMode ? "crosshair" : "default",
});

// Blackout overlay base — toggles pointer events based on blackout mode
export const overlayStyle = (isBlackoutMode: boolean): CSSProperties => ({
  position: "absolute",
  inset: 0,
  pointerEvents: isBlackoutMode ? "auto" : "none",
  cursor: isBlackoutMode ? "crosshair" : "default",
  background: "transparent",
  touchAction: "none",
});

// Style for finalized blackout rectangles (solid black fill)
export const blackoutRectStyle = (rect: RectLike): CSSProperties => ({
  position: "absolute",
  left: rect.x,
  top: rect.y,
  width: rect.w,
  height: rect.h,
  background: "#000",
});

// Style for draft blackout rectangle during drawing (semi-transparent + dashed outline)
export const draftRectStyle = (rect: RectLike): CSSProperties => ({
  position: "absolute",
  left: rect.x,
  top: rect.y,
  width: rect.w,
  height: rect.h,
  background: "rgba(0,0,0,0.6)",
  outline: "1px dashed #fff",
});

// Global overrides for cropper.js UI elements (corner handles, grid lines, etc.)
export const cropperGlobalStyles = `
  /* Hide default small squares */
  .cropper-point { background: transparent !important; border: none !important; box-shadow: none !important; }

  /* Corner handles: L-shapes */
  .cropper-point.point-nw {
    width: 32px !important;
    height: 32px !important;
    background: transparent !important;
    border-top: 6px solid #F1773B !important;
    border-left: 6px solid #F1773B !important;
  }
  .cropper-point.point-ne {
    width: 32px !important;
    height: 32px !important;
    background: transparent !important;
    border-top: 6px solid #F1773B !important;
    border-right: 6px solid #F1773B !important;
  }
  .cropper-point.point-sw {
    width: 32px !important;
    height: 32px !important;
    background: transparent !important;
    border-bottom: 6px solid #F1773B !important;
    border-left: 6px solid #F1773B !important;
  }
  .cropper-point.point-se {
    width: 32px !important;
    height: 32px !important;
    background: transparent !important;
    border-bottom: 6px solid #F1773B !important;
    border-right: 6px solid #F1773B !important;
  }

  /* Edge handles: short ticks */
  .cropper-point.point-n,
  .cropper-point.point-s {
    width: 48px !important;
    height: 8px !important;
    background-color: #F1773B !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    margin-left: 0 !important;
  }
  .cropper-point.point-e,
  .cropper-point.point-w {
    width: 8px !important;
    height: 48px !important;
    background-color: #F1773B !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    margin-top: 0 !important;
  }

  /* Brighter outline and dim overlay */
  .cropper-view-box { outline: 2px solid #F1773B !important; outline-offset: 0; }
  .cropper-line { background-color: rgba(241,119,59,0.85) !important; }
  .cropper-face { background-color: rgba(0, 0, 0, 0.2) !important; }
`;
