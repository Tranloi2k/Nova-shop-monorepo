# NovaShop Backend (NestJS API)

Backend API for **NovaShop** — an e-commerce platform built with **NestJS 11**, **TypeORM**, **PostgreSQL (Supabase)**, and **GraphQL (Apollo)**.

**Related projects**

- Storefront (Next.js): [Nova-online-shopping-nextjs](../Nova-online-shopping-nextjs)
- Admin panel (React): [Nova-admin](../Nova-admin)
- Live storefront: [nova-online-shop.xyz](https://nova-online-shop.xyz/)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 11 |
| API | REST (Swagger) + GraphQL (Apollo Driver) |
| Database | PostgreSQL via TypeORM (`synchronize: false`) |
| Auth | JWT access/refresh, bcrypt, Google OAuth2 |
| Security | `@nestjs/throttler`, role guards, IDOR protection |
| Linting | ESLint + Prettier |

**Node.js 20.x** is required (`engines` in `package.json`).

---

## Modules

| Module | Description |
|--------|-------------|
| `AuthModule` | Login, refresh token, Google OAuth, seed admin |
| `UserModule` | User profiles, class serialization (hides passwords) |
| `ProductsModule` | Paginated catalog with SQL-level filter & sort |
| `CartModule` | Shopping cart — REST + GraphQL |
| `WishlistModule` | Wishlist management |
| `OrderModule` | Order creation, Stripe webhook confirmation (idempotent) |
| `ReviewModule` | Product reviews (GraphQL) |
| `AdminModule` | Products, orders, customers, analytics |
| `StorefrontPostersModule` | Storefront banners / posters |

---

## Environment variables

Create `.env` from `.env.example`:

```env
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173

DATABASE_URL=postgresql://user:password@host:5432/dbname

JWT_ACCESS_SECRET=change_me_access_secret_min_32_chars
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32_chars

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

INTERNAL_WEBHOOK_SECRET=change_me_internal_webhook_secret
```

`INTERNAL_WEBHOOK_SECRET` must match the value in the Next.js `.env.local`.

---

## Local development

### 1. Install

```bash
cd Nova-shop-Nestjs
cp .env.example .env
npm install
```

### 2. Database (fresh project)

```bash
psql "$DATABASE_URL" -f database/bootstrap.sql
```

Or paste the contents of `database/bootstrap.sql` into the Supabase SQL Editor.

> **Warning:** `bootstrap.sql` drops and recreates tables. Do not run on production unless you intend to wipe data.

Schema changes must be applied via `bootstrap.sql` (fresh setup) or Supabase migrations — TypeORM `synchronize: false`.

### 3. Start the server

```bash
npm run start:dev    # Development (watch)
npm run build && npm run start:prod   # Production
```

| Endpoint | URL |
|----------|-----|
| API base | `http://localhost:5000` |
| Swagger UI | `http://localhost:5000/api` |
| GraphQL Playground | `http://localhost:5000/graphql` (non-production) |

Default port is `5000` (override with `PORT`).

### 4. Create an admin user

Register a normal account through the storefront/API, then promote it to
admin directly in the database:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
```

Sign in with that account to access the admin panel.

---

## REST API (summary)

There is no global `/api` prefix — routes below are root paths.

### Auth

```
POST /login              # Email/password (rate-limited)
POST /token              # Refresh access token
POST /logout             # JWT required
POST /google             # Google ID token
```

### Catalog (public)

```
GET  /products           # Pagination, search, filter, sort
GET  /products/:id
POST /products           # Admin only
DELETE /products/:id     # Admin only
```

### Cart & wishlist (JWT)

```
GET    /cart
POST   /cart/add
PUT    /cart/items/:cartItemId
DELETE /cart/items/:cartItemId
DELETE /cart/clear

GET    /wishlist
GET    /wishlist/ids
GET    /wishlist/check/:productId
POST   /wishlist
DELETE /wishlist/items/:productId
```

### User & orders

```
POST  /user
GET   /user/:id
PATCH /user/:id

GET   /user/:id/orders
POST  /user/:id/orders
```

### Storefront posters

```
GET /storefront/posters          # Public — rendered on Next.js storefront
```

### Admin (JWT + admin/staff role)

```
GET/PATCH/DELETE  /admin/products[...]
GET/PATCH         /admin/orders[...]
GET/PATCH         /admin/customers[...]
GET               /admin/analytics/{revenue,orders-summary,top-products,conversion}
GET/POST/PATCH/DELETE /admin/posters[...]
```

### Internal webhook (shared secret)

```
POST /internal/orders/confirm    # Confirm order after Stripe (from Next.js)
```

GraphQL schema is auto-generated at `src/schema.gql` — mutations/queries for cart and reviews.

---

## Testing

```bash
npm run test        # Unit tests (Jest)
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage
npm run lint
```

---

## Author

**Tran Loi** — [@Tranloi2k](https://github.com/Tranloi2k) · [tranloi20001007@gmail.com](mailto:tranloi20001007@gmail.com)
