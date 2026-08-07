import { BUILDER_OPTIONS, CUSTOM_MEAL_BASE_PRICE, getBuilderOption } from "../catalog/builder-options";

export const SERVICE_FEE_RATE = 0.05;

export type CustomSelection = {
  swallowId: string;
  soupId: string;
  proteins: Array<{ id: string; quantity: number }>;
  extras?: Array<{ id: string; quantity: number }>;
};

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function priceCustomMeal(selection: CustomSelection): {
  name: string;
  unitPrice: number;
  config: NonNullable<import("../../drizzle/schema").InsertOrderItem["customMealConfig"]>;
} {
  const swallow = getBuilderOption("swallows", selection.swallowId);
  const soup = getBuilderOption("soups", selection.soupId);
  if (selection.proteins.length === 0) throw new Error("At least one protein is required");

  const proteins = selection.proteins.map(({ id, quantity }) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error("Invalid custom option quantity");
    return { option: getBuilderOption("proteins", id), quantity };
  });
  const extras = (selection.extras ?? []).map(({ id, quantity }) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error("Invalid custom option quantity");
    return { option: getBuilderOption("extras", id), quantity };
  });

  const unitPrice = money(
    CUSTOM_MEAL_BASE_PRICE + swallow.price + soup.price +
      proteins.reduce((total, item) => total + item.option.price * item.quantity, 0) +
      extras.reduce((total, item) => total + item.option.price * item.quantity, 0),
  );

  return {
    name: `${swallow.name} & ${soup.name}`,
    unitPrice,
    config: {
      swallow: { id: swallow.id, name: swallow.name },
      soup: { id: soup.id, name: soup.name },
      proteins: proteins.map(({ option, quantity }) => ({ id: option.id, name: option.name, quantity })),
      extras: extras.map(({ option, quantity }) => ({ id: option.id, name: option.name, quantity })),
    },
  };
}

export function calculateOrderTotals(input: {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  loyaltyPointsUsed: number;
}): { subtotal: number; serviceFee: number; deliveryFee: number; discount: number; loyaltyPointsUsed: number; total: number } {
  const subtotal = money(input.subtotal);
  const deliveryFee = money(input.deliveryFee);
  const discount = money(Math.max(0, Math.min(input.discount, subtotal + deliveryFee)));
  const loyaltyPointsUsed = Math.max(0, Math.floor(input.loyaltyPointsUsed));
  const serviceFee = money(subtotal * SERVICE_FEE_RATE);
  const total = money(Math.max(0, subtotal + serviceFee + deliveryFee - discount - loyaltyPointsUsed));
  return { subtotal, serviceFee, deliveryFee, discount, loyaltyPointsUsed, total };
}

export { BUILDER_OPTIONS };
