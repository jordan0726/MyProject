/* This module encapsulates all network input/output operations related to the file upload feature.
It isolates the details of interacting with the backend API and AWS S3 presigned URLs from the rest of the application,
providing a clean interface for obtaining presigned URLs and uploading files securely.
*/

// ---- Error types & helpers (low-level, infra layer) ----
export class NetworkTimeoutError extends Error { // Thrown when a request exceeds the allowed time
  name = "NetworkTimeoutError";
  constructor(message: string) { super(message); }
}

export class NetworkError extends Error { // Generic network/connectivity failure
  name = "NetworkError";
  constructor(message: string) { super(message); }
}

export class BadResponseError extends Error { // Response shape or parsing is invalid
  name = "BadResponseError";
  constructor(message: string) { super(message); }
}

export class UnauthorizedError extends Error { // 401/403 auth issues
  name = "UnauthorizedError";
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Unauthorized (${status})`);
    this.status = status;
    this.body = body;
  }
}

export class ClientError extends Error { // Generic 4xx error
  name = "ClientError";
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Client error (${status})`);
    this.status = status;
    this.body = body;
  }
}

export class ServerError extends Error { // 5xx error from server/S3
  name = "ServerError";
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Server error (${status})`);
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT_MS = 15000; // 15s default timeout for network calls

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
  // Abort the fetch if it exceeds timeoutMs; if a signal is provided, prefer it
  const hasExternalSignal = !!init.signal;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: hasExternalSignal ? init.signal : controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") throw new NetworkTimeoutError(`Request timed out after ${timeoutMs}ms`); // Map to typed timeout
    throw new NetworkError(e?.message ?? "Network error"); // Map other fetch failures
  }
}
// ---- End error/types helpers ----

export type PresignRequest = { fileName: string; contentType: string };
// PresignRequest represents the payload sent to the backend API to request a presigned URL.
// It includes the name of the file to be uploaded and its MIME content type.

export type PresignResponse = { uploadUrl: string; key: string };
// PresignResponse represents the expected response from the backend API when requesting a presigned URL.
// It contains the uploadUrl (the presigned S3 URL to which the file should be uploaded) and the key (the S3 object key).

// Base URL of the backend API, read from environment variables.
// The check ensures the variable is set at import time to fail fast if misconfigured,
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
if (!API_BASE) {
  // Fail fast at import time so it’s obvious in dev
  // (Next.js will surface this in the browser console too)
  console.error("Missing NEXT_PUBLIC_API_BASE");
}

/**
 * Requests a presigned URL from the backend API for uploading a file.
 * 
 * This function sends a POST request to the backend API's /upload/presign endpoint with the file name and content type.
 * The backend responds with a presigned URL and the S3 key where the file should be uploaded.
 * 
 * If the request fails or the response is malformed, this function throws an error.
 * 
 * @param token - The raw JWT token used for authorization (without 'Bearer ' prefix).
 * @param body - The presign request containing the file name and content type.
 * @returns A promise that resolves to the presigned URL and S3 key.
 */
export async function getPresignedUrl(token: string, body: PresignRequest): Promise<PresignResponse> {
  // Send POST request to backend API to obtain presigned URL
  const res = await fetchWithTimeout(`${API_BASE}/upload/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Important: the current poc API Gateway + Cognito authorizer expects raw JWT (no 'Bearer ')
      Authorization: token,
    },
    body: JSON.stringify(body),
  });

  // Clone the response and read text for error reporting or parsing
  const text = await res.clone().text().catch(() => "(no body)");
  if (!res.ok) {
    // Classify 4xx/5xx for the caller
    if (res.status === 401 || res.status === 403) throw new UnauthorizedError(res.status, text); // Auth issue
    if (res.status >= 400 && res.status < 500) throw new ClientError(res.status, text); // Client-side problem (bad input, too large, etc.)
    if (res.status >= 500) throw new ServerError(res.status, text); // Backend unavailability or error
  }

  let json: PresignResponse;
  try {
    json = JSON.parse(text) as PresignResponse; // Backend should return JSON
  } catch {
    throw new BadResponseError("Failed to parse presign response JSON"); // Malformed response
  }
  if (!json.uploadUrl || !json.key) throw new BadResponseError("Invalid presign response (missing uploadUrl/key)"); // Defensive validation
  return json;
}

/**
 * Uploads a file to S3 using the provided presigned URL.
 * 
 * This function performs a PUT request directly to the S3 presigned URL with the file as the request body.
 * The content type header must match the file's MIME type.
 * 
 * If the upload fails (non-2xx status), this function throws an error.
 * 
 * @param uploadUrl - The presigned S3 URL to upload the file to.
 * @param file - The file object to upload.
 * @param contentType - The MIME content type of the file.
 */
export async function putObjectToS3(uploadUrl: string, file: File, contentType: string): Promise<void> {
  const put = await fetchWithTimeout(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) {
    const bodyText = await put.text().catch(() => "(no body)"); // Capture response for diagnostics
    if (put.status >= 400 && put.status < 500) throw new ClientError(put.status, bodyText); // Typically bad headers/content-type/size
    if (put.status >= 500) throw new ServerError(put.status, bodyText); // S3 or network path server error
  }
}