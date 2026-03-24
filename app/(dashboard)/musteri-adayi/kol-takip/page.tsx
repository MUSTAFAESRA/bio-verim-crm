import { createClient } from "@/lib/supabase/server";
import { Linkedin, Instagram, Youtube, Facebook, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateInfluencerStatus, deleteInfluencerContact, createInfluencerContact } from "@/actions/influencer-contacts";

type Platform = "linkedin" | "instagram" | "facebook" | "youtube" | "other";
type Status = "not_contacted" | "dm_sent" | "responded" | "meeting_set" | "converted";

const STATUS_LABELS: Record<Status, string> = {
  not_contacted: "İletişime Geçilmedi",
  dm_sent: "DM Gönderildi",
  responded: "Yanıt Aldı",
  meeting_set: "Toplantı Planlandı",
  converted: "Dönüştürüldü",
};

const STATUS_VARIANT: Record<Status, "secondary" | "warning" | "info" | "success" | "muted"> = {
  not_contacted: "secondary",
  dm_sent: "warning",
  responded: "info",
  meeting_set: "success",
  converted: "muted",
};

const NEXT_STATUS: Record<Status, Status | null> = {
  not_contacted: "dm_sent",
  dm_sent: "responded",
  responded: "meeting_set",
  meeting_set: "converted",
  converted: null,
};

const NEXT_STATUS_LABEL: Record<Status, string> = {
  not_contacted: "DM Gönder",
  dm_sent: "Yanıt Aldı",
  responded: "Toplantı Planla",
  meeting_set: "Dönüştür",
  converted: "",
};

const PLATFORM_ICON: Record<Platform, React.ReactNode> = {
  linkedin: <Linkedin className="w-4 h-4 text-blue-600" />,
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  facebook: <Facebook className="w-4 h-4 text-blue-500" />,
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
  other: <span className="w-4 h-4 text-slate-400">●</span>,
};

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  other: "Diğer",
};

export default async function KolTakipPage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("influencer_contacts")
    .select("*")
    .order("created_at", { ascending: false });

  const all = contacts ?? [];

  const statsByPlatform = (["linkedin", "instagram", "youtube", "facebook"] as Platform[]).map((p) => ({
    platform: p,
    count: all.filter((c) => c.platform === p).length,
  }));

  const statusCounts = (Object.keys(STATUS_LABELS) as Status[]).map((s) => ({
    status: s,
    count: all.filter((c) => c.status === s).length,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/musteri-adayi"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">KOL / Önemli Kişi Takibi</h1>
            <p className="text-sm text-slate-500 mt-0.5">Ziraat mühendisi, kooperatif müdürü ve tarım influencer'larını yönetin</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsByPlatform.map(({ platform, count }) => (
          <div key={platform} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            {PLATFORM_ICON[platform as Platform]}
            <div>
              <p className="text-xs text-slate-500">{PLATFORM_LABELS[platform as Platform]}</p>
              <p className="text-xl font-bold text-slate-800">{count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {statusCounts.map(({ status, count }) => (
          <div key={status} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">{STATUS_LABELS[status as Status]}</p>
            <p className="text-2xl font-bold text-slate-800">{count}</p>
          </div>
        ))}
      </div>

      {/* Add New Contact Form */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-sm">Yeni Kişi Ekle</h2>
        </div>
        <form action={createInfluencerContact} className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Ad Soyad / Hesap Adı *</label>
            <input
              name="full_name"
              required
              placeholder="örn. Ahmet Kaya"
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Unvan</label>
            <input
              name="title"
              placeholder="örn. Ziraat Mühendisi"
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Platform *</label>
            <select
              name="platform"
              required
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="other">Diğer</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Profil URL</label>
            <input
              name="profile_url"
              type="url"
              placeholder="https://linkedin.com/in/..."
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Takipçi / Bağlantı Sayısı</label>
            <input
              name="followers_count"
              type="number"
              min="0"
              placeholder="örn. 5000"
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Şehir</label>
            <input
              name="city"
              placeholder="örn. Ankara"
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Telefon</label>
            <input
              name="phone"
              placeholder="0532 xxx xx xx"
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">E-posta</label>
            <input
              name="email"
              type="email"
              placeholder="ornek@mail.com"
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Notlar</label>
            <input
              name="notes"
              placeholder="Kısa not..."
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
              Kişiyi Kaydet
            </Button>
          </div>
        </form>
      </div>

      {/* Contacts List */}
      {all.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">Henüz kayıtlı kişi yok. Yukarıdan ekleyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {all.map((contact) => {
            const status = contact.status as Status;
            const platform = contact.platform as Platform;
            const next = NEXT_STATUS[status];
            return (
              <div key={contact.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {PLATFORM_ICON[platform]}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{contact.full_name}</p>
                      {contact.title && <p className="text-xs text-slate-500">{contact.title}</p>}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[status]} className="ml-2 flex-shrink-0 text-xs">
                    {STATUS_LABELS[status]}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    {PLATFORM_LABELS[platform]}
                  </span>
                  {contact.city && <span>· {contact.city}</span>}
                  {contact.followers_count && (
                    <span>· {contact.followers_count.toLocaleString("tr-TR")} takipçi</span>
                  )}
                </div>

                {contact.notes && (
                  <p className="text-xs text-slate-500 line-clamp-2">{contact.notes}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                  {contact.profile_url && (
                    <a
                      href={contact.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Profili Aç
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="text-xs text-slate-500 hover:text-green-600">
                      {contact.phone}
                    </a>
                  )}
                  <div className="ml-auto flex gap-1">
                    {next && (
                      <form action={updateInfluencerStatus.bind(null, contact.id, next)}>
                        <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
                          {NEXT_STATUS_LABEL[status]}
                        </Button>
                      </form>
                    )}
                    <form action={deleteInfluencerContact.bind(null, contact.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
