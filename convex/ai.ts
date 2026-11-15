"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

// Track C (built by the lead). Scheduled at each reveal. One OpenAI call rewrites the
// day's new answers into one neutral voice, so Who Said It is about what people
// said, not how they type. Any failure leaves the raw answers in play.
// Unset OPENAI_API_KEY to switch it off; set OPENAI_MODEL to change the model.

const Rewrites = z.object({
  items: z.array(z.object({ answerId: z.string(), rewritten: z.string() })),
});

const INSTRUCTIONS = [
  "You rewrite short answers from a friends' party game so nobody can tell who wrote them from their style.",
  "Rewrite each answer in one plain, neutral voice. Keep the meaning and any funny detail.",
  "Remove slang, emoji, typos, capitalisation habits and anything that names or identifies the writer.",
  "Keep each rewrite under 140 characters. Return every answerId exactly once, unchanged.",
].join(" ");

export const rewriteAnswers = internalAction({
  args: { promptId: v.id("prompts") },
  returns: v.null(),
  handler: async (ctx, { promptId }) => {
    if (!process.env.OPENAI_API_KEY) return null;
    const pending = await ctx.runQuery(internal.prompts.answersForPrompt, { promptId });
    if (pending.length === 0) return null;
    try {
      const client = new OpenAI();
      const res = await client.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
        instructions: INSTRUCTIONS,
        input: JSON.stringify(pending),
        text: { format: zodTextFormat(Rewrites, "rewrites") },
      });
      const wanted = new Set<string>(pending.map((a) => a.answerId));
      const items = (res.output_parsed?.items ?? [])
        .filter((i) => wanted.has(i.answerId) && i.rewritten.trim().length > 0)
        .map((i) => ({ answerId: i.answerId as Id<"answers">, rewritten: i.rewritten.trim() }));
      if (items.length > 0) await ctx.runMutation(internal.prompts.saveRewrites, { items });
    } catch (e) {
      console.error("rewriteAnswers failed; raw answers stay in play:", e instanceof Error ? e.message : e);
    }
    return null;
  },
});
