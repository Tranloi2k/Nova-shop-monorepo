# NovaShop Storefront

This is the customer-facing NovaShop application. It is built with Next.js 15 and uses the [NestJS API](../Nova-shop-Nestjs) for products, accounts, carts, wishlists and orders.

Live site: [nova-online-shop.xyz](https://nova-online-shop.xyz/)

## What is included

- Product search, filters, sorting and product pages
- Cart, wishlist and order history
- Email/password and Google sign-in
- Stripe Checkout for individual products and carts
- Optional shopping assistant powered by xAI
- Sitemap, structured data, Google Analytics and Sentry integration

## Local setup

Start the NestJS API first, then run the following from the repository root:

```bash
pnpm install
cp Nova-online-shopping-nextjs/.env.example Nova-online-shopping-nextjs/.env.local
pnpm dev:storefront
```

Open [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_EXTERNAL_API_URL` should point to the NestJS server. The default local value is `http://localhost:5000`.

## Configuration

The full list is documented in [`.env.example`](./.env.example). These are the main groups:

- `AUTH_SECRET`, `NEXTAUTH_URL` and Google OAuth credentials for sign-in
- Stripe keys and `INTERNAL_WEBHOOK_SECRET` for checkout
- `XAI_API_KEY` for the optional shopping assistant
- GTM, GA4 and Sentry settings for monitoring

`INTERNAL_WEBHOOK_SECRET` must match the backend value. `GOOGLE_CLIENT_ID` must also match the value configured in the NestJS application.

To receive local Stripe events, forward them to:

```text
http://localhost:3000/api/stripe/webhook
```

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
```

## API boundaries

Browser and server components call the NestJS API directly; there is no general Next.js proxy. Routes under `app/api` are reserved for NextAuth, AI chat, Stripe Checkout and Stripe webhooks.

When deploying, set the production site and API URLs, register the Stripe webhook URL, and add the storefront domain to the backend's `ALLOWED_ORIGINS` list.
