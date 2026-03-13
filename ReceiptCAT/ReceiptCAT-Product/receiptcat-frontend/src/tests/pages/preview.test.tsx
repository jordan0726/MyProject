import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreviewPage from "../../pages/app/preview";

// Mock next/router with shared spies so tests can assert without require()
const pushMock = jest.fn();
const replaceMock = jest.fn();
jest.mock("next/router", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

// Mock mdi/react and mdi paths to avoid SVG noise
jest.mock("@mdi/react", () => ({ __esModule: true, default: (props: any) => <svg data-testid="mdi-icon" {...props} /> }));
jest.mock("@mdi/js", () => ({ mdiArrowLeft: "M-left", mdiUpload: "M-up" }));

// Mock AppLayout to a simple wrapper (keeps children intact)
jest.mock("../../layouts/AppLayout", () => ({ __esModule: true, default: ({ children }: any) => <div data-testid="app-layout">{children}</div> }));

// Mock Toast to an inspectable shell we can control via a button
jest.mock("../../components/Toast", () => ({
  __esModule: true,
  default: ({ open, onClose }: { open: boolean; onClose?: () => void }) => (
    <div data-testid="toast" data-open={open ? "true" : "false"}>
      <button type="button" onClick={onClose} data-testid="toast-close">close</button>
    </div>
  ),
}));

// Capture editingRef usage via the mocked PreviewImageFrame
let lastEditingRef: React.RefObject<any> | null = null;

jest.mock("../../components/PreviewImageFrame", () => ({
  __esModule: true,
  PreviewImageFrame: (props: any) => {
    lastEditingRef = props.editingRef; // Expose ref for tests
    return (
      <div data-testid="preview-image-frame">
        <button data-testid="frame-apply" onClick={() => props.onApplyEdit(new File(["x"], "out.jpg", { type: "image/jpeg" }))}>apply</button>
        <button data-testid="frame-reselect" onClick={() => props.onReselectFile({ target: { files: [new File(["y"], "new.jpg", { type: "image/jpeg" })], value: "" } } as any)}>reselect</button>
      </div>
    );
  },
  default: (props: any) => <div {...props} />, // Unused default export safeguard
}));

// Mock ImageEditingButton to expose hooks for crop/blackout/reset flows
jest.mock("../../components/PreviewEditingButton", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid={`editing-button-${props.variant}`}>
      <button data-testid={`btn-${props.variant}-enable-crop`} onClick={props.onEnableCropMode}>enable-crop</button>
      <button data-testid={`btn-${props.variant}-apply-crop`} onClick={props.onDisableCropModeAndApply}>apply-crop</button>
      <button data-testid={`btn-${props.variant}-enable-blackout`} onClick={props.onEnableBlackout}>enable-blackout</button>
      <button data-testid={`btn-${props.variant}-apply-blackout`} onClick={props.onDisableBlackout}>apply-blackout</button>
      <button data-testid={`btn-${props.variant}-reset`} onClick={props.onReset}>reset</button>
    </div>
  ),
}));

// Controller hook mock with a mutable stub that tests can override per case
type Ctl = ReturnType<typeof makeControllerDefaults>;
const makeControllerDefaults = () => ({
  previewUrl: "blob:preview",
  fileName: "receipt.jpg",
  fileSizeLabel: "1.23 MB",
  isUploading: false,
  error: null as string | null,
  isFileTypeValid: true,
  confirmLabel: "Confirm Upload",
  onConfirm: jest.fn(async () => true),
  onBack: jest.fn(),
  onReselectFile: jest.fn(),
  storeCropped: jest.fn(async () => {}),
  resetToOriginal: jest.fn(),
  isRouting: false,
});

let ctl: Ctl = makeControllerDefaults();

jest.mock("../../features/upload/usePreviewPageController", () => ({
  __esModule: true,
  usePreviewPageController: () => ctl,
  MAX_FILE_SIZE_MB: 5,
}));

// Test-only helpers for seeding the editingRef with a concrete handle
const createEditingHandle = () => ({
  enableCropMode: jest.fn(),
  disableCropModeAndApply: jest.fn(),
  enableBlackoutMode: jest.fn(),
  disableBlackoutModeAndApply: jest.fn(),
  cancelBlackoutMode: jest.fn(),
  fitToBounds: jest.fn(),
});

const seedEditingHandle = (handle: ReturnType<typeof createEditingHandle>) => {
  if (lastEditingRef) {
    (lastEditingRef as any).current = handle; // Attach the mock handle to the ref used by the page
  }
};

// Helpers
const setup = () => {
  const user = userEvent.setup();
  const utils = render(<PreviewPage />);
  return { user, ...utils };
};

afterEach(() => {
  jest.restoreAllMocks(); // Restore all mocks
  jest.clearAllMocks();   // Clear call history
  ctl = makeControllerDefaults(); // Reset controller defaults for next test
  lastEditingRef = null;
});

describe("<PreviewPage />", () => {
  it("should render nothing when previewUrl or fileName is missing", () => {
    // Arrange
    ctl.previewUrl = null as any;
    const { container } = setup();
    // Act
    // (no interaction)
    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it("should render error banner when file type is invalid and call onBack on click", async () => {
    // Arrange
    ctl.isFileTypeValid = false;
    ctl.isUploading = false;
    ctl.isRouting = false;
    const { user } = setup();
    // Act
    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));
    // Assert
    expect(screen.getByTestId("preview-error")).toBeInTheDocument();
    expect(ctl.onBack).toHaveBeenCalledTimes(1);
  });

  it("should render main page and pass labels into confirm button", () => {
    // Arrange
    ctl.confirmLabel = "Confirm Upload";
    setup();
    // Act
    // (no interaction)
    // Assert
    expect(screen.getByTestId("preview-confirm")).toHaveTextContent("Confirm Upload");
    expect(screen.getByTestId("preview-back")).toBeInTheDocument();
    expect(screen.getByTestId("preview-image-frame")).toBeInTheDocument();
  });

  it("should disable confirm when uploading is true", () => {
    // Arrange
    ctl.isUploading = true;
    setup();
    // Act
    // (no interaction)
    // Assert
    expect(screen.getByTestId("preview-confirm")).toBeDisabled();
  });

  it("should toggle cropActive via editing buttons and disable/enable confirm accordingly", async () => {
    // Arrange
    const { user } = setup();
    const confirm = screen.getByTestId("preview-confirm");
    const handle = createEditingHandle();
    seedEditingHandle(handle);

    // Act
    await user.click(screen.getByTestId("btn-desktop-enable-crop"));
    // Assert
    expect(handle.enableCropMode).toHaveBeenCalledTimes(1); // Child API was invoked (desktop)
    expect(confirm).toBeDisabled(); // cropActive=true disables confirm

    // Act – trigger the same path via the mobile variant to ensure both handlers are covered
    await user.click(screen.getByTestId("btn-mobile-enable-crop"));
    // Assert – setCropActive(true) path is exercised again via mobile
    expect(handle.enableCropMode).toHaveBeenCalledTimes(2);
    expect(confirm).toBeDisabled();

    // Act – apply crop via desktop (covers disableCropModeAndApply and resets state)
    await user.click(screen.getByTestId("btn-desktop-apply-crop"));
    // Assert
    expect(handle.disableCropModeAndApply).toHaveBeenCalledTimes(1); // Child API apply called
    expect(confirm).not.toBeDisabled();

    // Act – apply crop via mobile variant to cover the other handler
    await user.click(screen.getByTestId("btn-mobile-apply-crop"));
    // Assert – the child API apply should be called a second time
    expect(handle.disableCropModeAndApply).toHaveBeenCalledTimes(2);
    expect(confirm).not.toBeDisabled();
  });

  it("should call storeCropped and clear cropActive when onApplyEdit fires", async () => {
    // Arrange
    const { user } = setup();
    await user.click(screen.getByTestId("btn-desktop-enable-crop"));
    expect(screen.getByTestId("preview-confirm")).toBeDisabled();
    // Act
    await user.click(screen.getByTestId("frame-apply"));
    // Assert
    expect(ctl.storeCropped).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("preview-confirm")).not.toBeDisabled();
  });

  it("should delegate reselect to controller onReselectFile", async () => {
    // Arrange
    const { user } = setup();
    // Act – click the reselect button exposed by the mocked frame
    await user.click(screen.getByTestId("frame-reselect"));
    // Assert
    expect(ctl.onReselectFile).toHaveBeenCalledTimes(1);
  });

  it("should toggle blackoutActive via editing buttons and disable/enable confirm accordingly", async () => {
    // Arrange
    const { user } = setup();
    const confirm = screen.getByTestId("preview-confirm");
    const handle = createEditingHandle();
    seedEditingHandle(handle);

    // Act – enable blackout (desktop)
    await user.click(screen.getByTestId("btn-desktop-enable-blackout"));
    // Assert
    expect(handle.enableBlackoutMode).toHaveBeenCalledTimes(1); // Child API invoked (desktop)
    expect(confirm).toBeDisabled();

    // Act – enable blackout (mobile) to cover both paths
    await user.click(screen.getByTestId("btn-mobile-enable-blackout"));
    // Assert
    expect(handle.enableBlackoutMode).toHaveBeenCalledTimes(2); // Child API invoked (mobile)
    expect(confirm).toBeDisabled();

    // Act – apply blackout (desktop)
    await user.click(screen.getByTestId("btn-desktop-apply-blackout"));
    // Assert
    expect(handle.disableBlackoutModeAndApply).toHaveBeenCalledTimes(1);
    expect(confirm).not.toBeDisabled();

    // Act – apply blackout (mobile) to cover both paths
    await user.click(screen.getByTestId("btn-mobile-apply-blackout"));
    // Assert
    expect(handle.disableBlackoutModeAndApply).toHaveBeenCalledTimes(2);
    expect(confirm).not.toBeDisabled();
  });

  it("should reset editing (cancel blackout, exit crop, fit to bounds, resetToOriginal) when reset is clicked", async () => {
    // Arrange
    const { user } = setup();
    const handle = createEditingHandle();
    seedEditingHandle(handle);
    await user.click(screen.getByTestId("btn-desktop-enable-blackout"));
    // Act
    await user.click(screen.getByTestId("btn-desktop-reset"));
    // Assert
    expect(handle.cancelBlackoutMode).toHaveBeenCalledTimes(1);
    expect(handle.fitToBounds).toHaveBeenCalledTimes(1);
    expect(ctl.resetToOriginal).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("preview-confirm")).not.toBeDisabled();
  });

  it("should reset when blackout is inactive without calling cancelBlackoutMode", async () => {
    // Arrange
    const { user } = setup();
    const handle = createEditingHandle();
    seedEditingHandle(handle);
    // Act – directly reset without enabling blackout first
    await user.click(screen.getByTestId("btn-desktop-reset"));
    // Assert – no cancel, but fitToBounds + resetToOriginal are called
    expect(handle.cancelBlackoutMode).not.toHaveBeenCalled();
    expect(handle.fitToBounds).toHaveBeenCalledTimes(1);
    expect(ctl.resetToOriginal).toHaveBeenCalledTimes(1);
  });

  it("should open toast on successful confirm and navigate to history on toast close", async () => {
    // Arrange
    ctl.onConfirm = jest.fn(async () => true);
    const { user } = setup();
    // Act
    await user.click(screen.getByTestId("preview-confirm"));
    // Assert
    expect(ctl.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("toast")).toHaveAttribute("data-open", "true");
    // Act
    await user.click(screen.getByTestId("toast-close"));
    // Assert
    expect(pushMock).toHaveBeenCalledWith("/app/history");
  });

  it("should not open toast when confirm returns false", async () => {
    // Arrange
    ctl.onConfirm = jest.fn(async () => false);
    const { user } = setup();
    // Act
    await user.click(screen.getByTestId("preview-confirm"));
    // Assert
    expect(ctl.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("toast")).toHaveAttribute("data-open", "false");
  });

  it("should show upload error message when error is present", () => {
    // Arrange
    ctl.error = "boom";
    setup();
    // Act
    // (no interaction)
    // Assert
    expect(screen.getByTestId("upload-error")).toHaveTextContent("boom");
  });
});
