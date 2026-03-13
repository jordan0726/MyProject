// This file implements custom Cypress commands for testing.
// It provides a helper to simulate an already-authenticated OIDC user
// by seeding localStorage/sessionStorage with a fake user object before visiting a page.
/// <reference types="cypress" />
export {};

// Type definition for the fake OIDC user object that will be stored in browser storage.
// This mirrors the structure created by oidc-client-ts / react-oidc-context.
type OidcUser = {
  id_token: string;
  access_token: string;
  token_type: 'Bearer';
  scope: string;
  profile: {
    sub: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    preferred_username?: string;
  };
  expires_at: number; // unix seconds
};

// Build a fake OIDC user object with sensible defaults.
// Allows optional partial overrides to customize fields such as profile.sub.
// Used to seed localStorage/sessionStorage during tests.
function buildFakeUser(partial?: Partial<OidcUser>): OidcUser {
  const now = Math.floor(Date.now() / 1000);
  return {
    id_token: 'fake-id-token',
    access_token: 'fake-access-token',
    token_type: 'Bearer',
    scope: 'openid email profile',
    profile: {
      sub: '497e5428-80b1-7098-4dbc-42c889864fde',
      email: 'receiptcate2etest@gmail.com',
      name: 'receiptcat-e2e-test',
      given_name: 'receiptcat',
      family_name: 'e2e-test',
      preferred_username: 'receiptcat-e2e-test',
      ...(partial?.profile || {}),
    },
    expires_at: now + 60 * 10,
    ...partial,
  };
}

// Compute the storage key used by oidc-client-ts / react-oidc-context.
// This key is based on the OIDC authority and client ID, which are read from Cypress env vars.
function getOidcStorageKey(): string {
  const authority =
    (Cypress.env('OIDC_AUTHORITY') as string) ||
    'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_VpSug7NVk';
  const clientId =
    (Cypress.env('COGNITO_CLIENT_ID') as string) ||
    '542rdb81kgsrosijt332ojr020';
  return `oidc.user:${authority}:${clientId}`;
}

// Register the custom command `cy.visitAsAuthenticated`.
// This command visits a path as if the user is already authenticated.
// It seeds the fake OIDC user into localStorage/sessionStorage before the app loads,
// so that the application immediately sees the user as logged in.
//
// Parameters:
// - path: the route to visit (default "/")
// - userOverrides: optional overrides for the fake OIDC user object
// - visitOptions: optional passthrough options for cy.visit
Cypress.Commands.add(
  'visitAsAuthenticated',
  { prevSubject: false }, // Use this overload so the command can be called without a subject.
  (path: string = '/', userOverrides?: Partial<OidcUser>, visitOptions?: Partial<Cypress.VisitOptions>) => {
    const OIDC_KEY = getOidcStorageKey();
    const fakeUser = buildFakeUser(userOverrides);

    cy.visit(path, {
      ...visitOptions,
      onBeforeLoad(win) {
        const payload = JSON.stringify(fakeUser);
        win.localStorage.setItem(OIDC_KEY, payload);
        try { win.sessionStorage.setItem(OIDC_KEY, payload); } catch {}
        if (visitOptions?.onBeforeLoad) visitOptions.onBeforeLoad(win);
      },
    });
  }
);
