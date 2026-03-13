// src/layout/AppHeader.tsx

/**
 * AppHeader
 * ----------
 * - Top navigation bar with brand and menu
 * - Switches between mobile (hamburger button) and desktop (horizontal menu)
 * - Supports a rightSlot for custom content (e.g. Upload button)
 */

import { Button, Menu } from "antd";
import type { MenuProps } from "antd";
import s from "../layouts/AppLayout.module.css";

type Props = {
  isMobile: boolean;            /** Whether rendering on a mobile breakpoint */
  currentKey: string | "";      /** Current selected menu key */
  navItems: MenuProps["items"]; /** Navigation items (AntD Menu items) */
  onMenuOpen: () => void;       /** Trigger when mobile menu button is clicked */
  onSelect: (key: string) => void; /** Trigger when a menu item is selected */
  onLogout?: () => void;        /**  Logout handler for desktop */
  rightSlot?: React.ReactNode;  /** Optional right-side content */
  dataTestId?: string;      /** Optional data-testid for testing */
};

export default function AppHeader({
  isMobile,
  currentKey,
  navItems,
  onMenuOpen,
  onSelect,
  onLogout,
  rightSlot,
  dataTestId,
}: Props) {
  return (
    <header className={s.header} data-testid={dataTestId}>
      <div className={s.headerInner}>
        {/* Brand and hamburger (mobile only) */}
        <div className={s.brand}>
          {isMobile && (
            <Button
              type="text"
              aria-label="Open menu"
              className={s.menuButton}
              onClick={onMenuOpen}
            >
              ☰
            </Button>
          )}
          <div className={s.brandTitle}>ReceiptCAT</div>
        </div>

        {/* Horizontal menu (desktop only) */}
        {!isMobile && (
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={currentKey ? [currentKey] : []}
            items={navItems}
            onSelect={({ key }) => onSelect(String(key))}
            className={s.menu}
          />
        )}

        {/* Right-side slot */}
        <div className={s.upload}>
          {rightSlot}
          {!isMobile && onLogout && (
            <Button
              danger
              type="text"
              onClick={onLogout}
              style={{ color: 'white' }}
            >
              Log out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
