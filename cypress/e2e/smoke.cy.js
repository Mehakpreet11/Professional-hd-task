
const PUBLIC_PAGES = ['/login.html', '/register.html', '/createRoom.html']; // createRoom behaves public
const PROTECTED_PAGES = ['/dashboard.html'];
const ROOM_ID = 'abc123';
const TOKEN_KEY = 'token'; // change if your app uses 'accessToken' or similar

function visitWithToken(path, tokenKey = TOKEN_KEY, tokenValue = 'FAKE.JWT.TOKEN') {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(tokenKey, tokenValue);
    }
  });
}

// Silence socket.io chatter so it never fails tests
before(() => {
  cy.intercept('GET', '/socket.io/**', { statusCode: 200, body: 'ok' }).as('ioGet');
  cy.intercept('POST', '/socket.io/**', { statusCode: 200, body: 'ok' }).as('ioPost');
});

describe('SM front-end smoke', () => {
  it('server is reachable', () => {
    // Your backend 404s on '/', so ping a known-good static page
    cy.request('/login.html').its('status').should('eq', 200);
  });

  // Public pages should load directly
  PUBLIC_PAGES.forEach((p) => {
    it(`public page loads: ${p}`, () => {
      cy.visit(p);
      cy.location('pathname').should('match', new RegExp(`${p.replace('.', '\\.')}$`));
      cy.get('body').should('be.visible');
    });
  });

  // Protected pages should redirect to login WITHOUT token
  PROTECTED_PAGES.forEach((p) => {
    it(`protected redirects to login without token: ${p}`, () => {
      cy.visit(p);
      cy.location('pathname').should('match', /\/login\.html$/);
    });
  });

  // Protected pages should stay in place WITH token
  PROTECTED_PAGES.forEach((p) => {
    it(`protected loads with token: ${p}`, () => {
      // Stub any relative API calls so the page doesn’t bounce on auth/profile etc.
      cy.intercept('GET', '/api/**', { statusCode: 200, body: {} }).as('anyRelGet');
      visitWithToken(p);
      cy.location('pathname').should('match', new RegExp(`${p.replace('.', '\\.')}$`));
      cy.get('body').should('be.visible');
    });
  });

  // Room page WITH token & minimal stubs
  it('room page loads with token & valid room', () => {
    cy.on('window:alert', () => {}); // silence "Invalid room URL" if your script throws it

    // The room page actually calls ONLY /api/auth/profile on load.
    cy.intercept('GET', '/api/auth/profile', {
      statusCode: 200,
      body: { id: 'u1', name: 'Test User', email: 'test@example.com' }
    }).as('profile');

    // Optional stubs in case your script later starts calling these:
    cy.intercept('GET', `/api/rooms/${ROOM_ID}`, {
      statusCode: 200,
      body: { _id: ROOM_ID, name: 'Public Room' }
    }).as('roomByIdOpt');

    // Visit with a token so the page won’t redirect away
    visitWithToken(`/room.html?roomId=${ROOM_ID}`);

    // Assert we stayed on room.html and the page rendered
    cy.location('pathname').should('match', /\/room\.html$/);
    cy.get('body').should('be.visible');

    // This one always happens on room load in your app
    cy.wait('@profile');

    // Give a tiny moment for UI to render after socket connects
    cy.wait(200);

    // Assert key chat elements render
    cy.get('#chatMessages, [data-cy="chat-messages"]').should('exist');
    cy.get('#messageInput, [data-cy="message-input"]').should('exist');
    cy.get('#sendBtn, [data-cy="send-btn"]').should('exist');

    // Optional: basic timer UI presence
    cy.get('#timerDisplay').should('exist');
    cy.get('#phaseIndicator').should('exist');
  });
});
