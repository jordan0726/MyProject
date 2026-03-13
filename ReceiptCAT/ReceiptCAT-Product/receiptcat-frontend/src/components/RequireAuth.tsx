// src/components/RequireAuth.tsx
import { PropsWithChildren } from 'react'
import { useAuthGuard } from '../lib/auth/useAuthGuard'
import AppLayout from '../layouts/AppLayout'

/**
 * RequireAuth
 * ------------
 * - Higher-order wrapper for protecting routes/components.
 * - Uses `useAuthGuard` to check the current authentication state.
 *
 * Behavior:
 * - While loading: shows AppLayout with "Loading…"
 * - On error: shows AppLayout with the error message
 * - If not authenticated: shows AppLayout with "Redirecting…"
 * - If authenticated: renders children normally
 *
 * Usage:
 * ```tsx
 * <RequireAuth>
 *   <DashboardPage />
 * </RequireAuth>
 * ```
 */
export default function RequireAuth({ children }: PropsWithChildren) {
  const auth = useAuthGuard()

  if (auth.isLoading) {
    return (
      <AppLayout>
        <p>Loading…</p>
      </AppLayout>
    )
  }

  if (auth.error) {
    return (
      <AppLayout>
        <p>Auth error: {auth.error.message}</p>
      </AppLayout>
    )
  }

  if (!auth.isAuthenticated || auth.user?.expired) {
    return (
      <AppLayout>
        <p>Redirecting…</p>
      </AppLayout>
    )
  }

  return <>{children}</>
}