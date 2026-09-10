import { and, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Branch,
  CateringRequest,
  CustomerAddress,
  InsertCateringRequest,
  InsertCustomerAddress,
  InsertOrder,
  InsertOrderItem,
  InsertReservation,
  InsertUser,
  LoyaltyAccount,
  Meal,
  MealCategory,
  Notification,
  Order,
  OrderItem,
  PromoCode,
  Reservation,
  Rider,
  SupportTicket,
  User,
  branches,
  cateringRequests,
  customerAddresses,
  favourites,
  loyaltyAccounts,
  loyaltyTransactions,
  mealBranchAvailability,
  mealCategories,
  meals,
  notifications,
  orderItems,
  orderStatusHistory,
  orders,
  promoCodeUsage,
  promoCodes,
  pushTokens,
  reservations,
  riderLocationHistory,
  riders,
  supportTickets,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const PRIMARY_MANAGER_EMAIL = "amalaoluyole@gmail.com";

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "phone"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    (values as Record<string, unknown>)[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  const isPrimaryManager = user.email?.trim().toLowerCase() === PRIMARY_MANAGER_EMAIL;
  if (isPrimaryManager) {
    values.role = "admin";
    updateSet.role = "admin";
  } else if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  // Admin-created staff accounts receive a temporary openId. On their first OAuth
  // sign-in, match the verified email and claim that staff account without losing its role.
  if (user.email) {
    const [invitedStaff] = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, user.email), like(users.openId, "staff_%")))
      .limit(1);
    if (invitedStaff) {
      await db.update(users).set({ ...updateSet, openId: user.openId, updatedAt: new Date() })
        .where(eq(users.id, invitedStaff.id));
      await db.insert(loyaltyAccounts).values({ userId: invitedStaff.id, points: 0 })
        .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      return;
    }
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });

  // Auto-create loyalty account for new users
  const dbUser = await getUserByOpenId(user.openId);
  if (dbUser) {
    await db.insert(loyaltyAccounts).values({ userId: dbUser.id, points: 0 })
      .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(userId: number, data: { name?: string; phone?: string; pushToken?: string; preferredBranchId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── BRANCHES ─────────────────────────────────────────────────────────────────
export async function getBranches(): Promise<Branch[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
}

export async function getBranchById(id: number): Promise<Branch | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return result[0];
}

// ─── MEAL CATEGORIES ──────────────────────────────────────────────────────────
export async function getMealCategories(): Promise<MealCategory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mealCategories)
    .where(eq(mealCategories.isActive, true))
    .orderBy(mealCategories.sortOrder);
}

// ─── MEALS ────────────────────────────────────────────────────────────────────
export async function getMeals(opts?: { categoryId?: number; branchId?: number; search?: string; popular?: boolean }): Promise<Meal[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(meals.isAvailable, true)];
  if (opts?.categoryId) conditions.push(eq(meals.categoryId, opts.categoryId));
  if (opts?.popular) conditions.push(eq(meals.isPopular, true));
  if (opts?.search) conditions.push(like(meals.name, `%${opts.search}%`));
  return db.select().from(meals).where(and(...conditions)).orderBy(meals.sortOrder, meals.name);
}

export async function getMealById(id: number): Promise<Meal | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meals).where(eq(meals.id, id)).limit(1);
  return result[0];
}

export async function getFeaturedMeals(): Promise<Meal[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meals)
    .where(and(eq(meals.isAvailable, true), or(eq(meals.isBestSeller, true), eq(meals.isChefSpecial, true))))
    .orderBy(meals.sortOrder).limit(10);
}

// ─── FAVOURITES ───────────────────────────────────────────────────────────────
export async function getUserFavourites(userId: number): Promise<Meal[]> {
  const db = await getDb();
  if (!db) return [];
  const favs = await db.select({ mealId: favourites.mealId })
    .from(favourites).where(eq(favourites.userId, userId));
  if (!favs.length) return [];
  return db.select().from(meals).where(inArray(meals.id, favs.map(f => f.mealId)));
}

export async function toggleFavourite(userId: number, mealId: number): Promise<{ isFavourite: boolean }> {
  const db = await getDb();
  if (!db) return { isFavourite: false };
  const existing = await db.select().from(favourites)
    .where(and(eq(favourites.userId, userId), eq(favourites.mealId, mealId))).limit(1);
  if (existing.length) {
    await db.delete(favourites).where(and(eq(favourites.userId, userId), eq(favourites.mealId, mealId)));
    return { isFavourite: false };
  } else {
    await db.insert(favourites).values({ userId, mealId });
    return { isFavourite: true };
  }
}

// ─── ADDRESSES ────────────────────────────────────────────────────────────────
export async function getUserAddresses(userId: number): Promise<CustomerAddress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerAddresses)
    .where(eq(customerAddresses.userId, userId))
    .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));
}

export async function createAddress(data: InsertCustomerAddress): Promise<CustomerAddress> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.isDefault) {
    await db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.userId, data.userId));
  }
  const [result] = await db.insert(customerAddresses).values(data).$returningId();
  const created = await db.select().from(customerAddresses).where(eq(customerAddresses.id, result.id)).limit(1);
  return created[0];
}

export async function deleteAddress(addressId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customerAddresses)
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId)));
}

// ─── PROMO CODES ──────────────────────────────────────────────────────────────
export async function validatePromoCode(code: string, userId: number, orderAmount: number): Promise<{ valid: boolean; promo?: PromoCode; discount?: number; message?: string }> {
  const db = await getDb();
  if (!db) return { valid: false, message: "Service unavailable" };
  const now = new Date();
  const promoResult = await db.select().from(promoCodes)
    .where(and(eq(promoCodes.code, code.toUpperCase()), eq(promoCodes.isActive, true)))
    .limit(1);
  if (!promoResult.length) return { valid: false, message: "Invalid promo code" };
  const promo = promoResult[0];
  if (promo.expiresAt && promo.expiresAt < now) return { valid: false, message: "Promo code has expired" };
  if (promo.startsAt && promo.startsAt > now) return { valid: false, message: "Promo code is not yet active" };
  if (promo.usageLimit && promo.usageCount >= promo.usageLimit) return { valid: false, message: "Promo code usage limit reached" };
  if (promo.minOrderAmount && orderAmount < Number(promo.minOrderAmount)) {
    return { valid: false, message: `Minimum order amount is ₦${Number(promo.minOrderAmount).toLocaleString()}` };
  }
  const userUsage = await db.select().from(promoCodeUsage)
    .where(and(eq(promoCodeUsage.promoCodeId, promo.id), eq(promoCodeUsage.userId, userId)));
  if (userUsage.length >= promo.perUserLimit) return { valid: false, message: "You have already used this promo code" };

  let discount = 0;
  if (promo.type === "percentage") {
    discount = orderAmount * (Number(promo.value) / 100);
    if (promo.maxDiscount) discount = Math.min(discount, Number(promo.maxDiscount));
  } else if (promo.type === "fixed") {
    discount = Math.min(Number(promo.value), orderAmount);
  } else if (promo.type === "free_delivery") {
    discount = 0; // handled separately in checkout
  }
  return { valid: true, promo, discount };
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
function generateOrderNumber(): string {
  const prefix = "AO";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 16);
}

export async function createOrder(orderData: Omit<InsertOrder, "orderNumber">, items: Omit<InsertOrderItem, "orderId">[]): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const orderNumber = generateOrderNumber();
  const [result] = await db.insert(orders).values({ ...orderData, orderNumber } as InsertOrder).$returningId();
  const orderId = result.id;
  await db.insert(orderItems).values(items.map(item => ({ ...item, orderId } as InsertOrderItem)));
  await db.insert(orderStatusHistory).values({ orderId, status: orderData.status || "created", note: "Order placed" });
  const created = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return created[0];
}

export async function getOrderById(orderId: number): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result[0];
}

export async function getOrderWithItems(orderId: number): Promise<{ order: Order; items: OrderItem[] } | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const orderResult = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!orderResult.length) return undefined;
  const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { order: orderResult[0], items: itemsResult };
}

export async function getUserOrders(userId: number, limit = 20, offset = 0): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit).offset(offset);
}

export async function updateOrderStatus(orderId: number, status: Order["status"], note?: string, changedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [currentOrder] = await db.select({ status: orders.status, orderType: orders.orderType, pickupCode: orders.pickupCode })
    .from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!currentOrder) throw new Error("Order not found");

  // A repeated tap or retried request must never create a duplicate lifecycle
  // event. Returning the current state makes the write idempotent for clients.
  if (currentOrder.status === status) {
    return { changed: false, status: currentOrder.status };
  }

  const permittedNextStatuses: Record<string, string[]> = {
    payment_confirmed: ["accepted", "rejected", "refunded"],
    accepted: ["preparing", "rejected", "refunded"],
    preparing: ["ready", "rejected", "refunded"],
    ready: ["rider_assigned", "completed", "refunded"],
    rider_assigned: ["out_for_delivery", "refunded"],
    out_for_delivery: ["delivered", "refunded"],
    delivered: ["completed", "refunded"],
  };
  if (currentOrder.status !== status && !permittedNextStatuses[currentOrder.status]?.includes(status)) {
    throw new Error(`Invalid order workflow transition from ${currentOrder.status} to ${status}`);
  }

  // FR-065/066: auto-generate 4-digit pickup code when a pickup order becomes ready
  const updateFields: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === 'ready') {
    if (currentOrder.orderType === 'pickup' && !currentOrder.pickupCode) {
      updateFields.pickupCode = String(Math.floor(1000 + Math.random() * 9000));
    }
  }
  await db.update(orders).set(updateFields).where(eq(orders.id, orderId));
  const auditNote = [
    `Status changed from ${currentOrder.status} to ${status}.`,
    note?.trim(),
  ].filter(Boolean).join(" ");
  await db.insert(orderStatusHistory).values({ orderId, status, note: auditNote, changedBy: changedBy || null });
  return { changed: true, status };
}

/** Controlled kitchen-only recovery for a ticket accidentally marked ready. */
export async function recallKitchenOrder(orderId: number, reason: string, changedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [currentOrder] = await db.select({ status: orders.status, branchId: orders.branchId })
    .from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!currentOrder) throw new Error("Order not found");
  if (currentOrder.status !== "ready") {
    throw new Error("Only an order currently marked ready can be recalled to preparation");
  }
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status: "preparing", updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "preparing",
      note: `Status changed from ready to preparing. Recall reason: ${reason.trim()}`,
      changedBy,
    });
  });
  return { changed: true, status: "preparing" as const };
}

/** Marks an order paid exactly once so webhook and client verification cannot duplicate side effects. */
export async function markOrderPaidIfPending(orderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.update(orders)
    .set({ paymentStatus: "paid", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.paymentStatus, "pending")));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) === 1;
}

export async function cancelOrder(orderId: number, userId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ status: "cancelled", cancellationReason: reason, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  await db.insert(orderStatusHistory).values({ orderId, status: "cancelled", note: reason });
}

export async function rateOrder(orderId: number, userId: number, rating: number, review?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ rating, review: review || null, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
}

// ─── LOYALTY ──────────────────────────────────────────────────────────────────
export async function getLoyaltyAccount(userId: number): Promise<LoyaltyAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.userId, userId)).limit(1);
  return result[0];
}

export async function getLoyaltyTransactions(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.userId, userId))
    .orderBy(desc(loyaltyTransactions.createdAt)).limit(limit);
}

export async function awardLoyaltyPoints(userId: number, orderId: number, orderTotal: number) {
  const db = await getDb();
  if (!db) return;
  // 1 point per ₦100 spent
  const points = Math.floor(orderTotal / 100);
  if (points <= 0) return;
  await db.update(loyaltyAccounts).set({
    points: sql`points + ${points}`,
    totalPointsEarned: sql`totalPointsEarned + ${points}`,
    updatedAt: new Date(),
  }).where(eq(loyaltyAccounts.userId, userId));
  await db.insert(loyaltyTransactions).values({
    userId, orderId, type: "earned", points,
    description: `Earned ${points} points for order #${orderId}`,
  });
  // Update tier
  const account = await getLoyaltyAccount(userId);
  if (account) {
    let tier: LoyaltyAccount["tier"] = "bronze";
    if (account.totalPointsEarned >= 10000) tier = "platinum";
    else if (account.totalPointsEarned >= 5000) tier = "gold";
    else if (account.totalPointsEarned >= 1000) tier = "silver";
    await db.update(loyaltyAccounts).set({ tier }).where(eq(loyaltyAccounts.userId, userId));
  }
}

// ─── RIDERS ───────────────────────────────────────────────────────────────────
export async function getRiderByUserId(userId: number): Promise<Rider | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(riders).where(eq(riders.userId, userId)).limit(1);
  return result[0];
}

export async function getAvailableRiders(branchId: number): Promise<Rider[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(riders)
    .where(and(eq(riders.branchId, branchId), eq(riders.isOnline, true), eq(riders.isAvailable, true), eq(riders.isActive, true)));
}

export async function updateRiderLocation(riderId: number, latitude: number, longitude: number, orderId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(riders).set({ currentLatitude: latitude, currentLongitude: longitude, lastLocationUpdate: new Date() })
    .where(eq(riders.id, riderId));
  await db.insert(riderLocationHistory).values({ riderId, orderId: orderId || null, latitude, longitude, recordedAt: new Date() });
}

export async function updateRiderStatus(riderId: number, isOnline: boolean, isAvailable: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(riders).set({ isOnline, isAvailable, updatedAt: new Date() }).where(eq(riders.id, riderId));
}

export async function assignRiderToOrder(orderId: number, riderId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ riderId, status: "rider_assigned", updatedAt: new Date() }).where(eq(orders.id, orderId));
  await db.update(riders).set({ isAvailable: false, updatedAt: new Date() }).where(eq(riders.id, riderId));
  await db.insert(orderStatusHistory).values({ orderId, status: "rider_assigned", note: `Rider #${riderId} assigned`, changedBy: null });
}

export async function getRiderCurrentLocation(riderId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(riders).where(eq(riders.id, riderId)).limit(1);
  if (!result.length) return null;
  return { latitude: result[0].currentLatitude, longitude: result[0].currentLongitude, lastUpdate: result[0].lastLocationUpdate };
}

export async function getOrdersByRider(riderId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(orders.riderId, riderId)];
  if (status) conditions.push(eq(orders.status, status as Order["status"]));
  return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(50);
}

// ─── ADMIN MONITORING ─────────────────────────────────────────────────────────
export async function getActiveOrders(branchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const activeStatuses = ["payment_confirmed", "accepted", "preparing", "ready", "rider_assigned", "out_for_delivery"];
  const conditions = [inArray(orders.status, activeStatuses as Order["status"][])];
  if (branchId) conditions.push(eq(orders.branchId, branchId));
  const activeOrders = await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  if (!activeOrders.length) return [];

  // One batched query keeps the kitchen board fast while ensuring every card
  // has the exact dish snapshot and instruction captured at checkout.
  const items = await db.select({
    orderId: orderItems.orderId,
    mealName: orderItems.name,
    mealId: orderItems.mealId,
    isCustomMeal: orderItems.isCustomMeal,
    customMealConfig: orderItems.customMealConfig,
    quantity: orderItems.quantity,
    specialInstructions: orderItems.specialInstructions,
  })
    .from(orderItems)
    .where(inArray(orderItems.orderId, activeOrders.map((order) => order.id)));

  const mealIds = [...new Set(items.map((item) => item.mealId).filter((id): id is number => id !== null))];
  const mealTargets = mealIds.length
    ? await db.select({ id: meals.id, preparationTime: meals.preparationTime }).from(meals).where(inArray(meals.id, mealIds))
    : [];
  const targetByMealId = new Map(mealTargets.map((meal) => [meal.id, Number(meal.preparationTime) || 20]));

  const histories = await db.select({
    orderId: orderStatusHistory.orderId,
    status: orderStatusHistory.status,
    createdAt: orderStatusHistory.createdAt,
  })
    .from(orderStatusHistory)
    .where(inArray(orderStatusHistory.orderId, activeOrders.map((order) => order.id)))
    .orderBy(orderStatusHistory.createdAt);
  const historyByOrder = new Map<number, typeof histories>();
  for (const entry of histories) {
    const current = historyByOrder.get(entry.orderId) ?? [];
    current.push(entry);
    historyByOrder.set(entry.orderId, current);
  }

  const kitchenItems = items.map((item) => ({
    ...item,
    specialInstructions: item.specialInstructions ?? undefined,
    preparationTargetMinutes: item.mealId ? targetByMealId.get(item.mealId) ?? 20 : 20,
  }));
  const itemsByOrder = new Map<number, typeof kitchenItems>();
  for (const item of kitchenItems) {
    const current = itemsByOrder.get(item.orderId) ?? [];
    current.push(item);
    itemsByOrder.set(item.orderId, current);
  }

  return activeOrders.map((order) => {
    const orderItemsForKitchen = itemsByOrder.get(order.id) ?? [];
    const targetMinutes = Math.max(15, ...orderItemsForKitchen.map((item) => item.preparationTargetMinutes));
    const lifecycle = historyByOrder.get(order.id) ?? [];
    const acceptedAt = lifecycle.find((entry) => entry.status === "accepted")?.createdAt ?? null;
    const preparingAt = lifecycle.find((entry) => entry.status === "preparing")?.createdAt ?? null;
    const targetStart = preparingAt ?? acceptedAt ?? order.createdAt;
    return {
      ...order,
      items: orderItemsForKitchen,
      acceptedAt,
      preparingAt,
      preparationTargetMinutes: targetMinutes,
      promisedReadyAt: new Date(new Date(targetStart).getTime() + targetMinutes * 60_000),
    };
  });
}

export async function getOrderStats(branchId?: number, fromDate?: Date, toDate?: Date) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [];
  if (branchId) conditions.push(eq(orders.branchId, branchId));
  if (fromDate) conditions.push(gte(orders.createdAt, fromDate));
  if (toDate) conditions.push(lte(orders.createdAt, toDate));
  const whereClause = conditions.length ? and(...conditions) : undefined;
  const [stats] = await db.select({
    totalOrders: sql<number>`COUNT(*)`,
    totalRevenue: sql<number>`SUM(CAST(total AS DECIMAL(10,2)))`,
    avgOrderValue: sql<number>`AVG(CAST(total AS DECIMAL(10,2)))`,
    completedOrders: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`,
  }).from(orders).where(whereClause);
  return stats;
}

export async function getAllRiders(branchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(riders.isActive, true)];
  if (branchId) conditions.push(eq(riders.branchId, branchId));
  return db.select({
    rider: riders,
    user: { name: users.name, email: users.email, phone: users.phone },
  }).from(riders).leftJoin(users, eq(riders.userId, users.id)).where(and(...conditions));
}

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────
export async function createReservation(data: InsertReservation): Promise<Reservation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(reservations).values(data).$returningId();
  const created = await db.select().from(reservations).where(eq(reservations.id, result.id)).limit(1);
  return created[0];
}

export async function getUserReservations(userId: number): Promise<Reservation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reservations)
    .where(eq(reservations.userId, userId))
    .orderBy(desc(reservations.reservationDate));
}

export async function cancelReservation(reservationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(reservations).set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(reservations.id, reservationId), eq(reservations.userId, userId)));
}

// ─── CATERING ─────────────────────────────────────────────────────────────────
export async function createCateringRequest(data: InsertCateringRequest): Promise<CateringRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cateringRequests).values(data).$returningId();
  const created = await db.select().from(cateringRequests).where(eq(cateringRequests.id, result.id)).limit(1);
  return created[0];
}

export async function getUserCateringRequests(userId: number): Promise<CateringRequest[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cateringRequests)
    .where(eq(cateringRequests.userId, userId))
    .orderBy(desc(cateringRequests.createdAt));
}

// ─── SUPPORT TICKETS ──────────────────────────────────────────────────────────
function generateTicketNumber(): string {
  return `TKT${Date.now().toString().slice(-8)}`;
}

export async function createSupportTicket(data: {
  userId: number; orderId?: number; category: SupportTicket["category"];
  subject: string; message: string;
}): Promise<SupportTicket> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const ticketNumber = generateTicketNumber();
  const [result] = await db.insert(supportTickets).values({ ...data, ticketNumber, orderId: data.orderId || null }).$returningId();
  const created = await db.select().from(supportTickets).where(eq(supportTickets.id, result.id)).limit(1);
  return created[0];
}

export async function getUserSupportTickets(userId: number): Promise<SupportTicket[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.createdAt));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export async function createNotification(data: {
  userId: number; orderId?: number; type: Notification["type"];
  title: string; body: string; data?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ ...data, orderId: data.orderId || null, data: data.data || {} });
}

export async function getUserNotifications(userId: number, limit = 30): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result?.count ?? 0;
}
