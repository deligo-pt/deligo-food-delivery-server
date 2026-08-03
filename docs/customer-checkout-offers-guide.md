# Checkout & Offers — Customer App / Web Integration Guide

Audience: Customer mobile app and customer web developers.
Base URL: `{{API_BASE}}/api/v1`

## Auth

All endpoints below require a logged-in **CUSTOMER**.
```
Authorization: Bearer <accessToken>
```
(or the `accessToken` cookie set at login)

Language: send `Accept-Language: en` or `Accept-Language: pt` — it controls both
the `message` field and localized text inside `data` (item names, offer titles).
Defaults to `en`.

**Offers are only ever calculated at checkout — never in the Cart.** The Cart is
just a bag of items; nothing about pricing/discounts happens until you create a
checkout.

---

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
          "buyQty": 2, "getQty": 1,
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
For PERCENT/FLAT/FREE_DELIVERY, `bogoSnapshot` is absent and `discountType` tells
you which kind applied.

If the offer isn't valid, you get a `400` with a ready-to-display message — see
the error table below. Nothing is applied; the checkout stays as it was.

### 4. Re-fetch the checkout summary

```
GET /checkout/summary/:checkoutSummaryId
```
Same shape as the apply-offer response's `data`. Use this on screen re-entry
instead of trusting client-cached state — someone might have applied/changed
the offer from another device, or it might have expired.

---

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

---

## Quick reference: field meanings

| Field | Meaning |
|---|---|
| `orderCalculation.itemsSubtotal` | Cart total after product-level discounts + offer discount |
| `orderCalculation.totalOfferDiscount` | The applied offer's savings (0 if none applied) |
| `delivery.totalDeliveryCharge` | Delivery fee incl. VAT (0 if a FREE_DELIVERY offer is applied) |
| `payoutSummary.grandTotal` | **What the customer pays** |
| `offer.isApplied` | Whether any offer is currently attached to this checkout |
| `offer.offerApplied.discountType` | `PERCENT` \| `FLAT` \| `FREE_DELIVERY` \| `BOGO` |
