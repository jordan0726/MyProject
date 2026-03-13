// src/features/upload/useFileSelection.ts
import { useCallback } from "react";

/**
 * Manage original vs. working file in sessionStorage.
 * - Original (orig*): first-selected file for the current session; preserved until a new selection.
 * - Working  (file*): current editable/preview/upload version; crops only update this copy.
 *
 * Working copy does not persist base64 to reduce sessionStorage usage.
 *
 * API
 * - pickAndStore(file): select/reselect a new source image (resets original + working).
 * - storeCropped(file): persist a cropped image (updates working only).
 * - resetToOriginal(): restore working from preserved original.
 */

type Options = {
  onDone?: () => void;            // callback after everything is saved (e.g., navigate)
  onError?: (msg: string) => void; // surfacing error to UI/toast if needed
};

/** Soft size limit for uploads (5 MB) */
const MAX_UPLOAD_MB = 5; // Display limit in MB
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024; // Byte limit

/** Detect browser quota errors thrown by Web Storage */
function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const e = err as any;
  return (
    e?.name === "QuotaExceededError" ||
    e?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e?.code === 22 || // Chrome/Edge legacy
    e?.code === 1014 || // Firefox legacy
    (typeof e?.message === "string" && e.message.toLowerCase().includes("quota"))
  );
}



// Centralized error messages
const ERR_UNSUPPORTED_TYPE = "Unsupported file type. Please upload only JPG, JPEG, or PNG images.";
const ERR_TOO_LARGE = `The file is too large to be uploaded. Please select a smaller file (max ${MAX_UPLOAD_MB} MB).`;
const ERR_STORAGE_UNAVAILABLE = "Unable to access session storage. Please enable storage and try again.";
const ERR_NO_ORIGINAL = "No original file is available to reset from.";

/** Allowed file types checks (extension + MIME) */
const ALLOWED_EXTS: readonly string[] = ["jpg", "jpeg", "png"]; // extensions
const ALLOWED_MIME: readonly string[] = ["image/jpeg", "image/png"]; // MIME types

// SessionStorage keys for working copy
const K_WORK_INFO = "fileInfo";
const K_WORK_URL  = "fileUrl";
// const K_WORK_DATA = "fileData"; // Removed unused working base64 key
const K_WORK_TYPE = "fileType";

// Parallel keys for preserved original
const K_ORIG_INFO = "origFileInfo";
const K_ORIG_URL  = "origFileUrl";
const K_ORIG_DATA = "origFileData";
const K_ORIG_TYPE = "origFileType";

/** Convert a File to base64 string (without data URL prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); // read file as data URL
    reader.onload = () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(",")[1]; // remove data URL prefix
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Validate both the extension and MIME type */
function isAllowedType(file: File): boolean {
  const mimeOk = ALLOWED_MIME.includes(file.type);
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return mimeOk; // Some blobs/files may not carry an extension
  const extOk = ALLOWED_EXTS.includes(ext);
  return mimeOk && extOk;
}

/** Utility: revoke an object URL safely */
function safeRevoke(url: string | null | undefined) {
  try { if (url) URL.revokeObjectURL(url); } catch { /* no-op */ }
}

/** Utility: set working copy entries */
function setWorkingEntries(file: File, url: string) {
  const info = { fileName: file.name }; // Minimal metadata
  sessionStorage.setItem(K_WORK_INFO, JSON.stringify(info));
  sessionStorage.setItem(K_WORK_URL, url);
  // Working copy does not persist base64 to save sessionStorage.
  sessionStorage.setItem(K_WORK_TYPE, file.type);
}

/** Utility: set original entries */
function setOriginalEntries(file: File, url: string, base64: string) {
  const info = { fileName: file.name }; // Minimal metadata
  sessionStorage.setItem(K_ORIG_INFO, JSON.stringify(info));
  sessionStorage.setItem(K_ORIG_URL, url);
  sessionStorage.setItem(K_ORIG_DATA, base64);
  sessionStorage.setItem(K_ORIG_TYPE, file.type);
}

/** Utility: clear ONLY original entries and revoke its URL */
function clearOriginalEntries() {
  const oldUrl = sessionStorage.getItem(K_ORIG_URL);
  safeRevoke(oldUrl);
  sessionStorage.removeItem(K_ORIG_INFO);
  sessionStorage.removeItem(K_ORIG_URL);
  sessionStorage.removeItem(K_ORIG_DATA);
  sessionStorage.removeItem(K_ORIG_TYPE);
}

/** Utility: clear ONLY working entries and revoke its URL */
function clearWorkingEntries() {
  const oldUrl = sessionStorage.getItem(K_WORK_URL);
  safeRevoke(oldUrl);
  sessionStorage.removeItem(K_WORK_INFO);
  sessionStorage.removeItem(K_WORK_URL);
  // sessionStorage.removeItem(K_WORK_DATA); // Removed unused working base64 removal
  sessionStorage.removeItem(K_WORK_TYPE);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNums);
  return new Blob([byteArray], { type: mime });
}

/** Public hook to select a file, preserve original, and manage a working copy */
export function useFileSelection({ onDone, onError }: Options = {}) {
  /**
   * pickAndStore: called when the user selects/reselects a NEW source image.
   * Behavior: reset BOTH original and working to the new file.
   */
  const pickAndStore = useCallback(async (file: File) => {
    const createdUrls: string[] = [];
    try {
      // Validate type first
      if (!isAllowedType(file)) {
        onError?.(ERR_UNSUPPORTED_TYPE);
        return;
      }

      // Validate file size before proceeding
      if (file.size > MAX_UPLOAD_BYTES) {
        onError?.(ERR_TOO_LARGE);
        return;
      }



      // Clear existing working + original so we start a fresh session for this source file
      try { clearWorkingEntries(); } catch { /* no-op */ }
      try { clearOriginalEntries(); } catch { /* no-op */ }

      const origUrl = URL.createObjectURL(file);
      const workUrl = URL.createObjectURL(file);
      createdUrls.push(origUrl, workUrl);

      // Persist base64 content (may throw on quota)
      const base64 = await fileToBase64(file);

      // Persist ORIGINAL
      try {
        setOriginalEntries(file, origUrl, base64);
      } catch (e) {
        clearOriginalEntries();
        clearWorkingEntries();
        createdUrls.forEach(safeRevoke);
        onError?.(isQuotaError(e) ? ERR_TOO_LARGE : ERR_STORAGE_UNAVAILABLE);
        return;
      }

      // Persist WORKING (start equal to original)
      try {
        setWorkingEntries(file, workUrl);
      } catch (e) {
        clearOriginalEntries();
        clearWorkingEntries();
        createdUrls.forEach(safeRevoke);
        onError?.(isQuotaError(e) ? ERR_TOO_LARGE : ERR_STORAGE_UNAVAILABLE);
        return;
      }

      // Done callback (e.g., navigate to /app/preview)
      onDone?.();
    } catch (e) {
      createdUrls.forEach(safeRevoke);
      console.error("pickAndStore failed:", e);
      onError?.("File selection failed, please try again");
    }
  }, [onDone, onError]);

  /**
   * storeCropped: called when the user confirms a crop.
   * Behavior: updates ONLY the working copy, leaving the preserved original intact.
   */
  const storeCropped = useCallback(async (file: File) => {
    let createdUrl: string | null = null; // For cleanup on failure
    try {
      // Validate type + size (cropped blobs should still match allowed image types)
      if (!isAllowedType(file)) {
        onError?.(ERR_UNSUPPORTED_TYPE);
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        onError?.(ERR_TOO_LARGE);
        return;
      }

      // Replace only working preview URL
      const oldWorkUrl = sessionStorage.getItem(K_WORK_URL);
      const workUrl = URL.createObjectURL(file);
      createdUrl = workUrl;

      try {
        setWorkingEntries(file, workUrl);
      } catch (e) {
        safeRevoke(createdUrl);
        onError?.(isQuotaError(e) ? ERR_TOO_LARGE : ERR_STORAGE_UNAVAILABLE);
        return;
      }

      // Revoke old working URL after successful swap, but never revoke the original URL
      const origUrlForGuard = sessionStorage.getItem(K_ORIG_URL);
      if (oldWorkUrl && oldWorkUrl !== origUrlForGuard) {
        safeRevoke(oldWorkUrl);
      }

      onDone?.();
    } catch (e) {
      safeRevoke(createdUrl);
      console.error("storeCropped failed:", e);
      onError?.("Saving cropped image failed, please try again");
    }
  }, [onDone, onError]);

  /**
   * resetToOriginal: restore the working copy from the preserved original entries.
   */
  const resetToOriginal = useCallback(() => {
    try {
      const origUrl  = sessionStorage.getItem(K_ORIG_URL);
      const origInfo = sessionStorage.getItem(K_ORIG_INFO);
      const origData = sessionStorage.getItem(K_ORIG_DATA);
      const origType = sessionStorage.getItem(K_ORIG_TYPE);

      if (!origUrl || !origInfo || !origData || !origType) {
        onError?.(ERR_NO_ORIGINAL);
        return;
      }

      // Revoke current working URL and create a fresh working URL from preserved original data
      const oldWorkUrl = sessionStorage.getItem(K_WORK_URL);
      if (oldWorkUrl && oldWorkUrl !== origUrl) safeRevoke(oldWorkUrl);

      const { fileName } = JSON.parse(origInfo) as { fileName: string };
      const blob = base64ToBlob(origData, origType);
      const newWorkFile = new File([blob], fileName, { type: origType });
      const newWorkUrl = URL.createObjectURL(newWorkFile);

      sessionStorage.setItem(K_WORK_URL, newWorkUrl);
      sessionStorage.setItem(K_WORK_INFO, JSON.stringify({ fileName }));
      // sessionStorage.setItem(K_WORK_DATA, origData); // Removed storing working base64
      sessionStorage.setItem(K_WORK_TYPE, origType);

      onDone?.();
    } catch (e) {
      console.error("resetToOriginal failed:", e);
      onError?.("Reset to original failed, please try again");
    }
  }, [onDone, onError]);

  return { pickAndStore, storeCropped, resetToOriginal, isAllowedType };
}