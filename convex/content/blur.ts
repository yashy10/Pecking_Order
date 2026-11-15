// Owned by the lead. Image key → accepted answers. answers[0] is shown after a round.
// Keys are opaque on purpose; the photos live in assets/blur and src/utils/blur-images.ts.
//
// PLACEHOLDERS: these are rendered emoji. Replace them with your own photos of
// everyday objects (PLAN §9) and update the answers to match.

export type BlurImage = { key: string; answers: string[] };

export const BLUR_IMAGES: BlurImage[] = [
  { key: "img_01", answers: ["banana", "bananas"] },
  {
    key: "img_02",
    answers: ["coffee", "coffee cup", "coffee mug", "mug", "cup", "tea", "hot drink", "latte"],
  },
  { key: "img_03", answers: ["key", "keys", "door key", "house key"] },
  {
    key: "img_04",
    answers: ["sneaker", "shoe", "trainer", "running shoe", "trainers", "sneakers", "runner"],
  },
  { key: "img_05", answers: ["backpack", "rucksack", "school bag", "bag", "bookbag", "knapsack"] },
  { key: "img_06", answers: ["headphones", "headphone", "headset", "earphones", "cans"] },
  { key: "img_07", answers: ["pizza", "pizza slice", "slice of pizza", "slice"] },
  { key: "img_08", answers: ["cactus", "cacti", "succulent", "plant"] },
];
