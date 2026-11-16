import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import { EITHER_PROMPTS, PROMPTS, VOTE_PROMPTS } from "./content/prompts";
import { requireMember } from "./lib/auth";
import { ANSWER_MAX_CHARS, MAX_MEMBERS } from "./lib/constants";
import { promptFor } from "./lib/day";
import { promptShape, questionShapeFor } from "./lib/games";

// Owned by Track C. The daily question comes in three shapes, each feeding a friends game:
//   text   → Who Said It or Match-Up (written answers)
//   vote   → Most Likely To (everyone votes for a friend)
//   either → Read the Room (this or that)

export async function createPrompt(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number },
): Promise<Id<"prompts">> {
  const existing = await promptFor(ctx, args.groupId, args.week, args.day);
  if (existing) return existing._id;
  const { kind, feeds } = questionShapeFor(args.week, args.day);
  // Each shape moves through its own list about once every four days.
  const n = Math.floor((args.week * 7 + args.day) / 4) + args.week;
  const base = { groupId: args.groupId, week: args.week, day: args.day, kind, feeds };
  if (kind === "vote") {
    return await ctx.db.insert("prompts", { ...base, question: VOTE_PROMPTS[n % VOTE_PROMPTS.length] });
  }
  if (kind === "either") {
    const pick = EITHER_PROMPTS[n % EITHER_PROMPTS.length];
    return await ctx.db.insert("prompts", { ...base, question: pick.question, options: [...pick.options] });
  }
  return await ctx.db.insert("prompts", {
    ...base,
    question: PROMPTS[(args.week * 7 + args.day) % PROMPTS.length],
  });
}

/**
 * Answer today's question. Send the field that matches its shape: `text` (1 to 140
 * characters), `choice` (0 or 1) or `voteFor` (another member). Editable until the reveal.
 */
export const answer = mutation({
  args: {
    token: v.string(),
    promptId: v.id("prompts"),
    text: v.optional(v.string()),
    choice: v.optional(v.number()),
    voteFor: v.optional(v.id("members")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get("prompts", args.promptId);
    if (!prompt) throw new ConvexError("That question doesn't exist.");
    const member = await requireMember(ctx, args.token, prompt.groupId);
    const group = await ctx.db.get("groups", prompt.groupId);
    if (!group || group.phase !== "open" || group.week !== prompt.week || group.day !== prompt.day) {
      throw new ConvexError("Today's question has closed.");
    }
    const { kind } = promptShape(prompt);
    let fields: { text: string; choice?: number; voteFor?: Id<"members">; rewritten?: undefined };
    if (kind === "vote") {
      const pick = args.voteFor ? await ctx.db.get("members", args.voteFor) : null;
      if (!pick || pick.groupId !== prompt.groupId) throw new ConvexError("Pick someone in the group.");
      if (pick._id === member._id) throw new ConvexError("Vote for a friend, not yourself.");
      fields = { text: pick.name, voteFor: pick._id };
    } else if (kind === "either") {
      const options = prompt.options ?? [];
      if (args.choice === undefined || !Number.isInteger(args.choice) || !options[args.choice]) {
        throw new ConvexError("Pick one of the two.");
      }
      fields = { text: options[args.choice], choice: args.choice };
    } else {
      const text = (args.text ?? "").trim();
      if (text.length < 1 || text.length > ANSWER_MAX_CHARS) {
        throw new ConvexError(`Answers need 1 to ${ANSWER_MAX_CHARS} characters.`);
      }
      fields = { text, rewritten: undefined };
    }
    const existing = await ctx.db
      .query("answers")
      .withIndex("by_promptId_and_memberId", (q) =>
        q.eq("promptId", prompt._id).eq("memberId", member._id),
      )
      .unique();
    if (existing) await ctx.db.patch("answers", existing._id, fields);
    else {
      await ctx.db.insert("answers", {
        promptId: prompt._id,
        groupId: prompt.groupId,
        memberId: member._id,
        ...fields,
      });
    }
    return null;
  },
});

/** For the AI rewrite: the answers that don't have a rewrite yet. Never exposed to clients. */
export const answersForPrompt = internalQuery({
  args: { promptId: v.id("prompts") },
  returns: v.array(v.object({ answerId: v.id("answers"), text: v.string() })),
  handler: async (ctx, { promptId }) => {
    const prompt = await ctx.db.get("prompts", promptId);
    if (!prompt || promptShape(prompt).kind !== "text") return []; // votes and picks need no rewrite
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_promptId", (q) => q.eq("promptId", promptId))
      .take(MAX_MEMBERS);
    return answers.filter((a) => !a.rewritten).map((a) => ({ answerId: a._id, text: a.text }));
  },
});

export const saveRewrites = internalMutation({
  args: { items: v.array(v.object({ answerId: v.id("answers"), rewritten: v.string() })) },
  returns: v.null(),
  handler: async (ctx, { items }) => {
    for (const item of items) {
      const answer = await ctx.db.get("answers", item.answerId);
      if (answer) {
        await ctx.db.patch("answers", item.answerId, {
          rewritten: item.rewritten.slice(0, ANSWER_MAX_CHARS),
        });
      }
    }
    return null;
  },
});
