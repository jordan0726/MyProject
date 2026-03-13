// ============================================================
// ============= ReceiptCAT — Preview Editing Core ============
// Purpose:
//   Encapsulate editing logic (state and handlers) for the Preview page.
// Usage:
//   import { usePreviewEditingCore } from "./usePreviewEditingCore";
//   const core = usePreviewEditingCore({...});
//   <Cropper ref={core.cropperRef} ... />
//   <div ref={core.overlayRef} onPointerDown={core.handlePointerDown} ... />
// Contracts:
//   - UI-only renderer calls this hook; no DOM assumptions here besides cropper refs.
//   - onEditOutput is the single output path for edited files.
//   - Crop coordinates are managed by Cropper; blackout rectangles are overlay CSS pixels.
//   - No timers or background work; all actions are synchronous except canvas.toBlob callback.
// ============================================================

import { useCallback, useRef, useState } from "react";
import type { ReactCropperElement } from "react-cropper";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

// Rectangle in overlay CSS pixels (canvas-space on top of the cropper)
export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Parameters to configure the editing core.
 * - fileName: for MIME type and output file naming.
 * - onEditOutput: callback to receive the edited File.
 * - onCropStateChange: lift crop state (image-space data and cropBox).
 * - onError: error handler for non-fatal issues.
 */
// Note: All callbacks are best-effort; errors are surfaced via onError and do not throw.
export type UsePreviewEditingCoreParams = {
  fileName: string;                                                // For MIME and output name
  onEditOutput?: (file: File) => void;                             // Output callback
  onCropStateChange?: (state: { data: any; cropBox: any }) => void; // Lift crop state
  onError?: (msg: string) => void;                                 // Error handler
};

/**
 * Public interface returned by the editing core.
 * Includes refs, state, and imperative methods.
 * State invariants:
 * - At most one mode is user-active at a time (crop or blackout).
 * - draftRect is non-null only during pointer drag in blackout mode.
 * - blackouts contains committed rectangles in overlay CSS pixels.
 */
export type UsePreviewEditingCoreReturn = {
  // Refs and state consumed by renderer
  cropperRef: React.RefObject<ReactCropperElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  isCropMode: boolean;
  isBlackoutMode: boolean;
  blackouts: Rect[];
  draftRect: Rect | null;

  // Imperative methods exposed via component ref
  fitToBounds: () => void;
  enableCropMode: () => void;
  disableCropModeAndApply: () => void;
  enableBlackoutMode: () => void;
  cancelBlackoutMode: () => void;
  disableBlackoutModeAndApply: () => void;

  // Pointer handlers for blackout overlay
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  finalizeDraft: (target?: HTMLElement, pointerId?: number) => void;
};

// ------------------------------------------------------------
// Pure utilities
// ------------------------------------------------------------

// JPEG export uses quality=0.95; PNG ignores quality.
/** Determine export MIME type by file extension (PNG → image/png, else JPEG). */
function inferMime(fileName: string): string {
  return fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

// Precision: integer rounding is applied to avoid sub-pixel seams in the output.
/**
 * Map overlay-space rectangle (CSS pixels) to image-space (natural pixels).
 * Uses cropper data for scaling.
 */
function mapCssRectToImageRect(cropper: any, r: Rect) {
  const canvasData = cropper.getCanvasData();
  const imageData = cropper.getImageData();
  const scaleX = imageData.naturalWidth / canvasData.width;
  const scaleY = imageData.naturalHeight / canvasData.height;
  const ix = Math.floor((r.x - canvasData.left) * scaleX);
  const iy = Math.floor((r.y - canvasData.top) * scaleY);
  const iw = Math.ceil(r.w * scaleX);
  const ih = Math.ceil(r.h * scaleY);
  return { ix, iy, iw, ih };
}

/**
 * Bake blackout rectangles onto the original image, returning a data URL.
 * Returns null if input is invalid or canvas creation fails.
 * - Uses the original <img> element to draw the base image at natural size.
 * - Mutates nothing; returns a data URL for the caller to persist/replace.
 */
function bakeBlackoutsToDataURL(cropper: any, rects: Rect[], mime: string): string | null {
  if (!cropper || !Array.isArray(rects) || rects.length === 0) return null;
  const imgEl = (cropper as any)?.image as HTMLImageElement | undefined;
  const imageData = cropper.getImageData?.();
  const naturalWidth = imageData?.naturalWidth ?? 0;
  const naturalHeight = imageData?.naturalHeight ?? 0;
  if (!imgEl || naturalWidth <= 0 || naturalHeight <= 0) return null;

  const out = document.createElement("canvas");
  out.width = naturalWidth;
  out.height = naturalHeight;
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  // Draw base image
  ctx.drawImage(imgEl, 0, 0, out.width, out.height);

  // Draw blackout rectangles
  rects.forEach((r) => {
    const { ix, iy, iw, ih } = mapCssRectToImageRect(cropper, r);
    if (iw > 0 && ih > 0) {
      ctx.fillStyle = "#000";
      ctx.fillRect(ix, iy, iw, ih);
    }
  });

  // JPEG respects quality; PNG ignores it
  const quality = mime === "image/jpeg" ? 0.95 : undefined;
  return out.toDataURL(mime, quality as number | undefined);
}

/** Convert a data URL to a Blob with the specified MIME type. */
function dataURLToBlob(dataURL: string, mime: string): Blob {
  const parts = dataURL.split(',');
  const base64 = parts[1] ?? "";
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ------------------------------------------------------------
// Hook: usePreviewEditingCore
// ------------------------------------------------------------

/**
 * Core editing hook for the Preview page.
 * Manages crop and blackout modes, state, and outputs edited files.
 */
// Contract:
// - No-op if cropper is not ready or selection is invalid.
// - Emits a File via callbacks; also lifts {data, cropBox} if onCropStateChange is set.
// - Does not modify blackout state.
export function usePreviewEditingCore({
  fileName, onEditOutput, onCropStateChange, onError,
}: UsePreviewEditingCoreParams): UsePreviewEditingCoreReturn {
  // Refs for cropper and blackout overlay
  const cropperRef = useRef<ReactCropperElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null); // Anchor of blackout drag (stable across moves)

  // Local state for modes and blackout rectangles
  const [isCropMode, setIsCropMode] = useState(false);
  const [isBlackoutMode, setIsBlackoutMode] = useState(false);
  const [blackouts, setBlackouts] = useState<Rect[]>([]);
  const [draftRect, setDraftRect] = useState<Rect | null>(null);

  // Emit edited file via onEditOutput if provided
  const emitOutput = useCallback((file: File) => {
    try { onEditOutput?.(file); }
    catch { onError?.("Failed to emit edited output"); }
  }, [onEditOutput, onError]);

  // Apply crop and emit result
  // Also clears any crop box to present a clean viewport; does not affect blackout data.
  const applyCrop = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    // Get high-quality cropped canvas
    const canvas = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!canvas) { onError?.("Failed to crop image. Please try again."); return; }

    // Export to Blob and emit as File
    const mime = inferMime(fileName);
    canvas.toBlob((blob) => {
      if (!blob) { onError?.("Failed to create Blob from canvas"); return; }
      const file = new File([blob], fileName, { type: mime });
      onCropStateChange?.({ data: cropper.getData(true), cropBox: cropper.getCropBoxData() });
      emitOutput(file);
    }, mime, 0.95);
  }, [fileName, emitOutput, onCropStateChange, onError]);

  // Reset transforms, clear crop box, disable drag mode
  // Also clears any crop box to present a clean viewport; does not affect blackout data.
  const fitToBounds = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.reset();
    cropper.clear();
    cropper.setDragMode('none');
  }, []);

  // Enter crop mode: clear box and enable crop drag mode
  // Disables drag on the image and enables drag-to-create crop box.
  const enableCropMode = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    setIsCropMode(true);
    cropper.clear();
    cropper.setDragMode("crop");
  }, []);

  // Exit crop mode, apply crop if valid, reset drag mode and clear UI
  // Safe to call repeatedly; idempotent with no selection.
  const disableCropModeAndApply = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) { setIsCropMode(false); return; }
    try {
      const box = cropper.getCropBoxData?.();
      const hasBox = box && box.width > 1 && box.height > 1;
      if (hasBox) applyCrop();
    } finally {
      setIsCropMode(false);
      try { cropper.setDragMode("none"); } catch {}
      try { cropper.clear(); } catch {}
    }
  }, [applyCrop]);

  // Enter blackout mode (enable overlay interaction)
  // Pointer events will be captured by the overlay while this flag is true.
  const enableBlackoutMode = useCallback(() => { setIsBlackoutMode(true); }, []);

  // Cancel blackout mode: clear draft and committed rectangles
  // Pure cancel: removes draft and committed rectangles; does not emit output.
  const cancelBlackoutMode = useCallback(() => {
    setIsBlackoutMode(false);
    dragStartRef.current = null; // Reset drag anchor
    setDraftRect(null);
    setBlackouts([]);
  }, []);

  // Exit blackout mode, bake rectangles onto image, emit new File, reset blackout state
  // Path:
  //   (a) If no committed rectangles: clear draft and exit.
  //   (b) If rectangles exist: bake → replace cropper image → emit File → clear state.
  const disableBlackoutModeAndApply = useCallback(() => {
    setIsBlackoutMode(false);
    dragStartRef.current = null; // Reset drag anchor when applying
    const cropper = cropperRef.current?.cropper;
    if (!cropper || blackouts.length === 0) {
      setDraftRect(null);
      setBlackouts([]);
      return;
    }
    const mime = inferMime(fileName);
    const bakedUrl = bakeBlackoutsToDataURL(cropper, blackouts, mime);
    if (bakedUrl) {
      // Update live image in cropper for seamless UX
      try { cropper.replace(bakedUrl, true); } catch {}
      // Persist result via callback
      try {
        const blob = dataURLToBlob(bakedUrl, mime);
        const file = new File([blob], fileName, { type: mime });
        emitOutput(file);
      } catch { onError?.("Failed to persist blackout result"); }
      setBlackouts([]);
    }
    setDraftRect(null);
  }, [blackouts, fileName, emitOutput, onError]);

  // Convert client coordinates to overlay-local coordinates, clamped
  // Returns coordinates clamped to [0, overlay.width] × [0, overlay.height].
  const getLocalPointFromXY = useCallback((clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const r = overlay.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    return {
      x: Math.max(0, Math.min(x, r.width)),
      y: Math.max(0, Math.min(y, r.height)),
    };
  }, []);

  // Finalize current draft: commit if minimum size, clear draft, release pointer capture
  // Note: Uses MIN_RECT=2 px to ignore accidental taps or micro-drags.
  const finalizeDraft = useCallback((releaseTarget?: HTMLElement, pointerId?: number) => {
    const MIN_RECT = 2; // Minimal visible rectangle (in CSS px)
    if (draftRect && draftRect.w >= MIN_RECT && draftRect.h >= MIN_RECT) {
      setBlackouts(prev => [...prev, draftRect]);
    }
    setDraftRect(null);
    dragStartRef.current = null; // Clear drag anchor at end of gesture
    try { releaseTarget?.releasePointerCapture?.(pointerId as number); } catch {}
  }, [draftRect]);

  // Start drafting a blackout rectangle on pointer down
  // Starts a new draft at the press location and captures the pointer.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isBlackoutMode) return;
    e.preventDefault();
    const p = getLocalPointFromXY(e.clientX, e.clientY);
    dragStartRef.current = { x: p.x, y: p.y }; // Store stable start point
    setDraftRect({ x: p.x, y: p.y, w: 0, h: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [isBlackoutMode, getLocalPointFromXY]);

  // Update draft rectangle as pointer moves
  // Creates a "normalized" rect (x,y at top-left; w,h positive).
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isBlackoutMode) return; // No-op outside blackout mode
    const start = dragStartRef.current; // Read stable anchor
    if (!start) return; // No draft started yet
    const p = getLocalPointFromXY(e.clientX, e.clientY);
    const x = Math.min(p.x, start.x);
    const y = Math.min(p.y, start.y);
    const w = Math.abs(p.x - start.x);
    const h = Math.abs(p.y - start.y);
    setDraftRect({ x, y, w, h }); // Update draft from anchor → current pointer
  }, [isBlackoutMode, getLocalPointFromXY]);

  // Commit the draft rectangle on pointer up
  // Commits the draft via finalizeDraft; safe no-op if not in blackout mode.
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isBlackoutMode) return;
    finalizeDraft(e.currentTarget as HTMLElement, e.pointerId);
  }, [isBlackoutMode, finalizeDraft]);

  // Public API
  return {
    cropperRef,
    overlayRef,
    isCropMode,
    isBlackoutMode,
    blackouts,
    draftRect,
    fitToBounds,
    enableCropMode,
    disableCropModeAndApply,
    enableBlackoutMode,
    cancelBlackoutMode,
    disableBlackoutModeAndApply,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    finalizeDraft,
  };
}
