import React, { useEffect, useRef } from "react";

export type ToastProps = {
  open: boolean;                       // Controls visibility
  message?: string;                    // Convenience message prop
  duration?: number;                   // Auto-hide duration in ms (default 3000)
  onClose?: () => void;                // Called when auto-hide fires
  className?: string;                  // Allow external class name
  style?: React.CSSProperties;         // Allow style override/extension for the bubble
  children?: React.ReactNode;          // Optional custom content
  "data-testid"?: string;              // For testing
  position?: "bottom" | "center";      // Position of the toast bubble
  zIndex?: number;                     // Layer index for the wrapper (ensures it is above other UI)
  wrapperTestId?: string;              // test id for the full-screen wrapper
  disableAutoHide?: boolean;           // if true, skip timers (useful for tests)
  onAutoHide?: () => void;             // fires right before onClose when auto-hide occurs
};

/**
 * A simple reusable Toast component.
 * - Auto-hides after `duration` ms when `open` is true.
 * - Accessible via role="status" and aria-live="polite".
 * - Supports positioning at the bottom or centered on screen.
 * - Uses a high wrapper z-index so the toast appears above other UI.
 */
const Toast: React.FC<ToastProps> = ({
  open,
  message,
  duration = 3000,                     // Default 3 seconds
  onClose,
  className,
  style,
  children,
  "data-testid": testId = "toast",
  position = "bottom",                 // Default to bottom placement
  zIndex = 100000,                     // High default to float above most UI
  wrapperTestId = 'toast-wrapper',     // Default test id for wrapper
  disableAutoHide = false,             // Allow tests to opt out of timers
  onAutoHide,
}) => {
  const timerRef = useRef<number | null>(null); // Hold timeout id for cleanup

  useEffect(() => {
    // (cleared block: clear any pending timer before (re)setting)
    // Set up auto-hide timer whenever toast opens
    if (open && !disableAutoHide && duration > 0) {
      timerRef.current = window.setTimeout(() => {
        onAutoHide?.()            // Allow tests to assert the auto-hide path
        onClose?.()
        timerRef.current = null
      }, duration);
    }
    return () => {
      // Clear timer on unmount or when dependencies change
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, duration, onClose, disableAutoHide, onAutoHide]);

  // Wrapper covers the full viewport. It does not block interactions except on the bubble.
  const wrapperStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    pointerEvents: 'none',  // Allow clicks to pass through the overlay; the bubble still receives events
    zIndex,                             // Ensure top-most layer as requested
    opacity: open ? 1 : 0,
    transition: "opacity 0.3s ease",
  };

  // Base bubble visual
  const bubbleBase: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    maxWidth: "min(420px, 95vw)",
    background: "rgba(80,80,80,0.9)",
    color: "white",
    padding: "12px 16px",
    borderRadius: 18,
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    fontSize: 20,
    pointerEvents: "auto",
    opacity: open ? 1 : 0,
    transition: "opacity 0.3s ease",
  };

  // Apply position-specific coordinates
  const bubblePos: React.CSSProperties =
    position === "center"
      ? { top: "50%", transform: "translate(-50%, -50%)" }
      : { bottom: 24, transform: "translateX(-50%)" };

  const bubbleStyle: React.CSSProperties = {
    ...bubbleBase,
    ...bubblePos,
    ...style,                           // Allow final overrides
  };

  return (
    <div style={wrapperStyle} data-testid={wrapperTestId} data-state-open={open ? 'true' : 'false'}>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-hidden={!open}
        data-testid={testId}
        data-position={position}
        className={className}
        style={bubbleStyle}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <img
            src="/logo_orange.svg"
            alt="Toast Icon"
            style={{ width: 48, height: 48, marginBottom: 8 }}
          />
          <div>{children ?? message}</div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
