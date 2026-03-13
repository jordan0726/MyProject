/**
 * nav.ts
 * -------
 * Central config for top navigation:
 * - Defines allowed NavKey values (exclude preview)
 * - Provides type guard (isNavKey) for menu validation
 * - Exports navItems for rendering menus (AppHeader, MobileMenuDrawer)
 */

import type { MenuProps } from "antd";
import type { AppRouteKey } from "./routes";

/** Keys allowed in navbar (exclude preview) */
export type NavKey = Exclude<AppRouteKey, "preview">;

/** Type guard for valid NavKey (includes dashboard) */
export const isNavKey = (k: string): k is NavKey =>
  k === "dashboard" || k === "settings" || k === "history" || k === "reports";

/** Navbar items (Dashboard first) */
export const navItems: MenuProps["items"] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "history",   label: "Receipt history" },
  { key: "reports",   label: "Reports" },
  { key: "settings",  label: "Settings" },
];
