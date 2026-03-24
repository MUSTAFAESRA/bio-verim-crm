import { WhatsAppSetupClient } from "./setup-client";

export default function WhatsAppKurulumPage() {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "bio-verim-whatsapp-2024";
  const appUrl = process.env.WHATSAPP_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/webhooks/whatsapp`;

  const tokenConfigured = !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    !process.env.WHATSAPP_ACCESS_TOKEN.startsWith("your_")
  );
  const phoneIdConfigured = !!(
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !process.env.WHATSAPP_PHONE_NUMBER_ID.startsWith("your_")
  );
  const autoReply = process.env.WHATSAPP_AUTO_REPLY === "true";

  return (
    <WhatsAppSetupClient
      verifyToken={verifyToken}
      webhookUrl={webhookUrl}
      tokenConfigured={tokenConfigured}
      phoneIdConfigured={phoneIdConfigured}
      autoReply={autoReply}
    />
  );
}
