# Amala Oluyole — Pre-Launch Readiness

**Validation date:** 6 September 2026  
**Scope:** Mobile customer/rider application, browser-based staff portals, API server, menu database, and Paystack payment hand-off.

## Current Status

The application is **technically ready for controlled staff acceptance testing**. The web build, TypeScript check, lint check, server build, API health check, role-guard check, and automated regression suite all pass. A total of **141 automated tests pass** and one intentional authentication logout test remains skipped.

The application is **not yet ready to accept public card payments** until the restaurant enters its real Paystack keys through the secure project settings and completes one small live payment test. The checkout now handles this safely: where a valid Paystack public key is absent, card payment is unavailable instead of presenting a non-functional checkout.

| Area | Result | Notes |
|---|---|---|
| TypeScript compilation | Passed | No type errors found. |
| Lint | Passed | The React Native lint configuration has no errors. |
| Automated tests | Passed | 141 passing, 1 intentionally skipped. |
| Server build | Passed | Express/tRPC server bundles successfully. |
| Web build | Passed | Expo web export completes and includes all customer and staff routes. |
| API health | Passed | `/api/health` responds successfully. |
| Public menu API | Passed | The live categories endpoint returns menu data. |
| Unsigned payment webhook | Passed | Rejected with HTTP 401 as expected. |
| Staff portal access control | Passed | An unauthenticated desktop visitor is redirected to sign-in instead of seeing a staff portal. |
| Restaurant meal photos | Completed | Approved supplied photographs are optimised, uploaded, mapped to the menu, and documented in `MENU_PHOTO_CATALOG.md`. |

## Important Corrections Completed

The following defects were found and corrected during the pre-launch pass.

| Defect | Resolution |
|---|---|
| Conditional React hooks in legacy staff screens | Role checks were moved after hooks so React preserves hook order across all renders. |
| Visitor could see an empty staff-dashboard shell | A central `PortalAccessGate` now blocks unauthenticated or unauthorised visitors before any Admin, Kitchen, or Rider portal renders. |
| Session hydration could race against access control | The app store now tracks `hydrated` and `authChecked` states; redirects wait until saved session and secure session checks finish. |
| Placeholder Paystack public key was embedded in checkout | Checkout now reads only `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY` and disables card checkout when the setting is absent or invalid. |
| Order was created only after Paystack success | A pending order is now created with the Paystack reference before payment begins, allowing the webhook to confirm the payment if the customer closes the app. |
| Payment total could rely on a client amount | The server verifies the Paystack amount against the order total stored in the database. |
| Webhook/client verification could repeat side effects | Payment status changes are now idempotent: only the first successful confirmation can advance the order and award loyalty points. |
| Schema did not include the existing dine-in type | The code schema now matches the database’s `dine_in` order type. |

## Final External Steps Before Public Launch

The following are business-account steps; they cannot be completed safely without the restaurant owner’s credentials and confirmation.

| Step | Owner | Required action | Completion evidence |
|---|---|---|---|
| 1. Configure Paystack live keys | Restaurant owner / finance lead | Add `PAYSTACK_SECRET_KEY` (`sk_live_…`) and `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY` (`pk_live_…`) using secure project settings. Do not place either key in GitHub or chat. | Card option appears at checkout and a live test transaction verifies. |
| 2. Register Paystack webhook | Restaurant owner / finance lead | Add the production URL `https://amalapp-pz8p5xvu.manus.space/api/paystack/webhook` in Paystack’s Webhooks settings. | Paystack dashboard confirms delivery; the test order changes to **Payment confirmed**. |
| 3. Make one controlled live order | Admin + finance lead | Use a small real order, confirm the order appears in Kitchen, Finance, customer timeline, and transaction report. Refund the order if required. | Screenshot or export showing the matching reference, amount, and status. |
| 4. Configure customer communications | Admin | Add the approved Twilio WhatsApp and Resend email credentials if WhatsApp updates and reservation emails are desired at launch. | A staff test receives one WhatsApp order update and one reservation email/calendar attachment. |
| 5. Verify restaurant data | Restaurant manager | Confirm prices, availability, descriptions, addresses, delivery radius, opening hours, contacts, and food photos in the Admin Menu screen. | Manager signs off on the menu and branch information. |
| 6. App store accounts | Business owner | Use the business-owned Google Play Console and Apple Developer accounts for submission. | The app is uploaded to internal testing tracks. |

## How Staff Use the Role-Based System

Every person uses the same sign-in page, but the account’s role decides the destination after sign-in.

| Role | Primary device | Automatic destination | Key permissions |
|---|---|---|---|
| Customer | Mobile app or web | Customer experience | Browse, order, pay, track orders, loyalty. |
| Rider | Mobile app | Rider portal | Set availability, share location, complete assigned deliveries. |
| Kitchen | Desktop or kitchen tablet browser | Kitchen portal | View incoming orders, update preparation stage, control availability, manage inventory. |
| Admin / Manager | Desktop browser | Finance & Operations portal | All customer, kitchen, rider, menu, staff, finance, and report operations. |

Administrators create a rider record from **Staff → Add Rider**, complete the rider’s name, phone, address, branch, vehicle, and plate details, then give the staff member the email used for their first sign-in. The first authenticated sign-in claims the existing rider account rather than replacing it with a customer profile.

## Required Test Script for Staff Acceptance

Use this short script before accepting orders from the public.

1. Sign in with an **admin** account on a desktop browser. Confirm Finance, Orders, Kitchen, Riders, Menu, Staff, and Settings appear in the sidebar.
2. Sign in with a **kitchen** account on a separate browser. Confirm only Kitchen functions are available and create a test order from a customer account.
3. Confirm the kitchen receives the new order and its dish list. Move the order through **Accepted**, **Preparing**, and **Ready**.
4. Sign in as a **rider** on a phone. Go online, accept the assigned delivery, confirm location updates, and mark it delivered.
5. Confirm the customer sees each status on the order timeline and the finance user sees the paid amount and order type in the Finance dashboard.
6. Create a **dine-in** test order and confirm its paid amount appears in the dedicated daily, weekly, and monthly dine-in revenue figures.
7. After live Paystack keys are present, make one small card transaction and confirm the secure webhook marks the matching order paid exactly once.

## Reference Links

Paystack configuration and webhook guidance: [Paystack Documentation](https://paystack.com/docs/).  
Google Play release process: [Google Play Console Help](https://support.google.com/googleplay/android-developer/).  
Apple app submission process: [App Store Connect Help](https://developer.apple.com/help/app-store-connect/).
