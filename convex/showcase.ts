import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { buildArcade, checkDemoKey, keyMatches } from "./demo";
import { closeGroup } from "./profile";
import { requireMember, requireUser } from "./lib/auth";
import { newMemberDoc } from "./lib/day";
import { SHOWCASE_KEY, SHOWCASE_NAME, showcaseGroupId } from "./lib/showcase";

// Owned by the lead. Admin Games: a group every account can open from the home screen,
// with all eleven games open at once and a "Play again" on each. Nobody moves its clock,
// so nothing there is ever revealed or banked: it's for showing the games off.

/** The Admin Games group, built the first time anyone asks for it (or after a rebuild). */
export async function ensureShowcase(ctx: MutationCtx): Promise<Id<"groups">> {
  const id = await showcaseGroupId(ctx);
  if (id && (await ctx.db.get("groups", id))) return id;
  const { groupId } = await buildArcade(ctx, { name: SHOWCASE_NAME, player: null });
  const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", SHOWCASE_KEY)).unique();
  if (row) await ctx.db.patch("settings", row._id, { value: groupId });
  else await ctx.db.insert("settings", { key: SHOWCASE_KEY, value: groupId });
  return groupId;
}

/** Opens Admin Games for this player, adding them on their first visit. */
export const enter = mutation({
  args: { token: v.string() },
  returns: v.object({ groupId: v.id("groups") }),
  handler: async (ctx, { token }) => {
    const profile = await requireUser(ctx, token);
    const groupId = await ensureShowcase(ctx);
    const seat = await ctx.db
      .query("members")
      .withIndex("by_groupId_and_userId", (q) => q.eq("groupId", groupId).eq("userId", profile.userId))
      .unique();
    if (!seat) await ctx.db.insert("members", newMemberDoc(groupId, profile));
    return { groupId };
  },
});

/** Play an Admin Games round again: your last go at it is wiped and the round starts fresh. */
export const replay = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.null(),
  handler: async (ctx, { token, gameId }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.groupId !== (await showcaseGroupId(ctx))) {
      throw new ConvexError("Only Admin Games can be played again.");
    }
    const me = await requireMember(ctx, token, game.groupId);
    const play = await ctx.db
      .query("plays")
      .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", gameId).eq("memberId", me._id))
      .unique();
    if (play) await ctx.db.delete("plays", play._id);
    return null;
  },
});

/** For the demo panel: which group is Admin Games, so it can show that group's answer key. */
export const panelGroup = query({
  args: { demoKey: v.string() },
  returns: v.union(v.null(), v.id("groups")),
  handler: async (ctx, { demoKey }) => {
    if (!keyMatches(demoKey)) return null;
    const id = await showcaseGroupId(ctx);
    return id && (await ctx.db.get("groups", id)) ? id : null;
  },
});

/**
 * For the demo panel: a fresh Admin Games (new bots, new answers, nobody has played). The
 * old one closes; everyone gets the new one the next time they tap the card.
 */
export const rebuild = mutation({
  args: { demoKey: v.string() },
  returns: v.id("groups"),
  handler: async (ctx, { demoKey }) => {
    checkDemoKey(demoKey);
    const old = await showcaseGroupId(ctx);
    const group = old ? await ctx.db.get("groups", old) : null;
    if (group) await closeGroup(ctx, group);
    return await ensureShowcase(ctx);
  },
});
