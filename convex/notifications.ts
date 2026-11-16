import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { MAX_MEMBERS, SUNDAY } from "./lib/constants";
import { gamesFor, membersOf } from "./lib/day";
import { isFriendGame } from "./lib/games";
import { nudgeMessage, type Message, type NudgeFacts } from "./lib/nudges";
import { at } from "./lib/schedule";

// Owned by the lead. Web push: browsers subscribe here, and the clock calls in when
// something is worth a buzz. Delivery is convex/pushSender.ts ("use node"), which uses
// the VAPID keys in the deployment's environment. No accounts, no cost.
//
//   noon     today's game is live    only members who haven't finished it
//   7:30 PM  last call               only members who haven't finished it
//   9 PM     the reveal              everyone, personal ("Priya just passed you")
//   Sunday   6 PM tease, 9 PM finale everyone
//
// The timed ones run for automatic groups, at the group's local time. Demo groups get
// the reveal and finale pushes whenever the presenter moves them.

const SUBS_PER_USER = 10;
const PUSHES_PER_BATCH = 100;

type Push = { endpoint: string; p256dh: string; auth: string; payload: string };

export const config = query({
  args: {},
  returns: v.object({ publicKey: v.union(v.string(), v.null()) }),
  handler: async () => ({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null }),
});

/** Saves this browser's push subscription for the signed-in player. Safe to repeat. */
export const subscribe = mutation({
  args: { token: v.string(), endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  returns: v.null(),
  handler: async (ctx, { token, endpoint, p256dh, auth }) => {
    const me = await requireUser(ctx, token);
    if (!endpoint.startsWith("https://") || endpoint.length > 2000 || p256dh.length > 200 || auth.length > 100) {
      throw new ConvexError("That doesn't look like a browser push subscription.");
    }
    const row = { userId: me.userId, endpoint, p256dh, auth };
    const existing = await byEndpoint(ctx, endpoint);
    if (existing) await ctx.db.replace("pushSubscriptions", existing._id, row);
    else await ctx.db.insert("pushSubscriptions", row);
    return null;
  },
});

export const unsubscribe = mutation({
  args: { token: v.string(), endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, { token, endpoint }) => {
    const me = await requireUser(ctx, token);
    const existing = await byEndpoint(ctx, endpoint);
    if (existing && existing.userId === me.userId) await ctx.db.delete("pushSubscriptions", existing._id);
    return null;
  },
});

/** "Send a test": one push to this browser, so a player can see reminders work. */
export const sendTest = mutation({
  args: { token: v.string(), endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, { token, endpoint }) => {
    const me = await requireUser(ctx, token);
    const sub = await byEndpoint(ctx, endpoint);
    if (!sub || sub.userId !== me.userId) throw new ConvexError("Turn reminders on first.");
    await deliver(ctx, [toPush(sub, nudgeMessage("test", { group: "Pecking Order" }, endpoint), "/", "po-test")]);
    return null;
  },
});

/** The sender calls this when a browser says its subscription is gone (404 or 410). */
export const removeSubscription = internalMutation({
  args: { endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, { endpoint }) => {
    const existing = await byEndpoint(ctx, endpoint);
    if (existing) await ctx.db.delete("pushSubscriptions", existing._id);
    return null;
  },
});

/**
 * An automatic group's day just opened: book its nudges at local times. Each one checks,
 * when it runs, that the group is still on that day, so a skipped or moved day sends nothing.
 */
export async function scheduleReminders(ctx: MutationCtx, group: Doc<"groups">): Promise<void> {
  if (!group.autoClock || group.weekStartsAt === undefined || group.phase !== "open") return;
  const slots: { kind: "nudge" | "lastCall" | "sundayTease"; hour: number }[] =
    group.day === SUNDAY
      ? [{ kind: "sundayTease", hour: 18 }]
      : [
          { kind: "nudge", hour: 12 },
          { kind: "lastCall", hour: 19.5 },
        ];
  const now = Date.now();
  for (const { kind, hour } of slots) {
    const when = at(group.weekStartsAt, group.day, hour);
    if (when <= now) continue; // that moment has already passed today
    await ctx.scheduler.runAt(when, internal.notifications.remind, {
      groupId: group._id,
      week: group.week,
      day: group.day,
      kind,
    });
  }
}

export const remind = internalMutation({
  args: {
    groupId: v.id("groups"),
    week: v.number(),
    day: v.number(),
    kind: v.union(v.literal("nudge"), v.literal("lastCall"), v.literal("sundayTease")),
  },
  returns: v.null(),
  handler: async (ctx, { groupId, week, day, kind }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group?.autoClock || group.week !== week || group.day !== day || group.phase !== "open") return null;
    const everyone = await membersOf(ctx, groupId);
    const members = everyone.filter((m) => !m.isBot);

    if (kind === "sundayTease") {
      const facts: NudgeFacts = { group: group.name };
      await sendTo(ctx, members.map((m) => ({ member: m, message: nudgeMessage(kind, facts, `${m._id}:${week}:${day}:${kind}`) })), `/g/${groupId}/sunday`, `po-${groupId}-day`);
      return null;
    }

    // From week 2 there are two games a day. Someone is done once they've finished them all;
    // "played" counts anyone who has finished at least one.
    const games = await gamesFor(ctx, groupId, week, day);
    if (games.length === 0) return null;
    const finishedCount = new Map<Doc<"members">["_id"], number>();
    for (const game of games) {
      const plays = await ctx.db
        .query("plays")
        .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
        .take(MAX_MEMBERS);
      for (const p of plays) {
        if (p.finishedAt !== undefined) finishedCount.set(p.memberId, (finishedCount.get(p.memberId) ?? 0) + 1);
      }
    }
    const headline = games.find((g) => isFriendGame(g.type)) ?? games[0];
    const facts: NudgeFacts = {
      group: group.name,
      game: headline.type,
      played: finishedCount.size,
      total: everyone.length,
      wildcard: headline.multiplier > 1,
    };
    const waiting = members.filter((m) => (finishedCount.get(m._id) ?? 0) < games.length);
    await sendTo(
      ctx,
      waiting.map((m) => ({ member: m, message: nudgeMessage(kind, facts, `${m._id}:${week}:${day}:${kind}`) })),
      `/g/${groupId}/play`,
      `po-${groupId}-day`,
    );
    return null;
  },
});

/** Right after a reveal (clock.revealDay): personal, from the lines that reveal wrote. */
export const afterReveal = internalMutation({
  args: { groupId: v.id("groups"), week: v.number(), day: v.number() },
  returns: v.null(),
  handler: async (ctx, { groupId, week, day }) => {
    const group = await ctx.db.get("groups", groupId);
    // The demo panel's Jump to Sunday reveals and runs the finale at once: the finale
    // push says it all, so skip this one.
    if (!group || group.phase === "finale") return null;
    const members = (await membersOf(ctx, groupId)).filter((m) => !m.isBot);
    const items: { member: Doc<"members">; message: Message }[] = [];
    for (const member of members) {
      const lines = await ctx.db
        .query("events")
        .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
        .order("desc")
        .take(10);
      const today = lines.filter((e) => e.week === week && e.day === day);
      const passedBy = today.find((e) => e.kind === "passedYou")?.text.replace(/ just passed you\.$/, "") ?? null;
      const passed = today.find((e) => e.kind === "youPassed")?.text.replace(/^You passed /, "").replace(/\.$/, "") ?? null;
      items.push({
        member,
        message: nudgeMessage("reveal", { group: group.name, passedBy, passed }, `${member._id}:${week}:${day}:reveal`),
      });
    }
    await sendTo(ctx, items, `/g/${groupId}/board`, `po-${groupId}-reveal`);
    return null;
  },
});

/** Sunday night (clock.runFinale): the champion gets a crown, everyone else a tease. */
export const afterFinale = internalMutation({
  args: { groupId: v.id("groups"), week: v.number() },
  returns: v.null(),
  handler: async (ctx, { groupId, week }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group) return null;
    const results = await ctx.db
      .query("weekResults")
      .withIndex("by_groupId_and_week", (q) => q.eq("groupId", groupId).eq("week", week))
      .first();
    const champion = results?.standings[0]?.memberId;
    const members = (await membersOf(ctx, groupId)).filter((m) => !m.isBot);
    await sendTo(
      ctx,
      members.map((m) => ({
        member: m,
        message: nudgeMessage("finale", { group: group.name, youWon: m._id === champion }, `${m._id}:${week}:finale`),
      })),
      `/g/${groupId}/board`,
      `po-${groupId}-reveal`,
    );
    return null;
  },
});

async function byEndpoint(ctx: MutationCtx, endpoint: string) {
  return await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
    .unique();
}

function toPush(sub: Doc<"pushSubscriptions">, message: Message, url: string, tag: string): Push {
  return {
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    payload: JSON.stringify({ ...message, url, tag }),
  };
}

/** Each member's message to each of their browsers, handed to the sender in batches. */
async function sendTo(
  ctx: MutationCtx,
  items: { member: Doc<"members">; message: Message }[],
  url: string,
  tag: string,
): Promise<void> {
  const pushes: Push[] = [];
  const seen = new Set<Id<"users">>();
  for (const { member, message } of items) {
    if (seen.has(member.userId)) continue;
    seen.add(member.userId);
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", member.userId))
      .take(SUBS_PER_USER);
    for (const sub of subs) pushes.push(toPush(sub, message, url, tag));
  }
  await deliver(ctx, pushes);
}

async function deliver(ctx: MutationCtx, pushes: Push[]): Promise<void> {
  for (let i = 0; i < pushes.length; i += PUSHES_PER_BATCH) {
    await ctx.scheduler.runAfter(0, internal.pushSender.deliver, { pushes: pushes.slice(i, i + PUSHES_PER_BATCH) });
  }
}
