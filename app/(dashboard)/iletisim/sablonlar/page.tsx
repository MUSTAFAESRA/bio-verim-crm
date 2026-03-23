import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTemplate, deleteTemplate } from "@/actions/message-templates";
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_ICONS, TEMPLATE_CATEGORY_LABELS } from "@/lib/utils";

const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600";

const CHANNEL_VARIANT: Record<string, "success" | "info" | "warning" | "secondary"> = {
  whatsapp: "success",
  email: "info",
  linkedin_dm: "info",
  instagram: "warning",
  facebook_dm: "info",
  telegram: "secondary",
  call: "secondary",
};

export default async function SablonlarPage() {
  const supabase = await createClient();
  const { data: templatesRaw } = await supabase.from("message_templates").select("*").order("channel");
  const templates = (templatesRaw ?? []) as Array<{
    id: string; title: string; channel: string; category: string; content: string; created_at: string;
  }>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/iletisim"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mesaj Şablonları</h1>
          <p className="text-sm text-slate-500 mt-0.5">Temas sırasında kullanabileceğiniz hazır mesaj şablonları</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-2 space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Henüz şablon eklenmedi</p>
          ) : (
            templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-slate-800">{t.title}</span>
                        <Badge variant={CHANNEL_VARIANT[t.channel] ?? "secondary"} className="text-xs">
                          {CONTACT_TYPE_ICONS[t.channel] ?? ""} {CONTACT_TYPE_LABELS[t.channel] ?? t.channel}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {TEMPLATE_CATEGORY_LABELS[t.category] ?? t.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 whitespace-pre-line line-clamp-3">{t.content}</p>
                    </div>
                    <form action={deleteTemplate.bind(null, t.id)}>
                      <button type="submit" className="text-slate-400 hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* New Template Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yeni Şablon Ekle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createTemplate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Başlık *</Label>
                  <Input name="title" placeholder="Şablon adı" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kanal *</Label>
                  <select name="channel" required className={selectClass}>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="email">📧 E-posta</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="linkedin_dm">💼 LinkedIn DM</option>
                    <option value="facebook_dm">📘 Facebook Mesaj</option>
                    <option value="telegram">✈️ Telegram</option>
                    <option value="call">📞 Telefon (script)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kategori</Label>
                  <select name="category" className={selectClass}>
                    <option value="urun_tanitim">Ürün Tanıtımı</option>
                    <option value="kampanya">Kampanya</option>
                    <option value="takip">Takip</option>
                    <option value="genel">Genel</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">İçerik *</Label>
                  <Textarea name="content" placeholder="Mesaj içeriği..." rows={5} required />
                </div>
                <Button type="submit" size="sm" className="w-full">Şablon Ekle</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
