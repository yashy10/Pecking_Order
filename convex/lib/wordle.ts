import { WORDLE_GUESSES, WORDLE_PUZZLES } from "../content/wordle";

// Owned by the wordle track. Pure rules: marking a guess, scoring, and the word list.

export type Mark = "hit" | "near" | "miss";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
/** Base points for solving on guess 1, 2, … 6. */
export const WORDLE_POINTS = [100, 90, 80, 65, 50, 35] as const;

/**
 * Standard Wordle marking. Hits first; then each remaining letter is "near" only while
 * the answer still has an unmatched copy of it, left to right, so duplicates aren't over-marked.
 */
export function markGuess(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array.from({ length: guess.length }, () => "miss");
  const spare = new Map<string, number>();
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) marks[i] = "hit";
    else spare.set(answer[i], (spare.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === "hit") continue;
    const left = spare.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = "near";
      spare.set(guess[i], left - 1);
    }
  }
  return marks;
}

/** Lowercase letters only, trimmed. */
export function cleanGuess(text: string): string {
  return text.trim().toLowerCase();
}

let allowed: Set<string> | null = null;

/** Built on first use, so modules that never check a guess don't pay for it. */
function allowedWords(): Set<string> {
  if (!allowed) {
    allowed = new Set(WORDLE_GUESSES.split(" "));
    for (const p of WORDLE_PUZZLES) allowed.add(p.word);
  }
  return allowed;
}

export function isAllowedGuess(word: string): boolean {
  return /^[a-z]{5}$/.test(word) && allowedWords().has(word);
}

export function wordleAnswer(puzzleKey: string | undefined): string | null {
  return WORDLE_PUZZLES.find((p) => p.key === puzzleKey)?.word ?? null;
}
