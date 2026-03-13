// src/lib/utils/numberFormat.ts
// Utility to format numbers as localized currency strings

export function formatCurrency(
  value: number | string | null | undefined,
  currency = '$'
): string {
  const n = Number(value) || 0
  return `${currency}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}