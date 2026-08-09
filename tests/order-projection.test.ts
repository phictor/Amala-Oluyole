import { describe, expect, it } from "vitest";
import { projectOperationalOrder, projectOperationalOrderDetail, projectRiderOrder } from "../server/security/order-projection";

const item = {
  id: 3,
  orderId: 9,
  mealId: 12,
  name: "Custom Amala",
  quantity: 2,
  isCustomMeal: true,
  customMealConfig: { soup: { id: "ewedu", name: "Ewedu" } },
  specialInstructions: "No salt",
  unitPrice: "3500.00",
  subtotal: "7000.00",
  createdAt: new Date("2026-08-09T08:00:00.000Z"),
};

const order = {
  id: 9,
  orderNumber: "AO-0009",
  userId: 88,
  branchId: 2,
  riderId: null,
  orderType: "delivery",
  status: "payment_confirmed",
  createdAt: new Date("2026-08-09T08:00:00.000Z"),
  total: "7000.00",
  paymentReference: "paystack-secret-reference",
  paymentMethod: "card",
  deliveryAddress: "Complete customer address",
  deliveryLatitude: 7.1,
  deliveryLongitude: 3.9,
  items: [item],
};

describe("operational order projections", () => {
  it("keeps only the fields Kitchen and Staff need", () => {
    const projected = projectOperationalOrder(order);

    expect(Object.keys(projected).sort()).toEqual([
      "branchId", "createdAt", "id", "items", "orderNumber", "orderType", "status",
    ]);
    expect(Object.keys(projected.items[0]).sort()).toEqual([
      "customMealConfig", "isCustomMeal", "name", "quantity", "specialInstructions",
    ]);
    expect(projected).not.toHaveProperty("total");
    expect(projected).not.toHaveProperty("paymentReference");
    expect(projected).not.toHaveProperty("deliveryAddress");
    expect(projected.items[0]).not.toHaveProperty("unitPrice");
    expect(projected.items[0]).not.toHaveProperty("subtotal");
  });

  it("applies the same boundary to the detail response", () => {
    const { items, ...orderWithoutItems } = order;
    const detail = projectOperationalOrderDetail({ order: orderWithoutItems, items });

    expect(detail.order).not.toHaveProperty("total");
    expect(detail.order).not.toHaveProperty("userId");
    expect(detail.items[0]).not.toHaveProperty("unitPrice");
  });

  it("gives Rider delivery context without payment data", () => {
    const riderOrder = projectRiderOrder({
      ...order,
      deliveryInstructions: "Call at gate",
      updatedAt: order.createdAt,
    });
    expect(riderOrder.deliveryAddress).toBe("Complete customer address");
    expect(riderOrder).not.toHaveProperty("total");
    expect(riderOrder).not.toHaveProperty("paymentReference");
    expect(riderOrder).not.toHaveProperty("userId");
  });
});
