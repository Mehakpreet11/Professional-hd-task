// cypress/e2e/api/chat.cy.js

// helper: ensure we have a room and return its id
function ensureRoom(token) {
  const apiUrl = Cypress.env('apiUrl');

  // try list first
  return cy.request({
    method: 'GET',
    url: `${apiUrl}/api/rooms`,
    headers: { Authorization: `Bearer ${token}` }
  }).then((list) => {
    const rooms = list.body.rooms || list.body.data || [];
    if (rooms.length > 0) {
      const r = rooms.find((x) => x.name && x.name.includes('Public')) || rooms[0];
      const id = r._id || r.id || r.roomId;
      return id;
    }

    // none found → create one
    return cy.request({
      method: 'POST',
      url: `${apiUrl}/api/rooms`,
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: `Cypress Temp Room ${Date.now()}`,
        studyInterval: 25,
        breakInterval: 5,
        privacy: 'public'
      }
    }).then((resp) => {
      expect([200, 201]).to.include(resp.status);
      return resp.body.roomId || resp.body._id || resp.body.id || resp.body?.room?._id;
    });
  });
}

describe('Chat API', () => {
  it('posts and fetches messages for a room', () => {
    cy.apiLogin().then((token) => {
      ensureRoom(token).then((roomId) => {
        expect(roomId, 'room id exists').to.exist;

        // post message
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/api/chat/rooms/${roomId}/messages`,
          headers: { Authorization: `Bearer ${token}` },
          body: { message: 'message from cypress' },
          failOnStatusCode: false
        }).then((post) => {
          expect([200, 201]).to.include(post.status);

          // fetch recent messages
          cy.request({
            method: 'GET',
            url: `${Cypress.env('apiUrl')}/api/chat/rooms/${roomId}/messages?limit=5`,
            headers: { Authorization: `Bearer ${token}` }
          }).then((get) => {
            expect(get.status).to.eq(200);
            const messages = get.body.messages || get.body.data || [];
            const found = messages.some((m) => (m.message || m.text) === 'message from cypress');
            expect(found).to.eq(true);
          });
        });
      });
    });
  });

  it('rejects empty message', () => {
    cy.apiLogin().then((token) => {
      ensureRoom(token).then((roomId) => {
        expect(roomId, 'room id exists').to.exist;

        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/api/chat/rooms/${roomId}/messages`,
          headers: { Authorization: `Bearer ${token}` },
          body: { message: '' },
          failOnStatusCode: false
        }).then((resp) => {
          // accept 400 or 422 depending on your validation
          expect([400, 422]).to.include(resp.status);
        });
      });
    });
  });
});
