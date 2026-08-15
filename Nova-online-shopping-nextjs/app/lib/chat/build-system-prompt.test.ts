import { describe, expect, it, vi } from "vitest";
import { buildChatSystemPrompt } from "./build-system-prompt";

vi.mock("@/app/lib/chat/site-knowledge", () => ({
  formatSiteKnowledge: () => "Shipping takes two days.",
}));
vi.mock("@/app/lib/chat/product-context", () => ({
  getProductCatalogSnapshot: vi.fn().mockResolvedValue("Nova Phone: $999"),
}));

describe("buildChatSystemPrompt", () => {
  it("combines the base instructions with site and catalog context", async () => {
    const prompt = await buildChatSystemPrompt();

    expect(prompt).toContain(
      "You are the virtual assistant for NOVA - a premium tech e-commerce store.",
    );
    expect(prompt).toContain("Shipping takes two days.");
    expect(prompt).toContain("Nova Phone: $999");
  });
});
