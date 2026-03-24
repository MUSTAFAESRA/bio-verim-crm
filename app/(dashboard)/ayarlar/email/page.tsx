import { EmailSetupClient } from "./setup-client";

export default function EmailAyarlarPage() {
  const resendConfigured = !!(
    process.env.RESEND_API_KEY &&
    !process.env.RESEND_API_KEY.startsWith("your_") &&
    !process.env.RESEND_API_KEY.startsWith("re_placeholder")
  );
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Bioverim <noreply@bioverim.com>";

  return (
    <EmailSetupClient
      resendConfigured={resendConfigured}
      fromEmail={fromEmail}
    />
  );
}
