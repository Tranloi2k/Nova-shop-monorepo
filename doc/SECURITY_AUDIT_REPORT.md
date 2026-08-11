# NovaShop Security & Business Logic Audit Report

**Date:** 2026-06-20
**Scope:** `Nova-online-shopping-nextjs` (Next.js frontend) + `Nova-shop-Nestjs` (NestJS backend)
**Method:** Manual code audit of controllers, services, resolvers, DTOs, entities, guards, and client-side checkout/auth flows.

---

## Summary

The project shows good instincts in some places (the cart-checkout path correctly re-derives prices server-side) but several critical trust-boundary and authorization gaps exist across both the frontend and backend. The most severe issues allow price tampering at checkout, order/account takeover via a forgeable cookie, and unauthenticated catalog modification via GraphQL.

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 5 |
| Medium | 6 |
| Low | 5 |

---

## 🔴 Critical

### 1. Price tampering on checkout (frontend + backend both fail independently)

**Problem (frontend):** `app/api/checkout/route.ts` reads `price` and `quantity` directly from the POST body for the "Buy Now" flow and passes them straight to Stripe (`app/lib/checkout-sessions.ts: createProductCheckoutSession`). There is no server-side lookup of the real product price. `app/ui/products/BuyNowButton.tsx` sends `price: product.price` from client-side state — trivially editable via DevTools or a replayed/modified fetch.

Contrast with `app/api/checkout/cart/route.ts`, which correctly re-derives prices server-side via `getCartSummary()` — proving the team already knows the right pattern, it just wasn't applied to "Buy Now".

**Problem (backend):** `order.service.ts` persists `total: dto.total` directly from the request body (`CreateOrderDto.total`). Nothing sums `cartItem.price * quantity` server-side to cross-check it. Even if the frontend is fixed, a direct API call can still set an arbitrary total.

**Impact:** Anyone can purchase any product for any price (e.g. $0.01).

**Solution:**
- Frontend: in `app/api/checkout/route.ts`, look up the authoritative product price via the existing `getProduct`-style service (`app/lib/services/products.ts`) instead of trusting the request body. Only accept `productId` and `quantity` from the client.
- Backend: in `order.service.ts`, remove `dto.total` from `CreateOrderDto` entirely (or ignore it). Recompute the order total inside the transaction from the live `Product.price` (or the Stripe session's `amount_total` once payment is confirmed — see Finding #9) before persisting.

---

### 2. Order/user identity forgeable via a plain, unsigned cookie

**Problem:** `app/lib/auth-tokens.ts` sets the `user_id` cookie without `httpOnly` and without any signing/HMAC:
```ts
cookieStore.set({ name: USER_ID_COOKIE, value: String(tokens.userId), path: "/", maxAge: ... })
```
`app/checkout/success/actions.ts` reads `userId` from this cookie and calls `confirmOrder(userId, {...})`, which POSTs to `/user/${userId}/orders` on the backend.

**Impact:** Any script (XSS) or direct cookie edit lets an attacker set `user_id` to another user's ID and have orders attributed to that account. The frontend exerts no defense-in-depth — it fully relies on whatever the backend does with the Bearer token independently of this cookie.

**Solution:**
- Stop reading `userId` from a plain cookie. Derive the user id from the verified session (`auth()` / the JWT already used for the Bearer token) inside the Server Action, never from client-readable cookie state.
- If a cookie must carry the user id, make it `httpOnly`, `secure`, and signed (e.g. embed it in the session JWT instead of a separate cookie).

---

### 3. GraphQL mutations have zero authentication

**Problem:** `src/modules/products/product.resolver.ts` (`createProduct`, `deleteProduct`) and `src/modules/reviews/reviews.resolver.ts` (`createReview`, `updateReview`, `deleteReview`) have no `@UseGuards(JwtAuthGuard)` at all — contrast with the REST `ProductsController`, which at least requires a valid JWT. GraphQL Playground is also left enabled (`src/app.module.ts`: `playground: true`).

**Impact:** Any anonymous internet user can open `/graphql` and create/delete arbitrary products, or post/edit/delete reviews as anyone.

**Solution:**
- Add `@UseGuards(JwtAuthGuard)` to every mutation in both resolvers.
- Add a `RolesGuard` + `@Roles('admin')` on `createProduct`/`deleteProduct` (see Finding #5).
- Add an ownership check in `reviews.service.ts` so `update`/`remove` verify `review.userId === currentUser.id` before mutating.
- Disable `playground` in non-development environments.

---

### 4. No global `ValidationPipe` in the NestJS backend — all DTO validation is dead code

**Problem:** `src/main.ts` never calls `app.useGlobalPipes(new ValidationPipe(...))`. Every `class-validator` decorator (`@IsNotEmpty`, `@IsNumber`, `@Min(1)`, `@IsPositive`, `@IsIn`, etc.) across every DTO (`add-to-cart.dto.ts`, `create-order.dto.ts`, `query-product.dto.ts`, etc.) is never actually enforced by Nest.

**Impact:** Negative/zero/string quantities, unvalidated emails, unbounded pagination limits, and malformed payloads all pass straight through to business logic, corrupting totals and stock math.

**Solution:** Add to `main.ts`:
```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```
This is the single highest-leverage fix in the backend — it immediately activates every validation decorator already written across the codebase.

---

## 🟠 High

### 5. No role/admin system exists at all

**Problem:** `User` entity has no `role` column. `products.controller.ts`'s `POST /products` and `DELETE /products/:id` are gated only by `JwtAuthGuard` (any logged-in user, not just admins).

**Solution:** Add a `role` enum column to the `User` entity (`'customer' | 'admin'`), create a `RolesGuard` + `@Roles()` decorator, and apply it to product create/delete and any other admin-only mutation (including the GraphQL ones from Finding #3).

---

### 6. IDOR on profile updates (frontend Server Action)

**Problem:** `app/lib/services/user.ts`'s `updateUser(id, data)` is a `"use server"` action that PATCHes `${apiUrl}/user/${id}` with no check that `id` belongs to the current session. It's called with `initialUser.id` from props, but Server Actions are independently invocable — an attacker can call it directly with any `id`.

**Solution:** Resolve the target user id from the verified server-side session inside `updateUser` itself (the same way `getUser()`/`getUserOrders()` already do); never accept a client-supplied id for "update my own profile" operations. Additionally, verify the NestJS backend independently checks `token.sub === :id` on `PATCH /user/:id` (per the ad-hoc checks noted in Finding #8) as defense-in-depth.

---

### 7. JWT access/refresh secrets silently collapse to one value

**Problem:** `auth.service.ts` does:
```ts
configService.get('JWT_ACCESS_SECRET') || configService.get('JWT_SECRET')
```
for both access and refresh token signing, but `jwt.strategy.ts` only verifies against `JWT_SECRET`. If the deployment only sets `JWT_SECRET` (likely), access and refresh tokens are signed with the identical secret and have overlapping claim shapes.

**Impact:** A leaked/stored 7-day refresh token can be replayed directly as a 15-minute access token against any `JwtAuthGuard`-protected endpoint, defeating the short access-token expiry.

**Solution:** Require distinct, mandatory `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` env vars (fail startup if missing, don't fall back to a shared secret). Add a `type: 'access' | 'refresh'` claim to each token and reject refresh-typed tokens in the access-token strategy.

---

### 8. No rate limiting on auth endpoints

**Problem:** No `@nestjs/throttler` (or any throttling) is configured anywhere. `POST /login`, `POST /token` (refresh), and `POST /user` (registration) are all unlimited.

**Solution:** Add `@nestjs/throttler`, apply a strict limiter (e.g. 5 requests/minute) to login, refresh, and registration endpoints specifically.

---

### 9. Stripe webhook does nothing — order persistence relies entirely on client redirect

**Problem:** `app/lib/checkout-sessions.ts`'s `handleSuccessfulPayment` only `console.log`s; all real persistence (order status, inventory decrement) is commented-out TODOs. The only place an order is actually recorded is `checkout/success/actions.ts`, triggered by the buyer's browser redirecting back — and that action never checks `session.payment_status === "paid"` before calling `confirmOrder`.

**Impact:** A user who pays then closes the tab (or whose network drops) never gets an order recorded. Conversely, the confirmation path is reachable without verifying actual payment success.

**Solution:**
- Implement the webhook handler to actually persist order status and decrement inventory — this should be the *authoritative* source of truth for "payment succeeded," not the client redirect.
- In `checkout/success/actions.ts`, check `session.payment_status === "paid"` before calling `confirmOrder`, and treat the client-redirect path as a UX nicety, not the system of record.

---

## 🟡 Medium

### 10. Cart quantity has no upper bound or stock check at add-to-cart time
**Problem:** `cart.service.ts`'s `addToCart`/`updateCartItem` allow arbitrary quantities (e.g. 999999) with no check against `product.stock`. Checkout does enforce stock correctly, so this isn't exploitable for overselling, but it produces a confusing cart state.
**Solution:** Validate `quantity <= product.stock` in the cart service as well, returning a clear error to the user before checkout.

### 11. `decimal` columns read back without a numeric transformer
**Problem:** `order.entity.ts`'s `total` (and `Product.price`, `CartItem.price`) are `decimal(10,2)`, which TypeORM returns as strings unless a transformer is set. `order.service.ts` defensively wraps reads in `Number(...)`, indicating this was already a known foot-gun.
**Solution:** Add a `ColumnNumericTransformer` (`to`/`from`) to all decimal columns so every consumer gets a real `number` automatically, removing the need for ad hoc `Number()` casts.

### 12. Manual field-stripping instead of allowlist serialization
**Problem:** Password/refreshToken fields are removed via manual `delete profile.password` calls and a `removeKeyObject` helper rather than `@Exclude()` + `ClassSerializerInterceptor`.
**Impact:** Any new sensitive field added to `User` in the future leaks by default unless every call site remembers to delete it.
**Solution:** Add `@Exclude()` to sensitive fields on the entity and apply `ClassSerializerInterceptor` globally (or per-controller) so serialization is allowlist-based.

### 13. Pagination `limit` has no ceiling
**Problem:** `products.service.ts` computes `skip = (page - 1) * limit` with no maximum on `limit`. `limit=999999999` forces a full table scan.
**Solution:** Once the global `ValidationPipe` (Finding #4) is active, add `@Max(100)` to `QueryProductDto.limit` (and clamp server-side regardless, as defense-in-depth).

### 14. `/checkout` routes excluded from the auth middleware's protected-route matcher
**Problem:** `auth.config.ts`'s `authorized` callback only protects `/customers` and `/cart`; `/checkout` and `/checkout/success` aren't listed. Mitigated partially by route-level checks (`getCheckoutAuth()`, the cookie check in `actions.ts`), but it's inconsistent and easy to regress.
**Solution:** Add `/checkout` to the protected-route matcher so middleware enforces auth consistently rather than relying on each route remembering to check it individually.

### 15. Secrets sitting in plaintext `.env` files on disk
**Problem:** `.env`/`.env.local` contain a live-looking Google OAuth client secret and a 2-character `NEXTAUTH_SECRET` (`w==`). `.gitignore` does exclude these from version control, so they likely were never pushed.
**Solution:** Rotate the Google OAuth client secret regardless (it has been sitting in plaintext on disk), and replace `NEXTAUTH_SECRET` with a proper random 32+ byte value. Verify via `git log`/`git ls-files` that these were never committed historically.

---

## 🟢 Low

### 16. Verbose logging of tokens/sessions in production code paths
**Problem:** `auth.controller.ts` and `jwt.strategy.ts` (backend) log login DTOs, cookies, and decoded JWT payloads on every authenticated request. `auth.ts` and `checkout-sessions.ts` (frontend) log session/login flow details server-side.
**Solution:** Remove or gate these logs behind `NODE_ENV !== 'production'`; never log raw tokens or full user objects.

### 17. Inconsistent session expiry between `auth.ts` and `auth.config.ts`
**Problem:** Both files define near-duplicate `jwt`/`session` callbacks; `auth.config.ts` sets `maxAge: 24 * 60 * 60` with a comment claiming "30 days," while the value is actually 1 day.
**Solution:** Consolidate the NextAuth config into one source of truth and fix the comment/value mismatch.

### 18. In-memory product cache is unbounded and inconsistent across instances
**Problem:** `products.service.ts`'s `productsCache` is a process-local `Map` with a 10s TTL per key but no eviction beyond lazy TTL checks on next read of the *same* key — unbounded key growth from unique query-string combinations, and inconsistent across multi-instance deployments.
**Solution:** Either move to a shared cache (Redis) or bound the in-memory map size with an LRU eviction policy.

### 19. Cookie `secure`/`sameSite` settings hardcoded without an environment gate
**Problem:** `auth.controller.ts` hardcodes `secure: true, sameSite: 'none'` on the access-token cookie unconditionally — fine for HTTPS deployments, but silently breaks (cookie never sent) if ever run over plain HTTP in dev/staging.
**Solution:** Gate `secure` on `NODE_ENV === 'production'` (or an explicit `HTTPS` flag) so local development doesn't silently break.

### 20. Ad hoc, duplicated ownership checks instead of a shared guard
**Problem:** `order.controller.ts` and `user.controller.ts` repeat manual `Number(req.user.id) !== Number(id)` comparisons per-endpoint rather than a shared guard/decorator.
**Solution:** Extract an `@OwnsResource()` decorator or guard that enforces `req.user.id === params.id` structurally, so new endpoints can't forget the check.

---

## Recommended fix order

1. Global `ValidationPipe` (#4) — unlocks validation everywhere else.
2. Server-side price recomputation, both checkout paths (#1).
3. Replace the `user_id` cookie with verified-session-derived identity (#2).
4. Auth guards + role checks on GraphQL mutations and REST admin endpoints (#3, #5).
5. Fix JWT secret fallback and add rate limiting (#7, #8).
6. Implement the Stripe webhook as the source of truth for order/payment state (#9).
7. Everything else, roughly in listed order.

Fixing items 1–4 turns this from "has known vulnerabilities" into a strong portfolio story: a project with a documented, fixed IDOR/price-tampering/auth-bypass set is more credible to an interviewer than one with no issues found.
