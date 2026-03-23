import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, LEAD_STATUS_LABELS, SOURCE_LABELS } from "@/lib/utils";
import { convertLeadToCustomer } from "@/actions/leads";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdayDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const action = convertLeadToCustomer.bind(null, id);

  const isConvertible = lead.status !== "converted" && lead.status !== "rejected";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/musteri-adayi">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">{lead.business_name}</h1>
            <Badge variant="info" className="text-xs">
              {LEAD_STATUS_LABELS[lead.status] || lead.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">{SOURCE_LABELS[lead.source || "manual"]} · {formatDate(lead.created_at)}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-slate-400" />
              <a href={`tel:${lead.phone}`} className="text-green-600 hover:underline">{lead.phone}</a>
            </div>
          )}
          {lead.city && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{lead.city}{lead.address ? ` — ${lead.address}` : ""}</span>
            </div>
          )}
          {lead.notes && (
            <p className="text-sm text-slate-600 pt-2 border-t">{lead.notes}</p>
          )}
        </CardContent>
      </Card>

      {isConvertible && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <UserPlus className="w-4 h-4" />
              Müşteriye Dönüştür
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <input type="hidden" name="source" value={lead.source || "manual"} />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="company_name">Firma Adı *</Label>
                  <Input id="company_name" name="company_name" defaultValue={lead.business_name} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_name">İlgili Kişi</Label>
                  <Input id="contact_name" name="contact_name" defaultValue={lead.contact_name || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" defaultValue={lead.phone || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" name="email" type="email" defaultValue={lead.email || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">İl</Label>
                  <Input id="city" name="city" defaultValue={lead.city || ""} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="address">Adres</Label>
                  <Input id="address" name="address" defaultValue={lead.address || ""} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea id="notes" name="notes" defaultValue={lead.notes || ""} rows={2} />
                </div>
              </div>
              <Button type="submit" className="w-full">
                <UserPlus className="w-4 h-4" />
                Müşteri Olarak Kaydet
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {lead.status === "converted" && lead.converted_to && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-green-700 font-medium">Bu aday müşteriye dönüştürüldü.</p>
            <Button asChild size="sm" className="mt-3">
              <Link href={`/musteriler/${lead.converted_to}`}>Müşteri Profiline Git</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
