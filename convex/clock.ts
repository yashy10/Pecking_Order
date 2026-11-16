import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { createBlurGame } from "./blur";
import { CROSSWORD_PUZZLES } from "./content/crossword";
import { FLOW_PUZZLES } from "./content/flow";
import { KRILLION_PUZZLES, NOKRILLION_PUZZLES } from "./content/krillion";
import { SUDOKU_PUZZLES } from "./content/sudoku";
import { WORDLE_PUZZLES } from "./content/wordle";
import {
  FRIEND_LOOKBACK_DAYS,
  FRIENDS_FROM_WEEK,
  LAST_GAME_DAY,
  PROMPT_BONUS,
  STREAK_SPY_EVERY,
  SUNDAY,
  WILDCARD_DAY,
  WILDCARD_MULTIPLIER,
} from "./lib/constants";
import { activePowers, byStanding, gamesFor, membersOf, promptFor } from "./lib/day";
import { type FriendGame, miniGameFor, promptShape, puzzleIndex } from "./lib/games";
import { nextTickAt, WEEK } from "./lib/schedule";
import { createMatchUpGame } from "./matchUp";
import { createMostLikelyGame } from "./mostLikely";
import { scheduleReminders } from "./notifications";
import { createPrompt } from "./prompts";
import { createReadRoomGame } from "./readRoom";
import { createWhoSaidItGame } from "./whoSaidIt";

// The game clock. Owned by the lead. See docs/PLAN.md §6.2.
//
//   (Mon, open) → (Mon, revealed) → (Tue, open) → … → (Sat, revealed)
//   → (Sun, open: no game) → (Sun, finale) → next week (Mon, open)
//
// Every move is one step of this machine. Two things take steps: the demo panel, for
// demo groups (autoClock: false), and a cron for groups made from the home screen
// (autoClock: true), which follow the real calendar in lib/schedule.ts.

/** Cron batch size. Anything left over is picked up a minute later. */
const DUE_BATCH = 25;

export const advance = internalMutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { groupId }) => {
    await advanceGroup(ctx, groupId);
    return null;
  },
});

/**
 * Runs every minute (crons.ts). Hands each automatic group whose next step is due to its
 * own transaction, so one big group's reveal can't hold up the rest.
 */
export const tick = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const due = await ctx.db
      .query("groups")
      .withIndex("by_autoClock_and_nextTickAt", (q) =>
        q.eq("autoClock", true).gte("nextTickAt", 0).lte("nextTickAt", Date.now()),
      )
      .take(DUE_BATCH);
    for (const group of due) {
      if (group.nextTickAt === undefined) continue;
      await ctx.scheduler.runAfter(0, internal.clock.advanceDue, {
        groupId: group._id,
        dueAt: group.nextTickAt,
      });
    }
    return due.length;
  },
});

/**
 * One due step. `dueAt` makes it idempotent: if the group has already moved (an earlier
 * run, or the demo panel took it over), its nextTickAt differs and this does nothing.
 * A group that fell behind catches up one step per minute.
 */
export const advanceDue = internalMutation({
  args: { groupId: v.id("groups"), dueAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { groupId, dueAt }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group || !group.autoClock || group.nextTickAt !== dueAt || dueAt > Date.now()) return null;
    await advanceGroup(ctx, groupId);
    return null;
  },
});

/**
 * For the developer, from the CLI or dashboard: make an automatic group's next step due
 * now, so the next cron run takes it. The step after is back on the calendar.
 *   npx convex run clock:dueNow '{"groupId":"…"}'
 */
export const dueNow = internalMutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { groupId }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group?.autoClock) throw new ConvexError("Only automatic groups run on a schedule.");
    await ctx.db.patch("groups", groupId, { nextTickAt: Date.now() });
    return null;
  },
});

/** Moves a group exactly one step, then, for an automatic group, sets when the next is due. */
export async function advanceGroup(ctx: MutationCtx, groupId: Id<"groups">): Promise<void> {
  const group = await ctx.db.get("groups", groupId);
  if (!group) throw new ConvexError("Group not found.");
  await step(ctx, group);
  if (group.autoClock && group.weekStartsAt !== undefined) {
    const moved = await ctx.db.get("groups", groupId);
    if (!moved) return;
    const weekStartsAt = moved.week > group.week ? group.weekStartsAt + WEEK : group.weekStartsAt;
    await ctx.db.patch("groups", groupId, {
      weekStartsAt,
      nextTickAt: nextTickAt({ day: moved.day, phase: moved.phase }, weekStartsAt),
    });
    // A new day just opened: book its noon nudge and 7:30 last call (Sunday: a 6 PM tease).
    if (moved.phase === "open") await scheduleReminders(ctx, { ...moved, weekStartsAt });
  }
}

async function step(ctx: MutationCtx, group: Doc<"groups">): Promise<void> {
  if (group.phase === "finale") return await startNewWeek(ctx, group);
  if (group.day === SUNDAY) return await runFinale(ctx, group);
  if (group.phase === "open") return await revealDay(ctx, group);
  const next = group.day + 1; // revealed, Monday to Saturday
  await ctx.db.patch("groups", group._id, { day: next, phase: "open" });
  await startDay(ctx, group._id, group.week, next); // nothing to create on Sunday
}

/** Creates a day's games and question. Safe to call twice. */
export async function startDay(
  ctx: MutationCtx,
  groupId: Id<"groups">,
  week: number,
  day: number,
): Promise<void> {
  if (day > LAST_GAME_DAY) return;
  if ((await gamesFor(ctx, groupId, week, day)).length > 0) return;
  const args = { groupId, week, day, multiplier: day === WILDCARD_DAY ? WILDCARD_MULTIPLIER : 1 };
  // The friends game first: it reads earlier questions, and today's must not be one of them.
  if (week >= FRIENDS_FROM_WEEK) await createFriendGame(ctx, args);
  await createMiniGame(ctx, args);
  await createPrompt(ctx, { groupId, week, day });
}

type DayArgs = { groupId: Id<"groups">; week: number; day: number; multiplier: number };

const PUZZLE_POOLS = {
  flow: FLOW_PUZZLES,
  wordle: WORDLE_PUZZLES,
  krillion: KRILLION_PUZZLES,
  nokrillion: NOKRILLION_PUZZLES,
  sudoku: SUDOKU_PUZZLES,
  crossword: CROSSWORD_PUZZLES,
} as const;

/** Today's mini game, from the schedule in lib/games.ts. */
async function createMiniGame(ctx: MutationCtx, args: DayArgs): Promise<Id<"games">> {
  const type = miniGameFor(args.week, args.day);
  if (type === "blur") return await createBlurGame(ctx, args);
  const pool: readonly { key: string }[] = PUZZLE_POOLS[type];
  if (pool.length === 0) return await createBlurGame(ctx, args);
  const puzzle = pool[puzzleIndex(pool.length, args.week)];
  return await ctx.db.insert("games", { ...args, type, puzzleKey: puzzle.key });
}

const FRIEND_BUILDERS: Record<
  FriendGame,
  (ctx: MutationCtx, args: DayArgs, prompt: Doc<"prompts">) => Promise<Id<"games"> | null>
> = {
  whoSaidIt: createWhoSaidItGame,
  mostLikely: createMostLikelyGame,
  readRoom: createReadRoomGame,
  matchUp: createMatchUpGame,
};

/**
 * Today's friends game, from the latest earlier question that has enough answers and
 * hasn't been used yet: usually yesterday's, otherwise one from the days before (week 1's
 * answers included). No such question, no friends game today.
 */
async function createFriendGame(ctx: MutationCtx, args: DayArgs): Promise<Id<"games"> | null> {
  let week = args.week;
  let day = args.day;
  for (let back = 0; back < FRIEND_LOOKBACK_DAYS; back++) {
    day -= 1;
    if (day < 0) {
      week -= 1;
      day = LAST_GAME_DAY;
    }
    if (week < 1) return null;
    const prompt = await promptFor(ctx, args.groupId, week, day);
    if (!prompt || prompt.usedAt !== undefined) continue;
    const gameId = await FRIEND_BUILDERS[promptShape(prompt).feeds](ctx, args, prompt);
    if (gameId) {
      await ctx.db.patch("prompts", prompt._id, { usedAt: Date.now() });
      return gameId;
    }
  }
  return null;
}

/** The daily reveal: banks sealed points, streaks, powers and "passed you" lines. */
export async function revealDay(ctx: MutationCtx, group: Doc<"groups">): Promise<void> {
  const { _id: groupId, week, day } = group;
  const games = await gamesFor(ctx, groupId, week, day);
  const prompt = await promptFor(ctx, groupId, week, day);
  const members = await membersOf(ctx, groupId);

  const results = new Map<Id<"members">, { points: number; played: boolean; answered: boolean }>();
  for (const m of members) {
    // Every game today counts: the mini game and the friends game add up.
    let points = 0;
    let played = false;
    for (const game of games) {
      const play = await ctx.db
        .query("plays")
        .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", game._id).eq("memberId", m._id))
        .unique();
      if (play && play.finishedAt !== undefined) {
        points += play.points ?? 0;
        played = true;
      }
    }
    const answer = prompt
      ? await ctx.db
          .query("answers")
          .withIndex("by_promptId_and_memberId", (q) =>
            q.eq("promptId", prompt._id).eq("memberId", m._id),
          )
          .unique()
      : null;
    results.set(m._id, { points, played, answered: answer !== null });
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

  for (const game of games) await ctx.db.patch("games", game._id, { revealedAt: Date.now() });
  await ctx.db.patch("groups", groupId, { phase: "revealed" });
  if (prompt && promptShape(prompt).kind === "text") {
    await ctx.scheduler.runAfter(0, internal.ai.rewriteAnswers, { promptId: prompt._id });
  }
  // Every phone with reminders on hears about it ("Priya just passed you").
  await ctx.scheduler.runAfter(0, internal.notifications.afterReveal, { groupId, week, day });
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
  await ctx.scheduler.runAfter(0, internal.notifications.afterFinale, { groupId: group._id, week: group.week });
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
