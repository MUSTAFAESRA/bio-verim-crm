// Demo data for when Supabase is not configured with real credentials

const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export const DEMO_CUSTOMERS = [
  { id: uuid(1), company_name: "Ege Tarım A.Ş.", contact_name: "Ahmet Yılmaz", email: "ahmet@egetarim.com", phone: "0532 111 2233", city: "İzmir", district: "Bornova", tax_number: "1234567890", tax_office: "Bornova VD", segment: "active" as const, source: "manual", notes: "Büyük ölçekli sera üreticisi. Yıllık 50 ton gübre alımı.", address: "Ege Serbest Bölge No:12", assigned_to: null, created_by: null, created_at: "2025-01-15T10:00:00Z", updated_at: "2025-03-10T14:30:00Z", linkedin_url: "linkedin.com/in/ahmetyilmaz-tarim", instagram_url: "egetarim", facebook_url: null },
  { id: uuid(2), company_name: "Antalya Seracılık Ltd.", contact_name: "Fatma Demir", email: "fatma@antalyasera.com", phone: "0533 222 3344", city: "Antalya", district: "Kumluca", tax_number: "9876543210", tax_office: "Kumluca VD", segment: "active" as const, source: "referral", notes: "Domates ve biber üretimi. Organik sertifikalı.", address: "Kumluca Sanayi Sitesi B Blok", assigned_to: null, created_by: null, created_at: "2025-02-01T09:00:00Z", updated_at: "2025-03-15T11:00:00Z", linkedin_url: null, instagram_url: "antalyaseracilik", facebook_url: "facebook.com/antalyaseracilik" },
  { id: uuid(3), company_name: "Bursa Zeytincilik Koop.", contact_name: "Mehmet Kaya", email: "mehmet@bursazeytin.coop", phone: "0535 333 4455", city: "Bursa", district: "Gemlik", tax_number: "5678901234", tax_office: "Gemlik VD", segment: "active" as const, source: "google_places", notes: null, address: null, assigned_to: null, created_by: null, created_at: "2025-01-20T08:00:00Z", updated_at: "2025-03-01T09:00:00Z", linkedin_url: null, instagram_url: null, facebook_url: null },
  { id: uuid(4), company_name: "Konya Tahıl Üreticileri", contact_name: "Ali Öztürk", email: "ali@konyatahil.com", phone: "0536 444 5566", city: "Konya", district: "Çumra", tax_number: null, tax_office: null, segment: "lead" as const, source: "facebook_lead", notes: "Facebook reklamından gelen aday. İlk görüşme yapılacak.", address: null, assigned_to: null, created_by: null, created_at: "2025-03-01T12:00:00Z", updated_at: "2025-03-01T12:00:00Z", linkedin_url: null, instagram_url: null, facebook_url: "facebook.com/konyatahil" },
  { id: uuid(5), company_name: "Adana Narenciye San.", contact_name: "Ayşe Çelik", email: "ayse@adananarenciye.com", phone: "0537 555 6677", city: "Adana", district: "Yüreğir", tax_number: "3456789012", tax_office: "Yüreğir VD", segment: "lead" as const, source: "manual", notes: "Narenciye bahçeleri için teklif istedi.", address: "Organize Sanayi 5. Cadde", assigned_to: null, created_by: null, created_at: "2025-03-10T15:00:00Z", updated_at: "2025-03-10T15:00:00Z", linkedin_url: null, instagram_url: "adananarenciye", facebook_url: null },
  { id: uuid(6), company_name: "Trabzon Çay Bahçeleri", contact_name: "Hasan Aydın", email: null, phone: "0538 666 7788", city: "Trabzon", district: "Of", tax_number: null, tax_office: null, segment: "passive" as const, source: "manual", notes: "Geçen yıl 2 sipariş verdi, bu yıl henüz iletişim yok.", address: null, assigned_to: null, created_by: null, created_at: "2024-06-15T10:00:00Z", updated_at: "2024-12-01T09:00:00Z", linkedin_url: null, instagram_url: null, facebook_url: null },
  { id: uuid(7), company_name: "Denizli Üzüm Bağları", contact_name: "Zeynep Arslan", email: "zeynep@denizliuzum.com", phone: "0539 777 8899", city: "Denizli", district: "Çal", tax_number: "7890123456", tax_office: "Çal VD", segment: "active" as const, source: "referral", notes: "Bağcılık. Ege Tarım referansıyla geldi.", address: null, assigned_to: null, created_by: null, created_at: "2025-02-15T11:00:00Z", updated_at: "2025-03-20T10:00:00Z", linkedin_url: null, instagram_url: "denizliuzumbag", facebook_url: null },
  { id: uuid(8), company_name: "Gaziantep Fıstık A.Ş.", contact_name: "Murat Şahin", email: "murat@gaziantepfistik.com", phone: "0541 888 9900", city: "Gaziantep", district: "Nizip", tax_number: "2345678901", tax_office: "Nizip VD", segment: "lead" as const, source: "linkedin", notes: "LinkedIn üzerinden iletişime geçildi.", address: null, assigned_to: null, created_by: null, created_at: "2025-03-18T14:00:00Z", updated_at: "2025-03-18T14:00:00Z", linkedin_url: "linkedin.com/in/muratkahin-gida", instagram_url: null, facebook_url: null },
];

export const DEMO_SUPPLIERS = [
  { id: uuid(101), company_name: "Mersin Kimya Tesisleri", contact_name: "Kemal Polat", phone: "0542 111 0011", city: "Mersin", capacity_liters: 100000, is_active: true, created_at: "2024-01-01T10:00:00Z" },
  { id: uuid(102), company_name: "İstanbul Organik Üretim", contact_name: "Derya Koç", phone: "0543 222 0022", city: "İstanbul", capacity_liters: 50000, is_active: true, created_at: "2024-03-01T10:00:00Z" },
];

export const DEMO_PRODUCTS = [
  { id: uuid(201), sku: "BV-SG-001", name: "Bio Verim Sıvı Gübre 1L", unit: "litre", category: "Sıvı Gübre", min_stock_level: 500, current_stock: 1200, unit_cost: 45, unit_price: 85, is_active: true, created_at: "2024-01-01T10:00:00Z", updated_at: "2025-03-20T10:00:00Z" },
  { id: uuid(202), sku: "BV-SG-005", name: "Bio Verim Sıvı Gübre 5L", unit: "litre", category: "Sıvı Gübre", min_stock_level: 200, current_stock: 450, unit_cost: 200, unit_price: 380, is_active: true, created_at: "2024-01-01T10:00:00Z", updated_at: "2025-03-20T10:00:00Z" },
  { id: uuid(203), sku: "BV-SG-020", name: "Bio Verim Sıvı Gübre 20L", unit: "litre", category: "Sıvı Gübre", min_stock_level: 100, current_stock: 75, unit_cost: 750, unit_price: 1400, is_active: true, created_at: "2024-01-01T10:00:00Z", updated_at: "2025-03-20T10:00:00Z" },
  { id: uuid(204), sku: "BV-HG-001", name: "Bio Verim Humik Asit 1L", unit: "litre", category: "Humik Asit", min_stock_level: 300, current_stock: 180, unit_cost: 55, unit_price: 110, is_active: true, created_at: "2024-02-01T10:00:00Z", updated_at: "2025-03-18T10:00:00Z" },
  { id: uuid(205), sku: "BV-FA-001", name: "Bio Verim Fulvik Asit 5L", unit: "litre", category: "Fulvik Asit", min_stock_level: 150, current_stock: 320, unit_cost: 280, unit_price: 520, is_active: true, created_at: "2024-02-01T10:00:00Z", updated_at: "2025-03-15T10:00:00Z" },
];

export const DEMO_INVOICES = [
  { id: uuid(301), invoice_number: "FTR-2025-001", invoice_type: "sale", customer_id: uuid(1), supplier_id: null, invoice_date: "2025-01-20", due_date: "2025-02-20", subtotal: 42500, tax_rate: 20, tax_amount: 8500, total_amount: 51000, paid_amount: 51000, status: "paid", created_by: null, created_at: "2025-01-20T10:00:00Z", customers: { company_name: "Ege Tarım A.Ş." }, suppliers: null },
  { id: uuid(302), invoice_number: "FTR-2025-002", invoice_type: "sale", customer_id: uuid(2), supplier_id: null, invoice_date: "2025-02-10", due_date: "2025-03-10", subtotal: 28000, tax_rate: 20, tax_amount: 5600, total_amount: 33600, paid_amount: 20000, status: "partially_paid", created_by: null, created_at: "2025-02-10T10:00:00Z", customers: { company_name: "Antalya Seracılık Ltd." }, suppliers: null },
  { id: uuid(303), invoice_number: "FTR-2025-003", invoice_type: "sale", customer_id: uuid(3), supplier_id: null, invoice_date: "2025-02-25", due_date: "2025-03-15", subtotal: 15400, tax_rate: 20, tax_amount: 3080, total_amount: 18480, paid_amount: 0, status: "overdue", created_by: null, created_at: "2025-02-25T10:00:00Z", customers: { company_name: "Bursa Zeytincilik Koop." }, suppliers: null },
  { id: uuid(304), invoice_number: "FTR-2025-004", invoice_type: "sale", customer_id: uuid(7), supplier_id: null, invoice_date: "2025-03-15", due_date: "2025-04-15", subtotal: 19000, tax_rate: 20, tax_amount: 3800, total_amount: 22800, paid_amount: 0, status: "sent", created_by: null, created_at: "2025-03-15T10:00:00Z", customers: { company_name: "Denizli Üzüm Bağları" }, suppliers: null },
  { id: uuid(305), invoice_number: "ALF-2025-001", invoice_type: "purchase", customer_id: null, supplier_id: uuid(101), invoice_date: "2025-01-05", due_date: "2025-02-05", subtotal: 75000, tax_rate: 20, tax_amount: 15000, total_amount: 90000, paid_amount: 90000, status: "paid", created_by: null, created_at: "2025-01-05T10:00:00Z", customers: null, suppliers: { company_name: "Mersin Kimya Tesisleri" } },
];

export const DEMO_INVOICE_ITEMS = [
  { id: uuid(401), invoice_id: uuid(301), product_id: uuid(201), description: "Bio Verim Sıvı Gübre 1L", quantity: 500, unit_price: 85, line_total: 42500, products: { name: "Bio Verim Sıvı Gübre 1L", unit: "litre" } },
  { id: uuid(402), invoice_id: uuid(302), product_id: uuid(202), description: "Bio Verim Sıvı Gübre 5L", quantity: 50, unit_price: 380, line_total: 19000, products: { name: "Bio Verim Sıvı Gübre 5L", unit: "litre" } },
  { id: uuid(403), invoice_id: uuid(302), product_id: uuid(204), description: "Bio Verim Humik Asit 1L", quantity: 50, unit_price: 110, line_total: 5500, products: { name: "Bio Verim Humik Asit 1L", unit: "litre" } },
  { id: uuid(404), invoice_id: uuid(302), product_id: uuid(205), description: "Bio Verim Fulvik Asit 5L", quantity: 10, unit_price: 350, line_total: 3500, products: { name: "Bio Verim Fulvik Asit 5L", unit: "litre" } },
];

export const DEMO_PAYMENTS = [
  { id: uuid(501), invoice_id: uuid(301), payment_date: "2025-02-15", amount: 51000, payment_method: "bank_transfer", reference_no: "EFT-001", created_by: null, created_at: "2025-02-15T10:00:00Z" },
  { id: uuid(502), invoice_id: uuid(302), payment_date: "2025-03-01", amount: 20000, payment_method: "bank_transfer", reference_no: "EFT-002", created_by: null, created_at: "2025-03-01T10:00:00Z" },
  { id: uuid(503), invoice_id: uuid(305), payment_date: "2025-02-01", amount: 90000, payment_method: "bank_transfer", reference_no: "EFT-003", created_by: null, created_at: "2025-02-01T10:00:00Z" },
];

export const DEMO_PAYMENT_PLANS = [
  { id: uuid(551), invoice_id: uuid(302), installment_no: 1, due_date: "2025-03-10", amount: 16800, is_paid: true, paid_date: "2025-03-01" },
  { id: uuid(552), invoice_id: uuid(302), installment_no: 2, due_date: "2025-04-10", amount: 16800, is_paid: false, paid_date: null },
];

export const DEMO_CONTACT_LOGS = [
  { id: uuid(601), customer_id: uuid(1), contact_type: "call", direction: "outbound", subject: "Yeni sezon sipariş görüşmesi", notes: "2025 sezonu için 600L sipariş vereceklerini belirtti.", contacted_at: "2025-03-20T14:00:00Z", outcome: "interested", next_action: "Teklif gönder", next_action_date: "2025-03-25", duration_mins: 15, created_by: null, created_at: "2025-03-20T14:00:00Z", customers: { company_name: "Ege Tarım A.Ş." } },
  { id: uuid(602), customer_id: uuid(2), contact_type: "visit", direction: "outbound", subject: "Sera ziyareti ve ürün tanıtımı", notes: "Kumluca'daki seralarda ürün demosu yapıldı. Çok memnun kaldılar.", contacted_at: "2025-03-18T10:00:00Z", outcome: "sale_made", next_action: null, next_action_date: null, duration_mins: 120, created_by: null, created_at: "2025-03-18T10:00:00Z", customers: { company_name: "Antalya Seracılık Ltd." } },
  { id: uuid(603), customer_id: uuid(4), contact_type: "call", direction: "outbound", subject: "İlk iletişim — Facebook lead", notes: "Telefon açıldı, ilgili olduğunu söyledi. Numune istedi.", contacted_at: "2025-03-15T11:00:00Z", outcome: "follow_up", next_action: "Numune gönder", next_action_date: "2025-03-22", duration_mins: 10, created_by: null, created_at: "2025-03-15T11:00:00Z", customers: { company_name: "Konya Tahıl Üreticileri" } },
  { id: uuid(604), customer_id: uuid(5), contact_type: "email", direction: "outbound", subject: "Fiyat listesi gönderildi", notes: null, contacted_at: "2025-03-12T09:00:00Z", outcome: "follow_up", next_action: "Takip araması yap", next_action_date: "2025-03-26", duration_mins: null, created_by: null, created_at: "2025-03-12T09:00:00Z", customers: { company_name: "Adana Narenciye San." } },
  { id: uuid(605), customer_id: uuid(3), contact_type: "whatsapp", direction: "inbound", subject: "Fatura sorgusu", notes: "Gecikmiş fatura hakkında bilgi istedi. Ödeme yapacağını söyledi.", contacted_at: "2025-03-10T16:00:00Z", outcome: "follow_up", next_action: "Ödeme kontrolü", next_action_date: "2025-03-24", duration_mins: 5, created_by: null, created_at: "2025-03-10T16:00:00Z", customers: { company_name: "Bursa Zeytincilik Koop." } },
  { id: uuid(606), customer_id: uuid(7), contact_type: "call", direction: "outbound", subject: "Sipariş teyidi", notes: "22.800 TL'lik siparişi teyit etti.", contacted_at: "2025-03-14T13:00:00Z", outcome: "sale_made", next_action: null, next_action_date: null, duration_mins: 8, created_by: null, created_at: "2025-03-14T13:00:00Z", customers: { company_name: "Denizli Üzüm Bağları" } },
];

export const DEMO_REMINDERS = [
  { id: uuid(701), customer_id: uuid(1), assigned_to: null, title: "Ege Tarım'a teklif gönder", notes: "2025 sezonu sipariş teklifi hazırlanacak", remind_at: "2025-03-25T09:00:00Z", is_completed: false, completed_at: null, created_by: null, created_at: "2025-03-20T14:00:00Z", customers: { id: uuid(1), company_name: "Ege Tarım A.Ş." } },
  { id: uuid(702), customer_id: uuid(4), assigned_to: null, title: "Konya Tahıl'a numune gönder", notes: "1L sıvı gübre numunesi kargo ile gönderilecek", remind_at: "2025-03-22T10:00:00Z", is_completed: false, completed_at: null, created_by: null, created_at: "2025-03-15T11:00:00Z", customers: { id: uuid(4), company_name: "Konya Tahıl Üreticileri" } },
  { id: uuid(703), customer_id: uuid(3), assigned_to: null, title: "Bursa Zeytin — ödeme kontrolü", notes: "18.480 TL gecikmiş fatura ödemesi", remind_at: "2025-03-24T10:00:00Z", is_completed: false, completed_at: null, created_by: null, created_at: "2025-03-10T16:00:00Z", customers: { id: uuid(3), company_name: "Bursa Zeytincilik Koop." } },
  { id: uuid(704), customer_id: uuid(5), assigned_to: null, title: "Adana Narenciye — takip araması", notes: "Fiyat listesi gönderilmişti, dönüş bekleniyor", remind_at: "2025-03-26T11:00:00Z", is_completed: false, completed_at: null, created_by: null, created_at: "2025-03-12T09:00:00Z", customers: { id: uuid(5), company_name: "Adana Narenciye San." } },
  { id: uuid(705), customer_id: uuid(8), assigned_to: null, title: "Gaziantep Fıstık — ilk temas", notes: "LinkedIn bağlantısına mesaj atılacak", remind_at: "2025-03-20T14:00:00Z", is_completed: true, completed_at: "2025-03-20T14:30:00Z", created_by: null, created_at: "2025-03-18T14:00:00Z", customers: { id: uuid(8), company_name: "Gaziantep Fıstık A.Ş." } },
];

export const DEMO_PRODUCTION_ORDERS = [
  { id: uuid(801), order_number: "FAS-2025-001", supplier_id: uuid(101), product_id: uuid(201), ordered_quantity: 5000, received_quantity: 5000, unit_cost: 45, status: "completed", order_date: "2025-01-10", expected_date: "2025-02-10", created_by: null, created_at: "2025-01-10T10:00:00Z", suppliers: { company_name: "Mersin Kimya Tesisleri" }, products: { name: "Bio Verim Sıvı Gübre 1L", unit: "litre" } },
  { id: uuid(802), order_number: "FAS-2025-002", supplier_id: uuid(102), product_id: uuid(204), ordered_quantity: 2000, received_quantity: 800, unit_cost: 55, status: "partial_delivery", order_date: "2025-02-15", expected_date: "2025-03-30", created_by: null, created_at: "2025-02-15T10:00:00Z", suppliers: { company_name: "İstanbul Organik Üretim" }, products: { name: "Bio Verim Humik Asit 1L", unit: "litre" } },
  { id: uuid(803), order_number: "FAS-2025-003", supplier_id: uuid(101), product_id: uuid(203), ordered_quantity: 1000, received_quantity: 0, unit_cost: 750, status: "in_production", order_date: "2025-03-01", expected_date: "2025-04-15", created_by: null, created_at: "2025-03-01T10:00:00Z", suppliers: { company_name: "Mersin Kimya Tesisleri" }, products: { name: "Bio Verim Sıvı Gübre 20L", unit: "litre" } },
];

export const DEMO_PRODUCTION_DELIVERIES = [
  { id: uuid(851), production_order_id: uuid(801), delivered_quantity: 3000, delivery_date: "2025-01-25", vehicle_plate: "33 ABC 123", notes: "İlk parti teslim", created_by: null, created_at: "2025-01-25T10:00:00Z" },
  { id: uuid(852), production_order_id: uuid(801), delivered_quantity: 2000, delivery_date: "2025-02-08", vehicle_plate: "33 ABC 123", notes: "Kalan parti", created_by: null, created_at: "2025-02-08T10:00:00Z" },
  { id: uuid(853), production_order_id: uuid(802), delivered_quantity: 800, delivery_date: "2025-03-10", vehicle_plate: "34 DEF 456", notes: "Kısmi teslimat", created_by: null, created_at: "2025-03-10T10:00:00Z" },
];

export const DEMO_STOCK_MOVEMENTS = [
  { id: uuid(901), product_id: uuid(201), movement_type: "in", source_type: "production_delivery", source_id: uuid(851), quantity: 3000, notes: "FAS-2025-001 teslimat 1", created_by: null, created_at: "2025-01-25T10:00:00Z", products: { name: "Bio Verim Sıvı Gübre 1L", unit: "litre" } },
  { id: uuid(902), product_id: uuid(201), movement_type: "in", source_type: "production_delivery", source_id: uuid(852), quantity: 2000, notes: "FAS-2025-001 teslimat 2", created_by: null, created_at: "2025-02-08T10:00:00Z", products: { name: "Bio Verim Sıvı Gübre 1L", unit: "litre" } },
  { id: uuid(903), product_id: uuid(201), movement_type: "out", source_type: "sale", source_id: uuid(301), quantity: 500, notes: "FTR-2025-001 satış", created_by: null, created_at: "2025-01-20T10:00:00Z", products: { name: "Bio Verim Sıvı Gübre 1L", unit: "litre" } },
  { id: uuid(904), product_id: uuid(204), movement_type: "in", source_type: "production_delivery", source_id: uuid(853), quantity: 800, notes: "FAS-2025-002 kısmi teslimat", created_by: null, created_at: "2025-03-10T10:00:00Z", products: { name: "Bio Verim Humik Asit 1L", unit: "litre" } },
  { id: uuid(905), product_id: uuid(202), movement_type: "out", source_type: "sale", source_id: uuid(302), quantity: 50, notes: "FTR-2025-002 satış", created_by: null, created_at: "2025-02-10T10:00:00Z", products: { name: "Bio Verim Sıvı Gübre 5L", unit: "litre" } },
];

export const DEMO_LEADS = [
  { id: uuid(1001), business_name: "Aydın Zeytin Kooperatifi", contact_name: "Osman Güneş", phone: "0544 111 2233", city: "Aydın", latitude: 37.84, longitude: 27.84, source: "google_places", source_ref_id: "ChIJa1b2c3d4e5f6", status: "new", notes: "Google Places aramasından bulundu. Büyük zeytin bahçeleri.", converted_to: null, assigned_to: null, created_by: null, created_at: "2025-03-20T10:00:00Z" },
  { id: uuid(1002), business_name: "Hatay Defne Tarım", contact_name: "Selin Yıldırım", phone: "0545 222 3344", city: "Hatay", latitude: 36.20, longitude: 36.16, source: "google_places", source_ref_id: "ChIJg7h8i9j0k1l2", status: "contacted", notes: "Telefon ile arandı, bilgi istedi.", converted_to: null, assigned_to: null, created_by: null, created_at: "2025-03-18T10:00:00Z" },
  { id: uuid(1003), business_name: "Manisa Bağcılık Ltd.", contact_name: "Emre Tan", phone: "0546 333 4455", city: "Manisa", latitude: 38.61, longitude: 27.42, source: "linkedin", source_ref_id: null, status: "qualified", notes: "LinkedIn'den bağlantı kuruldu. Yıllık 20 ton gübre ihtiyacı var.", converted_to: null, assigned_to: null, created_by: null, created_at: "2025-03-15T10:00:00Z" },
  { id: uuid(1004), business_name: "Muğla Turunçgil", contact_name: null, phone: "0547 444 5566", city: "Muğla", latitude: 37.21, longitude: 28.36, source: "facebook_lead", source_ref_id: "fb_lead_12345", status: "new", notes: "Facebook Lead Ads formunu doldurdu.", converted_to: null, assigned_to: null, created_by: null, created_at: "2025-03-22T08:00:00Z" },
];

export const DEMO_CUSTOMER_BALANCE = [
  { id: uuid(1), company_name: "Ege Tarım A.Ş.", total_invoiced: 51000, total_paid: 51000, balance_due: 0 },
  { id: uuid(2), company_name: "Antalya Seracılık Ltd.", total_invoiced: 33600, total_paid: 20000, balance_due: 13600 },
  { id: uuid(3), company_name: "Bursa Zeytincilik Koop.", total_invoiced: 18480, total_paid: 0, balance_due: 18480 },
  { id: uuid(7), company_name: "Denizli Üzüm Bağları", total_invoiced: 22800, total_paid: 0, balance_due: 22800 },
];

export const DEMO_LOW_STOCK = [
  { id: uuid(203), name: "Bio Verim Sıvı Gübre 20L", sku: "BV-SG-020", current_stock: 75, min_stock_level: 100, shortage: 25 },
  { id: uuid(204), name: "Bio Verim Humik Asit 1L", sku: "BV-HG-001", current_stock: 180, min_stock_level: 300, shortage: 120 },
];

export const DEMO_MESSAGE_TEMPLATES = [
  { id: uuid(501), title: "WhatsApp Ürün Tanıtımı", channel: "whatsapp", category: "urun_tanitim", content: "Merhaba, Bio Verim olarak sıvı organik gübre ürünlerimizi sizinle paylaşmak istedik. Toprak sağlığını artıran, bitkisel verimliliği yüksek ürünlerimiz hakkında daha fazla bilgi almak ister misiniz? Size özel fiyatlandırma sunmaktan memnuniyet duyarız. 🌱", created_at: "2025-01-01T10:00:00Z" },
  { id: uuid(502), title: "E-posta Katalog Gönderimi", channel: "email", category: "urun_tanitim", content: "Sayın Yetkili,\n\nBio Verim Organik Gübre ailesi olarak ürün kataloğumuzu sizinle paylaşmak istiyoruz.\n\nÜrün kataloğumuz için: [KATALOG LİNKİ]\n\nBaşlıca ürünlerimiz:\n• Sıvı Organik Gübre (1L, 5L, 20L)\n• Humik Asit\n• Fulvik Asit\n\nDetaylı bilgi ve teklif için bize ulaşabilirsiniz.\n\nSaygılarımızla,\nBio Verim Ekibi", created_at: "2025-01-01T10:00:00Z" },
  { id: uuid(503), title: "LinkedIn Bağlantı Sonrası Tanıtım", channel: "linkedin_dm", category: "urun_tanitim", content: "Merhaba, bağlantı talebimi kabul ettiğiniz için teşekkürler. Bio Verim olarak tarım sektörüne yönelik sıvı organik gübre çözümleri sunuyoruz. Tarımsal verimliliğinizi artırmak için işbirliği yapmaktan mutluluk duyarız. Daha fazla bilgi almak ister misiniz?", created_at: "2025-01-01T10:00:00Z" },
  { id: uuid(504), title: "WhatsApp Takip Mesajı", channel: "whatsapp", category: "takip", content: "Merhaba, geçen hafta görüşmemizin ardından ürünlerimiz hakkında düşüncelerinizi merak ettim. Herhangi bir sorunuz varsa yardımcı olmaktan memnuniyet duyarım. Aklınızda olsun, bu ay için özel fiyat teklifimiz geçerliliğini koruyor. 😊", created_at: "2025-01-01T10:00:00Z" },
  { id: uuid(505), title: "E-posta Kampanya Duyurusu", channel: "email", category: "kampanya", content: "Sayın Değerli Müşterimiz,\n\nBahar sezonuna özel %15 indirim kampanyamız başladı!\n\nKampanya tarihleri: 1 Nisan - 30 Nisan\nGeçerli ürünler: Tüm sıvı gübre ürünleri\nMinimum sipariş: 50 litre\n\nKampanyadan yararlanmak için hemen sipariş oluşturun veya bizi arayın.\n\nSaygılarımızla,\nBio Verim Satış Ekibi", created_at: "2025-01-01T10:00:00Z" },
];

export const DEMO_SOCIAL_POSTS = [
  { id: uuid(601), platform: "linkedin", post_type: "urun_tanitim", title: "Organik Gübre ile Toprak Sağlığı", content: "Toprağınızın sağlığı, ürününüzün kalitesini belirler. Bio Verim sıvı organik gübre ile toprağınızdaki mikrobiyolojik aktiviteyi artırın, veriminizi yüksseltin! 🌱\n\n✅ %100 organik içerik\n✅ Hızlı emilim formülü\n✅ Uzman destek\n\n#OrganikTarım #BioVerim #SürdürülebilirTarım", media_url: null, scheduled_at: null, published_at: null, status: "draft", created_by: null, created_at: "2026-03-20T10:00:00Z" },
  { id: uuid(602), platform: "instagram", post_type: "kampanya", title: "Bahar Kampanyası %15 İndirim", content: "🌸 Bahar geldi, kampanyamız başladı!\n\nTüm sıvı gübre ürünlerimizde %15 indirim!\n⏰ 1-30 Nisan arası geçerli\n📦 Min. 50L sipariş\n\nHemen DM atın veya 0532 111 2233 numaralı hattı arayın!\n\n#BioVerim #OrganikGübre #BaharKampanyası #Tarım", media_url: null, scheduled_at: "2026-04-01T09:00:00Z", published_at: null, status: "scheduled", created_by: null, created_at: "2026-03-22T10:00:00Z" },
  { id: uuid(603), platform: "facebook", post_type: "genel", title: "Müşteri Başarı Hikayesi — Ege Tarım", content: "Müşterimiz Ege Tarım A.Ş., Bio Verim sıvı organik gübre kullanmaya başladıktan sonra veriminin %30 arttığını paylaştı! 🎉\n\n\"Toprağımızın yapısı belirgin şekilde iyileşti, sulama suyumuz da azaldı.\" — Ahmet Yılmaz, Ege Tarım\n\nSiz de farkı yaşamak ister misiniz? Ücretsiz numune için bize ulaşın!\n\n#BioVerim #MüşteriMemnuniyeti #OrganikTarım", media_url: null, scheduled_at: null, published_at: "2026-03-15T10:00:00Z", status: "published", created_by: null, created_at: "2026-03-14T14:00:00Z" },
];

export const DEMO_CONTACT_SEQUENCES = [
  {
    id: uuid(701),
    name: "Yeni Aday Sıcak Takip",
    description: "İlk temas sonrası yeni adaylar için 5 adımlık yoğun takip planı",
    total_steps: 5,
    steps: [
      { step_no: 1, channel: "whatsapp", message_template: "İlk temas: Kendinizi tanıtın ve ürün kataloğunu gönderin", wait_days: 0 },
      { step_no: 2, channel: "call", message_template: "Katalog hakkında soru sorun, ihtiyaçlarını öğrenin", wait_days: 3 },
      { step_no: 3, channel: "email", message_template: "Kişiselleştirilmiş teklif gönderin", wait_days: 7 },
      { step_no: 4, channel: "whatsapp", message_template: "Teklif hakkında bilgi alın", wait_days: 10 },
      { step_no: 5, channel: "call", message_template: "Kapanış görüşmesi — karar isteyin", wait_days: 14 },
    ],
    created_at: "2025-01-01T10:00:00Z"
  },
  {
    id: uuid(702),
    name: "Aylık Müşteri Bakım",
    description: "Aktif müşterilerle düzenli ilişki sürdürme planı",
    total_steps: 3,
    steps: [
      { step_no: 1, channel: "whatsapp", message_template: "Aylık selamlama ve ürün güncellemesi paylaşın", wait_days: 0 },
      { step_no: 2, channel: "call", message_template: "Memnuniyet kontrolü ve yeni ihtiyaç tespiti", wait_days: 15 },
      { step_no: 3, channel: "email", message_template: "Aylık kampanya/indirim duyurusu gönderin", wait_days: 25 },
    ],
    created_at: "2025-01-01T10:00:00Z"
  },
  {
    id: uuid(703),
    name: "Kampanya Duyurusu",
    description: "Sezonluk kampanyaları duyurmak için 3 adımlı plan",
    total_steps: 3,
    steps: [
      { step_no: 1, channel: "email", message_template: "Kampanya e-postasını gönderin", wait_days: 0 },
      { step_no: 2, channel: "whatsapp", message_template: "WhatsApp ile kampanya hatırlatması yapın", wait_days: 7 },
      { step_no: 3, channel: "call", message_template: "Kampanya son günü arayın", wait_days: 13 },
    ],
    created_at: "2025-01-01T10:00:00Z"
  },
  {
    id: uuid(704),
    name: "Kayıp Müşteri Geri Kazanım",
    description: "6+ ay sipariş vermeyen müşterileri geri kazanma planı",
    total_steps: 4,
    steps: [
      { step_no: 1, channel: "email", message_template: "Özlemişsiniz mesajı + özel indirim teklifi", wait_days: 0 },
      { step_no: 2, channel: "whatsapp", message_template: "Kişisel hatırlatma ve ürün yenilikleri", wait_days: 14 },
      { step_no: 3, channel: "call", message_template: "Neden sipariş vermediklerini öğrenin", wait_days: 21 },
      { step_no: 4, channel: "email", message_template: "Son fırsat: Ekstra indirim teklifi", wait_days: 30 },
    ],
    created_at: "2025-01-01T10:00:00Z"
  },
  {
    id: uuid(705),
    name: "Sosyal Medya Aday Takibi",
    description: "LinkedIn, Instagram ve Facebook üzerinden bulunan adaylar için 5 adımlı iletişim planı",
    total_steps: 5,
    steps: [
      { step_no: 1, channel: "linkedin_dm", message_template: "Bağlantı sonrası tanıtım: Bio Verim organik gübre çözümlerini ve sektördeki avantajlarını anlatan kısa mesaj gönderin", wait_days: 0 },
      { step_no: 2, channel: "instagram", message_template: "Instagram DM: Ürün kataloğu ve numune teklifi — görselli mesaj gönderin", wait_days: 3 },
      { step_no: 3, channel: "whatsapp", message_template: "WhatsApp ile kişisel takip: Sosyal medyada tanıştık, detay vermek istedim diyin", wait_days: 7 },
      { step_no: 4, channel: "facebook_dm", message_template: "Facebook Messenger: Kampanya duyurusu ve özel fiyat teklifi gönderin", wait_days: 12 },
      { step_no: 5, channel: "call", message_template: "Karar aşaması araması: Sosyal medya sürecini toparla ve sipariş al", wait_days: 18 },
    ],
    created_at: "2025-01-01T10:00:00Z"
  },
];

export const DEMO_CUSTOMER_SEQUENCES = [
  {
    id: uuid(801),
    customer_id: uuid(4),
    sequence_id: uuid(701),
    started_at: "2026-03-20T10:00:00Z",
    current_step: 2,
    status: "active",
    next_contact_at: "2026-03-23T10:00:00Z",
    created_by: null,
    created_at: "2026-03-20T10:00:00Z",
  },
  {
    id: uuid(802),
    customer_id: uuid(1),
    sequence_id: uuid(702),
    started_at: "2026-03-01T10:00:00Z",
    current_step: 1,
    status: "active",
    next_contact_at: "2026-04-01T10:00:00Z",
    created_by: null,
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: uuid(803),
    customer_id: uuid(8),
    sequence_id: uuid(705),
    started_at: "2026-03-24T09:00:00Z",
    current_step: 1,
    status: "active",
    next_contact_at: new Date().toISOString(), // Bugün — LinkedIn DM adımı
    created_by: null,
    created_at: "2026-03-24T09:00:00Z",
  },
  {
    id: uuid(804),
    customer_id: uuid(5),
    sequence_id: uuid(705),
    started_at: "2026-03-21T09:00:00Z",
    current_step: 2,
    status: "active",
    next_contact_at: new Date().toISOString(), // Bugün — Instagram adımı
    created_by: null,
    created_at: "2026-03-21T09:00:00Z",
  },
];

export const DEMO_QUOTES = [
  {
    id: uuid(901),
    customer_id: uuid(1),
    quote_number: "TKL-2025-001",
    status: "sent",
    valid_until: "2026-04-15",
    notes: "Bahar sezonu için hazırlanmış teklif.",
    subtotal: 19550,
    tax_rate: 20,
    tax_amount: 3910,
    total_amount: 23460,
    created_by: null,
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: uuid(902),
    customer_id: uuid(2),
    quote_number: "TKL-2025-002",
    status: "draft",
    valid_until: "2026-04-30",
    notes: null,
    subtotal: 13300,
    tax_rate: 20,
    tax_amount: 2660,
    total_amount: 15960,
    created_by: null,
    created_at: "2026-03-15T10:00:00Z",
  },
  {
    id: uuid(903),
    customer_id: uuid(4),
    quote_number: "TKL-2025-003",
    status: "accepted",
    valid_until: "2026-04-10",
    notes: "Müşteri telefonda onayladı.",
    subtotal: 15250,
    tax_rate: 20,
    tax_amount: 3050,
    total_amount: 18300,
    created_by: null,
    created_at: "2026-03-10T10:00:00Z",
  },
];

export const DEMO_QUOTE_ITEMS = [
  // TKL-2025-001 (Ege Tarım)
  { id: uuid(951), quote_id: uuid(901), product_id: uuid(202), description: "Bio Verim Sıvı Gübre 5L", quantity: 50, unit_price: 380, discount_percent: 0, line_total: 19000 },
  { id: uuid(952), quote_id: uuid(901), product_id: uuid(204), description: "Bio Verim Humik Asit 1L", quantity: 5, unit_price: 110, discount_percent: 0, line_total: 550 },
  // TKL-2025-002 (Antalya Seracılık)
  { id: uuid(953), quote_id: uuid(902), product_id: uuid(203), description: "Bio Verim Sıvı Gübre 20L", quantity: 10, unit_price: 1400, discount_percent: 5, line_total: 13300 },
  // TKL-2025-003 (Konya Tahıl)
  { id: uuid(954), quote_id: uuid(903), product_id: uuid(201), description: "Bio Verim Sıvı Gübre 1L", quantity: 100, unit_price: 85, discount_percent: 10, line_total: 7650 },
  { id: uuid(955), quote_id: uuid(903), product_id: uuid(202), description: "Bio Verim Sıvı Gübre 5L", quantity: 20, unit_price: 380, discount_percent: 0, line_total: 7600 },
];

export const DEMO_INFLUENCER_CONTACTS = [
  { id: uuid(1101), full_name: "Ahmet Kaya", title: "Ziraat Mühendisi", platform: "linkedin", profile_url: "https://linkedin.com/in/ahmet-kaya-ziraat", followers_count: 2800, city: "Ankara", phone: null, email: "ahmet.kaya@tarim.com", status: "not_contacted", notes: "Tarımsal danışmanlık yapıyor. Geniş çiftçi ağı var.", assigned_to: null, created_at: "2025-03-01T10:00:00Z" },
  { id: uuid(1102), full_name: "Fatma Şahin", title: "Kooperatif Genel Müdürü", platform: "linkedin", profile_url: "https://linkedin.com/in/fatma-sahin-kooperatif", followers_count: 1200, city: "Konya", phone: "0542 333 4455", email: null, status: "dm_sent", notes: "Konya Tahıl Kooperatifi GM. DM 15 Mart'ta gönderildi.", assigned_to: null, created_at: "2025-03-10T10:00:00Z" },
  { id: uuid(1103), full_name: "Organik Çiftlik", title: "Tarım İçerik Üreticisi", platform: "instagram", profile_url: "https://instagram.com/organikciftlik", followers_count: 85000, city: "İzmir", phone: "0533 555 6677", email: "iletisim@organikciftlik.com", status: "responded", notes: "85K takipçili tarım hesabı. Ürün tanıtımı için işbirliği görüşülüyor.", assigned_to: null, created_at: "2025-03-12T10:00:00Z" },
  { id: uuid(1104), full_name: "Çiftçi Mehmet", title: "YouTube Tarım Kanalı", platform: "youtube", profile_url: "https://youtube.com/@ciftcimehmet", followers_count: 45000, city: "Bursa", phone: null, email: "ciftcimehmet@gmail.com", status: "not_contacted", notes: "45K aboneli tarım kanalı. Gübre karşılaştırma videoları yapıyor.", assigned_to: null, created_at: "2025-03-15T10:00:00Z" },
  { id: uuid(1105), full_name: "Ayşe Tarım", title: "Instagram Tarım KOL'u", platform: "instagram", profile_url: "https://instagram.com/aysetarim", followers_count: 32000, city: "Antalya", phone: "0534 777 8899", email: null, status: "meeting_set", notes: "32K takipçi. 22 Mart Antalya toplantısı planlandı.", assigned_to: null, created_at: "2025-03-08T10:00:00Z" },
];

export function isDemoMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder") || !url.startsWith("https://");
}
