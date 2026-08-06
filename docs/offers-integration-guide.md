# Offers & Checkout — API Integration Guide

Base URL: `{{API_BASE}}/api/v1`

This guide covers two audiences in one place:
- **[Part 1 — Vendor App / Web](#part-1--vendor-app--web-integration)**: creating and managing offers (`/offers/*` write endpoints).
- **[Part 2 — Customer App / Web](#part-2--customer-app--web-integration)**: checkout flow and applying offers (`/checkout`, `/offers/*` read/apply endpoints).

## Shared basics

**Auth** — every endpoint below requires a logged-in user:
```
Authorization: Bearer <accessToken>
```
(or the `accessToken` cookie set at login — either works)

**Language** — send `Accept-Language: en` or `Accept-Language: pt` to localize
response messages and any localized text (`title`, `description`, item names).
Defaults to `en`.

---

# Part 1 — Vendor App / Web Integration

Audience: Vendor mobile app and vendor web dashboard developers.
Endpoints below are rooted at `{{API_BASE}}/api/v1/offers`.

Requires a logged-in **VENDOR** or **SUB_VENDOR** (Admin/Super Admin can manage
non-BOGO offer types too — see role notes per endpoint). Your account must have
`status: APPROVED`, or every write endpoint returns `403` with
`NOT_AUTHORIZED_WITH_ACCOUNT_STATUS` / `NOT_APPROVED_WITH_STATUS`.

## Offer types

| Type | What it does | Needs a promo code? |
|---|---|---|
| `PERCENT` | % off the cart, optional `maxDiscountAmount` cap | Optional (see `isAutoApply`) |
| `FLAT` | Fixed amount off the cart | Optional |
| `FREE_DELIVERY` | ⛔ **Disabled** — cannot be created, updated, listed as available, or applied | n/a |
| `BOGO` | Buy X (or category Y), get Z free | **Never** — always auto-applied, vendor-only |

**FREE_DELIVERY is currently disabled.** `POST /create-offer` and `PATCH /:offerId`
both return `400 FREE_DELIVERY_CREATION_DISABLED` / `FREE_DELIVERY_UPDATE_DISABLED`
for this type. Any `FREE_DELIVERY` offers that already exist in the database are
excluded from `available-offers` and `validate-apply-offer` — they can no longer be
applied at checkout even if a customer has the old code. They still show up in
`GET /offers` / `GET /offers/:offerId` for admin/vendor management (e.g. to
deactivate or soft-delete legacy ones).

**BOGO is vendor-exclusive.** Admins cannot create or edit BOGO offers — attempting
to returns `403 BOGO_CREATION_RESTRICTED_TO_VENDOR`. This is intentional: a BOGO
discount reduces *your* payout on the item given away, so only you can configure it.

## Endpoints

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/create-offer` | ADMIN, SUPER_ADMIN, VENDOR, SUB_VENDOR | Create an offer |
| PATCH | `/:offerId` | ADMIN, SUPER_ADMIN, VENDOR, SUB_VENDOR | Update an offer |
| PATCH | `/toggle-status/:offerId` | ADMIN, SUPER_ADMIN, VENDOR, SUB_VENDOR | Flip `isActive` |
| GET | `/` | ADMIN, SUPER_ADMIN, VENDOR, SUB_VENDOR, CUSTOMER | List offers (vendors see only their own) |
| GET | `/:offerId` | ADMIN, SUPER_ADMIN, VENDOR, SUB_VENDOR, CUSTOMER | Get one offer |
| DELETE | `/soft-delete/:offerId` | ADMIN, SUPER_ADMIN, VENDOR, SUB_VENDOR | Soft delete (must be inactive first) |
| DELETE | `/permanent-delete/:offerId` | ADMIN, SUPER_ADMIN only (route allows VENDOR but service rejects) | Hard delete |

A `SUB_VENDOR` acts under its parent vendor for ownership checks.

## Creating an offer — common fields

```jsonc
POST /create-offer
{
  "title": { "en": "Weekend Flash Sale", "pt": "Promoção de Fim de Semana" },
  "description": { "en": "...", "pt": "..." },        // optional
  "offerType": "PERCENT" | "FLAT" | "FREE_DELIVERY" | "BOGO",
  "isAutoApply": false,                                 // true = no code needed
  "code": "WEEKEND10",                                  // required if isAutoApply=false, ignored/must be omitted if true
  "validFrom": "2026-08-01T00:00:00.000Z",
  "expiresAt": "2026-08-31T00:00:00.000Z",
  "minOrderAmount": 0,                                   // optional, default 0
  "applicableProducts": [],                              // optional — restricts PERCENT/FLAT/FREE_DELIVERY to these products
  "applicableCategories": [],                             // optional, currently informational only (not enforced in matching)
  "maxUsageCount": 100,                                   // optional — total redemptions across all customers
  "userUsageLimit": 1                                     // default 1 — redemptions per customer
}
```

You do **not** set `vendorId` / `isGlobal` / `adminId` — the server derives them:
vendor calls always get `vendorId: <you>`, `isGlobal: false`.

### PERCENT / FLAT

Add:
```jsonc
"discountValue": 10,          // % for PERCENT, currency amount for FLAT
"maxDiscountAmount": 5         // optional cap, PERCENT only
```

### FREE_DELIVERY

Disabled — see the note above. Any create/update request with this `offerType`
is rejected before any other field is checked.

### BOGO

```jsonc
{
  "offerType": "BOGO",
  "isAutoApply": true,     // must be true — BOGO never uses a manual code
  "bogo": {
    "buyQty": 2,
    "getQty": 1,
    "buyProductId": "<productId>",     // trigger: buy this exact product...
    // "buyCategoryId": "<categoryId>", // ...OR buy anything from this category (use one, not both)
    "getProductId": "<productId>",      // optional — reward item; defaults to buyProductId (same item) if omitted
    "includeAddons": false              // optional, default false — see below
  }
}
```

**Ownership is enforced:** `buyProductId`, `buyCategoryId`'s products, and
`getProductId` must all belong to you (or your parent vendor if you're a
`SUB_VENDOR`) — otherwise `403 BOGO_BUY_PRODUCT_NOT_OWNED` / `BOGO_GET_PRODUCT_NOT_OWNED`.

**Addons are NOT free by default.** The free unit only zeroes out the base
product price — if the customer added a paid addon/customization to that item
(e.g. extra sauce, upgraded size as an addon), they still pay full price for it.
Set `bogo.includeAddons: true` if you want the free unit's addons to also be
discounted proportionally (spread across product + addons by their share of the
line's value, same as how PERCENT/FLAT discounts are distributed within a line).

**The math customers see:** a free unit only appears once the cart holds a full
`buyQty + getQty` tier of the trigger item(s) — e.g. `buyQty:2, getQty:1` needs
**3** in the cart (2 paid + 1 free), not 2. Design this deliberately: "Buy 2 Get 1
Free" literally means 3 total. If you want "every 2nd item free" (50%-off-pairs
style), use `buyQty:1, getQty:1` instead.

The discount only applies to units of the **reward item** actually present in the
cart — it is never auto-added. If a customer has the trigger item but not the
reward item in their cart, the offer is treated as not eligible.

## Updating an offer

`PATCH /:offerId` — partial body, same shape as create. Notes:

- You can only update your own offers (`403 NOT_AUTHORIZED_TO_UPDATE_OFFER` otherwise).
- Switching `offerType` to/from `BOGO`, or editing an existing BOGO's `bogo` block,
  is vendor-only — same `403 BOGO_CREATION_RESTRICTED_TO_VENDOR` guard as create.
- Partial `bogo` updates merge onto the existing config (you don't have to resend
  every field).
- An expired offer can't be updated unless the payload extends `expiresAt`.
- `maxUsageCount` can't be set below the current `usageCount`.

## Toggling / deleting

- `toggle-status` flips `isActive`. Reactivating an expired offer is blocked —
  extend `expiresAt` via update first.
- `soft-delete` requires the offer to be inactive first.
- `permanent-delete` requires it to be soft-deleted first and is admin-only in
  practice, even though the route accepts a `VENDOR` token.

## Error reference (offer write endpoints)

| errorKey | Meaning |
|---|---|
| `OFFER_CODE_ALREADY_EXISTS` | Manual code already used by another active offer |
| `VALID_DISCOUNT_VALUE_REQUIRED` | Missing/invalid `discountValue` for PERCENT/FLAT |
| `FREE_DELIVERY_CREATION_DISABLED` / `FREE_DELIVERY_UPDATE_DISABLED` | This offer type is disabled — see note above |
| `BOGO_CREATION_RESTRICTED_TO_VENDOR` | Non-vendor tried to create/edit a BOGO offer |
| `BOGO_REQUIRES_BUY_TRIGGER_AND_QUANTITIES` | Missing `buyQty`/`getQty`/(`buyProductId` or `buyCategoryId`) |
| `BOGO_BUY_PRODUCT_NOT_OWNED` / `BOGO_GET_PRODUCT_NOT_OWNED` | Referenced product isn't yours |
| `END_DATE_AFTER_START_DATE` / `END_DATE_CANNOT_BE_IN_PAST` | Date validation |
| `CODE_ALREADY_IN_USE` / `CODE_REQUIRED_FOR_MANUAL_OFFERS` | Promo code conflicts |
| `PERCENTAGE_RANGE_INVALID` | PERCENT `discountValue` not in 1–100 |
| `MAX_USAGE_LESS_THAN_CURRENT_USAGE` | `maxUsageCount` below current `usageCount` |
| `EXPIRED_OFFER_UPDATE_REQUIRES_DATE_EXTENSION` | Editing an expired offer without extending it |
| `ACTIVE_OFFER_MUST_BE_DEACTIVATED_BEFORE_DELETING` | Soft-delete needs `isActive:false` first |

## Example: BOGO on your own menu

```bash
curl -X POST {{API_BASE}}/api/v1/offers/create-offer \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": { "en": "Buy 2 Get 1 Free Pizza", "pt": "Compre 2 Leve 1 Pizza" },
    "offerType": "BOGO",
    "isAutoApply": true,
    "bogo": { "buyQty": 2, "getQty": 1, "buyProductId": "<pizzaProductId>" },
    "validFrom": "2026-08-01T00:00:00.000Z",
    "expiresAt": "2026-12-31T00:00:00.000Z",
    "userUsageLimit": 1
  }'
```

---

# Part 2 — Customer App / Web Integration

Audience: Customer mobile app and customer web developers.

Requires a logged-in **CUSTOMER**.

**Offers are only ever calculated at checkout — never in the Cart.** The Cart is
just a bag of items; nothing about pricing/discounts happens until you create a
checkout.

## The flow

```
1. POST /checkout                          → create a checkout summary (no offer applied yet)
2. GET  /offers/available-offers/:checkoutId → (optional) show the customer what they qualify for
3. POST /offers/validate-apply-offer         → apply a BOGO or a coupon code
4. GET  /checkout/summary/:checkoutSummaryId → re-fetch at any time (e.g. on screen resume)
```

### 1. Create a checkout

```jsonc
POST /checkout
{
  "useCart": true            // OR: false + "items": [{ "productId", "quantity", "variationSku"? }] (single item only)
}
```

Returns a checkout summary: `items[]`, `orderCalculation`, `delivery`,
`payoutSummary`, and `offer: { isApplied: false, offerApplied: null }`. No
discount is applied at this step — `orderCalculation.totalOfferDiscount` is `0`.

Every new checkout call for the same customer+vendor **replaces** any prior
pending checkout (old one is deleted). Save `data._id` as `checkoutId`.

### 2. See what offers the customer qualifies for

```
GET /offers/available-offers/:checkoutId
```

Returns every active offer for that vendor (+ global ones), each annotated with:

```jsonc
{
  "_id": "...",
  "title": "Buy 2 Get 1 Free Pizza",   // already localized to Accept-Language
  "offerType": "BOGO",
  "isEligible": false,
  "message": "Add 1 more Pizza to your cart to unlock this BOGO offer."
}
```

Use `isEligible` + `message` directly in the UI — don't re-derive eligibility
client-side, the rules (expiry, min order, usage limit, BOGO trigger quantity)
can change server-side without a client update.

**Important for BOGO UX:** an offer like "Buy 2 Get 1 Free" (`buyQty:2, getQty:1`)
needs **3** units of the trigger product in the cart (2 paid + 1 free), not 2.
`isEligible` will stay `false` — with a message telling the customer exactly how
many more to add — until that full tier is reached.

### 3. Apply an offer

```jsonc
POST /offers/validate-apply-offer
{
  "checkoutId": "<checkoutId>",
  "offerIdentifier": "<offer _id, for an auto-apply BOGO>"
  // OR "offerIdentifier": "WEEKEND10"  — a manual promo code
}
```

- **Only one offer can be applied at a time.** Calling this again with a
  *different* `offerIdentifier` automatically replaces the previous one
  (recalculates the cart back to its clean state first, then applies the new one).
  Calling it again with the *same* one is a no-op.
- To **remove** an applied offer, call this endpoint with an empty/invalid
  identifier, or simply don't call it again before finalizing the order — an
  explicit "remove offer" flow should re-POST with `offerIdentifier: ""`.
- BOGO offers are looked up **by their `_id`**, not a code (they're auto-apply
  and never have one). Coupon-style offers are looked up by their `code` string.

Success response — note the fields that change vs. step 1:

```jsonc
{
  "success": true,
  "message": "Promo code applied successfully!",
  "data": {
    "items": [{
      "name": "Pepperoni Feast Pizza - Medium (10 inch)",   // flattened to your Accept-Language
      "productPricing": { "unitPrice": 7.79, "promoDiscountAmount": 3.9, ... },
      "itemSummary": { "quantity": 3, "totalPromoDiscount": 11.69, "grandTotal": 23.38 }
    }],
    "orderCalculation": { "totalOfferDiscount": 11.69, ... },
    "offer": {
      "isApplied": true,
      "offerApplied": {
        "promoId": "...",
        "title": "Buy 2 Get 1 Free Pizza",
        "discountType": "BOGO",
        "bogoSnapshot": {
          "buyQty": 2, "getQty": 1, "freeQty": 1,
          "productId": "...",
          "productName": "Pepperoni Feast Pizza - Medium (10 inch)"  // localized string
        }
      }
    }
  }
}
```

`offer.offerApplied.bogoSnapshot` is only present for BOGO discounts — use it to
render "1 free Pepperoni Feast Pizza" style messaging in the cart/checkout UI.
Use **`freeQty`** for the badge/count, not `getQty` — `getQty` is the offer's
fixed config (e.g. always `1`), while `freeQty` is how many units were actually
granted free in *this* cart. They can differ: e.g. `buyQty:2, getQty:2` with only
1 unit of the reward item in the cart caps `freeQty` at `1`, not `2`. `bogoSnapshot`
is only ever present when `freeQty >= 1`.
For PERCENT/FLAT, `bogoSnapshot` is absent and `discountType` tells you which
kind applied. (`FREE_DELIVERY` is currently disabled — see Part 1 — so it will
never appear here.)

Note on addons: for a BOGO item, `addons[].promoDiscountAmount` will normally be
`0` — the free unit only discounts the base product, not anything the customer
added to it (unless the vendor opted into `bogo.includeAddons`, see Part 1). Don't
treat a `0` there as a bug when `itemSummary.totalPromoDiscount` is non-zero.

If the offer isn't valid, you get a `400` with a ready-to-display message — see
the error table below. Nothing is applied; the checkout stays as it was.

### 4. Re-fetch the checkout summary

```
GET /checkout/summary/:checkoutSummaryId
```
Same shape as the apply-offer response's `data`. Use this on screen re-entry
instead of trusting client-cached state — someone might have applied/changed
the offer from another device, or it might have expired.

## Error reference

| errorKey | Typical cause | UX suggestion |
|---|---|---|
| `INVALID_OFFER_OR_PROMO_CODE` | Code/ID doesn't exist, expired, or wrong vendor | "This code isn't valid" |
| `OFFER_REQUIRES_VALID_PROMO_CODE` | Tried to apply a manual (non-auto) offer by its `_id` instead of its code | n/a (shouldn't happen from your own UI) |
| `MIN_ORDER_AMOUNT_REQUIRED_TEMPLATE` | Cart below the offer's minimum | Shows the exact amount needed — display as-is |
| `OFFER_NOT_VALID_FOR_CART_PRODUCTS` | Offer restricted to specific products not in cart | "Not valid for items in your cart" |
| `BOGO_ADD_MORE_QTY_TO_UNLOCK` | Cart doesn't hold a full `buyQty+getQty` tier yet | Message already includes qty + product name — show as-is |
| `OFFER_USAGE_LIMIT_EXCEEDED` | Customer already redeemed this offer `userUsageLimit` times | "You've already used this offer" |
| `CHECKOUT_SESSION_NOT_FOUND` | Stale/expired `checkoutId` | Re-create the checkout |
| `CANNOT_APPLY_OFFER_TO_COMPLETED_CHECKOUT` | Checkout already converted to an order | Start a new order |

All of the above arrive as:
```jsonc
{ "success": false, "message": "<localized, ready to show>", "errorSources": [...] }
```
so in most cases you can display `message` directly without a client-side lookup table.

## Quick reference: field meanings

| Field | Meaning |
|---|---|
| `orderCalculation.itemsSubtotal` | Cart total after product-level discounts + offer discount |
| `orderCalculation.totalOfferDiscount` | The applied offer's savings (0 if none applied) |
| `delivery.totalDeliveryCharge` | Delivery fee incl. VAT |
| `payoutSummary.grandTotal` | **What the customer pays** |
| `offer.isApplied` | Whether any offer is currently attached to this checkout |
| `offer.offerApplied.discountType` | `PERCENT` \| `FLAT` \| `BOGO` (`FREE_DELIVERY` disabled) |
