describe("Simple navigation", () => {
  it("visits teeko.cc", () => {
    cy.visit("http://127.0.0.1:3000");
    cy.contains("Blue opens.");
    cy.contains("Play").click();
    cy.contains("Friends").click();
    cy.contains("Cancel").click();
    cy.contains("Help").click();
    cy.contains("Play").click();
    cy.contains("Friends").click();
    cy.get("input").type("hello");
    cy.contains("Join").click();
    cy.contains("Invite").click();
  });

  it("changes language", () => {
    cy.visit("http://127.0.0.1:3000");
    cy.get("select").select("fr");
    cy.contains("Jouer").click();
    cy.contains("Aide").click();
    cy.get("select").select("en");
    cy.contains("Play");
    // cy.contains("Play").click();
    // cy.contains("Help").click();
    // cy.contains("Play").click();
    // cy.contains("Friends").click();
    // cy.get("input").type("hello");
    // cy.contains("Join").click();
    // cy.contains("Invite").click();
  });
});
