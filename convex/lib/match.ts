// Track B (built by the lead). Checks a Blur guess against the accepted answers.
// Exact after normalising; spaces and a trailing "s" don't matter; small typos are
// forgiven on longer words: 1 edit for 5+ letters, 2 edits for 9+ (PLAN §8, Track B).

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
  return [...new Set([spaced, joined, singular])];
}

/** How many typos a word of this length may carry. */
export function allowedEdits(length: number): number {
  if (length >= 9) return 2;
  if (length >= 5) return 1;
  return 0;
}

/** Levenshtein distance, stopping early once it can no longer be within `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      best = Math.min(best, row[j]);
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

export function matchAnswer(guess: string, answers: string[]): boolean {
  if (!normalize(guess)) return false;
  const guessed = variants(guess);
  return answers.some((answer) => {
    const accepted = variants(answer);
    if (guessed.some((g) => accepted.includes(g))) return true;
    const target = normalize(answer).replace(/ /g, ""); // the answer without spaces
    const budget = allowedEdits(target.length);
    return budget > 0 && guessed.some((g) => editDistance(g, target, budget) <= budget);
  });
}
