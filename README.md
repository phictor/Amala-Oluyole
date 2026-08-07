# Amala Oluyole — Restaurant App

A full-stack mobile application for Amala Oluyole restaurant, built with **Expo (React Native)**, **TypeScript**, **tRPC**, and **MySQL**. The app serves four distinct user roles from a single codebase: customers, kitchen staff, riders, and administrators.

---

## Features

### Customer App
- Browse the full menu by category (Swallows, Soups, Proteins, Rice, Sides, Drinks, Desserts, Chef Specials)
- Add items to cart, apply promo codes, and checkout via Paystack
- Choose delivery or pickup, select branch, and enter delivery address
- Live order tracking timeline (Placed → Accepted → Preparing → Ready → Out for Delivery → Delivered)
- 5-minute order cancellation window
- Loyalty points system with tier progression (Bronze → Silver → Gold → Platinum)
- Fine Dining reservations and Catering enquiries
- Bistro menu with cart integration
- Events booking
- Push notifications for every order status change

### Admin / Manager Portal
- Finance dashboard with 7-day revenue bar chart, KPIs, and payment method breakdown
- Live order queue with dish-level detail and one-tap status updates
- Kitchen view (same as kitchen staff portal)
- Riders view with live location map (OpenStreetMap) and assignment
- Menu management: add, edit, disable, remove meals; upload meal photos from device
- Staff management: change user roles, add new riders with vehicle details
- Promo code management
- Transaction report with date-range filter and CSV export
- Rider tracking map with real-time location updates

### Kitchen Portal
- Live order queue grouped by status (New / In Progress / Ready)
- Dish list on every order card
- Sound + haptic alert on new orders (with mute toggle)
- 10-second polling for near-real-time updates
- Inventory management with low-stock alerts
- Monthly summary report

### Rider Portal
- Online/offline toggle
- Active delivery list with status updates
- Sound + haptic alert when a new delivery is assigned
- Delivery history and profile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo SDK 54, React Native 0.81, TypeScript |
| Styling | NativeWind v4 (Tailwind CSS) |
| Navigation | Expo Router v6 (file-based) |
| API | tRPC v11 over Express |
| Database | MySQL via Drizzle ORM |
| Auth | OAuth (Google / Apple) via Manus Auth |
| Payments | Paystack (card + bank transfer) |
| Storage | S3-compatible (Manus Storage) |
| Push notifications | Expo Push Notifications + expo-server-sdk |
| Maps | OpenStreetMap via Leaflet.js (WebView) |

---

## Project Structure

```
app/
  (tabs)/              ← Customer tab bar (Home, Menu, Cart, Orders, Profile)
  (portal-admin)/      ← Admin portal (Finance, Orders, Kitchen, Riders, Menu, Staff, More)
  (portal-kitchen)/    ← Kitchen portal (Orders, Inventory, Report)
  (portal-rider)/      ← Rider portal (Deliveries, Map, Profile)
  admin/               ← Full-screen admin screens (transaction-report, rider-tracking, add-meal)
  order/[id].tsx       ← Order detail + tracking timeline
  ...
server/
  routes/              ← tRPC routers (admin, orders, kitchen, rider, loyalty, profile, ...)
  db.ts                ← All database query functions
  storage.ts           ← S3 file upload helpers
  _core/               ← Auth, notifications, LLM, image generation, etc.
drizzle/
  schema.ts            ← Full database schema
  migrations/          ← SQL migration files
scripts/
  seed-menu.ts         ← Seeds branches, categories, and 46 meals into the database
hooks/                 ← Custom React hooks (useAuth, useColors, useNewOrderAlert, ...)
components/            ← Shared UI components (ScreenContainer, RiderMap, ui/*)
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- A MySQL database (local or hosted)
- Expo Go app on your phone (for testing on device)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/amala-oluyole-app.git
cd amala-oluyole-app
pnpm install
```

### 2. Set environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=mysql://user:password@host:3306/amala_oluyole

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# Manus built-in services (auto-configured in Manus WebDev)
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
```

### 3. Run database migrations

```bash
pnpm db:push
```

### 4. Seed the menu

```bash
npx tsx scripts/seed-menu.ts
```

This creates 3 branches, 8 meal categories, and 46 meals.

### 5. Start the development server

```bash
pnpm dev
```

- **Web preview:** http://localhost:8081
- **Mobile (Expo Go):** scan the QR code printed in the terminal with the Expo Go app

---

## Role Management

All users log in through the same login screen. The app reads the user's role from the database and redirects them to the correct portal automatically.

| Role | Portal | How to assign |
|---|---|---|
| `customer` | Customer tab bar | Default for all new sign-ups |
| `admin` | Finance & Operations portal | Admin → Staff tab → tap user → change role |
| `manager` | Finance & Operations portal | Same as admin |
| `kitchen` | Kitchen portal | Same as admin |
| `rider` | Rider portal | Admin → Staff tab → tap **+ Add Rider** button |

**To add a new rider:**
1. The rider must first sign in to the app with their Google or Apple account.
2. Go to Admin → Staff tab.
3. Tap **+ Add Rider** (green button, top right).
4. Enter their User ID (visible on their staff card), select their branch and vehicle type.
5. Tap **Create Rider Account**. They will be redirected to the Rider portal on their next login.

---

## Adding Meal Photos

1. Go to Admin → Menu tab.
2. Each meal card shows a 📷 thumbnail on the left. Tap it (or tap the **📷 Photo** button on the right).
3. Select a photo from your device library. The image is cropped to 4:3, compressed, and uploaded to S3.
4. The meal's photo updates immediately across the app.

---

## Paystack Webhook

To auto-confirm payments server-side, add this URL to your Paystack dashboard under **Settings → Webhooks**:

```
https://YOUR_DOMAIN/api/paystack/webhook
```

The endpoint verifies the HMAC-SHA512 signature using your `PAYSTACK_SECRET_KEY` before processing.

---

## Running Tests

```bash
pnpm test
```

138 tests across 6 test files covering auth, orders, loyalty, admin, and performance.

---

## Deployment

The app is deployed via **Manus WebDev**. To publish a new version:

1. Save a checkpoint in the Manus UI.
2. Click the **Publish** button in the top-right of the Management UI.
3. The build process generates an APK (Android) and a web build automatically.

Do not attempt to build the APK manually in the sandbox — it will exhaust available memory.

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and run `pnpm check` to confirm TypeScript is clean.
3. Run `pnpm test` to confirm all tests pass.
4. Open a pull request against `main`.

---

## Licence

Proprietary — Amala Oluyole Restaurant. All rights reserved.
