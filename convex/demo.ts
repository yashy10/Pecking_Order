import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { advanceGroup, revealDay, runFinale, startDay, startNewWeek } from "./clock";
import { BANKED_POINTS, BOTS, cannedAnswers, WEDNESDAY_POINTS } from "./content/bots";
import { dayLabel, LAST_GAME_DAY, MAX_MEMBERS, WILDCARD_DAY } from "./lib/constants";
import { activePowers, byStanding, gameFor, membersOf, newMemberDoc, promptFor } from "./lib/day";
import { gameTypeV, phaseV, powerTypeV } from "./schema";

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

/** Removes one day's game, prompt and power uses, so the day can be dropped again. */
async function clearDay(ctx: MutationCtx, group: Doc<"groups">, day: number): Promise<void> {
  const game = await gameFor(ctx, group._id, group.week, day);
  if (game) {
    const plays = await ctx.db
      .query("plays")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .take(MAX_MEMBERS);
    for (const p of plays) await ctx.db.delete("plays", p._id);
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

/** Every playing bot without a play or an answer today gets one. */
async function botsPlayToday(ctx: MutationCtx, group: Doc<"groups">) {
  const game = await gameFor(ctx, group._id, group.week, group.day);
  const prompt = await promptFor(ctx, group._id, group.week, group.day);
  const answers = shuffle(cannedAnswers(prompt?.question));
  const bots = (await membersOf(ctx, group._id)).filter((m) => m.isBot && !IDLE_BOTS.has(m.name));
  let played = 0;
  let answered = 0;
  for (const [i, bot] of bots.entries()) {
    if (game && game.revealedAt === undefined) {
      const existing = await ctx.db
        .query("plays")
        .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", game._id).eq("memberId", bot._id))
        .unique();
      if (!existing) {
        const now = Date.now();
        await ctx.db.insert("plays", {
          gameId: game._id,
          groupId: group._id,
          memberId: bot._id,
          startedAt: now,
          finishedAt: now,
          wrongGuesses: 0,
          points: Math.round((30 + Math.floor(Math.random() * 66)) * game.multiplier),
          detail: "bot",
        });
        played++;
      }
    }
    if (prompt) {
      const existing = await ctx.db
        .query("answers")
        .withIndex("by_promptId_and_memberId", (q) =>
          q.eq("promptId", prompt._id).eq("memberId", bot._id),
        )
        .unique();
      if (!existing) {
        const text = answers[i % answers.length];
        await ctx.db.insert("answers", {
          promptId: prompt._id,
          groupId: group._id,
          memberId: bot._id,
          text,
          rewritten: text,
        });
        answered++;
      }
    }
  }
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
      gameType: v.union(gameTypeV, v.null()),
      multiplier: v.number(),
      humans: v.array(humanV),
      botCount: v.number(),
      playedCount: v.number(),
    }),
  ),
  handler: async (ctx, { demoKey, groupId }) => {
    if (!keyMatches(demoKey)) return null;
    const group = await ctx.db.get("groups", groupId);
    if (!group) return null;
    const members = await membersOf(ctx, groupId);
    const game = await gameFor(ctx, groupId, group.week, group.day);
    let playedCount = 0;
    if (game) {
      const plays = await ctx.db
        .query("plays")
        .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
        .take(MAX_MEMBERS);
      playedCount = plays.filter((p) => p.finishedAt !== undefined).length;
    }
    return {
      name: group.name,
      inviteCode: group.inviteCode,
      week: group.week,
      day: group.day,
      dayLabel: dayLabel(group.day),
      phase: group.phase,
      gameType: game?.type ?? null,
      multiplier: game?.multiplier ?? 1,
      humans: members
        .filter((m) => !m.isBot)
        .map((m) => ({ memberId: m._id, name: m.name, emoji: m.emoji })),
      botCount: members.filter((m) => m.isBot).length,
      playedCount,
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
 * New demo group: Wildcard Wednesday with a ×2 Blur open, ten bots with Monday
 * and Tuesday banked and Wednesday already played, two bots that never play,
 * and canned answers to today's question.
 */
export const seed = mutation({
  args: { demoKey: v.string(), name: v.optional(v.string()) },
  returns: v.object({ groupId: v.id("groups"), inviteCode: v.string() }),
  handler: async (ctx, { demoKey, name }) => {
    checkDemoKey(demoKey);
    const week = 1;
    const inviteCode = await uniqueInviteCode(ctx);
    const groupId = await ctx.db.insert("groups", {
      name: name?.trim() || "The Roost",
      inviteCode,
      week,
      day: WILDCARD_DAY,
      phase: "open",
      autoClock: false,
    });
    await startDay(ctx, groupId, week, WILDCARD_DAY);
    const game = await gameFor(ctx, groupId, week, WILDCARD_DAY);
    const prompt = await promptFor(ctx, groupId, week, WILDCARD_DAY);
    const answers = shuffle(cannedAnswers(prompt?.question));
    const banked = shuffle(BANKED_POINTS);
    const wednesday = shuffle(WEDNESDAY_POINTS);

    let n = 0;
    for (const bot of BOTS) {
      const profile = { name: bot.name, emoji: bot.emoji, isBot: true, hasPass: false };
      const userId = await ctx.db.insert("users", { ...profile, token: `bot_${randomHex(60)}` });
      const points = bot.idle ? 0 : banked[n];
      const memberId = await ctx.db.insert("members", {
        ...newMemberDoc(groupId, { ...profile, userId }),
        weekPoints: points,
        prevWeekPoints: points,
        streak: bot.idle ? 0 : 2,
      });
      if (bot.idle) continue;
      const now = Date.now();
      if (game) {
        await ctx.db.insert("plays", {
          gameId: game._id,
          groupId,
          memberId,
          startedAt: now,
          finishedAt: now,
          wrongGuesses: 0,
          points: wednesday[n],
          detail: "bot",
        });
      }
      if (prompt) {
        const text = answers[n % answers.length];
        await ctx.db.insert("answers", { promptId: prompt._id, groupId, memberId, text, rewritten: text });
      }
      n++;
    }
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
