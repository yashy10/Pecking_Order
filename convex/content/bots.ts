// Owned by the lead. The demo group's bots and their canned prompt answers (PLAN §9).

export type Bot = { name: string; emoji: string; idle?: boolean };

/** Ten that play, then two that never do, so no judge finishes last. */
export const BOTS: Bot[] = [
  { name: "Priya", emoji: "🦊" },
  { name: "Sam", emoji: "🐸" },
  { name: "Jordan", emoji: "🐼" },
  { name: "Maya", emoji: "🦉" },
  { name: "Leo", emoji: "🦁" },
  { name: "Ava", emoji: "🐧" },
  { name: "Noah", emoji: "🐯" },
  { name: "Zoe", emoji: "🦄" },
  { name: "Kai", emoji: "🐙" },
  { name: "Mia", emoji: "🐨" },
  { name: "Ravi", emoji: "🐢", idle: true },
  { name: "Tess", emoji: "🦩", idle: true },
];

/** Monday + Tuesday, banked before the demo's Wednesday. One per playing bot, shuffled. */
export const BANKED_POINTS = [120, 110, 95, 85, 70, 60, 45, 30, 20, 5];

/** Wednesday's sealed scores, already doubled. A judge on about 150 lands mid-pack. */
export const WEDNESDAY_POINTS = [190, 175, 160, 145, 130, 115, 100, 85, 70, 60];

/** Answers for specific questions, so the demo's Who Said It reads naturally. */
const ANSWERS_BY_QUESTION: Record<string, string[]> = {
  "What's the last thing that made you laugh out loud?": [
    "My dad using voice-to-text at full volume in a restaurant",
    "A goose chasing a jogger around the park",
    "Autocorrect turning 'on my way' into 'on my waffle'",
    "My roommate's sourdough starter has a name and a birthday",
    "Someone walking into a glass door with total confidence",
    "The group chat renaming me 'Captain Late'",
    "A four-minute voice note from my grandma that was all pocket noise",
    "A dog at the beach stealing an entire baguette",
    "The self-checkout calling my own hand an unexpected item",
    "A wedding speech that accidentally roasted the groom",
  ],
};

/** For any other question: short, absurd and still a little bit telling. */
const GENERIC_ANSWERS = [
  "A cactus named Kevin that I have kept alive for six years",
  "Pineapple on pizza, and I will not apologise",
  "Three alarms and I still slept through all of them",
  "Karaoke, but only Shania Twain",
  "A label maker. I label everything now",
  "Cereal for dinner at least twice a week",
  "My neighbour's cat, who thinks it lives with me",
  "Crocs with socks. Comfort wins",
  "Building a fort out of sofa cushions as an adult",
  "Reading the last page of a book first",
];

export function cannedAnswers(question: string | undefined): string[] {
  return (question && ANSWERS_BY_QUESTION[question]) || GENERIC_ANSWERS;
}
