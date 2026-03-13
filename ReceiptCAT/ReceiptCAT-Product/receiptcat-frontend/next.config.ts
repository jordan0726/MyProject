import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // CI/CD setting: generate a static export instead of running as SSR.
  // This allows deployment to S3/CloudFront or any static hosting.
  output: 'export',

  // Image settings: "export" mode requires unoptimized images,
  // otherwise `next build` will fail since the built-in image optimizer needs a server.
  images: {
    unoptimized: true,
    domains: ['localhost'], // Keep local domain support (useful for local dev or API-provided images).
  },

  // Environment variables: must use the NEXT_PUBLIC_ prefix
  // so that they are exposed to the client-side bundle.
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001',
  },
};

export default nextConfig;