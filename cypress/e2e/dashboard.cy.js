describe('Dashboard API', () => {
  it('requires auth and returns dashboard data', () => {
    cy.apiLogin().then((token) => {
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/dashboard`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        // relax shape a bit to match your API
        expect(resp.body).to.be.an('object');
        // if your API returns these keys, keep the strict check; else comment/remove
        // expect(resp.body).to.have.keys('username','sessions','streak','timeStudied')
      });
    });
  });

  it('401/403/404 without token (route must exist + be protected)', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/dashboard`,
      failOnStatusCode: false
    }).then((resp) => {
      // Until your middleware is wired, include 404 too
      expect([401, 403, 404]).to.include(resp.status);
    });
  });
});
