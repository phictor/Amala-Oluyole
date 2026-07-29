import { z } from "zod";
import {
  getActiveOrders, getAllRiders, getOrderStats, getOrderWithItems,
  updateOrderStatus, assignRiderToOrder, getAvailableRiders,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { meals, mealCategories, orders, users, riders, branches, promoCodes } from "../../drizzle/schema";
import { eq, desc, count, and, gte, lte, sql } from "drizzle-orm";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Kitchen/admin procedure
const kitchenProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["admin", "manager", "kitchen"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Kitchen access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Dashboard stats
  stats: adminProcedure
    .input(z.object({
      branchId: z.number().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }).optional())
    .query(({ input }) => getOrderStats(
      input?.branchId,
      input?.fromDate ? new Date(input.fromDate) : undefined,
      input?.toDate ? new Date(input.toDate) : undefined,
    )),

  // Active orders monitoring
  // Transaction / payment reconciliation report (FR-100, FR-101, FR-102)
  transactionReport: adminProcedure
    .input(z.object({
      branchId: z.number().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], summary: null };
      const conditions: Parameters<typeof and>[0][] = [];
      if (input?.branchId) conditions.push(eq(orders.branchId, input.branchId));
      if (input?.fromDate) conditions.push(gte(orders.createdAt, new Date(input.fromDate)));
      if (input?.toDate) conditions.push(lte(orders.createdAt, new Date(input.toDate)));
      const whereClause = conditions.length ? and(...conditions as [Parameters<typeof and>[0], ...Parameters<typeof and>[0][]]) : undefined;
      const rows = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          createdAt: orders.createdAt,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          paymentMethod: orders.paymentMethod,
          paymentReference: orders.paymentReference,
          total: orders.total,
          orderType: orders.orderType,
          branchId: orders.branchId,
        })
        .from(orders)
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
      const [summary] = await db
        .select({
          totalOrders: count(),
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL(12,2))),0)`,
          paidOrders: sql<number>`SUM(CASE WHEN ${orders.paymentStatus}='paid' THEN 1 ELSE 0 END)`,
          pendingOrders: sql<number>`SUM(CASE WHEN ${orders.paymentStatus}='pending' THEN 1 ELSE 0 END)`,
          failedOrders: sql<number>`SUM(CASE WHEN ${orders.paymentStatus}='failed' THEN 1 ELSE 0 END)`,
          cardRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentMethod}='card' THEN CAST(${orders.total} AS DECIMAL(12,2)) ELSE 0 END),0)`,
          transferRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentMethod}='transfer' THEN CAST(${orders.total} AS DECIMAL(12,2)) ELSE 0 END),0)`,
          cashRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentMethod}='cash_on_delivery' THEN CAST(${orders.total} AS DECIMAL(12,2)) ELSE 0 END),0)`,
        })
        .from(orders)
        .where(whereClause);
      return { rows, summary };
    }),

  // All branches for filter dropdowns
  allBranches: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.isActive, true));
  }),

  activeOrders: kitchenProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(({ input }) => getActiveOrders(input?.branchId)),

  // Get full order detail
  orderDetail: kitchenProcedure
    .input(z.object({ orderId: z.number() }))
    .query(({ input }) => getOrderWithItems(input.orderId)),

  // Update order status (kitchen/admin)
  updateOrderStatus: kitchenProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.enum(["accepted", "preparing", "ready", "rejected", "refunded"]),
      note: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => updateOrderStatus(input.orderId, input.status, input.note, ctx.user.id)),

  // Rider management
  riders: adminProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(({ input }) => getAllRiders(input?.branchId)),

  availableRiders: adminProcedure
    .input(z.object({ branchId: z.number() }))
    .query(({ input }) => getAvailableRiders(input.branchId)),

  // Assign rider to order
  assignRider: adminProcedure
    .input(z.object({ orderId: z.number(), riderId: z.number() }))
    .mutation(({ input }) => assignRiderToOrder(input.orderId, input.riderId)),

  // ── Meal Management (CRUD) ────────────────────────────────────────────────
  allMeals: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(meals).orderBy(meals.categoryId, meals.sortOrder, meals.name);
  }),

  createMeal: adminProcedure
    .input(z.object({
      categoryId: z.number(),
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().positive(),
      imageUrl: z.string().url().optional(),
      preparationTime: z.number().default(15),
      isAvailable: z.boolean().default(true),
      isPopular: z.boolean().default(false),
      isBestSeller: z.boolean().default(false),
      isChefSpecial: z.boolean().default(false),
      isSpicy: z.boolean().default(false),
      labels: z.array(z.string()).default([]),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(meals).values({
        ...input,
        price: String(input.price),
      }).$returningId();
      return { id: result.id, success: true };
    }),

  updateMeal: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
      imageUrl: z.string().optional(),
      preparationTime: z.number().optional(),
      isAvailable: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      isBestSeller: z.boolean().optional(),
      isChefSpecial: z.boolean().optional(),
      isSpicy: z.boolean().optional(),
      labels: z.array(z.string()).optional(),
      sortOrder: z.number().optional(),
      categoryId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, price, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (price !== undefined) updateData.price = String(price);
      await db.update(meals).set(updateData).where(eq(meals.id, id));
      return { success: true };
    }),

  deleteMeal: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(meals).set({ isAvailable: false, updatedAt: new Date() }).where(eq(meals.id, input.id));
      return { success: true };
    }),

  // ── Dashboard Overview ────────────────────────────────────────────────────
  overview: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalOrders] = await db.select({ count: count() }).from(orders);
    const [todayOrders] = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, today));
    const [totalMeals] = await db.select({ count: count() }).from(meals);
    const [totalRiders] = await db.select({ count: count() }).from(riders).where(eq(riders.isActive, true));
    const [totalBranches] = await db.select({ count: count() }).from(branches).where(eq(branches.isActive, true));
    return {
      totalOrders: totalOrders.count,
      todayOrders: todayOrders.count,
      totalMeals: totalMeals.count,
      totalRiders: totalRiders.count,
      totalBranches: totalBranches.count,
    };
  }),

  // ── FR-070 / FR-071: Promo Code Management ──────────────────────────────
  allPromoCodes: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    }),

  createPromoCode: adminProcedure
    .input(z.object({
      code: z.string().min(3).max(32),
      description: z.string().optional(),
      type: z.enum(["percentage", "fixed", "free_delivery", "bogo"]),
      value: z.number().min(0),
      minOrderAmount: z.number().min(0).default(0),
      maxDiscount: z.number().optional(),
      usageLimit: z.number().optional(),
      perUserLimit: z.number().min(1).default(1),
      isActive: z.boolean().default(true),
      startsAt: z.string().optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(promoCodes).values({
        code: input.code.toUpperCase(),
        description: input.description,
        type: input.type,
        value: String(input.value),
        minOrderAmount: String(input.minOrderAmount),
        maxDiscount: input.maxDiscount != null ? String(input.maxDiscount) : undefined,
        usageLimit: input.usageLimit,
        perUserLimit: input.perUserLimit,
        isActive: input.isActive,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      });
      return { success: true };
    }),

  updatePromoCode: adminProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      type: z.enum(["percentage", "fixed", "free_delivery", "bogo"]).optional(),
      value: z.number().optional(),
      minOrderAmount: z.number().optional(),
      maxDiscount: z.number().optional(),
      usageLimit: z.number().optional(),
      perUserLimit: z.number().optional(),
      isActive: z.boolean().optional(),
      startsAt: z.string().optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, value, minOrderAmount, maxDiscount, startsAt, expiresAt, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (value !== undefined) updates.value = String(value);
      if (minOrderAmount !== undefined) updates.minOrderAmount = String(minOrderAmount);
      if (maxDiscount !== undefined) updates.maxDiscount = String(maxDiscount);
      if (startsAt !== undefined) updates.startsAt = new Date(startsAt);
      if (expiresAt !== undefined) updates.expiresAt = new Date(expiresAt);
      await db.update(promoCodes).set(updates).where(eq(promoCodes.id, id));
      return { success: true };
    }),

  togglePromoCode: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(promoCodes).set({ isActive: input.isActive }).where(eq(promoCodes.id, input.id));
      return { success: true };
    }),

  deletePromoCode: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(promoCodes).where(eq(promoCodes.id, input.id));
      return { success: true };
    }),
});
