describe('Auth API', () => {
  it('logs in seeded user and returns JWT', () => {
    cy.apiLogin().then((token) => {
      // very lenient JWT regex for base64url.base64url.base64url
      expect(token).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });
  });

  it('rejects invalid credentials', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/auth/login`,
      body: { email: 'nope@example.com', password: 'wrong' },
      failOnStatusCode: false
    }).then((resp) => {
      // allow 400 or 401 depending on your implementation
      expect([400, 401]).to.include(resp.status);
      // message field may differ; just assert body is an object
      expect(resp.body).to.be.an('object');
    });
  });
});
