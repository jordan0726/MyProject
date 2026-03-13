/**
 * routes.ts
 * ----------
 * Central place to define all application routes under "/app".
 *
 * Why this file exists:
 * - Avoids hardcoding strings like "/app/settings" in multiple files
 * - Makes it easy to update routes in one place
 * - Provides type safety (TS knows what keys are valid)
 *
 * Exports:
 * - APP_ROUTES: an object that maps route keys (dashboard, settings, etc.) to actual paths
 * - AppRouteKey: union type of all valid route keys (excludes "base")
 * - isAppRouteKey: helper to check if a string is a valid AppRouteKey
 * - getRoute: get the path string by giving a route key
 * - matchAppKey: given a current pathname, return which menu key should be highlighted
 */

export const APP_BASE = "/app" as const;

/** All route mappings (dashboard points to /app root) */
export const APP_ROUTES = {
  base: APP_BASE,             // "/app" (not used directly in menus)
  dashboard: APP_BASE,        // "/app" → the dashboard/home
  settings: `${APP_BASE}/settings`,
  history:  `${APP_BASE}/history`,
  reports:  `${APP_BASE}/reports`,
  preview:  `${APP_BASE}/preview`,
} as const;

type _Routes = typeof APP_ROUTES;

/** All valid route keys except "base" (base is internal only) */
export type AppRouteKey = Exclude<keyof _Routes, "base">;

/** Check if a string is one of the defined AppRouteKeys */
export const isAppRouteKey = (k: string): k is AppRouteKey =>
  k in APP_ROUTES && k !== "base";

/** Get the path string for a given route key */
export const getRoute = (key: AppRouteKey) => APP_ROUTES[key];

/**
 * Convert the current pathname into a menu key.
 * Used to decide which navbar item should be highlighted.
 *
 * Examples:
 * - "/app" or "/app/"       -> "dashboard"
 * - "/app/settings/..."     -> "settings"
 * - "/something-else"       -> "" (no match)
 */
export function matchAppKey(pathname: string, base: string = APP_BASE): AppRouteKey | "" { 
  if (!pathname.startsWith(base)) return "";
  const rest = pathname.slice(base.length);          // "" | "/" | "/settings/xxx"
  if (!rest || rest === "/") return "dashboard";     // highlight dashboard for /app
  const seg = rest.replace(/^\//, "").split("/")[0];
  return isAppRouteKey(seg) ? seg : "";
}
