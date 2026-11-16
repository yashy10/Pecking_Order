import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Frozen in Phase 0. Owned by the lead. See docs/PLAN.md §6.6.

export const gameTypeV = v.union(v.literal("blur"), v.literal("whoSaidIt"));
export const phaseV = v.union(v.literal("open"), v.literal("revealed"), v.literal("finale"));
export const powerTypeV = v.union(v.literal("ghost"), v.literal("spy"));
export const eventKindV = v.union(
  v.literal("passedYou"),
  v.literal("youPassed"),
  v.literal("power"),
  v.literal("squawk"),
  v.literal("champion"),
);

export default defineSchema({
  users: defineTable({
    token: v.string(), // device secret. Never returned by any function.
    name: v.string(),
    emoji: v.string(),
    isBot: v.boolean(),
    hasPass: v.boolean(),
    googleSub: v.optional(v.string()), // Google account id; set by Continue with Google
    needsProfile: v.optional(v.boolean()), // true until a new Google user picks their name and bird
  })
    .index("by_token", ["token"])
    .index("by_googleSub", ["googleSub"]),

  // One row per Continue with Google attempt. Server-only; deleted when claimed or expired.
  // `verifier` never leaves the device that started the attempt, so a sign-in link sent to
  // someone else can't be finished on the wrong device.
  googleLogins: defineTable({
    state: v.string(),
    verifier: v.string(),
    returnTo: v.string(),
    expiresAt: v.number(),
    claim: v.optional(v.string()),
    googleSub: v.optional(v.string()),
    givenName: v.optional(v.string()),
  })
    .index("by_state", ["state"])
    .index("by_claim", ["claim"])
    .index("by_expiresAt", ["expiresAt"]),

  groups: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    week: v.number(), // starts at 1
    day: v.number(), // 0 = Mon … 6 = Sun
    phase: phaseV,
    autoClock: v.boolean(), // true: the cron moves it on the real calendar; false: the demo panel does
    nextTickAt: v.optional(v.number()),
    // Automatic groups only (convex/lib/schedule.ts): the creator's UTC offset in minutes,
    // and the instant this week's Monday began, local time.
    utcOffsetMinutes: v.optional(v.number()),
    weekStartsAt: v.optional(v.number()),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_autoClock_and_nextTickAt", ["autoClock", "nextTickAt"]),

  members: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    name: v.string(), // copied from users
    emoji: v.string(),
    isBot: v.boolean(),
    hasPass: v.boolean(), // copied from users; cosmetic only
    weekPoints: v.number(), // banked points only; changes at the reveal
    prevWeekPoints: v.number(), // value before the latest reveal
    lastDelta: v.number(), // points banked at the latest reveal
    streak: v.number(),
    streakSaveWeek: v.optional(v.number()), // week in which the forgiven day was used
    ghost: v.number(), // inventory
    spy: v.number(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_userId", ["userId"])
    .index("by_groupId_and_userId", ["groupId", "userId"]),

  games: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    day: v.number(),
    type: gameTypeV,
    multiplier: v.number(),
    // Server-only payloads. Never return these objects from a public function.
    blur: v.optional(
      v.object({ imageKey: v.string(), answers: v.array(v.string()) }), // answers[0] is shown after finishing
    ),
    whoSaidIt: v.optional(
      v.object({
        quotes: v.array(
          v.object({
            answerId: v.id("answers"),
            authorId: v.id("members"),
            optionIds: v.array(v.id("members")),
          }),
        ),
      }),
    ),
    revealedAt: v.optional(v.number()),
  }).index("by_groupId_and_week_and_day", ["groupId", "week", "day"]),

  plays: defineTable({
    gameId: v.id("games"),
    groupId: v.id("groups"),
    memberId: v.id("members"),
    startedAt: v.number(), // server time
    finishedAt: v.optional(v.number()),
    wrongGuesses: v.number(),
    points: v.optional(v.number()), // set on finish; sealed until the reveal
    detail: v.optional(v.string()), // e.g. "3 of 4"
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_and_memberId", ["gameId", "memberId"]),

  prompts: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    day: v.number(),
    question: v.string(),
  }).index("by_groupId_and_week_and_day", ["groupId", "week", "day"]),

  answers: defineTable({
    promptId: v.id("prompts"),
    groupId: v.id("groups"),
    memberId: v.id("members"),
    text: v.string(),
    rewritten: v.optional(v.string()), // filled in by the AI action
  })
    .index("by_promptId", ["promptId"])
    .index("by_promptId_and_memberId", ["promptId", "memberId"]),

  powerUses: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    day: v.number(),
    memberId: v.id("members"),
    type: powerTypeV,
  }).index("by_groupId_and_week_and_day", ["groupId", "week", "day"]),

  // Web push (convex/notifications.ts): one row per browser that turned reminders on.
  // The endpoint is the browser's own push URL; p256dh and auth encrypt what we send it.
  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  events: defineTable({
    groupId: v.id("groups"),
    memberId: v.id("members"), // who this line is for
    week: v.number(),
    day: v.number(),
    kind: eventKindV,
    text: v.string(),
  }).index("by_memberId", ["memberId"]),

  // Server-only values, such as the Whop webhook signing secret. Never read by a public function.
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  weekResults: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    standings: v.array(
      v.object({
        memberId: v.id("members"),
        name: v.string(),
        emoji: v.string(),
        points: v.number(),
        hasPass: v.boolean(),
      }),
    ),
  }).index("by_groupId_and_week", ["groupId", "week"]),
});
