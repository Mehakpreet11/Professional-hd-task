// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:5000',              // your backend serves FE + API + sockets
    specPattern: ['cypress/e2e/**/*.e2e.cy.{js,ts}','cypress/e2e/**/*.cy.{js,ts}'],
    excludeSpecPattern: ['**/1-getting-started/**','**/2-advanced-examples/**'], // hide examples
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) { return config; }
  },
  env: {
    apiUrl: 'http://127.0.0.1:5000',
    testUser: { email: 'mom@gmail.com', password: '12345678' }
  },
  video: false
});
