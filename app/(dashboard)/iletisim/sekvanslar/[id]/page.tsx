import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { advanceStep, pauseSequence, resumeSequence } from "@/actions/contact-sequences";
import { CONTACT_TYPE_ICONS, CONTACT_TYPE_LABELS, SEQUENCE_STATUS_LABELS } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import { CallPrepPanel } from "./call-prep-panel";
import { AdvanceWithScoring } from "./advance-with-scoring";
import { DangerActions } from "./danger-actions";
import { WhatsAppPanel } from "./whatsapp-panel";
import { SocialPanel } from "./social-panel";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  active: "success",
  paused: "warning",
  completed: "secondary",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SekvansDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: csRaw } = await supabase
    .from("customer_sequences")
    .select("*, contact_sequences(id, name, description, total_steps, steps), customers(id, company_name, contact_name, city, phone, linkedin_url, instagram_url, facebook_url)")
    .eq("id", id)
    .single();

  if (!csRaw) notFound();

  const cs = csRaw as {
    id: string;
    customer_id: string;
    current_step: number;
    status: string;
    started_at: string;
    next_contact_at: string | null;
    contact_sequences: {
      id: string; name: string; description: string; total_steps: number;
      steps: Array<{ step_no: number; channel: string; message_template: string; wait_days: number }>;
    } | null;
    customers: { id: string; company_name: string; contact_name: string | null; city: string | null; phone: string | null; linkedin_url: string | null; instagram_url: string | null; facebook_url: string | null } | null;
  };

  const seq = cs.contact_sequences;
  const customer = cs.customers;

  if (!seq) notFound();

  const progress = Math.round((cs.current_step / seq.total_steps) * 100);
  const currentStepData = seq.steps?.[cs.current_step - 1];
  const isCallStep = currentStepData?.channel === "call";
  const isWhatsAppStep = currentStepData?.channel === "whatsapp";
  const isSocialStep = ["instagram", "linkedin_dm", "facebook_dm"].includes(currentStepData?.channel ?? "");

  const startDate = new Date(cs.started_at);
  const steps = seq.steps.map(step => {
    const estimatedDate = new Date(startDate);
    estimatedDate.setDate(estimatedDate.getDate() + step.wait_days);
    const isDone = step.step_no < cs.current_step;
    const isCurrent = step.step_no === cs.current_step;
    return { ...step, estimatedDate, isDone, isCurrent };
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/iletisim/sekvanslar"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{seq.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{customer?.company_name ?? "—"}</p>
          </div>
        </div>

        {/* Sil + Pasife al */}
        <DangerActions sequenceId={cs.id} />
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">{customer?.company_name}</span>
                {customer?.contact_name && (
                  <span className="text-xs text-slate-400">— {customer.contact_name}</span>
                )}
              </div>
              {customer?.city && <p className="text-xs text-slate-400">{customer.city}</p>}
              {customer?.phone && (
                <a href={`tel:${customer.phone}`} className="text-xs text-green-600 hover:underline mt-0.5 inline-block">
                  📞 {customer.phone}
                </a>
              )}
              <p className="text-xs text-slate-500 mt-1">{seq.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={STATUS_VARIANT[cs.status] ?? "secondary"}>
                {SEQUENCE_STATUS_LABELS[cs.status] ?? cs.status}
              </Badge>
              <p className="text-xs text-slate-400">Başlangıç: {formatDate(cs.started_at)}</p>
              {cs.next_contact_at && cs.status === "active" && (
                <p className="text-xs text-amber-600">Sonraki: {formatDate(cs.next_contact_at)}</p>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>İlerleme: Adım {cs.current_step} / {seq.total_steps}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          {cs.status !== "completed" && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {cs.status === "active" && cs.current_step <= seq.total_steps && currentStepData && (
                <AdvanceWithScoring
                  customerSequenceId={cs.id}
                  customerId={cs.customer_id}
                  stepNo={cs.current_step}
                  channel={currentStepData.channel}
                  seqName={seq.name}
                  customerName={customer?.company_name ?? ""}
                  isLastStep={cs.current_step >= seq.total_steps}
                />
              )}
              {cs.status === "active" && (
                <form action={pauseSequence.bind(null, cs.id)}>
                  <Button type="submit" size="sm" variant="outline">Duraklat</Button>
                </form>
              )}
              {cs.status === "paused" && (
                <form action={resumeSequence.bind(null, cs.id)}>
                  <Button type="submit" size="sm" variant="default">Devam Et</Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Call Prep Panel — sadece call adımı için */}
      {cs.status === "active" && isCallStep && currentStepData && customer && (
        <CallPrepPanel
          customerId={cs.customer_id}
          customerName={customer.company_name}
          stepNo={cs.current_step}
          stepTemplate={currentStepData.message_template}
          seqName={seq.name}
        />
      )}

      {/* WhatsApp Panel — WhatsApp adımı için gönder + AI yanıt */}
      {cs.status === "active" && isWhatsAppStep && currentStepData && customer && (
        <WhatsAppPanel
          customerId={cs.customer_id}
          customerName={customer.company_name}
          phone={customer.phone ?? null}
          stepTemplate={currentStepData.message_template}
          stepNo={cs.current_step}
          seqName={seq.name}
        />
      )}

      {/* Sosyal Medya Paneli — instagram, linkedin_dm, facebook_dm adımları için */}
      {cs.status === "active" && isSocialStep && currentStepData && customer && (
        <SocialPanel
          customerId={cs.customer_id}
          customerName={customer.company_name}
          channel={currentStepData.channel as "instagram" | "linkedin_dm" | "facebook_dm"}
          stepTemplate={currentStepData.message_template}
          stepNo={cs.current_step}
          seqName={seq.name}
          customerSequenceId={cs.id}
          linkedinUrl={customer.linkedin_url}
          instagramUrl={customer.instagram_url}
          facebookUrl={customer.facebook_url}
        />
      )}

      {/* Auto-send bilgisi — call, whatsapp ve sosyal dışı adımlar için (email vb.) */}
      {cs.status === "active" && currentStepData && !isCallStep && !isWhatsAppStep && !isSocialStep && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          <p className="font-semibold mb-1">
            {currentStepData.channel === "email" ? "📧" : "📨"}{" "}
            Otomatik Gönderim Aktif
          </p>
          <p className="text-xs text-green-600">
            Bu adım ({CONTACT_TYPE_LABELS[currentStepData.channel] ?? currentStepData.channel}) ilerletildiğinde temas kaydı otomatik oluşturulur.
          </p>
        </div>
      )}

      {/* Steps timeline */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Adım Zaman Çizelgesi</h2>
        <div className="relative">
          <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-slate-200" />

          <div className="space-y-4">
            {steps.map(step => (
              <div key={step.step_no} className="flex items-start gap-4">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                  step.isDone
                    ? "bg-green-500 border-green-500 text-white"
                    : step.isCurrent
                    ? "bg-amber-50 border-amber-400 text-amber-600"
                    : "bg-white border-slate-200 text-slate-400"
                }`}>
                  {step.isDone ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : step.isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>

                <div className={`flex-1 pb-2 ${
                  step.isCurrent ? "bg-amber-50 rounded-lg p-3 border border-amber-200" : ""
                }`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${
                      step.isDone ? "text-slate-400 line-through" : "text-slate-800"
                    }`}>
                      Adım {step.step_no}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {CONTACT_TYPE_ICONS[step.channel] ?? ""}{" "}
                      {CONTACT_TYPE_LABELS[step.channel] ?? step.channel}
                    </Badge>
                    {step.isCurrent && (
                      <Badge variant="warning" className="text-xs">Şu an</Badge>
                    )}
                    {step.channel !== "call" && step.isCurrent && (
                      <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">⚡ Oto</span>
                    )}
                  </div>
                  <p className={`text-xs ${step.isDone ? "text-slate-400" : "text-slate-600"}`}>
                    {step.message_template}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {step.wait_days === 0
                      ? `Başlangıç günü — ${formatDate(step.estimatedDate.toISOString())}`
                      : `+${step.wait_days} gün — ${formatDate(step.estimatedDate.toISOString())}`
                    }
                  </p>
                </div>
              </div>
            ))}

            {cs.status === "completed" && (
              <div className="flex items-center gap-4">
                <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-500 border-2 border-slate-500 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">Sekans Tamamlandı</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
