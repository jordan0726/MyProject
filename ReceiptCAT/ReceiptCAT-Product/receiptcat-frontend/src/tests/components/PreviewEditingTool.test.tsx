// ============================================================
// ============ ReceiptCAT — Preview Editing Canvas ===========
// Unit tests for the UI-only wrapper: ImageEditingCanvas.
// All business logic/state come from usePreviewEditingCore and
// are mocked here to drive UI branches deterministically.
// ============================================================

import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import ImageEditingCanvas, { type EditingToolHandle } from "../../components/PreviewEditingTool";

// ---------- Test doubles & utilities ----------

// Capture the latest props passed into the mocked <Cropper> so we can invoke callbacks
let lastCropperProps: any = null;

// Mock react-cropper so we don't bring in the real library (lighter, deterministic)
jest.mock("react-cropper", () => {
  const Mock: React.FC<any> = (props) => {
    lastCropperProps = props; // Record props for assertions and to call back later
    return <div data-testid="editing-canvas" />;
  };
  return { __esModule: true, default: Mock };
});

// Mock the core hook and re-export a handle we can mutate per test
jest.mock("../../features/upload/usePreviewEditingCore", () => ({
  __esModule: true,
  usePreviewEditingCore: jest.fn(),
}));
import { usePreviewEditingCore } from "../../features/upload/usePreviewEditingCore";

// Test helper to ensure rerenders commit effects synchronously // inline comment
const commitRerender = (ui: React.ReactElement, rerender: (ui: React.ReactElement) => void) => {
  act(() => {
    rerender(ui);
  });
};

// Helpers: query elements in a consistent way
const getOverlay = () => screen.getByTestId("blackout-overlay") as HTMLElement; // Blackout overlay root
const getCursorHint = (): HTMLElement => screen.getByTestId("editing-cursor-hint"); // Stable selector // inline comment

// Factory: create a new core shape for each test (mutable, with jest fns)
const makeCore = () => {
  const core = {
    // Refs expected by the UI layer
    cropperRef: { current: null as null | { cropper: any } },
    overlayRef: React.createRef<HTMLDivElement>(),

    // State flags
    isCropMode: false,
    isBlackoutMode: false,

    // Blackout rectangles (committed + draft)
    blackouts: [] as Array<{ x: number; y: number; w: number; h: number }>,
    draftRect: null as null | { x: number; y: number; w: number; h: number },

    // Imperative handlers exposed by the core
    fitToBounds: jest.fn(),
    enableCropMode: jest.fn(),
    disableCropModeAndApply: jest.fn(),
    enableBlackoutMode: jest.fn(),
    cancelBlackoutMode: jest.fn(),
    disableBlackoutModeAndApply: jest.fn(),

    // Pointer handlers for blackout overlay
    handlePointerDown: jest.fn(),
    handlePointerMove: jest.fn(),
    handlePointerUp: jest.fn(),
    finalizeDraft: jest.fn(),
  };
  return core;
};

// Clean up any global/test-level state between tests
afterEach(() => {
  cleanup(); // Ensure effects cleanup (like refs/state) runs deterministically between tests // inline comment
  jest.clearAllMocks();
  lastCropperProps = null;
});

// Common props for rendering the UI shell
const baseProps = {
  image: "blob:fake",
  fileName: "out.png",
};

// ============================================================
// Tests
// ============================================================
describe("ImageEditingCanvas — UI wrapper", () => {
  it("should render root & mocked cropper, merge base styles, and forward root attributes", () => {
    // Arrange
    const core = makeCore();
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    render(
      <ImageEditingCanvas
        {...baseProps}
        id="root-id"                     // forwarded via ...restDiv
        className="extra-class"          // forwarded via ...restDiv
        data-x="y"                       // forwarded via ...restDiv
        role="region"                    // forwarded via ...restDiv
        aria-label="editing root"        // forwarded via ...restDiv
        style={{ width: 320 }}           // merged with base styles
      />
    );

    // Assert
    const root = screen.getByTestId("editing-tool-root");
    expect(root).toHaveAttribute("id", "root-id");
    expect(root).toHaveClass("extra-class");
    expect(root).toHaveAttribute("data-x", "y");
    expect(root).toHaveAttribute("role", "region");
    expect(root).toHaveAttribute("aria-label", "editing root");
    expect((root as HTMLElement).style.userSelect).toBe("none"); // base style merged
    expect(root.getAttribute("lang")).toBe("zxx");               // static attr
    expect(root.getAttribute("translate")).toBe("no");           // static attr

    // And the cropper canvas is present (mocked)
    expect(screen.getByTestId("editing-canvas")).toBeInTheDocument();
  });

  it("should expose an imperative API that delegates directly to core handlers", () => {
    // Arrange
    const core = makeCore();
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);
    const ref = React.createRef<EditingToolHandle>();

    // Act
    render(<ImageEditingCanvas {...baseProps} ref={ref} />);

    // Assert
    ref.current?.fitToBounds();
    expect(core.fitToBounds).toHaveBeenCalledTimes(1);

    ref.current?.enableCropMode();
    expect(core.enableCropMode).toHaveBeenCalledTimes(1);

    ref.current?.disableCropModeAndApply();
    expect(core.disableCropModeAndApply).toHaveBeenCalledTimes(1);

    ref.current?.enableBlackoutMode();
    expect(core.enableBlackoutMode).toHaveBeenCalledTimes(1);

    ref.current?.cancelBlackoutMode();
    expect(core.cancelBlackoutMode).toHaveBeenCalledTimes(1);

    ref.current?.disableBlackoutModeAndApply();
    expect(core.disableBlackoutModeAndApply).toHaveBeenCalledTimes(1);
  });

  it("should set Cropper.dragMode = 'crop' only when core.isCropMode = true", () => {
    // Arrange
    const core = makeCore();
    core.isCropMode = false;
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    const { rerender } = render(<ImageEditingCanvas {...baseProps} />);

    // Assert
    expect(lastCropperProps?.dragMode).toBe("none");

    // Act
    core.isCropMode = true;
    commitRerender(<ImageEditingCanvas {...baseProps} />, rerender);

    // Assert
    expect(lastCropperProps?.dragMode).toBe("crop");
  });

  it("should map aspectRatio: 'free' -> NaN; numeric -> same value", () => {
    // Arrange
    const core = makeCore();
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    render(<ImageEditingCanvas {...baseProps} aspectRatio="free" />);
    // Assert
    expect(Number.isNaN(lastCropperProps.aspectRatio)).toBe(true);

    // Act
    render(<ImageEditingCanvas {...baseProps} aspectRatio={1.5} />);
    // Assert
    expect(lastCropperProps.aspectRatio).toBe(1.5);
  });

  it("should wire crop callback: no-op when onCropStateChange is undefined", () => {
    // Arrange
    const core = makeCore();
    core.cropperRef.current = {
      cropper: {
        getData: jest.fn(() => ({ a: 1 })),
        getCropBoxData: jest.fn(() => ({ b: 2 })),
      },
    };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    render(<ImageEditingCanvas {...baseProps} />);
    lastCropperProps.crop();

    // Assert
    expect(core.cropperRef.current.cropper.getData).not.toHaveBeenCalled();
  });

  it("should wire crop callback: lift crop state when onCropStateChange is provided", () => {
    // Arrange
    const core = makeCore();
    core.cropperRef.current = {
      cropper: {
        getData: jest.fn(() => ({ a: 1 })),
        getCropBoxData: jest.fn(() => ({ b: 2 })),
      },
    };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);
    const onCropStateChange = jest.fn();

    // Act
    render(<ImageEditingCanvas {...baseProps} onCropStateChange={onCropStateChange} />);
    lastCropperProps.crop();

    // Assert
    expect(onCropStateChange).toHaveBeenCalledWith({ data: { a: 1 }, cropBox: { b: 2 } });
  });

  it("should guard in ready callback when cropper is missing (early return)", () => {
    // Arrange
    const core = makeCore();
    core.cropperRef.current = null;
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    render(<ImageEditingCanvas {...baseProps} restoreState={{ data: { x: 1 }, cropBox: { left: 2 } }} />);
    lastCropperProps.ready();

    // Assert
    expect(true).toBe(true);
  });

  it("should not apply restoreState in ready callback when restoreState is not provided", () => {
    // Arrange
    const core = makeCore();
    const setData = jest.fn();
    const setCropBoxData = jest.fn();
    core.cropperRef.current = { cropper: { setData, setCropBoxData } };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    render(<ImageEditingCanvas {...baseProps} />);
    lastCropperProps.ready();

    // Assert
    expect(setData).not.toHaveBeenCalled();
    expect(setCropBoxData).not.toHaveBeenCalled();
  });

  it("should apply restoreState.data and restoreState.cropBox in ready callback when both are present", () => {
    // Arrange
    const core = makeCore();
    const setData = jest.fn();
    const setCropBoxData = jest.fn();
    core.cropperRef.current = { cropper: { setData, setCropBoxData } };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    const restoreState = { data: { x: 10 }, cropBox: { left: 20 } };

    // Act
    render(<ImageEditingCanvas {...baseProps} restoreState={restoreState} />);
    lastCropperProps.ready();

    // Assert
    expect(setData).toHaveBeenCalledWith(restoreState.data);
    expect(setCropBoxData).toHaveBeenCalledWith(restoreState.cropBox);
  });

  it("should apply only restoreState.data in ready callback when cropBox is absent", () => {
    // Arrange
    const core = makeCore();
    const setData = jest.fn();
    const setCropBoxData = jest.fn();
    core.cropperRef.current = { cropper: { setData, setCropBoxData } };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    const restoreState = { data: { x: 99 } };

    // Act
    render(<ImageEditingCanvas {...baseProps} restoreState={restoreState} />);
    lastCropperProps.ready();

    // Assert
    expect(setData).toHaveBeenCalledWith(restoreState.data);
    expect(setCropBoxData).not.toHaveBeenCalled();
  });

  it("should apply only restoreState.cropBox in ready callback when data is absent", () => {
    // Arrange
    const core = makeCore();
    const setData = jest.fn();
    const setCropBoxData = jest.fn();
    core.cropperRef.current = { cropper: { setData, setCropBoxData } };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    const restoreState = { cropBox: { left: 123 } };

    // Act
    render(<ImageEditingCanvas {...baseProps} restoreState={restoreState} />);
    lastCropperProps.ready();

    // Assert
    expect(setData).not.toHaveBeenCalled();
    expect(setCropBoxData).toHaveBeenCalledWith(restoreState.cropBox);
  });

  it("should silently swallow exceptions from setData/setCropBoxData in ready callback", () => {
    // Arrange
    const core = makeCore();
    const setData = jest.fn(() => { throw new Error("boom"); });
    const setCropBoxData = jest.fn(() => { throw new Error("boom2"); });
    core.cropperRef.current = { cropper: { setData, setCropBoxData } };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    const restoreState = { data: { x: 10 }, cropBox: { left: 20 } };

    // Act
    render(<ImageEditingCanvas {...baseProps} restoreState={restoreState} />);
    // Assert
    expect(() => lastCropperProps.ready()).not.toThrow();
  });

  it("should toggle blackout overlay interactivity and aria-hidden with core.isBlackoutMode", () => {
    // Arrange
    const core = makeCore();
    core.isBlackoutMode = false;
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);
    const { rerender } = render(<ImageEditingCanvas {...baseProps} />);

    // Assert
    const overlay = getOverlay();
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect((overlay as HTMLElement).style.pointerEvents).toBe("none");
    expect((overlay as HTMLElement).style.cursor).toBe("default");

    // Act
    core.isBlackoutMode = true;
    commitRerender(<ImageEditingCanvas {...baseProps} />, rerender);

    // Assert
    expect(overlay).toHaveAttribute("aria-hidden", "false");
    expect((overlay as HTMLElement).style.pointerEvents).toBe("auto");
    expect((overlay as HTMLElement).style.cursor).toBe("crosshair");
  });

  it("should wire blackout overlay pointer events to core handlers and finalizeDraft on leave/cancel", () => {
    // Arrange
    const core = makeCore();
    core.isBlackoutMode = true;
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);
    render(<ImageEditingCanvas {...baseProps} />);
    const overlay = getOverlay();

    // Act
    fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 20 });
    fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 20, clientY: 30 });
    fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 20, clientY: 30 });
    fireEvent.pointerLeave(overlay, { pointerId: 1 });
    fireEvent.pointerCancel(overlay, { pointerId: 1 });

    // Assert
    expect(core.handlePointerDown).toHaveBeenCalledTimes(1);
    expect(core.handlePointerMove).toHaveBeenCalledTimes(1);
    expect(core.handlePointerUp).toHaveBeenCalledTimes(1);
    expect(core.finalizeDraft).toHaveBeenCalledTimes(2);
    const calls = (core.finalizeDraft as jest.Mock).mock.calls;
    expect(calls[0][0]).toBeInstanceOf(HTMLElement);
    expect(calls[1][0]).toBeInstanceOf(HTMLElement);
  });

  it("should render committed blackout rectangles from core.blackouts", () => {
    // Arrange
    const core = makeCore();
    core.isBlackoutMode = true;
    core.blackouts = [{ x: 10, y: 12, w: 40, h: 50 }];
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    render(<ImageEditingCanvas {...baseProps} />);

    // Assert
    const overlay = screen.getByTestId("blackout-overlay");
    const rect = Array.from(overlay.querySelectorAll("div")).find((el) => {
      const st = (el as HTMLElement).style;
      return st.left === "10px" && st.top === "12px" && st.width === "40px" && st.height === "50px";
    });
    expect(rect).toBeTruthy();
  });

  it("should render a draft rectangle when core.draftRect is present", () => {
    // Arrange
    const core = makeCore();
    core.isBlackoutMode = true;
    core.draftRect = { x: 5, y: 6, w: 7, h: 8 };
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);

    // Act
    render(<ImageEditingCanvas {...baseProps} />);

    // Assert
    const overlay = screen.getByTestId("blackout-overlay");
    const draft = Array.from(overlay.querySelectorAll("div")).find((el) => {
      const st = (el as HTMLElement).style;
      return st.left === "5px" && st.top === "6px" && st.width === "7px" && st.height === "8px";
    });
    expect(draft).toBeTruthy();
  });

  it("should show the crosshair cursor hint overlay only in crop mode (not tied to overlay)", () => {
    // Arrange
    const core = makeCore();
    core.isCropMode = false;
    (usePreviewEditingCore as jest.Mock).mockReturnValue(core);
    const { rerender } = render(<ImageEditingCanvas {...baseProps} />);

    // Assert
    const cursorHint = getCursorHint();
    expect(cursorHint).toBeTruthy();
    expect(cursorHint.style.cursor).toBe("default");

    // Act
    core.isCropMode = true;
    commitRerender(<ImageEditingCanvas {...baseProps} />, rerender);

    // Assert
    const cursorHint2 = getCursorHint();
    expect(cursorHint2).toBeTruthy();
    expect(cursorHint2.style.cursor).toBe("crosshair");
  });
});
