import { describe, expect, it } from "vitest";

import { isCustomerOnlyRoute, routeForRole } from "../lib/auth/role-routing";

describe("server-confirmed role routing", () => {
  it.each([
    ["customer", "/(tabs)/home"],
    ["finance", "/(portal-finance)"],
    ["staff", "/(portal-staff)"],
    ["kitchen", "/(portal-kitchen)"],
    ["rider", "/(portal-rider)"],
    ["manager", "/(portal-staff)"],
    ["admin", "/(portal-staff)"],
  ] as const)("routes %s to its intended workspace", (role, route) => {
    expect(routeForRole(role)).toBe(route);
  });

  it("fails closed for missing or unknown roles", () => {
    expect(routeForRole(undefined)).toBe("/auth/login");
    expect(routeForRole("superuser")).toBe("/auth/login");
  });
});

describe("customer-only routes", () => {
  it("identifies direct customer workflow screens", () => {
    expect(isCustomerOnlyRoute("/checkout")).toBe(true);
    expect(isCustomerOnlyRoute("/order/42")).toBe(true);
    expect(isCustomerOnlyRoute("/reservation")).toBe(true);
  });

  it("does not classify staff workspaces as customer routes", () => {
    expect(isCustomerOnlyRoute("/(portal-staff)/orders")).toBe(false);
    expect(isCustomerOnlyRoute("/(portal-finance)")).toBe(false);
  });
});
