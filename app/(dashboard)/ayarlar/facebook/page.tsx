import { FacebookSetupClient } from "./setup-client";

export default function FacebookAyarlarPage() {
  const appUrl = process.env.FACEBOOK_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/webhooks/facebook-messenger`;
  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN ?? "bio-verim-facebook-2024";

  const pageTokenConfigured = !!(
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN &&
    !process.env.FACEBOOK_PAGE_ACCESS_TOKEN.startsWith("your_")
  );
  const pageIdConfigured = !!(
    process.env.FACEBOOK_PAGE_ID &&
    !process.env.FACEBOOK_PAGE_ID.startsWith("your_")
  );
  const instagramConfigured = !!(
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID &&
    !process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID.startsWith("your_")
  );

  return (
    <FacebookSetupClient
      pageTokenConfigured={pageTokenConfigured}
      pageIdConfigured={pageIdConfigured}
      pageId={process.env.FACEBOOK_PAGE_ID ?? ""}
      instagramConfigured={instagramConfigured}
      verifyToken={verifyToken}
      webhookUrl={webhookUrl}
      facebookAutoReply={process.env.FACEBOOK_AUTO_REPLY === "true"}
      instagramAutoReply={process.env.INSTAGRAM_AUTO_REPLY === "true"}
    />
  );
}
