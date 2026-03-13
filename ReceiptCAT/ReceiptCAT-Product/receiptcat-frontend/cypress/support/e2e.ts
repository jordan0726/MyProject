// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global test configuration
beforeEach(() => {
  // Add any global setup here
  cy.viewport(1280, 720) // Set consistent viewport size
})


  // We deliberately ignore certain uncaught exceptions here.
  // Reason:
  // - When Cypress triggers a redirect to the Cognito Hosted UI (which is an external
  //   React app), that page may throw React "minified error" codes (#418, #423, etc.)
  //   or other runtime exceptions unrelated to our application.
  // - These errors do not affect our app’s behavior. They only appear because Cypress
  //   observes the cross-origin page and reports its internal exceptions.
  // - If we do not filter them out, Cypress would incorrectly fail our tests every
  //   time we redirect to Cognito.
  //
  // By returning false for these known patterns, we tell Cypress to ignore them and
  // continue the test run. This keeps the focus on testing our own app logic, not
  // third-party Hosted UI internals.
Cypress.on('uncaught:exception', (err) => {
  const msg = err?.message || ''

  if (
    msg.includes('reactjs.org/docs/error-decoder') || // React prod minified errors
    msg.includes('amazoncognito.com') // Cognito Hosted UI runtime errors
  ) {
    return false
  }
})