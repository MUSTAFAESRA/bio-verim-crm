import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₺0,00";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  return new Intl.NumberFormat("tr-TR").format(n);
}

export const SEGMENT_LABELS: Record<string, string> = {
  lead: "Aday",
  active: "Aktif",
  passive: "Pasif",
};

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  call: "Telefon",
  visit: "Ziyaret",
  email: "E-posta",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  linkedin_dm: "LinkedIn DM",
  facebook_dm: "Facebook Mesaj",
  telegram: "Telegram",
  meeting: "Toplantı",
  other: "Diğer",
};

export const CONTACT_TYPE_ICONS: Record<string, string> = {
  call: "📞",
  visit: "🤝",
  email: "📧",
  whatsapp: "💬",
  instagram: "📸",
  linkedin_dm: "💼",
  facebook_dm: "📘",
  telegram: "✈️",
  meeting: "👥",
  other: "📝",
};

export const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};

export const SOCIAL_POST_TYPE_LABELS: Record<string, string> = {
  urun_tanitim: "Ürün Tanıtımı",
  kampanya: "Kampanya",
  genel: "Genel İçerik",
};

export const SOCIAL_POST_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  scheduled: "Zamanlanmış",
  published: "Yayında",
  cancelled: "İptal",
};

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  urun_tanitim: "Ürün Tanıtımı",
  kampanya: "Kampanya",
  takip: "Takip",
  genel: "Genel",
};

export const SEQUENCE_STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  paused: "Duraklatıldı",
  completed: "Tamamlandı",
};

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  sent: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  expired: "Süresi Doldu",
};

export const OUTCOME_LABELS: Record<string, string> = {
  interested: "İlgili",
  not_interested: "İlgisiz",
  follow_up: "Takip Gerekli",
  sale_made: "Satış Yapıldı",
  no_answer: "Cevap Yok",
  other: "Diğer",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  sent: "Gönderildi",
  partially_paid: "Kısmi Ödeme",
  paid: "Ödendi",
  overdue: "Gecikmiş",
  cancelled: "İptal",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Havale/EFT",
  cash: "Nakit",
  check: "Çek",
  credit_card: "Kredi Kartı",
};

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  planned: "Planlandı",
  in_production: "Üretimde",
  partial_delivery: "Kısmi Teslimat",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  contacted: "İletişime Geçildi",
  qualified: "Nitelikli",
  converted: "Müşteriye Dönüştürüldü",
  rejected: "Reddedildi",
};

export const SOURCE_LABELS: Record<string, string> = {
  manual: "Manuel",
  google_places: "Google Places",
  linkedin: "LinkedIn",
  facebook_lead: "Facebook",
  referral: "Referans",
  other: "Diğer",
};
