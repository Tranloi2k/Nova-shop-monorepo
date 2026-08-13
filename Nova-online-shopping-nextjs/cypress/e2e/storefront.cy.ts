describe("NOVA storefront", () => {
  it("navigates from a homepage category to the filtered catalog", () => {
    cy.visit("/");

    cy.contains("h2", "Shop by category").should("be.visible");
    cy.contains("a", "Phones").click();

    cy.location("pathname").should("eq", "/products");
    cy.location("search").should("include", "category=smartphones");
    cy.contains("h1", "Smartphones").should("be.visible");
  });

  it("submits a catalog search and preserves it in the URL", () => {
    cy.visit("/products");

    cy.get("form.catalog-search-autocomplete")
      .find('input[aria-label="Search products"]')
      .type("iphone{enter}");

    cy.location("pathname").should("eq", "/products");
    cy.location("search").should("include", "query=iphone");
    cy.contains("h1", 'Results for "iphone"').should("be.visible");
  });

  it("requests and renders product suggestions from the API", () => {
    cy.intercept("GET", "http://127.0.0.1:65535/products/suggestions?*", {
      statusCode: 200,
      body: [
        {
          id: 42,
          name: "NOVA Phone Pro",
          image: "",
          price: 999,
          discount: 10,
        },
      ],
    }).as("productSuggestions");
    cy.visit("/products");

    cy.get("form.catalog-search-autocomplete")
      .find('input[aria-label="Search products"]')
      .type("nova");

    cy.wait("@productSuggestions").then(({ request }) => {
      const url = new URL(request.url);
      expect(url.searchParams.get("query")).to.eq("nova");
      expect(url.searchParams.get("limit")).to.eq("6");
    });
    cy.contains('[role="option"]', "NOVA Phone Pro").should("be.visible");
    cy.contains('[role="option"]', "$999").should("be.visible");
  });

  it("changes category from the catalog toolbar", () => {
    cy.visit("/products");

    cy.get('[aria-label="Product categories"]')
      .contains("button", "Audio")
      .click();

    cy.location("search").should("include", "category=audio");
    cy.contains("h1", "Audio").should("be.visible");
    cy.get('[aria-label="Product categories"]')
      .contains("button", "Audio")
      .should("have.attr", "aria-pressed", "true");
  });

  it("applies and clears advanced product filters", () => {
    cy.visit("/products");
    cy.contains("button", "Filters").click();

    cy.get('[role="dialog"][aria-labelledby="catalog-filter-title"]').within(() => {
      cy.contains("label", "Min").find('input[type="number"]').type("100");
      cy.contains("label", "Max").find('input[type="number"]').type("1200");
      cy.contains("label", "On sale only").find('input[type="checkbox"]').check();
      cy.contains("button", "Apply filters").click();
    });

    cy.location("search").should("include", "minPrice=100");
    cy.location("search").should("include", "maxPrice=1200");
    cy.location("search").should("include", "onSale=true");
    cy.get('[aria-label="Applied filters"]').within(() => {
      cy.contains("From $100").should("be.visible");
      cy.contains("Up to $1200").should("be.visible");
      cy.contains("On sale").should("be.visible");
      cy.contains("button", "Clear all").click();
    });

    cy.location("search").should("not.include", "minPrice");
    cy.location("search").should("not.include", "maxPrice");
    cy.location("search").should("not.include", "onSale");
    cy.get('[aria-label="Applied filters"]').should("not.exist");
  });

  it("shows an empty guest cart and links back to the catalog", () => {
    cy.visit("/cart");

    cy.contains("h1", "Your bag").should("be.visible");
    cy.contains("Your bag is empty. Browse our catalog").should("be.visible");
    cy.contains("a", "Browse products").click();

    cy.location("pathname").should("eq", "/products");
    cy.contains("h1", "All products").should("be.visible");
  });

  it("fills the demo credentials on the sign-in page", () => {
    cy.visit("/login");

    cy.contains("h1", "Sign in").should("be.visible");
    cy.contains("button", "Use demo account").click();

    cy.get("#email").should("have.value", "demo@nova.com");
    cy.get("#password").should("have.value", "demo123");
    cy.contains('button[type="submit"]', "Sign in").should("be.enabled");
  });

  it("uses browser validation for invalid sign-in details", () => {
    cy.visit("/login");

    cy.get("#email").type("not-an-email");
    cy.get("#password").type("123456");
    cy.contains('button[type="submit"]', "Sign in").click();

    cy.get("#email").should("match", ":invalid");
    cy.location("pathname").should("eq", "/login");
  });
});
