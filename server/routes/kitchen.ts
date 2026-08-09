import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  inventory,
  inventoryTransactions,
  orders,
  orderItems,
  meals,
  mealBranchAvailability,
  branches,
} from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { createNotification } from "../db";
import { requireKitchenBranch } from "../security/branch-access";

// Kitchen + admin + manager can access all kitchen procedures
const kitchenProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["admin", "manager", "kitchen"];
  if (!ctx.user || !allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Kitchen access required" });
  }
  return next({ ctx });
});

export const kitchenRouter = router({
  workspace: kitchenProcedure.query(async ({ ctx }) => {
    const assignedBranchId = ctx.user.role === "kitchen" ? requireKitchenBranch(ctx.user) : null;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Branch service unavailable" });
    const activeBranches = await db.select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.isActive, true));
    if (ctx.user.role !== "kitchen") {
      return { assignedBranchId: null, canSwitchBranches: true, branches: activeBranches };
    }
    const assigned = activeBranches.filter((branch) => branch.id === assignedBranchId);
    if (!assigned.length) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Assigned kitchen branch is unavailable" });
    }
    return { assignedBranchId, canSwitchBranches: false, branches: assigned };
  }),

  // ── INVENTORY ──────────────────────────────────────────────────────────────
  allInventory: kitchenProcedure
    .input(z.object({ branchId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const branchId = requireKitchenBranch(ctx.user, input.branchId);
      const db = await getDb();
      if (!db) return [] as any;
      return db
        .select()
        .from(inventory)
        .where(and(eq(inventory.branchId, branchId), eq(inventory.isActive, true)))
        .orderBy(inventory.category, inventory.name);
    }),

  addInventoryItem: kitchenProcedure
    .input(z.object({
      branchId: z.number().optional(),
      name: z.string().min(1),
      category: z.enum(["swallow","soup","protein","spice","vegetable","drink","packaging","other"]),
      unit: z.string().default("kg"),
      currentStock: z.number().default(0),
      minimumStock: z.number().default(0),
      costPerUnit: z.number().default(0),
      supplier: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const branchId = requireKitchenBranch(ctx.user, input.branchId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(inventory).values({
        branchId,
        name: input.name,
        category: input.category,
        unit: input.unit,
        currentStock: String(input.currentStock),
        minimumStock: String(input.minimumStock),
        costPerUnit: String(input.costPerUnit),
        supplier: input.supplier,
        notes: input.notes,
      });
      return { success: true };
    }),

  updateStock: kitchenProcedure
    .input(z.object({
      inventoryId: z.number(),
      branchId: z.number().optional(),
      type: z.enum(["restock","usage","waste","adjustment"]),
      quantity: z.number(), // positive = add, negative = remove
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const branchId = requireKitchenBranch(ctx.user, input.branchId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const item = await db.select().from(inventory)
        .where(and(eq(inventory.id, input.inventoryId), eq(inventory.branchId, branchId), eq(inventory.isActive, true)))
        .limit(1);
      if (!item.length) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found for this branch" });
      // Record the transaction
      await db.insert(inventoryTransactions).values({
        inventoryId: input.inventoryId,
        branchId,
        type: input.type,
        quantity: String(input.quantity),
        note: input.note,
        recordedBy: ctx.user.id,
      });
      // Update current stock
      if (item.length > 0) {
        const newStock = Math.max(0, parseFloat(String(item[0].currentStock)) + input.quantity);
        await db.update(inventory)
          .set({
            currentStock: String(newStock),
            lastRestockedAt: input.type === "restock" ? new Date() : undefined,
          })
          .where(and(eq(inventory.id, input.inventoryId), eq(inventory.branchId, branchId)));
        // ── Low-stock push notification ──────────────────────────────────────
        const minStock = parseFloat(String(item[0].minimumStock));
        if (newStock <= minStock && input.type !== "restock") {
          // Notify the project owner via Manus notification service
          notifyOwner({
            title: `⚠️ Low Stock Alert: ${item[0].name}`,
            content: `${item[0].name} is running low. Current: ${newStock} ${item[0].unit} (min: ${minStock} ${item[0].unit}). Please restock soon.`,
          }).catch(() => {});
          // Also create in-app notifications for all admin/manager users
          const managers = await db.select({ id: users.id }).from(users)
            .where(sql`${users.role} IN ('admin', 'manager')`);
          await Promise.all(managers.map(m =>
            createNotification({
              userId: m.id,
              type: "general",
              title: `⚠️ Low Stock: ${item[0].name}`,
              body: `${item[0].name} is at ${newStock} ${item[0].unit} (minimum: ${minStock} ${item[0].unit}). Please restock.`,
            }).catch(() => {})
          ));
        }
      }
      return { success: true };
    }),

  deleteInventoryItem: kitchenProcedure
    .input(z.object({ id: z.number(), branchId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const branchId = requireKitchenBranch(ctx.user, input.branchId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(inventory).set({ isActive: false }).where(and(eq(inventory.id, input.id), eq(inventory.branchId, branchId)));
      return { success: true };
    }),

  stockTransactions: kitchenProcedure
    .input(z.object({ inventoryId: z.number(), branchId: z.number().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const branchId = requireKitchenBranch(ctx.user, input.branchId);
      const db = await getDb();
      if (!db) return [] as any;
      return db
        .select()
        .from(inventoryTransactions)
        .where(and(eq(inventoryTransactions.inventoryId, input.inventoryId), eq(inventoryTransactions.branchId, branchId)))
        .orderBy(desc(inventoryTransactions.createdAt))
        .limit(input.limit);
    }),

  // ── MEAL AVAILABILITY (kitchen can toggle availability) ────────────────────
  toggleMealAvailability: kitchenProcedure
    .input(z.object({ mealId: z.number(), branchId: z.number(), isAvailable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const branchId = requireKitchenBranch(ctx.user, input.branchId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Update global meal availability
      await db.update(meals)
        .set({ isAvailable: input.isAvailable })
        .where(eq(meals.id, input.mealId));
      // Also update branch-specific availability if record exists
      const existing = await db.select().from(mealBranchAvailability)
        .where(and(eq(mealBranchAvailability.mealId, input.mealId), eq(mealBranchAvailability.branchId, branchId)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(mealBranchAvailability)
          .set({ isAvailable: input.isAvailable })
          .where(and(eq(mealBranchAvailability.mealId, input.mealId), eq(mealBranchAvailability.branchId, branchId)));
      }
      return { success: true };
    }),

  // ── MONTHLY REPORT ─────────────────────────────────────────────────────────
  monthlyReport: kitchenProcedure
    .input(z.object({
      branchId: z.number().optional(),
      year: z.number(),
      month: z.number(), // 1-12
    }))
    .query(async ({ ctx, input }) => {
      const branchId = requireKitchenBranch(ctx.user, input.branchId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

      // Kitchen-safe service counts. Financial totals stay in the Finance workspace.
      const orderStats = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
          completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} IN ('completed','delivered') THEN 1 ELSE 0 END)`,
          cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
        })
        .from(orders)
        .where(and(
          eq(orders.branchId, branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
        ));

      // Daily order counts for the month
      // MySQL only_full_group_by: use identical raw SQL expression in SELECT and GROUP BY
      const dailyOrders = await db
        .select({
          day: sql<string>`DATE(orders.createdAt)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(
          eq(orders.branchId, branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
        ))
        .groupBy(sql`DATE(orders.createdAt)`)
        .orderBy(sql`DATE(orders.createdAt)`);

      // Top 10 most ordered meals
      const topMeals = await db
        .select({
          mealName: orderItems.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          eq(orders.branchId, branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
          eq(orderItems.isCustomMeal, false),
        ))
        .groupBy(orderItems.name)
        .orderBy(desc(sql`SUM(${orderItems.quantity})`))
        .limit(10);

      // Order type breakdown (delivery vs pickup)
      const orderTypeBreakdown = await db
        .select({
          orderType: orders.orderType,
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(
          eq(orders.branchId, branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
        ))
        .groupBy(orders.orderType);

      // Low stock items (below minimum threshold)
      const lowStockItems = await db
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.branchId, branchId),
          eq(inventory.isActive, true),
          sql`${inventory.currentStock} <= ${inventory.minimumStock}`,
        ));

      return {
       period: { year: input.year, month: input.month, startDate, endDate },
       summary: orderStats[0] ?? { totalOrders: 0, completedOrders: 0, cancelledOrders: 0 },
       dailyOrders,
       topMeals,
       orderTypeBreakdown,
       lowStockItems,
     };
    }),
});
