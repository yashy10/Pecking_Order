"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// Owned by the lead. Sends web pushes; convex/notifications.ts decides who gets what.
// Signed with the deployment's VAPID keys (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT). A browser that has dropped its subscription answers 404 or 410, and
// that subscription is removed.

export const deliver = internalAction({
  args: {
    pushes: v.array(
      v.object({ endpoint: v.string(), p256dh: v.string(), auth: v.string(), payload: v.string() }),
    ),
  },
  returns: v.object({ sent: v.number(), gone: v.number(), failed: v.number() }),
  handler: async (ctx, { pushes }) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return { sent: 0, gone: 0, failed: pushes.length };
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://pecking-order.expo.app", publicKey, privateKey);

    let sent = 0;
    let gone = 0;
    let failed = 0;
    await Promise.all(
      pushes.map(async (p) => {
        try {
          await webpush.sendNotification(
            { endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } },
            p.payload,
            { TTL: 6 * 60 * 60, urgency: "normal" },
          );
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            gone++;
            await ctx.runMutation(internal.notifications.removeSubscription, { endpoint: p.endpoint });
          } else {
            failed++;
            console.warn(`push failed (${status ?? "no status"})`);
          }
        }
      }),
    );
    return { sent, gone, failed };
  },
});
