import { describe, expect, it } from "vitest";
import { isKitchenNewOrder, isKitchenVisibleOrder } from "../lib/orders/kitchen-order-status";

describe("kitchen order status mapping", () => {
  it("treats a confirmed payment as a new actionable kitchen order", () => {
    expect(isKitchenNewOrder("payment_confirmed")).toBe(true);
    expect(isKitchenVisibleOrder("payment_confirmed")).toBe(true);
  });

  it("hides unpaid and post-kitchen delivery states", () => {
    expect(isKitchenVisibleOrder("awaiting_payment")).toBe(false);
    expect(isKitchenVisibleOrder("rider_assigned")).toBe(false);
    expect(isKitchenVisibleOrder("out_for_delivery")).toBe(false);
  });
});
