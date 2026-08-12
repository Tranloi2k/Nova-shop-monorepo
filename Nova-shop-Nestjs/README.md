# NovaShop API

This directory contains the NestJS API used by the [storefront](../Nova-online-shopping-nextjs) and [admin dashboard](../Nova-admin). It provides REST and GraphQL endpoints backed by PostgreSQL through TypeORM.

## Local setup

Node.js 20 is required. From the repository root, install dependencies and create the backend environment file:

```bash
pnpm install
cp Nova-shop-Nestjs/.env.example Nova-shop-Nestjs/.env
```

Set `DATABASE_URL`, both JWT secrets and `ALLOWED_ORIGINS` in `.env`. If checkout is enabled, `INTERNAL_WEBHOOK_SECRET` must match the storefront value.

For a new database:

```bash
psql "$DATABASE_URL" -f Nova-shop-Nestjs/database/bootstrap.sql
```

The bootstrap script drops and recreates tables. Use migrations for an existing database. TypeORM schema synchronization is disabled.

Start the API from the repository root:

```bash
pnpm dev:api
```

The server listens on port `5000` unless `PORT` is set.

- Swagger UI: [http://localhost:5000/api](http://localhost:5000/api)
- GraphQL Playground: [http://localhost:5000/graphql](http://localhost:5000/graphql), disabled in production

## Main modules

- Authentication with access and refresh tokens, Google sign-in and role checks
- Product catalog, cart, wishlist and reviews
- Order creation and Stripe confirmation
- Admin endpoints for products, orders, customers, analytics and storefront posters

There is no global `/api` prefix. Swagger is the most reliable reference for the REST routes, and the generated GraphQL schema is stored at `src/schema.gql`.

## Admin access

After registering a normal account, promote it directly in PostgreSQL:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
```

Both `admin` and `staff` accounts can access protected admin routes, subject to the role checks on each endpoint.

## Commands

Run these from this directory, or use the workspace commands from the root README.

```bash
pnpm dev
pnpm build
pnpm start:prod
pnpm lint
pnpm test
pnpm test:e2e
pnpm test:cov
```

See [`.env.example`](./.env.example) for all configuration options, including order pricing and transactional email.
