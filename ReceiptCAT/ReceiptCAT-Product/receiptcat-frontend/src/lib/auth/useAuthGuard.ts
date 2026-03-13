// src/lib/auth/useAuthGuard.ts
import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'

/**
 * useAuthGuard
 * -------------
 * - Custom hook that wraps react-oidc-context's useAuth().
 * - Adds redirect logic when user is not authenticated.
 *
 * Behavior:
 * - On mount and whenever auth state changes:
 *   - If not loading, not authenticated, and no active navigator (no redirect/popup in progress),
 *     redirect to "/" (LoginPage), which will auto-trigger the managed login flow.
 * - Adds a `pageshow` listener to handle BFCache (back/forward cache).
 *   Ensures auth state is re-checked when navigating back.
 *
 * Returns:
 * - The same auth object from useAuth().
 *
 * Usage:
 * ```tsx
 * const auth = useAuthGuard();
 * if (auth.isAuthenticated) { ... }
 * ```
 */
export function useAuthGuard() {
  const auth = useAuth()

  useEffect(() => {
    const check = () => {
      if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
        // Redirect to landing page; LandingPage will trigger Cognito Hosted login page
        window.location.replace('/')
      }
    }
    check()

    // Handle browser Back/Forward cache (BFCache)
    const onPageShow = () => check()
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [auth.isLoading, auth.isAuthenticated, auth.activeNavigator])

  return auth
}