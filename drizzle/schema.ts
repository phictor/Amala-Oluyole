import {
  boolean,
  decimal,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── USERS ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["customer", "admin", "rider", "kitchen", "manager"]).default("customer").notNull(),
  isGuest: boolean("isGuest").default(false).notNull(),
  pushToken: text("pushToken"),
  preferredBranchId: int("preferredBranchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// ─── BRANCHES ────────────────────────────────────────────────────────────────
export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 64 }).notNull(),
  state: varchar("state", { length: 64 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  latitude: float("latitude"),
  longitude: float("longitude"),
  openingTime: varchar("openingTime", { length: 8 }).default("08:00").notNull(),
  closingTime: varchar("closingTime", { length: 8 }).default("22:00").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  acceptsDelivery: boolean("acceptsDelivery").default(true).notNull(),
  acceptsPickup: boolean("acceptsPickup").default(true).notNull(),
  acceptsReservations: boolean("acceptsReservations").default(true).notNull(),
  deliveryRadiusKm: float("deliveryRadiusKm").default(10),
  deliveryFeeBase: decimal("deliveryFeeBase", { precision: 10, scale: 2 }).default("500.00"),
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("1500.00"),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── MEAL CATEGORIES ─────────────────────────────────────────────────────────
export const mealCategories = mysqlTable("meal_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  emoji: varchar("emoji", { length: 8 }),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── MEALS ───────────────────────────────────────────────────────────────────
export const meals = mysqlTable("meals", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"),
  preparationTime: int("preparationTime").default(15).notNull(), // minutes
  calories: int("calories"),
  rating: float("rating").default(4.5),
  ratingCount: int("ratingCount").default(0).notNull(),
  labels: json("labels").$type<string[]>().default([]),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  isPopular: boolean("isPopular").default(false).notNull(),
  isBestSeller: boolean("isBestSeller").default(false).notNull(),
  isChefSpecial: boolean("isChefSpecial").default(false).notNull(),
  isSpicy: boolean("isSpicy").default(false).notNull(),
  allergens: json("allergens").$type<string[]>().default([]),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── MEAL BRANCH AVAILABILITY ─────────────────────────────────────────────────
export const mealBranchAvailability = mysqlTable("meal_branch_availability", {
  id: int("id").autoincrement().primaryKey(),
  mealId: int("mealId").notNull(),
  branchId: int("branchId").notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  stockCount: int("stockCount"), // null = unlimited
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── CUSTOMER ADDRESSES ───────────────────────────────────────────────────────
export const customerAddresses = mysqlTable("customer_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 32 }).default("Home").notNull(), // Home, Work, Other
  fullAddress: text("fullAddress").notNull(),
  landmark: text("landmark"),
  latitude: float("latitude"),
  longitude: float("longitude"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  userId: int("userId").notNull(),
  branchId: int("branchId").notNull(),
  riderId: int("riderId"),
  orderType: mysqlEnum("orderType", ["delivery", "pickup", "dine_in"]).notNull(),
  status: mysqlEnum("status", [
    "created", "awaiting_payment", "payment_confirmed",
    "accepted", "preparing", "ready",
    "rider_assigned", "out_for_delivery", "delivered",
    "completed", "cancelled", "rejected", "refunded",
  ]).default("created").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["card", "transfer", "cash_on_delivery", "wallet", "loyalty_points"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  paymentReference: varchar("paymentReference", { length: 128 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("deliveryFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  loyaltyPointsUsed: int("loyaltyPointsUsed").default(0).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  promoCode: varchar("promoCode", { length: 32 }),
  deliveryAddress: text("deliveryAddress"),
  deliveryLatitude: float("deliveryLatitude"),
  deliveryLongitude: float("deliveryLongitude"),
  deliveryInstructions: text("deliveryInstructions"),
  estimatedDeliveryTime: int("estimatedDeliveryTime"), // minutes
  actualDeliveryTime: timestamp("actualDeliveryTime"),
  customerNotes: text("customerNotes"),
  rejectionReason: text("rejectionReason"),
  cancellationReason: text("cancellationReason"),
  rating: int("rating"), // 1-5
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  pickupCode: varchar("pickupCode", { length: 6 }),
});

// ─── ORDER ITEMS ─────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  mealId: int("mealId"),
  isCustomMeal: boolean("isCustomMeal").default(false).notNull(),
  customMealConfig: json("customMealConfig").$type<{
    swallow?: string; soup?: string; proteins?: string[]; extras?: string[];
  }>(),
  name: varchar("name", { length: 128 }).notNull(), // snapshot of meal name at order time
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  specialInstructions: text("specialInstructions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── ORDER STATUS HISTORY ─────────────────────────────────────────────────────
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  note: text("note"),
  changedBy: int("changedBy"), // userId of who changed it (null = system)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── RIDERS ──────────────────────────────────────────────────────────────────
export const riders = mysqlTable("riders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  branchId: int("branchId").notNull(),
  vehicleType: mysqlEnum("vehicleType", ["motorcycle", "bicycle", "car"]).default("motorcycle").notNull(),
  vehiclePlate: varchar("vehiclePlate", { length: 16 }),
  isOnline: boolean("isOnline").default(false).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  currentLatitude: float("currentLatitude"),
  currentLongitude: float("currentLongitude"),
  lastLocationUpdate: timestamp("lastLocationUpdate"),
  totalDeliveries: int("totalDeliveries").default(0).notNull(),
  rating: float("rating").default(5.0),
  ratingCount: int("ratingCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── RIDER LOCATION HISTORY ───────────────────────────────────────────────────
export const riderLocationHistory = mysqlTable("rider_location_history", {
  id: int("id").autoincrement().primaryKey(),
  riderId: int("riderId").notNull(),
  orderId: int("orderId"),
  latitude: float("latitude").notNull(),
  longitude: float("longitude").notNull(),
  speed: float("speed"), // km/h
  heading: float("heading"), // degrees
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

// ─── LOYALTY ACCOUNTS ────────────────────────────────────────────────────────
export const loyaltyAccounts = mysqlTable("loyalty_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  points: int("points").default(0).notNull(),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"]).default("bronze").notNull(),
  totalPointsEarned: int("totalPointsEarned").default(0).notNull(),
  totalPointsRedeemed: int("totalPointsRedeemed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── LOYALTY TRANSACTIONS ─────────────────────────────────────────────────────
export const loyaltyTransactions = mysqlTable("loyalty_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  type: mysqlEnum("type", ["earned", "redeemed", "bonus", "expired", "adjusted"]).notNull(),
  points: int("points").notNull(), // positive = earned, negative = redeemed
  description: text("description"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── PROMO CODES ─────────────────────────────────────────────────────────────
export const promoCodes = mysqlTable("promo_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  description: text("description"),
  type: mysqlEnum("type", ["percentage", "fixed", "free_delivery", "bogo"]).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(), // % or ₦ amount
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("0.00"),
  maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }),
  usageLimit: int("usageLimit"), // null = unlimited
  usageCount: int("usageCount").default(0).notNull(),
  perUserLimit: int("perUserLimit").default(1).notNull(),
  applicableBranchIds: json("applicableBranchIds").$type<number[]>().default([]), // empty = all branches
  isActive: boolean("isActive").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── PROMO CODE USAGE ────────────────────────────────────────────────────────
export const promoCodeUsage = mysqlTable("promo_code_usage", {
  id: int("id").autoincrement().primaryKey(),
  promoCodeId: int("promoCodeId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(),
  discountApplied: decimal("discountApplied", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── RESERVATIONS ────────────────────────────────────────────────────────────
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  branchId: int("branchId").notNull(),
  guestName: varchar("guestName", { length: 128 }).notNull(),
  guestPhone: varchar("guestPhone", { length: 20 }).notNull(),
  guestEmail: varchar("guestEmail", { length: 320 }),
  partySize: int("partySize").notNull(),
  reservationDate: timestamp("reservationDate").notNull(),
  occasion: varchar("occasion", { length: 64 }),
  specialRequests: text("specialRequests"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "no_show"]).default("pending").notNull(),
  tableNumber: varchar("tableNumber", { length: 16 }),
  confirmationNote: text("confirmationNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── CATERING REQUESTS ───────────────────────────────────────────────────────
export const cateringRequests = mysqlTable("catering_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  branchId: int("branchId").notNull(),
  contactName: varchar("contactName", { length: 128 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 20 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  eventDate: timestamp("eventDate").notNull(),
  guestCount: int("guestCount").notNull(),
  venue: text("venue").notNull(),
  mealPreferences: text("mealPreferences"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  additionalRequirements: text("additionalRequirements"),
  status: mysqlEnum("status", ["pending", "reviewing", "quoted", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  quotedAmount: decimal("quotedAmount", { precision: 12, scale: 2 }),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  ticketNumber: varchar("ticketNumber", { length: 20 }).notNull().unique(),
  category: mysqlEnum("category", ["order_issue", "payment", "delivery", "food_quality", "app_bug", "general"]).notNull(),
  subject: varchar("subject", { length: 256 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── PUSH NOTIFICATION TOKENS ─────────────────────────────────────────────────
export const pushTokens = mysqlTable("push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: text("token").notNull(),
  platform: mysqlEnum("platform", ["ios", "android", "web"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  type: mysqlEnum("type", ["order_update", "promotion", "loyalty", "reservation", "general"]).notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  body: text("body").notNull(),
  data: json("data").$type<Record<string, unknown>>().default({}),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── FAVOURITES ───────────────────────────────────────────────────────────────
export const favourites = mysqlTable("favourites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mealId: int("mealId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── INVENTORY ───────────────────────────────────────────────────────────────
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  category: mysqlEnum("category", ["swallow", "soup", "protein", "spice", "vegetable", "drink", "packaging", "other"]).default("other").notNull(),
  unit: varchar("unit", { length: 32 }).default("kg").notNull(),
  currentStock: decimal("currentStock", { precision: 10, scale: 2 }).default("0.00").notNull(),
  minimumStock: decimal("minimumStock", { precision: 10, scale: 2 }).default("0.00").notNull(),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 2 }).default("0.00").notNull(),
  supplier: varchar("supplier", { length: 128 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  lastRestockedAt: timestamp("lastRestockedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── INVENTORY TRANSACTIONS ──────────────────────────────────────────────────
export const inventoryTransactions = mysqlTable("inventory_transactions", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventoryId").notNull(),
  branchId: int("branchId").notNull(),
  type: mysqlEnum("type", ["restock", "usage", "waste", "adjustment"]).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── EXPORT TYPES ────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;
export type MealCategory = typeof mealCategories.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = typeof meals.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type Rider = typeof riders.$inferSelect;
export type InsertRider = typeof riders.$inferInsert;
export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;
export type CateringRequest = typeof cateringRequests.$inferSelect;
export type InsertCateringRequest = typeof cateringRequests.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type InsertCustomerAddress = typeof customerAddresses.$inferInsert;
export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = typeof inventory.$inferInsert;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
