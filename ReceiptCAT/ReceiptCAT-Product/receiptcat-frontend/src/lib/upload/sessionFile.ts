export type SessionFileInfo = { fileName: string };

type SessionRead = {
  fileInfo: SessionFileInfo | null;
  previewUrl: string | null;
  file: File | null;
  contentType: string | null;
  origData: string | null;
  origType: string | null;
  origInfo: SessionFileInfo | null;
};

/**
 * Read minimal session state for the current working preview.
 * Note: we no longer persist working base64 (fileData), so this function
 * returns only lightweight metadata and the preview URL. Callers should
 * rebuild the File asynchronously from previewUrl when needed.
 */
export function readSessionFile(): SessionRead {
  const storedFileInfo = sessionStorage.getItem("fileInfo");
  const storedFileUrl = sessionStorage.getItem("fileUrl");
  const fileType = sessionStorage.getItem("fileType");

  const origInfoStr = sessionStorage.getItem("origFileInfo");
  const origData = sessionStorage.getItem("origFileData");
  const origType = sessionStorage.getItem("origFileType");
  const origInfo = origInfoStr ? (JSON.parse(origInfoStr) as SessionFileInfo) : null;

  if (!storedFileUrl && !origData) {
    return { fileInfo: null, previewUrl: null, file: null, contentType: null, origData: null, origType: null, origInfo: null };
  }

  const info = storedFileInfo ? (JSON.parse(storedFileInfo) as SessionFileInfo) : null;
  return {
    fileInfo: info,
    previewUrl: storedFileUrl,
    file: null, // Rebuild when needed via fetch(previewUrl).then(r => r.blob())
    contentType: fileType || "image/jpeg",
    origData,
    origType,
    origInfo,
  };
}

/**
 * Clear working and original file entries from sessionStorage.
 * Includes legacy key removal for backward compatibility (no-op if absent).
 */
export function clearSessionFile() {
  sessionStorage.removeItem("fileInfo");
  sessionStorage.removeItem("fileUrl");
  sessionStorage.removeItem("fileData");
  sessionStorage.removeItem("fileType");
  sessionStorage.removeItem("origFileInfo");
  sessionStorage.removeItem("origFileUrl");
  sessionStorage.removeItem("origFileData");
  sessionStorage.removeItem("origFileType");
}