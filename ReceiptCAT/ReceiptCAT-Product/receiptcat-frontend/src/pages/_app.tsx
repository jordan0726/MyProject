// _app.tsx
import type { AppProps } from 'next/app'
import { ConfigProvider, theme } from 'antd'
import 'antd/dist/reset.css'
import '../index.css'
import { AuthProvider, useAuth } from 'react-oidc-context'
import { useEffect } from 'react'
import Head from 'next/head'

const oidc = {
  authority: process.env.NEXT_PUBLIC_OIDC_AUTHORITY!,
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  redirect_uri: process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI!,
  response_type: 'code',
  scope: 'openid email profile',
}

// --- Wrapper to clean URL after login redirect ---
function AuthCleanup({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  useEffect(() => {
    if (auth.isAuthenticated) {
      const hasCodeOrState =
        window.location.search.includes('code=') ||
        window.location.search.includes('state=')

      if (hasCodeOrState) {
        // Replace URL without query params
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [auth.isAuthenticated])

  return <>{children}</>
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider {...oidc}>
      <Head>
        <meta name="referrer" content="no-referrer" />
        <link rel="icon" href="/receiptcat_favicon.ico" />
        <title>ReceiptCAT</title>
      </Head>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#F1773B',
            borderRadius: 12,
          },
          algorithm: theme.defaultAlgorithm,
        }}
      >
        <AuthCleanup>
          <Component {...pageProps} />
        </AuthCleanup>
      </ConfigProvider>
    </AuthProvider>
  )
}