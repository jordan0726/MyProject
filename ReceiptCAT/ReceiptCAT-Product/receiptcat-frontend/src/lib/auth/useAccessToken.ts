// src/lib/auth/useAccessToken.ts
import { useMemo } from 'react'
import { useAuth } from 'react-oidc-context'

/**
 * useAccessToken
 * ---------------
 * - Small helper hook for reading the current access token from react-oidc-context.
 * - Returns `null` if the user is not authenticated or no token is available.
 *
 * Behavior:
 * - Memoizes the token value so it only recalculates when `isAuthenticated` or `user` changes.
 *
 * Returns:
 * - string | null
 *
 * Usage:
 * ```tsx
 * const token = useAccessToken();
 * if (token) {
 *   fetch('/api/receipts', { headers: { Authorization: `Bearer ${token}` } });
 * }
 * ```
 */
export function useAccessToken() {
  const { isAuthenticated, user } = useAuth()

  return useMemo(
    () => (isAuthenticated ? user?.access_token ?? null : null),
    [isAuthenticated, user]
  )
}