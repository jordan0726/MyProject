// src/layout/MobileMenuDrawer.tsx

/**
 * MobileMenuDrawer
 * ----------------
 * - Side drawer for navigation on mobile screens
 * - Contains an AntD Menu and a logout button
 * - Controlled via `open` and `onClose`
 */

import { Drawer, Menu, Button } from "antd";
import type { MenuProps } from "antd";
import s from "../layouts/AppLayout.module.css";

type Props = {
  open: boolean;                /** Whether the drawer is visible */
  onClose: () => void;          /** Close handler */
  currentKey: string | "";      /** Current selected menu key */
  navItems: MenuProps["items"]; /** Navigation items */
  onSelect: (key: string) => void; /** Menu item select handler */
  onLogout?: () => void;        /** Optional logout handler */
  width?: string | number;      /** Drawer width (default: 70%) */
  title?: string;               /** Drawer title (default: "Menu") */
};

export default function MobileMenuDrawer({
  open,
  onClose,
  currentKey,
  navItems,
  onSelect,
  onLogout,
  width = "70%",
  title = "Menu",
}: Props) {
  return (
    <Drawer
      title={title}
      placement="left"
      open={open}
      onClose={onClose}
      width={width}
      styles={{ body: { padding: 0 } }}
    >
      {/* Navigation menu */}
      <Menu
        mode="inline"
        selectedKeys={currentKey ? [currentKey] : []}
        items={navItems}
        onSelect={({ key }) => onSelect(String(key))}
      />

      {/* Footer with logout button */}
      <div className={s.drawerFooter}>
        <Button danger block onClick={onLogout}>Log out</Button>
      </div>
    </Drawer>
  );
}
