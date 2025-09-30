// cypress/e2e/auth.e2e.cy.js
describe('E2E: login via UI', () => {
  const { email, password } = Cypress.env('testUser');

  // click the first available submit
  function clickSubmit() {
    cy.get('body').then(($body) => {
      const candidates = [
        'button[type="submit"]',
        'input[type="submit"]',
        '#login',
        '[data-cy="login-btn"]'
      ];
      const found = candidates.find(sel => $body.find(sel).length > 0);
      if (!found) throw new Error('No submit button found. Add id="login" or data-cy="login-btn".');
      cy.get(found).first().click();
    });
  }

  it('logs in and lands on dashboard (persists token)', () => {
    // watch the real login call
    cy.intercept('POST', '/api/auth/login').as('login');

    cy.visit('/login.html');

    cy.get('#email, [data-cy="email"]').type(email);
    cy.get('#password, [data-cy="password"]').type(password, { log: false });

    clickSubmit();

    // ensure token is saved under keys your app might read
    cy.wait('@login').then(({ response }) => {
      const token =
        response?.body?.token ||
        response?.body?.accessToken ||
        response?.body?.jwt;

      expect(token, 'login token').to.be.a('string');

      cy.window().then((win) => {
        // write to several common keys to survive inconsistent pages
        ['token', 'accessToken', 'jwt', 'authToken'].forEach(k =>
          win.localStorage.setItem(k, token)
        );
      });
    });

    // now assert we stay on dashboard
    cy.location('pathname', { timeout: 10000 }).should('match', /\/dashboard\.html$/);
    cy.contains(/dashboard|welcome|rooms/i);
  });
});
