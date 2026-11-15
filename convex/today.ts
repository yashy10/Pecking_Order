import { v } from "convex/values";
import { query } from "./_generated/server";
import { findMember } from "./lib/auth";
import { dayLabel, MAX_MEMBERS } from "./lib/constants";
import { gameFor, membersOf, promptFor } from "./lib/day";
import { finaleAt } from "./lib/schedule";
import { gameTypeV, phaseV } from "./schema";

// Owned by Track A. Phase 0: working version.
// Returns null when the caller is not in the group.

export const get = query({
  args: { token: v.string(), groupId: v.id("groups") },
  returns: v.union(
    v.null(),
    v.object({
      group: v.object({
        name: v.string(),
        inviteCode: v.string(),
        week: v.number(),
        day: v.number(),
        dayLabel: v.string(),
        phase: phaseV,
        memberCount: v.number(),
        // Automatic groups only; null for demo groups, which the presenter moves.
        nextTickAt: v.union(v.number(), v.null()),
        finaleAt: v.union(v.number(), v.null()), // this week's Sunday 9 PM
      }),
      myMemberId: v.id("members"),
      game: v.union(
        v.null(),
        v.object({ gameId: v.id("games"), type: gameTypeV, multiplier: v.number() }),
      ),
      myPlay: v.object({
        status: v.union(v.literal("none"), v.literal("inProgress"), v.literal("done")),
        points: v.union(v.number(), v.null()), // my own sealed points only
      }),
      played: v.object({ count: v.number(), emojis: v.array(v.string()) }), // who, never scores
      prompt: v.union(
        v.null(),
        v.object({
          promptId: v.id("prompts"),
          question: v.string(),
          myAnswer: v.union(v.string(), v.null()),
        }),
      ),
    }),
  ),
  handler: async (ctx, { token, groupId }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group) return null;
    const me = await findMember(ctx, token, groupId);
    if (!me) return null;
    const members = await membersOf(ctx, groupId);
    const game = await gameFor(ctx, groupId, group.week, group.day);
    const prompt = await promptFor(ctx, groupId, group.week, group.day);

    let status: "none" | "inProgress" | "done" = "none";
    let myPoints: number | null = null;
    const playedEmojis: string[] = [];
    if (game) {
      const emojiOf = new Map(members.map((m) => [m._id, m.emoji]));
      const plays = await ctx.db
        .query("plays")
        .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
        .take(MAX_MEMBERS);
      for (const p of plays) {
        const done = p.finishedAt !== undefined;
        if (p.memberId === me._id) {
          status = done ? "done" : "inProgress";
          myPoints = done ? (p.points ?? 0) : null;
        }
        const emoji = emojiOf.get(p.memberId);
        if (done && emoji) playedEmojis.push(emoji);
      }
    }

    let myAnswer: string | null = null;
    if (prompt) {
      const answer = await ctx.db
        .query("answers")
        .withIndex("by_promptId_and_memberId", (q) =>
          q.eq("promptId", prompt._id).eq("memberId", me._id),
        )
        .unique();
      myAnswer = answer?.text ?? null;
    }

    return {
      group: {
        name: group.name,
        inviteCode: group.inviteCode,
        week: group.week,
        day: group.day,
        dayLabel: dayLabel(group.day),
        phase: group.phase,
        memberCount: members.length,
        nextTickAt: group.autoClock ? (group.nextTickAt ?? null) : null,
        finaleAt:
          group.autoClock && group.weekStartsAt !== undefined ? finaleAt(group.weekStartsAt) : null,
      },
      myMemberId: me._id,
      game: game ? { gameId: game._id, type: game.type, multiplier: game.multiplier } : null,
      myPlay: { status, points: myPoints },
      played: { count: playedEmojis.length, emojis: playedEmojis },
      prompt: prompt ? { promptId: prompt._id, question: prompt.question, myAnswer } : null,
    };
  },
});
