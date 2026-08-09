import { describe, expect, it } from "vitest";
import { isNewOrderAlertStatus } from "../lib/orders/order-alert-status";

describe("role-specific new-order alerts", () => {
  it("alerts Kitchen for confirmed payments", () => {
    expect(isNewOrderAlertStatus("payment_confirmed")).toBe(true);
    expect(isNewOrderAlertStatus("awaiting_payment")).toBe(false);
  });

  it("alerts Rider for a new assignment", () => {
    expect(isNewOrderAlertStatus("rider_assigned", "rider_assigned")).toBe(true);
    expect(isNewOrderAlertStatus("out_for_delivery", "rider_assigned")).toBe(false);
  });
});
