import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import { PROMPTS } from "./content/prompts";
import { requireMember } from "./lib/auth";
import { ANSWER_MAX_CHARS, MAX_MEMBERS } from "./lib/constants";
import { promptFor } from "./lib/day";

// Owned by Track C. Phase 0: working version.

export async function createPrompt(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number },
): Promise<Id<"prompts">> {
  const existing = await promptFor(ctx, args.groupId, args.week, args.day);
  if (existing) return existing._id;
  return await ctx.db.insert("prompts", {
    groupId: args.groupId,
    week: args.week,
    day: args.day,
    question: PROMPTS[(args.week * 7 + args.day) % PROMPTS.length],
  });
}

/** 1 to 140 characters. Editable until the day is revealed. */
export const answer = mutation({
  args: { token: v.string(), promptId: v.id("prompts"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get("prompts", args.promptId);
    if (!prompt) throw new ConvexError("That question doesn't exist.");
    const member = await requireMember(ctx, args.token, prompt.groupId);
    const group = await ctx.db.get("groups", prompt.groupId);
    if (!group || group.phase !== "open" || group.week !== prompt.week || group.day !== prompt.day) {
      throw new ConvexError("Today's question has closed.");
    }
    const text = args.text.trim();
    if (text.length < 1 || text.length > ANSWER_MAX_CHARS) {
      throw new ConvexError(`Answers need 1 to ${ANSWER_MAX_CHARS} characters.`);
    }
    const existing = await ctx.db
      .query("answers")
      .withIndex("by_promptId_and_memberId", (q) =>
        q.eq("promptId", prompt._id).eq("memberId", member._id),
      )
      .unique();
    if (existing) await ctx.db.patch("answers", existing._id, { text, rewritten: undefined });
    else {
      await ctx.db.insert("answers", {
        promptId: prompt._id,
        groupId: prompt.groupId,
        memberId: member._id,
        text,
      });
    }
    return null;
  },
});

/** For the AI rewrite. Never exposed to clients. */
export const answersForPrompt = internalQuery({
  args: { promptId: v.id("prompts") },
  returns: v.array(v.object({ answerId: v.id("answers"), text: v.string() })),
  handler: async (ctx, { promptId }) => {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_promptId", (q) => q.eq("promptId", promptId))
      .take(MAX_MEMBERS);
    return answers.map((a) => ({ answerId: a._id, text: a.text }));
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
