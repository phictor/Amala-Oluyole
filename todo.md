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
