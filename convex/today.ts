import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { findMember } from "./lib/auth";
import { dayLabel, FRIENDS_FROM_WEEK, LAST_GAME_DAY, MAX_MEMBERS } from "./lib/constants";
import { gamesFor, membersOf, promptFor } from "./lib/day";
import { isFriendGame, maxPointsFor, promptShape } from "./lib/games";
import { finaleAt } from "./lib/schedule";
import { friendGameV, gameTypeV, phaseV, promptKindV, slotV } from "./schema";

// Owned by Track A. What a member sees today: the day's games (a mini game, and from
// week 2 a friends game worth twice as much), and today's question.
// Returns null when the caller is not in the group. Only the caller's own points appear.

const statusV = v.union(v.literal("none"), v.literal("inProgress"), v.literal("done"));
const memberV = v.object({ memberId: v.id("members"), name: v.string(), emoji: v.string() });

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
      // The friends game first, then the mini game. Empty on Sunday.
      games: v.array(
        v.object({
          gameId: v.id("games"),
          type: gameTypeV,
          slot: slotV,
          multiplier: v.number(),
          maxPoints: v.number(), // before the multiplier
          myPlay: v.object({
            status: statusV,
            points: v.union(v.number(), v.null()), // my own sealed points only
          }),
          played: v.object({ count: v.number(), emojis: v.array(v.string()) }), // who, never scores
        }),
      ),
      // Why there's no friends game on a game day: week 1, or too few answers to build one.
      friendsNote: v.union(v.null(), v.literal("unlocksNextWeek"), v.literal("notEnoughAnswers")),
      prompt: v.union(
        v.null(),
        v.object({
          promptId: v.id("prompts"),
          question: v.string(),
          kind: promptKindV,
          feeds: friendGameV,
          options: v.array(v.string()), // "either": the two sides
          voteOptions: v.array(memberV), // "vote": everyone but me
          myAnswer: v.union(v.string(), v.null()),
          myChoice: v.union(v.number(), v.null()),
          myVote: v.union(v.id("members"), v.null()),
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
    const emojiOf = new Map(members.map((m) => [m._id, m.emoji]));
    const games = await gamesFor(ctx, groupId, group.week, group.day);
    const prompt = await promptFor(ctx, groupId, group.week, group.day);

    const ordered = [...games].sort((a, b) => Number(isFriendGame(b.type)) - Number(isFriendGame(a.type)));
    const gameRows = [];
    for (const game of ordered) gameRows.push(await gameRow(ctx, game, me._id, emojiOf));

    const gameDay = group.day <= LAST_GAME_DAY && group.phase !== "finale";
    const hasFriends = games.some((g) => isFriendGame(g.type));
    const friendsNote: "unlocksNextWeek" | "notEnoughAnswers" | null =
      !gameDay || hasFriends ? null : group.week < FRIENDS_FROM_WEEK ? "unlocksNextWeek" : "notEnoughAnswers";

    let promptRow = null;
    if (prompt) {
      const answer = await ctx.db
        .query("answers")
        .withIndex("by_promptId_and_memberId", (q) =>
          q.eq("promptId", prompt._id).eq("memberId", me._id),
        )
        .unique();
      const { kind, feeds } = promptShape(prompt);
      promptRow = {
        promptId: prompt._id,
        question: prompt.question,
        kind,
        feeds,
        options: prompt.options ?? [],
        voteOptions:
          kind === "vote"
            ? members
                .filter((m) => m._id !== me._id)
                .map((m) => ({ memberId: m._id, name: m.name, emoji: m.emoji }))
            : [],
        myAnswer: answer?.text ?? null,
        myChoice: answer?.choice ?? null,
        myVote: answer?.voteFor ?? null,
      };
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
      games: gameRows,
      friendsNote,
      prompt: promptRow,
    };
  },
});

async function gameRow(
  ctx: Parameters<typeof findMember>[0],
  game: Doc<"games">,
  myId: Doc<"members">["_id"],
  emojiOf: Map<Doc<"members">["_id"], string>,
) {
  let status: "none" | "inProgress" | "done" = "none";
  let points: number | null = null;
  const emojis: string[] = [];
  const plays = await ctx.db
    .query("plays")
    .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
    .take(MAX_MEMBERS);
  for (const p of plays) {
    const done = p.finishedAt !== undefined;
    if (p.memberId === myId) {
      status = done ? "done" : "inProgress";
      points = done ? (p.points ?? 0) : null;
    }
    const emoji = emojiOf.get(p.memberId);
    if (done && emoji) emojis.push(emoji);
  }
  return {
    gameId: game._id,
    type: game.type,
    slot: isFriendGame(game.type) ? ("friends" as const) : ("mini" as const),
    multiplier: game.multiplier,
    maxPoints: maxPointsFor(game.type),
    myPlay: { status, points },
    played: { count: emojis.length, emojis },
  };
}
