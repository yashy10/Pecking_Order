// Owned by the crossword track. Preset puzzles; the solutions never leave the server.
// Each entry needs a unique, opaque `key` (stored on the game as puzzleKey).
//
// 5×5 minis. `rows` holds the answer letters, "#" for a black square. Black squares are
// symmetric under a half turn and every entry is 3+ letters. Numbers follow the usual
// rule (a square is numbered when an across or down entry starts there), and every
// entry has a clue (both checked in convex/lib/crossword.test.ts). Week 1 plays index 0.

export type CrosswordClue = { num: number; clue: string };
export type CrosswordPuzzle = {
  key: string;
  rows: string[];
  across: CrosswordClue[];
  down: CrosswordClue[];
};

export const CROSSWORD_PUZZLES: CrosswordPuzzle[] = [
  {
    key: "cw-01",
    rows: ["##CAB", "#CLUE", "ALONE", "WANT#", "EWE##"],
    across: [
      { num: 1, clue: "Yellow ride from the curb" },
      { num: 4, clue: "What you're reading right now" },
      { num: 5, clue: "Home ___ (holiday movie with booby traps)" },
      { num: 6, clue: "Wish for" },
      { num: 7, clue: "Mother of a lamb" },
    ],
    down: [
      { num: 1, clue: "Dolly the sheep, famously" },
      { num: 2, clue: "Mom's sister" },
      { num: 3, clue: "Spelling contest, or a buzzy insect" },
      { num: 4, clue: "Crab's pincher" },
      { num: 5, clue: "Jaw-dropping feeling" },
    ],
  },
  {
    key: "cw-02",
    rows: ["#GRAB", "#RAGE", "LOVED", "EVEN#", "TENT#"],
    across: [
      { num: 1, clue: "Snatch" },
      { num: 5, clue: "Road ___ (traffic fury)" },
      { num: 6, clue: "Adored" },
      { num: 7, clue: "Like 2, 4 and 6" },
      { num: 8, clue: "Campsite shelter" },
    ],
    down: [
      { num: 1, clue: "Small orchard" },
      { num: 2, clue: "Poe's \"Nevermore\" bird" },
      { num: 3, clue: "Secret ___ (spy)" },
      { num: 4, clue: "Where you hit snooze" },
      { num: 6, clue: "Allow" },
    ],
  },
  {
    key: "cw-03",
    rows: ["##TEA", "#TAXI", "SOLID", "KNOT#", "YEN##"],
    across: [
      { num: 1, clue: "Earl Grey, for one" },
      { num: 4, clue: "Airport ride with a meter" },
      { num: 5, clue: "Not liquid or gas" },
      { num: 6, clue: "Sailor's tie" },
      { num: 7, clue: "Strong craving, or Japanese money" },
    ],
    down: [
      { num: 1, clue: "Eagle's claw" },
      { num: 2, clue: "Way out" },
      { num: 3, clue: "First ___ kit" },
      { num: 4, clue: "Ring___ (what your phone plays)" },
      { num: 5, clue: "Where the clouds are" },
    ],
  },
  {
    key: "cw-04",
    rows: ["HEY##", "IDEA#", "TIARA", "#TRIM", "##NAP"],
    across: [
      { num: 1, clue: "Casual hello" },
      { num: 4, clue: "Light bulb moment" },
      { num: 6, clue: "Pageant winner's crown" },
      { num: 8, clue: "\"Just a ___, please\" (barber request)" },
      { num: 9, clue: "Quick snooze" },
    ],
    down: [
      { num: 1, clue: "Chart-topping song" },
      { num: 2, clue: "Fix a typo, say" },
      { num: 3, clue: "Long (for)" },
      { num: 5, clue: "Opera solo" },
      { num: 7, clue: "Guitarist's speaker, for short" },
    ],
  },
  {
    key: "cw-05",
    rows: ["SAP##", "OMEN#", "WIDOW", "#DATE", "##LED"],
    across: [
      { num: 1, clue: "Sticky tree stuff" },
      { num: 4, clue: "Sign of things to come" },
      { num: 6, clue: "Black ___ (spider to avoid)" },
      { num: 8, clue: "Calendar square, or a night out" },
      { num: 9, clue: "Was in charge" },
    ],
    down: [
      { num: 1, clue: "Plant, as seeds" },
      { num: 2, clue: "In the middle of" },
      { num: 3, clue: "Bike part you push" },
      { num: 5, clue: "Sticky ___ (fridge reminder)" },
      { num: 7, clue: "Tied the knot" },
    ],
  },
  {
    key: "cw-06",
    rows: ["#DASH", "MACHO", "UNTIL", "SCONE", "HERE#"],
    across: [
      { num: 1, clue: "100-meter race" },
      { num: 5, clue: "Tough-guy, to a fault" },
      { num: 6, clue: "Up to the time that" },
      { num: 7, clue: "Teatime pastry with jam and cream" },
      { num: 8, clue: "\"Present!\"" },
    ],
    down: [
      { num: 1, clue: "Prom activity" },
      { num: 2, clue: "Oscar hopeful" },
      { num: 3, clue: "\"Rise and ___!\"" },
      { num: 4, clue: "Golf course target" },
      { num: 5, clue: "Oatmeal gone wrong" },
    ],
  },
  {
    key: "cw-07",
    rows: ["#SPIN", "SHARE", "CANOE", "AMEND", "RELY#"],
    across: [
      { num: 1, clue: "Twirl" },
      { num: 5, clue: "Split with friends" },
      { num: 6, clue: "Paddle-powered boat" },
      { num: 7, clue: "Change, as a law" },
      { num: 8, clue: "Count (on)" },
    ],
    down: [
      { num: 1, clue: "\"What a ___!\"" },
      { num: 2, clue: "Group of judges" },
      { num: 3, clue: "A fire station burning down, say" },
      { num: 4, clue: "Can't do without" },
      { num: 5, clue: "Mark left by a cut" },
    ],
  },
  {
    key: "cw-08",
    rows: ["#GAP#", "FRUIT", "LADLE", "UNION", "#DOT#"],
    across: [
      { num: 1, clue: "Space between two front teeth, maybe" },
      { num: 4, clue: "Apple or banana" },
      { num: 6, clue: "Soup scoop" },
      { num: 7, clue: "Labor group" },
      { num: 8, clue: "Period, in an email address" },
    ],
    down: [
      { num: 1, clue: "Piano type, or a thousand bucks" },
      { num: 2, clue: "What you hear, not see" },
      { num: 3, clue: "Person in the cockpit" },
      { num: 4, clue: "Winter bug" },
      { num: 5, clue: "Perfect score, often" },
    ],
  },
];
