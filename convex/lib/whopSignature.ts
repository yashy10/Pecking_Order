// Owned by the lead. Verifies a Whop webhook (Standard Webhooks, v1 signatures).
//
// Whop HMACs `{webhook-id}.{webhook-timestamp}.{raw body}` with SHA-256, keyed with the
// literal UTF-8 bytes of the whole `ws_…` secret, prefix included (this is what
// @whop/sdk's verifyWebhook helper reproduces). The header carries one or more
// space-separated `v1,<base64>` signatures. Requests older than five minutes are refused.

const TOLERANCE_SECONDS = 5 * 60;

export async function verifyWhopSignature(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signatureHeader: string | null;
  body: string;
  nowSeconds: number;
}): Promise<boolean> {
  const { secret, id, timestamp, signatureHeader, body, nowSeconds } = input;
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(nowSeconds - sentAt) > TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${id}.${timestamp}.${body}`)),
  );
  const expected = toBase64(mac);
  return signatureHeader.split(" ").some((part) => {
    const [version, signature] = part.split(",");
    return version === "v1" && signature !== undefined && constantTimeEqual(signature, expected);
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
