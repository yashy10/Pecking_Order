import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { createBlurGame } from "./blur";
import {
  LAST_GAME_DAY,
  PROMPT_BONUS,
  STREAK_SPY_EVERY,
  SUNDAY,
  WILDCARD_DAY,
  WILDCARD_MULTIPLIER,
} from "./lib/constants";
import { activePowers, byStanding, gameFor, membersOf, promptFor } from "./lib/day";
import { createPrompt } from "./prompts";
import { createWhoSaidItGame } from "./whoSaidIt";

// The game clock. Owned by the lead. See docs/PLAN.md §6.2.
//
//   (Mon, open) → (Mon, revealed) → (Tue, open) → … → (Sat, revealed)
//   → (Sun, open: no game) → (Sun, finale) → next week (Mon, open)
//
// Time never comes from the wall clock: the demo panel (and later a cron)
// moves a group one step at a time.

export const advance = internalMutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { groupId }) => {
    await advanceGroup(ctx, groupId);
    return null;
  },
});

/** Moves a group exactly one step. */
export async function advanceGroup(ctx: MutationCtx, groupId: Id<"groups">): Promise<void> {
  const group = await ctx.db.get("groups", groupId);
  if (!group) throw new ConvexError("Group not found.");
  if (group.phase === "finale") return await startNewWeek(ctx, group);
  if (group.day === SUNDAY) return await runFinale(ctx, group);
  if (group.phase === "open") return await revealDay(ctx, group);
  const next = group.day + 1; // revealed, Monday to Saturday
  await ctx.db.patch("groups", groupId, { day: next, phase: "open" });
  await startDay(ctx, groupId, group.week, next); // nothing to create on Sunday
}

/** Creates a day's game and prompt. Safe to call twice. */
export async function startDay(
  ctx: MutationCtx,
  groupId: Id<"groups">,
  week: number,
  day: number,
): Promise<void> {
  if (day > LAST_GAME_DAY) return;
  if (await gameFor(ctx, groupId, week, day)) return;
  const multiplier = day === WILDCARD_DAY ? WILDCARD_MULTIPLIER : 1;
  await createPrompt(ctx, { groupId, week, day });
  let gameId: Id<"games"> | null = null;
  if (day % 2 === 1) gameId = await createWhoSaidItGame(ctx, { groupId, week, day, multiplier });
  if (!gameId) await createBlurGame(ctx, { groupId, week, day, multiplier });
}

/** The daily reveal: banks sealed points, streaks, powers and "passed you" lines. */
export async function revealDay(ctx: MutationCtx, group: Doc<"groups">): Promise<void> {
  const { _id: groupId, week, day } = group;
  const game = await gameFor(ctx, groupId, week, day);
  const prompt = await promptFor(ctx, groupId, week, day);
  const members = await membersOf(ctx, groupId);

  const results = new Map<Id<"members">, { points: number; played: boolean; answered: boolean }>();
  for (const m of members) {
    const play = game
      ? await ctx.db
          .query("plays")
          .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", game._id).eq("memberId", m._id))
          .unique()
      : null;
    const answer = prompt
      ? await ctx.db
          .query("answers")
          .withIndex("by_promptId_and_memberId", (q) =>
            q.eq("promptId", prompt._id).eq("memberId", m._id),
          )
          .unique()
      : null;
    const finished = play !== null && play.finishedAt !== undefined;
    results.set(m._id, {
      points: play && play.finishedAt !== undefined ? (play.points ?? 0) : 0,
      played: finished,
      answered: answer !== null,
    });
  }
  const best = Math.max(0, ...[...results.values()].map((r) => r.points));

  const updated: Doc<"members">[] = [];
  for (const m of members) {
    const r = results.get(m._id);
    if (!r) continue;
    const delta = r.points + (r.answered ? PROMPT_BONUS : 0);
    let streak = m.streak;
    let streakSaveWeek = m.streakSaveWeek;
    if (r.played) streak += 1;
    else if (streakSaveWeek !== week) streakSaveWeek = week; // one missed day a week is forgiven
    else streak = 0;
    let { ghost, spy } = m;
    const earned: string[] = [];
    if (r.played && streak % STREAK_SPY_EVERY === 0) {
      spy += 1;
      earned.push("Spy");
    }
    if (best > 0 && r.points === best) {
      ghost += 1;
      earned.push("Ghost");
    }
    const patch = {
      prevWeekPoints: m.weekPoints,
      weekPoints: m.weekPoints + delta,
      lastDelta: delta,
      streak,
      streakSaveWeek,
      ghost,
      spy,
    };
    await ctx.db.patch("members", m._id, patch);
    updated.push({ ...m, ...patch });
    if (!m.isBot) {
      for (const power of earned) {
        await ctx.db.insert("events", {
          groupId,
          memberId: m._id,
          week,
          day,
          kind: "power",
          text: `You earned a ${power}.`,
        });
      }
    }
  }

  // "Priya just passed you": only about your visible neighbours, never a ghost.
  const { ghosted } = await activePowers(ctx, groupId, week, day);
  const before = [...updated].sort(byStanding("prevWeekPoints"));
  const after = [...updated].sort(byStanding("weekPoints"));
  const placeBefore = new Map(before.map((m, i) => [m._id, i]));
  for (let i = 0; i < after.length; i++) {
    const me = after[i];
    if (me.isBot) continue;
    const mine = placeBefore.get(me._id) ?? 0;
    const above = nearestVisible(after, i, -1, ghosted);
    const below = nearestVisible(after, i, 1, ghosted);
    if (above && (placeBefore.get(above._id) ?? 0) > mine) {
      await ctx.db.insert("events", {
        groupId,
        memberId: me._id,
        week,
        day,
        kind: "passedYou",
        text: `${above.name} just passed you.`,
      });
    }
    if (below && (placeBefore.get(below._id) ?? 0) < mine) {
      await ctx.db.insert("events", {
        groupId,
        memberId: me._id,
        week,
        day,
        kind: "youPassed",
        text: `You passed ${below.name}.`,
      });
    }
  }

  if (game) await ctx.db.patch("games", game._id, { revealedAt: Date.now() });
  await ctx.db.patch("groups", groupId, { phase: "revealed" });
  if (prompt) await ctx.scheduler.runAfter(0, internal.ai.rewriteAnswers, { promptId: prompt._id });
}

/** Sunday night: the full standings, written once, readable by everyone. */
export async function runFinale(ctx: MutationCtx, group: Doc<"groups">): Promise<void> {
  const members = await membersOf(ctx, group._id);
  const standings = [...members].sort(byStanding("weekPoints")).map((m) => ({
    memberId: m._id,
    name: m.name,
    emoji: m.emoji,
    points: m.weekPoints,
    hasPass: m.hasPass,
  }));
  const existing = await ctx.db
    .query("weekResults")
    .withIndex("by_groupId_and_week", (q) => q.eq("groupId", group._id).eq("week", group.week))
    .first();
  if (existing) await ctx.db.patch("weekResults", existing._id, { standings });
  else await ctx.db.insert("weekResults", { groupId: group._id, week: group.week, standings });
  await ctx.db.patch("groups", group._id, { day: SUNDAY, phase: "finale" });
}

/** Monday: weekly points reset, streaks and powers carry over. */
export async function startNewWeek(ctx: MutationCtx, group: Doc<"groups">): Promise<void> {
  const week = group.week + 1;
  for (const m of await membersOf(ctx, group._id)) {
    await ctx.db.patch("members", m._id, { weekPoints: 0, prevWeekPoints: 0, lastDelta: 0 });
  }
  await ctx.db.patch("groups", group._id, { week, day: 0, phase: "open" });
  await startDay(ctx, group._id, week, 0);
}

function nearestVisible(
  list: Doc<"members">[],
  from: number,
  step: 1 | -1,
  ghosted: ReadonlySet<Id<"members">>,
): Doc<"members"> | null {
  for (let j = from + step; j >= 0 && j < list.length; j += step) {
    if (!ghosted.has(list[j]._id)) return list[j];
  }
  return null;
}
