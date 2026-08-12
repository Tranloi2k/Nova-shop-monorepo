# NovaShop Admin

The admin dashboard is a React and Vite application for managing the NovaShop catalog and day-to-day store data. It connects directly to the [NestJS API](../Nova-shop-Nestjs).

Available sections include products, orders, customers, storefront posters and sales analytics. Access requires an account with the `admin` or `staff` role.

## Local setup

From the repository root:

```bash
pnpm install
cp Nova-admin/.env.example Nova-admin/.env
pnpm dev:admin
```

Open [http://localhost:5173](http://localhost:5173).

The API runs at `http://localhost:5000` by default. Make sure the admin origin is included in the API's `ALLOWED_ORIGINS` setting.

## Configuration

```env
VITE_API_URL=http://localhost:5000
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=nova_products_unsigned
```

The Cloudinary values are only needed for product and poster uploads. The upload preset must allow unsigned uploads. See [`.env.example`](./.env.example) for the accompanying notes.

## Commands

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm test
pnpm test:watch
```

Authentication tokens are kept in `localStorage` under `admin_token` and attached to API requests by the Axios client. Do not use an admin account on an untrusted browser.
