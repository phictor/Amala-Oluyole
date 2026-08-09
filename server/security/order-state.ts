import type { Order } from "../../drizzle/schema";

export type OrderStatus = Order["status"];
export type OrderActor = "customer" | "rider" | "kitchen" | "staff" | "admin" | "manager" | "system";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  created: ["awaiting_payment", "accepted", "cancelled"],
  awaiting_payment: ["payment_confirmed", "cancelled", "rejected"],
  payment_confirmed: ["accepted", "cancelled", "refunded"],
  accepted: ["preparing", "cancelled", "rejected"],
  preparing: ["ready", "cancelled", "rejected"],
  ready: ["rider_assigned", "completed", "cancelled"],
  rider_assigned: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  rejected: [],
  refunded: [],
};

const ACTOR_TARGETS: Record<OrderActor, readonly OrderStatus[]> = {
  customer: ["cancelled"],
  rider: ["out_for_delivery", "delivered"],
  kitchen: ["accepted", "preparing", "ready", "rejected"],
  staff: ["accepted", "preparing", "ready", "rider_assigned", "completed", "cancelled", "rejected"],
  admin: Object.keys(TRANSITIONS) as OrderStatus[],
  manager: Object.keys(TRANSITIONS) as OrderStatus[],
  system: Object.keys(TRANSITIONS) as OrderStatus[],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean {
  if (actor === "customer" && !["created", "awaiting_payment", "payment_confirmed"].includes(from)) return false;
  return TRANSITIONS[from].includes(to) && ACTOR_TARGETS[actor].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): void {
  if (!canTransitionOrder(from, to, actor)) {
    throw new Error(`Invalid order transition: ${from} -> ${to} for ${actor}`);
  }
}

export const CUSTOMER_TRACKABLE_STATUSES: readonly OrderStatus[] = [
  "rider_assigned",
  "out_for_delivery",
];
