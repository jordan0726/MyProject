// src/lib/auth/signOut.ts
import type { AuthContextProps } from 'react-oidc-context'

/**
 * signOut
 * --------
 * - Utility function to handle a complete Cognito sign-out.
 *
 * Steps:
 * 1) Remove the current user from react-oidc-context (clears local OIDC state).
 * 2) Clear any app-specific session data (here: "rcat_session" in localStorage).
 * 3) Redirect to the Cognito /logout endpoint to clear the IdP session,
 *    then return to the configured post-logout URL.
 *
 * Env vars required:
 * - NEXT_PUBLIC_COGNITO_CLIENT_ID    (Cognito App Client ID)
 * - NEXT_PUBLIC_POST_LOGOUT_URL      (URL to redirect back to after logout)
 * - NEXT_PUBLIC_COGNITO_DOMAIN       (Cognito domain, with or without protocol)
 *
 * Usage:
 * ```ts
 * import { signOut } from '../lib/auth/signOut'
 *
 * const auth = useAuth();
 * await signOut(auth);
 * ```
 */
export async function signOut(auth: AuthContextProps) {
  // 1. Clear OIDC user state
  await auth.removeUser()

  // 2. Clear local app session
  localStorage.removeItem('rcat_session')

  // 3. Clear session storage
  try {
    sessionStorage.clear()
  } catch (err) {
    console.warn('Failed to clear sessionStorage during sign-out:', err)
  }

  // 4. Redirect to Cognito logout
  const cid = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!
  const postLogout = process.env.NEXT_PUBLIC_POST_LOGOUT_URL!
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!
  const base = domain.startsWith('http') ? domain : `https://${domain}`

  const url = new URL(`${base}/logout`)
  url.searchParams.set('client_id', cid)
  url.searchParams.set('logout_uri', postLogout)

  window.location.href = url.toString()
}