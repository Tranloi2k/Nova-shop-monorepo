# NovaShop Admin Panel

Admin dashboard for **NovaShop**, built with **React 19**, **Vite 8**, **TanStack Query**, and **Tailwind CSS 4**. Connects to [Nova-shop-Nestjs](../Nova-shop-Nestjs) via `admin/*` endpoints.

**Related projects**

- Storefront: [Nova-online-shopping-nextjs](../Nova-online-shopping-nextjs)
- Backend API: [Nova-shop-Nestjs](../Nova-shop-Nestjs)

---

## Features

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/` | Revenue, orders, top products, conversion |
| Products | `/products` | Product CRUD, Cloudinary image upload |
| Orders | `/orders` | Order list, status updates |
| Customers | `/customers` | Customer list, role management |
| Posters | `/posters` | Storefront banners / posters |
| Login | `/login` | Admin / staff sign-in |

Only users with the `admin` or `staff` role can access protected routes (see `ProtectedRoute`).

---

## Tech stack

- **React 19** + **TypeScript**
- **Vite 8** — dev server & build
- **React Router 7** — routing
- **TanStack Query 5** — server state
- **React Hook Form** + **Zod** — form validation
- **Recharts** — analytics charts
- **Axios** — HTTP client with JWT interceptor
- **Tailwind CSS 4**
- **Vitest** + Testing Library — unit tests

---

## Prerequisites

- Node.js 18+
- [Nova-shop-Nestjs](../Nova-shop-Nestjs) running (default `http://localhost:5000`)
- Cloudinary account (product & poster image uploads)
- `http://localhost:5173` must be listed in NestJS `ALLOWED_ORIGINS`

---

## Setup & run

```bash
cd Nova-admin
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Scripts

```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run test      # Vitest (single run)
npm run test:watch
```

---

## Environment variables

Create `.env` from `.env.example`:

```env
# Backend API (required)
VITE_API_URL=http://localhost:5000

# Cloudinary — image uploads (required for product/poster management)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=nova_products_unsigned
```

Create an **unsigned upload preset** in the [Cloudinary Console](https://cloudinary.com/console) (e.g. folders `nova/products`, `nova/posters`).

---

## Project structure

```
Nova-admin/
├── src/
│   ├── app/
│   │   └── ProtectedRoute.tsx    # Role guard (admin | staff)
│   ├── components/
│   │   ├── Layout.tsx            # Sidebar + shell
│   │   └── PageHeader.tsx
│   ├── context/
│   │   └── ThemeContext.tsx      # Dark / light theme
│   ├── features/
│   │   ├── auth/                 # Login, AuthContext
│   │   ├── overview/             # Analytics dashboard
│   │   ├── products/             # Product management
│   │   ├── orders/
│   │   ├── customers/
│   │   └── posters/
│   └── lib/
│       ├── api.ts                # Axios + JWT interceptor
│       ├── cloudinary.ts         # Image upload helpers
│       └── schemas.ts            # Zod schemas
├── .env.example
└── package.json
```

---

## Backend API used by admin

Admin calls NestJS endpoints (no `/api` prefix):

```
POST   /login                          # Sign in
GET    /admin/products                 # List products
POST   /admin/products                 # Create product
PATCH  /admin/products/:id             # Update
DELETE /admin/products/:id             # Delete

GET    /admin/orders                   # Orders
GET    /admin/orders/:id
PATCH  /admin/orders/:id/status

GET    /admin/customers                # Customers
PATCH  /admin/customers/:id/role

GET    /admin/analytics/revenue
GET    /admin/analytics/orders-summary
GET    /admin/analytics/top-products
GET    /admin/analytics/conversion

GET    /admin/posters                  # Posters
POST   /admin/posters
PATCH  /admin/posters/reorder
PATCH  /admin/posters/:id
DELETE /admin/posters/:id
```

The JWT is stored in `localStorage` (`admin_token`); Axios attaches `Authorization: Bearer …` automatically.

---

## Author

**Tran Loi** — [@Tranloi2k](https://github.com/Tranloi2k) · [tranloi20001007@gmail.com](mailto:tranloi20001007@gmail.com)
