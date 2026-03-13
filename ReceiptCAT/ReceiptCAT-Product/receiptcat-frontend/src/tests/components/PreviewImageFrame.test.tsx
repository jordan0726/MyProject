import React, { createRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PreviewImageFrame } from "../../components/PreviewImageFrame";

// --- Module Mocks (kept local to this file to avoid cross-test pollution) ---
// Mock the icon component to a lightweight svg element
jest.mock("@mdi/react", () => ({ __esModule: true, default: (props: any) => (
  <svg data-testid="mdi-icon" {...props} />
)}));
// Provide a stable path string for the icon (not used functionally in tests)
jest.mock("@mdi/js", () => ({ mdiRefresh: "M0 0L10 10" }));

// Mock ImageEditingCanvas so we can deterministically trigger onEditOutput
// It renders two helper buttons to simulate success and error flows.
jest.mock("../../components/PreviewEditingTool", () => ({
  __esModule: true,
  // ForwardRef signature is not required for this mock since tests do not call ref methods
  ImageEditingCanvas: (props: any) => (
    <div data-testid="mock-canvas">
      <button
        type="button"
        data-testid="mock-canvas-apply"
        onClick={async () => {
          const fake = new File(["abc"], "edited.jpg", { type: "image/jpeg" }); // Fake edited file
          await props.onEditOutput(fake); // Invoke success path
        }}
      >apply</button>
      <button
        type="button"
        data-testid="mock-canvas-error"
        onClick={async () => {
          const fake = new File(["abc"], "edited.jpg", { type: "image/jpeg" }); // Fake edited file
          await props.onEditOutput(fake); // Let tests force failure by making onApplyEdit reject
        }}
      >error</button>
    </div>
  ),
}));

// Common props factory to keep tests focused
function makeProps(overrides: Partial<React.ComponentProps<typeof PreviewImageFrame>> = {}) {
  const fileInputRef = createRef<HTMLInputElement>(); // Hidden input ref used by the component
  const editingRef = createRef<any>(); // Not used by the mock, but required prop

  const base: React.ComponentProps<typeof PreviewImageFrame> = {
    fileName: "receipt.jpg",
    fileSizeLabel: "1.23 MB",
    maxSizeMB: 5,
    image: "blob:https://example/preview",
    editingRef,
    onApplyEdit: jest.fn(async () => {}),
    fileInputRef,
    disabled: false,
    onReselectFile: jest.fn(),
  };
  return { ...base, ...overrides };
}

describe("<PreviewImageFrame />", () => {
  afterEach(() => {
    jest.restoreAllMocks(); // Restore spies and mocks to avoid leaking across tests
  });

  it("should render header info and region with default test ids", () => {
    // Arrange
    const props = makeProps();

    // Act
    render(<PreviewImageFrame {...props} />);

    // Assert
    expect(screen.getByTestId("preview-filename")).toHaveTextContent("receipt.jpg");
    expect(screen.getByTestId("preview-file-size")).toHaveTextContent("1.23 MB");
    expect(screen.getByTestId("preview-max-size")).toHaveTextContent("5");
    expect(screen.getByRole("region", { name: /receipt preview/i })).toBeInTheDocument();
    expect(screen.getByTestId("mdi-icon")).toBeInTheDocument(); // Icon is rendered via mock
  });

  it("should support overriding test ids for isolation", () => {
    // Arrange
    const props = makeProps({
      testIds: {
        container: "frame",
        fileName: "fname",
        fileSize: "fsize",
        maxSize: "max",
        reselect: "btn",
        input: "file-input",
      },
    });

    // Act
    render(<PreviewImageFrame {...props} />);

    // Assert
    expect(screen.getByTestId("fname")).toHaveTextContent("receipt.jpg");
    expect(screen.getByTestId("fsize")).toHaveTextContent("1.23 MB");
    expect(screen.getByTestId("max")).toHaveTextContent("5");
    expect(screen.getByTestId("frame")).toHaveAttribute("role", "region");
    expect(screen.getByTestId("btn")).toBeInTheDocument();
    expect(screen.getByTestId("file-input")).toHaveAttribute("type", "file");
  });

  it("should support partial testIds: override provided keys and fall back for missing ones", () => {
    // Arrange: only override fileName; leave others undefined so defaults should be used
    const props = makeProps({
      testIds: {
        fileName: "fname-only",
        // container/fileSize/maxSize/reselect/input are intentionally omitted
      },
    });

    // Act
    render(<PreviewImageFrame {...props} />);

    // Assert — provided key uses custom id
    expect(screen.getByTestId("fname-only")).toHaveTextContent("receipt.jpg");

    // Assert — missing keys fall back to defaults
    expect(screen.getByTestId("preview-file-size")).toHaveTextContent("1.23 MB");
    expect(screen.getByTestId("preview-max-size")).toHaveTextContent("5");
    expect(screen.getByTestId("preview-image-container")).toBeInTheDocument();
    expect(screen.getByTestId("reselect-button")).toBeInTheDocument();
    expect(screen.getByTestId("reselect-input")).toHaveAttribute("type", "file");
  });

  it("should trigger hidden input click when reselect button is clicked and enabled", async () => {
    // Arrange
    const fileInputRef = createRef<HTMLInputElement>();
    const props = makeProps({ fileInputRef });

    render(<PreviewImageFrame {...props} />);
    const user = userEvent.setup();

    // Attach a real input node to the ref so we can spy on click()
    const input = screen.getByTestId("reselect-input") as HTMLInputElement;
    fileInputRef.current = input;
    const clickSpy = jest.spyOn(input, "click");

    // Act
    await user.click(screen.getByTestId("reselect-button"));

    // Assert
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("should prevent interaction and set aria-disabled when disabled", () => {
    // Arrange
    const props = makeProps({ disabled: true });

    // Act
    render(<PreviewImageFrame {...props} />);

    // Assert
    const btn = screen.getByTestId("reselect-button");
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).toBeDisabled();
  });

  it("should delegate file input change to onReselectFile handler", async () => {
    // Arrange
    const onReselectFile = jest.fn();
    const props = makeProps({ onReselectFile });
    render(<PreviewImageFrame {...props} />);
    const user = userEvent.setup();

    const input = screen.getByTestId("reselect-input") as HTMLInputElement;

    // Act
    await user.upload(input, new File(["x"], "new.jpg", { type: "image/jpeg" }));

    // Assert
    const evt = onReselectFile.mock.calls[0][0] as React.ChangeEvent<HTMLInputElement>; // React SyntheticEvent wrapper
    expect(evt).toHaveProperty("target.files");
    expect(evt.target.files?.[0]).toBeInstanceOf(File);
    expect(evt.target.files?.[0]?.name).toBe("new.jpg");
  });

  it("should call onApplyEdit with edited file on onEditOutput success", async () => {
    // Arrange
    const onApplyEdit = jest.fn(async () => {});
    const props = makeProps({ onApplyEdit });
    render(<PreviewImageFrame {...props} />);
    const user = userEvent.setup();

    // Act
    await user.click(screen.getByTestId("mock-canvas-apply"));

    // Assert
    // Wait for async handler inside mock canvas
    expect(onApplyEdit).toHaveBeenCalledTimes(1);
    const arg = (onApplyEdit as jest.Mock).mock.calls[0][0]; // Read first argument from first call (typed via jest.Mock to satisfy TS)
    expect(arg).toBeInstanceOf(File);
    expect((arg as File).name).toBe("edited.jpg");
  });

  it("should prefer onEditError over alert on onEditOutput failure", async () => {
    // Arrange
    const onApplyEdit = jest.fn(() => Promise.reject(new Error("boom"))); // Reject async to ensure catch path without bubbling
    const onEditError = jest.fn();
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    const props = makeProps({ onEditError, onApplyEdit });
    render(<PreviewImageFrame {...props} />);
    const user = userEvent.setup();

    // Act
    await user.click(screen.getByTestId("mock-canvas-error"));

    // Assert
    await waitFor(() => expect(onEditError).toHaveBeenCalledTimes(1));
    const errArg = (onEditError as jest.Mock).mock.calls[0][0]; // First argument passed to onEditError
    expect(errArg).toBeInstanceOf(Error);
    expect((errArg as Error).message).toBe("boom");
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("should fall back to alert when no onEditError is provided on onEditOutput failure", async () => {
    // Arrange
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const onApplyEdit = jest.fn(() => Promise.reject(new Error("boom"))); // Reject async to ensure catch path without bubbling
    const props = makeProps({ onApplyEdit });
    render(<PreviewImageFrame {...props} />);
    const user = userEvent.setup();

    // Act
    await user.click(screen.getByTestId("mock-canvas-error"));

    // Assert
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(errorSpy).toHaveBeenCalled();
  });
});