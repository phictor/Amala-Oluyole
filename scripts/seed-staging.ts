import "./load-env.js";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  branches, cateringRequests, customerAddresses, loyaltyAccounts, loyaltyTransactions,
  mealBranchAvailability, mealCategories, meals, notifications, orderItems, orders,
  orderStatusHistory, promoCodes, promoCodeUsage, reservations, riderLocationHistory,
  riders, supportTickets, users,
} from "../drizzle/schema";

const RESET_CONFIRMATION = "RESET_BYTECHAIN_STAGING";
const ORDER_NUMBERS = ["BCP-READY-001", "BCP-NEW-001"];
const BRANCH_NAMES = ["[PREVIEW] Oluyole Test Kitchen", "[PREVIEW] Ring Road Test Kitchen"];
const CATEGORY_SLUG = "preview-staples";
const PROMO_CODE = "BYTECHAIN25";
const UNASSIGNED_RIDER_OPEN_ID = "staging-preview-rider-unassigned";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for staging seed data`);
  return value;
}

function assertStagingTarget(): string {
  if (process.env.APP_ENV !== "staging") throw new Error("APP_ENV must equal staging");
  const label = required("DATABASE_ENVIRONMENT_LABEL").toLowerCase();
  if (!label.includes("staging") || label.includes("production")) throw new Error("DATABASE_ENVIRONMENT_LABEL must identify an isolated staging database");
  const databaseUrl = required("DATABASE_URL");
  if (!/^mysql:\/\//i.test(databaseUrl) || /(?:prod|production)/i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be a non-production MySQL staging URL");
  }
  return databaseUrl;
}

const databaseUrl = assertStagingTarget();
const db = drizzle(databaseUrl);
const roleOpenIds = {
  customer: required("STAGING_TEST_CUSTOMER_OPEN_ID"),
  admin: required("STAGING_TEST_ADMIN_OPEN_ID"),
  manager: required("STAGING_TEST_MANAGER_OPEN_ID"),
  finance: required("STAGING_TEST_FINANCE_OPEN_ID"),
  staff: required("STAGING_TEST_STAFF_OPEN_ID"),
  kitchen: required("STAGING_TEST_KITCHEN_OPEN_ID"),
  rider: required("STAGING_TEST_RIDER_OPEN_ID"),
} as const;

const roleEmails: Record<keyof typeof roleOpenIds, string> = {
  customer: required("STAGING_TEST_CUSTOMER_EMAIL"),
  admin: required("STAGING_TEST_ADMIN_EMAIL"),
  manager: required("STAGING_TEST_MANAGER_EMAIL"),
  finance: required("STAGING_TEST_FINANCE_EMAIL"),
  staff: required("STAGING_TEST_STAFF_EMAIL"),
  kitchen: required("STAGING_TEST_KITCHEN_EMAIL"),
  rider: required("STAGING_TEST_RIDER_EMAIL"),
};

async function ensureUser(role: keyof typeof roleOpenIds, name: string, email: string) {
  const openId = roleOpenIds[role];
  await db.insert(users).values({ openId, role, name, email, loginMethod: "staging-oauth", isGuest: false })
    .onDuplicateKeyUpdate({ set: { role, name, email, loginMethod: "staging-oauth", isGuest: false } });
  const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!user) throw new Error(`Could not create ${role} test account`);
  return user;
}

async function ensureBranch(name: string, address: string, latitude: number, longitude: number) {
  const [existing] = await db.select().from(branches).where(eq(branches.name, name)).limit(1);
  if (existing) return existing;
  await db.insert(branches).values({
    name, address, city: "Ibadan", state: "Oyo", latitude, longitude,
    phone: "+2340000000000", email: "preview-operations@amalaoluyole.test",
    isActive: true, acceptsDelivery: true, acceptsPickup: true, acceptsReservations: true,
    deliveryRadiusKm: 12, deliveryFeeBase: "500.00", minOrderAmount: "1500.00",
  });
  const [created] = await db.select().from(branches).where(eq(branches.name, name)).limit(1);
  if (!created) throw new Error(`Could not create branch ${name}`);
  return created;
}

async function ensureMeal(categoryId: number, name: string, price: string, sortOrder: number) {
  const [existing] = await db.select().from(meals).where(and(eq(meals.categoryId, categoryId), eq(meals.name, name))).limit(1);
  if (existing) return existing;
  await db.insert(meals).values({
    categoryId, name, description: "Repeatable Bytechain preview test item", price,
    preparationTime: 10, labels: ["preview"], isAvailable: true, sortOrder,
  });
  const [created] = await db.select().from(meals).where(and(eq(meals.categoryId, categoryId), eq(meals.name, name))).limit(1);
  if (!created) throw new Error(`Could not create meal ${name}`);
  return created;
}

async function resetStagingData() {
  const supplied = process.argv.find((arg) => arg.startsWith("--confirm="))?.split("=")[1];
  if (supplied !== RESET_CONFIRMATION) throw new Error(`Reset requires --confirm=${RESET_CONFIRMATION}`);

  const openIds = [...Object.values(roleOpenIds), UNASSIGNED_RIDER_OPEN_ID];
  const testUsers = await db.select({ id: users.id }).from(users).where(inArray(users.openId, openIds));
  const userIds = testUsers.map((user) => user.id);
  const testOrders = await db.select({ id: orders.id }).from(orders).where(inArray(orders.orderNumber, ORDER_NUMBERS));
  const orderIds = testOrders.map((order) => order.id);
  const testRiders = userIds.length ? await db.select({ id: riders.id }).from(riders).where(inArray(riders.userId, userIds)) : [];
  const riderIds = testRiders.map((rider) => rider.id);

  if (orderIds.length) {
    await db.delete(orderStatusHistory).where(inArray(orderStatusHistory.orderId, orderIds));
    await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    await db.delete(promoCodeUsage).where(inArray(promoCodeUsage.orderId, orderIds));
    await db.delete(loyaltyTransactions).where(inArray(loyaltyTransactions.orderId, orderIds));
    await db.delete(orders).where(inArray(orders.id, orderIds));
  }
  if (riderIds.length) await db.delete(riderLocationHistory).where(inArray(riderLocationHistory.riderId, riderIds));
  if (userIds.length) {
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
    await db.delete(supportTickets).where(inArray(supportTickets.userId, userIds));
    await db.delete(reservations).where(inArray(reservations.userId, userIds));
    await db.delete(cateringRequests).where(inArray(cateringRequests.userId, userIds));
    await db.delete(customerAddresses).where(inArray(customerAddresses.userId, userIds));
    await db.delete(loyaltyAccounts).where(inArray(loyaltyAccounts.userId, userIds));
    await db.delete(riders).where(inArray(riders.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }

  const seededMeals = await db.select({ id: meals.id }).from(meals).innerJoin(mealCategories, eq(meals.categoryId, mealCategories.id)).where(eq(mealCategories.slug, CATEGORY_SLUG));
  const mealIds = seededMeals.map((meal) => meal.id);
  if (mealIds.length) {
    await db.delete(mealBranchAvailability).where(inArray(mealBranchAvailability.mealId, mealIds));
    await db.delete(meals).where(inArray(meals.id, mealIds));
  }
  await db.delete(mealCategories).where(eq(mealCategories.slug, CATEGORY_SLUG));
  await db.delete(promoCodes).where(eq(promoCodes.code, PROMO_CODE));
  await db.delete(branches).where(inArray(branches.name, BRANCH_NAMES));
}

async function seedStagingData() {
  const customer = await ensureUser("customer", "Preview Customer", roleEmails.customer);
  await ensureUser("admin", "Preview Administrator", roleEmails.admin);
  await ensureUser("manager", "Preview Manager", roleEmails.manager);
  await ensureUser("finance", "Preview Finance", roleEmails.finance);
  const staffUser = await ensureUser("staff", "Preview Operations Staff", roleEmails.staff);
  const kitchenUser = await ensureUser("kitchen", "Preview Kitchen", roleEmails.kitchen);
  const riderUser = await ensureUser("rider", "Preview Rider", roleEmails.rider);
  await db.insert(users).values({ openId: UNASSIGNED_RIDER_OPEN_ID, role: "rider", name: "Preview Spare Rider", email: "rider.unassigned.preview@amalaoluyole.test", loginMethod: "seed-only" })
    .onDuplicateKeyUpdate({ set: { role: "rider", name: "Preview Spare Rider" } });
  const [spareRiderUser] = await db.select().from(users).where(eq(users.openId, UNASSIGNED_RIDER_OPEN_ID)).limit(1);

  const branchA = await ensureBranch(BRANCH_NAMES[0], "12 Preview Lane, Oluyole Estate", 7.3775, 3.9470);
  const branchB = await ensureBranch(BRANCH_NAMES[1], "45 Preview Lane, Ring Road", 7.39, 3.91);
  await db.update(users).set({ preferredBranchId: branchA.id }).where(inArray(users.id, [staffUser.id, kitchenUser.id]));

  await db.insert(mealCategories).values({ name: "Preview Staples", slug: CATEGORY_SLUG, emoji: "🧪", description: "Staging-only repeatable test meals", sortOrder: 1, isActive: true })
    .onDuplicateKeyUpdate({ set: { name: "Preview Staples", isActive: true } });
  const [category] = await db.select().from(mealCategories).where(eq(mealCategories.slug, CATEGORY_SLUG)).limit(1);
  if (!category) throw new Error("Could not create preview meal category");
  const seededMeals = [
    await ensureMeal(category.id, "Preview Amala Combo", "3500.00", 1),
    await ensureMeal(category.id, "Preview Jollof Bowl", "2800.00", 2),
    await ensureMeal(category.id, "Preview Zobo", "500.00", 3),
    await ensureMeal(category.id, "Preview Plantain", "700.00", 4),
  ];
  for (const meal of seededMeals) for (const branch of [branchA, branchB]) {
    const [existing] = await db.select().from(mealBranchAvailability).where(and(eq(mealBranchAvailability.mealId, meal.id), eq(mealBranchAvailability.branchId, branch.id))).limit(1);
    if (!existing) await db.insert(mealBranchAvailability).values({ mealId: meal.id, branchId: branch.id, isAvailable: true, stockCount: 100 });
  }

  await db.insert(loyaltyAccounts).values({ userId: customer.id, points: 2_400, tier: "silver", totalPointsEarned: 2_800, totalPointsRedeemed: 400 })
    .onDuplicateKeyUpdate({ set: { points: 2_400, tier: "silver", totalPointsEarned: 2_800, totalPointsRedeemed: 400 } });
  await db.insert(promoCodes).values({
    code: PROMO_CODE, description: "25% off in the isolated Bytechain preview environment",
    type: "percentage", value: "25.00", minOrderAmount: "2000.00", maxDiscount: "2000.00",
    usageLimit: 500, usageCount: 0, perUserLimit: 20, applicableBranchIds: [branchA.id, branchB.id], isActive: true,
    startsAt: new Date(Date.now() - 86_400_000), expiresAt: new Date(Date.now() + 90 * 86_400_000),
  }).onDuplicateKeyUpdate({ set: { isActive: true, usageCount: 0, applicableBranchIds: [branchA.id, branchB.id] } });

  await db.insert(riders).values({ userId: riderUser.id, branchId: branchA.id, vehicleType: "motorcycle", vehiclePlate: "TEST-001", isOnline: true, isAvailable: false, isActive: true })
    .onDuplicateKeyUpdate({ set: { branchId: branchA.id, isOnline: true, isAvailable: false, isActive: true } });
  if (!spareRiderUser) throw new Error("Could not create unassigned preview rider");
  await db.insert(riders).values({ userId: spareRiderUser.id, branchId: branchA.id, vehicleType: "motorcycle", vehiclePlate: "TEST-002", isOnline: true, isAvailable: true, isActive: true })
    .onDuplicateKeyUpdate({ set: { branchId: branchA.id, isOnline: true, isAvailable: true, isActive: true } });
  const [assignedRider] = await db.select().from(riders).where(eq(riders.userId, riderUser.id)).limit(1);
  if (!assignedRider) throw new Error("Could not create assigned preview rider");

  const orderDefinitions = [
    { orderNumber: ORDER_NUMBERS[0], status: "rider_assigned" as const, riderId: assignedRider.id, total: "4500.00" },
    { orderNumber: ORDER_NUMBERS[1], status: "payment_confirmed" as const, riderId: null, total: "3300.00" },
  ];
  for (const definition of orderDefinitions) {
    const [existing] = await db.select().from(orders).where(eq(orders.orderNumber, definition.orderNumber)).limit(1);
    if (existing) continue;
    await db.insert(orders).values({
      ...definition, userId: customer.id, branchId: branchA.id, orderType: "delivery",
      paymentMethod: "card", paymentStatus: "paid", subtotal: definition.total,
      serviceFee: "0.00", deliveryFee: "500.00", discount: "500.00",
      deliveryAddress: "Preview Test Address, Oluyole", deliveryLatitude: 7.38, deliveryLongitude: 3.945,
      customerNotes: "[BYTECHAIN PREVIEW] Safe repeatable test order", pickupCode: "246810",
      paymentReference: `preview-${definition.orderNumber.toLowerCase()}`, paymentVerifiedAt: new Date(),
    });
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, definition.orderNumber)).limit(1);
    await db.insert(orderItems).values({ orderId: order.id, mealId: seededMeals[0].id, name: seededMeals[0].name, unitPrice: definition.total, quantity: 1, subtotal: definition.total });
    await db.insert(orderStatusHistory).values({ orderId: order.id, status: definition.status, note: "[BYTECHAIN PREVIEW] seeded workflow state" });
  }

  const [existingReservation] = await db.select().from(reservations).where(and(eq(reservations.userId, customer.id), eq(reservations.specialRequests, "[BYTECHAIN PREVIEW] window table"))).limit(1);
  if (!existingReservation) await db.insert(reservations).values({
    userId: customer.id, branchId: branchB.id, guestName: "Preview Customer", guestPhone: "+2340000000000",
    guestEmail: roleEmails.customer, partySize: 4,
    reservationDate: new Date(Date.now() + 7 * 86_400_000), occasion: "Preview QA", specialRequests: "[BYTECHAIN PREVIEW] window table", status: "confirmed",
  });
  const [existingCatering] = await db.select().from(cateringRequests).where(and(eq(cateringRequests.userId, customer.id), eq(cateringRequests.additionalRequirements, "[BYTECHAIN PREVIEW] repeatable catering request"))).limit(1);
  if (!existingCatering) await db.insert(cateringRequests).values({
    userId: customer.id, branchId: branchA.id, contactName: "Preview Customer", contactPhone: "+2340000000000",
    contactEmail: roleEmails.customer, eventType: "Preview QA Event",
    eventDate: new Date(Date.now() + 21 * 86_400_000), guestCount: 40, venue: "Preview Test Venue",
    mealPreferences: "Amala, ewedu, jollof rice, and zobo", budget: "250000.00",
    additionalRequirements: "[BYTECHAIN PREVIEW] repeatable catering request", status: "reviewing",
  });

  console.log(JSON.stringify({ event: "staging_seed_complete", users: 8, branches: 2, meals: seededMeals.length, customMealOptions: "canonical server catalog", orders: 2, riders: 2, promoCode: PROMO_CODE }));
}

async function main() {
  if (process.argv.includes("--reset")) await resetStagingData();
  await seedStagingData();
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "staging_seed_failed", errorType: error instanceof Error ? error.name : "unknown" }));
  process.exitCode = 1;
});
