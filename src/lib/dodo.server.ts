/**
 * Minimal REST client for Dodo Payments.
 *
 * ⚠️ Written without access to docs.dodopayments.com — network egress to
 * that domain was blocked in the environment this was built in, and the
 * `dodopayments` SDK couldn't be installed either, so this calls the REST
 * API directly with fetch(). The endpoint paths, field names, and webhook
 * signature scheme below are a best-effort implementation of what a
 * Stripe-shaped payments API + the Standard Webhooks spec typically look
 * like — NOT confirmed against a real request/response. Before relying on
 * this for real charges:
 *
 *   1. In the Dodo dashboard, create one product set to dynamic /
 *      "pay what you want" pricing (bids are $2–$6, chosen per keycap) and
 *      put its id in DODO_PAYMENTS_PRODUCT_ID.
 *   2. Set DODO_PAYMENTS_API_KEY (test mode secret key) and
 *      DODO_PAYMENTS_WEBHOOK_SECRET (from the webhook endpoint you
 *      register, pointed at POST /api/webhooks/dodo).
 *   3. Run one real test-mode checkout end-to-end and compare what Dodo
 *      actually sends against the field names read below — this file is
 *      the only place that should need fixing if they don't match.
 */

type DodoEnvironment = "test_mode" | "live_mode";

function baseUrl(): string {
  const env = process.env["DODO_PAYMENTS_ENVIRONMENT"] as DodoEnvironment | undefined;
  return env === "live_mode" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
}

function apiKey(): string {
  const key = process.env["DODO_PAYMENTS_API_KEY"];
  if (!key) throw new Error("Missing DODO_PAYMENTS_API_KEY");
  return key;
}

function productId(): string {
  const id = process.env["DODO_PAYMENTS_PRODUCT_ID"];
  if (!id) throw new Error("Missing DODO_PAYMENTS_PRODUCT_ID");
  return id;
}

async function dodoFetch(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey()}`,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Dodo API ${path} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

export async function createCheckoutSession(input: {
  amountCents: number;
  bidderEmail: string;
  bidderName: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<{ checkoutUrl: string | null; sessionId: string | null }> {
  const body = await dodoFetch("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      product_cart: [{ product_id: productId(), quantity: 1, amount: input.amountCents }],
      customer: { email: input.bidderEmail, name: input.bidderName },
      return_url: input.returnUrl,
      metadata: input.metadata,
    }),
  });
  const checkoutUrl = (body["checkout_url"] ?? body["url"] ?? null) as string | null;
  const sessionId = (body["session_id"] ?? body["id"] ?? null) as string | null;
  return { checkoutUrl, sessionId };
}

export async function refundPayment(input: {
  paymentId: string;
  amountCents: number;
}): Promise<{ refundId: string | null }> {
  const body = await dodoFetch("/refunds", {
    method: "POST",
    body: JSON.stringify({ payment_id: input.paymentId, amount: input.amountCents }),
  });
  return { refundId: (body["id"] ?? body["refund_id"] ?? null) as string | null };
}

/**
 * Verifies a "Standard Webhooks" HMAC signature (the svix-compatible
 * scheme several payment platforms use) — headers assumed: webhook-id,
 * webhook-timestamp, webhook-signature (space-separated "v1,<base64>"
 * entries). Uses Web Crypto, not node:crypto, to stay compatible with the
 * Cloudflare Workers build target this app already ships to.
 */
export async function verifyWebhookSignature(input: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const secretEnv = process.env["DODO_PAYMENTS_WEBHOOK_SECRET"];
  if (!secretEnv) {
    console.error("Missing DODO_PAYMENTS_WEBHOOK_SECRET — rejecting webhook");
    return false;
  }
  const id = input.headers.get("webhook-id");
  const timestamp = input.headers.get("webhook-timestamp");
  const signatureHeader = input.headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const secretBytes = secretEnv.startsWith("whsec_")
    ? bytesFromBase64(secretEnv.slice("whsec_".length))
    : new TextEncoder().encode(secretEnv);

  const signedContent = `${id}.${timestamp}.${input.rawBody}`;
  const expected = await hmacSha256Base64(secretBytes, signedContent);

  const candidates = signatureHeader
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter((sig): sig is string => Boolean(sig));

  return candidates.some((sig) => timingSafeEqualStr(sig, expected));
}

async function hmacSha256Base64(secretBytes: Uint8Array, message: string): Promise<string> {
  // .slice() guarantees a plain ArrayBuffer-backed copy — Uint8Array's
  // buffer is otherwise typed ArrayBufferLike, which SubtleCrypto rejects.
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes.slice(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message).slice(),
  );
  return base64FromBytes(new Uint8Array(signature));
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesFromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
