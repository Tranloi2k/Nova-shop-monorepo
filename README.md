# NovaShop

NovaShop is an e-commerce project split into three applications:

| Application | Directory | Port |
| --- | --- | --- |
| Customer storefront | [`Nova-online-shopping-nextjs`](./Nova-online-shopping-nextjs) | `3000` |
| NestJS API | [`Nova-shop-Nestjs`](./Nova-shop-Nestjs) | `5000` |
| Admin dashboard | [`Nova-admin`](./Nova-admin) | `5173` |

The storefront and admin dashboard use the same NestJS API. Product and order data is stored in PostgreSQL. Stripe handles checkout, while Cloudinary is used for images uploaded from the admin dashboard.

Live site: [nova-online-shop.xyz](https://nova-online-shop.xyz/)

## Running the project locally

You need Node.js 20, pnpm 9 and a PostgreSQL database. The optional integrations require their own Stripe, Cloudinary, Google OAuth and xAI credentials.

Install the workspace dependencies from the repository root:

```bash
corepack enable
pnpm install
```

Create the environment files:

```bash
cp Nova-shop-Nestjs/.env.example Nova-shop-Nestjs/.env
cp Nova-online-shopping-nextjs/.env.example Nova-online-shopping-nextjs/.env.local
cp Nova-admin/.env.example Nova-admin/.env
```

At minimum, configure the backend database and JWT secrets. The frontend URLs default to the local ports shown above. Values shared by two applications, such as `INTERNAL_WEBHOOK_SECRET` and `GOOGLE_CLIENT_ID`, must match.

For a new database, load the provided schema:

```bash
psql "$DATABASE_URL" -f Nova-shop-Nestjs/database/bootstrap.sql
```

`bootstrap.sql` drops and recreates tables. Do not run it against a database that contains data you need.

Start all three applications:

```bash
pnpm dev
```

The API documentation is available at [http://localhost:5000/api](http://localhost:5000/api). GraphQL Playground is available at [http://localhost:5000/graphql](http://localhost:5000/graphql) outside production.

## Workspace commands

```bash
pnpm dev                 # start all applications
pnpm dev:storefront      # storefront only
pnpm dev:api             # API only
pnpm dev:admin           # admin dashboard only
pnpm build
pnpm lint
pnpm test
```

## Creating an admin account

Register through the storefront, then update the account role in PostgreSQL:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
```

You can then sign in at [http://localhost:5173](http://localhost:5173).

## Environment files

Each application has an `.env.example` with the complete list of settings:

- [`Nova-shop-Nestjs/.env.example`](./Nova-shop-Nestjs/.env.example): database, JWT, CORS and internal webhook settings
- [`Nova-online-shopping-nextjs/.env.example`](./Nova-online-shopping-nextjs/.env.example): API URL, authentication, Stripe, analytics, Sentry and AI chat
- [`Nova-admin/.env.example`](./Nova-admin/.env.example): API URL and Cloudinary uploads

## Deployment

The repository includes [`render.yaml`](./render.yaml) for the API. The two frontend applications can be deployed separately on Vercel using their own directories as project roots. When deploying a frontend from this monorepo, allow Vercel to include files outside its root directory so it can access the workspace lockfile.

Remember to update `ALLOWED_ORIGINS` on the API and the public API/site URLs on each frontend after assigning production domains.

More details are available in the application READMEs:

- [Storefront](./Nova-online-shopping-nextjs/README.md)
- [Backend API](./Nova-shop-Nestjs/README.md)
- [Admin dashboard](./Nova-admin/README.md)

## Author

[Tran Loi](https://github.com/Tranloi2k) · [tranloi20001007@gmail.com](mailto:tranloi20001007@gmail.com)
