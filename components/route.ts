import { NextRequest, NextResponse } from "next/server";

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Bot (AnythingLLM) — where user accounts live
const BOT_API_URL = "https://loi.morched.tn/api/v1";
const BOT_URL = "https://loi.morched.tn";
const WORKSPACE = "loi";

// Shop (Next.js) — for redirect fallbacks
const SHOP_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pwg4scgs4ws8wkc8oog8w4ck.morched.tn";

async function getPaypalAccessToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // PayPal order ID
  const payerId = searchParams.get("PayerID");

  if (!token || !payerId) {
    return NextResponse.redirect(`${SHOP_URL}/?paypal=error`);
  }

  try {
    // 1. Capture payment
    const accessToken = await getPaypalAccessToken();
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureRes.json();
    if (captureData.status !== "COMPLETED") {
      console.error("PayPal capture failed:", captureData);
      return NextResponse.redirect(`${SHOP_URL}/?paypal=failed`);
    }

    // 2. Create paid user on the bot
    const payerEmail: string = captureData.payer?.email_address ?? `paypal_${token}`;
    const sanitized = payerEmail.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const username = `paid_${sanitized}_${Date.now()}`;

    const API_KEY = process.env.BOTAPI;

    const userRes = await fetch(`${BOT_API_URL}/admin/users/new`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password: `Pp${Math.random().toString(36).slice(2, 10)}!`,
        role: "default",
      }),
    });

    const userData = await userRes.json();
    const userId = userData.user?.id;
    if (!userId) {
      console.error("User creation failed:", userData);
      return NextResponse.redirect(`${SHOP_URL}/?paypal=usererror`);
    }

    // 3. Add to workspace
    await fetch(`${BOT_API_URL}/admin/workspaces/${WORKSPACE}/manage-users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds: [userId], reset: false }),
    });

    // 4. Issue SSO token → redirect to bot
    const tokenRes = await fetch(`${BOT_API_URL}/users/${userId}/issue-auth-token`, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const { token: ssoToken } = await tokenRes.json();
    return NextResponse.redirect(
      `${BOT_URL}/sso/simple?token=${ssoToken}&redirectTo=/workspace/${WORKSPACE}`
    );

  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.redirect(`${SHOP_URL}/?paypal=error`);
  }
}
