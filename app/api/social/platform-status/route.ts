import { NextResponse } from "next/server";

export async function GET() {
  const linkedin = !!(
    process.env.LINKEDIN_ACCESS_TOKEN &&
    !process.env.LINKEDIN_ACCESS_TOKEN.startsWith("your_") &&
    process.env.LINKEDIN_PERSON_ID
  );

  const facebook = !!(
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN &&
    !process.env.FACEBOOK_PAGE_ACCESS_TOKEN.startsWith("your_") &&
    process.env.FACEBOOK_PAGE_ID &&
    !process.env.FACEBOOK_PAGE_ID.startsWith("your_")
  );

  const instagram = !!(
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN &&
    !process.env.FACEBOOK_PAGE_ACCESS_TOKEN.startsWith("your_") &&
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID &&
    !process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID.startsWith("your_")
  );

  const telegram = !!(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_BOT_TOKEN !== "your_telegram_bot_token" &&
    process.env.TELEGRAM_CHAT_ID &&
    process.env.TELEGRAM_CHAT_ID !== "your_telegram_chat_id"
  );

  const ai = !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
  const imageAi = !!process.env.HF_API_TOKEN;

  return NextResponse.json({
    platforms: { linkedin, facebook, instagram },
    services: { telegram, ai, imageAi },
    missing: {
      facebook: !facebook ? "FACEBOOK_PAGE_ACCESS_TOKEN + FACEBOOK_PAGE_ID" : null,
      instagram: !instagram ? "INSTAGRAM_BUSINESS_ACCOUNT_ID + FACEBOOK_PAGE_ACCESS_TOKEN" : null,
      imageAi: !imageAi ? "HF_API_TOKEN (huggingface.co ücretsiz token)" : null,
    }
  });
}
