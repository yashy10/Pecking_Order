import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { findUser, requireMember } from "./lib/auth";
import { dayLabel, GROUP_NAME_MAX_CHARS } from "./lib/constants";
import { isGroupCreator, isOpenGame, membersOf } from "./lib/day";
import { phaseV } from "./schema";

// The player's profile page and a group's settings: your stats across groups, renaming a
// group, a fresh invite code, leaving a group, and deleting it. Any member may rename a
// group or change its code; only its creator may delete it for everyone.
//
// Hidden-board rules (PLAN §6.1) still hold here: a player sees only their own banked
// points and streaks, never a rank. Crowns come from weekResults, which are public once a
// week's finale has been written.

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
// Bounds for the clean-up when someone leaves. A group plays one game and one prompt a day.
const MAX_DAYS_OF_HISTORY = 520; // ten years of days
const MAX_POWER_USES = 4000;
const MAX_EVENTS = 2000;
const MAX_MEMBERSHIPS = 50;
const MAX_WEEKS = 520;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function codeTaken(ctx: QueryCtx | MutationCtx, code: string) {
  const group = await ctx.db
    .query("groups")
    .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
    .first();
  return group !== null;
}

async function crownsFor(ctx: QueryCtx, member: Doc<"members">): Promise<number> {
  const results = await ctx.db
    .query("weekResults")
    .withIndex("by_groupId_and_week", (q) => q.eq("groupId", member.groupId))
    .take(MAX_WEEKS);
  return results.filter((r) => r.standings[0]?.memberId === member._id).length;
}

/** Your own numbers in every group you're in. Empty for an unknown device. */
export const overview = query({
  args: { token: v.string() },
  returns: v.object({
    groups: v.array(
      v.object({
        groupId: v.id("groups"),
        name: v.string(),
        dayLabel: v.string(),
        week: v.number(),
        phase: phaseV,
        /** Your own banked points this week. Never anyone else's, never a rank. */
        weekPoints: v.number(),
        streak: v.number(),
        ghost: v.number(),
        spy: v.number(),
        /** Weeks you finished on top. */
        crowns: v.number(),
      }),
    ),
    bestStreak: v.number(),
    crowns: v.number(),
  }),
  handler: async (ctx, { token }) => {
    const user = await findUser(ctx, token);
    if (!user) return { groups: [], bestStreak: 0, crowns: 0 };
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .take(MAX_MEMBERSHIPS);
    const groups = [];
    for (const m of memberships) {
      const group = await ctx.db.get("groups", m.groupId);
      if (!group) continue;
      groups.push({
        groupId: group._id,
        name: group.name,
        dayLabel: dayLabel(group.day),
        week: group.week,
        phase: group.phase,
        weekPoints: m.weekPoints,
        streak: m.streak,
        ghost: m.ghost,
        spy: m.spy,
        crowns: await crownsFor(ctx, m),
      });
    }
    return {
      groups,
      bestStreak: groups.reduce((best, g) => Math.max(best, g.streak), 0),
      crowns: groups.reduce((sum, g) => sum + g.crowns, 0),
    };
  },
});

/** Any member can rename the group. Everyone sees the new name straight away. */
export const renameGroup = mutation({
  args: { token: v.string(), groupId: v.id("groups"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token, args.groupId);
    const name = args.name.trim();
    if (name.length < 1 || name.length > GROUP_NAME_MAX_CHARS) {
      throw new ConvexError(`Group names need 1 to ${GROUP_NAME_MAX_CHARS} characters.`);
    }
    await ctx.db.patch("groups", args.groupId, { name });
    return null;
  },
});

/** A fresh invite code. The old code and every link or QR code made from it stop working. */
export const newInviteCode = mutation({
  args: { token: v.string(), groupId: v.id("groups") },
  returns: v.object({ inviteCode: v.string() }),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token, args.groupId);
    let inviteCode = randomCode();
    for (let tries = 0; tries < 10 && (await codeTaken(ctx, inviteCode)); tries++) {
      inviteCode = randomCode();
    }
    if (await codeTaken(ctx, inviteCode)) throw new ConvexError("Couldn't make a new code. Try again.");
    await ctx.db.patch("groups", args.groupId, { inviteCode });
    return { inviteCode };
  },
});

/**
 * Leaves a group for good: the seat, its plays, answers, powers and news are deleted.
 * Joining again with the code starts fresh, with the welcome kit. Past weeks' final
 * standings (weekResults) keep the name, because they are the record of a finished week.
 */
export const leaveGroup = mutation({
  args: { token: v.string(), groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx, args.token, args.groupId);
    const group = await ctx.db.get("groups", args.groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    await removeSeat(ctx, group, me._id);

    // Nobody real is left: the group closes for good.
    const remaining = await membersOf(ctx, group._id);
    if (!remaining.some((m) => !m.isBot)) await closeGroup(ctx, group);
    return null;
  },
});

/** The creator deletes the group for everyone: it vanishes from every member's list at once. */
export const deleteGroup = mutation({
  args: { token: v.string(), groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx, args.token, args.groupId);
    const group = await ctx.db.get("groups", args.groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    if (!isGroupCreator(group, me, await membersOf(ctx, group._id))) {
      throw new ConvexError("Only the person who made this group can delete it.");
    }
    await closeGroup(ctx, group);
    return null;
  },
});

/**
 * Removes the group and every seat now, so it disappears from everyone's list and its
 * invite code stops working; the rest (games, plays, questions, answers, powers, news,
 * past standings) is cleared in the background, a batch at a time.
 */
async function closeGroup(ctx: MutationCtx, group: Doc<"groups">): Promise<void> {
  const members = await membersOf(ctx, group._id);
  for (const m of members) await ctx.db.delete("members", m._id);
  await ctx.db.delete("groups", group._id);
  await ctx.scheduler.runAfter(0, internal.profile.purgeGroup, {
    groupId: group._id,
    memberIds: members.map((m) => m._id),
  });
}

const PURGE_BATCH = 200;

/** Background clean-up after closeGroup. Reschedules itself until nothing is left. */
export const purgeGroup = internalMutation({
  args: { groupId: v.id("groups"), memberIds: v.array(v.id("members")) },
  returns: v.null(),
  handler: async (ctx, { groupId, memberIds }) => {
    let budget = PURGE_BATCH;
    const games = await ctx.db
      .query("games")
      .withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId))
      .take(10);
    for (const game of games) {
      const plays = await ctx.db.query("plays").withIndex("by_gameId", (q) => q.eq("gameId", game._id)).take(budget);
      for (const p of plays) await ctx.db.delete("plays", p._id);
      budget -= plays.length;
      if (budget <= 0) break;
      await ctx.db.delete("games", game._id);
    }
    if (budget > 0) {
      const prompts = await ctx.db
        .query("prompts")
        .withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId))
        .take(10);
      for (const prompt of prompts) {
        const answers = await ctx.db.query("answers").withIndex("by_promptId", (q) => q.eq("promptId", prompt._id)).take(budget);
        for (const a of answers) await ctx.db.delete("answers", a._id);
        budget -= answers.length;
        if (budget <= 0) break;
        await ctx.db.delete("prompts", prompt._id);
      }
    }
    if (budget > 0) {
      const uses = await ctx.db
        .query("powerUses")
        .withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId))
        .take(budget);
      for (const u of uses) await ctx.db.delete("powerUses", u._id);
      budget -= uses.length;
    }
    let remainingMembers = memberIds;
    while (budget > 0 && remainingMembers.length > 0) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_memberId", (q) => q.eq("memberId", remainingMembers[0]))
        .take(budget);
      for (const e of events) await ctx.db.delete("events", e._id);
      budget -= events.length;
      if (events.length === 0) remainingMembers = remainingMembers.slice(1);
    }
    if (budget > 0) {
      const results = await ctx.db
        .query("weekResults")
        .withIndex("by_groupId_and_week", (q) => q.eq("groupId", groupId))
        .take(budget);
      for (const r of results) await ctx.db.delete("weekResults", r._id);
      budget -= results.length;
    }
    // Anything left (a full batch, or more games and questions than one pass reads): go again.
    const leftover =
      budget <= 0 ||
      remainingMembers.length > 0 ||
      (await ctx.db.query("games").withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId)).first()) !== null ||
      (await ctx.db.query("prompts").withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId)).first()) !== null;
    if (leftover) {
      await ctx.scheduler.runAfter(0, internal.profile.purgeGroup, { groupId, memberIds: remainingMembers });
    }
    return null;
  },
});

async function removeSeat(ctx: MutationCtx, group: Doc<"groups">, memberId: Id<"members">) {
  const groupId = group._id;

  const games = await ctx.db
    .query("games")
    .withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId))
    .take(MAX_DAYS_OF_HISTORY);
  for (const game of games) {
    const play = await ctx.db
      .query("plays")
      .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", game._id).eq("memberId", memberId))
      .unique();
    if (play) await ctx.db.delete("plays", play._id);

    // Today's Who Said It round: drop their quotes and take their name off everyone's
    // options, so nobody is asked about a quote that no longer exists.
    if (game.whoSaidIt && isOpenGame(group, game)) {
      const quotes = game.whoSaidIt.quotes
        .filter((q) => q.authorId !== memberId)
        .map((q) => ({ ...q, optionIds: q.optionIds.filter((id) => id !== memberId) }));
      await ctx.db.patch("games", game._id, { whoSaidIt: { quotes } });
    }
  }

  const prompts = await ctx.db
    .query("prompts")
    .withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId))
    .take(MAX_DAYS_OF_HISTORY);
  for (const prompt of prompts) {
    const answer = await ctx.db
      .query("answers")
      .withIndex("by_promptId_and_memberId", (q) => q.eq("promptId", prompt._id).eq("memberId", memberId))
      .unique();
    if (answer) await ctx.db.delete("answers", answer._id);
  }

  const uses = await ctx.db
    .query("powerUses")
    .withIndex("by_groupId_and_week_and_day", (q) => q.eq("groupId", groupId))
    .take(MAX_POWER_USES);
  for (const use of uses) {
    if (use.memberId === memberId) await ctx.db.delete("powerUses", use._id);
  }

  const events = await ctx.db
    .query("events")
    .withIndex("by_memberId", (q) => q.eq("memberId", memberId))
    .take(MAX_EVENTS);
  for (const event of events) await ctx.db.delete("events", event._id);

  await ctx.db.delete("members", memberId);
}
