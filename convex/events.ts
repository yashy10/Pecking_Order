import { v } from "convex/values";
import { query } from "./_generated/server";
import { findMember } from "./lib/auth";
import { eventKindV } from "./schema";

// Owned by the lead. Lines like "Priya just passed you", newest first.

export const mine = query({
  args: { token: v.string(), groupId: v.id("groups") },
  returns: v.array(
    v.object({ eventId: v.id("events"), kind: eventKindV, text: v.string(), createdAt: v.number() }),
  ),
  handler: async (ctx, { token, groupId }) => {
    const me = await findMember(ctx, token, groupId);
    if (!me) return [];
    const events = await ctx.db
      .query("events")
      .withIndex("by_memberId", (q) => q.eq("memberId", me._id))
      .order("desc")
      .take(5);
    return events.map((e) => ({
      eventId: e._id,
      kind: e.kind,
      text: e.text,
      createdAt: e._creationTime,
    }));
  },
});
