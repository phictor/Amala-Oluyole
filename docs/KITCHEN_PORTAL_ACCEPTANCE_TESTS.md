# Oluyole Kitchen Portal — Daily Operations Acceptance Tests

## Purpose

This checklist is for a supervised kitchen trial before the portal is treated as ready for daily service. It concentrates on ticket accuracy, preparation controls, synchronisation, and handover boundaries rather than finance or advanced analytics.

> The kitchen team should perform these checks using labelled test orders or authorised test data. Do not use a real customer’s details without permission.

## What is implemented for this trial

| Operational safeguard | Expected behaviour |
|---|---|
| Complete cook-facing ticket | Every order card shows each saved order item, quantity, custom-meal choices where stored, and visible kitchen instruction. |
| Preparation timing | Cards show received time, preparation start time, calculated target-ready time, and an overdue warning when the target has passed. |
| Safe status actions | The server permits only valid preparation transitions and ignores duplicate requests for the same state. |
| Mistake recovery | A ready ticket can be recalled to Preparing only with a saved reason; the history retains the correction. |
| Live queue health | The header shows Connected, Reconnecting, or Offline plus sound state and the last successful update. Actions pause when the queue is not connected. |
| Oluyole restriction | Standalone Kitchen Portal actions are checked on the server against branch 1, Oluyole Town Planning. |

## Manager-led test session

| ID | Scenario | Steps | Pass criterion | Result / initials |
|---|---|---|---|---|
| K-01 | Customised multi-pack order | Place a test order containing at least two different custom meal packs and a written instruction. Open it on the Kitchen Portal. | Each pack has its own quantity and saved swallow, soup, protein, extras, and instruction where supplied. Nothing is hidden behind a detail screen. | |
| K-02 | Correct preparation flow | Move a paid test order through acceptance, preparation, and ready-for-packing. | The ticket moves only through the valid sequence and the customer receives no duplicate state notification. | |
| K-03 | Duplicate tap | Double-click or tap the same preparation action quickly. | Only one lifecycle history entry and one final status are recorded. | |
| K-04 | Ready-order correction | Mark a test ticket ready, then use **Recall to preparation** and enter a reason. | The ticket returns to Preparing; the saved history identifies the correction and staff member. | |
| K-05 | Overdue visibility | Use a test order whose calculated target-ready time is in the past, or wait beyond the configured target. | The ticket has a clear overdue treatment and still shows the underlying instruction. | |
| K-06 | Two-device synchronisation | Open the same Kitchen Portal session on two authorised staff devices. Change a ticket on one device. | The other device refreshes to the authoritative status without a duplicate card. | |
| K-07 | Connection interruption | Disconnect one test device from the network while the portal is open, then restore service. | The header states Offline or Reconnecting, actions are paused, and the queue automatically reconciles after reconnecting. | |
| K-08 | Ready is not handover | Mark a pickup test order ready. | It is described as **Ready for packing**; it is not treated as collected or delivered by the kitchen action. Pickup-code verification and rider delivery remain separate workflows. | |
| K-09 | Role boundary | Attempt to call a Kitchen Portal edit or order action without a valid staff session, then attempt an unknown order ID with an approved session. | The server denies the unauthenticated request and does not expose an order outside the Oluyole portal. | |

## Trial sign-off

| Role | Name | Date | Result | Notes |
|---|---|---|---|---|
| Kitchen lead |  |  | Pass / needs change |  |
| Branch manager |  |  | Pass / needs change |  |
| Administrator |  |  | Pass / needs change |  |

## Intentionally deferred until the kitchen trial succeeds

The next improvements are **persistent pack-level completion**, a final packing checklist, manager issue reporting, and distinct kitchen-to-packing versus verified customer/rider handover states. Advanced forecasting, multi-station routing, profitability analysis, and a full offline order-processing mode remain outside this daily-use trial.
