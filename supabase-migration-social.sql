-- ============================================================
-- BIO VERİM CRM - Social Media Columns Migration
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- Tarih: 2026-03-24
-- ============================================================
-- Bu migration, customers tablosuna sosyal medya ve mesajlaşma
-- platformlarına ait sütunlar ekler.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Facebook Messenger Page-Scoped ID
--    Müşteri Facebook sayfasına mesaj gönderdiğinde otomatik dolar.
--    Messenger webhook entegrasyonu tarafından doldurulur.
-- ------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS facebook_psid TEXT;

COMMENT ON COLUMN customers.facebook_psid IS
  'Facebook Messenger Page-Scoped ID (PSID). '
  'Müşteri Facebook sayfasına mesaj gönderdiğinde Messenger webhook tarafından otomatik doldurulur.';

-- ------------------------------------------------------------
-- 2. Instagram Page-Scoped ID
--    Müşteri Instagram DM gönderdiğinde otomatik dolar.
--    Instagram Messaging webhook entegrasyonu tarafından doldurulur.
-- ------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS instagram_psid TEXT;

COMMENT ON COLUMN customers.instagram_psid IS
  'Instagram Page-Scoped ID (PSID). '
  'Müşteri Instagram DM gönderdiğinde Instagram Messaging webhook tarafından otomatik doldurulur.';

-- ------------------------------------------------------------
-- 3. LinkedIn profil URL
-- ------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

COMMENT ON COLUMN customers.linkedin_url IS
  'Müşterinin LinkedIn profil veya şirket sayfası URL''si (ör. https://linkedin.com/in/kullanici).';

-- ------------------------------------------------------------
-- 4. Instagram kullanıcı adı veya profil URL
-- ------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;

COMMENT ON COLUMN customers.instagram_url IS
  'Müşterinin Instagram kullanıcı adı veya profil URL''si (ör. https://instagram.com/kullanici).';

-- ------------------------------------------------------------
-- 5. Facebook profil veya sayfa URL
-- ------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS facebook_url TEXT;

COMMENT ON COLUMN customers.facebook_url IS
  'Müşterinin Facebook profil veya sayfa URL''si (ör. https://facebook.com/kullanici).';

-- ------------------------------------------------------------
-- 6. İndeksler — PSID sütunlarında hızlı arama için
--    Webhook''lar gelen mesajı doğru müşteriye eşleştirmek için
--    bu sütunlara sık sık WHERE koşulu uygular.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_facebook_psid
  ON customers (facebook_psid)
  WHERE facebook_psid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_instagram_psid
  ON customers (instagram_psid)
  WHERE instagram_psid IS NOT NULL;

-- ============================================================
-- Migration tamamlandı.
-- Eklenen sütunlar:
--   customers.facebook_psid   TEXT  (indexed)
--   customers.instagram_psid  TEXT  (indexed)
--   customers.linkedin_url    TEXT
--   customers.instagram_url   TEXT
--   customers.facebook_url    TEXT
-- ============================================================
