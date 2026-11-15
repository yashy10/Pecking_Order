import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { verifyWhopSignature } from "./lib/whopSignature";

// Owned by the lead.

const http = httpRouter();

/**
 * Whop calls this when a Season Pass membership activates (PLAN §10, step 4).
 * The signature is checked before anything is read; replies within Whop's 5 seconds.
 */
http.route({
  path: "/whop/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const secret = await ctx.runQuery(internal.whop.webhookSecret, {});
    if (!secret) return new Response("webhook not configured", { status: 503 });

    const valid = await verifyWhopSignature({
      secret,
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signatureHeader: request.headers.get("webhook-signature"),
      body,
      nowSeconds: Math.floor(Date.now() / 1000),
    });
    if (!valid) return new Response("invalid signature", { status: 401 });

    let event: { type?: string; data?: { status?: string; metadata?: Record<string, unknown> } };
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("invalid json", { status: 400 });
    }

    const activated = event.type === "membership.activated" || event.type === "membership.went_valid";
    const status = event.data?.status;
    const player = event.data?.metadata?.po_user;
    if (activated && typeof player === "string" && status !== "canceled" && status !== "expired") {
      await ctx.runMutation(internal.whop.grantPass, { userId: player });
    }
    return new Response("ok", { status: 200 });
  }),
});

/**
 * Google sends the browser here after Continue with Google (see convex/users.ts).
 * Swaps the code for the account, then sends the browser back into the app with a one-time
 * claim. The ID token comes straight from Google's token endpoint over TLS, so its claims are
 * trusted without a signature check (OpenID Connect Core §3.1.3.7).
 */
http.route({
  path: "/auth/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const params = new URL(request.url).searchParams;
    const state = params.get("state");
    const code = params.get("code");
    if (!state) return page("This sign-in link is broken. Go back to Pecking Order and try again.", 400);

    const back = async (reason: string) => {
      const login = await ctx.runMutation(internal.users.cancelGoogleSignIn, { state });
      return login
        ? redirect(withParam(login.returnTo, "auth_error", reason))
        : page("This sign-in expired. Go back to Pecking Order and try again.", 400);
    };
    if (params.get("error") || !code) return await back("cancelled");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const site = process.env.CONVEX_SITE_URL;
    if (!clientId || !clientSecret || !site) return await back("setup");

    let idToken: unknown;
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${site}/auth/google/callback`,
          grant_type: "authorization_code",
        }).toString(),
      });
      if (!res.ok) return await back("google");
      idToken = ((await res.json()) as { id_token?: unknown }).id_token;
    } catch {
      return await back("google");
    }

    const claims = typeof idToken === "string" ? decodeJwtPayload(idToken) : null;
    const sub = claims?.sub;
    const iss = claims?.iss;
    if (
      typeof sub !== "string" ||
      claims?.aud !== clientId ||
      (iss !== "https://accounts.google.com" && iss !== "accounts.google.com")
    ) {
      return await back("google");
    }
    const givenName = typeof claims.given_name === "string" ? claims.given_name : "";

    const claim = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    const login = await ctx.runMutation(internal.users.recordGoogleSignIn, {
      state,
      claim,
      googleSub: sub,
      givenName,
    });
    if (!login) return page("This sign-in expired. Go back to Pecking Order and try again.", 400);
    return redirect(withParam(login.returnTo, "claim", claim));
  }),
});

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const part = jwt.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function withParam(url: string, key: string, value: string): string {
  const hashAt = url.indexOf("#");
  const base = hashAt === -1 ? url : url.slice(0, hashAt);
  return `${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });
}

function page(message: string, status: number): Response {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pecking Order</title><body style="background:#08090C;color:#ECEEF2;font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center"><p>${message}</p>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default http;
