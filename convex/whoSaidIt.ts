import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { findMember, requireMember } from "./lib/auth";
import {
  MAX_MEMBERS,
  WHO_SAID_IT_ASKED,
  WHO_SAID_IT_MAX_QUOTES,
  WHO_SAID_IT_MIN_AUTHORS,
  WHO_SAID_IT_OPTIONS,
  FRIEND_MAX_POINTS,
} from "./lib/constants";
import { isOpenGame, membersOf } from "./lib/day";
import { promptShape } from "./lib/games";
import { finishPlay } from "./lib/scoring";

// Track C (built by the lead). See docs/PLAN.md §8 (Track C).
// Yesterday's prompt answers become today's round. Who wrote a quote never leaves
// the server until the player has submitted.

type Quote = NonNullable<Doc<"games">["whoSaidIt"]>["quotes"][number];

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Builds a round from an earlier question's written answers (clock.ts picks which).
 * Needs answers from at least three members, otherwise returns null. Decoy names come
 * from other people who answered first, so every option is plausible.
 */
export async function createWhoSaidItGame(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number; multiplier: number },
  prompt: Doc<"prompts">,
): Promise<Id<"games"> | null> {
  if (promptShape(prompt).kind !== "text") return null;
  const answers = await ctx.db
    .query("answers")
    .withIndex("by_promptId", (q) => q.eq("promptId", prompt._id))
    .take(MAX_MEMBERS);
  const authors = [...new Set(answers.map((a) => a.memberId))];
  if (authors.length < WHO_SAID_IT_MIN_AUTHORS) return null;
  const others = (await membersOf(ctx, args.groupId))
    .map((m) => m._id)
    .filter((id) => !authors.includes(id));

  const quotes: Quote[] = shuffle(answers)
    .slice(0, WHO_SAID_IT_MAX_QUOTES)
    .map((answer) => {
      const decoys = [
        ...shuffle(authors.filter((id) => id !== answer.memberId)),
        ...shuffle(others),
      ].slice(0, WHO_SAID_IT_OPTIONS - 1);
      return {
        answerId: answer._id,
        authorId: answer.memberId,
        optionIds: shuffle([answer.memberId, ...decoys]),
      };
    });

  return await ctx.db.insert("games", {
    groupId: args.groupId,
    week: args.week,
    day: args.day,
    type: "whoSaidIt",
    multiplier: args.multiplier,
    sourcePromptId: prompt._id,
    whoSaidIt: { quotes },
  });
}

/** The quotes this player is asked: never their own, at most four, in a fixed order. */
function askedQuotes(game: Doc<"games">, memberId: Id<"members">): Quote[] {
  return (game.whoSaidIt?.quotes ?? []).filter((q) => q.authorId !== memberId).slice(0, WHO_SAID_IT_ASKED);
}

async function memberMap(ctx: QueryCtx | MutationCtx, groupId: Id<"groups">) {
  return new Map((await membersOf(ctx, groupId)).map((m) => [m._id, m]));
}

function reveal(quotes: Quote[], members: Map<Id<"members">, Doc<"members">>) {
  return quotes.map((q) => {
    const author = members.get(q.authorId);
    return {
      answerId: q.answerId,
      authorId: q.authorId,
      authorName: author?.name ?? "Someone who left",
      authorEmoji: author?.emoji ?? "🥚",
    };
  });
}

async function playFor(ctx: QueryCtx | MutationCtx, gameId: Id<"games">, memberId: Id<"members">) {
  return await ctx.db
    .query("plays")
    .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", gameId).eq("memberId", memberId))
    .unique();
}

const optionV = v.object({ memberId: v.id("members"), name: v.string(), emoji: v.string() });
const revealV = v.object({
  answerId: v.id("answers"),
  authorId: v.id("members"),
  authorName: v.string(),
  authorEmoji: v.string(),
});
const resultV = v.object({
  correct: v.number(),
  asked: v.number(),
  points: v.number(),
  reveal: v.array(revealV),
});

/**
 * The round for this player. Text is read at query time, so a rewrite that lands
 * late still shows up. `result` (with the authors) only once they have submitted.
 * Null when the caller can't play this game.
 */
export const get = query({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.union(
    v.null(),
    v.object({
      quotes: v.array(
        v.object({ answerId: v.id("answers"), text: v.string(), options: v.array(optionV) }),
      ),
      result: v.union(v.null(), resultV),
    }),
  ),
  handler: async (ctx, { token, gameId }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "whoSaidIt" || !game.whoSaidIt) return null;
    const me = await findMember(ctx, token, game.groupId);
    if (!me) return null;
    const members = await memberMap(ctx, game.groupId);
    const asked = askedQuotes(game, me._id);

    const quotes = [];
    for (const q of asked) {
      const answer = await ctx.db.get("answers", q.answerId);
      if (!answer) continue;
      quotes.push({
        answerId: q.answerId,
        text: answer.rewritten || answer.text,
        options: q.optionIds
          .filter((id) => id !== me._id)
          .flatMap((id) => {
            const m = members.get(id);
            return m ? [{ memberId: m._id, name: m.name, emoji: m.emoji }] : [];
          }),
      });
    }

    const play = await playFor(ctx, gameId, me._id);
    let result = null;
    if (play && play.finishedAt !== undefined) {
      const [, correct = "0", total = String(asked.length)] = /^(\d+) of (\d+)$/.exec(play.detail ?? "") ?? [];
      result = {
        correct: Number(correct),
        asked: Number(total),
        points: play.points ?? 0,
        reveal: reveal(asked, members),
      };
    }
    return { quotes, result };
  },
});

/** One shot: scored as round(200 × correct / asked) through finishPlay, then the authors. */
export const submit = mutation({
  args: {
    token: v.string(),
    gameId: v.id("games"),
    picks: v.array(v.object({ answerId: v.id("answers"), memberId: v.id("members") })),
  },
  returns: resultV,
  handler: async (ctx, { token, gameId, picks }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "whoSaidIt" || !game.whoSaidIt) {
      throw new ConvexError("That round doesn't exist.");
    }
    const group = await ctx.db.get("groups", game.groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    const me = await requireMember(ctx, token, game.groupId);
    if (await playFor(ctx, gameId, me._id)) throw new ConvexError("You've already played this round.");
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");

    const asked = askedQuotes(game, me._id);
    const pickOf = new Map(picks.map((p) => [p.answerId, p.memberId]));
    const correct = asked.filter((q) => pickOf.get(q.answerId) === q.authorId).length;
    const base = asked.length > 0 ? Math.round((FRIEND_MAX_POINTS * correct) / asked.length) : 0;

    const playId = await ctx.db.insert("plays", {
      gameId,
      groupId: game.groupId,
      memberId: me._id,
      startedAt: Date.now(),
      wrongGuesses: asked.length - correct,
    });
    const play = await ctx.db.get("plays", playId);
    if (!play) throw new ConvexError("Something went wrong. Try again.");
    const points = await finishPlay(ctx, play, { basePoints: base, detail: `${correct} of ${asked.length}` });
    return {
      correct,
      asked: asked.length,
      points,
      reveal: reveal(asked, await memberMap(ctx, game.groupId)),
    };
  },
});
