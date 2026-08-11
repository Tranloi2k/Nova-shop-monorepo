# NovaShop — Full-Stack E-Commerce Platform

Monorepo with **3 applications** sharing a single NestJS API and PostgreSQL (Supabase):

| App | Directory | Stack | Default port |
|-----|-----------|-------|--------------|
| **Storefront** | [`Nova-online-shopping-nextjs`](./Nova-online-shopping-nextjs) | Next.js 15, React 19, Tailwind | `3000` |
| **Backend API** | [`Nova-shop-Nestjs`](./Nova-shop-Nestjs) | NestJS 11, TypeORM, GraphQL | `5000` |
| **Admin panel** | [`Nova-admin`](./Nova-admin) | React 19, Vite 8, TanStack Query | `5173` |

**Live demo:** [nova-online-shop.xyz](https://nova-online-shop.xyz/)

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Next.js Storefront │     │   React Admin Panel │
│     :3000           │     │       :5173         │
└──────────┬──────────┘     └──────────┬──────────┘
           │  REST + GraphQL            │  REST (admin/*)
           └────────────┬───────────────┘
                        ▼
           ┌────────────────────────┐
           │   NestJS API :5000     │
           │   PostgreSQL (Supabase)│
           └────────────────────────┘
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
    Stripe (checkout)          Cloudinary (admin uploads)
    xAI Grok (AI chat)
```

- **Storefront** calls NestJS directly via `NEXT_PUBLIC_EXTERNAL_API_URL`; Stripe checkout runs on Next.js (`/api/checkout`, `/api/stripe/webhook`).
- **Admin** calls `admin/*` endpoints with a JWT Bearer token.
- **Auth** uses JWT access/refresh tokens from NestJS; Next.js stores tokens in httpOnly cookies and auto-refreshes them via middleware.

---

## Prerequisites

- **Node.js 20.x** (required for the backend — see `engines` in `Nova-shop-Nestjs/package.json`)
- **PostgreSQL** (Supabase recommended)
- **pnpm 9** (monorepo package manager — `corepack enable` then `corepack prepare pnpm@9.15.4 --activate`)
- **Stripe** account (checkout), **Cloudinary** (admin image uploads), **xAI** (AI assistant — optional)

---

## Monorepo setup

Install all apps from the repository root:

```bash
pnpm install
```

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run storefront, API, and admin in parallel |
| `pnpm dev:storefront` | Next.js storefront (`:3000`) |
| `pnpm dev:api` | NestJS API (`:5000`) |
| `pnpm dev:admin` | Admin panel (`:5173`) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm test` | Test all apps |

Workspace packages: `Nova-online-shopping-nextjs`, `Nova-shop-Nestjs`, `Nova-admin`.

---

## Local development (recommended order)

### 1. Backend

```bash
cd Nova-shop-Nestjs
cp .env.example .env
# Fill in DATABASE_URL, JWT secrets, ALLOWED_ORIGINS, ...

# Fresh database — run schema (⚠️ drops existing data)
psql "$DATABASE_URL" -f database/bootstrap.sql

# From repo root (recommended):
pnpm install
pnpm dev:api

# Or from this directory:
pnpm install
pnpm dev
```

- API: `http://localhost:5000`
- Swagger: `http://localhost:5000/api`
- GraphQL Playground: `http://localhost:5000/graphql` (only when `NODE_ENV !== production`)

### 2. Storefront

```bash
cd Nova-online-shopping-nextjs
cp .env.example .env.local

# From repo root (recommended):
pnpm dev:storefront

# Or from this directory:
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Admin panel

```bash
cd Nova-admin
cp .env.example .env

# From repo root (recommended):
pnpm dev:admin

# Or from this directory:
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Log in with an `admin` account (register a user, then set its role to `admin` in the database — see the backend README).

---

## Key environment variables

| Variable | App | Description |
|----------|-----|-------------|
| `DATABASE_URL` | NestJS | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | NestJS | JWT signing secrets |
| `ALLOWED_ORIGINS` | NestJS | CORS — must include `http://localhost:3000` and `http://localhost:5173` |
| `INTERNAL_WEBHOOK_SECRET` | NestJS + Next.js | Shared secret for post-Stripe order confirmation |
| `NEXT_PUBLIC_EXTERNAL_API_URL` | Next.js | NestJS URL (`http://localhost:5000`) |
| `AUTH_SECRET` | Next.js | NextAuth v5 session secret |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Next.js | Payments |
| `XAI_API_KEY` | Next.js | AI shopping assistant (optional) |
| `VITE_API_URL` | Admin | NestJS URL |
| `VITE_CLOUDINARY_*` | Admin | Product / poster image uploads |

See each app's `.env.example` and child README for full details.

---

## Deployment (Render + Vercel monorepo)

Monorepo deploy **không thay đổi** nền tảng (BE Render, FE Vercel). Mỗi service chỉ cần trỏ vào **subfolder** và dùng `pnpm` từ root.

### Backend — Render

1. Kết nối GitHub repo monorepo (một repo duy nhất).
2. **Root Directory**: để trống (repo root) — `render.yaml` ở root đã cấu hình sẵn.
3. Hoặc nếu giữ service cũ: Settings → **Root Directory** = `Nova-shop-Nestjs` và set:
   - **Build**: `cd .. && corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm --filter nestjs-app build`
   - **Start**: `pnpm start:prod`
4. Env vars giữ nguyên (`DATABASE_URL`, JWT, `ALLOWED_ORIGINS`, …).

### Storefront — Vercel

1. Project Settings → **Root Directory** = `Nova-online-shopping-nextjs`
2. Bật **Include source files outside of the Root Directory** (monorepo — Vercel cần `pnpm-lock.yaml` ở root).
3. `vercel.json` trong folder đã set `installCommand` / `buildCommand` cho pnpm workspace.
4. Env vars giữ nguyên (`NEXT_PUBLIC_EXTERNAL_API_URL`, Stripe, `AUTH_SECRET`, …).

### Admin — Vercel (nếu deploy)

1. **Root Directory** = `Nova-admin`
2. Bật **Include source files outside of the Root Directory**
3. `vercel.json` tương tự storefront.

### Lưu ý

| Vấn đề | Giải pháp |
|--------|-----------|
| Build fail vì không có lockfile | Root Directory phải trỏ subfolder FE; bật include files outside root |
| Render build fail `npm ci` | Dùng `pnpm` — đã cập nhật trong `render.yaml` |
| Deploy FE khi chỉ sửa BE | Vercel: Ignored Build Step (optional) — chỉ build khi folder FE thay đổi |
| CORS lỗi sau deploy | Cập nhật `ALLOWED_ORIGINS` trên Render với domain Vercel |

---

## Core features

### Storefront (Next.js)

- Product catalog (search, filter, pagination, sort)
- Cart, wishlist, account (orders, profile)
- Stripe Checkout (buy now + cart checkout)
- Email/password + Google OAuth sign-in
- AI shopping assistant (xAI Grok)
- SEO (sitemap, robots, JSON-LD), GTM / GA4

### Backend (NestJS)

- REST + GraphQL (Apollo)
- JWT auth, Google OAuth, role-based access (`admin`, `staff`, `customer`)
- Cart, wishlist, orders (transactions + Stripe idempotency)
- Admin API: products, orders, customers, analytics, posters
- Rate limiting (`@nestjs/throttler`)

### Admin (React)

- Analytics dashboard
- Product, order, and customer management
- Storefront poster management (Cloudinary)

---

## Documentation

- [Storefront README](./Nova-online-shopping-nextjs/README.md)
- [Backend README](./Nova-shop-Nestjs/README.md)
- [Admin README](./Nova-admin/README.md)
- [Security audit report](./SECURITY_AUDIT_REPORT.md) — known security findings (review before production deployment)

---

## Author

**Tran Loi** — [@Tranloi2k](https://github.com/Tranloi2k) · [tranloi20001007@gmail.com](mailto:tranloi20001007@gmail.com)
