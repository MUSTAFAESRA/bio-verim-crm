import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Plus, PlayCircle, PauseCircle, ChevronRight, Trash2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { assignSequence, pauseSequence, resumeSequence, advanceStep, deleteSequenceAssignment, markCustomerPassive } from "@/actions/contact-sequences";
import { CONTACT_TYPE_ICONS, CONTACT_TYPE_LABELS, SEQUENCE_STATUS_LABELS } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  active: "success",
  paused: "warning",
  completed: "secondary",
};

export default async function SekvanslarPage() {
  const supabase = await createClient();

  const [
    { data: sequencesRaw },
    { data: customerSequencesRaw },
    { data: customersRaw },
  ] = await Promise.all([
    supabase.from("contact_sequences").select("*").order("created_at"),
    supabase.from("customer_sequences").select("*, contact_sequences(name, total_steps, steps), customers(company_name, contact_name)").order("created_at", { ascending: false }),
    supabase.from("customers").select("id, company_name, contact_name").order("company_name").limit(200),
  ]);

  const sequences = (sequencesRaw ?? []) as Array<{
    id: string; name: string; description: string; total_steps: number;
    steps: Array<{ step_no: number; channel: string; message_template: string; wait_days: number }>;
    created_at: string;
  }>;

  const customerSequences = (customerSequencesRaw ?? []) as Array<{
    id: string; customer_id: string; current_step: number; status: string;
    started_at: string; next_contact_at: string | null;
    contact_sequences: { name: string; total_steps: number; steps: any[] } | null;
    customers: { company_name: string; contact_name: string | null } | null;
  }>;

  const customers = (customersRaw ?? []) as Array<{
    id: string; company_name: string; contact_name: string | null;
  }>;

  const activeCount = customerSequences.filter(cs => cs.status === "active").length;
  const completedCount = customerSequences.filter(cs => cs.status === "completed").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/iletisim"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Temas Sekvansları</h1>
          <p className="text-sm text-slate-500 mt-0.5">Müşterilere periyodik temas planı atayın, otomatik hatırlatıcılar üretin</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{sequences.length}</p>
          <p className="text-xs text-slate-500 mt-1">Sekans Şablonu</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-slate-500 mt-1">Aktif Atama</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">{completedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Tamamlanan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Assignments */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Aktif Atamalar</h2>
          {customerSequences.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Henüz sekans atanmadı</p>
          ) : (
            customerSequences.map(cs => {
              const seq = cs.contact_sequences;
              const customer = cs.customers;
              const currentStepData = seq?.steps?.[cs.current_step - 1];
              const progress = seq ? Math.round((cs.current_step / seq.total_steps) * 100) : 0;

              return (
                <Card key={cs.id} className={cs.status === "paused" ? "opacity-70" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {customer?.company_name ?? "—"}
                          </span>
                          {customer?.contact_name && (
                            <span className="text-xs text-slate-400">{customer.contact_name}</span>
                          )}
                          <Badge variant={STATUS_VARIANT[cs.status] ?? "secondary"} className="text-xs">
                            {SEQUENCE_STATUS_LABELS[cs.status] ?? cs.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-600 font-medium mb-1">{seq?.name ?? "—"}</p>

                        {/* Progress bar */}
                        {seq && (
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Adım {cs.current_step} / {seq.total_steps}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {currentStepData && cs.status !== "completed" && (
                          <p className="text-xs text-slate-500">
                            <span className="font-medium">Güncel adım:</span>{" "}
                            {CONTACT_TYPE_ICONS[currentStepData.channel] ?? ""}{" "}
                            {currentStepData.message_template}
                          </p>
                        )}

                        {cs.next_contact_at && cs.status === "active" && (
                          <p className="text-xs text-amber-600 mt-1">
                            Sonraki temas: {formatDate(cs.next_contact_at)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {cs.status === "active" && seq && cs.current_step < seq.total_steps && (
                          <form action={advanceStep.bind(null, cs.id)}>
                            <button type="submit" className="text-xs text-green-600 hover:text-green-800 whitespace-nowrap px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                              Adım İlerlet
                            </button>
                          </form>
                        )}
                        {cs.status === "active" && (
                          <form action={pauseSequence.bind(null, cs.id)}>
                            <button type="submit" className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 px-2 py-1 rounded border border-amber-200 hover:bg-amber-50">
                              <PauseCircle className="w-3 h-3" /> Duraklat
                            </button>
                          </form>
                        )}
                        {cs.status === "paused" && (
                          <form action={resumeSequence.bind(null, cs.id)}>
                            <button type="submit" className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                              <PlayCircle className="w-3 h-3" /> Devam Et
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/iletisim/sekvanslar/${cs.id}`}
                          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 px-2 py-1"
                        >
                          Detay <ChevronRight className="w-3 h-3" />
                        </Link>
                        <form action={markCustomerPassive.bind(null, cs.id)}>
                          <button type="submit" className="text-xs text-amber-500 hover:text-amber-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-50" title="Müşteriyi pasife al">
                            <UserMinus className="w-3 h-3" /> Pasif
                          </button>
                        </form>
                        <form action={deleteSequenceAssignment.bind(null, cs.id)}>
                          <button type="submit" className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50" title="Sekansı sil">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Sequence Templates */}
          <h2 className="text-sm font-semibold text-slate-700 pt-2">Sekans Şablonları</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sequences.map(seq => (
              <Card key={seq.id} className="hover:border-green-300 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-800">{seq.name}</p>
                    <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">{seq.total_steps} adım</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{seq.description}</p>
                  <div className="space-y-1">
                    {seq.steps.map(step => (
                      <div key={step.step_no} className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium flex-shrink-0">
                          {step.step_no}
                        </span>
                        <span>{CONTACT_TYPE_ICONS[step.channel] ?? ""}</span>
                        <span className="truncate">{step.message_template}</span>
                        {step.wait_days > 0 && (
                          <span className="text-slate-300 flex-shrink-0">+{step.wait_days}g</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Assign Sequence Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Sekans Ata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={assignSequence} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Müşteri *</Label>
                  <select name="customer_id" required className={selectClass}>
                    <option value="">Müşteri seçin...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}{c.contact_name ? ` — ${c.contact_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sekans *</Label>
                  <select name="sequence_id" required className={selectClass}>
                    <option value="">Sekans seçin...</option>
                    {sequences.map(seq => (
                      <option key={seq.id} value={seq.id}>
                        {seq.name} ({seq.total_steps} adım)
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400">
                  Atama yapıldığında ilk adım için otomatik hatırlatıcı oluşturulur.
                </p>
                <Button type="submit" size="sm" className="w-full">Sekans Ata</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
