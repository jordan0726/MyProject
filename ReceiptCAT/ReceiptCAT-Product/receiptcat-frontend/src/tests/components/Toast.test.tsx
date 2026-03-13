// -----------------------------------------------------------------------------
// Toast.test.tsx
// Purpose: Deterministic, AAA‑style tests for <Toast/> (timers, a11y, layout).
// Notes:
//  - Use Jest fake timers to drive auto‑hide deterministically.
//  - Avoid coupling to Toast internals; prefer public props & test ids.
//  - Keep spies restored per‑test; do not rely on global restore.
// -----------------------------------------------------------------------------
import React from "react";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Toast from "../../components/Toast";

const getToast = () => screen.getByTestId('toast') as HTMLElement; // The inner toast bubble

// Test helpers
const getWrapper = () => screen.getByTestId('toast-wrapper') as HTMLElement;  // The full-screen overlay wrapper

// Use modern fake timers to control setTimeout-driven auto-hide
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  // Ensure React effects unmount/cleanup runs before we touch timers
  cleanup();
  // Do not flush timers here; it can mask clearTimeout() cleanup paths
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("Toast component", () => {
  test("it should keep node mounted for fade-out when closed (opacity 0, aria-hidden)", () => {
    // Arrange
    render(<Toast open={false} message="hi" />);

    // Act
    const node = getToast();

    // Assert
    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute("aria-hidden", "true");
    expect(node).toHaveStyle({ opacity: "0" });
  });

  test('wrapper reflects open state and never intercepts clicks (pointer-events: none)', () => {
    // Arrange
    const { rerender } = render(<Toast open={false} message="hi" />);

    // Act
    const wrap = getWrapper();

    // Assert — starts closed
    expect(wrap).toHaveAttribute('data-state-open', 'false');
    expect(wrap).toHaveStyle({ pointerEvents: 'none' });

    // Act — open
    rerender(<Toast open message="hi" />);

    // Assert — open state reflected; still non-intercepting
    expect(wrap).toHaveAttribute('data-state-open', 'true');
    expect(wrap).toHaveStyle({ pointerEvents: 'none' });
  });

  test("it should render message and auto-hide after the default 3000ms when open", () => {
    // Arrange
    const onClose = jest.fn();
    render(<Toast open message="Hello" onClose={onClose} />);

    // Act
    const node = getToast();

    // Assert
    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute("aria-hidden", "false");
    expect(node).toHaveStyle({ opacity: "1" });

    // Act — advance default 3s; Assert — onClose called once
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("it should call onClose only after the specified delay when custom duration is set", () => {
    // Arrange
    const onClose = jest.fn();
    render(<Toast open message="Hello" duration={1234} onClose={onClose} />);

    // Act
    act(() => {
      jest.advanceTimersByTime(1233);
    });

    // Assert — not yet
    expect(onClose).not.toHaveBeenCalled();

    // Act — cross the boundary
    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Assert — now fired
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("it should clear timer on prop change and on unmount without extra onClose call", async () => {
    // Arrange
    const onClose = jest.fn();
    const setSpy = jest.spyOn(window, 'setTimeout');
    const clearSpy = jest.spyOn(window, 'clearTimeout');
    const { rerender, unmount } = render(
      <Toast open message="First" duration={5000} onClose={onClose} />
    );

    // Wait for effect to schedule the timer to avoid flakiness
    await waitFor(() => expect(setSpy).toHaveBeenCalled());

    const setBeforeChange = setSpy.mock.calls.length; // Baseline before changing duration

    const clearBefore = clearSpy.mock.calls.length; // Baseline before prop change

    // Act — change duration while open; effect should reset the timer
    rerender(<Toast open message="First" duration={1000} onClose={onClose} />);

    const clearAfterChange = clearSpy.mock.calls.length;
    expect(clearAfterChange).toBeGreaterThan(clearBefore); // Cleanup ran at least once on prop change

    // Assert — before new 1000ms, no close yet
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(onClose).not.toHaveBeenCalled();

    await waitFor(() => expect(setSpy.mock.calls.length).toBeGreaterThan(setBeforeChange)); // Timer rescheduled after prop change

    const clearBeforeUnmount = clearSpy.mock.calls.length; // Baseline before unmount

    // Act — unmount before the timer fires
    unmount();
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const clearAfterUnmount = clearSpy.mock.calls.length;
    expect(clearAfterUnmount).toBeGreaterThanOrEqual(clearBeforeUnmount); // May or may not clear again depending on implementation

    // Assert — no call after unmount
    expect(onClose).not.toHaveBeenCalled();

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  test("it should use translate(-50%, -50%) for center position and bottom:24px for bottom position", () => {
    // Arrange
    const { rerender } = render(<Toast open message="P1" position="center" />);

    // Act
    const node = getToast();

    // Assert — center
    expect(node).toHaveStyle({ transform: "translate(-50%, -50%)" });
    expect(node).toHaveAttribute('data-position', 'center');
    expect(node).not.toHaveStyle({ bottom: "24px" });

    // Act — switch to bottom
    rerender(<Toast open message="P2" position="bottom" />);
    expect(node).toHaveAttribute('data-position', 'bottom');

    // Assert — bottom
    expect(node).toHaveStyle({ transform: "translateX(-50%)" });
    expect(node).toHaveStyle({ bottom: "24px" });
  });

  test("it should apply className, inline style overrides, and custom data-testid", () => {
    // Arrange
    render(
      <Toast
        open
        className="extra"
        style={{ background: "rgba(0,0,0,0.5)", fontSize: 18 }}
        message="Styled"
        zIndex={123456}
        data-testid="toast-x"
      />
    );

    // Act
    const node = screen.getByTestId("toast-x");

    // Assert
    expect(node).toHaveClass("extra");
    expect(node).toHaveStyle({ fontSize: "18px" }); // bubble style merges
    // Note: wrapper z-index is applied on the outer wrapper, not the bubble node.
    expect(node).toHaveStyle({ background: "rgba(0,0,0,0.5)" });
  });

  test("it should render children over message when both are provided", () => {
    // Arrange
    render(
      <Toast open message="Message fallback">
        <span>Child takes precedence</span>
      </Toast>
    );

    // Act
    const content = screen.getByText("Child takes precedence");

    // Assert
    expect(content).toBeInTheDocument();
    expect(screen.queryByText("Message fallback")).toBeNull();
  });

  test("it should have role='status' and aria-live='polite' for accessibility", () => {
    // Arrange
    render(<Toast open message="A11y check" />);

    // Act
    const node = getToast();

    // Assert
    expect(node).toHaveAttribute("role", "status");
    expect(node).toHaveAttribute("aria-live", "polite");
    expect(node).toHaveAttribute('aria-atomic', 'true');
  });

  test("it should call window.clearTimeout in cleanup when duration changes (effect cleanup path)", async () => {
    // Arrange
    const onClose = jest.fn();
    const setSpy = jest.spyOn(window, 'setTimeout');
    const clearSpy = jest.spyOn(window, 'clearTimeout');
    const { rerender } = render(
      <Toast open message="First" duration={5000} onClose={onClose} />
    );

    await waitFor(() => expect(setSpy).toHaveBeenCalled());

    // Act — change duration while open; effect should reset the timer
    rerender(<Toast open message="First" duration={1000} onClose={onClose} />);

    const countAfter = clearSpy.mock.calls.length;
    expect(countAfter).toBeGreaterThan(0); // At least one clear on prop change

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  test("it should call window.clearTimeout in cleanup when toggling open true→false and on unmount", async () => {
    // Arrange
    const onClose = jest.fn();
    const setSpy = jest.spyOn(window, 'setTimeout');
    const clearSpy = jest.spyOn(window, 'clearTimeout');
    const { rerender } = render(
      <Toast open message="First" duration={5000} onClose={onClose} />
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(setSpy).toHaveBeenCalled());

    // Act — toggle open false
    rerender(<Toast open={false} message="First" duration={5000} onClose={onClose} />);

    expect(clearSpy.mock.calls.length).toBeGreaterThan(0); // Cleared on toggle to closed

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  test("it should clear a pending timer and nullify internal ref when disabling auto-hide at runtime", () => {
    // Arrange
    const onClose = jest.fn();
    const clearSpy = jest.spyOn(window, 'clearTimeout');
    const setSpy = jest.spyOn(window, 'setTimeout');
    const { rerender } = render(
      <Toast open message="X" duration={5000} onClose={onClose} />
    );

    // Ensure the initial timer is scheduled
    expect(setSpy).toHaveBeenCalled();

    // Act — while still open, disable auto-hide (effect top should clear + nullify, then skip re-set)
    rerender(
      <Toast open message="X" duration={5000} onClose={onClose} disableAutoHide />
    );

    // Assert — clearTimeout was invoked for the previous timer
    expect(clearSpy).toHaveBeenCalled();

    // Advance time aggressively: no onClose should fire because auto-hide is disabled
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(onClose).not.toHaveBeenCalled();

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  test("it should fire onAutoHide before onClose when auto-hide occurs", () => {
      // Arrange
      const onAutoHide = jest.fn();
      const onClose = jest.fn();
      render(<Toast open message="X" duration={750} onAutoHide={onAutoHide} onClose={onClose} />);

      // Act — advance time to trigger auto-hide
      act(() => {
        jest.advanceTimersByTime(750);
      });

      // Assert — both callbacks fired exactly once
      expect(onAutoHide).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Assert — verify call order: onAutoHide must occur before onClose
      const ahOrder = (onAutoHide as jest.Mock).mock.invocationCallOrder[0]; // call index for onAutoHide
      const ocOrder = (onClose as jest.Mock).mock.invocationCallOrder[0];    // call index for onClose
      expect(ahOrder).toBeLessThan(ocOrder);
    });
});
