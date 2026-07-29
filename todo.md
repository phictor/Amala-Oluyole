# Amala Oluyole App — TODO

## Phase 1 MVP Features

### Setup & Branding
- [x] Generate app logo and update branding assets
- [x] Configure brand theme colors (terracotta, brown, gold)
- [x] Set up navigation structure (tabs + stack)
- [x] Create core data models and mock data

### Onboarding & Auth
- [x] Splash screen with logo animation
- [x] Onboarding slides (3 screens)
- [x] Login screen (phone/email + password)
- [x] Register screen with OTP verification
- [x] Guest checkout flow
- [x] Forgot password screen

### Branch & Home
- [x] Branch selection screen (list + map)
- [x] Home screen (featured meals, categories, promotions)
- [x] Search functionality

### Menu & Meal Discovery
- [x] Menu categories screen
- [x] Meal listing with filters
- [x] Meal detail screen (photo, description, allergens, price)
- [x] Availability status indicators
- [x] Dietary/special labels (Popular, New, Chef's Choice)

### Meal Builder
- [x] Build Your Swallow step-by-step builder
- [x] Step 1: Swallow selection
- [x] Step 2: Soup selection
- [x] Step 3: Protein selection
- [x] Step 4: Extras and add-ons
- [x] Real-time price calculation

### Cart & Checkout
- [x] Cart screen with quantity controls
- [x] Promo code entry
- [x] Loyalty points application
- [x] Delivery/pickup selection
- [x] Address selection screen
- [x] Payment screen (card, transfer, USSD)
- [x] Order confirmation screen
- [ ] Scheduled order option (Phase 2)

### Order Management
- [x] Order tracking with status timeline
- [x] Order history screen
- [x] Order detail/receipt screen
- [x] Reorder functionality

### Account & Loyalty
- [x] Customer profile screen
- [x] Favourites screen
- [x] Loyalty points screen
- [x] Promotions/vouchers screen
- [ ] Settings & privacy screen (Phase 2)

### Services
- [x] Reservations screen
- [x] Catering request form
- [x] Customer support screen (FAQ, call, WhatsApp)
- [x] Notifications screen

### Social Sharing
- [x] Share custom Build Your Swallow meal via native share sheet (WhatsApp, social media, SMS)
- [x] Copy shareable link to clipboard with visual feedback
- [x] Share summary card shown on final step of meal builder

### Deep Link Handler
- [x] Register amalaoluyole:// custom URL scheme in app.config.ts
- [x] Add https://amalaoluyole.com/meal/custom Android intent filter for universal links
- [x] Parse sw/so/pr/ex URL query params in meal builder on mount
- [x] Pre-populate swallow, soup, protein, extras selections from link params
- [x] Skip to Step 4 (Extras) when loaded from a shared link
- [x] Show amber "Loaded from a shared link" dismissible banner
- [x] Fuzzy name matching (case/punctuation-insensitive) for robust param decoding
- [x] Skip unavailable options silently when pre-filling from link

### Backend & Database
- [x] Full production database schema (21 tables: users, branches, meals, categories, orders, order_items, riders, loyalty, reservations, catering, support, notifications, addresses, promo_codes, etc.)
- [x] Database seeded with 4 branches, 7 categories, 22 meals, 2 promo codes
- [x] server/db.ts with all query helpers for every feature domain
- [x] tRPC routes: menu, orders, loyalty, rider, reservations, catering, support, notifications, addresses, profile, admin
- [x] Home screen wired to live backend with graceful mock fallback

### Store Submission Readiness
- [x] EAS Build config (eas.json) for development, preview, and production builds
- [x] Privacy Policy screen
- [x] Terms of Service screen
- [x] iOS permissions: location, camera, photos, notifications, privacy manifest
- [x] Android permissions: notifications, location, camera, media, vibrate
- [x] App store description added to app.config.ts

### Live Backend Integrations
- [x] Wire Menu screen to live DB data via trpc.menu.meals.useQuery
- [x] Wire Menu categories to live DB via trpc.menu.categories.useQuery
- [x] Admin/Kitchen Dashboard — orders list, meal CRUD, rider monitoring, order status updates
- [x] Paystack payment integration in checkout screen (react-native-paystack-webview v5.1.0)
- [x] Payment verification via tRPC after Paystack callback
- [x] Fix TypeScript errors in checkout.tsx (onSuccess type + CustomMeal.name)

### SRS Gap Items — Phase 1 Must-Haves (from SRS review)
- [x] Cart badge counter on tab bar (show item count on Cart tab icon)
- [x] Add/Edit Meal admin screen (dedicated form for meal CRUD — FR-014, UC-09)
- [x] Transaction monitoring Reports tab in admin dashboard (FR-100, FR-101, FR-102) — accessible via web preview URL
- [ ] Report export to CSV/spreadsheet (FR-102, AC-023)
- [x] Payment server-side verification endpoint (FR-041 — verify Paystack reference on backend before marking order paid)
- [x] Pickup collection code generation and verification (FR-065, FR-066, AC-016)
- [ ] Role-based access control on admin screens (FR-006, AC-021)
- [ ] Audit log for admin actions (FR-007)
- [ ] Delivery zone validation at checkout (FR-060, AC-008)

### SRS Gap Items — Phase 1 Should-Haves
- [ ] Scheduled ordering within branch hours (FR-033)
- [x] Promotion admin CRUD (create/edit/delete promo codes and campaigns — FR-070, FR-071)
- [ ] Verified reviews linked to completed orders (FR-090, AC-014)
- [ ] Structured support tickets linked to orders (FR-091)
- [ ] Order preparation time flag / SLA alert (FR-056)
- [ ] Refund recording and monitoring (FR-045, AC-019)

### SRS Gap Items — Phase 2 (Future)
- [ ] Loyalty points earn/redeem (FR-072, FR-073)
- [ ] QR-code dine-in ordering
- [ ] Table reservations with capacity check (FR-080, FR-081)
- [ ] Catering quotation + deposit workflow (FR-083)
- [ ] Corporate accounts and bulk orders (FR-084)
- [ ] iOS App Store publication
- [ ] Inventory and wastage management
- [x] Fix duplicate-key FlatList bug in menu.tsx category tabs
- [x] Extract logo brand colours and apply to theme.config.js app-wide
- [x] FR-041: Backend payment verification endpoint + wire to checkout onSuccess
- [x] FR-070-071: Promotions admin tab (CRUD for promo codes)
- [x] FR-065-066: Pickup collection code generation and display on order confirmation
