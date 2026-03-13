// Cypress E2E tests for authenticated dashboard layout and receipt upload flow

describe('Dashboard Home', () => {
  // Test: Verify authenticated dashboard layout
  it('displays the authenticated dashboard shell', () => {
    // Arrange: Visit app as authenticated user
    cy.visitAsAuthenticated('/app');

    // Assert: Main layout is visible
    cy.get('[data-testid="app-layout"]').should('be.visible');

    // Assert: Header contains app title and logout button
    cy.get('[data-testid="app-header"]').within(() => {
      cy.contains('ReceiptCAT').should('be.visible');
      cy.contains('Log out').should('be.visible');
    });

    // Assert: Content area exists and greeting is visible
    cy.get('[data-testid="app-content"]').should('exist');
    cy.contains('Hello').should('be.visible');
  });

  // Test: Upload receipt and verify preview UI + confirmation flow
  it('uploads a receipt from fixtures, verifies preview UI, and confirms upload', () => {
    // Arrange: Visit app as authenticated user
    cy.visitAsAuthenticated('/app');

    // Act: Upload test receipt image
    cy.get('[data-testid="upload-button"]').click();
    cy.get('input[data-testid="file-input"]').selectFile('cypress/fixtures/exampleReceipt.jpg', { force: true });

    // Assert: Navigate to preview page
    cy.location('pathname', { timeout: 10000 }).should('eq', '/app/preview');
    cy.get('[data-testid="preview-page"]').should('be.visible');

    // Assert: Validate sessionStorage file data
    cy.window().then((win) => {
      const fileInfoRaw = win.sessionStorage.getItem('fileInfo');
      expect(fileInfoRaw, 'fileInfo exists in sessionStorage').to.be.a('string');
      const fileInfo = fileInfoRaw ? JSON.parse(fileInfoRaw) : null;
      expect(fileInfo).to.have.property('fileName', 'exampleReceipt.jpg');

      expect(win.sessionStorage.getItem('fileUrl')).to.match(/^blob:/);
      expect(win.sessionStorage.getItem('fileType')).to.eq('image/jpeg');
      expect(win.sessionStorage.getItem('origFileUrl')).to.match(/^blob:/);

      const origData = win.sessionStorage.getItem('origFileData'); // string | null
      // Guard: ensure value is a string at runtime so TS can narrow the type
      if (typeof origData !== 'string') {
        throw new Error('origFileData is missing or not a string'); // Fail fast if absent
      }
      expect(origData.length, 'origFileData should not be empty').to.be.greaterThan(0); // Length > 0
    });

    // Assert: Preview UI renders expected elements
    cy.get('[data-testid="preview-filename"]').should('have.text', 'exampleReceipt.jpg');
    cy.get('[data-testid="preview-file-size"]').should('not.be.empty');
    cy.get('[data-testid="preview-max-size"]').should('contain', '5');
    cy.get('[data-testid="editing-canvas"]').should('exist');
    cy.get('[data-testid="reselect-button"]').should('be.enabled');
    cy.get('[data-testid="preview-confirm"]').should('be.visible');
    cy.get('[data-testid="preview-back"]').should('be.visible');

    // Arrange: Stub upload flow network calls
    const fakeUploadUrl = 'https://fake-upload.receiptcat.test/upload';
    cy.intercept('POST', '**/upload/presign', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          uploadUrl: fakeUploadUrl,
          key: 'uploads/test-receipt.jpg',
        },
      });
    }).as('presign');
    cy.intercept('PUT', fakeUploadUrl, (req) => {
      expect(req.headers).to.have.property('content-type', 'image/jpeg');
      req.reply({ statusCode: 200 });
    }).as('s3Upload');

    // Act: Confirm upload
    cy.get('[data-testid="preview-confirm"]').click();

    // Assert: Backend interactions were triggered
    cy.wait('@presign').its('request.body').should('include', { fileName: 'exampleReceipt.jpg' });
    cy.wait('@s3Upload');

    // Assert: Success toast appears and navigation occurs
    cy.contains('Upload Success!').should('be.visible');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/app/history');
  });
});
