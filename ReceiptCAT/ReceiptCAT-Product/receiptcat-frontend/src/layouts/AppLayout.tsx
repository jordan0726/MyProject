// src/layout/AppLayout.tsx
import { Layout, Grid } from "antd";
import { useRouter } from "next/router";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { signOut } from "../lib/auth/signOut";   // Cognito sign-out util
import s from "./AppLayout.module.css";

import AppHeader from "../components/AppHeader";
import MobileMenuDrawer from "../components/MobileMenuDrawer";
import UploadButton from "../components/UploadButton";

import { navItems, isNavKey } from "../config/nav";
import { getRoute, matchAppKey } from "../config/routes";
import { useFileSelection } from "../features/upload/useFileSelection";

const { Content } = Layout;
const { useBreakpoint } = Grid; 

interface AppLayoutProps {
  children: React.ReactNode;
  disableHeaderInteractions?: boolean; // When true, header/logout/nav are disabled
}

/**
 * AppLayout
 * ----------
 * - Provides the global application shell for all /app pages.
 * - Includes:
 *   - AppHeader (top bar with navigation + upload button)
 *   - MobileMenuDrawer (slide-in menu on small screens)
 *   - <Content> area for child routes
 *
 * Features:
 * - Responsive: switches between header navigation and drawer based on breakpoint.
 * - Navigation: highlights current nav item using matchAppKey().
 * - Upload: processes selected file, stores metadata in sessionStorage, and routes to /app/preview.
 * - Logout: calls shared Cognito signOut util and closes the drawer.
 */
export default function AppLayout({ children, disableHeaderInteractions }: AppLayoutProps) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const { pathname } = useRouter();

  // Use shared file selection logic so Layout and Preview can reuse it
  const { pickAndStore } = useFileSelection({
    onDone: () => router.push(getRoute("preview")), // navigate to preview after persisting
    onError: (msg) => alert(msg),                    // simple error surfacing for now
  });

  const auth = useAuth(); // current auth context from react-oidc-context

  const currentKey = matchAppKey(pathname);
  const isPreview = currentKey === "preview"; // true when user is on /app/preview
  const headerDisabled = !!disableHeaderInteractions; // Normalize to boolean

  /** Handle menu item selection (no-op when header is disabled) */
  const onSelect = (key: string) => {
    if (headerDisabled) return;
    if (isNavKey(key)) router.push(getRoute(key));
    setOpen(false);
  };

  const handleLogout = async () => {
    if (headerDisabled) return;
    try {
      await signOut(auth);
      setOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /** Open the mobile drawer unless header is disabled */
  const onMenuOpen = () => {
    if (headerDisabled) return;
    setOpen(true);
  };

  return (
    // data-testid attributes are used for stable Cypress tests
    <Layout className={s.layout} data-testid="app-layout">
      <div
        aria-disabled={headerDisabled}
        style={headerDisabled ? { pointerEvents: "none", opacity: 0.6, filter: "grayscale(30%)" } : undefined}
        data-testid="app-header-wrapper"
      >
        <AppHeader
          isMobile={isMobile}
          currentKey={currentKey}
          navItems={navItems}
          onMenuOpen={onMenuOpen}
          onSelect={onSelect}
          onLogout={handleLogout}
          rightSlot={!isPreview ? <UploadButton onPick={pickAndStore} /> : null}
          dataTestId="app-header"
        />
      </div>

      <MobileMenuDrawer
        open={!headerDisabled && isMobile && open}
        onClose={() => setOpen(false)}
        currentKey={currentKey}
        navItems={navItems}
        onSelect={onSelect}
        onLogout={handleLogout}
      />

      <Content className={s.content} data-testid="app-content">{children}</Content>
    </Layout>
  );
}