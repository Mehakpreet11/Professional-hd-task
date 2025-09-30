

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('E2E: dashboard lists rooms', () => {
  const { email, password } = Cypress.env('testUser') || {
    email: 'jane@example.com',
    password: 'secret123',
  };

  it('shows rooms from live API (or a clear empty state)', () => {
    // Ensure same-origin storage and log in quickly via API
    cy.visit('/login.html');
    cy.loginByApi(email, password);

    // Watch the dashboard request (may be 200 or 304 due to caching)
    cy.intercept('GET', '/api/rooms').as('rooms');

    // Visit dashboard
    cy.visit('/dashboard.html');

    // Wait for the UI call, then normalize response by optionally refetching via auth API
    cy.wait('@rooms').then(({ response }) => {
      const code = response?.statusCode ?? 0;

      // If the UI got a 200 with JSON, use it; otherwise refetch directly
      const useUiBody = code === 200 && (Array.isArray(response.body) || response.body?.rooms);

      if (useUiBody) {
        const list = Array.isArray(response.body?.rooms)
          ? response.body.rooms
          : Array.isArray(response.body)
            ? response.body
            : [];

        assertUi(list);
      } else {
        // 304 or missing body? Do an authed request to get the real JSON.
        cy.authRequest({ method: 'GET', url: '/api/rooms' }).then((res) => {
          expect(res.status).to.be.oneOf([200, 201]); // some backends return 201 with a payload
          const list = Array.isArray(res.body?.rooms)
            ? res.body.rooms
            : Array.isArray(res.body)
              ? res.body
              : [];
          assertUi(list);
        });
      }
    });

    function assertUi(list) {
      if (list.length > 0 && list[0]?.name) {
        const name = list[0].name;
        cy.contains(new RegExp(escapeRe(name), 'i'), { timeout: 4000 }).should('exist');
      } else {
        // Tweak the copy to match your empty-state text if needed
        cy.contains(/create room|new room|no rooms/i, { timeout: 4000 }).should('exist');
      }
    }
  });
});
