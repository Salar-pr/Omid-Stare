-- 0001_core: users, sessions, catalog, cart, orders, wishlist
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============ USERS ============
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_role ON users (role) WHERE role = 'admin';

-- ============ SESSIONS (opaque token; hash-only) ============
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_sessions_user ON sessions (user_id);
CREATE INDEX ix_sessions_expires ON sessions (expires_at);

-- ============ PRODUCTS ============
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  name_en          TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  price            INTEGER NOT NULL CHECK (price >= 0),
  compare_at_price INTEGER CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category         TEXT NOT NULL DEFAULT 'عمومی',
  badge            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  image            TEXT NOT NULL DEFAULT '',
  sizes            JSONB NOT NULL DEFAULT '[]',
  colors           JSONB NOT NULL DEFAULT '[]',
  gallery          JSONB NOT NULL DEFAULT '[]',
  specs            JSONB NOT NULL DEFAULT '[]',
  features         JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_products_slug ON products (slug);
CREATE INDEX ix_products_category ON products (category);
CREATE INDEX ix_products_active ON products (is_active) WHERE is_active = TRUE;
CREATE INDEX ix_products_sort ON products (sort_order, id);
CREATE INDEX ix_products_sizes ON products USING GIN (sizes jsonb_path_ops);
CREATE INDEX ix_products_colors ON products USING GIN (colors jsonb_path_ops);

-- ============ ALBUMS ============
CREATE TABLE albums (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  title_fa    TEXT NOT NULL DEFAULT '',
  year        INTEGER NOT NULL,
  genre       TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_albums_sort ON albums (sort_order) WHERE is_published = TRUE;

CREATE TABLE album_tracks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id      UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  track_number  INTEGER NOT NULL,
  title         TEXT NOT NULL,
  duration      INTEGER NOT NULL DEFAULT 0, -- seconds
  audio_url     TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (album_id, track_number)
);
CREATE INDEX ix_tracks_album ON album_tracks (album_id, track_number);

-- ============ CART ============
CREATE TABLE carts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id        UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_size  TEXT,
  selected_color TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, selected_size, selected_color)
);
CREATE INDEX ix_cart_items_cart ON cart_items (cart_id);
CREATE INDEX ix_cart_items_product ON cart_items (product_id);

-- ============ ORDERS ============
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT NOT NULL UNIQUE,
  user_id          UUID NOT NULL REFERENCES users(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  subtotal         INTEGER NOT NULL DEFAULT 0,
  discount_amount  INTEGER NOT NULL DEFAULT 0,
  shipping_amount  INTEGER NOT NULL DEFAULT 0,
  total_amount     INTEGER NOT NULL DEFAULT 0,
  coupon_id        UUID,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT,
  shipping_address TEXT NOT NULL,
  city             TEXT,
  postal_code      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_orders_user ON orders (user_id, created_at DESC);
CREATE INDEX ix_orders_status ON orders (status);
CREATE INDEX ix_orders_created ON orders (created_at DESC);
CREATE INDEX ix_orders_payment ON orders (payment_status);

CREATE TABLE order_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id             UUID NOT NULL REFERENCES products(id),
  product_name_snapshot  TEXT NOT NULL,
  unit_price             INTEGER NOT NULL,
  quantity               INTEGER NOT NULL CHECK (quantity > 0),
  selected_size          TEXT,
  selected_color         TEXT,
  line_total             INTEGER NOT NULL
);
CREATE INDEX ix_order_items_order ON order_items (order_id);
CREATE INDEX ix_order_items_product ON order_items (product_id);

CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  actor_id    UUID,
  actor_name  TEXT NOT NULL DEFAULT 'system',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_order_hist_order ON order_status_history (order_id, created_at);

-- ============ WISHLIST ============
CREATE TABLE user_wishlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX ix_wishlist_user ON user_wishlist (user_id);

COMMIT;
