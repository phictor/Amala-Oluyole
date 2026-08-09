export const KITCHEN_VISIBLE_STATUSES = [
  "payment_confirmed",
  "accepted",
  "preparing",
  "ready",
] as const;

const visibleStatuses = new Set<string>(KITCHEN_VISIBLE_STATUSES);

export function isKitchenNewOrder(status: string): boolean {
  return status === "payment_confirmed";
}

export function isKitchenVisibleOrder(status: string): boolean {
  return visibleStatuses.has(status);
}
