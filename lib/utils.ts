import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Unified Meal Card type ───────────────────────────────────────────────────
// Normalizes both the local mock Meal type and the DB Meal type (where price is a decimal string)
export interface MealCard {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  preparationTime?: number;
  rating?: number | null;
  ratingCount?: number;
  labels?: string[] | null;
  isPopular?: boolean;
  isBestSeller?: boolean;
  isChefSpecial?: boolean;
  isSpicy?: boolean;
  categoryId?: number;
}

// Normalizes a DB meal (price as string decimal) or mock meal (price as number) to MealCard
export function toMealCard(meal: Record<string, unknown>): MealCard {
  return {
    id: meal.id as number,
    name: meal.name as string,
    description: meal.description as string | null,
    price: typeof meal.price === 'string' ? parseFloat(meal.price) : (meal.price as number),
    imageUrl: meal.imageUrl as string | null,
    preparationTime: meal.preparationTime as number,
    rating: meal.rating as number | null,
    ratingCount: meal.ratingCount as number,
    labels: meal.labels as string[] | null,
    isPopular: meal.isPopular as boolean,
    isBestSeller: meal.isBestSeller as boolean,
    isChefSpecial: meal.isChefSpecial as boolean,
    isSpicy: meal.isSpicy as boolean,
    categoryId: meal.categoryId as number,
  };
}
