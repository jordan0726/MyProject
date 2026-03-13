  // ============================================================
  // =============== ReceiptCAT — Editing Buttons ===============
  // Sections: Tooltip / Types / Styles / State Helpers / Blackout / Crop / Render
  // ============================================================
  // ImageEditingButton
  // Renders editing actions (blackout / crop mode toggle / reset) for mobile & desktop.
  import React, { useState, useId } from "react";
  import Icon from "@mdi/react";
  import { mdiCrop, mdiBackupRestore, mdiChevronUp, mdiChevronDown, mdiSquare, mdiCloseThick } from "@mdi/js";
  import ReactDOM from "react-dom";

  // ------------------------------------------------------------
  // Tooltip Infrastructure (Portal-based; avoids overflow issues)
  // ------------------------------------------------------------
  function ensureTooltipEl(id: string) { // Ensure a singleton tooltip root in document.body
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.position = "fixed";
      el.style.zIndex = "100000"; // On top of most UI
      el.style.pointerEvents = "none"; // Let mouse events pass through
      document.body.appendChild(el);
    }
    return el;
  }

const BodyTooltip: React.FC<{ id: string; text: string; x: number; y: number; visible: boolean }> = ({ id, text, x, y, visible }) => {
  const el = React.useMemo(() => ensureTooltipEl(id), [id]);
  React.useEffect(() => {
    return () => {
      // Cleanup: reuse the singleton root; just clear its content on unmount
      el.innerHTML = "";
    };
  }, [el]);

  const node = (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: x,
        top: y,
        transform: "translate(-50%, -100%)", // Center horizontally; above cursor
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        padding: "6px 8px",
        borderRadius: 6,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        opacity: visible ? 1 : 0,
        transition: "opacity 120ms ease",
      }}
    >
      {text}
    </div>
  );
  return ReactDOM.createPortal(node, el);
};

  // --------------------------------
  // Types & Props (public contract)
  // --------------------------------
  /**
   * Props for ImageEditingButton
   * - onReset: Restore original image (clear edits).
   * - onEnableCropMode: Enter crop mode (drag to create/adjust one crop frame).
   * - onDisableCropModeAndApply: Exit crop mode and apply crop if present.
   * - onEnableBlackout / onDisableBlackout: Toggle blackout drawing mode.
   * - blackoutActive: Current blackout mode state.
   * - addBlackoutTestId / resetTestId / toggleTestId: Optional test ids.
   * - disabled: Disable all actions (e.g., uploading).
   * - variant: "mobile" | "desktop". Affects shape/layout.
   * - size: Square side-size in px.
   */
  export type ImageEditingButtonProps = {
    // Click handlers from parent (Preview page)
    onReset: () => void;                       // Reset to original action
    onEnableCropMode?: () => void;             // Enter crop mode (drag to create/adjust one crop frame)
    onDisableCropModeAndApply?: () => void;    // Exit crop mode and apply crop if present
    cropActive?: boolean; // Controlled crop mode from parent (kept in sync with internal state)
    // Blackout mode actions (enable/disable)
    onEnableBlackout?: () => void;  // Enable blackout drawing mode
    onDisableBlackout?: () => void; // Disable blackout drawing mode
    blackoutActive?: boolean;       // Whether blackout mode is currently active
    addBlackoutTestId?: string;     // Optional data attribute id for tests
    // UI state flags
    disabled?: boolean;    // Disable action buttons (e.g., while uploading)
    // Visual variant and sizing
    variant?: "mobile" | "desktop"; // Affects radius/shadow & layout
    size?: number;         // Square size in px
    resetTestId?: string;   // Optional data attribute id
    toggleTestId?: string;  // Optional data attribute id
    cropTestId?: string;     // Optional data attribute id for crop button (tests)
    rootTestId?: string;     // Optional data attribute id for the component root (tests)
    mobileMenuDefaultOpen?: boolean; // For tests: start mobile menu opened without needing a click
  };

  // -----------------------
  // Shared Style Utilities
  // -----------------------
  // Derive primary background based on disabled state
  const primaryBg = (disabled?: boolean) => (disabled ? "#bfbfbf" : "#F1773B");

  // ---------- Shared style helpers (inline-only) ----------
  type Variant = "mobile" | "desktop";
  type BtnKind = "primary" | "outline"; // primary: brand bg; outline: white bg + border

  // Centered square; rounded/circular variants
  const baseFlexCenter = (size: number) => ({
    width: size,
    height: size,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  });
  const circular = (size: number) => ({ ...baseFlexCenter(size), borderRadius: "50%" as const });
  const rounded = (size: number, radius: number) => ({ ...baseFlexCenter(size), borderRadius: radius });

  // Compute button style by kind + variant
  function makeBtnStyle(
    kind: BtnKind,
    {
      variant,
      size,
      radius,
      disabled,
      shadow,
    }: { variant: Variant; size: number; radius: number; disabled: boolean; shadow?: string }
  ): React.CSSProperties {
    const common: React.CSSProperties =
      variant === "mobile" ? circular(size) : rounded(size, radius);

    const base: React.CSSProperties =
      kind === "primary"
        ? { background: primaryBg(disabled), color: "white", border: "none" }
        : { background: "white", color: "black", border: "1px solid #d9d9d9" };

    return {
      ...common,
      ...base,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      boxShadow: shadow,
      transition: "background-color 150ms ease, color 150ms ease, opacity 120ms ease, box-shadow 150ms ease",
    };
  }

  // Small reusable icon button to remove JSX duplication
export const IconBtn: React.FC<{
  kind: BtnKind;
  variant: Variant;
  size: number;
  radius: number;
  disabled: boolean;
  shadow?: string;
  ariaLabel: string;
  tooltip?: string; // Optional: when omitted, hover handlers early-return
  testId?: string;
  onClick?: () => void;
  styleOverride?: React.CSSProperties;
  children: React.ReactNode;
  label?: string;
  ariaPressed?: boolean; // Optional: indicate toggle state for a11y
}> = ({
    kind,
    variant,
    size,
    radius,
    disabled,
    shadow,
    ariaLabel,
    tooltip,
    testId,
    onClick,
    styleOverride,
    children,
    label,
    ariaPressed,
  }) => {
    const [hover, setHover] = React.useState(false); // Track hover state for desktop tooltip
    const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 }); // Tooltip anchor position

    // Mouse handlers for tooltip/hover state
    const handleMouseEnter = (e: React.MouseEvent) => {
      if (!tooltip) return;
      setHover(true);
      const rect = (e.currentTarget as HTMLSpanElement).getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    };
    const handleMouseLeave = () => {
      setHover(false);
    };
    const handleMouseMove = (e: React.MouseEvent) => {
      if (!hover) return;
      const rect = (e.currentTarget as HTMLSpanElement).getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    };

    return (
      <span
        className="iconBtnWrap"
        data-testid="icon-btn"
        data-tooltip={tooltip}
        style={{ position: "relative", display: "inline-flex", overflow: "visible", flexDirection: "column", alignItems: "center" }} // Column to stack label under icon
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
          className="iconBtn"
          data-testid={testId}
          style={{ ...makeBtnStyle(kind, { variant, size, radius, disabled, shadow }), ...(styleOverride || {}) }}
          aria-pressed={ariaPressed}
        >
          {children}
        </button>

        {/* Mobile-only text label under the icon */}
        {variant === "mobile" && label && (
          <span
            className="iconBtnLabel"
            style={{ marginTop: 6, fontSize: 12, lineHeight: 1.1, color: "#444", userSelect: "none" }} // Small caption under icon
          >
            {label}
          </span>
        )}

        {/* Render portal tooltip only on desktop variant */}
        {variant === "desktop" && !!tooltip && (
          <BodyTooltip id="rcat-tooltip-root" text={tooltip} x={pos.x} y={pos.y} visible={hover} />
        )}
      </span>
    );
  };

  // Component (stateful only for the mobile menu toggler)
  const ImageEditingButton: React.FC<ImageEditingButtonProps> = ({
    onReset,
    onEnableCropMode,
    onDisableCropModeAndApply,
    cropActive,
    onEnableBlackout,
    onDisableBlackout,
    blackoutActive,
    addBlackoutTestId,
    disabled,
    variant = "mobile",
    size = 48,
    resetTestId,
    toggleTestId,
    cropTestId,
    rootTestId,
    mobileMenuDefaultOpen,
  }) => {
    // -----------------------------------------
    // Shared State Helpers (internal component)
    // -----------------------------------------
    const [menuOpen, setMenuOpen] = useState(!!mobileMenuDefaultOpen); // Allow tests to start opened // Enable stable initial open state for tests
    const [cropMode, setCropMode] = useState(false); // Mirror crop active state for button visuals
    React.useEffect(() => {
      // Sync internal cropMode with parent-controlled cropActive when provided
      if (typeof cropActive === "boolean" && cropActive !== cropMode) {
        setCropMode(cropActive); // Keep visuals and disabled rules consistent
      }
    }, [cropActive, cropMode]);
    const menuId = useId(); // Unique id for aria-controls

    // --------------------
    // Blackout: state I/O
    // --------------------
    // Disable during crop mode; toggles enable/disable
    const handleBlackoutClick = () => {
      if (blackoutActive) {
        onDisableBlackout?.();
      } else {
        onEnableBlackout?.();
      }
    };

    // ---------------
    // Crop: state I/O
    // ---------------
    // Mutually exclusive with blackout; second click applies
    const handleCropToggle = () => {
      if (!cropMode) {
        onEnableCropMode?.();   // Enter crop mode
        setCropMode(true);
      } else {
        onDisableCropModeAndApply?.(); // Apply and exit
        setCropMode(false);
      }
    };

    // Visual constants per variant
    const radius = variant === "desktop" ? 10 : 8;
    const shadowConfirm = variant === "desktop" ? "0 6px 18px rgba(0,0,0,0.15)" : undefined;
    const shadowReset   = variant === "desktop" ? "0 6px 18px rgba(0,0,0,0.08)" : undefined;

    // Disable other actions while blackout mode is active
    const disabledWhileBlackout = !!disabled || !!blackoutActive;
    const disabledBlackoutBtn = !!disabled || !!cropMode; // Keep blackout button enabled when active so user can finish

    // Mobile layout: toggle button (chevron) persists at bottom; actions reveal above when open
    if (variant === "mobile") {
      const mobileNudgeX = -8; // Slight left nudge for better alignment on mobile
      const menuPaddingX = 4;  // Horizontal padding inside the revealed menu box (px)
      const menuPaddingY = 8; // Vertical padding inside the revealed menu box (px)
      const menuWidth = Math.max(size, 56) + menuPaddingX * 2; // Fixed width to prevent horizontal shift
      const columnWidth = Math.max(menuWidth, size);           // Keep the whole column width stable
      return (
        // -----------------
        // Render: Mobile UI
        // -----------------
        <div
          data-testid={rootTestId}
          data-state-menu-open={menuOpen ? "true" : "false"}
          data-state-crop-active={cropMode ? "true" : "false"}
          data-state-blackout-active={blackoutActive ? "true" : "false"}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
            width: columnWidth,            // Fix column width so open/close does not reflow horizontally
            boxSizing: "border-box",       // Include padding/border in width calculations
            transform: `translateX(${mobileNudgeX}px)`, // Nudge left on mobile
          }}
        >
          {menuOpen && (
            // A11y: Collapsible group for editing actions; controlled by the chevron toggle via `aria-controls`
            <div
              role="group"
              aria-label="Image editing menu"
              id={menuId}
              data-testid="editing-menu"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.9)", // Light background for readability
                padding: `${menuPaddingY}px ${menuPaddingX}px`,
                borderRadius: 12,
                minWidth: menuWidth,
                boxSizing: "border-box",
              }}
            > {/* SR label for the revealed actions */}
              {/* Add blackout button (mobile circular) */}
              <IconBtn
                kind="outline"
                variant={variant}
                size={size}
                radius={8}
                disabled={disabledBlackoutBtn} // Block blackout when crop mode is active
                shadow={shadowReset}
                ariaLabel={blackoutActive ? "Close and save blackout" : "Add blackout"}
                tooltip={blackoutActive ? "Close and save blackout" : "Add blackout"}
                testId={addBlackoutTestId}
                onClick={handleBlackoutClick}
                label={blackoutActive ? "Finish" : "Blackout"}
                styleOverride={blackoutActive ? { background: primaryBg(false), color: "white" } : undefined}
                ariaPressed={!!blackoutActive}
              >
                <Icon path={blackoutActive ? mdiCloseThick : mdiSquare} size="1.2em" />
              </IconBtn>

              {/* Toggle crop mode button (mobile circular) */}
              <IconBtn
                kind="outline"
                variant={variant}
                size={size}
                radius={8}
                disabled={!!disabledWhileBlackout}
                shadow={shadowReset}
                ariaLabel={cropMode ? "Apply crop" : "Add crop"} // When active, click applies the crop
                tooltip={cropMode ? "Apply crop" : "Add crop"}   // Clarify action semantics
                testId={cropTestId} // Test helper for crop button
                onClick={handleCropToggle}
                label={cropMode ? "Apply" : "Crop"}          // Short caption for mobile
                styleOverride={cropMode ? { background: primaryBg(false), color: "white" } : undefined}
                ariaPressed={!!cropMode}
              >
                <Icon path={mdiCrop} size="1.2em" />
              </IconBtn>

              {/* Reset to original button (mobile circular) */}
              <IconBtn
                kind="outline"
                variant={variant}
                size={size}
                radius={8}
                disabled={!!disabled} // Allow reset during blackout; still blocked when globally disabled
                shadow={shadowReset}
                ariaLabel="Reset to original"
                tooltip="Reset to original"
                testId={resetTestId}
                onClick={onReset}
                label="Reset"
              >
                <Icon path={mdiBackupRestore} size="1.2em" />
              </IconBtn>
            </div>
          )}

          {/* A11y: Toggle for the collapsible menu; `aria-expanded` reflects state and `aria-controls` links to the menu group */}
          <button
            type="button"
            disabled={!!disabled}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle editing menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            className="iconBtn"
            data-tooltip="Image editing tool"
            data-testid={toggleTestId}
            style={{
              width: size,
              height: size,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: primaryBg(disabled),
              color: "white",
              border: "none",
              borderRadius: "50%",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              position: "relative",
              boxShadow: shadowConfirm,
            }}
          >
            <Icon path={menuOpen ? mdiChevronDown : mdiChevronUp} size="1.1em" data-testid="chevron-icon" /> {/* Deterministic icon path for tests */}
          </button>
        </div>
      );
    }

    return (
      // ------------------
      // Render: Desktop UI
      // ------------------
      <div
        data-testid={rootTestId}
        data-state-menu-open="false"
        data-state-crop-active={cropMode ? "true" : "false"}
        data-state-blackout-active={blackoutActive ? "true" : "false"}
        style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", overflow: "visible" }}
      >
        {/* Add blackout button */}
        <IconBtn
          kind="primary"
          variant={variant}
          size={size}
          radius={radius}
          disabled={disabledBlackoutBtn} // Block blackout when crop mode is active
          shadow={shadowConfirm}
          ariaLabel={blackoutActive ? "Close and save blackout" : "Add blackout"}
          tooltip={blackoutActive ? "Close and save blackout" : "Add blackout"}
          testId={addBlackoutTestId}
          onClick={handleBlackoutClick}
          styleOverride={blackoutActive ? { background: primaryBg(false), color: "white" } : undefined}  // Keep visual emphasis only when active
          ariaPressed={!!blackoutActive}
        >
          <Icon path={blackoutActive ? mdiCloseThick : mdiSquare} size="1.2em" />
        </IconBtn>

        {/* Toggle crop mode button */}
        <IconBtn
          kind="primary"
          variant={variant}
          size={size}
          radius={radius}
          disabled={!!disabledWhileBlackout}
          shadow={shadowConfirm}
          ariaLabel={cropMode ? "Apply crop" : "Add crop"} // When active, click applies the crop
          tooltip={cropMode ? "Apply crop" : "Add crop"}   // Clarify action semantics
          testId={cropTestId} // Test helper for crop button
          onClick={handleCropToggle}
          styleOverride={cropMode ? { background: primaryBg(false), color: "white" } : undefined}
          ariaPressed={!!cropMode}
        >
          <Icon path={mdiCrop} size="1.2em" />
        </IconBtn>

        {/* Reset to original button */}
        <IconBtn
          kind="outline"
          variant={variant}
          size={size}
          radius={radius}
          disabled={!!disabled} // Allow reset during blackout; still blocked when globally disabled
          shadow={shadowReset}
          ariaLabel="Reset to original"
          tooltip="Reset to original"
          testId={resetTestId}
          onClick={onReset}
        >
          <Icon path={mdiBackupRestore} size="1.2em" />
        </IconBtn>

        {/* --------------------------
            Local CSS (accessibility)
            -------------------------- */}
        <style jsx>{`
          .iconBtnWrap:focus-within .iconBtn {
            outline: 2px solid rgba(0,0,0,0.25); /* Keyboard focus helper */
            outline-offset: 2px;
          }
        `}</style>
      </div>
    );
  };

  export default ImageEditingButton;
