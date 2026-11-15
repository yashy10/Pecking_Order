// What the notifications say. Owned by the lead. Pure, so the copy is tested and the
// sender stays dumb. Short, playful, and never a rank or anyone's score: the board is
// hidden, and a push shows on a lock screen.

export type NudgeKind = "nudge" | "lastCall" | "sundayTease" | "reveal" | "finale" | "test";
export type Message = { title: string; body: string };

export type NudgeFacts = {
  group: string;
  game?: "blur" | "whoSaidIt";
  /** How many members have finished today's game, and how many there are. */
  played?: number;
  total?: number;
  wildcard?: boolean;
  /** Reveal: who passed this player, or whom they passed, at this reveal. */
  passedBy?: string | null;
  passed?: string | null;
  /** Finale: did this player win the week? */
  youWon?: boolean;
};

const GAME_NAME = { blur: "Blur", whoSaidIt: "Who Said It" } as const;

/** A stable choice per seed, so a retry sends the same line and players see variety. */
export function pick<T>(options: readonly T[], seed: string): T {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return options[h % options.length];
}

export function nudgeMessage(kind: NudgeKind, facts: NudgeFacts, seed: string): Message {
  const game = facts.game ? GAME_NAME[facts.game] : "game";
  const title = facts.group;
  switch (kind) {
    case "nudge": {
      const lines = [
        `☀️ Today's ${game} is live. Your rivals are already pecking.`,
        `👀 Somebody is sneaking ahead. Today's ${game} takes a minute.`,
        `🐔 The coop is restless. Today's ${game} is waiting for you.`,
      ];
      if (facts.played && facts.total && facts.played > 0) {
        lines.push(`🪶 ${facts.played} of ${facts.total} have played today's ${game}. Don't be last to the coop.`);
      }
      const body = facts.wildcard ? `🃏 Wildcard Wednesday: today's ${game} counts double. Don't sleep on it.` : pick(lines, seed);
      return { title, body };
    }
    case "lastCall":
      return {
        title,
        body: pick(
          [
            `⏰ Last call! Today's ${game} closes at 9 PM.`,
            `🔒 90 minutes until today's scores are sealed. Don't hand your rivals a free day.`,
            `🪶 The flock has played. You haven't. 90 minutes left.`,
            `🐣 Tick tock. Today's ${game} is still waiting, and the reveal is at 9.`,
          ],
          seed,
        ),
      };
    case "sundayTease":
      return {
        title,
        body: pick(
          [
            "⏳ 3 hours until the full pecking order drops.",
            "👑 Tonight at 9, someone gets crowned. Will it be you?",
            "🥁 The whole board drops at 9 PM. No more hiding.",
          ],
          seed,
        ),
      };
    case "reveal":
      if (facts.passedBy) return { title, body: `😱 ${facts.passedBy} just passed you. Tomorrow is revenge day.` };
      if (facts.passed) return { title, body: `😎 You passed ${facts.passed}. Don't look back.` };
      return {
        title,
        body: pick(
          [
            "🥁 The scores are in. Who's next to you now?",
            "🔓 Today's scores just dropped. Go check your neighbours.",
            "👀 The board just moved. Did anyone sneak past you?",
          ],
          seed,
        ),
      };
    case "finale":
      return {
        title,
        body: facts.youWon
          ? "👑 You rule the roost! Champion of the week."
          : "👑 The pecking order is out. See who rules the roost, and where you landed.",
      };
    case "test":
      return { title: "Pecking Order", body: "🐔 Bawk! Reminders are on. We'll nudge you before the reveal." };
  }
}
