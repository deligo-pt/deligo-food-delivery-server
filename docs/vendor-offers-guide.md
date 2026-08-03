# Offers & BOGO — Vendor App / Web Integration Guide

Audience: Vendor mobile app and vendor web dashboard developers.
Base URL: `{{API_BASE}}/api/v1/offers`

## Auth

All endpoints require a logged-in **VENDOR** or **SUB_VENDOR** (Admin/Super Admin can
manage non-BOGO offer types too — see role notes per endpoint).

```
Authorization: Bearer <accessToken>
```
(or the `accessToken` cookie set at login — either works)

Language: send `Accept-Language: en` or `Accept-Language: pt` to localize response
messages and the `title`/`description` fields. Defaults to `en`.

Your vendor account must have `status: APPROVED`, or every write endpoint below
returns `403` with `NOT_AUTHORIZED_WITH_ACCOUNT_STATUS` / `NOT_APPROVED_WITH_STATUS`.

---

## Offer types

| Type | What it does | Needs a promo code? |
|---|---|---|
| `PERCENT` | % off the cart, optional `maxDiscountAmount` cap | Optional (see `isAutoApply`) |
| `FLAT` | Fixed amount off the cart | Optional |
| `FREE_DELIVERY` | Zeroes the delivery charge | Optional |
| `BOGO` | Buy X (or category Y), get Z free | **Never** — always auto-applied, vendor-only |

**BOGO is vendor-exclusive.** Admins cannot create or edit BOGO offers — attempting
to returns `403 BOGO_CREATION_RESTRICTED_TO_VENDOR`. This is intentional: a BOGO
discount reduces *your* payout on the item given away, so only you can configure it.

---

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

---

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

No extra fields. `discountValue` / `maxDiscountAmount` are ignored.

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
    "getProductId": "<productId>"       // optional — reward item; defaults to buyProductId (same item) if omitted
  }
}
```

**Ownership is enforced:** `buyProductId`, `buyCategoryId`'s products, and
`getProductId` must all belong to you (or your parent vendor if you're a
`SUB_VENDOR`) — otherwise `403 BOGO_BUY_PRODUCT_NOT_OWNED` / `BOGO_GET_PRODUCT_NOT_OWNED`.

**The math customers see:** a free unit only appears once the cart holds a full
`buyQty + getQty` tier of the trigger item(s) — e.g. `buyQty:2, getQty:1` needs
**3** in the cart (2 paid + 1 free), not 2. Design this deliberately: "Buy 2 Get 1
Free" literally means 3 total. If you want "every 2nd item free" (50%-off-pairs
style), use `buyQty:1, getQty:1` instead.

The discount only applies to units of the **reward item** actually present in the
cart — it is never auto-added. If a customer has the trigger item but not the
reward item in their cart, the offer is treated as not eligible.

---

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

---

## Error reference (offer write endpoints)

| errorKey | Meaning |
|---|---|
| `OFFER_CODE_ALREADY_EXISTS` | Manual code already used by another active offer |
| `VALID_DISCOUNT_VALUE_REQUIRED` | Missing/invalid `discountValue` for PERCENT/FLAT |
| `BOGO_CREATION_RESTRICTED_TO_VENDOR` | Non-vendor tried to create/edit a BOGO offer |
| `BOGO_REQUIRES_BUY_TRIGGER_AND_QUANTITIES` | Missing `buyQty`/`getQty`/(`buyProductId` or `buyCategoryId`) |
| `BOGO_BUY_PRODUCT_NOT_OWNED` / `BOGO_GET_PRODUCT_NOT_OWNED` | Referenced product isn't yours |
| `END_DATE_AFTER_START_DATE` / `END_DATE_CANNOT_BE_IN_PAST` | Date validation |
| `CODE_ALREADY_IN_USE` / `CODE_REQUIRED_FOR_MANUAL_OFFERS` | Promo code conflicts |
| `PERCENTAGE_RANGE_INVALID` | PERCENT `discountValue` not in 1–100 |
| `MAX_USAGE_LESS_THAN_CURRENT_USAGE` | `maxUsageCount` below current `usageCount` |
| `EXPIRED_OFFER_UPDATE_REQUIRES_DATE_EXTENSION` | Editing an expired offer without extending it |
| `ACTIVE_OFFER_MUST_BE_DEACTIVATED_BEFORE_DELETING` | Soft-delete needs `isActive:false` first |

---

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
