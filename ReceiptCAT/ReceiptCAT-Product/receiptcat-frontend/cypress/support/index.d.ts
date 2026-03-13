/// <reference types="cypress" />

// OIDC user shape used by our custom authentication command (declared globally).
// This mirrors the structure stored by oidc-client-ts / react-oidc-context in storage.
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

// Augment Cypress.Chainable with our custom command (ambient/global augmentation).
declare namespace Cypress {
  interface Chainable {
    /**
     * Visit a path with a mocked authenticated OIDC user seeded into storage
     * before the app loads.
     *
     * @param path Target path to visit. Defaults to "/".
     * @param userOverrides Optional partial to override the default fake user (e.g., profile.sub).
     * @param visitOptions Optional passthrough of Cypress.visit options.
     * @returns Chainable<void>
     */
    visitAsAuthenticated(
      path?: string,
      userOverrides?: Partial<OidcUser>,
      visitOptions?: Partial<Cypress.VisitOptions>
    ): Chainable<void>;
  }
}