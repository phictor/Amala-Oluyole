# Restoration audit: `babc8af` to `main`

Audit date: 2026-08-06

The requested comparison used `babc8af48e33bb0c83f3a5f672cc90184e317d46` as the known-good reference and `02f55b4` as the latest `main` baseline. The direct successor `d87f4fb` is a generic “Checkpoint” that removes approximately 4,973 lines across 57 files, including complete admin, kitchen, and rider portal surfaces, role/responsive hooks, rider maps, notification infrastructure, documentation, and seed/configuration material.

The deletion pattern conflicts with evidence in both adjacent history and current main:

- `babc8af` explicitly records rider registration, admin menu work, reservation messaging, and related production improvements.
- The later `docs/STAFF_HANDOVER.md` and `docs/ADMIN_PORTAL_SWITCHING.md` on main describe admin, kitchen, rider, notification, and portal-switching capabilities whose implementation had disappeared.
- The deletions are broad zero-add removals rather than targeted replacements, while `d87f4fb` simultaneously adds dine-in reporting that depends on the surrounding administration surface.

Based on that evidence, this branch selectively restores the portal route groups, staff/rider/admin UI and hooks, rider map and sound assets, push/WhatsApp/email notification support, relevant profile/order/reservation routes, dependencies, seed script, README, and supporting configuration from `babc8af`.

The branch does not revert `main` wholesale. It retains later Paystack webhook/handover work, the dine-in reporting additions, and unrelated current customer-facing changes. Where restored code touched security-sensitive boundaries, it was refactored to use live server roles, server-authoritative order/payment state, order-scoped rider tracking, and the new integrity/session controls rather than copied unchanged.
