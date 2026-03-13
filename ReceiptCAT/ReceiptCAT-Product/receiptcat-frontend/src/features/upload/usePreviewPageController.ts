import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { clearSessionFile } from "../../lib/upload/sessionFile"; // Clear persisted file on Back
import { useAccessToken } from "../../lib/auth/useAccessToken"; // Access token from OIDC
import { useAuth } from "react-oidc-context"; // For id_token fallback
import { usePresignedUpload } from "./usePresignedUpload"; // Upload + session-backed preview
import { useFileSelection } from "./useFileSelection"; // pickAndStore/storeCropped/resetToOriginal

// Allowed file extensions (UI + validation copy must stay consistent)
export const ALLOWED_EXTS = ["jpg", "jpeg", "png"] as const;
// Allowed MIME types
export const ALLOWED_MIME = ["image/jpeg", "image/png"] as const;
// Max allowed file size label (MB) – must match upstream validation
export const MAX_FILE_SIZE_MB = 5;

// Small pure helper: format bytes for display
function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—"; // Not available
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`; // Show MB with 2 decimals
  const kb = bytes / 1024;
  if (kb >= 1) return `${kb.toFixed(0)} KB`; // Otherwise show KB rounded
  return `${bytes} B`;
}

/**
 * Centralized controller for Preview page: business/data logic only.
 * Keeps the page component focused on UI concerns.
 */
export function usePreviewPageController() {
  const router = useRouter(); // Navigation helper
  const accessToken = useAccessToken(); // Access token (nullable)
  const { user } = useAuth(); // OIDC user
  const idToken = user?.id_token ?? null; // Fallback id token

  // Upload + preview state from presigned flow
  const {
    previewUrl,
    fileName,
    fileSize,
    isUploading,
    error,
    loadFromSession,
    uploadWithToken,
    cleanupPreviewUrl,
  } = usePresignedUpload();

  // File selection helpers (persist to session)
  const { pickAndStore, storeCropped, resetToOriginal } = useFileSelection({
    onDone: () => loadFromSession(), // Refresh preview from session
    onError: (msg) => alert(msg), // Lightweight user feedback
  });

  // Derive file extension validity
  const fileExtension = useMemo(() => (fileName ? fileName.split(".").pop()?.toLowerCase() : null), [fileName]);
  const isExtensionValid = useMemo(() => (fileExtension ? (ALLOWED_EXTS as readonly string[]).includes(fileExtension) : false), [fileExtension]);

  // Read MIME from sessionStorage when preview changes
  const [storedType, setStoredType] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStoredType(sessionStorage.getItem("fileType") as string | null);
    } catch {
      setStoredType(null); // Storage may be unavailable
    }
  }, [previewUrl, fileName]);
  const isMimeTypeValid = !!storedType && (ALLOWED_MIME as readonly string[]).includes(storedType);

  // Valid only if both extension and MIME are allowed
  const isFileTypeValid = isExtensionValid && isMimeTypeValid;

  // Early load: fetch from session; redirect when missing
  useEffect(() => {
    const ok = loadFromSession();
    if (!ok && !error) router.replace("/app"); // Redirect to dashboard if nothing to preview
  }, [loadFromSession, router, error]);

  // Cleanup object URL on unmount
  useEffect(() => () => cleanupPreviewUrl(), [cleanupPreviewUrl]);

  // Derived labels
  const fileSizeLabel = useMemo(() => formatBytes(fileSize), [fileSize]);
  const confirmLabel = isUploading ? "Uploading..." : (error ? "Retry Upload" : "Confirm Upload");

  // Routing flag to suppress transient error UI while leaving page
  const [isRouting, setIsRouting] = useState(false);

  // Confirm upload: validate auth, upload, inform caller about success
  async function onConfirm(): Promise<boolean> {
    const token = idToken ?? accessToken;
    if (!token) {
      alert("Not authenticated. Please sign in again."); // Keep existing UX
      return false;
    }
    try {
      await uploadWithToken(token); // Perform the upload
      setIsRouting(true); // Suppress transient error UI during redirect
      return true; // Caller can show toast & navigate
    } catch {
      return false; // error state is already set by usePresignedUpload
    }
  }

  // Back to dashboard: cleanup preview and session, then navigate
  function onBack() {
    cleanupPreviewUrl();
    clearSessionFile();
    router.push("/app");
  }

  // Reselect file handler: read selected file, persist, handle errors
  async function onReselectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target; // Cache element
    const file = input.files?.[0]; // Read selected file
    if (!file) return; // User cancelled
    input.value = ""; // Reset AFTER reading so same-file selection still triggers change
    try {
      await pickAndStore(file); // Persist to session
    } catch (err) {
      console.error("Reselect failed:", err); // Diagnostics only
      alert("File reselection failed, please try again"); // Keep existing UX
    }
  }

  return {
    // Data for rendering
    previewUrl,
    fileName,
    fileSizeLabel,
    isUploading,
    error,
    isFileTypeValid,

    // UI labels
    confirmLabel,

    // Navigation / flows
    onConfirm,
    onBack,
    onReselectFile,

    // Expose editing-related helpers used by the page
    storeCropped,
    resetToOriginal,
    cleanupPreviewUrl,

    // Flags that the page relies on
    isRouting,

    // Also expose constants for the page (keeps call-sites simple)
    MAX_FILE_SIZE_MB,
  } as const;
}
