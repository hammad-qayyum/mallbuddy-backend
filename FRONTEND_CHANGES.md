# Frontend Migration Guide — Backend Security Fixes (2026-05-09)

This document lists every frontend-visible change from the backend security fix batch (audit findings C1–C10). All changes are **live on `https://backend.mallbuddy.net`** after deploy. Read this end-to-end before pushing the next frontend release.

> **TL;DR for the impatient**
> 1. **Stop sending `userId` in body or query** on any orders / cart / checkout / delivery-address endpoint — the backend now reads it from the auth cookie.
> 2. **Handle `402 Payment Required`** on every restaurant action endpoint — the restaurant's subscription is inactive/expired.
> 3. **Handle `429 Too Many Requests`** on login / register / password-reset / verify-otp.
> 4. **All Amwal payment endpoints now require auth** (the cookie you already send works — but `/test-page` and direct `/initiate` from logged-out users will now fail).
> 5. **Push notifications now actually work** — `POST /api/notifications/register-token` was silently broken before. Re-test after deploy.

---

## Change 1 — Drop `userId` from request body/query everywhere
**Audit ID:** C1 (also covers I8)
**Why:** the old code accepted `userId` from the client and trusted it, allowing any logged-in user to read or modify another user's data (IDOR). The backend now derives `userId` from the authenticated session cookie, never the request.

### Action: remove `userId` from these requests

| Endpoint | Before | After |
|---|---|---|
| `GET /api/orders/list` | `?userId=...&status=...&limit=...&offset=...` | `?status=...&limit=...&offset=...` |
| `GET /api/orders/active` | `?userId=...&limit=...&offset=...` | `?limit=...&offset=...` |
| `GET /api/orders/past` | `?userId=...&limit=...&offset=...` | `?limit=...&offset=...` |
| `POST /api/orders/cancel` | body `{ orderId, userId, reason }` | body `{ orderId, reason }` |
| `POST /api/orders/reorder` | body `{ orderId, userId }` | body `{ orderId }` |
| `GET /api/orders/:orderId/reorder-preview` | `?userId=...` | _(none)_ |
| `GET /api/cart/cart/get` | `?userId=...` | _(none)_ |
| `POST /api/cart/item/add` | body `{ userId, menuItemId, restaurantId, quantity, ... }` | body `{ menuItemId, restaurantId, quantity, ... }` |
| `PUT /api/cart/item/update/:cartItemId` | `?userId=...` + body | body only |
| `DELETE /api/cart/item/delete/:cartItemId` | `?userId=...` | _(none)_ |
| `DELETE /api/cart/cart/clear` | `?userId=...` | _(none)_ |
| `GET /api/cart/cart/summary` | `?userId=...` | _(none)_ |
| `POST /api/checkout/create-order` | body `{ userId, deliveryAddressId, paymentMethod, ... }` | body `{ deliveryAddressId, paymentMethod, ... }` |
| `GET /api/checkout/summary` | `?userId=...` | _(none)_ |
| `GET /api/checkout/addresses` | `?userId=...` | _(none)_ |
| `POST /api/checkout/address` | `?userId=...` + body | body only |
| `POST /api/delivery-addresses/address/create` | `?userId=...` + body | body only |
| `GET /api/delivery-addresses/address/get-all` | `?userId=...` | _(none)_ |
| `GET /api/delivery-addresses/address/get/:addressId` | `?userId=...` | _(none)_ |
| `PUT /api/delivery-addresses/address/update/:addressId` | `?userId=...` + body | body only |
| `DELETE /api/delivery-addresses/address/delete/:addressId` | `?userId=...` | _(none)_ |
| `PUT /api/delivery-addresses/address/set-default/:addressId` | `?userId=...` | _(none)_ |

### Example — before / after

**Before** (cancel order):
```ts
await fetch("/api/orders/cancel", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId: "abc-123",
    userId: currentUser.id,   // ← REMOVE THIS LINE
    reason: "Changed my mind",
  }),
});
```

**After**:
```ts
await fetch("/api/orders/cancel", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId: "abc-123",
    reason: "Changed my mind",
  }),
});
```

### What happens if you keep sending `userId`?
The backend ignores it silently — Zod's `.safeParse` strips unknown fields. **It won't break the request**, but it's dead code on your side and worth removing for clarity.

### Authentication still required
Every endpoint above still requires `credentials: "include"` (or whatever cookie-forwarding mechanism you use). You'll get `401 Unauthorized` if the session cookie isn't sent.

---

## Change 2 — Handle `402 Payment Required` on restaurant action endpoints
**Audit ID:** C4
**Why:** the platform is paid-only for restaurants. Previously, restaurants with `INCOMPLETE` or expired subscriptions could still operate. Now, every restaurant-action endpoint returns `402 Payment Required` if the restaurant has no active subscription.

### Affected endpoints (restaurant-only)

| Endpoint | Method |
|---|---|
| `/api/menu/create-category` | POST |
| `/api/menu/update-category/:id` | PATCH |
| `/api/menu/delete-category/:id` | DELETE |
| `/api/menu/create-item` | POST |
| `/api/menu/update-item/:id` | PATCH |
| `/api/menu/delete-item/:id` | DELETE |
| `/api/restaurant/:restaurantId/info` | PATCH |
| `/api/restaurant/:restaurantId/business-hours` | POST / DELETE |
| `/api/restaurant/:restaurantId/business-hours/:dayOfWeek` | PATCH / DELETE |
| `/api/restaurant/:restaurantId/gallery` | POST / DELETE |
| `/api/restaurant/:restaurantId/promotions` | POST |
| `/api/promotions/:id` | PUT / DELETE |
| `/api/restaurants/:restaurantId/orders/:orderId/accept` | POST |
| `/api/restaurants/:restaurantId/orders/:orderId/decline` | POST |
| `/api/restaurants/:restaurantId/orders/:orderId/status` | PATCH |

### Response shape on 402

```json
{
  "success": false,
  "error": "Subscription inactive or payment required. Please renew your subscription."
}
```

### Action

Wrap every restaurant-action API call in error handling that detects `402` and routes the user to the **Subscription / Pay** screen. Concretely:

```ts
const res = await fetch("/api/menu/create-item", { ... });

if (res.status === 402) {
  // Show the "subscription expired" screen
  navigate("/restaurant/subscription/renew");
  return;
}
```

A global Axios/Fetch interceptor that listens for `402` and redirects is the cleanest approach.

### Note: read endpoints are not gated

`GET` endpoints (browse menu, get restaurant info, etc.) still work for restaurants with inactive subscriptions — only **mutations** are blocked. Customers can still see existing data; the restaurant just can't change anything until they pay.

---

## Change 3 — Handle `429 Too Many Requests`
**Audit ID:** C3, C5
**Why:** login was unrate-limited (password brute-force open) and OTP verification could be brute-forced (~3 hours to crack a 6-digit code). All four routes below now have rate limiters.

### Affected endpoints

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/auth/login` | 20 attempts | 15 minutes per IP |
| `POST /api/auth/register` | 10 attempts | 1 hour per IP |
| `POST /api/auth/password/reset` | 5 attempts | 15 minutes per IP |
| `POST /api/auth/user/signup/verify-otp` | 10 attempts | 15 minutes per IP |
| `POST /api/auth/restaurant/signup/verify-otp` | 10 attempts | 15 minutes per IP |
| `POST /api/auth/password/reset/verify-otp` | 10 attempts | 15 minutes per IP |

### Response shape on 429

```
HTTP 429 Too Many Requests
Retry-After: <seconds>
RateLimit-Limit: 20
RateLimit-Remaining: 0
RateLimit-Reset: <unix-timestamp>

Body:
"Too many login attempts. Please try again later."
(plain text)
```

### Action

On every auth-related request, detect `429` and show a friendly "Too many attempts, try again in N minutes" message. Read `Retry-After` (in seconds) from response headers if you want a precise countdown.

```ts
const res = await fetch("/api/auth/login", { ... });
if (res.status === 429) {
  const retryAfter = res.headers.get("Retry-After"); // seconds
  showError(`Too many attempts. Try again in ${Math.ceil(Number(retryAfter)/60)} minutes.`);
  return;
}
```

---

## Change 4 — OTP attempt cap (new error message)
**Audit ID:** C3
**Why:** on top of the rate limiter, each OTP can now be tried at most 5 times before it's destroyed and the user must request a fresh one.

### New error message

After 5 failed `verify-otp` attempts on the same OTP, the backend returns:

```json
HTTP 400
{
  "message": "Too many invalid attempts. Please request a new OTP."
}
```

### Action

Add a UI branch: when this exact message comes back, surface a clear **"Resend OTP"** button (the existing `request-otp` flow). The OTP they have is now invalid.

---

## Change 5 — Push token registration now actually works
**Audit ID:** C6
**Why:** `POST /api/notifications/register-token` was reading the wrong session field (`req.user` instead of `req.auth.user`). It returned 401 to **every** authenticated user, so push notifications never worked. Fixed.

### No request/response change

The contract is identical:

```http
POST /api/notifications/register-token
Cookie: better-auth.session_token=...
Content-Type: application/json

{ "expoPushToken": "ExponentPushToken[xxxxx]" }
```

### Action

After deploy, **re-test push notifications end-to-end** on a device:

1. Login on a real device.
2. Confirm `register-token` returns `200` (was 401 before).
3. Have the restaurant trigger an order status update.
4. Confirm the push arrives.

If push still doesn't arrive after a successful `register-token` 200, the issue is on the Expo side (token format, device, project ID) — not the backend.

---

## Change 6 — Amwal payment endpoints now require auth (and ownership)
**Audit ID:** C7
**Why:** previously, `/api/payments/amwal/*` was completely public. Anyone could initiate payments, query subscription status, or (once `/renew` shipped) trigger a charge against a saved card. Now everything except the gateway-side webhook requires auth.

### Affected endpoints

| Endpoint | Was | Now |
|---|---|---|
| `POST /api/payments/amwal/initiate` | Public | Auth required + must own the `restaurantId` |
| `POST /api/payments/amwal/confirm` | Public | Auth required + must own the subscription |
| `POST /api/payments/amwal/renew` | Public | Auth required + must own the `restaurantId` |
| `POST /api/payments/amwal/session-token` | Public | Auth required + the `customerId` must belong to the caller's restaurant |
| `GET /api/payments/amwal/verify/:orderId` | Public | Auth required + must own the subscription |
| `POST /api/payments/amwal/webhook` | Public | **Still public** — server-to-server, hash-verified |

### Response shapes on auth/ownership errors

```json
HTTP 401  (no session cookie)
{ "success": false, "message": "Unauthorized" }
```

```json
HTTP 403  (logged in but acting on someone else's restaurant)
{ "success": false, "error": "Forbidden: you can only act on your own restaurant" }
```

### Action

1. Confirm every Amwal API call from the frontend includes `credentials: "include"`. (It almost certainly already does since these flows worked before — but verify after deploy.)
2. Make sure you only ever pass the **logged-in restaurant's own `restaurantId`** to `/initiate` and `/renew`. There's no scenario where a restaurant should act on another restaurant's payment, so this should be a no-op for clean code.
3. **Stop using the test page** at `/api/payments/amwal/test-page` — it's now blocked in production (returns 404).

---

## Change 7 — Cross-tenant errors on menu endpoints
**Audit ID:** C2
**Why:** previously, Restaurant A could pass Restaurant B's menu category id and successfully edit/delete it. Now the backend verifies ownership before mutating.

### What changed in responses

`PATCH /api/menu/update-category/:id`, `DELETE /api/menu/delete-category/:id`, `POST /api/menu/create-item`, `PATCH /api/menu/update-item/:id`, `DELETE /api/menu/delete-item/:id`:

- If the resource belongs to a different restaurant, you now get `404 Not found` (deliberately the same as if the resource didn't exist — prevents enumeration).
- `POST /api/menu/create-category` with a `restaurantId` that doesn't match the auth user returns `403`:
  ```json
  { "message": "Forbidden: cannot create category for another restaurant" }
  ```

### Action

Make sure the frontend always sends the **logged-in restaurant's own ID** as `restaurantId` when creating a category. There's no UI path where a restaurant should be passing someone else's id, so this should also be a no-op for clean code.

---

## Quick checklist before pushing the next frontend release

- [ ] Removed `userId` from every request body/query in orders, cart, checkout, delivery-address modules (Change 1)
- [ ] Added a `402` interceptor that routes restaurant users to the subscription-renewal screen (Change 2)
- [ ] Added a `429` handler showing "Try again in N minutes" with `Retry-After` countdown (Change 3)
- [ ] Added a "Too many invalid attempts" → resend OTP UI branch (Change 4)
- [ ] Verified push-token registration end-to-end on a real device (Change 5)
- [ ] All Amwal payment requests still send the auth cookie; removed any direct hits to `/test-page` (Change 6)
- [ ] No code path passes another restaurant's id to menu mutation endpoints (Change 7)

---

## Endpoints that did NOT change

If you don't see an endpoint listed above, **its contract is unchanged**. This includes:

- All read endpoints for menus, restaurants, malls, cuisines, search, explore, etc.
- The actual SmartBox payment popup flow (cards, OTP, the SDK script URL — none of this changed)
- The Amwal webhook (server-to-server only)
- Auth flows for login, signup OTP request (only the verify side gained rate-limits)
- Admin endpoints (still admin-only)

---

## Questions / mismatches?

If the frontend hits an unexpected error after deploy:

1. Check the response status code first — it tells you which change is involved (401 = auth, 402 = subscription, 403 = ownership, 404 = cross-tenant, 429 = rate limit).
2. Open the Network tab and confirm `Cookie: better-auth.session_token=...` is sent on the request.
3. If still stuck, ping me with the request URL, status code, and response body.

— Backend
