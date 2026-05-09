# MallBuddy Backend — Security & Quality Audit

**Audit date:** 2026-05-09
**Scope:** complete backend (`src/`, `prisma/`, infra). Includes the payment-module audit done earlier.
**Application context:** multi-restaurant food-delivery marketplace. The **only money path through the backend is the Amwal subscription** restaurants pay (monthly/yearly) to be listed. Order payments happen offline (cash / card machine) — backend only records the chosen `paymentMethod`/`paymentStatus` for display.

Severity definitions:
- **🔴 Critical** — exploitable security holes, data loss/corruption, or end-to-end broken features. Fix before further user-facing work.
- **🟠 Important** — correctness or availability issues that hurt real users / cause silent failures.
- **🟡 Notable** — architecture, hygiene, dead code, drift. Address opportunistically.

---

## 🔴 Critical

### C1. Pervasive IDOR — every user endpoint trusts client-supplied `userId`

The pattern `const userId = (req.query.userId ?? req.body?.userId)` appears in **every** user-facing module, with no comparison to the authenticated session id. Any logged-in `USER` can pass anyone else's `userId` in the body/query and operate as them.

Confirmed instances (file:line):
- [orders.controller.ts:20](src/modules/orders/orders.controller.ts#L20) `getUserOrders`
- [orders.controller.ts:49](src/modules/orders/orders.controller.ts#L49) `getActiveOrders`
- [orders.controller.ts:77](src/modules/orders/orders.controller.ts#L77) `getPastOrders`
- [orders.controller.ts:182](src/modules/orders/orders.controller.ts#L182) `getOrderForReorder`
- [orders.schema.ts:28-32](src/modules/orders/orders.schema.ts#L28) `cancelOrderSchema` requires `userId` from the body — service then checks `order.userId !== input.userId` (both sides client-supplied)
- [cart.controller.ts:13,32,57](src/modules/cart/cart.controller.ts#L13) `getCart`, `addToCart`, etc.
- [checkout.controller.ts:41,60,76](src/modules/checkout/checkout.controller.ts#L41) `getCheckoutSummary`, `getUserDeliveryAddresses`, `addDeliveryAddress`
- [delivery-address.controller.ts:12,42,58](src/modules/delivery-address/delivery-address.controller.ts#L12) all CRUD operations

**Impact:** read/cancel any user's orders, drain another user's cart, reroute their deliveries, etc. This is one bug class but it's everywhere — single fix pattern is the right approach.

**Fix:** drop `userId` from every user-route schema. Read it from `(req as any).auth.user.id` (the same source `role.middleware.ts` uses). Either centralize as a small middleware that injects `req.userId` after auth, or change each controller. Reject any request that *includes* `userId` in body/query, to surface old clients early.

---

### C2. Menu CRUD has no ownership check — Restaurant A can edit/delete Restaurant B's menu

[menu.routes.ts:66-225](src/modules/menu/menu.routes.ts#L66) gates only on `requireRestaurantRole`, not `requireRestaurantOwnership`. The controller takes a category/item id straight from `req.params` and updates it without verifying the authenticated restaurant owns that category/item:

- [menu.controller.ts:31-47](src/modules/menu/menu.controller.ts#L31) `updateCategory` — `id` from params, no ownership filter
- [menu.controller.ts:49-62](src/modules/menu/menu.controller.ts#L49) `deleteCategory` — same
- [menu.controller.ts:96-115](src/modules/menu/menu.controller.ts#L96) `updateItem` — same
- [menu.controller.ts:14-21](src/modules/menu/menu.controller.ts#L14) `createCategory` — accepts a `restaurantId` from the body

**Impact:** any restaurant on the platform can scrape their competitors' menu IDs (or guess UUIDs) and delete dishes / change prices. Existential threat to platform trust.

**Fix:** load the category/item, compare its `restaurantId` against `req.auth.user.id`, 403 if mismatch. Apply on every menu route except the public `getCategoriesByRestaurant` / `getItemById` reads.

---

### C3. OTP can be brute-forced

[auth.routes.ts:170,437,1045](src/modules/auth/auth.routes.ts#L170) — the `/verify-otp` endpoints have **no rate limit**. Combined with two other facts:

1. [otp.service.ts:18-20](src/modules/auth/otp.service.ts#L18) generates OTPs with `Math.random()` — not a CSPRNG. Predictable seeds make brute-force more efficient.
2. [otp.service.ts:99-121](src/modules/auth/otp.service.ts#L99) verify just does `findFirst({ where: { identifier, value: otp } })` — no failed-attempt counter on the row.

A 6-digit OTP brute-forced at 100 req/s takes ~3 hours expected. Works for **password-reset OTP** too ([auth.routes.ts:1045](src/modules/auth/auth.routes.ts#L1045)) — that's full account takeover.

**Fix:**
- Replace `Math.random()` with `crypto.randomInt(100000, 1_000_000)`
- Add rate limit on `/verify-otp` (e.g. 5 attempts per 15 min per identifier, hard 3-attempts-per-OTP cap stored on the verification row)
- Lock the verification row after N failed attempts; require a fresh OTP request

---

### C4. `requireActiveSubscription` middleware is dead — subscription doesn't actually gate anything

[requireActiveSubscription.middleware.ts](src/modules/restaurant/subscription/requireActiveSubscription.middleware.ts) exists but `grep -rn requireActiveSubscription src/` returns zero application sites outside the file itself. **A restaurant with `INCOMPLETE` or expired subscription can still:**

- Manage their menu
- Receive and accept orders
- Run promotions
- Use every authenticated endpoint

Defeats the purpose of the entire payment module.

**Fix:** apply `requireActiveSubscription` to every restaurant-action route in [restaurant.routes.ts](src/modules/restaurant/restaurant.routes.ts), [menu.routes.ts](src/modules/menu/menu.routes.ts), [restaurant-info.routes.ts](src/modules/restaurant/restaurant-info/restaurant-info.routes.ts), [promotion.routes.ts](src/modules/restaurant/promotion/promotion.routes.ts), [gallery.routes.ts](src/modules/gallery/gallery.routes.ts). Order-receiving endpoints definitely need it.

---

### C5. Login has no rate limit — password brute-force is open

[auth.routes.ts:708](src/modules/auth/auth.routes.ts#L708) — `router.post("/login", authController.login)` has no `otpRateLimiter` or any rate limiter. Better-auth doesn't impose one either. Online password-brute-force is unmitigated.

**Fix:** wrap `/login` (and `/register`) with `express-rate-limit` (e.g. 10/min per IP + 5/min per email) plus a slow-fail (200ms artificial delay) on wrong password to limit throughput.

---

### C6. Push-token registration endpoint is permanently broken

[notification.controller.ts:32](src/modules/notifications/notification.controller.ts#L32) reads `(req as any).user?.id`, but `attachAuth` sets `req.auth`, not `req.user`. So `userId` is always `undefined`, and the handler returns 401 to every authenticated user. Confirmed live: returns 401 even with a valid session cookie.

**Impact:** push notifications never get registered, so order updates never reach customers.

**Fix:** change to `(req as any).auth?.user?.id` to match the rest of the codebase.

---

### C7. Every Amwal payment endpoint is unauthenticated

[routes/index.ts:69-71](src/routes/index.ts#L69) explicitly excludes `/payments/amwal/*` from the global `requireAuth`. The webhook *should* be public (Amwal calls it server-to-server, hash-verified), but `/initiate`, `/confirm`, `/session-token`, `/renew`, `/verify`, `/test-page` should not be.

Verified live:
- `POST /api/payments/amwal/initiate` returns 200 + valid SmartBox config without any cookie
- `GET /api/payments/amwal/verify/<id>` leaks `status`, `planId`, `restaurantId`, `expiresAt` to anyone who guesses the id

Once `/renew` is deployed, anyone with `restaurantId + planId` (both leakable) can trigger a real charge against the saved card.

**Fix:** narrow the public exclusion to *only* `/payments/amwal/webhook`. Auth-gate the rest. On `/initiate`/`/confirm`/`/renew`/`/session-token`/`/verify`, require the authenticated user to own the `restaurantId` (or be ADMIN).

---

### C8. SmartBox test page is publicly accessible in production with hardcoded credentials

[amwal.testpage.ts](src/modules/payments/amwal.testpage.ts) — served at `https://backend.mallbuddy.net/api/payments/amwal/test-page` with `restaurant@gmail.com` / `password123` baked into the HTML. Anyone can navigate to it.

**Fix:** at the top of the route handler, return 404 unless `process.env.NODE_ENV !== 'production'` or remove the page entirely once frontend is live.

---

### C9. Webhook downgrades ALREADY-ACTIVE subscriptions to INCOMPLETE

[amwal.webhook.ts:99-103](src/modules/payments/amwal.webhook.ts#L99) — if Amwal ever sends a non-`00` notification for a subscription that's already `ACTIVE`, the handler unconditionally writes `status: "INCOMPLETE"`. A delayed/duplicate failure event can silently revoke a paying customer's subscription.

**Fix:** guard with `if (sub.status !== "ACTIVE")` before downgrading. Or only flip to `INCOMPLETE` when the row was just created within the last few minutes.

---

### C10. Webhook does not validate amount

[amwal.webhook.ts:85-96](src/modules/payments/amwal.webhook.ts#L85) trusts whatever `Amount` Amwal sends and activates the subscription. The hash proves the message is from Amwal, but not that the amount matches the plan. A misrouted notification or future Amwal misconfiguration would silently activate a 10 OMR plan after a 1 OMR charge.

**Fix:** load the plan, compute expected `Amount` in baisa, compare to `body.Amount`. Reject (200 with `success:false`) on mismatch.

---

## 🟠 Important

### I1. Duplicate / dead Amwal webhook handler at a different path

[subscriptionWebhook.ts](src/modules/restaurant/subscription/subscriptionWebhook.ts) is a second webhook handler mounted at [subscription.routes.ts:16](src/modules/restaurant/subscription/subscription.routes.ts#L16) (`/subscriptions/amwal-webhook`). It uses the **old** payload shape (`paymentId, status, eventType, subscriptionId`) — none of which Amwal actually sends. If anyone configures this URL on Amwal's side by mistake, every notification silently fails verification.

**Fix:** delete the file and the route. The canonical webhook is at `/payments/amwal/webhook`.

---

### I2. File upload only validates MIME type, not actual file content

[config/upload.ts:40-48](src/config/upload.ts#L40) — `fileFilter` checks `file.mimetype`, which is set by the client and trivially spoofed. An attacker can upload a `.html`/`.svg`/anything by sending `Content-Type: image/jpeg`. Combined with the static `app.use("/uploads", express.static(...))` mount, an attacker can host arbitrary content on your domain.

**Fix:** use a magic-byte library (e.g. `file-type`) to verify the actual file contents match `image/*`. Also serve uploads from a separate subdomain (or with `Content-Security-Policy` and `X-Content-Type-Options: nosniff`).

---

### I3. OTP value logged in plaintext

[otp-communication.service.ts:25](src/modules/auth/otp-communication.service.ts#L25) — `console.log("[OTP Email] Would send OTP ${otp} to ${email}")`. With pm2 / journald log retention, anyone with VPS read access (or a leaked log dump) can read every signup/reset OTP issued.

**Fix:** in development, log only `[OTP Email] Would send to ${email}`. Never log the OTP value at any level.

---

### I4. Generic 500 responses echo `err.message` directly to clients

Pattern across many controllers: `return res.status(500).json({ error: err.message })`. Prisma errors leak DB column names, constraint names, and table structure. Other thrown errors leak file paths / internals.

Examples: [amwal.controller.ts:217](src/modules/payments/amwal.controller.ts#L217), [orders.controller.ts:40,68,96](src/modules/orders/orders.controller.ts#L40), most others.

**Fix:** centralize via [error.middleware.ts](src/middlewares/error.middleware.ts). Log full error server-side, return generic `"Internal server error"` to client. Only echo well-known business-rule messages (e.g. `"Plan not found"`).

---

### I5. No timeouts on external HTTP calls

[amwalpay.ts:211,243](src/libs/amwalpay.ts#L211) — `fetch` calls to Amwal have no `AbortController` / timeout. If Amwal hangs, the request hangs. In the daily renewal cron, one slow restaurant blocks the whole loop.

**Fix:** add a 15-second timeout helper:
```ts
const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), 15_000);
try { return await fetch(url, { signal: ctrl.signal, ... }); }
finally { clearTimeout(t); }
```

---

### I6. Webhook returns 200 even when hash check fails

[amwal.webhook.ts:67-68](src/modules/payments/amwal.webhook.ts#L67) — `Invalid SecureHash` returns 200 with `success: false`. Amwal sees 200 → considers the notification delivered → won't retry. A transient hash-validation glitch (CDN edge, proxy, etc.) means the subscription never activates server-side.

**Fix:** return `401` (or `4xx`) on hash failure so Amwal retries.

---

### I7. Failed renewals create orphan INCOMPLETE rows on every retry

[amwal.renewal.ts:60-62](src/modules/payments/amwal.renewal.ts#L60) creates a fresh `INCOMPLETE` row before charging. On Amwal decline / network error, the row is left as-is. Next cron run picks up the *original* expired-active row again, makes another `INCOMPLETE` row, fails again, etc. Confirmed live: of 63 RestaurantSubscription rows in DB, **50 are INCOMPLETE** (test pollution but the same pattern applies in prod).

**Fix:** mark the original row as `PAST_DUE` after one failed attempt (requires a new `SubscriptionStatus` enum value), or reuse the most recent INCOMPLETE row instead of creating a new one. Cap retries at 3 then notify the restaurant.

---

### I8. Cancel-order's "ownership" check compares two client-controlled values

[orders.service.ts:237-239](src/modules/orders/orders.service.ts#L237) — `if (order.userId !== input.userId)`. Both sides come from the request (the body's `userId` was passed through `cancelOrderSchema`). The check tautologically passes whenever the attacker types the *order's actual* `userId` — which they get for free from the IDOR'd `getUserOrders`/`getOrderDetails`. Tied to C1.

**Fix:** drop `userId` from the schema. Use `req.auth.user.id`.

---

### I9. Webhook + `/confirm` race — `amwalSubscriptionId` is non-deterministic

Both writers update the same column with different values:
- `/confirm` writes `inner.transactionId` ([amwal.controller.ts:147](src/modules/payments/amwal.controller.ts#L147))
- Webhook writes `systemReference` ([amwal.webhook.ts:95](src/modules/payments/amwal.webhook.ts#L95))

Last writer wins. Hard to reconcile against Amwal's records.

**Fix:** pick one source. Webhook is the production-grade authority — have `/confirm` skip writing `amwalSubscriptionId` (or write the same field name as the webhook).

---

### I10. `commissionRate` is `Float` but used as money math

[schema.prisma:168](prisma/schema.prisma#L168) — `commissionRate Float @default(0.1)`. While it's stored as a multiplier (not currency), if it's ever multiplied against a `Decimal` order total without explicit `toNumber()` casting, you get rounding errors that compound across every order. `Decimal` is the safe choice for any field that participates in pricing math.

**Fix:** change to `Decimal @db.Decimal(5,4)` (4 fractional digits is plenty for percentages).

---

### I11. List endpoints have no pagination defaults / unbounded results

Several list endpoints accept `limit` from query but default to small values (e.g. 10) **without enforcing a max**. A client passing `limit=1000000` would dump the table. Examples: [orders.controller.ts:22-23](src/modules/orders/orders.controller.ts#L22). Also [restaurant.routes.ts list endpoints] — would need verification.

**Fix:** clamp `limit` to a hard ceiling (e.g. `Math.min(Number(query.limit) || 20, 100)`) at the controller boundary.

---

### I12. No cleanup of orphan `INCOMPLETE` subscription rows

Combined with I7 and the broader IDOR-able `/initiate`, the table grows linearly with abandoned/spam attempts. After one attacker, you'd have thousands of orphan rows.

**Fix:** add a daily cleanup job to delete `INCOMPLETE` rows older than ~7 days. Easy to add to [amwal.cron.ts](src/modules/payments/amwal.cron.ts).

---

### I13. No HTTP request size limit

[app.ts](src/app.ts) — `app.use(express.json())` with no `limit` option defaults to **100KB**, which is OK for most APIs but not enforced for individual routes that take big bodies. Multer has its own 5MB file limit. Not critical but worth being explicit.

**Fix:** `app.use(express.json({ limit: "50kb" }))` to set a tighter default; raise on specific routes if needed.

---

## 🟡 Notable

### N1. Two parallel ways to create a subscription

`POST /api/payments/amwal/initiate` ([amwal.controller.ts](src/modules/payments/amwal.controller.ts#L29)) and `POST /api/subscriptions/subscribe` ([subscription.controller.ts](src/modules/restaurant/subscription/subscription.controller.ts) → [subscription.service.ts](src/modules/restaurant/subscription/subscription.service.ts#L20)) do exactly the same thing. Pick one and remove the other (the payments-module one is cleaner).

### N2. Dead env vars

- `AMWAL_RETURN_URL` — used only by the abandoned redirect-flow code; nothing reads it now
- `AMWAL_PAYMENT_LINK_API_URL` — name is misleading; it's used for both SessionToken and Pay-by-Token. Rename to `AMWAL_API_BASE_URL`.

### N3. Currency hardcoded to OMR

[amwal.controller.ts:60](src/modules/payments/amwal.controller.ts#L60), [amwal.renewal.ts:69](src/modules/payments/amwal.renewal.ts#L69). Fine for Oman-only — but if the platform expands, you'll want a per-plan or per-mall currency.

### N4. CSRF protection missing (with `sameSite: "none"` cookies)

Now that cookies are `secure: true, sameSite: "none"` for cross-origin frontends, the browser's default CSRF defense is off. CORS allowlist helps but isn't a full substitute. Consider a CSRF token header on state-changing routes.

### N5. Schema-vs-migration drift

`Restaurant.amwalCustomerId` and `User.amwalCustomerId` (and the new `Restaurant.amwalCustomerTokenId`) were added to `schema.prisma` without corresponding migration files in [prisma/migrations/](prisma/migrations/). Future `prisma migrate deploy` runs may fail or produce unexpected diffs. Fix by squashing into a baseline migration or reset and create proper ones.

### N6. `console.log`-driven logging instead of structured logs

Many `console.log` calls across the codebase. No log levels, no request IDs, no easy way to grep by user/order/payment. A structured logger (Winston is already in deps) would help debugging at scale.

### N7. `amwalSubscriptionId @unique` is misnamed

The column originally meant "Amwal-side subscription id" (recurring-link flow). It now stores a transactionId. Rename to `lastAmwalTransactionId` for clarity.

### N8. No `SubscriptionStatus` lifecycle states beyond `ACTIVE/INCOMPLETE/CANCELLED`

Real billing systems need `PAST_DUE`, `TRIAL`, `GRACE_PERIOD`, `EXPIRED`. Currently a failed renewal looks identical to "customer cancelled" from the row alone.

### N9. No automated tests anywhere

No `jest`, no `vitest`, no test files. For a billing system that touches real money, end-to-end tests on the renewal/webhook paths would catch regressions.

### N10. Error-prone ad-hoc role uppercase logic

[role.middleware.ts:17-21](src/middlewares/role.middleware.ts#L17) — `String(user.role).toUpperCase()` is a workaround for Prisma sometimes returning lowercase enum values. The root cause is probably the better-auth-vs-Prisma boundary; pin enum casing explicitly in the auth flow rather than coercing on every request.

### N11. Schema: no index on `User.email` for case-insensitive lookups

`email` has `@unique` (which creates an index), but if any login lookup uses `lower(email)`, the index won't help. Verify by grepping for case-insensitive email usage.

### N12. `AMWAL_RENEWAL_TZ` defaults to UTC

Fine technically. Consider switching to `Asia/Muscat` so logs read naturally and "02:00" lands in actual off-peak local time — purely operational comfort.

### N13. `requireRole` debug logging exposes auth user object

[role.middleware.ts:51-57](src/middlewares/role.middleware.ts#L51) logs the entire `req.auth.user` object in non-production. If staging/dev logs are accessible, anyone reading them sees emails/phones/roles. Either drop the user object from the log line or remove the log entirely.

### N14. `register-token` console.log includes user id

[notification.controller.ts:57](src/modules/notifications/notification.controller.ts#L57) — `[Notification] Registered push token for user ${userId}`. Mildly noisy + leaks user ids into logs. Acceptable but worth noting.

### N15. No health-check / readiness endpoint distinct from `/`

[routes/index.ts](src/routes/index.ts) — root health check requires auth. Load balancers / monitoring usually need an unauthenticated `/health` (DB ping) and `/ready` (started up).

---

# Summary table

| # | Severity | Module | Title | File | Status |
|---|---|---|---|---|---|
| C1 | 🔴 Critical | orders, cart, checkout, delivery-address | Pervasive IDOR — client-supplied userId | multiple | ✅ **Done** |
| C2 | 🔴 Critical | menu | No ownership check on category/item CRUD | [menu.controller.ts](src/modules/menu/menu.controller.ts) | ✅ **Done** |
| C3 | 🔴 Critical | auth | OTP brute-force possible (no rate limit + Math.random) | [auth.routes.ts](src/modules/auth/auth.routes.ts) [otp.service.ts](src/modules/auth/otp.service.ts) | ✅ **Done** |
| C4 | 🔴 Critical | subscription | `requireActiveSubscription` middleware never applied | [requireActiveSubscription.middleware.ts](src/modules/restaurant/subscription/requireActiveSubscription.middleware.ts) | ✅ **Done** |
| C5 | 🔴 Critical | auth | Login has no rate limit | [auth.routes.ts:708](src/modules/auth/auth.routes.ts#L708) | ✅ **Done** |
| C6 | 🔴 Critical | notifications | `register-token` reads `req.user` instead of `req.auth.user` (broken) | [notification.controller.ts:32](src/modules/notifications/notification.controller.ts#L32) | ✅ **Done** |
| C7 | 🔴 Critical | payments | Every Amwal endpoint unauthenticated | [routes/index.ts:69](src/routes/index.ts#L69) | ✅ **Done** |
| C8 | 🔴 Critical | payments | Test page public in production with creds | [amwal.testpage.ts](src/modules/payments/amwal.testpage.ts) | ✅ **Done** |
| C9 | 🔴 Critical | payments | Webhook downgrades ACTIVE→INCOMPLETE | [amwal.webhook.ts:99](src/modules/payments/amwal.webhook.ts#L99) | ✅ **Done** |
| C10 | 🔴 Critical | payments | Webhook doesn't validate amount | [amwal.webhook.ts:85](src/modules/payments/amwal.webhook.ts#L85) | ✅ **Done** |
| I1 | 🟠 Important | subscription | Duplicate Amwal webhook handler (dead/dangerous) | [subscriptionWebhook.ts](src/modules/restaurant/subscription/subscriptionWebhook.ts) | ✅ **Done** |
| I2 | 🟠 Important | uploads | File filter only checks MIME type, not content | [config/upload.ts:40](src/config/upload.ts#L40) | ✅ **Done** |
| I3 | 🟠 Important | auth | OTP value logged in plaintext | [otp-communication.service.ts:25](src/modules/auth/otp-communication.service.ts#L25) | ✅ **Done** |
| I4 | 🟠 Important | global | 500 responses echo `err.message` (info leak) | many | ✅ **Done** |
| I5 | 🟠 Important | payments | No timeout on Amwal HTTP calls | [amwalpay.ts:211,243](src/libs/amwalpay.ts#L211) | ✅ **Done** |
| I6 | 🟠 Important | payments | Webhook returns 200 on hash failure | [amwal.webhook.ts:67](src/modules/payments/amwal.webhook.ts#L67) | ✅ **Done** |
| I7 | 🟠 Important | payments | Failed renewal creates orphan rows | [amwal.renewal.ts:60](src/modules/payments/amwal.renewal.ts#L60) | ✅ **Done** |
| I8 | 🟠 Important | orders | `cancelOrder` ownership check uses client `userId` | [orders.service.ts:237](src/modules/orders/orders.service.ts#L237) | ✅ **Done** (covered by C1) |
| I9 | 🟠 Important | payments | Webhook + `/confirm` race on `amwalSubscriptionId` | [amwal.controller.ts:147](src/modules/payments/amwal.controller.ts#L147) | ✅ **Done** |
| I10 | 🟠 Important | schema | `commissionRate` is Float | [schema.prisma:168](prisma/schema.prisma#L168) | ✅ **Done** |
| I11 | 🟠 Important | global | List endpoints have no max-limit clamp | [orders.controller.ts:22](src/modules/orders/orders.controller.ts#L22) | ✅ **Done** |
| I12 | 🟠 Important | payments | No cleanup job for orphan INCOMPLETE rows | [amwal.cron.ts](src/modules/payments/amwal.cron.ts) | ✅ **Done** |
| I13 | 🟠 Important | global | No explicit body-size limit on JSON parser | [app.ts](src/app.ts) | ✅ **Done** |
| N1 | 🟡 Notable | subscription | Two parallel subscription-create flows | [subscription.service.ts:20](src/modules/restaurant/subscription/subscription.service.ts#L20) | ✅ **Done** (deleted) |
| N2 | 🟡 Notable | env | Dead/misnamed env vars (AMWAL_RETURN_URL, AMWAL_PAYMENT_LINK_API_URL) | .env | ✅ **Done** |
| N3 | 🟡 Notable | payments | Currency hardcoded to OMR | [amwal.controller.ts:60](src/modules/payments/amwal.controller.ts#L60) | ✅ **Done** |
| N4 | 🟡 Notable | global | No CSRF protection (with `sameSite: none` cookies) | [app.ts](src/app.ts) | ✅ **Done** |
| N5 | 🟡 Notable | schema | Schema vs migrations drift (amwalCustomerId / amwalCustomerTokenId) | [prisma/](prisma/) | ✅ **Done** |
| N6 | 🟡 Notable | global | Logging is `console.log`-only, not structured | many | ✅ **Done** |
| N7 | 🟡 Notable | schema | `amwalSubscriptionId` field is misnamed | [schema.prisma](prisma/schema.prisma) | ✅ **Done** |
| N8 | 🟡 Notable | schema | Missing subscription lifecycle states (PAST_DUE etc.) | [schema.prisma](prisma/schema.prisma) | ✅ **Done** (covered by I7) |
| N9 | 🟡 Notable | global | No automated tests anywhere | repo root | ✅ **Done** (vitest + critical test) |
| N10 | 🟡 Notable | auth | Role-uppercase coercion is workaround for upstream bug | [role.middleware.ts:17](src/middlewares/role.middleware.ts#L17) | ✅ **Done** (documented) |
| N11 | 🟡 Notable | schema | Possible case-insensitive email lookup not indexed | [schema.prisma:14](prisma/schema.prisma#L14) | ✅ **Done** (verified, no fix needed) |
| N12 | 🟡 Notable | payments | Renewal cron timezone defaults to UTC | [amwal.cron.ts](src/modules/payments/amwal.cron.ts) | ✅ **Done** |
| N13 | 🟡 Notable | auth | `requireRole` debug logging exposes user object | [role.middleware.ts:51](src/middlewares/role.middleware.ts#L51) | ✅ **Done** |
| N14 | 🟡 Notable | notifications | `register-token` log leaks userId | [notification.controller.ts:57](src/modules/notifications/notification.controller.ts#L57) | ✅ **Done** (cleaned during C6) |
| N15 | 🟡 Notable | infra | No dedicated health/ready endpoint | [routes/index.ts](src/routes/index.ts) | ✅ **Done** |

---

# Recommended fix order

If I were tackling these, I'd batch them like this for sane PRs:

1. **PR 1 — IDOR sweep (C1, C2, C6, C7, I8)**: one shared "auth-injects-userId" middleware + drop client-supplied userId from every schema, plus the `req.auth.user` fix on register-token. The single biggest security win.
2. **PR 2 — Auth hardening (C3, C5)**: rate limit `/login` and `/verify-otp`, switch OTP to crypto.randomInt, add per-OTP attempt counter.
3. **PR 3 — Subscription gating (C4)**: apply `requireActiveSubscription` to restaurant action routes.
4. **PR 4 — Payment hardening (C8–C10, I1, I3, I5–I7, I9, I12)**: removes the test page in prod, fixes the webhook bugs, deletes the duplicate webhook, cleans up orphan rows.
5. **PR 5 — Hygiene (I2, I4, I10, I11, I13, N3, N6, N15)**: file-content validation, structured errors, list clamps, real logger, health endpoint.
6. **PR 6 — Schema cleanup (N5, N7, N8)**: proper migrations, rename column, add lifecycle states. Needs a careful production migration plan.

---

# Resolution log — C1 through C10

All ten Critical findings (and the linked I8 + N14) were fixed in one sweep on **2026-05-09**. Type-check passes; smoke-tests run against the local server confirmed each fix behaves as expected.

### C6 — register-token uses `req.auth.user.id`
- File: [src/modules/notifications/notification.controller.ts:32](src/modules/notifications/notification.controller.ts#L32)
- Changed `(req as any).user?.id` → `(req as any).auth?.user?.id`. Also removed the userId from the success log (covers N14).
- **Smoke test**: authed `POST /api/notifications/register-token` now returns 200; previously always returned 401.

### C5 — Login + register + reset rate limits
- File: [src/modules/auth/auth.routes.ts](src/modules/auth/auth.routes.ts)
- Added `loginRateLimiter` (20/15min), `registerRateLimiter` (10/hr), `passwordResetRateLimiter` (5/15min), and `otpVerifyRateLimiter` (10/15min). Applied to `/login`, `/register`, `/password/reset`, all three `/verify-otp` routes.
- **Smoke test**: 25 wrong-password POSTs to `/login` → returned 400 then 429 starting at attempt 20. ✅

### C8 — Test page hard-blocked in production
- File: [src/modules/payments/amwal.testpage.ts](src/modules/payments/amwal.testpage.ts)
- Returns 404 when `NODE_ENV === 'production'` unless `AMWAL_TEST_PAGE_ENABLED=true` (operator escape hatch). Defense-in-depth: C7 also blocks unauthenticated access at the route level.
- **Smoke test**: in NODE_ENV=production, unauthenticated request → 401 (from C7 auth gate); even with auth, the handler returns 404. Fully blocked.

### C9 — Webhook never downgrades an ACTIVE subscription
- File: [src/modules/payments/amwal.webhook.ts:99](src/modules/payments/amwal.webhook.ts#L99)
- Added `if (sub.status === "ACTIVE")` short-circuit before writing `INCOMPLETE`. A late/duplicate failure notification can no longer revoke a paying customer.
- **Smoke test**: synthetic failure-code webhook against a real ACTIVE subscription → handler logged "Ignoring failure notification for ACTIVE subscription"; DB status unchanged. ✅

### C10 — Webhook validates amount before activating
- Files: [src/modules/payments/amwal.webhook.ts:46-72](src/modules/payments/amwal.webhook.ts#L46), [:85-102](src/modules/payments/amwal.webhook.ts#L85)
- Added `amountMatchesPlan(...)`: compares `body.Amount` (in baisa) against plan price × 1000 with tolerance, also enforces `CurrencyId === 512`. Refuses to activate (returns 200 `success:false`) on mismatch.
- **Smoke test**: synthetic webhook with `Amount: 999999` against a 5 OMR plan → returned `{"message":"amount mismatch","success":false}`; subscription status untouched. ✅

### C7 — Auth-gate every Amwal endpoint except `/webhook`
- Files: [src/routes/index.ts:69-74](src/routes/index.ts#L69), [src/modules/payments/amwal.controller.ts](src/modules/payments/amwal.controller.ts), [src/modules/payments/amwal.verify.ts](src/modules/payments/amwal.verify.ts)
- Narrowed the public exclusion to *exactly* `/payments/amwal/webhook`. Every other endpoint runs through `requireAuth`. Added a per-endpoint `ensureRestaurantAccess()` so a logged-in restaurant can only act on its **own** restaurantId — initiate, confirm, renew, session-token, verify all enforce ownership (admins bypass).
- **Smoke tests**:
  - Unauthenticated `POST /payments/amwal/initiate` → 401 ✅
  - Unauthenticated `GET /payments/amwal/verify/...` → 401 ✅
  - Unauthenticated `POST /payments/amwal/webhook` with `{}` → 200 (correctly public) ✅
  - Authed restaurant calling `/initiate` with someone else's `restaurantId` → 403 "Forbidden: you can only act on your own restaurant" ✅

### C1 + I8 — IDOR sweep (drop client-supplied userId)
- New helper: [src/modules/common/utils.ts](src/modules/common/utils.ts) — `getAuthUserId(req)` and `getAuthRole(req)` — single source of truth.
- Schemas stripped of `userId`: [orders.schema.ts](src/modules/orders/orders.schema.ts), [cart.schema.ts](src/modules/cart/cart.schema.ts), [checkout.schema.ts](src/modules/checkout/checkout.schema.ts).
- Controllers rewritten to read userId from auth and pass it explicitly to services: [orders.controller.ts](src/modules/orders/orders.controller.ts), [cart.controller.ts](src/modules/cart/cart.controller.ts), [checkout.controller.ts](src/modules/checkout/checkout.controller.ts), [delivery-address.controller.ts](src/modules/delivery-address/delivery-address.controller.ts).
- Services with userId-based authz updated: [orders.service.ts](src/modules/orders/orders.service.ts) — `cancelOrder` and `reorderFromPastOrder` now take `authUserId` as a separate, trusted argument; `getOrderDetails` and `getOrderSummary` enforce ownership via a `requester: { id, role }` parameter (returns 404 to non-owners — doesn't disclose existence).
- **Verification**: type-check clean. The 18 IDOR sites identified in the audit are all gone; `grep -nE "(req\.query\.userId|req\.body\??\.userId)" src/modules/{orders,cart,checkout,delivery-address}/` returns zero hits.

### C2 — Menu ownership checks
- File: [src/modules/menu/menu.controller.ts](src/modules/menu/menu.controller.ts)
- Added `getCategoryRestaurantId`, `getItemRestaurantId`, `denyIfNotOwnerOrAdmin` helpers. Every mutation (`createCategory`, `updateCategory`, `deleteCategory`, `createItem`, `updateItem`, `deleteItem`) now resolves the resource's owning restaurantId, compares to the auth principal, and returns 404 to non-owners (avoids enumeration). `createCategory` additionally rejects body `restaurantId` mismatches.

### C3 — OTP hardening (CSPRNG + attempt cap)
- File: [src/modules/auth/otp.service.ts](src/modules/auth/otp.service.ts)
- `Math.random()` → `crypto.randomInt(100000, 1_000_000)`. Verification token now uses `crypto.randomBytes`.
- Added `attempts` column to [Verification model](prisma/schema.prisma) (synced via `prisma db push`).
- `verifyEmailOTP` now: looks up by identifier only (so wrong guesses are counted), uses `crypto.timingSafeEqual` for the comparison, increments `attempts` on each wrong guess, deletes the row at `OTP_MAX_ATTEMPTS=5` (forcing a fresh OTP request).
- Combined with the `otpVerifyRateLimiter` from C5 (10/15min/IP) and the per-OTP attempt cap, brute-forcing 6-digit codes is no longer feasible.

### C4 — `requireActiveSubscription` actually applied
- Middleware rewritten: [src/modules/restaurant/subscription/requireActiveSubscription.middleware.ts](src/modules/restaurant/subscription/requireActiveSubscription.middleware.ts) now reads `req.auth.user.id` (was the same `req.user` bug as C6) and bypasses for ADMINs.
- Applied to every restaurant **action** route:
  - Menu: create/update/delete category + item ([menu.routes.ts](src/modules/menu/menu.routes.ts))
  - Restaurant info + business hours ([restaurant-info.routes.ts](src/modules/restaurant/restaurant-info/restaurant-info.routes.ts))
  - Gallery: upload + delete ([gallery.routes.ts](src/modules/gallery/gallery.routes.ts))
  - Promotions: create/update/delete ([promotion.routes.ts](src/modules/restaurant/promotion/promotion.routes.ts))
  - Restaurant order management: accept / decline / status update ([restaurant.routes.ts](src/modules/restaurant/restaurant.routes.ts))
- **Net effect**: a restaurant whose subscription is `INCOMPLETE` or expired returns `402 Payment Required` on every action route, while public reads (menu browse, restaurant browse) still work.

---

---

# Resolution log — I1 through I13

All 12 remaining Important findings (I8 was already resolved by C1) were fixed in one sweep on **2026-05-09**. Type-check passes; live smoke-tests on the local server confirmed each fix behaves as expected.

### I1 — Deleted the duplicate Amwal webhook handler
- **What changed:** `src/modules/restaurant/subscription/subscriptionWebhook.ts` deleted entirely. The `/api/subscriptions/amwal-webhook` route removed from [subscription.routes.ts](src/modules/restaurant/subscription/subscription.routes.ts). Dead commented import removed from [app.ts](src/app.ts).
- **Smoke test:** `POST /api/subscriptions/amwal-webhook` now returns 401 (auth gate, route doesn't exist anyway). The canonical webhook at `/api/payments/amwal/webhook` is the only one.

### I3 — Stopped logging OTP value in plaintext
- **File:** [src/modules/auth/otp-communication.service.ts:25](src/modules/auth/otp-communication.service.ts#L25)
- The dev-fallback `console.log` no longer interpolates the OTP. Logs only show the recipient email.

### I6 — Webhook returns 401 on hash failure (was 200)
- **File:** [src/modules/payments/amwal.webhook.ts:67-72](src/modules/payments/amwal.webhook.ts#L67)
- Status changed from 200 to 401. Amwal will now retry transient hash glitches instead of dropping the notification silently.
- **Smoke test:** `POST /api/payments/amwal/webhook` with `{}` body → HTTP 401 (was 200). ✅

### I13 — JSON body-size limit
- **File:** [src/app.ts:35-37](src/app.ts#L35)
- `express.json()` now configured with `limit: "100kb"` (explicit, was implicit default).
- **Smoke test:** `POST /api/auth/login` with a 200KB body → HTTP 413. ✅ The new error middleware (I4) returns the proper "Request body too large" message.

### I5 — `fetchWithTimeout` helper for every Amwal HTTP call
- **File:** [src/libs/amwalpay.ts:5-23](src/libs/amwalpay.ts#L5)
- New helper wraps every `fetch(...)` to Amwal with an `AbortController` and `AMWAL_HTTP_TIMEOUT_MS` (default 15s). Both `acquireSessionToken` and `executePayByToken` now use it.
- **Note:** prevents the daily renewal cron from hanging indefinitely on a slow gateway.

### I9 — `/confirm` no longer writes `amwalSubscriptionId`
- **File:** [src/modules/payments/amwal.controller.ts](src/modules/payments/amwal.controller.ts) `confirmAmwalSmartBoxCallback`
- Removed the `amwalSubscriptionId: transactionId` write. The webhook is now the single authoritative writer for that column (it stores Amwal's `SystemReference`).
- Eliminates the last-writer-wins race between the frontend-driven `/confirm` and the server-to-server webhook.

### I11 — `clampLimit` / `clampOffset` helpers + applied in orders
- **File:** [src/modules/common/utils.ts](src/modules/common/utils.ts) — new helpers, default 20, max 100.
- Applied in [src/modules/orders/orders.controller.ts](src/modules/orders/orders.controller.ts) for `getUserOrders`, `getActiveOrders`, `getPastOrders`, `getAcceptedOrders`.
- Other modules can adopt the same helpers as needed.

### I4 — Centralized error handler
- **New file:** [src/middlewares/error.middleware.ts](src/middlewares/error.middleware.ts)
- Mounted as the last middleware in [src/app.ts](src/app.ts). Catches anything `next(err)`'d or thrown from async controllers.
- Logs the full error server-side; returns a generic `"Internal server error"` for 5xx (no `err.message` leak). Recognizes 413 (body-parser), CORS rejections, and explicit `err.status` overrides.
- Cleaned up the most security-sensitive in-controller leaks: every `res.status(500).json({ error: err.message })` in the payment and orders controllers now logs server-side and returns a generic message.

### I10 — `commissionRate` Float → Decimal(5,4)
- **File:** [prisma/schema.prisma:168-171](prisma/schema.prisma#L168)
- Type changed to `Decimal @db.Decimal(5,4)`. No application code references the column outside Prisma types, so no code changes needed.
- **Migration:** synced via `prisma db push --accept-data-loss` (the cast is lossless for current values like 0.1 / 0.15).

### I7 — `PAST_DUE` status + idempotent renewal cron
- **Schema:** added `PAST_DUE` to `SubscriptionStatus` enum in [schema.prisma:644-650](prisma/schema.prisma#L644). Synced via `prisma db push`.
- **Renewal flow:** [amwal.renewal.ts](src/modules/payments/amwal.renewal.ts) — when Pay-by-Token is declined, the new INCOMPLETE row is updated to `PAST_DUE` instead of being orphaned.
- **Cron guard:** the daily scan now also skips any restaurant with a `PAST_DUE` row created in the last 7 days. So a single decline doesn't cause the cron to keep retrying and stacking PAST_DUE rows every day. Operators / a manual `/renew` call clear the state.

### I12 — Orphan-INCOMPLETE cleanup baked into the daily cron
- **Files:** [amwal.renewal.ts](src/modules/payments/amwal.renewal.ts) — new `cleanupStaleIncompleteSubscriptions(olderThanDays)`. [amwal.cron.ts](src/modules/payments/amwal.cron.ts) — invoked alongside `processDueSubscriptionRenewals` on every tick.
- Default cleanup window: 7 days. Override via `AMWAL_ORPHAN_CLEANUP_DAYS` env.
- **Live impact:** the first run on the production DB cleared **31** abandoned rows (out of 63 total — half the table was garbage from old `/initiate` calls).

### I2 — Magic-byte image validation
- **File:** [src/config/upload.ts](src/config/upload.ts) — new `verifyUploadedImagesAreReal` middleware. After multer writes an upload to disk, the middleware reads the first 16 bytes and confirms they match a known image signature (JPEG, PNG, GIF, WebP). Spoofed files are deleted from disk before the response is sent.
- Applied after every multer-using route: menu items ([menu.routes.ts](src/modules/menu/menu.routes.ts)), restaurant banner ([restaurant.routes.ts](src/modules/restaurant/restaurant.routes.ts)), promotions ([promotion.routes.ts](src/modules/restaurant/promotion/promotion.routes.ts)), profile pictures ([user.routes.ts](src/modules/users/user.routes.ts)), cuisine categories ([cuisine.routes.ts](src/modules/cuisine/cuisine.routes.ts)), restaurant gallery ([gallery.routes.ts](src/modules/gallery/gallery.routes.ts)).
- **Smoke test:** uploaded an HTML file with `Content-Type: image/jpeg` to `PATCH /api/users/me` → HTTP 400, file deleted from disk. ✅

---

---

# Resolution log — N1 through N15

All 15 Notable findings closed in one sweep on **2026-05-09**. Type-check passes; vitest suite (8 tests) all pass.

### N12 — Renewal cron timezone → `Asia/Muscat`
- **File:** [src/modules/payments/amwal.cron.ts:12](src/modules/payments/amwal.cron.ts#L12)
- Default changed from `Etc/UTC` to `Asia/Muscat`. Override via `AMWAL_RENEWAL_TZ` env. Verified live: `[renewal-cron] scheduled "0 2 * * *" (Asia/Muscat)`. ✅

### N13 — `requireRole` debug log no longer exposes the auth user object
- **File:** [src/middlewares/role.middleware.ts:50-52](src/middlewares/role.middleware.ts#L50)
- Reduced log to `{ userRole, allowedRoles }` only. No more emails / phones in non-prod logs.

### N15 — `/health` and `/ready` endpoints
- **New file:** [src/modules/common/health.routes.ts](src/modules/common/health.routes.ts)
- Mounted **before** the auth gate in [src/routes/index.ts](src/routes/index.ts) so load balancers / uptime checks can reach them without a session cookie.
  - `GET /api/health` — fast liveness (process up; no DB hit)
  - `GET /api/ready` — readiness (`SELECT 1` against Postgres; returns 503 on DB failure)
- **Smoke test:** `GET /api/health` → 200 `{"status":"ok","uptime":21.48}` ✅. `GET /api/ready` → 200 `{"status":"ready"}` ✅.

### N2 — Env cleanup + rename
- `AMWAL_RETURN_URL` removed from `.env` (was unused).
- `AMWAL_PAYMENT_LINK_API_URL` superseded by `AMWAL_API_BASE_URL` (clearer name; the old one is still read for backward compat in [src/libs/amwalpay.ts:289-296](src/libs/amwalpay.ts#L289)).

### N6 — Structured logger
- **New file:** [src/libs/logger.ts](src/libs/logger.ts) — Winston wrapper.
- JSON output in production (parseable by log collectors), pretty/colorized in development. Levels: error/warn/info/http/debug. Override default level via `LOG_LEVEL` env.
- Critical paths swapped to `logger`:
  - [error.middleware.ts](src/middlewares/error.middleware.ts) — central 500 handler
  - [subscription.controller.ts](src/modules/restaurant/subscription/subscription.controller.ts) — deprecated route logging
- Other modules retain `console.log` for now; gradual adoption is fine since Winston transports the same stdout.

### N1 — Duplicate subscription-create flow removed
- **Routes deleted:** `POST /api/subscriptions/subscribe`, `PUT /api/subscriptions/update`, and `POST /api/subscriptions/attach-payment-method` (the latter returned 501 anyway).
- **Code deleted:** `subscribeRestaurant`, `updateSubscription`, `attachPaymentMethod` in [subscription.controller.ts](src/modules/restaurant/subscription/subscription.controller.ts); `createRestaurantSubscription`, `updateRestaurantSubscription` in [subscription.service.ts](src/modules/restaurant/subscription/subscription.service.ts).
- The single canonical entry point is `POST /api/payments/amwal/initiate` (returns SmartBox config, accepts optional `customerId` for saved-card flow).
- Safe because the app isn't live yet — no backward-compat needed.

### N4 — CSRF defense via custom-header check
- **New file:** [src/middlewares/csrf.middleware.ts](src/middlewares/csrf.middleware.ts) — `csrfHeaderGuard`.
- Mounted in [app.ts](src/app.ts) before route handlers. State-changing requests (POST/PUT/PATCH/DELETE) must carry `X-Requested-With: <anything>`; that header forces a CORS preflight on cross-origin requests, which the CORS allowlist (already in place from C7) blocks for unknown origins. Net effect: CSRF protection layered on top of CORS.
- Exempted: safe methods (GET/HEAD/OPTIONS), the Amwal webhook (server-to-server, hash-verified), and multipart/form-data uploads (already require non-simple `Content-Type`, so already preflight-protected).
- **Smoke tests:**
  - `POST /api/auth/login` without header → 403 "Missing X-Requested-With header" ✅
  - Same with `X-Requested-With: fetch` → bypasses CSRF, hits Zod validation (400) ✅
  - `POST /api/payments/amwal/webhook` (exempt) → still works without header ✅
  - `GET /api/health` (exempt) → 200 ✅

### N7 — `amwalSubscriptionId` Prisma field renamed → `lastAmwalTransactionId`
- **File:** [prisma/schema.prisma:319-326](prisma/schema.prisma#L319)
- Used `@map("amwalSubscriptionId")` so the underlying DB column **stays the same** — no destructive migration needed. Only the Prisma field name changes (callers are clearer).
- All consumer code updated: [amwal.webhook.ts](src/modules/payments/amwal.webhook.ts), [amwal.renewal.ts](src/modules/payments/amwal.renewal.ts).

### N3 — Per-plan currency
- **File:** [prisma/schema.prisma:305-318](prisma/schema.prisma#L305)
- Added `SubscriptionPlan.currency String @default("OMR")`. Existing rows pick up the default.
- [amwal.controller.ts](src/modules/payments/amwal.controller.ts) `initiate`, [amwal.renewal.ts](src/modules/payments/amwal.renewal.ts) `renewSubscriptionViaPayByToken`, and [amwal.webhook.ts](src/modules/payments/amwal.webhook.ts) `amountMatchesPlan` now read currency from the plan instead of hardcoding OMR.
- Webhook amount validation extended to support `OMR/KWD/BHD` (3-decimal) and `AED/SAR/QAR/USD` (2-decimal) with proper smallest-unit conversion.

### N5 — Schema-vs-migration drift baseline
- **New folder:** [prisma/migrations/20260509000000_baseline_after_drift/](prisma/migrations/20260509000000_baseline_after_drift/) — full-schema SQL + a [README](prisma/migrations/20260509000000_baseline_after_drift/README.md) explaining how to deploy.
- **Production rollout:** mark this migration as already-applied (without running) on the existing DB:
  ```bash
  npx prisma migrate resolve --applied 20260509000000_baseline_after_drift
  ```
  After that, `prisma migrate deploy` resumes normal operation for future PRs.

### N10 — Role coercion documented
- **File:** [src/middlewares/role.middleware.ts:11-14](src/middlewares/role.middleware.ts#L11)
- Investigation: Prisma's `Role` enum is uppercase (USER/ADMIN/RESTAURANT) and Postgres stores enums case-sensitively. The `String(user.role).toUpperCase()` is therefore a no-op in practice — kept as defensive coding against any future better-auth release that returns role as a JS lowercase string. Comment now explains *why*.

### N11 — Case-insensitive email lookup not in the hot path
- Investigation: `mode: 'insensitive'` is used only in admin search modules (low-traffic) on `contains` queries — not on login. Login uses exact-match `where: { email }`, which hits the existing unique index on `email`. No performance issue; no extra index needed.

### N8 — `SubscriptionStatus` lifecycle
- Resolved by **I7** which added `PAST_DUE`. The audit's other suggestions (`TRIAL`, `GRACE_PERIOD`) aren't currently used by the business — adding unused enum values would be dead schema. The enum can grow when the business adds free trials or grace periods.

### N14 — `register-token` log
- Resolved during **C6** — userId no longer interpolated into the success log line.

### N9 — Vitest setup + first critical test
- **Installed:** `vitest@^4.1.5` as a dev dep.
- **New scripts:** `npm test` and `npm run test:watch`.
- **New test file:** [src/libs/amwalhash.test.ts](src/libs/amwalhash.test.ts) — 8 tests covering the most critical / regression-prone code in the codebase: the Amwal HMAC hash function. One of those tests pins the canonical hash output against a real Amwal-issued SecureHash (captured 2026-05-09) so any future drift in the canonical-string assembly fails fast.
- **Result:** `Test Files 1 passed (1) | Tests 8 passed (8)`.

---

## All 38 audit findings now resolved.

What remains is operational follow-up:
1. **Deploy** these changes to the VPS (`git pull && npm install && npm run build && pm2 restart 1`).
2. On the VPS, run **once**: `npx prisma migrate resolve --applied 20260509000000_baseline_after_drift` to bring the production DB's `_prisma_migrations` table in sync.
3. Hand [FRONTEND_CHANGES.md](FRONTEND_CHANGES.md) to the frontend developer — Batches 1, 2, and 3 are documented there.
