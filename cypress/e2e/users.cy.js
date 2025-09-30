describe('Users list', () => {
  it('lists users from fixture', function () {
    cy.intercept('GET', `${Cypress.env('apiUrl')}/api/users`, {
      statusCode: 200,
      body: this.fxUsers
    }).as('getUsers');

    cy.visit('/dashboard.html'); // the page that loads users

    cy.wait('@getUsers').its('response.body').should('have.length', 10);

    // assert UI renders a list
    cy.get('[data-cy="users-list"] > *')      // li, .card, etc.
      .should('have.length', 10)
      .first().should('contain', this.fxUsers[0].name);

    // spot-check a couple of fields for one user
    const u = this.fxUsers[3];
    cy.contains('[data-cy="users-list"] *', u.username).should('exist');
    cy.contains('[data-cy="users-list"] *', u.email).should('exist');
  });
});
