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

### Next Sprint
- [x] FR-102: CSV export button on Reports tab (download transactions for date range)
- [x] FR-006: Role-based access control on admin dashboard (restrict to admin/kitchen roles)
- [x] Kitchen Portal: dedicated screen for kitchen staff with order queue, stock management, monthly report
- [x] Inventory/stock DB table and tRPC endpoints (add/update/deplete stock items)
- [x] Kitchen monthly report (order volumes, popular meals, stock usage)
- [x] FR-060: Delivery zone validation at checkout (check address within branch radius)

### Backend Wiring & Payment Methods (Jul 2026)
- [x] Add activePromotions tRPC endpoint (live promo codes from DB)
- [x] Add builderOptions tRPC endpoint (swallows, soups, proteins, extras)
- [x] Wire promotions screen to live backend (activePromotions)
- [x] Wire branch-select screen to live backend branches query
- [x] Wire meal detail screen to live backend meal query
- [x] Wire favourites screen to live backend favourites query
- [x] Wire reservation screen to live backend (branches + reservations.create)
- [x] Wire meal builder to live backend builderOptions endpoint
- [x] Add OPay payment method to checkout (with merchant phone number flow)
- [x] Add bank transfer payment method to checkout (with account details flow)
- [x] Update branch address: Plot 4, Block 1, Opp. Sumal Industry, Oluyole Town Planning Area, Ibadan
- [x] Remove dead _unused code block from checkout.tsx

### Consistency, Validation & Seed Fixtures (Jul 2026)
- [x] Add server-side order total/subtotal/deliveryFee positive validation in orders.ts
- [x] Create tests/fixtures/seed.ts with deterministic branch, meal-category, meal, and rider (userId=30) seed data
- [x] Update system.roles.test.ts rider.setStatus test to use happy path (seed rider first)
- [x] Build shared reusable component library: StatCard, SectionHeader, EmptyState, LoadingState, BadgeChip, ActionButton, InfoRow
- [x] Build Kitchen Monthly Report dedicated screen (app/kitchen/monthly-report.tsx) with bar chart, top meals, low stock
- [x] Build Transaction Report dedicated screen (app/admin/transaction-report.tsx) with filters, summary tiles, CSV export
- [x] Enhance interactive rider map: live polling, route polyline, ETA display
- [x] Add admin rider tracking screen (app/admin/rider-tracking.tsx) showing all online riders on map
- [ ] Create reusable skill from this project workflow
- [x] Create reusable skill from this project workflow
- [x] Create reusable skill from this project workflow

### Real-time, Role Guards & PDF Export (Jul 2026)
- [x] SSE endpoint /api/riders/live for real-time rider location push
- [x] useRiderLocations hook consuming SSE stream
- [x] Update admin rider-tracking screen to use SSE instead of 15s polling
- [x] Add role field to Auth.User type and getMe API response
- [x] Create useRequireRole(roles) hook with redirect on unauthorised
- [x] Wire role guard to all admin/* screens (admin role)
- [x] Wire role guard to all kitchen/* screens (kitchen role)
- [x] Wire role guard to rider/* screens (rider role)
- [x] PDF export for Transaction Report screen (justified text, tables, branded header)
- [x] PDF export for Kitchen Monthly Report screen (justified text, tables, branded header)
- [x] Shared pdf-generator.ts utility with A4 layout, stat boxes, tables, footer
- [x] expo-print installed for native PDF generation

### Photography, Cart & Fine Dining (Jul 2026)
- [x] Remove "Select Branch" header from home screen; add brand name + notification bell
- [x] Add Experiences section on home screen (Bistro, Events, Fine Dining CTAs)
- [x] Add Contact Us tab (5th tab) with addresses, phone, WhatsApp, directions, social links
- [x] Build Bistro screen: drinks, cocktails, snacks, pastries, desserts with category filter
- [x] Build Events screen: 5 events with bottom sheet detail and book CTA
- [x] Build Fine Dining screen: full premium menu, ambiance section, reservation CTA
- [x] Add real event photography to Events screen (expo-image, gradient overlays)
- [x] Add real bistro photography to Bistro screen (drinks, cocktails, snacks images)
- [x] Wire Bistro "Add" buttons to cart store (haptics, ADD_TO_CART dispatch, qty badge)
- [x] Add Fine Dining Tasting Menu section (5-course ₦25,000 set menu with real photo)
- [x] Update performance test thresholds to 2000ms for sandbox load variability

### Desktop Portal Optimisation (Aug 2026)
- [x] Build reusable PortalLayout component with collapsible sidebar navigation
- [x] Sidebar shows brand logo, nav items with badges, sign-out button
- [x] Responsive: sidebar on desktop (≥900px), compact header on mobile
- [x] Rebuild Finance & Operations portal for desktop: 8-KPI row, stacked revenue chart, live orders table
- [x] Rebuild Kitchen portal for desktop: 3-column Kanban board (New / In Progress / Ready)
- [x] Kitchen order cards show dish list, elapsed time, late warning (>20 min)
- [x] All portal screens use PortalLayout instead of ScreenContainer + AdminMenu
- [x] Build desktop-optimised Menu management screen with PortalLayout
- [x] Category sidebar (desktop) / horizontal chips (mobile) for filtering
- [x] Inline price editor: tap price to edit, press Enter or ✓ to save instantly
- [x] Availability toggle with green/red label per meal card
- [x] Meal cards show photo, badges (Popular/Best Seller/Chef Special), prep time
- [x] Search bar to filter meals by name
- [x] 2-column grid on desktop, single column on mobile

### Final Launch Preparation
- [x] Complete production release-readiness audit and identify external launch blockers
- [x] Identify and catalogue all supplied restaurant dish photographs
- [x] Verify Nigerian dish names and category assignments for the supplied photos
- [x] Upload approved restaurant food photography and link it to the live menu
- [ ] Complete remaining App Store, Play Store, payment, domain, and operations details
- [x] Validate customer, rider, kitchen, and admin workflows before release

### Pre-Launch Debugging
- [x] Audit production logs, configuration, and launch-critical risks before entering live payment keys
- [x] Run static checks, automated tests, endpoint checks, and a production web build
- [x] Fix confirmed runtime, payment-flow, and release-configuration issues
- [x] Complete and document the final pre-launch validation pass

### Final Production Release Gate
- [x] Re-audit production configuration, deployment health, error logs, and outstanding external dependencies
- [x] Test customer and staff access paths, payment failure handling, API protection, and data safeguards
- [x] Resolve every confirmed release-blocking defect and improve customer-facing error messages
- [x] Repeat validation and record a final evidence-based go/no-go decision

### Menu Photo Accuracy Correction
- [x] Audit all existing live meal-photo assignments against the supplied restaurant photographs
- [x] Re-identify each supplied restaurant photograph and verify uncertain dish names
- [x] Correct menu names, categories, and photo links; remove unverified mappings
- [x] Validate the corrected customer and staff menu screens

### Supplied Core Menu Replacement
- [x] Replace the live menu with the supplied Swallow, Main Dish, Sides, Soup, and Protein catalogue only
- [x] Archive all menu items not included in the supplied restaurant list
- [x] Keep Gbegiri, Ewedu, and Okro unavailable until the restaurant confirms their prices
- [x] Validate the revised customer and staff menu views

### Dedicated Kitchen Web Portal
- [x] Confirm Oluyole Town Planning as the active kitchen branch and approve Gbegiri by default with optional Ewedu for Amala
- [x] Configure amalaoluyole@gmail.com as the primary Admin / Manager account at first sign-in
- [x] Create a separate staff-only kitchen web entry point with role-based access and no customer navigation
- [x] Apply Gbegiri-by-default with optional Ewedu and remove standalone Gbegiri, Ewedu, and Okro sales
- [x] Validate kitchen, manager, rider, and customer access paths and document staff sign-in

### Kitchen Portal Completion
- [x] Audit the full Oluyole kitchen workflow against the agreed operational requirements
- [x] Complete order board states, alerts, preparation actions, and branch safeguards
- [x] Complete stock controls, low-stock handling, staff attribution, and monthly reporting
- [x] Validate staff-only access and customer-to-kitchen order handoff on desktop and tablet layouts
- [x] Update kitchen handover documentation and complete final kitchen release checks

### Standalone Kitchen Web Portal
- [x] Roll back the temporary route-based kitchen sign-in update
- [x] Confirm a separate hosted Kitchen Portal that shares the restaurant backend and database
- [x] Create a standalone kitchen web application with staff-only sign-in and Oluyole operations screens
- [x] Deploy a temporary standalone Kitchen Portal URL for manager review
- [ ] Prepare the completed portal for kitchen.amalaoluyole.com after the domain is available
