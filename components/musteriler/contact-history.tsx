"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ContactAnalysisBadge } from "@/components/musteriler/contact-analysis-badge";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  call: "Telefon",
  visit: "Ziyaret",
  email: "Email",
  whatsapp: "WhatsApp",
  facebook_dm: "Facebook DM",
  instagram_dm: "Instagram DM",
  linkedin_dm: "LinkedIn DM",
  other: "Diğer",
};

const OUTCOME_LABELS: Record<string, string> = {
  interested: "İlgilendi",
  not_interested: "İlgilenmedi",
  callback: "Geri arayacak",
  meeting_scheduled: "Toplantı",
  sale_made: "Satış yapıldı",
  no_answer: "Cevap yok",
  left_message: "Mesaj bırakıldı",
};

const CONTACT_EMOJI: Record<string, string> = {
  call: "📞",
  visit: "🤝",
  email: "📧",
  whatsapp: "💬",
  facebook_dm: "📘",
  instagram_dm: "📸",
  linkedin_dm: "💼",
  other: "📋",
};

interface ContactLog {
  id: string;
  contact_type: string;
  notes: string | null;
  outcome: string | null;
  direction: string | null;
  subject: string | null;
  contacted_at: string;
  next_action_date: string | null;
  next_action: string | null;
}

interface ContactHistoryProps {
  contacts: ContactLog[];
  customerId: string;
}

export function ContactHistory({ contacts, customerId }: ContactHistoryProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          İletişim Geçmişi ({contacts.length})
        </h2>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <Link href={`/iletisim/yeni?customer_id=${customerId}`}>
            <Plus className="w-3 h-3" /> Temas Ekle
          </Link>
        </Button>
      </div>

      {contacts.length > 0 ? (
        <div className="space-y-3">
          {contacts.map((log) => (
            <div key={log.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                {CONTACT_EMOJI[log.contact_type] ?? "📋"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {CONTACT_TYPE_LABELS[log.contact_type] || log.contact_type}
                    </span>
                    {log.direction && (
                      <span className="text-[10px] text-slate-400">
                        {log.direction === "inbound" ? "↙ Gelen" : "↗ Giden"}
                      </span>
                    )}
                  </div>
                  {log.outcome && (
                    <Badge variant="secondary" className="text-xs">
                      {OUTCOME_LABELS[log.outcome] || log.outcome}
                    </Badge>
                  )}
                </div>
                {log.subject && <p className="text-sm text-slate-600 mt-0.5">{log.subject}</p>}
                {log.notes && <p className="text-xs text-slate-400 mt-1">{log.notes}</p>}
                {log.next_action_date && (
                  <p className="text-xs text-amber-600 mt-1">
                    Sonraki aksiyon: {formatDate(log.next_action_date)} — {log.next_action}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">{formatDate(log.contacted_at)}</p>

                {/* AI Analiz Badge */}
                <ContactAnalysisBadge
                  contactLogId={log.id}
                  customerId={customerId}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-6">
          Henüz iletişim kaydı bulunmuyor
        </p>
      )}
    </div>
  );
}
