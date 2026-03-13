import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageEditingButton, { IconBtn } from "../../components/PreviewEditingButton";


// Test utilities
const removeTooltipRoot = () => {
  const el = document.body.querySelector("#rcat-tooltip-root");
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
};

// Helper: resolve the actual hoverable element inside IconBtn (if present) // Inline util for tests
const innerOf = (el: HTMLElement): HTMLElement => (el.querySelector('[data-testid="icon-btn"]') as HTMLElement) || el;

// Helpers: stable tooltip querying (multiple tooltips may coexist in the portal)
const allTooltips = (): HTMLElement[] => Array.from(document.querySelectorAll('#rcat-tooltip-root [role="tooltip"]')) as HTMLElement[]; // Return all tooltip nodes
const tooltipWithText = (re: RegExp): HTMLElement | undefined => allTooltips().find(t => re.test(t.textContent || "")); // Find tooltip by text

beforeEach(() => {
  removeTooltipRoot(); // ensure clean DOM before each test
});

afterEach(() => {
  // Ensure mocks and out-of-tree DOM nodes are cleaned between tests
  jest.clearAllMocks();
  removeTooltipRoot();
});

// Mock @mdi/react so we can assert the `path` prop easily
jest.mock("@mdi/react", () => {
  return ({ path, ...rest }: { path: string } & Record<string, any>) => (
    <svg {...rest} data-path={path} />
  );
});


// Helper: deterministically open the mobile menu using user-event
const openMobileMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  const toggle = screen.getByRole("button", { name: /toggle editing menu/i }); // Stable a11y query
  // Click to open if not already open
  if (toggle.getAttribute("aria-expanded") !== "true") {
    await user.click(toggle); // Simulate real click
  }
  // Wait for the menu to appear in the DOM (more reliable than aria-expanded alone)
  await screen.findByTestId("editing-menu");
  // Also confirm expanded for completeness (settled state)
  await waitFor(() => expect(toggle).toHaveAttribute("aria-expanded", "true"));
  return toggle;
};


describe("ImageEditingButton - desktop variant", () => {
  it("should render primary background for action buttons and outline border for reset", () => {
    // Arrange: desktop renders primary-styled actions (Add blackout/Add crop) and outline-styled Reset
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="desktop"
        rootTestId="editing-root"
      />
    );

    // Act: primary action (Add blackout)
    const primaryBtn = screen.getByRole("button", { name: /add blackout/i });
    const primaryCS = window.getComputedStyle(primaryBtn as HTMLElement);

    // Assert: primary background color matches brand orange (do not assert border style due to browser defaults)
    expect(primaryCS.backgroundColor).toBe("rgb(241, 119, 59)");

    // Act: outline action (Reset)
    const outlineBtn = screen.getByRole("button", { name: /reset to original/i });
    const outlineCS = window.getComputedStyle(outlineBtn as HTMLElement);

    // Assert: outline has 1px solid #d9d9d9
    expect(outlineCS.borderStyle).toBe("solid");
    expect(outlineCS.borderWidth).toBe("1px");

    // Border color may be reported as rgb(...) or hex in JSDOM; accept both and also check inline style
    const color = (outlineCS.borderColor || "").trim().toLowerCase();
    expect(["rgb(217, 217, 217)", "#d9d9d9"]).toContain(color);

    const inlineStyle = (outlineBtn as HTMLElement).getAttribute("style") || "";
    expect(inlineStyle.toLowerCase().replace(/\s+/g, " ")).toMatch(/border:\s*1px\s+solid\s+#d9d9d9/);
  });
  it("should not render the toggle chevron in desktop variant", () => {
    // Arrange
    render(
      <ImageEditingButton
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        onReset={jest.fn()}
        variant="desktop"
        rootTestId="editing-root"
      />
    );

    // Assert
    expect(screen.queryByRole("button", { name: /toggle editing menu/i })).toBeNull();
    const root = screen.getByTestId("editing-root");
    expect(root).toHaveAttribute("data-state-menu-open", "false"); // Desktop never opens a menu
  });

  it("should initialize tooltip root on mount (ensureTooltipEl is called)", () => {
    // Arrange: render desktop variant which sets up tooltip root using useMemo
    render(
      <ImageEditingButton
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        onReset={jest.fn()}
        variant="desktop"
        rootTestId="editing-root"
      />
    );
    // Assert: tooltip root should be present (created once per document)
    const tooltipRoot = document.body.querySelector("#rcat-tooltip-root");
    expect(tooltipRoot).toBeInTheDocument(); // Cover: useMemo -> ensureTooltipEl(id)
    expect(document.body.querySelectorAll("#rcat-tooltip-root").length).toBe(1); // Singleton root
  });

  it("should show and hide tooltip on hover in desktop variant", async () => {
    // Arrange
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}     
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="desktop"
        rootTestId="editing-root"
      />
    );

    // Act
    const blackoutBtn = screen.getByRole("button", { name: /add blackout/i });
    const inner = innerOf(blackoutBtn);
    expect(inner).toBeTruthy();

    // Act: Mouse enter triggers tooltip
    const user = userEvent.setup();
    await user.hover(inner);
    // Assert via a11y role
    const tip1 = await waitFor(() => {
      const el = tooltipWithText(/add blackout/i);
      if (!el) throw new Error('Tooltip not yet visible');
      return el;
    });
    expect(tip1).toBeTruthy();

    // Mouse move is not strictly necessary with user-event, hover covers visibility.
    // Act: Mouse leave hides tooltip (still in DOM but with opacity 0)
    await user.unhover(inner);
    // Assert
    await waitFor(() => {
      const el = tooltipWithText(/add blackout/i);
      if (!el) throw new Error('Tooltip disappeared unexpectedly');
      expect(el.style.opacity).toBe('0'); // Hidden but mounted
    });
  });

  it("should call enable/disable blackout handlers and reflect aria state", async () => {
    // Arrange A
    const onEnableBlackout = jest.fn();
    const onDisableBlackout = jest.fn();
    const { rerender } = render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={onEnableBlackout}
        onDisableBlackout={onDisableBlackout}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="desktop"
        rootTestId="editing-root"
      />
    );

    // Act A
    const blackoutBtn = screen.getByRole("button", { name: /add blackout/i });
    const user = userEvent.setup();
    await user.click(blackoutBtn);

    // Assert A
    expect(onEnableBlackout).toHaveBeenCalledTimes(1);
    const rootA = screen.getByTestId('editing-root');
    expect(rootA).toHaveAttribute('data-state-blackout-active', 'false');

    // Arrange B
    // Arrange: re-render with blackoutActive = true to simulate parent state
    rerender(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={onEnableBlackout}
        onDisableBlackout={onDisableBlackout}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        blackoutActive
        variant="desktop"
        rootTestId="editing-root"
      />
    );

    // Act
    const blackoutCloseBtn = screen.getByRole("button", { name: /close and save blackout/i });
    await user.click(blackoutCloseBtn);

    // Assert B
    await waitFor(() => {
      expect(onDisableBlackout).toHaveBeenCalledTimes(1);
      const rootB = screen.getByTestId('editing-root');
      expect(rootB).toHaveAttribute('data-state-blackout-active', 'true');
      expect(blackoutCloseBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it("should enter crop mode on first click and apply on second click", async () => {
    // Arrange
    const onEnableCropMode = jest.fn();
    const onDisableCropModeAndApply = jest.fn();
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={onEnableCropMode}
        onDisableCropModeAndApply={onDisableCropModeAndApply}
        variant="desktop"
        rootTestId="editing-root"
        cropTestId="crop-btn"
      />
    );

    // Act: first click enters crop mode
    const cropBtn = screen.getByTestId('crop-btn'); // Stable selection
    const user = userEvent.setup();
    await user.click(cropBtn);

    // Assert
    await waitFor(() => {
      const root1 = screen.getByTestId('editing-root');
      expect(root1).toHaveAttribute('data-state-crop-active', 'true');
    });

    // Act: second click applies crop (button label becomes "Apply crop")
    const applyBtn = screen.getByRole("button", { name: /apply crop/i });
    await user.click(applyBtn);

    // Assert
    await waitFor(() => {
      const root2 = screen.getByTestId('editing-root');
      expect(root2).toHaveAttribute('data-state-crop-active', 'false');
    });
  });

  it("should disable crop actions while blackout is active", async () => {
    // Arrange
    const onEnableCropMode = jest.fn();
    const onDisableCropModeAndApply = jest.fn();
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={onEnableCropMode}
        onDisableCropModeAndApply={onDisableCropModeAndApply}
        blackoutActive
        variant="desktop"
        rootTestId="editing-root"
        cropTestId="crop-btn"
      />
    );

    // Act
    const cropBtn = screen.getByTestId('crop-btn');

    // Assert: disabled and does not trigger handler
    expect(cropBtn).toBeDisabled();
    const user = userEvent.setup();
    await user.click(cropBtn);
    expect(onEnableCropMode).not.toHaveBeenCalled();
  });

  it("should disable blackout action while crop is active (controlled via prop)", async () => {
    // Arrange
    const onEnableBlackout = jest.fn();
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={onEnableBlackout}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        cropActive
        variant="desktop"
        rootTestId="editing-root"
        addBlackoutTestId="add-blackout"
      />
    );

    // Act
    const blackoutBtn = screen.getByTestId('add-blackout');

    // Assert: disabled and does not trigger handler
    expect(blackoutBtn).toBeDisabled();
    const user = userEvent.setup();
    await user.click(blackoutBtn);
    expect(onEnableBlackout).not.toHaveBeenCalled();
  });

  it("should call onReset when clicking reset button", async () => {
    // Arrange
    const onReset = jest.fn();
    render(
      <ImageEditingButton
        onReset={onReset}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="desktop"
        rootTestId="editing-root"
      />
    );

    // Act
    const resetBtn = screen.getByRole("button", { name: /reset to original/i });
    const user = userEvent.setup();
    await user.click(resetBtn);

    // Assert
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));
  });

  it("should disable all actions when disabled is true", async () => {
    // Arrange
    const handlers = {
      onReset: jest.fn(),
      onEnableBlackout: jest.fn(),
      onDisableBlackout: jest.fn(),
      onEnableCropMode: jest.fn(),
      onDisableCropModeAndApply: jest.fn(),
    };
    render(
      <ImageEditingButton
        {...handlers}
        disabled
        variant="desktop"
        rootTestId="editing-root"
      />
    );

    // Act
    const blackoutBtn = screen.getByRole("button", { name: /add blackout/i });
    const cropBtn = screen.getByRole("button", { name: /add crop/i });
    const resetBtn = screen.getByRole("button", { name: /reset to original/i });

    // Assert: all disabled
    expect(blackoutBtn).toBeDisabled();
    expect(cropBtn).toBeDisabled();
    expect(resetBtn).toBeDisabled();

    // And clicking does nothing
    const user = userEvent.setup();
    await user.click(blackoutBtn);
    await user.click(cropBtn);
    await user.click(resetBtn);

    expect(handlers.onEnableBlackout).not.toHaveBeenCalled();
    expect(handlers.onEnableCropMode).not.toHaveBeenCalled();
    expect(handlers.onReset).not.toHaveBeenCalled();
  });
  it("should not show tooltip on mouse move without prior hover (early return when hover is false)", async () => {
    // Arrange: desktop renders tooltip infra, but we won't trigger mouseenter
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="desktop"
      />
    );

    const btn = screen.getByRole("button", { name: /add blackout/i });
    const inner = innerOf(btn);

    // Act: move mouse without hover
    const user = userEvent.setup();
    await user.pointer({ keys: "[MouseMove]", target: inner });

    // Assert: tooltip remains hidden (opacity 0) and present (desktop variant always renders BodyTooltip)
    await waitFor(() => {
      const tip = tooltipWithText(/add blackout/i);
      expect(tip).toBeTruthy();
      expect(tip!.style.opacity).toBe("0");
    });
  });
});

describe("ImageEditingButton - mobile variant", () => {

  it("should sync internal cropMode from prop cropActive (both directions)", async () => {
    // Arrange A: start with cropActive=false (matches internal default), then toggle -> true -> false
    const { rerender } = render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="mobile"
        rootTestId="editing-root"
        cropActive={false}
      />
    );

    // Assert A0: explicitly false at start (no branch yet)
    await waitFor(() => {
      const root0 = screen.getByTestId("editing-root");
      expect(root0).toHaveAttribute("data-state-crop-active", "false");
    });

    // Arrange A1: toggle prop to true (differs from state=false) -> should hit sync branch
    rerender(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="mobile"
        rootTestId="editing-root"
        cropActive={true}
      />
    );

    // Assert A1: state becomes true
    await waitFor(() => {
      const root1 = screen.getByTestId("editing-root");
      expect(root1).toHaveAttribute("data-state-crop-active", "true");
    });

    // Arrange B: toggle prop back to false (differs from state=true) -> hit branch again
    rerender(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={jest.fn()}
        onDisableBlackout={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="mobile"
        rootTestId="editing-root"
        cropActive={false}
      />
    );

    // Assert B: state returns to false
    await waitFor(() => {
      const root2 = screen.getByTestId("editing-root");
      expect(root2).toHaveAttribute("data-state-crop-active", "false");
    });
  });

  it("should render menu closed by default and link aria-controls to the menu id", async () => {
    render(<ImageEditingButton onReset={jest.fn()} variant="mobile" />);
    // menu closed initially
    expect(screen.queryByTestId("editing-menu")).toBeNull();

    const user = userEvent.setup();
    const toggle = await openMobileMenu(user);

    // aria-controls points to the revealed menu id
    const menuId = toggle.getAttribute("aria-controls");
    expect(menuId).toBeTruthy();
    const menu = document.getElementById(menuId!);
    expect(menu).toBeTruthy();
    expect(menu).toHaveAttribute("data-testid", "editing-menu");
  });

  it("should show Add blackout (inactive) then Close and save blackout (active) with correct icon and pressed state", async () => {
    const onEnableBlackout = jest.fn();
    const onDisableBlackout = jest.fn();

    const { rerender } = render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={onEnableBlackout}
        onDisableBlackout={onDisableBlackout}
        variant="mobile"
        mobileMenuDefaultOpen
      />
    );

    // Inactive branch
    const addBtn = screen.getByRole("button", { name: /add blackout/i });
    expect(addBtn).toHaveAttribute("aria-pressed", "false");
    // Label under icon should be Blackout
    expect(screen.getByText(/blackout/i)).toBeInTheDocument();
    // Icon path should be mdiSquare when inactive
    const addSvg = addBtn.querySelector("svg");
    expect(addSvg).toBeTruthy();
    expect((addSvg as SVGElement).getAttribute("data-path")).toBe("M3,3V21H21V3"); // mdiSquare

    // Activate blackout via rerender
    rerender(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableBlackout={onEnableBlackout}
        onDisableBlackout={onDisableBlackout}
        variant="mobile"
        mobileMenuDefaultOpen
        blackoutActive
      />
    );

    // Active branch
    const closeBtn = screen.getByRole("button", { name: /close and save blackout/i });
    expect(closeBtn).toHaveAttribute("aria-pressed", "true");
    // Label under icon should be Finish
    expect(screen.getByText(/finish/i)).toBeInTheDocument();
    // Icon path should be mdiCloseThick when active
    const closeSvg = closeBtn.querySelector("svg");
    expect(closeSvg).toBeTruthy();
    expect((closeSvg as SVGElement).getAttribute("data-path")).toBe("M20 6.91L17.09 4L12 9.09L6.91 4L4 6.91L9.09 12L4 17.09L6.91 20L12 14.91L17.09 20L20 17.09L14.91 12L20 6.91Z"); // mdiCloseThick
  });

  it("should switch crop button from Add → Apply with aria-pressed and primary background when active", async () => {
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableCropMode={jest.fn()}
        onDisableCropModeAndApply={jest.fn()}
        variant="mobile"
        mobileMenuDefaultOpen
      />
    );

    // Inactive branch
    const cropBtn = screen.getByRole("button", { name: /add crop/i });
    expect(cropBtn).toHaveAttribute("aria-pressed", "false");
    // Label should be Crop
    expect(screen.getByText(/^crop$/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(cropBtn); // activate crop mode

    // Active branch: Apply crop
    const applyBtn = screen.getByRole("button", { name: /apply crop/i });
    expect(applyBtn).toHaveAttribute("aria-pressed", "true");
    // Label should switch to Apply
    expect(screen.getByText(/^apply$/i)).toBeInTheDocument();

    // Style override: background becomes brand orange (#F1773B)
    const cs = window.getComputedStyle(applyBtn as HTMLElement);
    expect(cs.backgroundColor.toLowerCase()).toBe("rgb(241, 119, 59)");
  });

  it("should disable crop when blackoutActive is true (mutual exclusion)", () => {
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        variant="mobile"
        mobileMenuDefaultOpen
        blackoutActive
      />
    );

    const cropBtn = screen.getByRole("button", { name: /add crop/i });
    expect(cropBtn).toBeDisabled();
  });

  it("should disable blackout when cropMode is active (mutual exclusion)", async () => {
    render(
      <ImageEditingButton
        onReset={jest.fn()}
        onEnableCropMode={jest.fn()}
        variant="mobile"
        mobileMenuDefaultOpen
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /add crop/i })); // enter crop mode

    const blackoutBtn = screen.getByRole("button", { name: /add blackout/i });
    expect(blackoutBtn).toBeDisabled();
  });

  it("should set toggle background via primaryBg depending on disabled state", () => {
    const { rerender } = render(
      <ImageEditingButton onReset={jest.fn()} variant="mobile" mobileMenuDefaultOpen />
    );

    const toggle = screen.getByRole("button", { name: /toggle editing menu/i });
    let cs = window.getComputedStyle(toggle as HTMLElement);
    expect(cs.backgroundColor.toLowerCase()).toBe("rgb(241, 119, 59)"); // enabled -> #F1773B

    rerender(<ImageEditingButton onReset={jest.fn()} variant="mobile" mobileMenuDefaultOpen disabled />);
    cs = window.getComputedStyle(toggle as HTMLElement);
    expect(cs.backgroundColor.toLowerCase()).toBe("rgb(191, 191, 191)"); // disabled -> #bfbfbf
  });
});

describe("IconBtn - tooltip early return", () => {
  it("should early-return on mouseenter when tooltip is not provided (no tooltip root created)", async () => {
    // Arrange: render IconBtn without tooltip on desktop variant
    render(
      <IconBtn
        kind="primary"
        variant="desktop"
        size={48}
        radius={10}
        disabled={false}
        ariaLabel="No tooltip"
        testId="no-tip-btn"
      >
        <svg />
      </IconBtn>
    );

    // Act: hover should be a no-op because tooltip is undefined
    const btn = screen.getByTestId("no-tip-btn");
    const user = userEvent.setup();
    await user.hover(btn);
    await user.pointer({ keys: "[MouseMove]", target: btn });

    // Assert: no tooltip root exists (BodyTooltip is not rendered when tooltip prop is missing)
    expect(document.querySelector('#rcat-tooltip-root')).toBeNull();
  });
});