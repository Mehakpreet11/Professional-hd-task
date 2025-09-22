// const { defineConfig } = require('cypress');

// module.exports = defineConfig({
//   e2e: {
//     baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173', // static site
//     env: {
//       apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:4000'  // your backend
//     },
//     video: true,
//     retries: { runMode: 2, openMode: 0 },
//     viewportWidth: 1280,
//     viewportHeight: 800
//   }
// });
// import { defineConfig } from 'cypress'

// export default defineConfig({
//   e2e: {
//     baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',             // will be used later for UI; not required for API tests
//     supportFile: 'cypress/support/e2e.ts',
//     specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
//     chromeWebSecurity: false,
//     retries: { runMode: 2, openMode: 0 },
//     env: {
//       apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:4000',            // your backend
//       testUserEmail: 'test@example.com',
//       testUserPassword: 'Passw0rd!'
//     },
//     setupNodeEvents(on, config) {
//       return config
//     }
//   },
//   video: true,
//   screenshotOnRunFailure: true
// })
// cypress.config.js (CommonJS)
// cypress.config.js
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // look in api first, but also allow plain e2e or legacy integration
    specPattern: [
      'cypress/e2e/api/**/*.cy.{js,ts}',
      'cypress/e2e/**/*.cy.{js,ts}',
      'cypress/integration/**/*.cy.{js,ts}',
      'cypress/integration/**/*.spec.{js,ts}'
    ],
    baseUrl: 'http://localhost:5000',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      return config;
    },
  },
  env: {
    apiUrl: 'http://localhost:5000'
  },
  video: false
});



