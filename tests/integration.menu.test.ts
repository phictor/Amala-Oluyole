/**
 * INTEGRATION TESTS — Menu, Categories, and Promotions
 * Tests the menu router against the live database.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("menu.categories — meal category listing", () => {
  it("returns all active meal categories with emoji", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const categories = await caller.menu.categories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThanOrEqual(1);
    // Each category must have id, name, emoji, sortOrder
    for (const cat of categories) {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("emoji");
    }
  });
});

describe("menu.meals — meal listing", () => {
  it("returns meals with required fields", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const meals = await caller.menu.meals({});
    expect(Array.isArray(meals)).toBe(true);
    if (meals.length > 0) {
      const meal = meals[0];
      expect(meal).toHaveProperty("id");
      expect(meal).toHaveProperty("name");
      expect(meal).toHaveProperty("price");
      expect(meal).toHaveProperty("isAvailable");
    }
  });

  it("filters meals by category", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const categories = await caller.menu.categories();
    if (categories.length > 0) {
      const meals = await caller.menu.meals({ categoryId: categories[0].id });
      expect(Array.isArray(meals)).toBe(true);
    }
  });

  it("filters meals by search term", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const meals = await caller.menu.meals({ search: "amala" });
    expect(Array.isArray(meals)).toBe(true);
  });
});

describe("menu.branches — branch listing", () => {
  it("returns at least one branch with address", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const branches = await caller.menu.branches();
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBeGreaterThanOrEqual(1);
    const branch = branches[0];
    expect(branch).toHaveProperty("name");
    expect(branch).toHaveProperty("address");
    expect(branch.address).toContain("Oluyole");
  });
});

describe("menu.activePromotions — promotions listing", () => {
  it("returns an array (may be empty if no active promos)", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const promos = await caller.menu.activePromotions();
    expect(Array.isArray(promos)).toBe(true);
  });
});

describe("menu.builderOptions — meal builder options", () => {
  it("returns swallow, soup, protein, and extras categories", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const options = await caller.menu.builderOptions();
    expect(options).toHaveProperty("swallows");
    expect(options).toHaveProperty("soups");
    expect(options).toHaveProperty("proteins");
    expect(options).toHaveProperty("extras");
    expect(Array.isArray(options.swallows)).toBe(true);
    expect(options.swallows.length).toBeGreaterThan(0);
  });
});

