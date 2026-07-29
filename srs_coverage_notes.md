# SRS Coverage Notes — Àmàlà Olúyòlé App
Source: Amala_Oluyole_SRS_Bytechain_Technologies_With_Contact.pdf (70 pages, 28 July 2026)

## Phase 1 Must-Have Requirements Status

| FR ID | Requirement | Status |
|-------|-------------|--------|
| FR-001 | Guest browsing without account | ✅ Done |
| FR-002 | Registration (phone/email) | ✅ Done |
| FR-003 | Login/logout/recovery | ✅ Done |
| FR-004 | Guest checkout | ✅ Done |
| FR-005 | Multiple saved addresses | ✅ Done |
| FR-006 | Role-based permissions | ⚠️ Partial (admin/manager/kitchen roles exist, not fully enforced in UI) |
| FR-007 | Audit log | ❌ Not built |
| FR-010 | Branch selection | ✅ Done |
| FR-011 | Branch hours/service modes | ⚠️ Partial (DB has it, UI not wired) |
| FR-012 | Menu with categories/photos/prices | ✅ Done |
| FR-013 | Branch-specific prices | ⚠️ Partial (DB supports, UI uses global price) |
| FR-014 | Staff add/edit/activate/suspend meals | ✅ Done (new add-meal screen built) |
| FR-015 | Search, filters, labels | ✅ Done |
| FR-016 | Block checkout of unavailable items | ⚠️ Partial (UI shows unavailable, checkout not blocked) |
| FR-020-023 | Build Your Traditional Meal | ✅ Done |
| FR-024 | Save/repeat meal combination | ❌ Not built |
| FR-030-035 | Cart and checkout | ✅ Done |
| FR-040 | Payment initiation (Paystack) | ✅ Done |
| FR-041 | Backend payment verification | ⚠️ Partial (frontend verifies, backend endpoint exists but not called post-payment) |
| FR-042 | Prevent duplicate payment records | ⚠️ Partial (reference tracked, dedup not enforced) |
| FR-043 | Digital receipt | ⚠️ Partial (order confirmation shown, no formal receipt screen) |
| FR-044 | Payment retry | ⚠️ Partial (user can re-checkout) |
| FR-045 | Refund recording | ❌ Not built |
| FR-046 | Finance payment reconciliation reports | ✅ Done (transactionReport endpoint added) |
| FR-050-056 | Order management / kitchen ops | ✅ Done (admin dashboard) |
| FR-060-066 | Delivery/pickup | ⚠️ Partial (delivery fee calculated, zone validation not enforced, pickup code not generated) |
| FR-070-071 | Promotions (admin CRUD) | ⚠️ Partial (promo codes in DB, no admin UI to create/edit) |
| FR-072-073 | Loyalty (Future) | ✅ UI built, marked Future in SRS |
| FR-080-084 | Reservations/Catering (Future/Should) | ✅ UI built |
| FR-090-094 | Reviews/Support/Notifications | ✅ Done |
| FR-100-103 | Reporting/Admin dashboard | ✅ Done (transactionReport added) |

## Transaction Monitoring Web Dashboard
- User requested a web-accessible dashboard for monitoring transactions
- Implementation: Admin dashboard at /admin/index.tsx has Overview + Orders + Meals + Riders tabs
- NEW: transactionReport tRPC endpoint added to admin router
- TODO: Add "Reports" tab to admin dashboard showing transaction table with filters + CSV export

## Key SRS Phased Plan
- Phase 1 (Lean MVP): ₦4,500,000 — ordering, payment, admin, kitchen, rider, basic reports
- Phase 2: Loyalty, QR dine-in, reservations, catering quotation, iOS
- Phase 3: Corporate accounts, subscriptions, advanced analytics

## Bytechain Technologies Contact
- Tel: +44 7346 278162
- Web: https://Bytechain.co.uk
