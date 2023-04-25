describe("Simple navigation", () => {
  const url = "http://127.0.0.1:4173";

  it("visits teeko.cc", () => {
    cy.visit(url);
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
    cy.visit(url);
    cy.get("select").select("fr");
    cy.contains("Jouer").click();
    cy.contains("Aide").click();
    cy.get("select").select("en");
    cy.contains("Play");
  });
});
