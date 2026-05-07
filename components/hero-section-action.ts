'use server'

import { redirect } from 'next/navigation'

const BOT_API_URL = "https://loi.morched.tn/api/v1";
const BOT_URL = "https://loi.morched.tn";
const WORKSPACE = "loi";

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

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
    cache: "no-store",
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ─── FREE USER (10-message limit) ────────────────────────────────────────────
export async function handleFreeStart() {
  const API_KEY = process.env.BOTAPI;
  const username = `free_guest_${Math.floor(Math.random() * 1_000_000)}`;

  try {
    const userRes = await fetch(`${BOT_API_URL}/admin/users/new`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password: "TempPassword123!", role: "default" })
    });

    const userData = await userRes.json();
    const userId = userData.user?.id;
    if (!userId) throw new Error("User ID not returned");

    await fetch(`${BOT_API_URL}/admin/workspaces/${WORKSPACE}/manage-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userIds: [userId], reset: false })
    });

    const tokenRes = await fetch(`${BOT_API_URL}/users/${userId}/issue-auth-token`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    const { token } = await tokenRes.json();
    redirect(`${BOT_URL}/sso/simple?token=${token}&redirectTo=/workspace/${WORKSPACE}`);

  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") throw error;
    console.error("Free SSO flow failed:", error);
    redirect(BOT_URL);
  }
}

// ─── PAID USER — creates PayPal order inline (no self-fetch) ─────────────────
export async function handlePaypalStart() {
  // NEXT_PUBLIC_BASE_URL = https://kanoun.morched.tn (the shop, for PayPal return URLs)
  const shopUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kanoun.morched.tn';

  try {
    const accessToken = await getPaypalAccessToken();

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: "20.00" },
            description: "مرشد قانون - اشتراك شهري",
          },
        ],
        application_context: {
          brand_name: "مرشد قانون",
          locale: "ar-TN",
          return_url: `${shopUrl}/api/paypal/capture`,
          cancel_url: `${shopUrl}/?paypal=cancelled`,
          user_action: "PAY_NOW",
        },
      }),
      cache: "no-store",
    });

    const order = await res.json();
    const approveLink = order.links?.find((l: any) => l.rel === "approve")?.href;

    if (!approveLink) throw new Error(`No approve link. PayPal response: ${JSON.stringify(order)}`);

    redirect(approveLink);

  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") throw error;
    console.error("PayPal redirect failed:", error);
    redirect(BOT_URL);
  }
}
