import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// Owned by the lead. Admin Games: one shared group, open to every account, with every game
// open at once and unlimited replays. Its id lives in `settings`.

export const SHOWCASE_KEY = "showcaseGroupId";
export const SHOWCASE_NAME = "Admin Games";

export async function showcaseGroupId(ctx: QueryCtx | MutationCtx): Promise<Id<"groups"> | null> {
  const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", SHOWCASE_KEY)).unique();
  return row ? (row.value as Id<"groups">) : null;
}
