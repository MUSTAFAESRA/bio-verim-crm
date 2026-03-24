"use client";

import { useState } from "react";
import { Star, X, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logStepScore } from "@/actions/contact-sequences";

interface ScoringModalProps {
  customerSequenceId: string;
  customerId: string;
  stepNo: number;
  channel: string;
  seqName: string;
  customerName: string;
  onClose: () => void;
  onDone: () => void;
}

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              i <= value ? "text-amber-400" : "text-slate-200"
            }`}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScoringModal({
  customerSequenceId, customerId, stepNo, channel, seqName, customerName, onClose, onDone
}: ScoringModalProps) {
  const [ilgi, setIlgi] = useState(3);
  const [niyet, setNiyet] = useState(3);
  const [tekrar, setTekrar] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const score = Math.round(((ilgi + niyet) / 10) * 10);

  const handleSubmit = async () => {
    setLoading(true);
    await logStepScore({
      customerSequenceId, customerId, stepNo, channel, seqName, score, ilgi, niyet, tekrar, notes
    });
    setDone(true);
    setLoading(false);
    setTimeout(onDone, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {done ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-slate-800">Puan Kaydedildi!</p>
            <p className="text-sm text-slate-500">Temas kaydına eklendi.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">Adım {stepNo} Değerlendirmesi</p>
                <p className="text-xs text-slate-400">{customerName} · {seqName}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                {channel === "call"
                  ? "Arama tamamlandı. Görüşme nasıl geçti?"
                  : channel === "whatsapp"
                  ? "WhatsApp mesajı gönderildi. Müşteri tepkisini değerlendirin."
                  : channel === "email"
                  ? "E-posta gönderildi. Müşteri etkileşimini değerlendirin."
                  : "Temas tamamlandı. Bu adımı değerlendirin."
                }{" "}
                Yanıtlarınız müşteri profilini günceller ve bir sonraki adım için yapay zeka önerileri üretir.
              </p>

              <StarRating label="Müşteri ilgisi" value={ilgi} onChange={setIlgi} />
              <StarRating label="Satın alma niyeti" value={niyet} onChange={setNiyet} />

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Tekrar iletişim kurmak istiyor</span>
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setTekrar(v)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        tekrar === v
                          ? "bg-green-500 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {v ? "Evet" : "Hayır"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">
                  {channel === "call" ? "Görüşme notu" : "Temas notu"} (opsiyonel)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={channel === "call" ? "Müşterinin söylediği önemli bir şey var mıydı?" : "Müşteri tepkisi, önemli bir detay var mıydı?"}
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Score preview */}
              <div className={`rounded-xl p-3 text-center ${
                score >= 7 ? "bg-green-50 border border-green-200" :
                score >= 4 ? "bg-amber-50 border border-amber-200" :
                "bg-red-50 border border-red-200"
              }`}>
                <p className="text-2xl font-bold text-slate-800">{score}<span className="text-base text-slate-400">/10</span></p>
                <p className={`text-xs font-medium ${
                  score >= 7 ? "text-green-600" : score >= 4 ? "text-amber-600" : "text-red-500"
                }`}>
                  {score >= 7 ? "🔥 İlgili müşteri — öncelik ver" : score >= 4 ? "⏳ Takipte tut" : "❄️ Düşük potansiyel"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-0">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={loading}>
                Atla
              </Button>
              <Button size="sm" className="flex-1 gap-2" onClick={handleSubmit} disabled={loading}>
                {loading ? "Kaydediliyor..." : <><Send className="w-3.5 h-3.5" /> Kaydet</>}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
