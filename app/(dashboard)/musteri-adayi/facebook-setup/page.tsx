import { ArrowLeft, CheckCircle2, Copy, Facebook, Webhook, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.vercel.app"}/api/webhooks/facebook-leads`;

export default function FacebookSetupPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/musteri-adayi"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex items-center gap-2">
          <Facebook className="w-5 h-5 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Facebook Lead Ads Kurulum</h1>
            <p className="text-sm text-slate-500">Reklam formlarından gelen leadleri otomatik CRM&apos;e aktarın</p>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h2 className="font-semibold text-blue-800 mb-2">Ne işe yarar?</h2>
        <p className="text-sm text-blue-700">
          Facebook&apos;ta &quot;Fiyat Teklifi Al&quot; veya &quot;Katalog İste&quot; gibi bir Lead Ad formu oluşturduğunuzda,
          formu dolduran her kişi <strong>otomatik olarak</strong> CRM&apos;deki müşteri adayı listesine eklenir.
          Webhook entegrasyonu sayesinde gerçek zamanlı çalışır.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="font-semibold text-slate-800">Kurulum Adımları</h2>

        {/* Step 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <h3 className="font-semibold text-slate-800">Facebook Developer hesabı oluşturun</h3>
          </div>
          <p className="text-sm text-slate-600 ml-8">
            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              developers.facebook.com
            </a> adresine gidin. &quot;My Apps&quot; → &quot;Create App&quot; → &quot;Business&quot; seçin.
            Uygulamanıza &quot;BioVerim CRM&quot; gibi bir isim verin.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <h3 className="font-semibold text-slate-800">Webhook&apos;u kaydedin</h3>
          </div>
          <p className="text-sm text-slate-600 ml-8 mb-2">
            App Dashboard → &quot;Webhooks&quot; → &quot;leadgen&quot; konusunu seçin. Aşağıdaki URL&apos;yi kullanın:
          </p>
          <div className="ml-8">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <Webhook className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <code className="text-xs text-slate-700 flex-1 break-all">{WEBHOOK_URL}</code>
              <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Verify Token: <code className="bg-slate-100 px-1 rounded">bioverim_webhook_2025</code></p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <h3 className="font-semibold text-slate-800">Page Access Token ekleyin</h3>
          </div>
          <p className="text-sm text-slate-600 ml-8">
            App Dashboard → &quot;Facebook Login&quot; → &quot;Page Access Token&quot; oluşturun.
            Bu token&apos;ı <code className="bg-slate-100 px-1 rounded">.env.local</code> dosyasına ekleyin:
          </p>
          <pre className="ml-8 bg-slate-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto">
{`FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_APP_SECRET=your_app_secret`}
          </pre>
        </div>

        {/* Step 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
            <h3 className="font-semibold text-slate-800">Lead Ad formu oluşturun</h3>
          </div>
          <p className="text-sm text-slate-600 ml-8">
            Facebook Ads Manager → &quot;Lead Generation&quot; kampanyası oluşturun.
            Form alanları şunları içermeli: <strong>Ad Soyad, Telefon, Şehir</strong>.
            Daha fazla bilgi için &quot;E-posta&quot; alanı da eklenebilir.
          </p>
          <div className="ml-8 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-700">
              <strong>Öneri:</strong> Form başlığına &quot;Bio Verim — Ücretsiz Katalog&quot; veya
              &quot;Gübre Fiyat Teklifi Al&quot; yazın. Bu formla gelen leadler
              <strong> otomatik olarak CRM&apos;e eklenir</strong>.
            </p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">5</span>
            <h3 className="font-semibold text-slate-800">Testi yapın</h3>
          </div>
          <p className="text-sm text-slate-600 ml-8">
            Facebook Lead Ad Testing Tool&apos;u kullanarak test lead gönderin:
          </p>
          <a
            href="https://developers.facebook.com/tools/lead-ads-testing"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-8 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            developers.facebook.com/tools/lead-ads-testing →
          </a>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Entegrasyon Durumu</h2>
        <div className="space-y-2">
          {[
            { label: "Webhook endpoint aktif", check: true },
            { label: "Facebook App Secret yapılandırıldı", check: !!process.env.FACEBOOK_APP_SECRET },
            { label: "Page Access Token yapılandırıldı", check: !!process.env.FACEBOOK_PAGE_ACCESS_TOKEN },
          ].map(({ label, check }) => (
            <div key={label} className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${check ? "text-green-500" : "text-slate-300"}`} />
              <span className={`text-sm ${check ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-slate-800">Otomatik Çekme (Graph API)</h2>
        </div>
        <p className="text-sm text-slate-600">
          Webhook dışında, mevcut leadleri çekmek için Graph API kullanabilirsiniz:
        </p>
        <pre className="mt-3 bg-slate-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto">
{`GET /me/leadgen_forms
GET /{form_id}/leads
?access_token={PAGE_ACCESS_TOKEN}`}
        </pre>
        <p className="text-xs text-slate-500 mt-2">
          API endpoint: <code className="bg-slate-100 px-1 rounded">/api/leads/facebook-pull</code> — henüz kurulum yapılmadı.
        </p>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/musteri-adayi/facebook">Facebook Grup Tarama</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/musteri-adayi">Tüm Adaylar</Link>
        </Button>
      </div>
    </div>
  );
}
