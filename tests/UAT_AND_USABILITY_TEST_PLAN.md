# Amala Oluyole Restaurant App — Test Plan
## Usability, User Acceptance, and Backup/Recovery Testing

**Version:** 1.0  
**Prepared for:** Amala Oluyole Restaurant, Oluyole Town Planning Area, Ibadan  
**Date:** July 2026  
**Test Environment:** iOS (Expo Go) + Android (Expo Go) + Web Preview

---

## 1. Usability Testing

Usability tests are conducted with real users who have not seen the app before. Each tester completes tasks independently without assistance. The facilitator observes and records completion time, errors, and confusion points.

### 1.1 Customer Usability Scenarios

| # | Task | Success Criteria | Time Limit |
|---|------|-----------------|-----------|
| U-C1 | Open the app for the first time and find the Amala & Swallows category | Tester taps the correct category within 60 seconds without assistance | 60s |
| U-C2 | Add Amala with Egusi Soup and 2 pieces of assorted meat to the cart | Cart shows correct items and total before checkout | 90s |
| U-C3 | Apply the promo code `WELCOME20` at checkout | Discount is visible on the order summary before payment | 60s |
| U-C4 | Select OPay as the payment method and complete the order | Order confirmation screen appears with an order number | 120s |
| U-C5 | Find and view the status of the most recent order | Order detail screen shows current status and estimated time | 45s |
| U-C6 | Make a table reservation for 4 people on a future date | Reservation confirmation screen appears with booking details | 90s |
| U-C7 | Check loyalty points balance | Loyalty screen shows current points, tier, and next tier progress | 30s |
| U-C8 | Submit a support ticket about a delivery issue | Confirmation message appears after submission | 60s |

**Pass threshold:** 80% of testers complete each task within the time limit without facilitator assistance.

### 1.2 Kitchen Staff Usability Scenarios

| # | Task | Success Criteria | Time Limit |
|---|------|-----------------|-----------|
| U-K1 | Log in with a kitchen staff account and navigate to the Kitchen Portal | Kitchen portal orders tab is visible | 30s |
| U-K2 | Accept an incoming order and advance it to "Preparing" | Order status changes to Preparing in the queue | 30s |
| U-K3 | Mark a meal as sold out | Meal shows as unavailable on the customer menu | 20s |
| U-K4 | Update the stock level for Egusi Soup | Stock level updates in the inventory list | 45s |
| U-K5 | View the monthly sales report for the current month | Report screen shows total orders and revenue | 30s |

### 1.3 Rider Usability Scenarios

| # | Task | Success Criteria | Time Limit |
|---|------|-----------------|-----------|
| U-R1 | Log in with a rider account and go online | Status changes to Online in the rider portal | 20s |
| U-R2 | View an assigned delivery order and see the customer address | Delivery address is visible on the order detail screen | 30s |
| U-R3 | Mark an order as "Out for Delivery" | Order status updates and customer receives notification | 20s |
| U-R4 | Mark an order as "Delivered" | Order moves to completed and loyalty points are awarded | 20s |

---

## 2. User Acceptance Testing (UAT)

UAT is conducted by client representatives (restaurant owner and manager) who execute approved scenarios and sign off the release. Each scenario maps to a business requirement.

### 2.1 Customer Journey — Full Order Flow

**Scenario UAT-01: First-time customer places a delivery order**

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Open app, tap "Sign In" | OAuth login screen appears | |
| 2 | Complete sign-in | Home screen shows promotions and menu categories | |
| 3 | Tap "Amala & Swallows" category | Filtered meal list appears | |
| 4 | Tap "Amala with Egusi Soup" | Meal detail screen with price and description | |
| 5 | Tap "Build Your Meal" | Builder screen with swallow/soup/protein options | |
| 6 | Select Amala, Egusi Soup, 2x Assorted Meat | Selections highlighted, subtotal updates | |
| 7 | Tap "Add to Cart" | Cart badge shows 1 item | |
| 8 | Tap cart icon, proceed to checkout | Checkout screen with order summary | |
| 9 | Enter delivery address | Address field accepts input | |
| 10 | Select OPay as payment method | OPay option highlighted | |
| 11 | Tap "Pay with OPay" | Payment confirmation or redirect | |
| 12 | Order confirmed | Order number displayed, notification received | |
| 13 | Navigate to Orders tab | New order appears with "Payment Confirmed" status | |

**Sign-off:** _________________________ Date: _____________

---

**Scenario UAT-02: Kitchen staff processes an order end-to-end**

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Log in with kitchen staff account | Kitchen Portal accessible | |
| 2 | New order appears in queue | Order shows customer name, items, and total | |
| 3 | Tap "Accept" on the order | Status changes to "Accepted", customer notified | |
| 4 | Tap "Start Preparing" | Status changes to "Preparing" | |
| 5 | Tap "Mark Ready" | Status changes to "Ready for Pickup/Delivery" | |
| 6 | Admin assigns rider from admin dashboard | Status changes to "Rider Assigned" | |
| 7 | Rider marks "Out for Delivery" | Customer sees live map with rider location | |
| 8 | Rider marks "Delivered" | Order completes, loyalty points awarded to customer | |

**Sign-off:** _________________________ Date: _____________

---

**Scenario UAT-03: Admin views financial report**

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Log in with admin account | Admin Dashboard accessible | |
| 2 | Navigate to Reports tab | Transaction report visible | |
| 3 | Filter by current month | Report shows orders and revenue for the month | |
| 4 | Check payment method breakdown | Card, OPay, Transfer, Cash totals visible | |
| 5 | Navigate to Kitchen → Monthly Report | Top 10 meals by volume visible | |
| 6 | Export/screenshot report | Data is accurate and readable | |

**Sign-off:** _________________________ Date: _____________

---

**Scenario UAT-04: Rider completes a delivery with live tracking**

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Log in with rider account | Rider Portal accessible | |
| 2 | Tap "Go Online" | Status changes to Online | |
| 3 | Assigned order appears | Order shows delivery address and customer phone | |
| 4 | Tap "Accept Delivery" | Order accepted, customer notified | |
| 5 | Tap "Out for Delivery" | Customer order detail shows live map | |
| 6 | Move to delivery location | Map marker updates in real time | |
| 7 | Tap "Mark Delivered" | Order completes, rider earnings recorded | |

**Sign-off:** _________________________ Date: _____________

---

**Scenario UAT-05: Catering enquiry submitted and received by admin**

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Customer navigates to Catering screen | Catering request form visible | |
| 2 | Fill in event details (type, date, guest count, venue) | All fields accept input | |
| 3 | Submit the form | Success message appears | |
| 4 | Admin logs in and checks catering requests | New request visible in admin dashboard | |
| 5 | Admin contacts customer | Customer receives follow-up | |

**Sign-off:** _________________________ Date: _____________

---

## 3. Backup and Recovery Testing

### 3.1 Database Backup Procedure

The production database is hosted on a managed PostgreSQL instance. The following backup and recovery tests must be performed before go-live.

**Test BR-01: Verify automated daily backup exists**

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Log in to the database hosting console | Dashboard accessible |
| 2 | Navigate to Backups section | At least one backup from the last 24 hours is listed |
| 3 | Confirm backup size is non-zero | Backup file size > 0 bytes |
| 4 | Record backup timestamp | Timestamp is within the last 24 hours |

---

**Test BR-02: Point-in-time restore to a known state**

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Record current order count in production DB | Note: `SELECT COUNT(*) FROM orders` |
| 2 | Initiate restore to a backup from 1 hour ago | Restore process starts without error |
| 3 | Wait for restore to complete | Restore completes within 15 minutes |
| 4 | Verify order count matches the backup timestamp | Count matches expected value |
| 5 | Verify meal categories and inventory are intact | All 9 categories and inventory items present |
| 6 | Verify the Oluyole branch record is present | Branch record with correct address exists |

---

**Test BR-03: Application recovery after DB connection loss**

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Temporarily block DB connection from the app server | DB becomes unreachable |
| 2 | Open the app and browse the menu | App shows a graceful error or cached data |
| 3 | Attempt to place an order | App shows "Service temporarily unavailable" — does not crash |
| 4 | Restore DB connection | App automatically reconnects within 30 seconds |
| 5 | Place an order successfully | Order is created and confirmed |

---

**Test BR-04: Data integrity after restore**

After any restore, verify the following invariants hold:

```sql
-- All orders have at least one order item
SELECT COUNT(*) FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE oi.id IS NULL AND o.status != 'created';
-- Expected: 0

-- All loyalty accounts have non-negative points
SELECT COUNT(*) FROM loyalty_accounts WHERE points < 0;
-- Expected: 0

-- All active meals belong to an existing category
SELECT COUNT(*) FROM meals m
LEFT JOIN meal_categories mc ON mc.id = m.category_id
WHERE mc.id IS NULL AND m.is_available = true;
-- Expected: 0

-- All inventory items have non-negative stock
SELECT COUNT(*) FROM inventory WHERE current_stock < 0;
-- Expected: 0
```

---

## 4. Release Sign-Off Checklist

Before production release, the following must be confirmed:

| Item | Confirmed By | Date |
|------|-------------|------|
| All UAT scenarios passed | Restaurant Owner | |
| All automated tests pass (0 failures) | Development Team | |
| Branch address verified in DB | Restaurant Manager | |
| Admin account role set to `admin` in DB | Development Team | |
| Kitchen staff accounts set to `kitchen` role | Restaurant Manager | |
| Rider accounts set to `rider` role | Restaurant Manager | |
| Paystack live key configured | Development Team | |
| OPay merchant details configured | Development Team | |
| Bank transfer account number verified | Restaurant Owner | |
| Push notification delivery tested on iOS | Development Team | |
| Push notification delivery tested on Android | Development Team | |
| App published to Expo (APK generated) | Development Team | |

---

*This document should be retained as part of the project's quality assurance record.*
