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

export default http;
