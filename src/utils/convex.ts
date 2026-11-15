import { ConvexReactClient } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";

// Frozen in Phase 0. Owned by the lead.

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` in the project folder.");
}

export const convex = new ConvexReactClient(url, { unsavedChangesWarning: false });

/** Today's state for a group, as returned by api.today.get for a member. */
export type Today = NonNullable<FunctionReturnType<typeof api.today.get>>;
