import { describe, expect, it } from "vitest";
import {
  askedWhen,
  buildTally,
  matchUpBonus,
  podiumSize,
  podiumWeights,
  scoreMatchUp,
  scoreMostLikely,
  scoreReadRoom,
  shareScore,
  sharePercent,
} from "./friends";

const fixed = () => 0; // a predictable shuffle

describe("buildTally", () => {
  it("counts votes, most first, ignoring people who left", () => {
    const tally = buildTally(["b", "a", "b", "gone", "c", "b", "a", undefined], ["a", "b", "c"], fixed, 0);
    expect(tally).toEqual([
      { memberId: "b", votes: 3 },
      { memberId: "a", votes: 2 },
      { memberId: "c", votes: 1 },
    ]);
  });

  it("pads with members who got no votes up to eight", () => {
    const members = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const tally = buildTally(["a", "a", "b"], members, fixed);
    expect(tally).toHaveLength(8);
    expect(tally.slice(0, 2)).toEqual([
      { memberId: "a", votes: 2 },
      { memberId: "b", votes: 1 },
    ]);
    expect(tally.slice(2).every((t) => t.votes === 0)).toBe(true);
    expect(new Set(tally.map((t) => t.memberId)).size).toBe(8);
  });

  it("still pads when six or seven got votes, so the list isn't just the voted", () => {
    const members = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const tally = buildTally(["a", "b", "c", "d", "e", "f", "g"], members, fixed);
    expect(tally).toHaveLength(8);
    expect(tally[7].votes).toBe(0);
  });

  it("keeps everyone who got votes when more than eight did; the game shows the top eight", () => {
    const members = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    expect(buildTally(members, members, fixed)).toHaveLength(9);
  });

  it("can't pad past the group", () => {
    expect(buildTally(["a", "b", "a"], ["a", "b", "c", "d"], fixed)).toHaveLength(4);
  });
});

describe("podium", () => {
  it("has three places, fewer when fewer people got votes", () => {
    expect(podiumSize([{ memberId: "a", votes: 3 }, { memberId: "b", votes: 1 }, { memberId: "c", votes: 1 }])).toBe(3);
    expect(podiumSize([{ memberId: "a", votes: 3 }, { memberId: "b", votes: 0 }])).toBe(1);
  });

  it("weights 100/50/50, rescaled to still total 200", () => {
    expect(podiumWeights(3)).toEqual([100, 50, 50]);
    const two = podiumWeights(2);
    expect(two[0] + two[1]).toBeCloseTo(200);
    expect(two[0]).toBeCloseTo(133.33, 1);
    expect(podiumWeights(1)).toEqual([200]);
  });
});

describe("scoreMostLikely", () => {
  const tally = [
    { memberId: "a", votes: 4 },
    { memberId: "b", votes: 2 },
    { memberId: "c", votes: 1 },
    { memberId: "d", votes: 0 },
  ];

  it("scores a perfect podium 200", () => {
    expect(scoreMostLikely(tally, ["a", "b", "c"])).toEqual({
      places: 3,
      right: [true, true, true],
      correct: 3,
      points: 200,
    });
  });

  it("scores each place on its own", () => {
    expect(scoreMostLikely(tally, ["a", "c", "b"]).points).toBe(100);
    expect(scoreMostLikely(tally, ["b", "a", "c"]).points).toBe(50);
    expect(scoreMostLikely(tally, ["d", "a", "b"]).points).toBe(0);
  });

  it("forgives ties: either order of tied people is right", () => {
    const tied = [
      { memberId: "a", votes: 3 },
      { memberId: "b", votes: 3 },
      { memberId: "c", votes: 1 },
      { memberId: "d", votes: 1 },
    ];
    expect(scoreMostLikely(tied, ["b", "a", "c"]).points).toBe(200);
    expect(scoreMostLikely(tied, ["a", "b", "d"]).points).toBe(200);
    expect(scoreMostLikely(tied, ["c", "b", "a"]).right).toEqual([false, true, false]);
  });

  it("rescales a short podium", () => {
    const two = [
      { memberId: "a", votes: 2 },
      { memberId: "b", votes: 1 },
      { memberId: "c", votes: 0 },
    ];
    expect(scoreMostLikely(two, ["a", "b"]).points).toBe(200);
    expect(scoreMostLikely(two, ["a", "c"]).points).toBe(133);
    expect(scoreMostLikely(two, ["b", "b"]).points).toBe(0);
    expect(scoreMostLikely([{ memberId: "a", votes: 3 }], ["a"]).points).toBe(200);
  });

  it("does not care about the input order of the tally", () => {
    expect(scoreMostLikely([...tally].reverse(), ["a", "b", "c"]).points).toBe(200);
  });
});

describe("Read the Room", () => {
  it("rounds the share to a whole percent", () => {
    expect(sharePercent([0, 0, 1])).toBe(67);
    expect(sharePercent([1, 1, 1])).toBe(0);
    expect(sharePercent([0, 1])).toBe(50);
    expect(sharePercent([])).toBe(0);
  });

  it("takes four points off per percentage point", () => {
    expect(shareScore(65, 67)).toBe(92);
    expect(shareScore(50, 50)).toBe(100);
    expect(shareScore(0, 30)).toBe(0);
    expect(shareScore(100, 70)).toBe(0);
  });

  it("adds the friends part", () => {
    expect(scoreReadRoom(65, 67, 3, 4)).toEqual({ share: 92, friends: 75, points: 167 });
    expect(scoreReadRoom(50, 50, 4, 4).points).toBe(200);
    expect(scoreReadRoom(0, 100, 0, 3).points).toBe(0);
    expect(scoreReadRoom(30, 33, 1, 3)).toEqual({ share: 88, friends: 33, points: 121 });
  });
});

describe("Match-Up", () => {
  it("keeps the full speed bonus for ten seconds, then loses a point a second", () => {
    expect(matchUpBonus(4_000)).toBe(50);
    expect(matchUpBonus(10_000)).toBe(50);
    expect(matchUpBonus(10_900)).toBe(50);
    expect(matchUpBonus(11_000)).toBe(49);
    expect(matchUpBonus(30_500)).toBe(30);
    expect(matchUpBonus(60_000)).toBe(0);
    expect(matchUpBonus(300_000)).toBe(0);
  });

  it("pays 150 for the matches and the bonus only for a perfect set", () => {
    expect(scoreMatchUp(4, 4, 8_000)).toEqual({ base: 150, bonus: 50, points: 200 });
    expect(scoreMatchUp(4, 4, 25_000)).toEqual({ base: 150, bonus: 35, points: 185 });
    expect(scoreMatchUp(3, 4, 5_000)).toEqual({ base: 113, bonus: 0, points: 113 });
    expect(scoreMatchUp(2, 3, 5_000)).toEqual({ base: 100, bonus: 0, points: 100 });
    expect(scoreMatchUp(0, 4, 5_000).points).toBe(0);
  });
});

describe("askedWhen", () => {
  it("names the day the question was asked", () => {
    expect(askedWhen({ week: 2, day: 1 }, { week: 2, day: 2 })).toBe("Yesterday");
    expect(askedWhen({ week: 2, day: 0 }, { week: 2, day: 3 })).toBe("On Monday");
    expect(askedWhen({ week: 1, day: 5 }, { week: 2, day: 0 })).toBe("On Saturday");
    expect(askedWhen({ week: 1, day: 3 }, { week: 2, day: 1 })).toBe("Last Thursday");
  });
});
