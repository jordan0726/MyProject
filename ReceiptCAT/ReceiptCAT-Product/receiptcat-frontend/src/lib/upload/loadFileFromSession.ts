import { readSessionFile, SessionFileInfo } from "./sessionFile";

// Helper: convert base64 string to Blob
function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNums);
  return new Blob([byteArray], { type: mime });
}

export type LoadFromSessionResult = {
  fileInfo: SessionFileInfo | null;
  previewUrl: string | null;
  file: File | null;
  fileSize: number | null;
  contentType: string | null;
};

/**
 * Reads upload data from sessionStorage and rebuilds File/URL if possible.
 * Returns null if required data is missing.
 */
export async function loadFromSession(): Promise<LoadFromSessionResult | null> {
  const data = readSessionFile();

  // Validate minimal required fields
  if (!data.fileInfo) return null;
  if (!data.previewUrl && !data.origData) return null;
  if (!data.contentType && !data.origType) return null;

  const { fileInfo } = data;
  let file: File | null = null;
  let url: string | null = data.previewUrl;
  let contentType: string | null = data.contentType;
  let fileSize: number | null = null;

  // Try rebuild from previewUrl first
  try {
    if (data.previewUrl) {
      const blob = await fetch(data.previewUrl).then(r => r.blob());
      file = new File([blob], fileInfo!.fileName, { type: data.contentType! });
      fileSize = file.size;
      return { fileInfo, previewUrl: data.previewUrl, file, fileSize, contentType };
    }
    throw new Error("previewUrl missing or invalid");
  } catch {
    // Fallback: rebuild from original base64
    if (data.origData && (data.origType || data.contentType)) {
      const mime = data.origType || data.contentType!;
      const blob = base64ToBlob(data.origData, mime);
      file = new File([blob], fileInfo!.fileName, { type: mime });
      url = URL.createObjectURL(file);
      contentType = mime;
      fileSize = file.size;
      return { fileInfo, previewUrl: url, file, fileSize, contentType };
    }
    console.error("No valid data available to rebuild file from session");
    return null;
  }
}