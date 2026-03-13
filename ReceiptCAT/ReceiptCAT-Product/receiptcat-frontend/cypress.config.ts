import { defineConfig } from 'cypress';
import * as dotenv from 'dotenv';

// Load Next.js dev env so Cypress can reuse the same values
dotenv.config({ path: '.env.development' });

export default defineConfig({
  e2e: {
    // NOTE: cy.origin() is stable in Cypress ≥12; no experimental flag required.
    baseUrl: process.env.CYPRESS_FRONTEND_BASE_URL,
    specPattern: 'cypress/e2e/**/*.cy.{js,ts,jsx,tsx}',
    supportFile: 'cypress/support/e2e.ts',

    // Pass-through env vars so tests can read with Cypress.env('...')
    env: {
      COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
      OIDC_REDIRECT_URI: process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI, 
      COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      OIDC_AUTHORITY: process.env.NEXT_PUBLIC_OIDC_AUTHORITY,      
    },
  },
  video: false,
  screenshotOnRunFailure: true,
});
