-- 0003_reviews_questions: reviews, product Q&A, notifications, sequences
BEGIN;

-- ============ REVIEWS ============
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX ix_reviews_product ON reviews (product_id, is_approved) WHERE is_approved = TRUE;

-- ============ PRODUCT QUESTIONS ============
CREATE TABLE product_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name  TEXT NOT NULL,
  question     TEXT NOT NULL,
  answer       TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_questions_product ON product_questions (product_id, created_at DESC);

-- ============ NOTIFICATIONS ============
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notif_read ON notifications (is_read, created_at DESC) WHERE is_read = FALSE;

-- ============ APP SEQUENCES ============
CREATE TABLE app_sequences (
  key        TEXT PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0
);
INSERT INTO app_sequences (key, last_value) VALUES ('order_number', 0);

COMMIT;
