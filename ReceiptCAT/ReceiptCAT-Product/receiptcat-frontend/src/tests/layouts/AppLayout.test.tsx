import { describe, it, expect } from '@jest/globals'
import '@testing-library/jest-dom';
import matchers from '@testing-library/jest-dom/matchers'
expect.extend(matchers)
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// import tested component
import AppLayout from '../../layouts/AppLayout';

/**
 * High-level goal:
 * These tests verify AppLayout’s shell behavior: responsive header/drawer,
 * route highlighting + navigation, upload flow (sessionStorage + URL.createObjectURL + FileReader),
 * and logout (calls signOut). We mock child components to isolate AppLayout logic.
 */

// Mocks for router, auth, signOut, AntD, child components...
// (already explained above, I’ll focus on test case comments)
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));
import { useRouter } from 'next/router';
const mockUseRouter = useRouter as jest.Mock;

// Mock react-oidc-context: AppLayout calls signOut(auth), so we return a simple auth object
jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(() => ({ user: { profile: { email: 'u@x.com' } } })),
}));
import { useAuth } from 'react-oidc-context';

// Mock signOut util: avoid hitting Cognito in unit tests
jest.mock('../../lib/auth/signOut', () => ({
  signOut: jest.fn(async () => undefined),
}));
import { signOut } from '../../lib/auth/signOut';
import * as signOutModule from '../../lib/auth/signOut';

// Mock AntD Grid.useBreakpoint to control mobile/desktop behavior deterministically
jest.mock('antd', () => {
  // We keep Layout minimal; just render children.
  const Layout: any = ({ children }: any) => <div data-testid="layout">{children}</div>;
  Layout.Content = ({ children }: any) => <div data-testid="content">{children}</div>;

  // useBreakpoint is returned as a jest.fn so we can flip its return per test
  const useBreakpoint = jest.fn(() => ({ md: true })); // default: desktop

  return {
    __esModule: true,
    Layout,
    Grid: { useBreakpoint },
  };
});
import { Grid } from 'antd';
const mockUseBreakpoint = (Grid as any).useBreakpoint as jest.Mock;

// Child components are mocked to expose “test hooks” (buttons) we can click.
// This isolates AppLayout’s behavior and avoids testing AntD internals or child UIs.
jest.mock('../../components/AppHeader', () => ({
  __esModule: true,
  default: ({ isMobile, currentKey, onMenuOpen, onSelect, onLogout, rightSlot }: any) => (
    <div data-testid="hdr" data-mobile={String(isMobile)} data-current={currentKey}>
      <div data-testid="right-slot">{rightSlot}</div>
      <button data-testid="open-menu" onClick={onMenuOpen}>open-menu</button>
      <button data-testid="select-settings" onClick={() => onSelect('settings')}>select-settings</button>
      <button data-testid="logout" onClick={onLogout}>logout</button>
    </div>
  ),
}));

jest.mock('../../components/MobileMenuDrawer', () => ({
  __esModule: true,
  // Only renders when `open === true`; exposes close/select/logout buttons
  default: ({ open, onClose, onSelect, onLogout }: any) =>
    open ? (
      <div data-testid="drawer">
        <button data-testid="close-drawer" onClick={onClose}>close</button>
        <button data-testid="drawer-select-history" onClick={() => onSelect('history')}>history</button>
        <button data-testid="drawer-logout" onClick={onLogout}>logout</button>
      </div>
    ) : null,
}));

// UploadButton is mocked to call onPick(File) immediately on click,
// so we can drive the full “handlePick → sessionStorage + FileReader + router.push” flow.
jest.mock('../../components/UploadButton', () => ({
  __esModule: true,
  default: ({ onPick }: any) => (
    <button
      data-testid="upload"
      onClick={() => {
        const f = new File(['hello'], 'receipt.jpg', { type: 'image/jpeg' });
        onPick(f);
      }}
    >
      Upload
    </button>
  ),
}));

// Polyfill/mocks for URL.* and FileReader so the upload flow can run in JSDOM.
const g: any = globalThis as any;
if (!g.URL) g.URL = {};
if (typeof g.URL.createObjectURL !== 'function') {
  // AppLayout calls URL.createObjectURL(file) -> store in sessionStorage
  g.URL.createObjectURL = jest.fn(() => 'blob:fake-url');
}
if (typeof g.URL.revokeObjectURL !== 'function') {
  g.URL.revokeObjectURL = jest.fn();
}
const createObjectURLMock = g.URL.createObjectURL as jest.Mock;
const revokeObjectURLMock = g.URL.revokeObjectURL as jest.Mock;

// Minimal FileReader mock: invokes onload with a data URL “image/jpeg;base64,QUJD”
class MockFileReader {
  public result: string | ArrayBuffer | null = null;
  public onload: ((ev: ProgressEvent<FileReader>) => any) | null = null;
  public onerror: ((ev: ProgressEvent<FileReader>) => any) | null = null;
  // readAsDataURL(_file: Blob) {
  readAsDataURL() {
    this.result = 'data:image/jpeg;base64,QUJD';
    // Use microtask to emulate async browser behavior
    Promise.resolve().then(() => {
      this.onload?.({ target: { result: this.result } } as unknown as ProgressEvent<FileReader>);
    });
  }
}
g.FileReader = MockFileReader as any;

// Spy the underlying Storage.prototype.setItem to assert session writes
const sessionSetSpy = jest.spyOn(Object.getPrototypeOf(window.sessionStorage), 'setItem');

// Small helper: set up a mock router with a given pathname and a spy push()
function setupRouter(pathname: string = '/app') {
  const push = jest.fn();
  mockUseRouter.mockReturnValue({ pathname, push });
  return { push };
}

describe('AppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to desktop breakpoint (md === true)
    mockUseBreakpoint.mockReturnValue({ md: true });
  });

  /**
   * Desktop: renders header (no drawer), highlights current menu key based on pathname,
   * and navigates when a menu item is selected.
   * Covers:
   * - matchAppKey(pathname) → currentKey
   * - onSelect(validKey) → router.push(getRoute(key))
   */
  it('renders desktop header and navigates when a menu item is selected', () => {
    const { push } = setupRouter('/app/settings'); // currentKey should be "settings"

    render(
      <AppLayout>
        <div>Child</div>
      </AppLayout>
    );

    const hdr = screen.getByTestId('hdr');
    expect(hdr.getAttribute('data-mobile')).toBe('false');     // desktop
    expect(hdr.getAttribute('data-current')).toBe('settings'); // highlighted key

    // simulate selecting "settings" in desktop horizontal menu
    fireEvent.click(screen.getByTestId('select-settings'));
    expect(push).toHaveBeenCalledWith('/app/settings');        // navigated to correct route
  });

  /**
   * Mobile: clicking the hamburger opens the drawer; selecting an item inside drawer
   * navigates and closes the drawer.
   * Covers:
   * - isMobile rendering branch (drawer presence)
   * - onSelect(validKey) from drawer
   * - setOpen(false) after selection (drawer disappears)
   */
  it('opens the mobile drawer and selects an item inside', () => {
    mockUseBreakpoint.mockReturnValue({ md: false }); // force mobile
    const { push } = setupRouter('/app');

    render(
      <AppLayout>
        <div>Child</div>
      </AppLayout>
    );

    fireEvent.click(screen.getByTestId('open-menu'));     // open drawer
    expect(screen.getByTestId('drawer')).toBeTruthy();

    fireEvent.click(screen.getByTestId('drawer-select-history')); // select "history"
    expect(push).toHaveBeenCalledWith('/app/history');            // navigated

    // drawer should be closed after selection (open=false)
    expect(screen.queryByTestId('drawer')).toBeNull();
  });

  describe('Upload flow', () => {
    /**
     * should store file to session and navigate to /app/preview (happy path)
     * Arrange: mock router, render AppLayout
     * Act: click Upload (mocked UploadButton triggers onPick)
     * Assert: session writes + router.push('/app/preview')
     */
    it('should store file to session and navigate to /app/preview (happy path)', async () => {
      const { push } = setupRouter('/app');

      render(
        <AppLayout>
          <div>Child</div>
        </AppLayout>
      );

      // Act — clicking the mocked UploadButton triggers onPick(File)
      await act(async () => {
        fireEvent.click(screen.getByTestId('upload'));
      });

      // Assert — object URL created from the file (for sessionStorage - include Original file and working file)
      expect(createObjectURLMock).toHaveBeenCalledTimes(2);
      expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(File));

      // No revoke on happy path (no cleanup/unmount here)
      expect(revokeObjectURLMock).not.toHaveBeenCalled();

      // Session writes for working copy
      expect(sessionSetSpy).toHaveBeenCalledWith(
        'fileInfo',
        expect.stringContaining('"fileName":"receipt.jpg"')
      );
      expect(sessionSetSpy).toHaveBeenCalledWith('fileUrl', 'blob:fake-url');
      expect(sessionSetSpy).toHaveBeenCalledWith('fileType', 'image/jpeg');

      // Session writes for original copy (new in hook)
      expect(sessionSetSpy).toHaveBeenCalledWith(
        'origFileInfo',
        expect.stringContaining('"fileName":"receipt.jpg"')
      );
      expect(sessionSetSpy).toHaveBeenCalledWith('origFileUrl', 'blob:fake-url');
      expect(sessionSetSpy).toHaveBeenCalledWith('origFileType', 'image/jpeg');
      expect(sessionSetSpy).toHaveBeenCalledWith('origFileData', 'QUJD');

      // Redirect to preview
      expect(push).toHaveBeenCalledWith('/app/preview');
    });

    /**
     * should surface upload error via onError (alert) when file reading fails
     * Arrange: swap global FileReader to a version that invokes onerror
     * Act: click Upload (triggers useFileSelection → FileReader → error)
     * Assert: onError(alert) is called with an error-like message
     */
    it('should surface upload error via onError (alert) when file reading fails', async () => {
      // Arrange — temporarily replace global FileReader to always error
      const originalFR = (globalThis as any).FileReader;
      class ErrorFileReader {
        public onload: ((ev: ProgressEvent<FileReader>) => any) | null = null;
        public onerror: ((ev: ProgressEvent<FileReader>) => any) | null = null;
        readAsDataURL() {
          // simulate async error callback
          Promise.resolve().then(() => {
            this.onerror?.(new Event('error') as any);
          });
        }
      }
      (globalThis as any).FileReader = ErrorFileReader as any;

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {}); // silence UI
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // silence error logs for this test

      // AppLayout default route, renders header with Upload button
      setupRouter('/app');
      render(
        <AppLayout>
          <div>Child</div>
        </AppLayout>
      );

      // Act — click the mocked UploadButton (it calls onPick(File))
      // which triggers useFileSelection → FileReader → error → onError(alert)
      fireEvent.click(screen.getByTestId('upload'));

      // Assert — alert called with our error message from onError path
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
        // message text may vary by hook implementation; match common error words
        expect((alertSpy.mock.calls[0][0] as string).toLowerCase()).toMatch(/failed|error/);
      });

      // Cleanup
      consoleSpy.mockRestore(); // restore console.error
      alertSpy.mockRestore();
      (globalThis as any).FileReader = originalFR;
    });
  });

  /**
   * On the preview route, AppLayout should hide the Upload button (route-based toggle).
   * We simulate navigating to /app/preview and assert the header's rightSlot does not render Upload.
   */
  it('should hide Upload button when on the preview route', () => {
    // Arrange — mock current pathname to /app/preview so currentKey === 'preview'
    setupRouter('/app/preview');

    render(
      <AppLayout>
        <div>Child</div>
      </AppLayout>
    );

    // Assert — Upload button is not rendered on preview page
    expect(screen.queryByTestId('upload')).toBeNull();

    // (Optional sanity) ensure layout still renders
    expect(screen.queryByTestId('hdr')).not.toBeNull(); // basic presence check without jest-dom typing
  });

  /**
   * Logout: clicking the logout button calls signOut(auth).
   * Covers:
   * - handleLogout happy path (try { await signOut(auth); setOpen(false) } catch {…})
   * We only assert signOut is invoked; AppLayout state transition is internal.
   */
  it('should call signOut on logout (happy path)', async () => {
    // Arrange — route and minimal auth context
    setupRouter('/app');
    (useAuth as jest.Mock).mockReturnValue({ user: { profile: { email: 'u@x.com' } } });

    render(
      <AppLayout>
        <div>Child</div>
      </AppLayout>
    );

    // Act — click logout in header
    await act(async () => {
      fireEvent.click(screen.getByTestId('logout'));
    });

    // Assert — signOut called once
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  /**
   * Logout error handling: when signOut throws, we log an error and do not crash.
   * This covers the catch branch inside handleLogout without altering component code.
   */
  it('should log an error when logout fails (catch branch)', async () => {
    // Arrange — force signOut to reject once
    const signOutSpy = jest.spyOn(signOutModule, 'signOut').mockRejectedValueOnce(new Error('Logout failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // silence test output
    setupRouter('/app');
    (useAuth as jest.Mock).mockReturnValue({ user: { profile: { email: 'u@x.com' } } });

    render(
      <AppLayout>
        <div>Child content</div>
      </AppLayout>
    );

    // Act — click logout
    fireEvent.click(screen.getByTestId('logout'));

    // Assert — catch branch: console.error called with our message
    await waitFor(() => {
      expect(signOutSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
    });

    // Cleanup spies
    consoleSpy.mockRestore();
  });

  /**
   * Drawer close button should flip open=false and remove drawer from DOM.
   * Covers the `onClose` path wired to setOpen(false).
   */
  it('closes drawer when clicking close button', () => {
    mockUseBreakpoint.mockReturnValue({ md: false });
    setupRouter('/app');

    render(
      <AppLayout>
        <div>Child</div>
      </AppLayout>
    );

    fireEvent.click(screen.getByTestId('open-menu')); // open
    expect(screen.getByTestId('drawer')).toBeTruthy();

    fireEvent.click(screen.getByTestId('close-drawer')); // close
    expect(screen.queryByTestId('drawer')).toBeNull();
  });

  it('should disable header interactions when disableHeaderInteractions is true (desktop)', () => {
    // Arrange — desktop breakpoint by default
    const { push } = setupRouter('/app');
    render(
      <AppLayout disableHeaderInteractions>
        <div>Child</div>
      </AppLayout>
    );
  
    // Assert — header wrapper reflects disabled state
    const wrapper = screen.getByTestId('app-header-wrapper');
    expect(wrapper.getAttribute('aria-disabled')).toBe('true');
  
    // Act — try to open drawer, navigate, and logout
    fireEvent.click(screen.getByTestId('open-menu'));
    fireEvent.click(screen.getByTestId('select-settings'));
    fireEvent.click(screen.getByTestId('logout'));
  
    // Assert — drawer stays closed; no navigation or logout called
    expect(screen.queryByTestId('drawer')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('should prevent opening mobile drawer and block actions when disabled (mobile)', () => {
    // Arrange — force mobile breakpoint and set up router
    mockUseBreakpoint.mockReturnValue({ md: false });
    const { push } = setupRouter('/app');
    render(
      <AppLayout disableHeaderInteractions>
        <div>Child</div>
      </AppLayout>
    );
  
    // Act — attempt to open drawer, navigate, and logout
    fireEvent.click(screen.getByTestId('open-menu'));
    fireEvent.click(screen.getByTestId('select-settings'));
    fireEvent.click(screen.getByTestId('logout'));
  
    // Assert — drawer never opens; no navigation or logout occurs
    expect(screen.queryByTestId('drawer')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});