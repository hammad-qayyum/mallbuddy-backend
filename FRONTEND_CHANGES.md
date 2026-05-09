# Frontend Migration Guide — Backend Security Fixes

This document lists every frontend-visible change from the backend security fix batches. All changes are **live on `https://backend.mallbuddy.net`** after deploy. Read this end-to-end before pushing the next frontend release.

**Three batches landed:**
- **Batch 1 (2026-05-09):** Audit findings **C1–C10** (Critical) — Changes 1-7 below
- **Batch 2 (2026-05-09):** Audit findings **I1–I13** (Important) — Changes 8-13 below
- **Batch 3 (2026-05-09):** Audit findings **N1–N15** (Notable) — Changes 14-17 below

> **TL;DR for the impatient**
> 1. **Stop sending `userId` in body or query** on any orders / cart / checkout / delivery-address endpoint — the backend now reads it from the auth cookie.
> 2. **Handle `402 Payment Required`** on every restaurant action endpoint — the restaurant's subscription is inactive/expired.
> 3. **Handle `429 Too Many Requests`** on login / register / password-reset / verify-otp.
> 4. **All Amwal payment endpoints now require auth** (the cookie you already send works — but `/test-page` and direct `/initiate` from logged-out users will now fail).
> 5. **Push notifications now actually work** — `POST /api/notifications/register-token` was silently broken before. Re-test after deploy.
> 6. **Handle `413 Payload Too Large`** for any request with a body larger than ~100KB.
> 7. **Handle the new `PAST_DUE` subscription status** — restaurants whose automatic renewal failed get this status (was previously indistinguishable from `INCOMPLETE`).
> 8. **5xx error responses no longer expose `err.message`** — show a generic friendly message instead of relying on the backend string.
> 9. **List endpoints silently clamp `limit` to 100** — passing `limit=999999` no longer returns the whole table.
> 10. **Image uploads are validated by file content, not just MIME type** — spoofed `.html`/`.svg`/etc disguised as `.jpg` are now rejected with 400.
> 11. **Send `X-Requested-With: fetch` (or any value) on every state-changing request** — without it the backend returns 403 "Missing X-Requested-With header" (CSRF defense).
> 12. **`/api/subscriptions/subscribe`, `/api/subscriptions/update`, and `/api/subscriptions/attach-payment-method` are GONE** — use `POST /api/payments/amwal/initiate` instead. Calling the old URLs now returns 404.
> 13. **`SubscriptionPlan` now has a `currency` field** — surface it in the UI when displaying prices (e.g. "5.000 OMR" not just "5.000").
> 14. **`/api/health` and `/api/ready` are public** — for ops/monitoring only; not for the frontend.

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

---

# Batch 2 (Important — I1–I13)

The remaining changes below all landed in the same deploy and may affect the frontend.

---

## Change 8 — Handle `413 Payload Too Large`
**Audit ID:** I13
**Why:** the backend now enforces an explicit 100KB limit on JSON request bodies. Any POST/PATCH that ships unusually large JSON (e.g. lots of inline base64 data, accidentally huge text fields) will be rejected.

### Response shape on 413

```json
HTTP 413 Payload Too Large
{ "success": false, "error": "Request body too large" }
```

### Action

- File uploads are unaffected — multer has its own 5MB-per-file limit and a separate code path.
- For text-heavy endpoints (e.g. menu item descriptions, review bodies), if you were ever inlining base64 image data in JSON: stop. Use the file-upload endpoints instead.
- Add a global 413 handler that surfaces a friendly "this content is too large to submit" message.

---

## Change 9 — New subscription status: `PAST_DUE`
**Audit ID:** I7
**Why:** when a recurring renewal charge fails (saved card declined, etc.), the subscription previously stayed `ACTIVE` with a past `endDate` and the cron created an orphan `INCOMPLETE` row every retry. Now there's a dedicated `PAST_DUE` status so the UI can communicate "we tried to charge your card and couldn't" distinctly from "you cancelled" or "you never paid".

### What changed

`SubscriptionStatus` enum now has 5 values:

```ts
type SubscriptionStatus =
  | "ACTIVE"      // currently paid, endDate in the future
  | "INCOMPLETE"  // first payment never completed
  | "CANCELLED"   // restaurant explicitly cancelled
  | "EXPIRED"     // (existing, less commonly used)
  | "PAST_DUE";   // ← new: automatic renewal failed
```

### Where you'll see it

`GET /api/payments/amwal/verify/:orderId` and any `GET /api/subscriptions/list/:restaurantId` response can now return `status: "PAST_DUE"`.

### Action

In the restaurant-side dashboard:

- **`ACTIVE`** → green badge, normal operation.
- **`INCOMPLETE`** → "Complete payment to activate" CTA → `/initiate` flow.
- **`CANCELLED`** → "Subscription cancelled. Resubscribe?" CTA.
- **`PAST_DUE`** → "We couldn't charge your saved card. Update payment to continue." CTA → ideally a button that calls `POST /api/payments/amwal/renew` (to retry with the existing saved card) AND a fallback button to add a new card via the SmartBox flow.
- **`EXPIRED`** → same UX as CANCELLED for now.

### Note

A restaurant in `PAST_DUE` is treated identically to expired/inactive by `requireActiveSubscription` (Change 2 from Batch 1) — they get 402 on every action endpoint until the subscription is back to `ACTIVE`. The frontend's existing 402 handler will catch them; the only new UX is showing the right message in the subscription dashboard.

---

## Change 10 — Generic 5xx error messages
**Audit ID:** I4
**Why:** previously, 500 responses echoed `err.message` directly to the client (leaking Prisma errors, file paths, stack traces). Now all 500s return a generic message and details are only logged server-side.

### Response shape on 500

```json
HTTP 500
{ "success": false, "error": "Internal server error" }
```

(Previously could be anything from `"Cannot read property 'foo' of undefined"` to `"Unique constraint failed on the fields: (\`email\`)"`.)

### Action

Don't show `response.error` text directly in the UI for 5xx responses — display a fixed "Something went wrong, please try again" message. (For 4xx, the error string is still safe to show; those are deliberate business-rule messages.)

If you have any code that branches on the exact error text from 5xx (e.g. `if (err.includes("Prisma"))`), it'll stop matching. That code was relying on a leak; rewrite to use status code + structured error fields if you need more granularity.

---

## Change 11 — List endpoints clamp `limit` to 100
**Audit ID:** I11
**Why:** `?limit=999999` used to dump the entire table. Now it's silently clamped.

### Behavior

- `?limit=999999` → silently treated as `limit=100`
- `?limit=-5` or `?limit=abc` → silently treated as default (10–50 depending on endpoint)
- `?offset=-1` → silently treated as `offset=0`

### Affected endpoints

- `GET /api/orders/list`, `/active`, `/past` — max 100
- `GET /api/orders/restaurant/:restaurantId/accepted` — max 100
- (More endpoints will adopt this as we touch them; the helper is in place for incremental rollout.)

### Action

If you were previously requesting `limit=500` to get more rows in one shot, you'll now get 100. Implement proper pagination via `offset` if you need more.

---

## Change 12 — Image uploads now validated by file content
**Audit ID:** I2
**Why:** previously the backend checked `Content-Type: image/jpeg` from the client, which is trivially spoofed. An attacker could rename `.html` to `.jpg`, set MIME to `image/jpeg`, and host arbitrary content on `/uploads`. Now the backend reads the first bytes of every saved file and rejects anything that isn't a real JPEG/PNG/GIF/WebP.

### Affected endpoints (all image-upload routes)

- `PATCH /api/users/me` (image)
- `POST /api/users/me/profile-picture`
- `POST /api/menu/create-item` (image)
- `PATCH /api/menu/update-item/:id` (image)
- `POST /api/admin/restaurants/create` (banner)
- `PATCH /api/restaurant/update/:restaurantId` (banner)
- `POST /api/restaurant/:restaurantId/promotions` (banner)
- `PUT /api/promotions/:id` (banner)
- `POST /api/cuisine/create-category/:mallId` (image)
- `PATCH /api/cuisine/update-category/:id` (image)
- `POST /api/restaurant/:restaurantId/gallery` (images, multiple)

### Response shape on rejection

```json
HTTP 400
{ "success": false, "error": "Uploaded file is not a valid image" }
```

### Action

If your frontend uses real image files from a file picker / camera, **nothing changes** — they'll pass.

If for any reason you have code that uploads non-image content via these endpoints (e.g. a placeholder string, an SVG, a PDF preview), it will now fail. Either:
- Use a real image, or
- Don't use image-upload endpoints for non-images.

### Note on SVG

SVG is **not** in the allowed list. SVGs can contain JavaScript and are an XSS vector when served from a domain that holds session cookies. If you genuinely need vector logos, add a separate, sanitized SVG endpoint.

---

## Change 13 — Push token registration log line cleaned up
**Audit ID:** I3, N14
**Why:** internal — the backend's logging no longer includes user ids or OTP codes. No frontend impact, just mentioning so support engineers know they can no longer correlate push-token registrations to user ids by tailing logs (use the DB instead).

---

---

# Batch 3 (Notable — N1–N15)

The Notable batch is mostly internal hardening. Frontend impact is small but real for the items below.

---

## Change 14 — Send `X-Requested-With` on every state-changing request
**Audit ID:** N4
**Why:** with `sameSite: "none"` cookies (required for cross-origin frontends), the browser's default CSRF defense is off. Adding a custom header that the browser refuses to send cross-origin without a CORS preflight is a simple, robust CSRF mitigation.

### What changed

Every `POST` / `PUT` / `PATCH` / `DELETE` request must now carry an `X-Requested-With` header. Without it, the backend returns:

```json
HTTP 403
{ "success": false, "error": "Missing X-Requested-With header" }
```

### Exemptions (no header needed)

- All `GET` / `HEAD` / `OPTIONS` requests
- The Amwal cloud-notification webhook (server-to-server)
- File uploads (`multipart/form-data`) — these already trigger preflight on their own

### Action

Set the header globally on your fetch / Axios client. The value can be anything; convention is `"fetch"` or `"XMLHttpRequest"`.

**Axios:**
```ts
axios.defaults.headers.common["X-Requested-With"] = "fetch";
```

**Native fetch (set per-call or in a wrapper):**
```ts
fetch(url, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "fetch",   // ← add this
  },
  body: JSON.stringify(payload),
});
```

If your existing code already uses Axios's defaults or has a single `apiClient.ts` wrapper, this is a one-line fix.

---

## Change 15 — Subscription endpoints removed; use `/payments/amwal/initiate`
**Audit ID:** N1
**Why:** there were two parallel ways to start a subscription — `POST /api/subscriptions/subscribe` and `POST /api/payments/amwal/initiate` — doing exactly the same thing. The payments-module endpoint is canonical. Since the app isn't live yet, the duplicates were deleted outright.

### What changed (these endpoints are now 404)

- `POST /api/subscriptions/subscribe` → **deleted**, use `POST /api/payments/amwal/initiate`
- `PUT  /api/subscriptions/update` → **deleted**, use `POST /api/payments/amwal/initiate`
- `POST /api/subscriptions/attach-payment-method` → **deleted** (was a 501 stub anyway; Amwal doesn't need it)

### Still available

- `POST /api/subscriptions/cancel` — unchanged
- `GET /api/subscriptions/list/:restaurantId` — unchanged

### Action

Migrate any frontend code that calls the deleted endpoints to `POST /api/payments/amwal/initiate`. Body fields and response shape are identical to the old `/subscribe`:

```ts
// Before
fetch("/api/subscriptions/subscribe", {
  method: "POST",
  // ...
  body: JSON.stringify({ restaurantId, planId }),
});

// After
fetch("/api/payments/amwal/initiate", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
  body: JSON.stringify({ restaurantId, planId }),
});
// Response: { success, subscriptionId, scriptUrl, smartbox }
```

---

## Change 16 — `SubscriptionPlan` now has a `currency` field
**Audit ID:** N3
**Why:** the platform launched OMR-only, but the schema is now ready for multi-country expansion. Plans returned via `GET /api/subscription-plans` now include a `currency` string (default `"OMR"` for existing rows).

### What changed

The plan response shape:

```json
{
  "id": "abc-123",
  "name": "Premium Monthly",
  "price": "5.000",
  "currency": "OMR",          // ← new
  "interval": "MONTHLY",
  "features": [...],
  "isActive": true,
  ...
}
```

### Action

In the UI, when you display a plan price, also render the currency:

```tsx
<span>{plan.price} {plan.currency}</span>
```

(Previously you'd hardcoded "OMR" everywhere; replacing those literals is a quick grep-and-replace.)

`currency` is an ISO-4217 alpha code: currently always `"OMR"`. If/when the platform expands, plans for new regions can be priced in `"AED"`, `"SAR"`, etc.

---

## Change 17 — Public `/api/health` and `/api/ready` endpoints
**Audit ID:** N15
**Why:** ops/monitoring need a way to check the service is alive without carrying a session cookie. **No frontend impact.**

### What changed

Two new unauthenticated endpoints:

- `GET /api/health` — quick liveness check, returns 200 with `{ status, uptime }`.
- `GET /api/ready` — readiness check (DB ping), returns 200 with `{ status: "ready" }` or 503 if Postgres is unreachable.

### Action

**Nothing for the frontend.** Just listing for completeness so support engineers know these exist for uptime checks.

---

## Quick checklist before pushing the next frontend release

### Batch 1 (C1–C10)
- [ ] Removed `userId` from every request body/query in orders, cart, checkout, delivery-address modules (Change 1)
- [ ] Added a `402` interceptor that routes restaurant users to the subscription-renewal screen (Change 2)
- [ ] Added a `429` handler showing "Try again in N minutes" with `Retry-After` countdown (Change 3)
- [ ] Added a "Too many invalid attempts" → resend OTP UI branch (Change 4)
- [ ] Verified push-token registration end-to-end on a real device (Change 5)
- [ ] All Amwal payment requests still send the auth cookie; removed any direct hits to `/test-page` (Change 6)
- [ ] No code path passes another restaurant's id to menu mutation endpoints (Change 7)

### Batch 2 (I1–I13)
- [ ] Added a `413` handler with a "content too large" message (Change 8)
- [ ] Subscription status switch handles the new `PAST_DUE` case with appropriate CTA (Change 9)
- [ ] 5xx error responses surfaced via a generic "something went wrong" message (Change 10)
- [ ] If any code passes `limit > 100`, switched to proper `offset` pagination (Change 11)
- [ ] No flow uploads non-image content to image endpoints (Change 12)

### Batch 3 (N1–N15)
- [ ] **`X-Requested-With` header set as a default on every state-changing API call** (Change 14) — this is the highest-priority Batch-3 item; without it most write requests will start returning 403
- [ ] Migrated any `POST /api/subscriptions/subscribe`, `PUT /api/subscriptions/update`, or `POST /api/subscriptions/attach-payment-method` callers to `POST /api/payments/amwal/initiate` (Change 15) — these endpoints now return 404
- [ ] Plan price UI shows `currency` next to price (Change 16)

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

1. Check the response status code first — it tells you which change is involved:
   - `401` = auth (Changes 1, 6)
   - `402` = subscription inactive/expired/PAST_DUE (Changes 2, 9)
   - `403 "Missing X-Requested-With header"` = CSRF gate, add the header (Change 14)
   - `403` = ownership / forbidden (Changes 6, 7)
   - `404` = cross-tenant or resource not found (Change 7)
   - `413` = body too large (Change 8)
   - `429` = rate-limited (Change 3)
   - `500` = generic server error — body no longer says what (Change 10)
   - `400 "Uploaded file is not a valid image"` = magic-byte rejection (Change 12)
2. Open the Network tab and confirm `Cookie: better-auth.session_token=...` is sent on the request.
3. If still stuck, ping me with the request URL, status code, and response body.

— Backend
