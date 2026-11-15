import { describe, expect, it } from "vitest";
import { verifyWhopSignature } from "./whopSignature";

// Expected signatures are computed independently here: HMAC-SHA256 keyed with the
// literal secret over `{id}.{timestamp}.{body}`, base64, prefixed `v1,`.

const secret = "ws_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const id = "msg_test123";
const now = 1_800_000_000;
const body = JSON.stringify({ type: "membership.activated", data: { metadata: { po_user: "abc" } } });

async function sign(key: string, ts: number, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${id}.${ts}.${payload}`)));
  return `v1,${btoa(String.fromCharCode(...mac))}`;
}

describe("verifyWhopSignature", () => {
  it("accepts a correct signature keyed with the literal secret", async () => {
    const header = await sign(secret, now, body);
    expect(await verifyWhopSignature({ secret, id, timestamp: String(now), signatureHeader: header, body, nowSeconds: now })).toBe(true);
  });

  it("accepts the right signature among several", async () => {
    const header = `v1,AAAA ${await sign(secret, now, body)}`;
    expect(await verifyWhopSignature({ secret, id, timestamp: String(now), signatureHeader: header, body, nowSeconds: now })).toBe(true);
  });

  it("rejects a wrong secret, a changed body, an old timestamp and missing headers", async () => {
    const base = { secret, id, timestamp: String(now), body, nowSeconds: now };
    expect(await verifyWhopSignature({ ...base, signatureHeader: await sign("ws_wrong", now, body) })).toBe(false);
    expect(await verifyWhopSignature({ ...base, signatureHeader: await sign(secret, now, body), body: `${body} ` })).toBe(false);
    expect(
      await verifyWhopSignature({ ...base, timestamp: String(now - 600), signatureHeader: await sign(secret, now - 600, body) }),
    ).toBe(false);
    expect(await verifyWhopSignature({ ...base, signatureHeader: null })).toBe(false);
  });
});
