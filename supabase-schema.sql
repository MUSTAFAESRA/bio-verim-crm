-- ============================================================
-- BIO VERİM CRM - Supabase Veritabanı Şeması
-- Bu dosyayı Supabase Dashboard > SQL Editor'da çalıştırın
-- ============================================================

-- Profiles (kullanıcı profilleri)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'sales_rep'
             CHECK (role IN ('admin','sales_rep','warehouse','accountant')),
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  city          TEXT,
  district      TEXT,
  address       TEXT,
  tax_number    TEXT,
  tax_office    TEXT,
  segment       TEXT NOT NULL DEFAULT 'lead'
                CHECK (segment IN ('lead','active','passive')),
  source        TEXT CHECK (source IN ('manual','google_places','linkedin',
                                       'facebook_lead','referral','other')),
  notes         TEXT,
  assigned_to   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);

-- Suppliers (Fason üretim tesisleri)
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  contact_name    TEXT,
  phone           TEXT,
  email           TEXT,
  city            TEXT,
  address         TEXT,
  capacity_liters NUMERIC,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Products (Ürün kataloğu)
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  unit            TEXT NOT NULL DEFAULT 'litre',
  category        TEXT,
  min_stock_level NUMERIC DEFAULT 0,
  current_stock   NUMERIC DEFAULT 0,
  unit_cost       NUMERIC,
  unit_price      NUMERIC,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Production Orders (Fason üretim emirleri)
CREATE TABLE IF NOT EXISTS production_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT UNIQUE NOT NULL,
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  product_id        UUID NOT NULL REFERENCES products(id),
  ordered_quantity  NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,
  unit_cost         NUMERIC,
  status            TEXT NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned','in_production',
                                      'partial_delivery','completed','cancelled')),
  order_date        DATE NOT NULL,
  expected_date     DATE,
  notes             TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Production Deliveries
CREATE TABLE IF NOT EXISTS production_deliveries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id   UUID NOT NULL REFERENCES production_orders(id),
  delivered_quantity    NUMERIC NOT NULL,
  delivery_date         DATE NOT NULL,
  vehicle_plate         TEXT,
  driver_name           TEXT,
  notes                 TEXT,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Movements (Depo hareketleri)
CREATE TABLE IF NOT EXISTS stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjustment')),
  source_type   TEXT CHECK (source_type IN ('production_delivery','sale',
                                             'return','manual','adjustment')),
  source_id     UUID,
  quantity      NUMERIC NOT NULL,
  unit_cost     NUMERIC,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);

-- Trigger: Update product stock on stock_movements insert
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE products
    SET current_stock = current_stock + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type IN ('out', 'adjustment') THEN
    UPDATE products
    SET current_stock = GREATEST(0, current_stock - NEW.quantity),
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_update ON stock_movements;
CREATE TRIGGER trg_stock_update
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Invoices (Faturalar)
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_type   TEXT NOT NULL CHECK (invoice_type IN ('purchase','sale')),
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id    UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_date   DATE NOT NULL,
  due_date       DATE,
  subtotal       NUMERIC NOT NULL DEFAULT 0,
  tax_rate       NUMERIC DEFAULT 20,
  tax_amount     NUMERIC GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
  total_amount   NUMERIC GENERATED ALWAYS AS (subtotal + subtotal * tax_rate / 100) STORED,
  paid_amount    NUMERIC DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','sent','partially_paid',
                                   'paid','overdue','cancelled')),
  notes          TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity    NUMERIC NOT NULL,
  unit_price  NUMERIC NOT NULL,
  line_total  NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date   DATE NOT NULL,
  amount         NUMERIC NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer','cash','check','credit_card')),
  reference_no   TEXT,
  notes          TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Plans (Taksitler)
CREATE TABLE IF NOT EXISTS payment_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  installment_no  INTEGER NOT NULL,
  due_date        DATE NOT NULL,
  amount          NUMERIC NOT NULL,
  is_paid         BOOLEAN DEFAULT FALSE,
  paid_date       DATE,
  notes           TEXT
);

-- Contact Logs (İletişim kayıtları)
CREATE TABLE IF NOT EXISTS contact_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contact_type     TEXT NOT NULL
                   CHECK (contact_type IN ('call','visit','email','whatsapp','meeting','other')),
  direction        TEXT CHECK (direction IN ('inbound','outbound')),
  subject          TEXT,
  notes            TEXT,
  contacted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_mins    INTEGER,
  outcome          TEXT CHECK (outcome IN ('interested','not_interested','follow_up',
                                           'sale_made','no_answer','other')),
  next_action      TEXT,
  next_action_date DATE,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_logs_customer ON contact_logs(customer_id);

-- Reminders (Hatırlatıcılar)
CREATE TABLE IF NOT EXISTS reminders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  contact_log_id UUID REFERENCES contact_logs(id) ON DELETE SET NULL,
  assigned_to  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  notes        TEXT,
  remind_at    TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_assigned ON reminders(assigned_to);

-- Leads (Müşteri adayları)
CREATE TABLE IF NOT EXISTS leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name  TEXT NOT NULL,
  contact_name   TEXT,
  phone          TEXT,
  email          TEXT,
  city           TEXT,
  address        TEXT,
  latitude       NUMERIC,
  longitude      NUMERIC,
  source         TEXT CHECK (source IN ('google_places','linkedin',
                                         'facebook_lead','manual','other')),
  source_ref_id  TEXT UNIQUE,
  status         TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','contacted','qualified','converted','rejected')),
  notes          TEXT,
  converted_to   UUID REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ============================================================
-- VIEWs
-- ============================================================

-- Müşteri cari bakiye özeti
CREATE OR REPLACE VIEW customer_balance AS
SELECT
  c.id,
  c.company_name,
  COALESCE(SUM(CASE WHEN i.invoice_type = 'sale' THEN i.total_amount ELSE 0 END), 0) AS total_invoiced,
  COALESCE(SUM(p.amount), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN i.invoice_type = 'sale' THEN i.total_amount ELSE 0 END), 0)
    - COALESCE(SUM(p.amount), 0) AS balance_due
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id AND i.invoice_type = 'sale' AND i.status != 'cancelled'
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY c.id, c.company_name;

-- Düşük stok uyarısı
CREATE OR REPLACE VIEW low_stock_products AS
SELECT
  id,
  sku,
  name,
  current_stock,
  min_stock_level,
  (min_stock_level - current_stock) AS shortage
FROM products
WHERE current_stock <= min_stock_level
  AND is_active = TRUE
  AND min_stock_level > 0;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all data (single-company CRM)
CREATE POLICY "Auth users read all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users read customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read suppliers" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read products" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read production_orders" ON production_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read production_deliveries" ON production_deliveries FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read stock_movements" ON stock_movements FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read invoices" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read invoice_items" ON invoice_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read payments" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read payment_plans" ON payment_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read contact_logs" ON contact_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read reminders" ON reminders FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth users read leads" ON leads FOR ALL TO authenticated USING (true);

-- ============================================================
-- Örnek Ürünler (İsteğe bağlı - silebilirsiniz)
-- ============================================================
INSERT INTO products (sku, name, description, unit, category, min_stock_level, current_stock, unit_cost, unit_price) VALUES
('BV-001', 'Bio Verim Premium 5-0-0', 'Yüksek nitrojenli sıvı organik gübre. Azot içeriği %5.', 'litre', 'Azotlu', 500, 1200, 8.50, 15.00),
('BV-002', 'Bio Verim NPK 3-2-3', 'Dengeli NPK sıvı organik gübre. Genel amaçlı.', 'litre', 'NPK', 300, 800, 9.00, 18.00),
('BV-003', 'Bio Verim Mikro Plus', 'Mikro element zengin organik gübre. Çinko, demir, mangan.', 'litre', 'Mikro Element', 200, 150, 12.00, 25.00),
('BV-004', 'Bio Verim Humik Asit', 'Humik ve Fulvik asit içerikli toprak düzenleyici.', 'litre', 'Toprak Düzenleyici', 100, 400, 7.50, 14.00),
('BV-005', 'Bio Verim Potasyum Boost', 'Yüksek potasyumlu olgunlaşma gübresi.', 'litre', 'Potasyumlu', 250, 90, 11.00, 22.00)
ON CONFLICT (sku) DO NOTHING;
