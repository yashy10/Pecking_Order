import type { WithoutSystemFields } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Profile } from "./auth";
import { MAX_MEMBERS, WELCOME_KIT } from "./constants";

// Frozen in Phase 0. Owned by the lead. Shared reads every track needs.

type Ctx = QueryCtx | MutationCtx;

export async function gameFor(ctx: Ctx, groupId: Id<"groups">, week: number, day: number) {
  return await ctx.db
    .query("games")
    .withIndex("by_groupId_and_week_and_day", (q) =>
      q.eq("groupId", groupId).eq("week", week).eq("day", day),
    )
    .first();
}

/**
 * Every game on a day: the mini game, and from week 2 the friends game. The demo arcade
 * opens all eleven at once, so this allows a few more than a normal day needs.
 */
export async function gamesFor(ctx: Ctx, groupId: Id<"groups">, week: number, day: number) {
  return await ctx.db
    .query("games")
    .withIndex("by_groupId_and_week_and_day", (q) =>
      q.eq("groupId", groupId).eq("week", week).eq("day", day),
    )
    .take(16);
}

export async function promptFor(ctx: Ctx, groupId: Id<"groups">, week: number, day: number) {
  return await ctx.db
    .query("prompts")
    .withIndex("by_groupId_and_week_and_day", (q) =>
      q.eq("groupId", groupId).eq("week", week).eq("day", day),
    )
    .first();
}

export async function membersOf(ctx: Ctx, groupId: Id<"groups">) {
  return await ctx.db
    .query("members")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .take(MAX_MEMBERS);
}

/** True while players can still play this game: it is today's game and today is not revealed. */
export function isOpenGame(group: Doc<"groups">, game: Doc<"games">): boolean {
  return (
    group.phase === "open" &&
    game.week === group.week &&
    game.day === group.day &&
    game.revealedAt === undefined
  );
}

/**
 * Whether this member made the group, and so may delete it. Groups made before creators
 * were recorded count their earliest-joined real member as the creator.
 */
export function isGroupCreator(group: Doc<"groups">, me: Doc<"members">, members: Doc<"members">[]): boolean {
  if (group.createdBy) return group.createdBy === me.userId;
  return members.find((m) => !m.isBot)?._id === me._id;
}

/** Who has an active Ghost or Spy today. Powers last until the next day drops. */
export async function activePowers(ctx: Ctx, groupId: Id<"groups">, week: number, day: number) {
  const uses = await ctx.db
    .query("powerUses")
    .withIndex("by_groupId_and_week_and_day", (q) =>
      q.eq("groupId", groupId).eq("week", week).eq("day", day),
    )
    .take(MAX_MEMBERS * 2);
  const ghosted = new Set<Id<"members">>();
  const spying = new Set<Id<"members">>();
  for (const use of uses) (use.type === "ghost" ? ghosted : spying).add(use.memberId);
  return { ghosted, spying };
}

/** Sort comparator: most points first, earliest joiner wins ties. */
export function byStanding(key: "weekPoints" | "prevWeekPoints") {
  return (a: Doc<"members">, b: Doc<"members">) =>
    b[key] - a[key] || a._creationTime - b._creationTime;
}

/** A new membership with the welcome kit (PLAN §6.3). */
export function newMemberDoc(
  groupId: Id<"groups">,
  profile: Profile,
): WithoutSystemFields<Doc<"members">> {
  return {
    groupId,
    userId: profile.userId,
    name: profile.name,
    emoji: profile.emoji,
    isBot: profile.isBot,
    hasPass: profile.hasPass,
    weekPoints: 0,
    prevWeekPoints: 0,
    lastDelta: 0,
    streak: 0,
    ghost: WELCOME_KIT.ghost,
    spy: WELCOME_KIT.spy,
  };
}
