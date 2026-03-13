// src/pages/index.tsx
/**
 * LoginPage
 * ----------
 * - Entry page for authentication.
 * - Uses react-oidc-context to trigger Cognito's managed login flow.
 * - Local "sign in with provider" UI has been kept in comments for reference,
 *   but is currently replaced by the OIDC redirect flow.
 *
 * Behavior:
 * - On mount: if not loading, not authenticated, and no active navigator,
 *   automatically call signinRedirect() to start Cognito login.
 * - Styling: background and layout handled by LoginPage.module.css.
 *
 * Future work:
 * - Add error/redirect handling (e.g., show a message if redirect fails).
 * - Optionally restore local provider buttons if moving away from
 *   Cognito’s hosted UI.
 */

import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'


export default function LoginPage() {
  const auth = useAuth();

  useEffect(() => {
    // 1) If user is authenticated already, send them to the app shell immediately.
    if (!auth.isLoading && auth.isAuthenticated) {
      // Use the same redirect URI configured for redirect url (e.g., http://localhost:3000/app in dev env)
      const target = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || '/app';
      window.location.assign(target);
      return;
    }

    // 2) If user is not authenticated and no active navigator, kick off redirect to Cognito Hosted Login.
    if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
      auth.signinRedirect().catch((err) => {
        console.error('signinRedirect failed:', err);
      });
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.activeNavigator, auth]);

  return (
    <div>
      {/*
       ===== Legacy local login UI (disabled) =====
        Retained only for reference. Was previously using AuthButton
        for Google, Microsoft, and Apple sign-in.

        <Space direction="vertical" size="middle" className={s.btnGroup}>
          <AuthButton
            provider="google"
            icon={<FcGoogle aria-hidden="true" />}
            onClick={() => {/* replaced by react-oidc-context 
          >
            Continue with Google
          </AuthButton>

          <AuthButton
            provider="microsoft"
            icon={<FaWindows aria-hidden="true" />}
            onClick={() => {/* replaced by react-oidc-context 
          >
            Continue with Microsoft
          </AuthButton>

          <AuthButton
            provider="apple"
            icon={<FaApple aria-hidden="true" />}
            onClick={() => {/* replaced by react-oidc-context *
          >
            Continue with Apple
          </AuthButton>
        </Space>
      */}
    </div>
  )
}

