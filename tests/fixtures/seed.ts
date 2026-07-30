/**
 * Deterministic test seed fixtures.
 *
 * Call `ensureTestFixtures()` at the top of any test suite that needs a branch,
 * meal category, meal, or rider in the database. The function is idempotent —
 * it inserts rows only when they are missing, so it is safe to call multiple times.
 *
 * Seeded IDs:
 *   Branch  id=1  — "Test Branch Ibadan"
 *   Category id=1 — "Amala & Swallows"
 *   Meal    id=1  — "Amala & Ewedu" (₦2,500)
 *   User    id=30 — "Test Rider" (role=rider)  [created if absent]
 *   Rider   userId=30, branchId=1
 */
import { getDb } from "../../server/db";
import { branches, mealCategories, meals, users, riders } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function ensureTestFixtures() {
  const db = await getDb();
  if (!db) return;

  // ── Branch id=1 ───────────────────────────────────────────────────────────
  const existingBranch = await db.select({ id: branches.id }).from(branches).where(eq(branches.id, 1)).limit(1);
  if (!existingBranch.length) {
    await db.execute(sql`INSERT IGNORE INTO branches (id, name, address, city, state, phone, isActive, acceptsDelivery, acceptsPickup, acceptsReservations) VALUES (1, 'Test Branch Ibadan', 'Plot 4, Block 1, Oluyole Town Planning Area', 'Ibadan', 'Oyo', '08000000001', 1, 1, 1, 1)`);
  }

  // ── Meal Category id=1 ────────────────────────────────────────────────────
  const existingCat = await db.select({ id: mealCategories.id }).from(mealCategories).where(eq(mealCategories.id, 1)).limit(1);
  if (!existingCat.length) {
    await db.execute(sql`INSERT IGNORE INTO meal_categories (id, name, slug, emoji, sortOrder, isActive) VALUES (1, 'Amala & Swallows', 'amala-swallows', '🍲', 1, 1)`);
  }

  // ── Meal id=1 ─────────────────────────────────────────────────────────────
  const existingMeal = await db.select({ id: meals.id }).from(meals).where(eq(meals.id, 1)).limit(1);
  if (!existingMeal.length) {
    await db.execute(sql`INSERT IGNORE INTO meals (id, categoryId, name, description, price, isAvailable, isPopular, isBestSeller, isChefSpecial, isSpicy, preparationTime, sortOrder) VALUES (1, 1, 'Amala & Ewedu', 'Classic Yoruba staple — smooth amala with fresh ewedu soup', '2500.00', 1, 1, 1, 0, 0, 15, 1)`);
  }

  // ── User id=30 (rider role) ───────────────────────────────────────────────
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, 30)).limit(1);
  if (!existingUser.length) {
    await db.execute(sql`INSERT IGNORE INTO users (id, openId, name, email, loginMethod, role, isGuest) VALUES (30, 'test-rider-openid-30', 'Test Rider', 'rider30@amalaoluyole.com', 'manus', 'rider', 0)`);
  }

  // ── Rider record for userId=30 ────────────────────────────────────────────
  const existingRider = await db.select({ id: riders.id }).from(riders).where(eq(riders.userId, 30)).limit(1);
  if (!existingRider.length) {
    await db.execute(sql`INSERT IGNORE INTO riders (userId, branchId, vehicleType, vehiclePlate, isOnline, isAvailable, isActive) VALUES (30, 1, 'motorcycle', 'OY-001-TEST', 0, 1, 1)`);
  }
}
