'use server'

import { redirect } from 'next/navigation'

const API_URL = "https://loi.morched.tn/api/v1";
const WORKSPACE = "loi";

// ─── FREE USER (10-message limit, auto-deleted after use) ─────────────────────
export async function handleFreeStart() {
  const API_KEY = process.env.BOTAPI;
  // "free_" prefix = free-tier user; deletion scripts can target this prefix
  const username = `free_guest_${Math.floor(Math.random() * 1_000_000)}`;

  try {
    const userRes = await fetch(`${API_URL}/admin/users/new`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password: "TempPassword123!",
        role: "default"
      })
    });

    const userData = await userRes.json();
    const userId = userData.user?.id;
    if (!userId) throw new Error("User ID not returned");

    await fetch(`${API_URL}/admin/workspaces/${WORKSPACE}/manage-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userIds: [userId], reset: false })
    });

    const tokenRes = await fetch(`${API_URL}/users/${userId}/issue-auth-token`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    const { token } = await tokenRes.json();
    redirect(`https://loi.morched.tn/sso/simple?token=${token}&redirectTo=/workspace/${WORKSPACE}`);

  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") throw error;
    console.error("Free SSO flow failed:", error);
    redirect('https://loi.morched.tn/');
  }
}

// ─── PAID USER (redirect to PayPal; account created after successful payment) ─
export async function handlePaypalStart() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await res.json();
    if (!data.approveUrl) throw new Error("No approveUrl from PayPal");

    redirect(data.approveUrl);
  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") throw error;
    console.error("PayPal redirect failed:", error);
    redirect('https://loi.morched.tn/');
  }
}
