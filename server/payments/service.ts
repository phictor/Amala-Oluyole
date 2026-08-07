import crypto from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { loyaltyAccounts, loyaltyTransactions, orders, orderStatusHistory, users } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import {
  initializePaystackTransaction,
  validatePaystackTransaction,
  verifyPaystackTransaction,
  type PaystackTransaction,
} from "./paystack";

function getPaystackSecret(): string {
  const value = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!value) throw new Error("Payment service unavailable");
  return value;
}

export async function initializeOrderPayment(userId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Payment service unavailable");
  const prepared = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    const [row] = await tx.select({ order: orders, email: users.email }).from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1);
    if (!row?.order) throw new Error("Order not found");
    if (row.order.paymentMethod !== "card" || row.order.paymentStatus !== "pending" || row.order.status !== "awaiting_payment") {
      throw new Error("Order is not eligible for card payment");
    }
    if (!row.email) throw new Error("A verified email address is required for card payment");
    const reference = row.order.paymentReference ?? `AO-${orderId}-${crypto.randomBytes(12).toString("hex")}`;
    if (!row.order.paymentReference) {
      await tx.update(orders).set({ paymentReference: reference, paymentInitializedAt: new Date() })
        .where(and(eq(orders.id, orderId), eq(orders.paymentStatus, "pending")));
    }
    return { email: row.email, reference, amountKobo: Math.round(Number(row.order.total) * 100) };
  });
  return initializePaystackTransaction({
    secretKey: getPaystackSecret(),
    email: prepared.email,
    amountKobo: prepared.amountKobo,
    reference: prepared.reference,
    orderId,
    userId,
    appId: ENV.appId,
  });
}

export async function confirmVerifiedPayment(
  orderId: number,
  transaction: PaystackTransaction,
): Promise<{ alreadyConfirmed: boolean; orderId: number; userId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Payment service unavailable");
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    if (!order.paymentReference) throw new Error("Payment was not initialized for this order");

    const [otherOrder] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.paymentReference, transaction.reference)).limit(1);
    if (otherOrder && otherOrder.id !== order.id) throw new Error("Payment reference is linked to another order");
    validatePaystackTransaction(transaction, {
      reference: order.paymentReference,
      amountKobo: Math.round(Number(order.total) * 100),
      orderId: order.id,
      userId: order.userId,
      appId: ENV.appId,
    });

    if (order.paymentStatus === "paid") return { alreadyConfirmed: true, orderId: order.id, userId: order.userId };
    if (order.paymentStatus !== "pending" || order.status !== "awaiting_payment") throw new Error("Order is not awaiting payment");

    await tx.update(orders).set({
      paymentStatus: "paid",
      status: "payment_confirmed",
      paymentVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(orders.id, order.id), eq(orders.paymentStatus, "pending")));
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status: "payment_confirmed",
      note: "Payment verified by Paystack",
      changedBy: null,
    });

    const idempotencyKey = `order:${order.id}:earned`;
    const [existingAward] = await tx.select({ id: loyaltyTransactions.id }).from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.idempotencyKey, idempotencyKey)).limit(1);
    if (!existingAward) {
      const points = Math.floor(Number(order.total) / 100);
      if (points > 0) {
        await tx.update(loyaltyAccounts).set({
          points: sql`${loyaltyAccounts.points} + ${points}`,
          totalPointsEarned: sql`${loyaltyAccounts.totalPointsEarned} + ${points}`,
          updatedAt: new Date(),
        }).where(eq(loyaltyAccounts.userId, order.userId));
        await tx.insert(loyaltyTransactions).values({
          userId: order.userId,
          orderId: order.id,
          type: "earned",
          points,
          description: `Earned points for order #${order.id}`,
          idempotencyKey,
        });
      }
    }
    return { alreadyConfirmed: false, orderId: order.id, userId: order.userId };
  });
}

export async function verifyAndConfirmOrderPayment(userId: number, orderId: number, reference: string) {
  const db = await getDb();
  if (!db) throw new Error("Payment service unavailable");
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1);
  if (!order) throw new Error("Order not found");
  if (!order.paymentReference || order.paymentReference !== reference) throw new Error("Payment reference mismatch");
  if (order.paymentStatus === "paid") return { success: true, alreadyConfirmed: true };
  const transaction = await verifyPaystackTransaction(reference, getPaystackSecret());
  const result = await confirmVerifiedPayment(orderId, transaction);
  return { success: true, alreadyConfirmed: result.alreadyConfirmed };
}
