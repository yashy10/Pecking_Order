import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useToken } from "@/hooks/use-identity";
import { setItem } from "@/utils/storage";

// Owned by the lead. Admin Games: wipe your last go at a round and open it fresh.

export function useReplay(groupId: Id<"groups">) {
  const token = useToken();
  const replay = useMutation(api.showcase.replay);
  const [busy, setBusy] = useState<Id<"games"> | null>(null);

  async function playAgain(gameId: Id<"games">, how: "push" | "replace" = "push") {
    if (!token || busy) return;
    setBusy(gameId);
    try {
      await replay({ token, gameId });
      // Sudoku and the crossword keep a half-done grid on the device; start them empty.
      await Promise.all([setItem(`sudoku.${gameId}`, ""), setItem(`crossword.${gameId}`, "")]);
      // `r` makes the play screen mount a fresh round, even on the same game.
      const url = `/g/${groupId}/play?game=${gameId}&r=${Date.now()}`;
      if (how === "replace") router.replace(url);
      else router.push(url);
    } finally {
      setBusy(null);
    }
  }

  return { playAgain, busy };
}
