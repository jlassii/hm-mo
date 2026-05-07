import { NextResponse } from "next/server";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

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

export async function POST() {
  try {
    const accessToken = await getAccessToken();

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
            amount: {
              currency_code: "USD",
              value: "20.00",
            },
            description: "مرشد قانون - اشتراك شهري",
          },
        ],
        application_context: {
          brand_name: "مرشد قانون",
          locale: "ar-TN",
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/paypal/capture`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?paypal=cancelled`,
        },
      }),
    });

    const order = await res.json();
    const approveLink = order.links?.find((l: any) => l.rel === "approve")?.href;

    if (!approveLink) {
      return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
    }

    return NextResponse.json({ approveUrl: approveLink });
  } catch (err) {
    console.error("PayPal create-order error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
