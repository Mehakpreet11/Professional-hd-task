// cypress/e2e/room-chat.e2e.cy.js
import '../support/e2e.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Very specific selectors so Cypress never clicks the wrong button
const INPUT_SEL = '#messageInput, [data-cy="message-input"]';
const SEND_SEL  = '#sendBtn, [data-cy="send-btn"]';

// open room, trying both ?roomId= and ?id=
function visitRoomByAnyParam(id) {
  // ignore any "Invalid room URL" alert
  cy.on('window:alert', () => {});

  // try ?roomId= first
  cy.visit(`/room.html?roomId=${id}`, { failOnStatusCode: false });

  return cy.location('pathname', { timeout: 1000 }).then((path) => {
    if (/\/room\.html$/.test(path)) return;

    // fallback: try ?id=
    cy.visit(`/room.html?id=${id}`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 4000 }).should('match', /\/room\.html$/);
  });
}

describe('E2E: create room -> open -> send message', () => {
  const { email, password } = Cypress.env('testUser') || {
    email: 'jane@example.com',
    password: 'secret123',
  };

  it('creates a room (API), opens it (any param), and shows a message', () => {
    // 1) Login via API (stores token in browser localStorage)
    cy.visit('/login.html');
    cy.loginByApi(email, password);

    // 2) Create a room via API with required fields (your custom command already sends study/break)
    const roomName = `Cypress Room ${Date.now()}`;
    cy.createRoom(roomName).then(({ id }) => {
      expect(id, 'room id to open').to.exist;

      // 3) Visit room using whichever param your frontend expects
      visitRoomByAnyParam(id);

      // Assert we are on room.html and UI is present
      cy.location('pathname').should('match', /\/room\.html$/);
      cy.get('body').should('be.visible');

      // 4) Send a message via the UI (most robust across backends)
      const msg = `hello from cypress ${Date.now()}`;

      // Wait for input to be visible (socket connect can take a moment)
      cy.get(INPUT_SEL).should('be.visible').clear().type(msg);

      // Click ONLY the chat send button
      cy.get(SEND_SEL).should('be.visible').click();

      // 5) Expect the message to appear (server echoes via socket)
      cy.contains(new RegExp(escapeRe(msg), 'i'), { timeout: 6000 }).should('exist');
    });
  });
});
