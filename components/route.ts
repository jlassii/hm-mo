import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const API_URL = "https://loi.morched.tn/api/v1";
const WORKSPACE = "loi";

async function getAccessToken(): Promise<string> {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
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
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?paypal=error`);
  }

  try {
    // 1. Capture the PayPal payment
    const accessToken = await getAccessToken();
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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?paypal=failed`);
    }

    // Extract payer email to build a deterministic username
    const payerEmail: string =
      captureData.payer?.email_address ?? `paypal_${token}`;
    const sanitizedEmail = payerEmail.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    // Username: paid_ prefix so the app can tell paid vs free users
    const username = `paid_${sanitizedEmail}_${Date.now()}`;

    const API_KEY = process.env.BOTAPI;

    // 2. Create user with "paid" role
    const userRes = await fetch(`${API_URL}/admin/users/new`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password: `Pp${Math.random().toString(36).slice(2, 10)}!`,
        role: "default",
        // Custom metadata field to mark as paid — stored in user object
        // The AnythingLLM API lets you pass metadata; we use the username prefix
        // as the primary signal, but also try to set a custom field if supported.
      }),
    });

    const userData = await userRes.json();
    const userId = userData.user?.id;

    if (!userId) {
      console.error("User creation failed:", userData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?paypal=usererror`);
    }

    // 3. Add user to workspace
    await fetch(`${API_URL}/admin/workspaces/${WORKSPACE}/manage-users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds: [userId], reset: false }),
    });

    // 4. Issue SSO token and redirect
    const tokenRes = await fetch(`${API_URL}/users/${userId}/issue-auth-token`, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const { token: ssoToken } = await tokenRes.json();

    return NextResponse.redirect(
      `https://loi.morched.tn/sso/simple?token=${ssoToken}&redirectTo=/workspace/${WORKSPACE}`
    );
  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?paypal=error`);
  }
}
