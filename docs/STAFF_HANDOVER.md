# Amala Oluyole — Staff Handover Guide

> **Version:** 1.0 · **Date:** August 2026
> This document is for internal use by restaurant management, kitchen staff, and delivery riders. Keep it confidential.

---

## Table of Contents

1. [How the App Works](#1-how-the-app-works)
2. [Logging In — All Roles](#2-logging-in--all-roles)
3. [Admin / Manager Guide](#3-admin--manager-guide)
   - 3.1 [Finance Dashboard](#31-finance-dashboard)
   - 3.2 [Orders Tab](#32-orders-tab)
   - 3.3 [Kitchen View](#33-kitchen-view)
   - 3.4 [Riders Tab](#34-riders-tab)
   - 3.5 [Menu Management](#35-menu-management)
   - 3.6 [Staff Management & Adding Riders](#36-staff-management--adding-riders)
   - 3.7 [Settings & Promo Codes](#37-settings--promo-codes)
   - 3.8 [How Admin Switches Between Portals](#38-how-admin-switches-between-portals)
4. [Kitchen Staff Guide](#4-kitchen-staff-guide)
5. [Rider Guide](#5-rider-guide)
6. [Customer App Overview](#6-customer-app-overview)
7. [Common Issues & Solutions](#7-common-issues--solutions)
8. [Contact & Escalation](#8-contact--escalation)

---

## 1. How the App Works

The Amala Oluyole app is a single application used by everyone — customers, kitchen staff, riders, and management. There is **one login screen** for all users. The app reads the role assigned to each account and automatically redirects the person to the correct portal. Customers never see any staff screens, and staff never see the customer ordering flow unless an admin deliberately previews it.

| Role | What they see after login |
|---|---|
| **Customer** | Home, Menu, Cart, Orders, Profile |
| **Admin / Manager** | Finance & Operations portal (full access) |
| **Kitchen** | Kitchen portal — order queue, inventory, reports |
| **Rider** | Rider portal — deliveries, map, status |

The live web version is accessible at **https://amalapp-pz8p5xvu.manus.space** from any browser. Staff can use it on a tablet or desktop without downloading anything.

---

## 2. Logging In — All Roles

1. Open the app (or visit the web address above).
2. Tap **Sign in with Google** or **Sign in with Apple**.
3. Use the email address that was registered for your account.
4. The app redirects you to your portal automatically — no manual navigation needed.

> **Important:** If you land on the customer home screen instead of your staff portal, your account has not been assigned the correct role yet. Ask your admin to set your role in the Staff tab.

---

## 3. Admin / Manager Guide

### 3.1 Finance Dashboard

The Finance tab is the first screen you see after logging in as admin. It shows:

- **Revenue KPI tiles** — total revenue, today's revenue, average order value, and total orders for the selected period.
- **Dine-In Revenue section** — three tiles showing dine-in revenue for today, this week, and this month, each with an order count. Below the tiles, a 7-day stacked bar chart breaks each day's revenue into three colour-coded segments: red (delivery), amber (pickup), and purple (dine-in). This updates every 60 seconds.
- **Payment method breakdown** — how much came in via card, bank transfer, cash, and loyalty points.
- **Recent transactions** — the last 10 paid orders with order number, amount, and type.

To view a full transaction report with date filters and CSV export, tap **Full Report** at the bottom of the Finance tab.

### 3.2 Orders Tab

The Orders tab shows all active orders across every status. Each card displays the order number, customer name, order type (delivery / pickup / dine-in), total amount, and the full list of dishes ordered. You can update any order's status directly from this screen by tapping the action buttons on each card. The screen refreshes every 10 seconds.

### 3.3 Kitchen View

The Kitchen tab gives the admin the same view that kitchen staff see — orders grouped into **New**, **In Progress**, and **Ready** columns. Each card shows the dish list with quantities and any special instructions. A sound alert and vibration fire when a new order arrives. The admin can mute the alert using the 🔔 button in the top-right corner.

### 3.4 Riders Tab

The Riders tab shows every registered rider with a green (online) or grey (offline) status dot. For orders that are **Ready** and waiting for a rider, an **Assign Rider** button appears. Tap it, select an available rider from the list, and the rider receives the delivery notification immediately.

### 3.5 Menu Management

The Menu tab lists every meal in the database. From here you can:

- **Enable or disable** a meal (toggle availability without deleting it).
- **Edit** the name, price, description, and labels.
- **Upload a photo** — tap the camera icon on any meal card to pick a photo from your device. The image uploads to the CDN and updates across the app within seconds.
- **Add a new meal** — tap **+ Add Meal** at the top right.

### 3.6 Staff Management & Adding Riders

The Staff tab has two sub-tabs: **Staff** and **Customers**.

**To change a staff member's role:** tap the coloured role badge on their card. A menu appears listing all available roles (customer, admin, manager, kitchen, rider). Select the new role and confirm. The change takes effect on the person's next login.

**To register a new rider from scratch:**

1. Tap the green **+ Add Rider** button (top right of the Staff tab).
2. Fill in the form:
   - **Full Name** — the rider's legal name.
   - **Phone Number** — their primary contact number (used as their login identifier).
   - **Email Address** — optional, used for account recovery.
   - **Home Address** — their residential address for reference.
   - **Branch** — the branch they are assigned to.
   - **Vehicle Type** — motorcycle, bicycle, or car.
   - **Plate Number** — optional but recommended.
3. Tap **Register Rider**.

The system creates a new user account and rider profile in one step. The rider can log in immediately using the phone number provided.

### 3.7 Settings & Promo Codes

The Settings tab contains promo code management. You can create, edit, enable, disable, and delete promo codes. Each code supports four types: percentage discount, fixed amount off, free delivery, or buy-one-get-one. Set usage limits, per-user limits, and expiry dates as needed.

### 3.8 How Admin Switches Between Portals

This is the key question. Here is the exact flow:

**Step 1 — Open the Admin Menu**
After logging in, you land on the Finance dashboard. In the bottom-right corner of every admin screen, there is a dark blue circular button with three horizontal lines (☰). Tap it.

**Step 2 — The slide-up menu appears**
A panel slides up from the bottom of the screen listing all seven sections:
- 💳 Finance
- 📋 Orders
- 🍽️ Kitchen
- 🛵 Riders
- 🛍️ Menu
- 👥 Staff
- ⚙️ Settings

Order count badges appear on Orders and Kitchen when there are pending items. Tap any section to navigate there instantly. Tap ✕ or tap outside the panel to close it without navigating.

**Step 3 — Preview the Customer App**
To see exactly what a customer sees, go to **Settings** → scroll to the bottom → tap **Preview Customer App**. You are taken to the customer home screen. A floating **⚙️ Admin** pill appears at the bottom right. Tap it at any time to return to the admin portal or switch to the Kitchen or Rider portal.

**Step 4 — Switch to Kitchen or Rider view**
From the ⚙️ Admin pill, a sheet appears with four options:
- Finance & Operations (admin portal)
- Kitchen Portal
- Rider Portal
- Customer View

Select any option to switch instantly. No sign-out required.

---

## 4. Kitchen Staff Guide

### Logging In

Open the app and sign in with your registered email. You will land directly on the Kitchen portal. If you see the customer home screen, ask your admin to assign the **kitchen** role to your account.

### The Order Queue

The main screen shows three columns: **New**, **In Progress**, and **Ready**. Each card shows:
- Order number and time received.
- Order type (delivery, pickup, or dine-in).
- Full dish list with quantities and any special instructions from the customer.

**To accept a new order:** tap **Accept** on the card. It moves to In Progress.
**To mark as ready:** tap **Mark Ready** when the food is plated and waiting for collection or rider pickup.

### Sound and Vibration Alerts

When a new order arrives, the app plays a voice chime ("New order!") and vibrates. This works even when the iOS silent switch is on. To mute the sound (vibration continues), tap the 🔔 button in the top-right corner. Tap 🔇 to unmute. Your preference is saved between sessions.

### Inventory

The Inventory tab shows current stock levels for all tracked ingredients. Items below their minimum threshold appear with a red **Low Stock** badge. Tap any item to record usage or update the stock count.

### Monthly Report

The Report tab shows a monthly summary: total orders, revenue, top-selling meals, and order type breakdown. Use the month picker at the top to view previous months.

---

## 5. Rider Guide

### Logging In

Open the app and sign in. You will land on the Rider portal. If you see the customer home screen, contact your manager to assign the **rider** role to your account.

### Going Online

On the Deliveries tab, tap the **Go Online** toggle at the top of the screen. You will only receive delivery assignments when you are online. Tap it again to go offline at the end of your shift.

### Receiving a Delivery

When the admin assigns an order to you, the app plays a chime and vibrates. The order appears at the top of your Deliveries list with the customer's address and the order details. Tap **Accept** to confirm you are picking it up.

### Updating Delivery Status

- Tap **Out for Delivery** when you have collected the food from the branch and are on your way.
- Tap **Delivered** when you have handed the food to the customer.

The customer receives a push notification at each step.

### The Map Tab

The Map tab shows your current location and the delivery address on an interactive map. The route is drawn automatically when you have an active delivery.

---

## 6. Customer App Overview

Customers download the same app and log in with Google or Apple. They see the customer portal only — the staff portals are completely invisible to them. The customer flow is:

1. **Browse** the menu by category or search.
2. **Build Your Swallow** — a step-by-step builder for custom meals (swallow + soup + protein + extras).
3. **Add to cart** and proceed to checkout.
4. **Choose delivery or pickup**, enter an address, and pay via card, bank transfer, or cash on delivery.
5. **Track the order** — a live status timeline shows every step from Placed to Delivered.
6. **Earn loyalty points** on every paid order, redeemable on future orders.

---

## 7. Common Issues & Solutions

| Issue | Likely Cause | Fix |
|---|---|---|
| Logged in but landed on customer home screen | Role not assigned | Admin: go to Staff tab → find the user → tap their role badge → select the correct role |
| "Checking access…" spinner that never loads | Slow network on first login | Wait 10 seconds; if it persists, close and reopen the app |
| Sound alert not playing | iOS silent switch is on | The app overrides silent mode — if still silent, check that notification permissions are granted in iOS Settings → Amala Oluyole |
| Order not showing in kitchen queue | Order placed but not yet confirmed | Only orders with `payment_confirmed` status appear in the queue. Check the Orders tab for `awaiting_payment` orders |
| Rider not receiving assignments | Rider is offline | Rider must tap **Go Online** on their Deliveries tab before assignments are sent |
| Photo upload fails | File too large or no internet | Use a photo under 5 MB; check internet connection |
| Promo code not working for customer | Code expired or usage limit reached | Admin: check Settings → Promo Codes → verify the code is active and has remaining uses |

---

## 8. Contact & Escalation

For technical issues with the app, contact the development team via the GitHub repository: **https://github.com/phictor/Amala-Oluyole**

For urgent operational issues during service, the admin account has full override capability on all orders, meals, and rider assignments from the Finance & Operations portal.

---

*This document should be reviewed and updated whenever significant changes are made to the app.*
