// React custom hook managing upload state and delegating network I/O to uploadService

import { useCallback, useState } from "react";
import {
  getPresignedUrl,
  putObjectToS3,
  NetworkTimeoutError,
  NetworkError,
  UnauthorizedError,
  ClientError,
  ServerError,
  BadResponseError
} from "../../lib/upload/uploadService";
import { clearSessionFile, readSessionFile } from "../../lib/upload/sessionFile";
import { loadFromSession as loadFromSessionUtil } from "../../lib/upload/loadFileFromSession";

/**
 * Result type returned by usePresignedUpload hook.
 * - previewUrl: URL for previewing the uploaded file.
 * - fileName: Name of the file being uploaded.
 * - fileSize: actual file size in bytes for UI display
 * - isUploading: Upload operation in progress flag.
 * - error: Error message if upload fails.
 * - loadFromSession: Function to initialize state from session storage; returns false if data missing.
 * - uploadWithToken: Function to perform upload using a presigned token.
 * - cleanupPreviewUrl: Function to revoke object URL to avoid memory leaks.
 * - success: boolean indicating if upload succeeded
 */
type Result = {
  previewUrl: string | null;
  fileName: string | null;
  fileSize: number | null; // actual file size in bytes for UI display
  isUploading: boolean;
  error: string | null;
  loadFromSession: () => boolean;      // returns false if missing, so page can redirect
  uploadWithToken: (token: string) => Promise<void>;
  cleanupPreviewUrl: () => void;
  success: boolean;
};

export function usePresignedUpload(): Result {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);   // URL for previewing the uploaded file
  const [fileName, setFileName] = useState<string | null>(null);       // Name of the file selected for upload
  const [file, setFile] = useState<File | null>(null);                 // File object selected for upload
  const [fileSize, setFileSize] = useState<number | null>(null); // keep file size in bytes
  const [contentType, setContentType] = useState<string | null>(null); // MIME type of the file
  const [isUploading, setIsUploading] = useState(false);               // Flag indicating if an upload is currently in progress
  const [error, setError] = useState<string | null>(null);             // Error message string if upload fails
  const [success, setSuccess] = useState<boolean>(false);              // Flag indicating if upload succeeded

  const loadFromSession = useCallback(() => {
    // Synchronous minimal validation to decide navigation quickly
    const data = readSessionFile();
    if (!data.fileInfo) return false;
    if (!data.previewUrl && !data.origData) return false;
    if (!data.contentType && !data.origType) return false;

    // Initialize state to a neutral baseline before async rebuild
    setFileName(data.fileInfo.fileName);
    setPreviewUrl(data.previewUrl);
    setContentType(data.contentType || data.origType || null);
    setFile(null);
    setFileSize(null);

    // Kick off async rebuild via the shared util (does previewUrl-first, then origData fallback)
    (async () => {
      try {
        const result = await loadFromSessionUtil();
        if (!result) return;
        setFileName(result.fileInfo!.fileName);
        setPreviewUrl(result.previewUrl);
        setFile(result.file);
        setFileSize(result.fileSize);
        setContentType(result.contentType);
      } catch (err) {
        console.error("loadFromSession util failed:", err);
      }
    })();

    return true;
  }, []);

  /**
   * Uploads the current file using a presigned URL obtained with the provided token.
   * Workflow:
   * 1. Request presigned URL from backend.
   * 2. Upload file to S3 using the presigned URL.
   * 3. Clear session storage upon success.
   * 4. Manage error and uploading state flags.
   */
  const uploadWithToken = useCallback(async (token: string) => {
    if (!file || !contentType || !fileName) throw new Error("Missing file in memory");
    setError(null);
    setIsUploading(true);
    setSuccess(false);
    try {
      const { uploadUrl } = await getPresignedUrl(token, { fileName, contentType });
      await putObjectToS3(uploadUrl, file, contentType);
      clearSessionFile();
      setSuccess(true);
    } catch (e: unknown) {
      // Classify errors based on type and set user-friendly message
      let message: string;
      if (e instanceof NetworkTimeoutError) {
        message = "The request timed out. Please try again.";
      } else if (e instanceof NetworkError) {
        message = "Network error occurred. Please check your connection.";
      } else if (e instanceof UnauthorizedError) {
        message = "You are not authorized. Please log in again.";
      } else if (e instanceof ClientError) {
        // Map common 4xx statuses to user-friendly messages
        if (e.status === 413) {
          message = "The file is too large. Please upload a smaller file.";
        } else if (e.status === 415) {
          message = "Unsupported file type. Please upload a supported format.";
        } else if (e.status === 400) {
          message = "Invalid upload request. Please reselect the file and try again.";
        } else {
          message = "Upload failed due to a client error. Please check the file and try again.";
        }
      } else if (e instanceof ServerError) {
        message = "Server error occurred. Please try again later.";
      } else if (e instanceof BadResponseError) {
        message = "Unexpected response from server. Please contact support.";
      } else if (e instanceof Error) {
        message = e.message || "Upload failed";
      } else {
        message = "Upload failed";
      }
      setError(message);
      setSuccess(false);
      throw e;
    } finally {
      setIsUploading(false);
    }
  }, [file, contentType, fileName]);

  /**
   * Releases the object URL created for file preview to avoid memory leaks.
   * Should be called when component unmounts or preview URL changes.
   */
  const cleanupPreviewUrl = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Expose state and actions for components using this hook
  return { previewUrl, fileName, fileSize, isUploading, error, loadFromSession, uploadWithToken, cleanupPreviewUrl, success };
}