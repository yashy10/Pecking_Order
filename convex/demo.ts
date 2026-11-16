import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { advanceGroup, revealDay, runFinale, startDay, startNewWeek } from "./clock";
import { createPrompt } from "./prompts";
import { BANKED_POINTS, BOTS, cannedAnswers, WEDNESDAY_POINTS } from "./content/bots";
import { profileById } from "./lib/auth";
import { dayLabel, LAST_GAME_DAY, MAX_MEMBERS, WILDCARD_DAY } from "./lib/constants";
import { activePowers, byStanding, gamesFor, membersOf, newMemberDoc, promptFor } from "./lib/day";
import { isFriendGame, maxPointsFor, promptShape } from "./lib/games";
import { finishPlay } from "./lib/scoring";
import { gameTypeV, phaseV, powerTypeV } from "./schema";

/** The demo group plays week 2, so it has a friends game as well as a mini game. */
const DEMO_WEEK = 2;

// Owned by the lead. Demo controls (PLAN §9). Every function needs DEMO_KEY,
// set with `npx convex env set DEMO_KEY <words>`; without it a curious judge
// could jump the group to Sunday. The panel never shows anyone's points: it
// is on the projector.

const IDLE_BOTS = new Set(BOTS.filter((b) => b.idle).map((b) => b.name));

function keyMatches(demoKey: string): boolean {
  const expected = process.env.DEMO_KEY;
  return Boolean(expected) && demoKey === expected;
}

function checkDemoKey(demoKey: string): void {
  if (!process.env.DEMO_KEY) throw new ConvexError("DEMO_KEY isn't set on this deployment.");
  if (!keyMatches(demoKey)) throw new ConvexError("Wrong demo key.");
}

async function loadGroup(ctx: QueryCtx | MutationCtx, groupId: Id<"groups">) {
  const group = await ctx.db.get("groups", groupId);
  if (!group) throw new ConvexError("That group doesn't exist.");
  return group;
}

/**
 * Once the presenter moves a group's clock by hand, the automatic clock lets go of it,
 * so the two never fight over the same group.
 */
async function takeManualControl(ctx: MutationCtx, groupId: Id<"groups">): Promise<void> {
  const group = await loadGroup(ctx, groupId);
  if (group.autoClock) await ctx.db.patch("groups", groupId, { autoClock: false, nextTickAt: undefined });
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomHex(length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

async function uniqueInviteCode(ctx: MutationCtx): Promise<string> {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 20; tries++) {
    let code = "";
    for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const taken = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .unique();
    if (!taken) return code;
  }
  throw new ConvexError("Couldn't find a free invite code. Try again.");
}

/** Removes one day's games, prompt and power uses, so the day can be dropped again. */
async function clearDay(ctx: MutationCtx, group: Doc<"groups">, day: number): Promise<void> {
  for (const game of await gamesFor(ctx, group._id, group.week, day)) {
    const plays = await ctx.db
      .query("plays")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .take(MAX_MEMBERS);
    for (const p of plays) await ctx.db.delete("plays", p._id);
    // The question it was built from can feed a game again.
    if (game.sourcePromptId) {
      const source = await ctx.db.get("prompts", game.sourcePromptId);
      if (source) await ctx.db.patch("prompts", source._id, { usedAt: undefined });
    }
    await ctx.db.delete("games", game._id);
  }
  const prompt = await promptFor(ctx, group._id, group.week, day);
  if (prompt) {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_promptId", (q) => q.eq("promptId", prompt._id))
      .take(MAX_MEMBERS);
    for (const a of answers) await ctx.db.delete("answers", a._id);
    await ctx.db.delete("prompts", prompt._id);
  }
  const uses = await ctx.db
    .query("powerUses")
    .withIndex("by_groupId_and_week_and_day", (q) =>
      q.eq("groupId", group._id).eq("week", group.week).eq("day", day),
    )
    .take(MAX_MEMBERS * 2);
  for (const u of uses) await ctx.db.delete("powerUses", u._id);
}

/** A bot's sealed score for one game: a mini game is out of 100, a friends game out of 200. */
function botPoints(game: Doc<"games">): number {
  const max = maxPointsFor(game.type);
  return Math.round(max * (0.3 + Math.random() * 0.65) * game.multiplier);
}

/**
 * A bot's answer to a question of any shape. Votes lean toward the first few members, so
 * Most Likely To has a clear winner; this-or-that leans 2 to 1, so Read the Room isn't a coin toss.
 */
function botAnswer(
  prompt: Doc<"prompts">,
  bot: Doc<"members">,
  i: number,
  lines: string[],
  members: Doc<"members">[],
): { text: string; rewritten?: string; choice?: number; voteFor?: Id<"members"> } {
  const { kind } = promptShape(prompt);
  if (kind === "vote") {
    const others = members.filter((m) => m._id !== bot._id);
    const favourite = Math.random() < 0.6 ? others.slice(0, 3) : others;
    const pick = favourite[Math.floor(Math.random() * favourite.length)] ?? others[0];
    return { text: pick.name, voteFor: pick._id };
  }
  if (kind === "either") {
    const choice = Math.random() < 0.65 ? 0 : 1;
    return { text: prompt.options?.[choice] ?? "", choice };
  }
  const text = lines[i % lines.length];
  return { text, rewritten: text };
}

async function botsAnswer(ctx: MutationCtx, prompt: Doc<"prompts">, bots: Doc<"members">[]): Promise<number> {
  const members = await membersOf(ctx, prompt.groupId);
  const lines = shuffle(cannedAnswers(prompt.question));
  let answered = 0;
  for (const [i, bot] of bots.entries()) {
    const existing = await ctx.db
      .query("answers")
      .withIndex("by_promptId_and_memberId", (q) => q.eq("promptId", prompt._id).eq("memberId", bot._id))
      .unique();
    if (existing) continue;
    await ctx.db.insert("answers", {
      promptId: prompt._id,
      groupId: prompt.groupId,
      memberId: bot._id,
      ...botAnswer(prompt, bot, i, lines, members),
    });
    answered++;
  }
  return answered;
}

async function playingBots(ctx: MutationCtx, groupId: Id<"groups">) {
  return (await membersOf(ctx, groupId)).filter((m) => m.isBot && !IDLE_BOTS.has(m.name));
}

/** Every playing bot without a play or an answer today gets one. */
async function botsPlayToday(ctx: MutationCtx, group: Doc<"groups">) {
  const games = await gamesFor(ctx, group._id, group.week, group.day);
  const prompt = await promptFor(ctx, group._id, group.week, group.day);
  const bots = await playingBots(ctx, group._id);
  let played = 0;
  for (const bot of bots) {
    let playedAny = false;
    for (const game of games) {
      if (game.revealedAt !== undefined) continue;
      const existing = await ctx.db
        .query("plays")
        .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", game._id).eq("memberId", bot._id))
        .unique();
      if (existing) continue;
      const now = Date.now();
      await ctx.db.insert("plays", {
        gameId: game._id,
        groupId: group._id,
        memberId: bot._id,
        startedAt: now,
        finishedAt: now,
        wrongGuesses: 0,
        points: botPoints(game),
        detail: "bot",
      });
      playedAny = true;
    }
    if (playedAny) played++;
  }
  const answered = prompt ? await botsAnswer(ctx, prompt, bots) : 0;
  return { played, answered };
}

const humanV = v.object({ memberId: v.id("members"), name: v.string(), emoji: v.string() });

/** What the panel shows. Null when the key is wrong or the group is gone. Never any points. */
export const state = query({
  args: { demoKey: v.string(), groupId: v.id("groups") },
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      inviteCode: v.string(),
      week: v.number(),
      day: v.number(),
      dayLabel: v.string(),
      phase: phaseV,
      // Today's games, friends game first, with how many have finished each.
      games: v.array(v.object({ type: gameTypeV, played: v.number() })),
      multiplier: v.number(),
      humans: v.array(humanV),
      botCount: v.number(),
    }),
  ),
  handler: async (ctx, { demoKey, groupId }) => {
    if (!keyMatches(demoKey)) return null;
    const group = await ctx.db.get("groups", groupId);
    if (!group) return null;
    const members = await membersOf(ctx, groupId);
    const games = [];
    for (const game of await gamesFor(ctx, groupId, group.week, group.day)) {
      const plays = await ctx.db
        .query("plays")
        .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
        .take(MAX_MEMBERS);
      games.push({
        type: game.type,
        played: plays.filter((p) => p.finishedAt !== undefined).length,
        friends: isFriendGame(game.type),
        multiplier: game.multiplier,
      });
    }
    games.sort((a, b) => Number(b.friends) - Number(a.friends));
    return {
      name: group.name,
      inviteCode: group.inviteCode,
      week: group.week,
      day: group.day,
      dayLabel: dayLabel(group.day),
      phase: group.phase,
      games: games.map((g) => ({ type: g.type, played: g.played })),
      multiplier: games[0]?.multiplier ?? 1,
      humans: members
        .filter((m) => !m.isBot)
        .map((m) => ({ memberId: m._id, name: m.name, emoji: m.emoji })),
      botCount: members.filter((m) => m.isBot).length,
    };
  },
});

/** Finds a group from its invite code, so the panel can take over any group. */
export const groupByCode = query({
  args: { demoKey: v.string(), code: v.string() },
  returns: v.union(v.null(), v.id("groups")),
  handler: async (ctx, { demoKey, code }) => {
    if (!keyMatches(demoKey)) return null;
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.trim().toUpperCase()))
      .unique();
    return group?._id ?? null;
  },
});

/**
 * New demo group: Wildcard Wednesday of week 2, so there's a ×2 mini game and a ×2
 * friends game built from Tuesday's question. Ten bots with Monday and Tuesday banked and
 * Wednesday already played, two bots that never play, and bot answers to today's question.
 */
export const seed = mutation({
  args: { demoKey: v.string(), name: v.optional(v.string()) },
  returns: v.object({ groupId: v.id("groups"), inviteCode: v.string() }),
  handler: async (ctx, { demoKey, name }) => {
    checkDemoKey(demoKey);
    const week = DEMO_WEEK;
    const inviteCode = await uniqueInviteCode(ctx);
    const groupId = await ctx.db.insert("groups", {
      name: name?.trim() || "The Roost",
      inviteCode,
      week,
      day: WILDCARD_DAY,
      phase: "open",
      autoClock: false,
    });
    const banked = shuffle(BANKED_POINTS);
    const wednesday = shuffle(WEDNESDAY_POINTS);

    let n = 0;
    for (const bot of BOTS) {
      const profile = { name: bot.name, emoji: bot.emoji, isBot: true, hasPass: false };
      const userId = await ctx.db.insert("users", { ...profile, token: `bot_${randomHex(60)}` });
      // Two games a day from week 2, so two days banked is about twice the old total.
      const points = bot.idle ? 0 : banked[n] * 2;
      await ctx.db.insert("members", {
        ...newMemberDoc(groupId, { ...profile, userId }),
        weekPoints: points,
        prevWeekPoints: points,
        streak: bot.idle ? 0 : 2,
      });
      if (!bot.idle) n++;
    }
    const bots = await playingBots(ctx, groupId);

    // Tuesday's question, answered by the bots: today's friends game is built from it.
    const tuesday = await ctx.db.get("prompts", await createPrompt(ctx, { groupId, week, day: WILDCARD_DAY - 1 }));
    if (tuesday) await botsAnswer(ctx, tuesday, bots);
    await startDay(ctx, groupId, week, WILDCARD_DAY);

    const games = await gamesFor(ctx, groupId, week, WILDCARD_DAY);
    for (const [i, bot] of bots.entries()) {
      for (const game of games) {
        const now = Date.now();
        await ctx.db.insert("plays", {
          gameId: game._id,
          groupId,
          memberId: bot._id,
          startedAt: now,
          finishedAt: now,
          wrongGuesses: 0,
          // Already doubled. The friends game is worth twice the mini game.
          points: isFriendGame(game.type) ? wednesday[i % wednesday.length] * 2 : wednesday[i % wednesday.length],
          detail: "bot",
        });
      }
    }
    const prompt = await promptFor(ctx, groupId, week, WILDCARD_DAY);
    if (prompt) await botsAnswer(ctx, prompt, bots);
    return { groupId, inviteCode };
  },
});

export const botsPlay = mutation({
  args: { demoKey: v.string(), groupId: v.id("groups") },
  returns: v.object({ played: v.number(), answered: v.number() }),
  handler: async (ctx, { demoKey, groupId }) => {
    checkDemoKey(demoKey);
    const group = await loadGroup(ctx, groupId);
    if (group.phase !== "open" || group.day > LAST_GAME_DAY) {
      throw new ConvexError("There's no open game today.");
    }
    return await botsPlayToday(ctx, group);
  },
});

/** Next ▶: one step of the clock. */
export const advance = mutation({
  args: { demoKey: v.string(), groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { demoKey, groupId }) => {
    checkDemoKey(demoKey);
    await takeManualControl(ctx, groupId);
    await advanceGroup(ctx, groupId);
    return null;
  },
});

/** Reveals today if needed, then drops a fresh ×2 Wednesday. */
export const makeItWednesday = mutation({
  args: { demoKey: v.string(), groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { demoKey, groupId }) => {
    checkDemoKey(demoKey);
    await takeManualControl(ctx, groupId);
    const group = await loadGroup(ctx, groupId);
    if (group.day === WILDCARD_DAY && group.phase === "open") return null;
    if (group.phase === "open" && group.day <= LAST_GAME_DAY) await revealDay(ctx, group);
    await clearDay(ctx, group, WILDCARD_DAY);
    await ctx.db.patch("groups", groupId, { day: WILDCARD_DAY, phase: "open" });
    await startDay(ctx, groupId, group.week, WILDCARD_DAY);
    return null;
  },
});

/** The member directly above this player (as they see it) uses Ghost. Returns who vanished. */
export const ghostAbove = mutation({
  args: { demoKey: v.string(), groupId: v.id("groups"), memberId: v.id("members") },
  returns: v.object({ ghosted: v.union(v.string(), v.null()) }),
  handler: async (ctx, { demoKey, groupId, memberId }) => {
    checkDemoKey(demoKey);
    const group = await loadGroup(ctx, groupId);
    if (group.phase === "finale") throw new ConvexError("No powers during the finale.");
    const members = await membersOf(ctx, groupId);
    const { ghosted } = await activePowers(ctx, groupId, group.week, group.day);
    const order = [...members].sort(byStanding("weekPoints"));
    const place = order.findIndex((m) => m._id === memberId);
    if (place < 0) throw new ConvexError("That player isn't in this group.");
    for (let j = place - 1; j >= 0; j--) {
      const rival = order[j];
      if (ghosted.has(rival._id)) continue;
      await ctx.db.insert("powerUses", {
        groupId,
        week: group.week,
        day: group.day,
        memberId: rival._id,
        type: "ghost",
      });
      return { ghosted: rival.name };
    }
    return { ghosted: null };
  },
});

/** Adds one Ghost or Spy to one member, or to every human when no member is given. */
export const grantPower = mutation({
  args: {
    demoKey: v.string(),
    groupId: v.id("groups"),
    type: powerTypeV,
    memberId: v.optional(v.id("members")),
  },
  returns: v.object({ granted: v.number() }),
  handler: async (ctx, { demoKey, groupId, type, memberId }) => {
    checkDemoKey(demoKey);
    const members = await membersOf(ctx, groupId);
    const targets = memberId ? members.filter((m) => m._id === memberId) : members.filter((m) => !m.isBot);
    for (const m of targets) {
      await ctx.db.patch("members", m._id, type === "ghost" ? { ghost: m.ghost + 1 } : { spy: m.spy + 1 });
    }
    return { granted: targets.length };
  },
});

/** Reveals today if needed, then runs the Sunday finale. */
export const jumpToSunday = mutation({
  args: { demoKey: v.string(), groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { demoKey, groupId }) => {
    checkDemoKey(demoKey);
    await takeManualControl(ctx, groupId);
    const group = await loadGroup(ctx, groupId);
    if (group.phase === "finale") return null;
    if (group.phase === "open" && group.day <= LAST_GAME_DAY) await revealDay(ctx, group);
    await runFinale(ctx, await loadGroup(ctx, groupId));
    return null;
  },
});

/** Back to a fresh Monday: weekly points reset, streaks and powers kept. */
export const resetWeek = mutation({
  args: { demoKey: v.string(), groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { demoKey, groupId }) => {
    checkDemoKey(demoKey);
    await takeManualControl(ctx, groupId);
    await startNewWeek(ctx, await loadGroup(ctx, groupId));
    return null;
  },
});

// ---------------------------------------------------------------------------------------
// A finished week, for seeing the whole app end to end without running the demo.

/** Base points per day, Monday to Saturday, before Wednesday's ×2. Odd days are Who Said It. */
type Script = readonly number[];

const YOUR_WEEK: Script = [72, 75, 74, 100, 78, 75];

/** Seven bots, scripted for a close race: Priya leads all week and you pass her on Saturday. */
const FINISHED_CAST: { name: string; emoji: string; hasPass: boolean; week: Script; skipsQuestion: number[] }[] = [
  { name: "Priya", emoji: "🦊", hasPass: true, week: [88, 50, 84, 75, 80, 25], skipsQuestion: [] },
  { name: "Sam", emoji: "🐸", hasPass: false, week: [45, 25, 77, 50, 0, 75], skipsQuestion: [] },
  { name: "Jordan", emoji: "🐼", hasPass: false, week: [63, 75, 40, 50, 71, 50], skipsQuestion: [] },
  { name: "Maya", emoji: "🦉", hasPass: false, week: [58, 50, 61, 25, 54, 100], skipsQuestion: [] },
  { name: "Leo", emoji: "🦁", hasPass: false, week: [0, 100, 55, 50, 62, 25], skipsQuestion: [0] },
  { name: "Ava", emoji: "🐧", hasPass: false, week: [39, 25, 0, 75, 47, 50], skipsQuestion: [3] },
  { name: "Noah", emoji: "🐯", hasPass: false, week: [52, 0, 49, 25, 35, 50], skipsQuestion: [1, 4] },
];

/**
 * For the developer, from the CLI: a group whose whole week has been played, ending on
 * Sunday's finale. One real player (`userId`) plus seven bots on the scripts above. Every
 * day goes through the real clock: the games, the reveals, streaks, earned powers, the
 * "passed you" lines and the finale. The bots' answers are stored pre-rewritten, so it
 * makes no OpenAI calls. The real player's scores are simulated; they answer no questions,
 * so nothing is ever quoted as theirs.
 *   npx convex run demo:buildFinishedWeek '{"name":"finished_game","userId":"…"}'
 */
export const buildFinishedWeek = internalMutation({
  args: { name: v.string(), userId: v.id("users") },
  returns: v.object({ groupId: v.id("groups"), inviteCode: v.string() }),
  handler: async (ctx, { name, userId }) => {
    const you = await profileById(ctx, userId);
    if (!you) throw new ConvexError("No such user.");
    const week = 1;
    const inviteCode = await uniqueInviteCode(ctx);
    const groupId = await ctx.db.insert("groups", {
      name,
      inviteCode,
      week,
      day: 0,
      phase: "open",
      autoClock: false,
    });
    await startDay(ctx, groupId, week, 0);

    const cast: { memberId: Id<"members">; week: Script; answers: boolean; skipsQuestion: number[] }[] = [
      { memberId: await ctx.db.insert("members", newMemberDoc(groupId, you)), week: YOUR_WEEK, answers: false, skipsQuestion: [] },
    ];
    for (const bot of FINISHED_CAST) {
      const profile = { name: bot.name, emoji: bot.emoji, isBot: true, hasPass: bot.hasPass };
      const botUserId = await ctx.db.insert("users", { ...profile, token: `bot_${randomHex(60)}` });
      const memberId = await ctx.db.insert("members", newMemberDoc(groupId, { ...profile, userId: botUserId }));
      cast.push({ memberId, week: bot.week, answers: true, skipsQuestion: bot.skipsQuestion });
    }

    const members = await membersOf(ctx, groupId);
    for (let day = 0; day <= LAST_GAME_DAY; day++) {
      const games = await gamesFor(ctx, groupId, week, day);
      const prompt = await promptFor(ctx, groupId, week, day);
      const lines = shuffle(cannedAnswers(prompt?.question));
      for (const [i, player] of cast.entries()) {
        const base = player.week[day];
        for (const game of games) {
          const now = Date.now();
          const playId = await ctx.db.insert("plays", {
            gameId: game._id,
            groupId,
            memberId: player.memberId,
            startedAt: now,
            wrongGuesses: 0,
          });
          const play = await ctx.db.get("plays", playId);
          const detail = isFriendGame(game.type) ? `${Math.round(base / 25)} of 4` : base > 0 ? "Solved" : "Out of time";
          const scaled = Math.round((base * maxPointsFor(game.type)) / 100);
          if (play) await finishPlay(ctx, play, { basePoints: scaled, detail });
        }
        const bot = members.find((m) => m._id === player.memberId);
        if (prompt && bot && player.answers && !player.skipsQuestion.includes(day)) {
          await ctx.db.insert("answers", {
            promptId: prompt._id,
            groupId,
            memberId: player.memberId,
            ...botAnswer(prompt, bot, i, lines, members),
          });
        }
      }
      await advanceGroup(ctx, groupId); // 9 PM: the reveal
      await advanceGroup(ctx, groupId); // midnight: the next day opens (Sunday has no game)
    }
    await advanceGroup(ctx, groupId); // Sunday 9 PM: the finale
    return { groupId, inviteCode };
  },
});
