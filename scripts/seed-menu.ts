/**
 * Amala Oluyole — Real Menu Seed Script
 * Run: npx tsx scripts/seed-menu.ts
 *
 * Seeds: branches, meal categories, full menu (swallows, soups, proteins,
 * sides, drinks, desserts, specials), and meal-branch availability links.
 */
import "./load-env.js";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, inArray } from "drizzle-orm";
import {
  branches,
  mealCategories,
  meals,
  mealBranchAvailability,
} from "../drizzle/schema";

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

// ─── BRANCHES ────────────────────────────────────────────────────────────────
const BRANCHES = [
  {
    name: "Amala Oluyole — Oluyole Estate",
    address: "12 Oluyole Estate Road, Oluyole",
    city: "Ibadan",
    state: "Oyo",
    phone: "+234 803 000 0001",
    email: "oluyole@amalaoluyole.com",
    latitude: 7.3775,
    longitude: 3.9470,
    openingTime: "07:00",
    closingTime: "22:00",
    isActive: true,
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsReservations: true,
    deliveryRadiusKm: 10,
    deliveryFeeBase: "500.00",
    minOrderAmount: "1500.00",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
  },
  {
    name: "Amala Oluyole — Ring Road",
    address: "45 Ring Road, Ibadan",
    city: "Ibadan",
    state: "Oyo",
    phone: "+234 803 000 0002",
    email: "ringroad@amalaoluyole.com",
    latitude: 7.3900,
    longitude: 3.9100,
    openingTime: "07:00",
    closingTime: "22:00",
    isActive: true,
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsReservations: true,
    deliveryRadiusKm: 8,
    deliveryFeeBase: "500.00",
    minOrderAmount: "1500.00",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
  },
  {
    name: "Amala Oluyole — Bodija",
    address: "7 University Road, Bodija",
    city: "Ibadan",
    state: "Oyo",
    phone: "+234 803 000 0003",
    email: "bodija@amalaoluyole.com",
    latitude: 7.4200,
    longitude: 3.9000,
    openingTime: "07:00",
    closingTime: "22:00",
    isActive: true,
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsReservations: true,
    deliveryRadiusKm: 8,
    deliveryFeeBase: "500.00",
    minOrderAmount: "1500.00",
    imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800",
  },
];

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Swallows", slug: "swallows", emoji: "🫓", description: "Amala, Eba, Pounded Yam, Fufu and more", sortOrder: 1 },
  { name: "Soups", slug: "soups", emoji: "🍲", description: "Ewedu, Gbegiri, Egusi, Okra and more", sortOrder: 2 },
  { name: "Proteins", slug: "proteins", emoji: "🍖", description: "Assorted meats, fish, and more", sortOrder: 3 },
  { name: "Rice & Pasta", slug: "rice-pasta", emoji: "🍚", description: "Jollof, Fried Rice, Spaghetti and more", sortOrder: 4 },
  { name: "Sides & Extras", slug: "sides", emoji: "🥗", description: "Moi Moi, Akara, Fried Plantain and more", sortOrder: 5 },
  { name: "Drinks", slug: "drinks", emoji: "🥤", description: "Zobo, Chapman, Soft Drinks and more", sortOrder: 6 },
  { name: "Desserts", slug: "desserts", emoji: "🍮", description: "Puff Puff, Chin Chin and more", sortOrder: 7 },
  { name: "Chef Specials", slug: "chef-specials", emoji: "👨‍🍳", description: "Signature dishes from our head chef", sortOrder: 8 },
];

// ─── MEALS ───────────────────────────────────────────────────────────────────
// categorySlug → meals
const MEALS_BY_CATEGORY: Record<string, Array<{
  name: string; description: string; price: string; preparationTime: number;
  calories?: number; labels?: string[]; isPopular?: boolean; isBestSeller?: boolean;
  isChefSpecial?: boolean; isSpicy?: boolean; imageUrl?: string; sortOrder?: number;
}>> = {
  swallows: [
    {
      name: "Amala Oluyole",
      description: "Our signature black amala made from yam flour, smooth and perfectly textured. Served with your choice of soup.",
      price: "1500.00",
      preparationTime: 10,
      calories: 380,
      labels: ["signature", "bestseller"],
      isPopular: true,
      isBestSeller: true,
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 1,
    },
    {
      name: "Eba (Garri)",
      description: "Classic eba made from cassava flakes, firm and satisfying. Pairs perfectly with any of our soups.",
      price: "1200.00",
      preparationTime: 8,
      calories: 350,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 2,
    },
    {
      name: "Pounded Yam",
      description: "Freshly pounded yam, smooth and stretchy. A premium swallow for a premium experience.",
      price: "1800.00",
      preparationTime: 15,
      calories: 420,
      labels: ["premium"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 3,
    },
    {
      name: "Fufu (Cassava)",
      description: "Soft and stretchy cassava fufu, fermented to perfection. A West African classic.",
      price: "1200.00",
      preparationTime: 10,
      calories: 330,
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 4,
    },
    {
      name: "Wheat Swallow",
      description: "Smooth wheat swallow — a lighter, healthier alternative with a mild nutty flavour.",
      price: "1300.00",
      preparationTime: 10,
      calories: 360,
      labels: ["healthy"],
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 5,
    },
    {
      name: "Oat Swallow",
      description: "A modern, fibre-rich swallow made from oats. Ideal for health-conscious diners.",
      price: "1400.00",
      preparationTime: 10,
      calories: 340,
      labels: ["healthy", "new"],
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 6,
    },
  ],
  soups: [
    {
      name: "Ewedu Soup",
      description: "Silky, mucilaginous ewedu (jute leaves) soup. The perfect companion to amala.",
      price: "800.00",
      preparationTime: 10,
      calories: 120,
      labels: ["signature", "popular"],
      isPopular: true,
      isBestSeller: true,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 1,
    },
    {
      name: "Gbegiri Soup",
      description: "Smooth, velvety bean soup with a rich, earthy flavour. Pairs beautifully with ewedu.",
      price: "800.00",
      preparationTime: 20,
      calories: 180,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 2,
    },
    {
      name: "Egusi Soup",
      description: "Rich melon seed soup cooked with assorted meats, crayfish, and palm oil. A Nigerian classic.",
      price: "1000.00",
      preparationTime: 25,
      calories: 280,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 3,
    },
    {
      name: "Okra Soup",
      description: "Thick, draw okra soup with assorted meat and seafood. Hearty and deeply flavourful.",
      price: "1000.00",
      preparationTime: 20,
      calories: 220,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 4,
    },
    {
      name: "Bitterleaf Soup",
      description: "Traditional bitterleaf soup with cocoyam thickener, assorted meat, and dried fish.",
      price: "1000.00",
      preparationTime: 30,
      calories: 240,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 5,
    },
    {
      name: "Vegetable Soup (Efo Riro)",
      description: "Vibrant stewed spinach with peppers, assorted meat, and crayfish. Packed with nutrients.",
      price: "1000.00",
      preparationTime: 20,
      calories: 200,
      labels: ["healthy"],
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 6,
    },
    {
      name: "Ogbono Soup",
      description: "Draw soup made from wild mango seeds, rich and aromatic with assorted meats.",
      price: "1000.00",
      preparationTime: 25,
      calories: 260,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 7,
    },
    {
      name: "Pepper Soup (Assorted)",
      description: "Spicy, aromatic broth with assorted meats and traditional pepper soup spices.",
      price: "1200.00",
      preparationTime: 20,
      calories: 180,
      labels: ["spicy"],
      isSpicy: true,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      sortOrder: 8,
    },
  ],
  proteins: [
    {
      name: "Assorted Meat (Small)",
      description: "A selection of cow tripe, shaki, and ponmo. Slow-cooked in our signature spice blend.",
      price: "800.00",
      preparationTime: 5,
      calories: 220,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 1,
    },
    {
      name: "Assorted Meat (Large)",
      description: "Generous portion of cow tripe, shaki, and ponmo. Perfect for a hearty meal.",
      price: "1500.00",
      preparationTime: 5,
      calories: 440,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 2,
    },
    {
      name: "Beef (Stewed)",
      description: "Tender beef pieces slow-stewed in tomato and pepper sauce.",
      price: "1000.00",
      preparationTime: 5,
      calories: 300,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 3,
    },
    {
      name: "Goat Meat",
      description: "Succulent goat meat cooked with onions, peppers, and aromatic spices.",
      price: "1200.00",
      preparationTime: 5,
      calories: 280,
      labels: ["premium"],
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 4,
    },
    {
      name: "Fried Fish",
      description: "Whole tilapia or catfish, seasoned and deep-fried to golden perfection.",
      price: "1500.00",
      preparationTime: 10,
      calories: 350,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 5,
    },
    {
      name: "Smoked Fish",
      description: "Traditionally smoked catfish with a deep, smoky flavour.",
      price: "1200.00",
      preparationTime: 5,
      calories: 280,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 6,
    },
    {
      name: "Ponmo (Cow Skin)",
      description: "Soft, gelatinous cow skin cooked in our pepper sauce.",
      price: "600.00",
      preparationTime: 5,
      calories: 120,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 7,
    },
    {
      name: "Shaki (Cow Tripe)",
      description: "Chewy, flavourful cow tripe slow-cooked in our signature blend.",
      price: "700.00",
      preparationTime: 5,
      calories: 140,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 8,
    },
    {
      name: "Chicken (Half)",
      description: "Half chicken, marinated and grilled or stewed to order.",
      price: "2000.00",
      preparationTime: 15,
      calories: 480,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600",
      sortOrder: 9,
    },
  ],
  "rice-pasta": [
    {
      name: "Jollof Rice",
      description: "Party-style jollof rice cooked over firewood for that authentic smoky flavour.",
      price: "1800.00",
      preparationTime: 15,
      calories: 450,
      labels: ["popular", "bestseller"],
      isPopular: true,
      isBestSeller: true,
      imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
      sortOrder: 1,
    },
    {
      name: "Fried Rice",
      description: "Nigerian fried rice with mixed vegetables, liver, and shrimps.",
      price: "1800.00",
      preparationTime: 15,
      calories: 480,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
      sortOrder: 2,
    },
    {
      name: "White Rice & Stew",
      description: "Plain white rice served with our rich tomato and pepper stew.",
      price: "1500.00",
      preparationTime: 10,
      calories: 420,
      imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
      sortOrder: 3,
    },
    {
      name: "Ofada Rice & Sauce",
      description: "Local Ofada rice served with spicy ayamase (designer) sauce.",
      price: "2000.00",
      preparationTime: 15,
      calories: 500,
      labels: ["spicy", "local"],
      isSpicy: true,
      imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
      sortOrder: 4,
    },
    {
      name: "Spaghetti Bolognese",
      description: "Spaghetti cooked with seasoned minced beef in rich tomato sauce.",
      price: "1800.00",
      preparationTime: 20,
      calories: 520,
      imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
      sortOrder: 5,
    },
  ],
  sides: [
    {
      name: "Moi Moi",
      description: "Steamed bean pudding with fish, egg, and peppers. A Nigerian staple.",
      price: "500.00",
      preparationTime: 5,
      calories: 180,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
      sortOrder: 1,
    },
    {
      name: "Akara (Bean Cake)",
      description: "Crispy deep-fried bean fritters, lightly spiced. Perfect as a side or snack.",
      price: "400.00",
      preparationTime: 10,
      calories: 220,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
      sortOrder: 2,
    },
    {
      name: "Fried Plantain (Dodo)",
      description: "Sweet, ripe plantain sliced and fried to caramelised perfection.",
      price: "400.00",
      preparationTime: 8,
      calories: 200,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
      sortOrder: 3,
    },
    {
      name: "Coleslaw",
      description: "Fresh, creamy coleslaw with cabbage, carrots, and our house dressing.",
      price: "300.00",
      preparationTime: 5,
      calories: 120,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
      sortOrder: 4,
    },
    {
      name: "Boiled Egg",
      description: "Hard-boiled egg, a classic protein-rich side.",
      price: "200.00",
      preparationTime: 5,
      calories: 80,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
      sortOrder: 5,
    },
  ],
  drinks: [
    {
      name: "Zobo (Hibiscus Drink)",
      description: "Chilled hibiscus flower drink, lightly sweetened with ginger and cloves. Made fresh daily.",
      price: "400.00",
      preparationTime: 2,
      calories: 60,
      labels: ["popular", "local"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600",
      sortOrder: 1,
    },
    {
      name: "Kunu (Millet Drink)",
      description: "Traditional millet-based drink, mildly spiced with ginger and pepper.",
      price: "400.00",
      preparationTime: 2,
      calories: 80,
      labels: ["local"],
      imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600",
      sortOrder: 2,
    },
    {
      name: "Chapman",
      description: "Classic Nigerian Chapman cocktail with Fanta, Sprite, Grenadine, and cucumber.",
      price: "600.00",
      preparationTime: 3,
      calories: 140,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600",
      sortOrder: 3,
    },
    {
      name: "Soft Drink (Can)",
      description: "Chilled Coca-Cola, Fanta, Sprite, or Pepsi. Ask your server for availability.",
      price: "300.00",
      preparationTime: 1,
      calories: 140,
      imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600",
      sortOrder: 4,
    },
    {
      name: "Bottled Water",
      description: "Chilled 75cl bottled water.",
      price: "200.00",
      preparationTime: 1,
      calories: 0,
      imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600",
      sortOrder: 5,
    },
    {
      name: "Fresh Juice (Orange)",
      description: "Freshly squeezed orange juice, no added sugar.",
      price: "500.00",
      preparationTime: 5,
      calories: 90,
      labels: ["healthy"],
      imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600",
      sortOrder: 6,
    },
  ],
  desserts: [
    {
      name: "Puff Puff",
      description: "Soft, pillowy deep-fried dough balls, lightly sweetened. A beloved Nigerian street snack.",
      price: "400.00",
      preparationTime: 10,
      calories: 280,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600",
      sortOrder: 1,
    },
    {
      name: "Chin Chin",
      description: "Crunchy fried dough snacks, lightly spiced with nutmeg. A Nigerian party classic.",
      price: "300.00",
      preparationTime: 5,
      calories: 320,
      imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600",
      sortOrder: 2,
    },
    {
      name: "Boli (Roasted Plantain)",
      description: "Whole plantain roasted over charcoal, served with groundnut sauce.",
      price: "500.00",
      preparationTime: 15,
      calories: 240,
      labels: ["popular"],
      isPopular: true,
      imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600",
      sortOrder: 3,
    },
  ],
  "chef-specials": [
    {
      name: "Amala Oluyole Combo",
      description: "Our signature amala served with ewedu, gbegiri, and assorted meat. The complete Oluyole experience.",
      price: "3500.00",
      preparationTime: 15,
      calories: 680,
      labels: ["signature", "bestseller", "combo"],
      isPopular: true,
      isBestSeller: true,
      isChefSpecial: true,
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 1,
    },
    {
      name: "Pounded Yam & Egusi Combo",
      description: "Freshly pounded yam with rich egusi soup and choice of protein. A premium Nigerian feast.",
      price: "4000.00",
      preparationTime: 20,
      calories: 720,
      labels: ["premium", "combo"],
      isPopular: true,
      isChefSpecial: true,
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 2,
    },
    {
      name: "Jollof Rice Party Pack",
      description: "Firewood jollof rice with fried chicken, coleslaw, and moi moi. Feeds 2–3 people.",
      price: "6500.00",
      preparationTime: 20,
      calories: 1200,
      labels: ["party", "combo", "popular"],
      isPopular: true,
      isChefSpecial: true,
      imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
      sortOrder: 3,
    },
    {
      name: "Sunday Special Platter",
      description: "Pounded yam, bitterleaf soup, goat meat, and smoked fish. Our Sunday favourite.",
      price: "5000.00",
      preparationTime: 20,
      calories: 900,
      labels: ["weekend", "combo"],
      isChefSpecial: true,
      imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600",
      sortOrder: 4,
    },
  ],
};

// ─── MAIN SEED FUNCTION ───────────────────────────────────────────────────────
async function seed() {
  console.log("🌱  Starting Amala Oluyole menu seed...\n");

  // 1. Upsert branches
  console.log("📍  Seeding branches...");
  const existingBranches = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchIds: number[] = [];
  for (const b of BRANCHES) {
    const existing = existingBranches.find(e => e.name === b.name);
    if (existing) {
      console.log(`   ↳ Branch already exists: ${b.name} (id=${existing.id})`);
      branchIds.push(existing.id);
    } else {
      await db.insert(branches).values(b as any);
      const [created] = await db.select({ id: branches.id }).from(branches).where(eq(branches.name, b.name)).limit(1);
      console.log(`   ✅ Created branch: ${b.name} (id=${created.id})`);
      branchIds.push(created.id);
    }
  }

  // 2. Upsert categories
  console.log("\n📂  Seeding meal categories...");
  const existingCats = await db.select({ id: mealCategories.id, slug: mealCategories.slug }).from(mealCategories);
  const categoryIdBySlug: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const existing = existingCats.find(e => e.slug === cat.slug);
    if (existing) {
      console.log(`   ↳ Category already exists: ${cat.name} (id=${existing.id})`);
      categoryIdBySlug[cat.slug] = existing.id;
    } else {
      await db.insert(mealCategories).values({ ...cat, isActive: true } as any);
      const [created] = await db.select({ id: mealCategories.id }).from(mealCategories).where(eq(mealCategories.slug, cat.slug)).limit(1);
      console.log(`   ✅ Created category: ${cat.name} (id=${created.id})`);
      categoryIdBySlug[cat.slug] = created.id;
    }
  }

  // 3. Upsert meals
  console.log("\n🍽️   Seeding meals...");
  let totalMeals = 0;
  const allMealIds: number[] = [];
  for (const [slug, mealList] of Object.entries(MEALS_BY_CATEGORY)) {
    const categoryId = categoryIdBySlug[slug];
    if (!categoryId) { console.warn(`   ⚠️  No category found for slug: ${slug}`); continue; }
    const existingMeals = await db.select({ id: meals.id, name: meals.name }).from(meals).where(eq(meals.categoryId, categoryId));
    for (const m of mealList) {
      const existing = existingMeals.find(e => e.name === m.name);
      if (existing) {
        console.log(`   ↳ Meal already exists: ${m.name}`);
        allMealIds.push(existing.id);
      } else {
        await db.insert(meals).values({
          categoryId,
          name: m.name,
          description: m.description,
          price: m.price,
          imageUrl: m.imageUrl ?? null,
          preparationTime: m.preparationTime,
          calories: m.calories ?? null,
          labels: m.labels ?? [],
          isAvailable: true,
          isPopular: m.isPopular ?? false,
          isBestSeller: m.isBestSeller ?? false,
          isChefSpecial: m.isChefSpecial ?? false,
          isSpicy: m.isSpicy ?? false,
          allergens: [],
          sortOrder: m.sortOrder ?? 0,
          rating: 4.5,
          ratingCount: 0,
        } as any);
        const [created] = await db.select({ id: meals.id }).from(meals).where(eq(meals.name, m.name)).limit(1);
        console.log(`   ✅ Created meal: ${m.name} (id=${created.id})`);
        allMealIds.push(created.id);
        totalMeals++;
      }
    }
  }

  // 4. Link all meals to all branches
  console.log("\n🔗  Linking meals to branches...");
  let linked = 0;
  for (const mealId of allMealIds) {
    for (const branchId of branchIds) {
      const existing = await db.select({ id: mealBranchAvailability.id })
        .from(mealBranchAvailability)
        .where(eq(mealBranchAvailability.mealId, mealId))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(mealBranchAvailability).values({ mealId, branchId, isAvailable: true } as any);
        linked++;
      }
    }
  }
  console.log(`   ✅ Created ${linked} meal-branch availability records`);

  console.log(`\n🎉  Seed complete!`);
  console.log(`   Branches: ${branchIds.length}`);
  console.log(`   Categories: ${Object.keys(categoryIdBySlug).length}`);
  console.log(`   New meals added: ${totalMeals}`);
  process.exit(0);
}

seed().catch(err => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
