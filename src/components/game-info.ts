import type { Today } from "@/utils/convex";

// Owned by the lead. How each game is named and pitched, everywhere in the app.

export type GameType = Today["games"][number]["type"];

export const GAME_INFO: Record<GameType, { name: string; emoji: string; line: string }> = {
  // Mini games
  blur: {
    name: "Blur",
    emoji: "🔍",
    line: "A photo starts blurred and slowly sharpens. The faster you guess, the more you score.",
  },
  flow: {
    name: "Flow",
    emoji: "🧵",
    line: "Connect each pair of matching dots. Pipes can't cross, and every square must be filled.",
  },
  wordle: {
    name: "Wordle",
    emoji: "🟩",
    line: "Find the five-letter word in six tries. Fewer guesses, more points.",
  },
  krillion: {
    name: "Krillion",
    emoji: "🦐",
    line: "Name something in each category. The rarer your answer, the more it's worth.",
  },
  nokrillion: {
    name: "Nokrillion",
    emoji: "🐟",
    line: "Name something in each category. Think like everyone else: the most common answers score most.",
  },
  sudoku: {
    name: "Mini Sudoku",
    emoji: "🔢",
    line: "Fill the 6×6 grid so every row, column and box has 1 to 6. Beat par for full marks.",
  },
  crossword: {
    name: "Mini Crossword",
    emoji: "✏️",
    line: "A pocket crossword. Solve it fast for full marks.",
  },
  // Friends games
  whoSaidIt: {
    name: "Who Said It",
    emoji: "🗣️",
    line: "Your crew's answers, anonymised. Guess which friend wrote each one.",
  },
  mostLikely: {
    name: "Most Likely To",
    emoji: "🏆",
    line: "The crew voted. Call the podium: who did everyone pick?",
  },
  readRoom: {
    name: "Read the Room",
    emoji: "🌡️",
    line: "How did the crew split? Guess the share, then call which side each friend took.",
  },
  matchUp: {
    name: "Match-Up",
    emoji: "🧩",
    line: "Four answers, four friends. Match them all, fast, for a bonus.",
  },
};
