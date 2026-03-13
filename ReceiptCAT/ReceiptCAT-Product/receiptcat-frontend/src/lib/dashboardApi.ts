/**
 * Dashboard API utilities
 * -----------------------
 * Responsibilities:
 * - Define a stable fetch function for the dashboard endpoint.
 * - Normalize backend payloads into UI-friendly structures.
 * - Provide small helpers for date normalization and topline metrics.
 *
 * Notable behavior:
 * - If the caller omits dates, the current month [YYYY-MM-01..YYYY-MM-last] is used.
 * - Item-level totals are referred to as "subtotal" (not unit price).
 * - Category-level totals are "total".
 *
 * Error handling:
 * - Throws on missing API base URL.
 * - Throws when fromDate > toDate (invalid range).
 */
// src/lib/dashboardApi.ts
// Normalizes backend payloads, provides a fetch helper, and computes topline metrics.

// --- Imports -----------------------------------------------------------
import type { CategoryGroup, CategoryItem } from '@/types/dashboardTypes';
import { CATEGORY_LABELS, normalizeCategoryKey, type CategoryKey } from '@/types/categoryLabels';

// --- Constants & Defaults ---------------------------------------------
// Backend API base URL (configured via NEXT_PUBLIC_API_BASE); required for all requests.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE;

// Compute current-month fallback once on module load to avoid re-evaluating at every call.
// Default range fallback: current month (used only if caller omits dates)
const __now = new Date(); // local "now" for computing month bounds
const __year = __now.getFullYear();
const __month = __now.getMonth(); // 0-based
// First day of current month
const DEFAULT_FROM_DATE = `${__year}-${String(__month + 1).padStart(2, '0')}-01`; // fallback start date (YYYY-MM-DD)
// Last day of current month (day=0 of next month gives last day of current month)
const __monthEnd = new Date(__year, __month + 1, 0).getDate();
const DEFAULT_TO_DATE = `${__year}-${String(__month + 1).padStart(2, '0')}-${String(__monthEnd).padStart(2, '0')}`; // fallback end date (YYYY-MM-DD)

// --- Helpers (Parsing & Dates) ----------------------------------------
/**
 * Parse a price-like value into a number.
 * Accepts: "$10.00", "10.00", 10
 * Returns: 0 for malformed input.
 */
function parsePrice(priceInput: string | number): number {
  if (typeof priceInput === 'number') return priceInput;
  return Number(String(priceInput).replace(/^\s*\$/, '').trim()) || 0;
}
  
/**
 * Convert a date-like input into 'YYYY-MM-DD'.
 * Accepts Date instances or strings (ISO or YYYY-MM-DD).
 * Falls back to today's date when the input is invalid.
 */
function toYMD(input?: string | Date): string {
  // If input is a Date instance, format it directly
  if (input instanceof Date && !isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`; // YYYY-MM-DD
  }
  if (typeof input === 'string' && input.trim()) {
    // Try parsing generic string/ISO; if valid, format into YYYY-MM-DD
    const dt = new Date(input);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`; // YYYY-MM-DD
    }
    // If the string already matches YYYY-MM-DD, accept as-is (light validation)
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  }
  // Fallback: today (prevents sending invalid values to backend)
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

// --- Normalizers -------------------------------------------------------
/**
 * Convert backend "category buckets" into CategoryGroup[] for UI.
 * Input (per bucket):
 *   - category: string (may be legacy key)
 *   - items:   { name, price (subtotal), quantity? }[]
 *   - total?:  number (category total)
 * Output:
 *   - categoryKey: canonical key for icon/color mapping
 *   - category:    display label for UI
 *   - items:       sanitized names (single-line), normalized numbers
 *   - total:       category total (trust backend value when provided)
 */
function normalizeBuckets(backendBuckets: any[]): CategoryGroup[] {
  const safeBuckets = Array.isArray(backendBuckets) ? backendBuckets : [];

  return safeBuckets.map((backendBucket: any) => {
    const normalizedItems: CategoryItem[] = (backendBucket.items || []).map((backendItem: any) => {
      // Prefer clean, single-line names; many backends append promo lines after a newline
      const rawName = String(backendItem.name ?? '').trim();
      const nameFirstLine = rawName.split('\n')[0].trim(); // keep only the first line to drop promo tails
      return {
        // id field is omitted intentionally (backend not providing stable IDs yet)
        name: nameFirstLine,                                         // trimmed single-line name
        price: parsePrice(backendItem.price),                        // subtotal for this item (already quantity × unit price)
        quantity: backendItem.quantity ? Number(backendItem.quantity) : 1, // default 1 if absent
      };
    });

    // If backend provides a 'total' (category total), trust it; otherwise derive from item subtotals
    const computedTotal =
      Number.isFinite(Number(backendBucket.total))
        ? Number(backendBucket.total)
        : normalizedItems.reduce((sum, item) => sum + item.price, 0);

    // Map backend-provided category (legacy or new) into a canonical key for the UI layer
    const rawKey = backendBucket.category;
    const categoryKey: CategoryKey = normalizeCategoryKey(rawKey) ?? 'other'; // Map legacy → new, fallback to other
    const categoryLabel = CATEGORY_LABELS[categoryKey]; // Map key -> human-readable label

    return {
      categoryKey,                 // <-- add canonical key for UI mapping (icons, colors)
      category: categoryLabel,     // keep label for display/i18n
      items: normalizedItems,
      total: computedTotal,
    };
  });
}

// --- API ---------------------------------------------------------------
/**
 * Fetch category groups for a user within an optional date range.
 * HTTP: GET /users/{userId}/dashboard?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 *
 * Parameters:
 * - userId:    OIDC subject (sub) of the current user.
 * - options:
 *    - fromDate: start date (inclusive) — Date or 'YYYY-MM-DD'
 *    - toDate:   end date (inclusive)   — Date or 'YYYY-MM-DD'
 *    - authToken: raw JWT for Authorization header (no "Bearer " prefix)
 *
 * Behavior:
 * - Omitting dates falls back to the current month.
 * - Throws on invalid ranges (from > to).
 * - Returns:
 *    { groups: CategoryGroup[], receiptsCount: number }
 */
export async function fetchCategoriesByUser(
  userId: string,
  options?: { fromDate?: string | Date; toDate?: string | Date; authToken?: string }
): Promise<{ groups: CategoryGroup[]; receiptsCount: number }> {
  // Resolve dates with current-month fallback when not provided
  const fromDate = toYMD(options?.fromDate ?? DEFAULT_FROM_DATE); // normalize to YYYY-MM-DD
  const toDate = toYMD(options?.toDate ?? DEFAULT_TO_DATE);       // normalize to YYYY-MM-DD

  // Validate that fromDate is not after toDate (basic guard to avoid 400s)
  if (new Date(fromDate) > new Date(toDate)) {
    throw new Error(`Invalid date range: fromDate (${fromDate}) is after toDate (${toDate}).`);
  }

  // Ensure API base URL is configured
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured (missing NEXT_PUBLIC_API_BASE).');
  }

  const trimmedBase = API_BASE_URL.replace(/\/$/, '');
  const endpointUrl = new URL(
    `${trimmedBase}/users/${encodeURIComponent(userId)}/dashboard`
  );
  endpointUrl.searchParams.set('fromDate', fromDate);
  endpointUrl.searchParams.set('toDate', toDate);

  const apiResponse = await fetch(endpointUrl.toString(), {
    headers: {
      ...(options?.authToken ? { Authorization: options.authToken } : {}), // pass through raw JWT
      'Content-Type': 'application/json',
    },
  });

  if (!apiResponse.ok) {
    const responseText = await apiResponse.text().catch(() => '');
    throw new Error(
      `Failed to load dashboard for user ${userId} (${apiResponse.status} ${apiResponse.statusText})${
        responseText ? ' - ' + responseText : ''
      }`
    );
  }

  const rawJson = await apiResponse.json();
  
  // Accept both array payloads and various legacy envelope shapes for backward compatibility
  const bucketSource = Array.isArray(rawJson)
    ? rawJson
    : rawJson?.categoryBuckets ??
      rawJson?.categoryGroups ??
      rawJson?.categoryItems ??
      rawJson?.categories ??
      rawJson?.groups ??
      rawJson?.data ??
      [];
  
  // Backend-provided receipts count for the queried range (default 0 if absent)
  const receiptsCount = Number(rawJson?.receiptsCount) || 0;

  return {
    groups: normalizeBuckets(bucketSource),
    receiptsCount,
  };
}

// --- Derived Metrics ---------------------------------------------------
/**
 * Compute topline metrics for the summary bar.
 * - total:    grand total across categories
 * - items:    total count of item rows
 * - receipts: backend-provided count for the range (default 0)
 */
export function computeToplineFromGroups(categoryGroups: CategoryGroup[], receiptsCount: number = 0) {
  const grandTotal = categoryGroups.reduce((sum, group) => sum + group.total, 0);
  const itemCount = categoryGroups.reduce((sum, group) => sum + group.items.length, 0);
  return { total: grandTotal, receipts: receiptsCount, items: itemCount };
}
