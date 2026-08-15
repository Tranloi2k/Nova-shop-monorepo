-- =============================================================================
-- Nova Shop - PostgreSQL schema bootstrap (Supabase-compatible)
-- =============================================================================
-- Recreates all application tables on a fresh database.
--
-- Usage (Supabase SQL Editor, psql, or CLI):
--   psql "$DATABASE_URL" -f database/bootstrap.sql
--
-- WARNING: Drops existing Nova Shop tables and data in public schema.
--          Do NOT run against production unless you intend to wipe the DB.
-- =============================================================================

BEGIN;

-- Drop in FK-safe order
DROP TABLE IF EXISTS wishlist_items CASCADE;
DROP TABLE IF EXISTS storefront_posters CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS "Products" CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  "refreshToken" TEXT,
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  role          TEXT NOT NULL DEFAULT 'customer'
);

-- -----------------------------------------------------------------------------
-- Products (quoted - legacy table name used by TypeORM entities)
-- -----------------------------------------------------------------------------
CREATE TABLE "Products" (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  price              NUMERIC NOT NULL,
  description        TEXT,
  image              TEXT NOT NULL DEFAULT '-',
  discount           INTEGER,
  colors             TEXT NOT NULL DEFAULT 'Black',
  images             TEXT NOT NULL DEFAULT '',
  "storageOptions"   TEXT DEFAULT '',
  "detailInformation" TEXT,
  "createdAt"        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  stock              INTEGER NOT NULL DEFAULT 100,
  category           TEXT NOT NULL DEFAULT 'accessories'
);

CREATE INDEX idx_products_category ON "Products" (category);

-- -----------------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------------
CREATE TABLE reviews (
  id         SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL,
  rating     INTEGER NOT NULL,
  comment    TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  name       TEXT NOT NULL DEFAULT '',
  "userId"   INTEGER,
  CONSTRAINT fk_reviews_products
    FOREIGN KEY ("productId") REFERENCES "Products"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_reviews_product_id ON reviews ("productId");

-- -----------------------------------------------------------------------------
-- carts
-- -----------------------------------------------------------------------------
CREATE TABLE carts (
  id         SERIAL PRIMARY KEY,
  "userId"   INTEGER NOT NULL,
  quantity   INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_users
    FOREIGN KEY ("userId") REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_carts_user_id ON carts ("userId");

-- -----------------------------------------------------------------------------
-- cart_items
-- -----------------------------------------------------------------------------
CREATE TABLE cart_items (
  id         SERIAL PRIMARY KEY,
  "cartId"   INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  price      NUMERIC NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  color      TEXT NOT NULL DEFAULT '',
  storage    TEXT NOT NULL DEFAULT '',
  CONSTRAINT fk_cart_items_carts
    FOREIGN KEY ("cartId") REFERENCES carts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cart_items_products
    FOREIGN KEY ("productId") REFERENCES "Products"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_cart_items_cart_id ON cart_items ("cartId");
CREATE INDEX idx_cart_items_product_id ON cart_items ("productId");
CREATE UNIQUE INDEX cart_items_cart_product_variant_unique
  ON cart_items ("cartId", "productId", color, storage);

-- -----------------------------------------------------------------------------
-- addresses (customer shipping / billing address book)
-- -----------------------------------------------------------------------------
CREATE TABLE addresses (
  id           SERIAL PRIMARY KEY,
  "userId"     INTEGER NOT NULL,
  "fullName"   TEXT NOT NULL,
  phone        TEXT NOT NULL,
  line1        TEXT NOT NULL,
  line2        TEXT,
  city         TEXT NOT NULL,
  state        TEXT,
  "postalCode" TEXT NOT NULL,
  country      TEXT NOT NULL,
  "isDefault"  BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_users
    FOREIGN KEY ("userId") REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_addresses_user_id ON addresses ("userId");

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  "userId"         INTEGER,
  "guestEmail"     TEXT,
  "stripeSessionId" TEXT NOT NULL UNIQUE,
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  "shippingFee"    NUMERIC(10,2) NOT NULL DEFAULT 0,
  "taxAmount"      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC NOT NULL,
  status           TEXT DEFAULT 'processing',
  "trackingNumber" TEXT,
  carrier          TEXT,
  "shipName"       TEXT,
  "shipPhone"      TEXT,
  "shipLine1"      TEXT,
  "shipLine2"      TEXT,
  "shipCity"       TEXT,
  "shipState"      TEXT,
  "shipPostalCode" TEXT,
  "shipCountry"    TEXT,
  "createdAt"      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_users
    FOREIGN KEY ("userId") REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_orders_user_id ON orders ("userId");
CREATE INDEX idx_orders_guest_email ON orders ("guestEmail");

-- -----------------------------------------------------------------------------
-- order_status_history (audit trail of order status transitions)
-- -----------------------------------------------------------------------------
CREATE TABLE order_status_history (
  id           SERIAL PRIMARY KEY,
  "orderId"    INTEGER NOT NULL,
  "fromStatus" TEXT,
  "toStatus"   TEXT NOT NULL,
  note         TEXT,
  "changedBy"  INTEGER,
  "createdAt"  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_status_history_orders
    FOREIGN KEY ("orderId") REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history ("orderId");

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------
CREATE TABLE order_items (
  id            SERIAL PRIMARY KEY,
  "orderId"     INTEGER NOT NULL,
  "productId"   INTEGER,
  "productName" TEXT NOT NULL,
  "productImage" TEXT NOT NULL,
  price         NUMERIC NOT NULL,
  quantity      INTEGER NOT NULL,
  color         TEXT NOT NULL DEFAULT '',
  storage       TEXT NOT NULL DEFAULT '',
  CONSTRAINT fk_order_items_orders
    FOREIGN KEY ("orderId") REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_products
    FOREIGN KEY ("productId") REFERENCES "Products"(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_order_items_order_id ON order_items ("orderId");

-- -----------------------------------------------------------------------------
-- wishlist_items
-- -----------------------------------------------------------------------------
CREATE TABLE wishlist_items (
  id          SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishlist_items_users
    FOREIGN KEY ("userId") REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_wishlist_items_products
    FOREIGN KEY ("productId") REFERENCES "Products"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX wishlist_items_user_product_unique
  ON wishlist_items ("userId", "productId");

CREATE INDEX idx_wishlist_items_user_id ON wishlist_items ("userId");

-- -----------------------------------------------------------------------------
-- storefront_posters (home page promo carousel)
-- -----------------------------------------------------------------------------
CREATE TABLE storefront_posters (
  id         SERIAL PRIMARY KEY,
  "imageUrl" TEXT NOT NULL,
  "altText"  TEXT,
  "productId" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_storefront_posters_product"
    FOREIGN KEY ("productId") REFERENCES "Products"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "IDX_STOREFRONT_POSTER_PRODUCT_ID" ON storefront_posters ("productId");
CREATE INDEX "IDX_STOREFRONT_POSTER_SORT_ORDER" ON storefront_posters ("sortOrder");

-- -----------------------------------------------------------------------------
-- Row Level Security (matches current Supabase project)
-- NestJS uses DATABASE_URL (service role) - not affected by RLS.
-- Enable RLS on tables exposed via Supabase client; add policies as needed.
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
-- storefront_posters: RLS off in production - enable + add policies if using Supabase client directly:
-- ALTER TABLE storefront_posters ENABLE ROW LEVEL SECURITY;

COMMIT;
