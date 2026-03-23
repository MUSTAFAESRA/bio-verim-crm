"use client";

import { Printer, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  quoteNumber: string;
  totalAmount: string;
  validUntil: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export default function QuoteShareButtons({
  quoteNumber,
  totalAmount,
  validUntil,
  customerName,
  customerEmail,
  customerPhone,
}: Props) {
  const emailSubject = `${quoteNumber} - Teklif - Bio Verim Organik Gübre`;
  const emailBody =
    `Sayın ${customerName},\n\n` +
    `${quoteNumber} numaralı teklifimizi bilgilerinize sunarız.\n\n` +
    `Genel Toplam: ${totalAmount}\n` +
    `Geçerlilik Tarihi: ${validUntil}\n\n` +
    `Teklifimiz hakkında sorularınız için bizimle iletişime geçebilirsiniz.\n\n` +
    `Saygılarımızla,\n` +
    `Bio Verim Organik Gübre\n` +
    `Tel: 0850 000 00 00\n` +
    `E-posta: info@bioverim.com.tr\n` +
    `www.bioverim.com.tr`;

  const whatsappText =
    `Sayın ${customerName}, ${quoteNumber} numaralı teklifimizi bilgilerinize sunarız. ` +
    `Genel Toplam: ${totalAmount}. ` +
    `${validUntil} tarihine kadar geçerlidir. ` +
    `Saygılarımızla, Bio Verim Organik Gübre`;

  const digits = customerPhone?.replace(/\D/g, "") ?? "";
  const waPhone = digits.startsWith("0") ? "90" + digits.slice(1) : digits.startsWith("90") ? digits : "90" + digits;

  return (
    <div className="flex gap-2 flex-wrap print:hidden">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="w-4 h-4" /> PDF / Yazdır
      </Button>
      {customerEmail && (
        <Button asChild variant="outline" size="sm">
          <a
            href={`mailto:${customerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
          >
            <Mail className="w-4 h-4" /> E-posta Gönder
          </a>
        </Button>
      )}
      {digits.length >= 10 && (
        <Button asChild size="sm" className="bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0">
          <a
            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </Button>
      )}
    </div>
  );
}
