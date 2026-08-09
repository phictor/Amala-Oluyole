import { describe, expect, it } from "vitest";
import { requireKitchenBranch, resolveKitchenBranch } from "../server/security/branch-access";

describe("kitchen branch isolation", () => {
  const kitchen = { role: "kitchen", preferredBranchId: 7 };

  it("derives the branch from the authenticated kitchen account", () => {
    expect(requireKitchenBranch(kitchen)).toBe(7);
    expect(requireKitchenBranch(kitchen, 7)).toBe(7);
  });

  it("rejects attempts to access another branch", () => {
    expect(() => requireKitchenBranch(kitchen, 8)).toThrow("another branch");
  });

  it("allows administrators to select an explicit branch", () => {
    expect(resolveKitchenBranch({ role: "admin", preferredBranchId: null }, 8)).toBe(8);
  });
});
