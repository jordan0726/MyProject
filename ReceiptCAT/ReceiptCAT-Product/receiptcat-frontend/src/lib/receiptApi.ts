/****
 * api/receiptApi.ts
 *
 * Purpose:
 * - Typed, minimal wrapper around the ReceiptCAT backend endpoints used by the app.
 * - Normalizes category keys on read and write to keep UI consistent.
 *
 * Notes:
 * - This module assumes `NEXT_PUBLIC_API_BASE` is a fully-qualified base URL.
 * - Authorization header expects the caller to pass the final token string (e.g., "Bearer xxx") if needed.
 * - Date filters for history are defined as constants and can be promoted to function params in the future if required.
 */

import type { Receipt, ReceiptItem } from "@/types/receipt";
import { normalizeCategoryKey } from "@/types/categoryLabels";

/** Response shape for GET /users/{userId}/receipts (list endpoint). */
export type ReceiptsListResponse = {
  receiptsCount: number;
  receipts: Array<{
    receiptId: string;
    date: string;
    vendor: string;
    total: number;
    itemsCount: number;
  }>;
};

// ---------- Constants ----------

const API = process.env.NEXT_PUBLIC_API_BASE; // API base from .env
const RECEIPT_HISTORY_FROM_DATE = "2023-01-01"; // default inclusive start date for history range
const RECEIPT_HISTORY_TO_DATE = "2025-12-31";   // default inclusive end date for history range

// ---------- Internal utils ----------

/** Ensures API base is configured and returns a trimmed base without trailing slash. */
function apiBase(): string {
  if (!API) {
    throw new Error("API base URL is not configured (missing NEXT_PUBLIC_API_BASE).");
  }
  return API.replace(/\/$/, ""); // remove a trailing slash once for stable URL joins
}

/** Builds a URL object with safe userId path-encoding. */
function userReceiptsUrl(userId: string): URL {
  return new URL(`${apiBase()}/users/${encodeURIComponent(userId)}/receipts`);
}

/** Builds a URL object for a single receipt resource. */
function singleReceiptUrl(userId: string, receiptId: string): URL {
  return new URL(
    `${apiBase()}/users/${encodeURIComponent(userId)}/receipts/${encodeURIComponent(receiptId)}`
  );
}

/** Normalizes one item's category field; returns a new object when changed. */
function normalizeReceiptItemCategory(item: ReceiptItem): ReceiptItem {
  const normalizedKey = normalizeCategoryKey(item.category);
  return normalizedKey && normalizedKey !== item.category
    ? { ...item, category: normalizedKey }
    : item; // no-op when already normalized or unknown
}

// ---------- Public API ----------

/**
 * GET /users/{userId}/receipts
 * Fetches the user's receipts within the default date window.
 * Returns list payload with `receiptsCount` and per-receipt `itemsCount`.
 */
export async function fetchReceipts(userId: string, token?: string): Promise<ReceiptsListResponse> {
  const endpointUrl = userReceiptsUrl(userId);
  endpointUrl.searchParams.set("fromDate", RECEIPT_HISTORY_FROM_DATE); // static range for now
  endpointUrl.searchParams.set("toDate", RECEIPT_HISTORY_TO_DATE);

  const res = await fetch(endpointUrl.toString(), {
    headers: token ? { Authorization: token } : {}, // token should already include "Bearer "
  });

  if (!res.ok) {
    const responseText = await res.text().catch(() => "");
    throw new Error(
      `Failed to load receipts for user ${userId} (${res.status} ${res.statusText})${
        responseText ? " - " + responseText : ""
      }`
    );
  }

  const json = await res.json().catch(() => ({} as unknown));

  // Preferred: new backend shape with counts
  if (json && typeof (json as any).receiptsCount === "number" && Array.isArray((json as any).receipts)) {
    const { receiptsCount, receipts } = json as {
      receiptsCount: number;
      receipts: Array<{ receiptId: string; date: string; vendor: string; total: number; itemsCount: number }>;
    };

    const normalizedList = receipts.map((r) => ({
      receiptId: String(r.receiptId),
      date: String(r.date),
      vendor: String(r.vendor ?? ""),
      total: typeof r.total === "number" && !Number.isNaN(r.total) ? r.total : 0,
      itemsCount: typeof r.itemsCount === "number" ? r.itemsCount : 0,
    }));

    return { receiptsCount, receipts: normalizedList };
  }

  // Backward-compat: old array payload (each receipt had items[])
  const receiptsSource = Array.isArray(json)
    ? json
    : (json as any)?.receipts ?? (json as any)?.data ?? (json as any)?.items ?? [];

  if (Array.isArray(receiptsSource)) {
    const normalizedList = receiptsSource.map((receipt: any) => {
      const items = Array.isArray(receipt.items) ? receipt.items : [];
      return {
        receiptId: String(receipt.receiptId ?? receipt.id ?? ""),
        date: String(receipt.date ?? ""),
        vendor: String(receipt.vendor ?? ""),
        total: typeof receipt.total === "number" && !Number.isNaN(receipt.total) ? receipt.total : 0,
        itemsCount: items.length, // derive from old payload
      };
    });

    return {
      receiptsCount: normalizedList.length,
      receipts: normalizedList,
    };
  }

  // Unknown shape -> explicit error helps surface contract mismatch
  throw new Error("Unexpected response shape from receipts list endpoint.");
}

/**
 * GET /users/{userId}/receipts/{receiptId}
 * Fetches a single receipt by id. Returns null only when backend returns a falsy body.
 * Item categories are normalized.
 */
export async function fetchReceiptById(
  userId: string,
  receiptId: string,
  token?: string
): Promise<Receipt | null> {
  const endpointUrl = singleReceiptUrl(userId, receiptId);

  const res = await fetch(endpointUrl.toString(), {
    headers: token ? { Authorization: token } : {},
  });

  if (!res.ok) {
    const responseText = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch receipt ${receiptId} for user ${userId} (${res.status} ${res.statusText})${
        responseText ? " - " + responseText : ""
      }`
    );
  }

  const json = await res.json();
  if (!json) return null; // guard for unexpected empty payloads

  if (json && Array.isArray(json.items)) {
    json.items = json.items.map(normalizeReceiptItemCategory); // normalize after fetch
  }
  return json; // assuming backend returns the Receipt shape
}

// Removed legacy endpoint /users/{userId}/receipts/items (previously handled by fetchReceiptItems)

/**
 * PUT /users/{userId}/receipts/{receiptId}
 * Updates a single receipt with sanitized items (normalized category, numeric price).
 */
export async function updateReceiptData(
  userId: string,
  receiptId: string,
  updatedReceipt: {
    vendor: string;
    total: number;
    items: ReceiptItem[];
  },
  token?: string
): Promise<void> {
  // Sanitize items to ensure category is normalized and price is numeric
  const sanitizedReceipt = {
    ...updatedReceipt,
    items: updatedReceipt.items.map((item) => {
      const normalizedCategory =
        normalizeCategoryKey(item.category) ?? item.category ?? "other"; // fall back to 'other'
      return {
        ...item,
        category: normalizedCategory,
        price: typeof item.price === "number" && !Number.isNaN(item.price) ? item.price : 0, // ensure number
      };
    }),
  };

  const endpointUrl = singleReceiptUrl(userId, receiptId);

  const res = await fetch(endpointUrl.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(sanitizedReceipt),
  });

  if (!res.ok) {
    const responseText = await res.text().catch(() => "");
    throw new Error(
      `Failed to update receipt ${receiptId} for user ${userId} (${res.status} ${res.statusText})${
        responseText ? " - " + responseText : ""
      }`
    );
  }
}
