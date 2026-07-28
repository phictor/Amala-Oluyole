# Amala Oluyole App — Interface Design Plan

## Brand Identity

**App Name:** Amala Oluyole
**Tagline:** Authentic Nigerian Flavours, Delivered to You
**Brand Colors:**
- Primary: Deep Terracotta/Burnt Orange `#C0392B` — evokes warmth, traditional Nigerian cooking
- Secondary: Rich Brown `#6B3A2A` — earthy, authentic
- Accent: Golden Yellow `#F39C12` — warmth, appetite stimulation
- Background Light: Warm White `#FDF8F3`
- Background Dark: Deep Brown `#1A0F0A`
- Surface Light: Cream `#FFF5EC`
- Surface Dark: Dark Brown `#2A1810`
- Text Light: `#1A0F0A`
- Text Dark: `#FDF8F3`
- Muted: `#8B6F5E`
- Success: `#27AE60`
- Warning: `#F39C12`
- Error: `#E74C3C`

## Screen List

### Onboarding & Auth
1. **Splash Screen** — Logo animation with brand colors
2. **Onboarding (3 slides)** — App value proposition slides
3. **Login Screen** — Phone/email + password, Google/Apple sign-in
4. **Register Screen** — Name, phone, email, password, OTP verification
5. **OTP Verification** — 6-digit code entry
6. **Guest Access** — Continue without account
7. **Forgot Password** — Reset via phone/email

### Core Ordering Flow
8. **Branch Selection** — Map view + list of branches with distance
9. **Home Screen** — Featured meals, categories, promotions banner, search
10. **Menu Categories** — Grid of categories with meal counts
11. **Search Results** — Filtered meal list with sort options
12. **Meal Detail** — Photo, description, price, allergens, customization
13. **Build Your Meal** — Step-by-step swallow + soup + protein + extras builder
14. **Cart** — Items list, quantities, promo code, totals breakdown
15. **Delivery/Pickup Selection** — Choose order type
16. **Address Selection** — Saved addresses + map picker
17. **Payment Screen** — Payment method selection + summary
18. **Order Confirmation** — Success state with order number
19. **Order Tracking** — Status timeline + rider location

### Account & History
20. **Order History** — Past orders list with reorder option
21. **Order Detail** — Full order breakdown + receipt
22. **Favourites** — Saved meals and combinations
23. **Loyalty Account** — Points balance, history, rewards
24. **Promotions** — Active vouchers and offers

### Services
25. **Reservations** — Book a table with date/time/guests
26. **Catering Request** — Event details form
27. **Customer Support** — Chat, call, FAQ, WhatsApp
28. **Notifications** — Notification history

### Profile & Settings
29. **Customer Profile** — Edit name, photo, phone, email
30. **Settings & Privacy** — Notification prefs, account deletion, T&C

## Key User Flows

### Flow 1: Guest Order (Most Common)
Splash → Onboarding → Guest Access → Branch Selection → Home → Category → Meal Detail → Add to Cart → Cart → Delivery Selection → Address → Payment → Order Confirmation → Order Tracking

### Flow 2: Build Your Swallow
Home → "Build Your Meal" CTA → Step 1 (Swallow) → Step 2 (Soup) → Step 3 (Protein) → Step 4 (Extras) → Add to Cart → Checkout

### Flow 3: Registered User Reorder
Login → Home → Order History → Select Past Order → Reorder → Cart (pre-filled) → Payment → Confirmation

### Flow 4: Table Reservation
Home → Reservations Tab → Select Branch → Pick Date/Time/Guests → Confirm → Receive Notification

## Tab Bar Navigation (5 Tabs)
1. **Home** (house icon) — Main ordering hub
2. **Menu** (fork/spoon icon) — Browse all categories
3. **Cart** (bag icon) — Current cart with badge count
4. **Orders** (receipt icon) — Order history and tracking
5. **Profile** (person icon) — Account, loyalty, settings

## Layout Principles
- **Portrait-first, one-handed use** — Primary actions in bottom 60% of screen
- **Large touch targets** — Minimum 44pt tap areas
- **Food photography first** — Full-width hero images on meal cards
- **Clear price visibility** — Price always prominent in bold
- **Progressive disclosure** — Show essential info first, details on tap
- **Warm, appetizing palette** — Terracotta and cream evoke Nigerian cuisine
- **Status-driven UI** — Order status always visible and color-coded
