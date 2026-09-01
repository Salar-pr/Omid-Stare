-- 0002_coupons_contact_content: coupon system + contact + mini CMS
BEGIN;

-- ============ COUPON CAMPAIGNS ============
CREATE TABLE coupon_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value    INTEGER NOT NULL CHECK (discount_value > 0),
  target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  max_uses          INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  redeemed_count    INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_campaigns_active ON coupon_campaigns (is_active, expires_at) WHERE is_active = TRUE;

-- ============ COUPONS (one-time codes, hash-only) ============
CREATE TABLE coupons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES coupon_campaigns(id) ON DELETE CASCADE,
  code_hash         TEXT NOT NULL UNIQUE, -- sha256(normalized code) — raw code هرگز ذخیره نمی‌شود
  code_last4        TEXT NOT NULL,
  assigned_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at        TIMESTAMPTZ,
  redeemed_at       TIMESTAMPTZ,
  redeemed_order_id UUID,
  expires_at        TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_coupons_hash ON coupons (code_hash);
CREATE INDEX ix_coupons_assigned ON coupons (assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX ix_coupons_campaign ON coupons (campaign_id);
CREATE INDEX ix_coupons_redeemed ON coupons (redeemed_at) WHERE redeemed_at IS NOT NULL;

-- ============ CONTACT MESSAGES ============
CREATE TABLE contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_contact_status ON contact_messages (status, created_at DESC);

-- ============ SITE CONTENT (mini CMS) ============
CREATE TABLE site_content (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
