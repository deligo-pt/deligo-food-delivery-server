# Order Flow — API Integration Guide

Base URL: `{{API_BASE}}/api/v1/orders`

This guide documents the **full order lifecycle** — both **Home Delivery** and
**Self-Pickup / Takeaway** — end to end: who calls what, in what order, with what
preconditions, and what changes on the backend at each step.

Audiences covered in one place:
- **[Customer App / Web](#customer-app--web)** — placing, tracking, canceling, reordering.
- **[Vendor App / Dashboard](#vendor-app--dashboard)** — accepting, preparing, dispatching, verifying pickup.
- **[Delivery Partner App](#delivery-partner-app)** — claiming, picking up, delivering (delivery orders only).

---

## Shared basics

**Auth** — every endpoint below requires a logged-in user:
```
Authorization: Bearer <accessToken>
```
(or the `accessToken` cookie set at login — either works)

**Language** — send `Accept-Language: en` or `Accept-Language: pt` to localize
response messages and localized text (item names, addon names). Defaults to `en`.

**Response envelope** — every endpoint returns:
```jsonc
{
  "success": true,
  "statusCode": 200,
  "message": "...",   // localized
  "data": { /* ... */ }
}
```

---

## Fulfillment types

Every order has a `fulfillmentType`, set at creation and fixed for the order's lifetime:

| Type | Meaning | Delivery partner involved? | Address required |
|---|---|---|---|
| `DELIVERY` | Rider brings the order to the customer | Yes — dispatch/claim flow | `deliveryAddress` |
| `PICKUP` | Customer collects in person from the vendor | No | none (uses vendor's `pickupAddress`, set on ACCEPTED) |

`fulfillmentType` is chosen **at checkout**, not at order creation — see
[`POST /checkout`](#1-start-checkout) below. It flows: `POST /checkout` body →
persisted on `CheckoutSummary` → copied onto the `Order` document by
`POST /orders/create-order`. Once a `CheckoutSummary` is created, its
`fulfillmentType` is fixed; you can't flip it mid-checkout.

## Order status reference

| Status | Flow | Meaning |
|---|---|---|
| `PENDING` | both | Order placed & paid, awaiting vendor decision |
| `ACCEPTED` | both | Vendor accepted; stock deducted; `pickupAddress` snapshot set |
| `REJECTED` | both | Vendor rejected before accepting (refund owed) |
| `PREPARING` | both | Kitchen is preparing the order |
| `AWAITING_PARTNER` | delivery | Accepted, no rider found nearby yet |
| `DISPATCHING` | delivery | Broadcast to nearby riders, awaiting claim |
| `ASSIGNED` | delivery | A rider claimed the order |
| `REASSIGNMENT_NEEDED` | delivery | Assigned rider backed out, needs re-dispatch |
| `READY_FOR_PICKUP` | both | Food ready — rider pickup point (delivery) **or** customer counter pickup (pickup) |
| `PICKED_UP` | delivery | Rider picked up from vendor |
| `ON_THE_WAY` | delivery | Rider en route to customer |
| `DELIVERED` | delivery | Rider delivered, proof image attached (terminal) |
| `PICKED_UP_BY_CUSTOMER` | pickup | Customer verified at counter and took the order (terminal) |
| `NO_SHOW` | pickup | Customer never collected within the pickup window (terminal, refund owed) |
| `CANCELED` | both | Canceled by customer/vendor/admin |

---

## Full lifecycle — Home Delivery

```
PENDING → ACCEPTED → AWAITING_PARTNER/DISPATCHING → ASSIGNED → PREPARING
        → READY_FOR_PICKUP → PICKED_UP → ON_THE_WAY → DELIVERED
```

| # | Actor | Action | Endpoint | Effect |
|---|---|---|---|---|
| 1 | Customer | Checkout → pay | `POST /orders/create-order` | Order created, `orderStatus: PENDING`, stock **not yet** deducted |
| 2 | Vendor | Accept | `PATCH /:orderId/status` `{type:"ACCEPTED"}` | Stock deducted, `pickupAddress` snapshot set from vendor's business location, customer notified |
| 3 | Vendor | Broadcast to riders | `PATCH /:orderId/broadcast-order` | Geo-search in tiers (3km → 4km → 5km); order → `DISPATCHING`, 120s claim window opens; if no rider found → `AWAITING_PARTNER` |
| 4 | Rider | Claim | `PATCH /:orderId/accept-dispatch-order` `{action:"ACCEPT"}` | First rider to claim wins the race; order → `ASSIGNED`, `deliveryPartnerId` set; other riders' popups are cleared via socket |
| 4b | Rider | Decline | `PATCH /:orderId/accept-dispatch-order` `{action:"REJECT"}` | Removed from `dispatchPartnerPool`; if last rider in pool, order falls back to `AWAITING_PARTNER` |
| 5 | Vendor | Start preparing | `PATCH /:orderId/status` `{type:"PREPARING"}` | Requires `ASSIGNED` first |
| 6 | Vendor | Mark ready | `PATCH /:orderId/status` `{type:"READY_FOR_PICKUP"}` | Requires `PREPARING` first; rider notified |
| 7 | Rider | Picked up from vendor | `PATCH /:orderId/update-order-status` `{orderStatus:"PICKED_UP"}` | Requires order currently `READY_FOR_PICKUP` |
| 8 | Rider | En route | `PATCH /:orderId/update-order-status` `{orderStatus:"ON_THE_WAY"}` | Requires `PICKED_UP` |
| 9 | Rider | Delivered | `PATCH /:orderId/update-order-status` `{orderStatus:"DELIVERED", deliveryProofImage}` | Requires `ON_THE_WAY`; **proof image mandatory**; terminal |
| — | Rider | Can't complete | `PATCH /:orderId/update-order-status` `{orderStatus:"REASSIGNMENT_NEEDED", reason}` | Frees the rider, order → `ASSIGNED`→ needs a fresh broadcast; requires `reason` |

**Cancellation (delivery):**
- Customer: `PATCH /:orderId/cancel` `{reason}` — allowed any time before `DELIVERED`/`CANCELED`/`REJECTED`; refunded only if still `PENDING` (vendor hadn't accepted).
- Vendor: `PATCH /:orderId/status` `{type:"CANCELED", reason}` — blocked once `ASSIGNED` or later (`ASSIGNED`, `PREPARING`, `READY_FOR_PICKUP`, `PICKED_UP`, `ON_THE_WAY`, `DELIVERED`) — a rider already assigned means the vendor must use vendor-support channels, not this endpoint.

---

## Full lifecycle — Self-Pickup / Takeaway

```
PENDING → ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP_BY_CUSTOMER
                                                    ↘ NO_SHOW (if uncollected)
```

No delivery partner is ever involved — `deliveryPartnerId` stays `null` for the
order's entire life, and dispatch/broadcast endpoints reject pickup orders outright.

| # | Actor | Action | Endpoint | Effect |
|---|---|---|---|---|
| 1 | Customer | Checkout → pay (pickup) | `POST /orders/create-order` | Order created with `fulfillmentType: PICKUP`; a random 6-digit **pickup code** is generated server-side and hashed (SHA-256) for storage — **the raw code is returned exactly once, in this response, and never again.** The client app must persist/display it (e.g. store in local state, show a QR/code screen) |
| 2 | Vendor | Accept | `PATCH /:orderId/status` `{type:"ACCEPTED"}` | Stock deducted, `pickupAddress` snapshot set (vendor's own storefront — this is where the customer collects from) |
| 3 | Vendor | Start preparing | `PATCH /:orderId/status` `{type:"PREPARING"}` | Requires `ACCEPTED` directly — **no `ASSIGNED` gate**, unlike delivery orders |
| 4 | Vendor | Mark ready | `PATCH /:orderId/status` `{type:"READY_FOR_PICKUP"}` | Requires `PREPARING`; stamps `pickup.readyAt`; customer notified to come collect |
| 5 | Customer | Shows up at counter | (no API call — shows code/QR in person) | — |
| 6 | Vendor | Verify code at counter | `PATCH /:orderId/verify-pickup` `{code}` | Compares SHA-256(`code`) against stored `pickup.codeHash`; on match → order → `PICKED_UP_BY_CUSTOMER` (terminal), stamps `pickup.verifiedAt` / `pickup.verifiedBy`; on mismatch → `401 INVALID_PICKUP_CODE` |
| — | Vendor | Customer never came | `PATCH /:orderId/status` `{type:"NO_SHOW", reason?}` | Only valid from `READY_FOR_PICKUP`; restores stock, sets `refundStatus: PENDING`, terminal |

**Cancellation (pickup):**
- Customer: `PATCH /:orderId/cancel` — same rule as delivery (refund only if still `PENDING`); blocked once `PICKED_UP_BY_CUSTOMER` or `NO_SHOW`.
- Vendor: `PATCH /:orderId/status` `{type:"CANCELED", reason}` — blocked once `READY_FOR_PICKUP` or later; use `NO_SHOW` instead once the order has reached the counter stage.

---

## Endpoints reference

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `{{API_BASE}}/api/v1/checkout` | CUSTOMER | Build a `CheckoutSummary` — this is where `fulfillmentType` is chosen |
| GET | `{{API_BASE}}/api/v1/checkout/summary/:checkoutSummaryId` | CUSTOMER | Re-fetch a pending checkout summary |
| POST | `/create-order` | CUSTOMER | Finalize checkout after payment verification (both flows) |
| POST | `/reorder/:orderId` | CUSTOMER | Re-add a past order's items to cart |
| PATCH | `/:orderId/cancel` | CUSTOMER | Cancel own order |
| PATCH | `/:orderId/status` | VENDOR, SUB_VENDOR | Accept / Reject / Preparing / Ready-for-pickup / Cancel / No-show |
| PATCH | `/:orderId/verify-pickup` | VENDOR, SUB_VENDOR | Verify customer's pickup code at the counter (pickup orders only) |
| PATCH | `/:orderId/broadcast-order` | VENDOR, SUB_VENDOR | Broadcast to nearby riders (delivery orders only) |
| PATCH | `/:orderId/accept-dispatch-order` | DELIVERY_PARTNER | Claim or decline a broadcast order |
| PATCH | `/:orderId/update-order-status` | DELIVERY_PARTNER | Picked-up / On-the-way / Delivered / Reassignment-needed |
| GET | `/` | ADMIN, SUPER_ADMIN, VENDOR, SUB_VENDOR, DELIVERY_PARTNER, FLEET_MANAGER, CUSTOMER | List orders — auto-scoped to the caller's own orders by role |
| GET | `/:orderId` | CUSTOMER, VENDOR, ADMIN, SUPER_ADMIN, DELIVERY_PARTNER | Get one order — role-scoped |
| GET | `/:orderId/download-invoice-pdf` | CUSTOMER, VENDOR, SUB_VENDOR, ADMIN, SUPER_ADMIN | Download invoice PDF |
| GET | `/delivery-partner/dispatch-order` | DELIVERY_PARTNER | Orders currently broadcast to this rider |
| GET | `/delivery-partner/current-order` | DELIVERY_PARTNER | This rider's active (in-progress) order |

---

## Customer App / Web

### 1. Start checkout
`POST {{API_BASE}}/api/v1/checkout`
```jsonc
{
  "fulfillmentType": "PICKUP",   // or "DELIVERY" — optional, defaults to "DELIVERY"
  "useCart": true
  // or: "useCart": false, "items": [{ "productId": "...", "quantity": 2 }]
}
```
- `DELIVERY` requires the customer to already have an `isActive: true` address in
  `deliveryAddresses` on their profile — otherwise `400 DELIVERY_ADDRESS_INCOMPLETE`.
- `PICKUP` skips address lookup and the Google-distance call entirely; `delivery.charge`,
  `fleet.fee`, and `rider.riderNetEarnings` all compute to `0`.
- Response `data._id` is the `checkoutSummaryId` used in the next step.

### 2. Place an order
`POST /create-order`
```jsonc
{
  "checkoutSummaryId": "665f...",   // from POST /checkout
  "paymentToken": "tok_...",         // redUniq hosted-page token
  "deliveryNotes": "Ring the bell"   // optional
}
```
Response `data` is the created order. **If `fulfillmentType` is `PICKUP`**, `data.pickup.code`
is present in this response only — show it immediately (large text + QR) and persist it
locally; it will not be retrievable from `GET /:orderId` afterward (only a hash is stored).

### 3. Track status
`GET /:orderId` — poll or, preferably, subscribe to the order's socket room for
live `orderStatus` push updates (`emitOrderStatusUpdate`, existing socket layer —
unchanged by this feature).

### 4. Cancel
`PATCH /:orderId/cancel`
```jsonc
{ "reason": "Changed my mind" }
```
Refunded automatically only if the vendor hasn't accepted yet (`orderStatus: PENDING`).

### 5. Reorder
`POST /reorder/:orderId` — pushes the original items back into the cart (does not
re-create an order or re-charge).

---

## Vendor App / Dashboard

### 1. Respond to a new order
`PATCH /:orderId/status`
```jsonc
{ "type": "ACCEPTED" }        // or "REJECTED", with { "reason": "..." }
```

### 2. Move it through prep
```jsonc
{ "type": "PREPARING" }
{ "type": "READY_FOR_PICKUP" }
```
- Delivery orders: `PREPARING` requires the order already be `ASSIGNED` to a rider.
- Pickup orders: `PREPARING` requires only `ACCEPTED` — no rider step exists.

### 3a. Delivery orders only — get a rider
`PATCH /:orderId/broadcast-order` (no body) — call this once, right after `ACCEPTED`
(or after `REASSIGNMENT_NEEDED`). Requires the vendor's live location
(`currentSessionLocation`) to be set.

### 3b. Pickup orders only — verify at the counter
`PATCH /:orderId/verify-pickup`
```jsonc
{ "code": "482913" }
```
Ask the customer for their 6-digit code (or scan their QR), submit it here once
the order is `READY_FOR_PICKUP`. Success → order is now `PICKED_UP_BY_CUSTOMER`.
A wrong code returns `401 INVALID_PICKUP_CODE` — let the vendor retry, no lockout
is currently enforced.

If the customer never shows up:
```jsonc
PATCH /:orderId/status
{ "type": "NO_SHOW", "reason": "Not collected after 24h" }
```

---

## Delivery Partner App

*(delivery orders only — pickup orders never appear in these endpoints)*

### 1. See available orders
`GET /delivery-partner/dispatch-order` — orders currently broadcast that include
this rider in `dispatchPartnerPool`.

### 2. Claim or pass
`PATCH /:orderId/accept-dispatch-order`
```jsonc
{ "action": "ACCEPT" }   // or "REJECT"
```
First to `ACCEPT` wins; a stale claim (window expired) returns
`409 ORDER_ALREADY_CLAIMED_OR_EXPIRED`.

### 3. Progress the delivery
```jsonc
PATCH /:orderId/update-order-status
{ "orderStatus": "PICKED_UP" }

{ "orderStatus": "ON_THE_WAY" }

{ "orderStatus": "DELIVERED", "deliveryProofImage": "https://..." }
```
Each transition requires the order to currently be in the exact preceding status
(`READY_FOR_PICKUP` → `PICKED_UP` → `ON_THE_WAY` → `DELIVERED`); out-of-order calls
return `400 ORDER_MUST_BE_IN_TO_TRANSITION`.

### 4. Can't finish the delivery
```jsonc
{ "orderStatus": "REASSIGNMENT_NEEDED", "reason": "Vehicle broke down" }
```
Frees the rider immediately; vendor must re-broadcast.

---

## Error / message key reference (pickup-specific)

| Key | HTTP | When |
|---|---|---|
| `NOT_APPLICABLE_TO_PICKUP_ORDER` | 400 | Broadcasting/verifying against the wrong fulfillment type |
| `ORDER_MUST_BE_ACCEPTED_BEFORE_PREPARING` | 400 | Vendor tries `PREPARING` before `ACCEPTED` (pickup order) |
| `ORDER_MUST_BE_PREPARING_BEFORE_READY_FOR_PICKUP` | 400 | Vendor tries `READY_FOR_PICKUP` too early |
| `NO_SHOW_ONLY_FOR_PICKUP_ORDERS` | 400 | `NO_SHOW` attempted on a delivery order |
| `ORDER_MUST_BE_READY_FOR_PICKUP_BEFORE_NO_SHOW` | 400 | `NO_SHOW` or `verify-pickup` attempted outside `READY_FOR_PICKUP` |
| `INVALID_PICKUP_CODE` | 401 | Code doesn't match the stored hash |
| `PICKUP_VERIFIED_SUCCESS` | 200 | Successful counter verification |

---

## Data model — key fields (`TOrder`)

```ts
fulfillmentType: 'DELIVERY' | 'PICKUP';

pickup?: {
  codeHash: string;          // sha256, select:false — never sent to clients
  generatedAt: Date;
  readyAt?: Date | null;     // stamped when vendor marks READY_FOR_PICKUP
  verifiedAt?: Date | null;  // stamped on successful verify-pickup
  verifiedBy?: ObjectId | null; // the vendor/sub-vendor user who verified
};

deliveryAddress?: TAddress;  // required only when fulfillmentType === 'DELIVERY'
pickupAddress?: TAddress;    // vendor's own storefront; set on ACCEPTED for both flows
```

## Known limitations

- **The pickup code is single-use-to-display** — if the customer's app loses it
  before they screenshot/note it, there is currently no re-fetch endpoint (only
  the hash is stored server-side, by design, so it can't be re-issued as-is).
  Revoking/regenerating the code would need a new endpoint if this becomes a
  real support pain point.
- **No auto no-show cron yet** — a vendor must manually mark `NO_SHOW`; an
  automatic sweep (e.g. after `PICKUP_AUTO_CANCEL_HOURS` = 24h past `readyAt`)
  was scoped out of this pass and is not yet running.

---

## Postman testing walkthrough

You need up to three logged-in accounts depending on the flow: one **CUSTOMER**,
one **VENDOR**, and (delivery flow only) one **DELIVERY_PARTNER**. Log each in via
your existing Auth endpoints first and keep their `accessToken`s as separate
Postman environment variables (`{{customerToken}}`, `{{vendorToken}}`, `{{riderToken}}`).

Every request below needs:
```
Authorization: Bearer {{<role>Token}}
Content-Type: application/json
```

### A. Self-Pickup flow (no rider needed — fastest to test end to end)

1. **Checkout as pickup** — `POST {{API_BASE}}/api/v1/checkout` as customer:
   ```jsonc
   { "fulfillmentType": "PICKUP", "useCart": false, "items": [{ "productId": "<a real productId>", "quantity": 1 }] }
   ```
   Save `data._id` → `{{checkoutSummaryId}}`. Sanity-check with
   `GET /checkout/summary/{{checkoutSummaryId}}` that `fulfillmentType` came back `"PICKUP"`
   and `delivery.charge` is `0`.

2. **Create the order** — `POST {{API_BASE}}/api/v1/orders/create-order` as customer:
   ```jsonc
   { "checkoutSummaryId": "{{checkoutSummaryId}}", "paymentToken": "<see note below>" }
   ```
   > This endpoint verifies `paymentToken` against redUniq's live API — you can't fake
   > a token in Postman against a real gateway. For pure Order-module testing without a
   > real payment, either use a redUniq sandbox/test token if your team has one, or ask
   > about adding a `PAYMENT_ENABLED=false` / test-mode bypass — that's a Payment-module
   > concern, not something this pass touched.

   Copy `data.orderId` (e.g. `ORD-xxxxxxxxxx`) → `{{orderId}}`, and copy
   **`data.pickup.code`** now — it's your only chance to see it.

3. **Accept** — `PATCH {{orderId}}/status` as vendor: `{ "type": "ACCEPTED" }`
4. **Prepare** — `PATCH {{orderId}}/status` as vendor: `{ "type": "PREPARING" }`
5. **Ready** — `PATCH {{orderId}}/status` as vendor: `{ "type": "READY_FOR_PICKUP" }`
6. **Verify at counter** — `PATCH {{orderId}}/verify-pickup` as vendor:
   `{ "code": "<the 6-digit code from step 2>" }`
   → `orderStatus` should now be `PICKED_UP_BY_CUSTOMER`. Try a wrong code first to
   confirm you get `401 INVALID_PICKUP_CODE`.
7. *(Optional negative test)* Instead of step 6, call `PATCH {{orderId}}/status`
   with `{ "type": "NO_SHOW" }` right after step 5 to confirm the no-show path
   restores stock and sets `refundStatus: PENDING`.

### B. Home Delivery flow (needs a rider account too)

1. **Checkout** — `POST /checkout` as customer, omit `fulfillmentType` (or send
   `"DELIVERY"`). Requires the customer to have an `isActive: true` address saved
   on their profile first, or you'll get `400 DELIVERY_ADDRESS_INCOMPLETE`.
2. **Create order** → same as pickup step 2 (payment-token caveat applies here too).
3. **Accept** — vendor: `{ "type": "ACCEPTED" }`.
4. **Broadcast** — vendor: `PATCH {{orderId}}/broadcast-order` (no body). Requires
   the vendor account to have `currentSessionLocation` set (send a location update
   via whatever endpoint your vendor app uses for that, or set it directly in Mongo
   for a quick test). Also requires a `DELIVERY_PARTNER` account within 3–5km of
   that location with `status: APPROVED` and `operationalData.currentStatus: IDLE`.
5. **Rider claims** — rider: `PATCH {{orderId}}/accept-dispatch-order`
   `{ "action": "ACCEPT" }` → order becomes `ASSIGNED`.
6. **Prepare / Ready** — vendor, same as pickup steps 4–5.
7. **Rider progresses** — rider, in order:
   ```jsonc
   PATCH {{orderId}}/update-order-status  { "orderStatus": "PICKED_UP" }
   PATCH {{orderId}}/update-order-status  { "orderStatus": "ON_THE_WAY" }
   PATCH {{orderId}}/update-order-status  { "orderStatus": "DELIVERED", "deliveryProofImage": "https://example.com/proof.jpg" }
   ```

### Quick sanity checks while testing

- `GET {{API_BASE}}/api/v1/orders/{{orderId}}` as customer, vendor, or rider — each
  role is auto-scoped server-side, so a customer token can never fetch another
  customer's order (`404`, not `403`, by design — avoids leaking existence).
- Every status transition is logged to `statusHistory` on the order — inspect it
  in the `GET /:orderId` response to confirm each step actually recorded.
- If a step 400s with a message you don't recognize, check the
  [error/message key reference](#error--message-key-reference-pickup-specific)
  above or the general `ORDER_MUST_BE_IN_TO_TRANSITION` /
  `CANNOT_ACCEPT_ORDER_FROM_CURRENT_STATUS` family — they all report the exact
  status the order needs to be in first.
