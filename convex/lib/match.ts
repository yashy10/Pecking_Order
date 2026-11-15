// Owned by Track B. Checks a Blur guess against the accepted answers.

/** Lowercase, no accents or punctuation, single spaces, no leading a/an/the. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(a|an|the) /, "");
}

function variants(text: string): string[] {
  const spaced = normalize(text);
  const joined = spaced.replace(/ /g, "");
  const singular = joined.endsWith("s") ? joined.slice(0, -1) : joined;
  return [spaced, joined, singular];
}

/**
 * Phase 0 version: exact match after normalising, ignoring spaces and a trailing "s".
 * Track B: add the edit-distance tolerance from docs/PLAN.md §8 (Track B).
 */
export function matchAnswer(guess: string, answers: string[]): boolean {
  if (!normalize(guess)) return false;
  const guessed = variants(guess);
  return answers.some((answer) => {
    const accepted = variants(answer);
    return guessed.some((g) => accepted.includes(g));
  });
}
