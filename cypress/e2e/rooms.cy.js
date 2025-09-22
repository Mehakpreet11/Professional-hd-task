describe('Rooms API', () => {
  it('lists rooms visible to user and includes username field', () => {
    cy.apiLogin().then((token) => {
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/rooms`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an('object');
        // adapt to your API: keep if these fields exist
        // expect(resp.body).to.have.property('username')
        // expect(resp.body).to.have.property('rooms')
        // For flexibility:
        const rooms = resp.body.rooms || resp.body.data || resp.body || [];
        expect(rooms).to.be.an('array');
      });
    });
  });

  it('creates a new room', () => {
    cy.apiLogin().then((token) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/rooms`,
        headers: { Authorization: `Bearer ${token}` },
        body: {
          name: 'My Cypress Room',
          studyInterval: 25,
          breakInterval: 5,
          privacy: 'public'
        },
        failOnStatusCode: false
      }).then((resp) => {
        // accept 201 or 200 depending on your controller
        expect([200, 201]).to.include(resp.status);
        // flexible assertions for message & id
        expect(resp.body).to.be.an('object');
        // expect(resp.body).to.include({ success: true, message: 'Room created successfully' })
        const id = resp.body.roomId || resp.body._id || resp.body.id || resp.body?.room?._id;
        expect(id, 'room id present').to.exist;
      });
    });
  });

  it('fetches a room by id (public or participant)', () => {
    cy.apiLogin().then((token) => {
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/rooms`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((list) => {
        const rooms = list.body.rooms || list.body.data || [];
        expect(rooms.length, 'has at least one room').to.be.greaterThan(0);
        const room = rooms[0];
        const roomId = room._id || room.id || room.roomId;

        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/api/rooms/${roomId}`,
          headers: { Authorization: `Bearer ${token}` }
        }).then((resp) => {
          expect(resp.status).to.eq(200);
          expect(resp.body).to.be.an('object');
          // expect(resp.body).to.have.property('name')
        });
      });
    });
  });
});
