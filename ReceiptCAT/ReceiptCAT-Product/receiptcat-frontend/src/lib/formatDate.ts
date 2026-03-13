import { parse, format } from "date-fns";

// supported input date formats
const knownFormats = [
  "dd/MM/yyyy",
  "d/MM/yyyy",
  "dd-MMM-yyyy",
  "d-MMM-yyyy",
  "dd MMM yyyy",
  "d MMM yyyy",
];

export function normalizeDate(dateStr: string): string {
  for (const fmt of knownFormats) {
    const parsed = parse(dateStr, fmt, new Date());
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "dd/MM/yyyy"); // standard output format
    }
  }

  // fallback: return original string or throw error
  return dateStr;
}