# Pecking Order — Implementation Plan

Written Sunday Nov 15, 11:15 AM; updated 11:45 with your decisions. Build window: now → **4:30 PM feature freeze** → **6:00 PM submit**.

**Decided:** device-token sign-in · Capy builds the four tracks · OpenAI for the rewrite · free Apple ID · Whop is the one sponsor extra · solo · Android is a first-class target, tested on your phone and shipped as an installable build. The Expo app is already scaffolded at the repo root (slug `Pecking_order`).

Sources: the two PDFs in this repo, plus checks run this morning on this laptop and against current package releases and docs. "Lead" below means you, working with Claude Code in this terminal. "Tracks A–D" are the four Capy agents.

---

## 1. The short version

**What must work on stage (P0):**

1. Join a group from a QR code or web link with a name and an emoji, in under 10 seconds.
2. Play Blur, timed and checked on the server.
3. Scores stay sealed until the day's reveal. The reveal lands on every phone at once.
4. Nearest-rivals view: no ranks, no counts, fog at the edges.
5. Ghost and Spy, with the effect visible live on a rival's screen.
6. Sunday finale: the full board and a champion.
7. A demo panel and a seeded group of bots that drive all of the above in three minutes.
8. The same code running on iPhone and Android, with an installable Android build.

**Critical path:**

| # | When | What | Who |
|---|---|---|---|
| 1 | 11:45–12:25 | Phase 0: a walking skeleton that runs end to end on iPhone, Android and at a public web URL, with every file and function signature already in place | Lead |
| 2 | 12:25–1:45 | Four tracks fill in their own files in parallel | Capy A–D |
| 3 | 12:25–1:45 | Demo panel, bots, seed data, Blur photos, first Android build | Lead |
| 4 | 1:45–2:25 | Merge, fix the seams, run the whole loop on both phones and a browser | Lead |
| 5 | 2:25–4:30 | Banner, AI rewrite, Whop Season Pass, polish | Lead |
| 6 | 4:30–6:00 | Freeze, seed, rehearse three times, record backup video, submit | You |

The reason Phase 0 is so thorough: once every file exists with its final signature, the four tracks never touch the same file, never add a dependency, and can each be tested alone.

---

## 2. What changed from the PDFs, and why

| Topic | PDFs say | This plan | Why |
|---|---|---|---|
| Sign-in | Convex Auth (anonymous) | **Device token**: a random secret kept on the device and sent with every call | `@convex-dev/auth` 2.0.0 was published Nov 12 and does not export anonymous sign-in (the source marks it "not public until ready"). The older 0.0.98 line still has it but needs JWT keys, HTTP routes and an auth config. A token is about 30 lines, has nothing to misconfigure, and makes bots and the demo panel trivial. You confirmed this. Pinning `@convex-dev/auth@0.0.98` is the route back to Convex Auth after the hackathon. |
| iPhone build | Local dev build by lunch (`expo run:ios`) | **Stay on Expo Go all day**, on both phones. One cloud build, for the installable Android app | Expo Go 58.0.5 on the App Store (Oct 22) runs SDK 58, so the latest template works on a phone today. This laptop is not set up for local iOS builds: `xcode-select` points at CommandLineTools, CocoaPods is missing, and there is 25 GB of free disk. The one thing a dev build would add is push, and a free Apple ID cannot sign for push. |
| Push | expo-notifications + Expo push service | **In-app banner** on every platform. A local notification on the phone is a stretch item | Remote push needs the paid Apple Developer Program, and Expo Go has not supported remote push since SDK 53. You confirmed a free Apple ID, so this is settled. |
| Standings updates | "Updating in real time" and "results reveal at 9 pm" | **Sealed until the reveal**, then every device updates together | The two statements conflict, and live updates leak each person's score. |
| Rival notifications | "Priya just took first. Sam is in last." | Relative only: "Priya just passed you" | Stating ranks gives away the hidden board, and "in last" breaks your own "never worst in the group" rule. |
| Top and bottom of the board | Not covered | **Fog slot** whenever no visible rival is above or below you | Otherwise first place always knows they are first. |
| How powers are earned | Streaks and duel wins | Welcome kit on joining, 3-day streak, best score of the day | Duels are not in the V1 scope, so something else has to hand out powers. |
| Web export | `expo export -p web` | Same, with `web.output: "single"` | SDK 58 defaults to `"server"`. This app is a client-only SPA talking to Convex. |
| Start time | 10:00 | 11:45 | About 100 minutes less. The cut order is in §3. |
| AI rewrite | "One LLM" | OpenAI, through the `openai` SDK in a Convex action | You have an OpenAI key. |
| Android | "One codebase covers iOS, Android and the browser" | Checked on your Android phone at every gate, and shipped as an installable build | Expo already builds both from the same code, so this is a testing and delivery task, not a rewrite. See §6.9. |
| Sponsor extras | Supermemory, Revyl, Whop | Whop only | Your call. The other two drop to the bottom of the list. |

---

## 3. Scope and cut order

| Tier | Features |
|---|---|
| **P0 — the demo spine** | Web join by link/QR · Blur · sealed scores and day reveal · nearest rivals with fog · Ghost and Spy · Sunday finale · demo panel, bots, seed · public web URL · iPhone and Android in Expo Go · installable Android build |
| **P1 — makes it a product** | Daily prompt and Who Said It · Wildcard Wednesday ×2 · AI rewrite of answers · streaks and earned powers · in-app banner ("Priya just passed you") · **Whop Season Pass**, the one sponsor prize you are going for |
| **P2 — only if everything above is finished** | Supermemory "squawk" line · Revyl test run · local notifications · cron-driven clock · shareable recap card · "Add to Home Screen" for the web app |
| **Slide only** | Duels, Fog/Shield/Steal, duo streaks, avatars and victory scenes, Plans, spin wheel, Training Camp, catch-up bonus, remote push |

**If you fall behind, cut in this order:** everything in P2 → the Whop webhook (keep the Season Pass screen and a checkout link) → AI rewrite (raw text still works) → Who Said It (goes on a slide; the week becomes Blur-only). Nothing in P0 is cuttable.

**You are solo.** The plan never needs two people at once. While Capy builds, you do the checklist in §5, then drive the lead track with Claude Code. Slides and the backup video happen after the 4:30 freeze.

---

## 4. Schedule and gates

| Time | Milestone |
|---|---|
| 11:45 | Phase 0 continues from the scaffold. You work through §5 while Claude Code writes the skeleton |
| **12:25 — Gate 1** | Skeleton runs on the iPhone and the Android phone in Expo Go, and the join link opens on a phone over cellular. Push `main`. Start tracks A–D |
| 12:25–1:45 | Tracks build. Lead builds the demo panel, bots, seed and content, and starts the first Android build. Lunch |
| **1:45 — Gate 1.5** | Any track without a mergeable PR is taken over by Claude Code from its brief in §8 |
| 1:45–2:25 | Merge A → B → D → C. Fix seams |
| **2:25 — Gate 2** | Full loop on the iPhone, the Android phone and a browser: join, play, seal, reveal, rivals, Ghost, finale |
| 2:25–3:30 | Banner, AI rewrite, Whop Season Pass, EAS Update for the stage phones |
| **2:50 — Gate 2.5** | Who Said It is working, or it is cut to a slide |
| 3:30–4:15 | Polish pass on both phones |
| **3:45 — Gate 3** | Final web deploy and the final Android build started. Anything flaky is hidden |
| 4:30 | Feature freeze. Stop `convex dev` so nothing changes under the demo |
| 4:30–5:45 | Seed the demo group, rehearse three times, record the backup video, write the submission |
| 6:00 | Submit |

---

## 5. Your checklist (do these during Phase 0)

These need a human, a browser or a phone.

1. **Expo account:** sign in on the command line with the account that should own the project: `npx eas-cli@latest logout`, then `npx eas-cli@latest login`. The plugin sign-in is separate and does not cover this. Until it is done the project cannot be registered on expo.dev, deployed to a web URL or built for Android. Everything local still works.
2. **Both phones:** on the iPhone, update Expo Go to 58.x from the App Store. On the Android phone, install Expo Go from the Play Store or expo.dev/go. Sign in to both with that same Expo account. Expo Go 58 only runs SDK 58 projects, which this is.
3. **Convex:** in its own terminal tab run `npx convex dev`, log in, create a project named `pecking-order`, choose a cloud dev deployment. Leave it running all day. (This laptop has no Convex login yet.)
4. **Keys**, set on the Convex deployment once step 3 is done:
   ```bash
   npx convex env set DEMO_KEY <a few random words>
   npx convex env set OPENAI_API_KEY <key>      # Who Said It rewrite; the game works without it
   ```
5. **Blur photos:** take 8 to 12 photos of single everyday objects on a plain background (mug, keys, shoe, banana, backpack, headphones …) and AirDrop them to the laptop. Your own photos mean no licensing question.
6. **Capy:** connect `yashy10/Pecking_Order` and point its setup at the `main` branch.
7. **Whop:** in the Whop sandbox, create a "Season Pass" product and note its checkout link and an API key.
8. *Optional:* `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` gives you the iOS Simulator. The plan does not need it.

---

## 6. Architecture

### 6.1 Hidden-board rules

The server is the only place that knows the full order. Every query obeys these rules. They are hard requirements, not style.

1. **No rank, ever, before the finale.** No "4th", no "4th of 13", no count of people above or below you.
2. **Your points go only to you.** For anyone else the server sends a gap, and only for your visible neighbours.
3. **Today's score is sealed.** `plays.points` is returned only to the player who earned it and is added to `members.weekPoints` only at the reveal.
4. **Three things never leave the server:** `users.token`, Blur's accepted answers, and who wrote a Who Said It quote. (The answer and the author are returned to a player only after that player has finished.)
5. **Full standings reach clients only through `weekResults`**, written at the finale.
6. **Every public function declares a `returns` validator.** Convex rejects extra fields, so a leak fails loudly in development instead of shipping.

**Who you see.** Sort members by `weekPoints` descending, ties broken by who joined first. Remove anyone who has an active Ghost, except yourself. Your slots are the one person directly above and the one directly below in what remains.

- **Fog:** when there is nobody visible in a direction, the slot is fog (`???`). First place sees fog above. So does someone whose only higher rivals are ghosts. They cannot tell which, and neither can last place looking down.
- **Ghost:** you vanish from everyone else's board for the rest of the day. Your neighbour sees the next person up instead, with the gap to that person. Your own board is unchanged.
- **Spy:** you get three slots above instead of one for the rest of the day. Ghosts stay hidden from Spy.
- **Gaps:** "12 ahead", "30 behind", or "tied".
- **Movement:** after a reveal, a neighbour who crossed you is tagged `passedYou` or `youPassed`.

**Small groups.** With three or four people your two neighbours are most of the board. The demo group has ten or more bots so judges have something hidden from them. In the pitch: the hidden board switches on at five members.

### 6.2 The clock

Time is a per-group state machine, never the wall clock. That is what lets the demo panel run a week in three minutes, and it is also how the real product runs: a cron calls the same function.

```
(Mon, open) → (Mon, revealed) → (Tue, open) → … → (Sat, revealed)
            → (Sun, open: no game, "finale tonight") → (Sun, finale) → next week (Mon, open)
```

`groups` holds `week` (starts at 1), `day` (0 = Mon … 6 = Sun) and `phase` (`open`, `revealed`, `finale`). `clock.advance` moves a group exactly one step:

| Step | What it does |
|---|---|
| `open → revealed` (reveal the day) | For each member: `prevWeekPoints = weekPoints`, add today's sealed points and the prompt bonus, set `lastDelta`. Update streaks. Hand out earned powers. Write "passed you" events for neighbours. Stamp the game `revealedAt`. Schedule the AI rewrite of today's answers. |
| `revealed → next day open` (drop the day) | `day + 1`. Create today's game and today's prompt. |
| `(Sun, open) → (Sun, finale)` | Write `weekResults` with the full standings. |
| `(Sun, finale) → next week` | `week + 1`, `day = 0`, zero everyone's weekly points. Streaks and powers carry over. Drop Monday. |

**Which game each day.** Sunday has no game. Wednesday has `multiplier: 2`. Odd days (Tue, Thu, Sat) try Who Said It, built from the previous day's prompt answers, and fall back to Blur when fewer than three members answered. Even days are Blur. Every game day also gets a prompt, so tomorrow has material.

A new group starts at `(Mon, open)` with a Blur game already created, so the first person in has something to play immediately.

**Real mode (P2).** Groups with `autoClock: true` carry a `nextTickAt`. A cron runs `clock.tick` every minute and advances any group that is due. Demo groups have `autoClock: false` and move only when the demo panel says so. Aligning to the real calendar and to each group's timezone is post-hackathon.

### 6.3 Scoring and powers

| Thing | Rule |
|---|---|
| Blur | Image sharpens over 20 s. Correct guess scores `max(10, 100 − floor(elapsedMs / 200))`, minus 5 per wrong guess, never below 10. No correct guess by 30 s scores 0. Elapsed time is measured on the server. |
| Who Said It | Up to 4 quotes, never your own. `round(100 × correct / asked)`. |
| Multiplier | Applied when the play is finished: `points = base × game.multiplier`. |
| Prompt bonus | +10 at the reveal for answering today's prompt. Not multiplied. |
| Streak | +1 at each reveal if you played that day. One missed day a week is forgiven; a second resets it to 0. |
| Welcome kit | 1 Ghost and 1 Spy when you join, so a judge can use a power in their first minute. |
| Earned powers | Reaching a streak of 3, 6, 9 … gives a Spy. Best score of the day gives a Ghost (ties share). Both awarded at the reveal. |
| Using a power | At most one of each per day. Lasts until the next day drops. Not usable during the finale. |

Both games finish through one shared helper, `finishPlay`, so sealing and multipliers cannot drift apart.

### 6.4 Identity

- On first launch the app generates a random token (`expo-crypto`) and stores it: `expo-secure-store` on native, `localStorage` on web.
- Every public function takes `token: v.string()` as its first argument and calls `requireUser(ctx, token)` or `requireMember(ctx, token, groupId)` from `convex/lib/auth.ts`.
- `members` rows carry a copy of `name` and `emoji`. **Only `convex/lib/auth.ts` and `convex/users.ts` read the `users` table.** Everything else works from `members`, which holds no secret, so a token cannot leak through a careless spread.
- Bots are ordinary users with `isBot: true` and a token nobody holds.
- Demo functions take a `demoKey` and compare it to the `DEMO_KEY` environment variable. They are public API like everything else, so without the key a curious judge could jump the group to Sunday.

### 6.5 Files and ownership

One owner per file. "Frozen" files are written in Phase 0 and changed only by the lead.

```
convex/
  schema.ts                         frozen
  lib/auth.ts                       frozen   requireUser, requireMember
  lib/constants.ts                  frozen   numbers from §6.3
  lib/scoring.ts                    frozen   finishPlay
  lib/day.ts                        frozen   gameFor, promptFor, membersOf, isOpenGame, activePowers, byStanding, newMemberDoc
  lib/standings.ts  (+ .test.ts)    D        neighbours()
  lib/match.ts      (+ .test.ts)    B        matchAnswer()
  content/blur.ts                   lead     image keys and accepted answers
  content/prompts.ts                lead     30 daily questions
  users.ts  groups.ts  today.ts     A
  blur.ts                           B
  prompts.ts  whoSaidIt.ts  ai.ts   C
  rivals.ts  powers.ts  weeks.ts    D
  clock.ts  crons.ts  demo.ts  events.ts  whop.ts  http.ts  memory.ts    lead
src/
  app/                              frozen   thin route files only
    _layout.tsx                              Convex + identity providers, Stack
    index.tsx                                → screens/home
    join/[code].tsx                          → screens/join
    g/[groupId]/index.tsx                    → screens/group-hub
    g/[groupId]/play.tsx                     → blur-game or who-said-it-game, by today's type
    g/[groupId]/invite.tsx                   → screens/invite (modal)
    demo.tsx                                 → screens/demo-panel
    pass.tsx                                 → screens/pass
  screens/
    home.tsx  join.tsx  invite.tsx  group-hub.tsx      A
    blur-game.tsx                                      B
    who-said-it-game.tsx                               C
    finale.tsx                                         D
    demo-panel.tsx  pass.tsx                           lead
  components/
    ui/  screen, txt, button, card, field, avatar, pill, loading   frozen
    profile-form.tsx                                   A
    today-card.tsx                                     A
    prompt-card.tsx                                    C
    rivals-panel.tsx  powers-tray.tsx                  D
    banner.tsx                                         lead
  hooks/use-identity.tsx            frozen
  utils/  storage.ts, haptics.ts, convex.ts, errors.ts, links.ts   frozen
  utils/blur-images.ts              lead     image key → require()
  theme.ts  constants.ts            frozen
assets/blur/img_01.jpg …            lead
```

The hub screen is a fixed stack of slots, so tracks replace their own component and never edit each other's:

```
<Header />                              A
phase === "finale" ? <Finale />         D
: <TodayCard />                         A
  <RivalsPanel />                       D
  <PowersTray />                        D
  <PromptCard />                        C
```

**Rules that keep four branches mergeable:**

- Track modules import only from `convex/lib` and `convex/content`, never from each other.
- No track adds a dependency, a route, or a new file under `convex/`. Phase 0 pre-creates all of them. A needed change goes in the PR description for the lead.
- `convex/_generated` is committed. If it conflicts on merge, take either side and run `npx convex codegen`.

### 6.6 Schema

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const gameTypeV = v.union(v.literal("blur"), v.literal("whoSaidIt"));
export const phaseV = v.union(v.literal("open"), v.literal("revealed"), v.literal("finale"));
export const powerTypeV = v.union(v.literal("ghost"), v.literal("spy"));

export default defineSchema({
  users: defineTable({
    token: v.string(), // device secret. Never returned by any function.
    name: v.string(),
    emoji: v.string(),
    isBot: v.boolean(),
    hasPass: v.boolean(),
  }).index("by_token", ["token"]),

  groups: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    week: v.number(), // starts at 1
    day: v.number(), // 0 = Mon … 6 = Sun
    phase: phaseV,
    autoClock: v.boolean(),
    nextTickAt: v.optional(v.number()),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_autoClock_and_nextTickAt", ["autoClock", "nextTickAt"]),

  members: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    name: v.string(), // copied from users
    emoji: v.string(),
    isBot: v.boolean(),
    hasPass: v.boolean(), // copied from users; cosmetic only
    weekPoints: v.number(), // banked points only; changes at the reveal
    prevWeekPoints: v.number(), // value before the latest reveal
    lastDelta: v.number(), // points banked at the latest reveal
    streak: v.number(),
    streakSaveWeek: v.optional(v.number()), // week in which the forgiven day was used
    ghost: v.number(), // inventory
    spy: v.number(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_userId", ["userId"])
    .index("by_groupId_and_userId", ["groupId", "userId"]),

  games: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    day: v.number(),
    type: gameTypeV,
    multiplier: v.number(),
    // Server-only payloads. Never return these objects from a public function.
    blur: v.optional(
      v.object({ imageKey: v.string(), answers: v.array(v.string()) }), // answers[0] is shown after finishing
    ),
    whoSaidIt: v.optional(
      v.object({
        quotes: v.array(
          v.object({
            answerId: v.id("answers"),
            authorId: v.id("members"),
            optionIds: v.array(v.id("members")),
          }),
        ),
      }),
    ),
    revealedAt: v.optional(v.number()),
  }).index("by_groupId_and_week_and_day", ["groupId", "week", "day"]),

  plays: defineTable({
    gameId: v.id("games"),
    groupId: v.id("groups"),
    memberId: v.id("members"),
    startedAt: v.number(), // server time
    finishedAt: v.optional(v.number()),
    wrongGuesses: v.number(),
    points: v.optional(v.number()), // set on finish; sealed until the reveal
    detail: v.optional(v.string()), // e.g. "3 of 4"
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_and_memberId", ["gameId", "memberId"]),

  prompts: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    day: v.number(),
    question: v.string(),
  }).index("by_groupId_and_week_and_day", ["groupId", "week", "day"]),

  answers: defineTable({
    promptId: v.id("prompts"),
    groupId: v.id("groups"),
    memberId: v.id("members"),
    text: v.string(),
    rewritten: v.optional(v.string()), // filled in by the AI action
  })
    .index("by_promptId", ["promptId"])
    .index("by_promptId_and_memberId", ["promptId", "memberId"]),

  powerUses: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    day: v.number(),
    memberId: v.id("members"),
    type: powerTypeV,
  }).index("by_groupId_and_week_and_day", ["groupId", "week", "day"]),

  events: defineTable({
    groupId: v.id("groups"),
    memberId: v.id("members"), // who this line is for
    week: v.number(),
    day: v.number(),
    kind: v.union(
      v.literal("passedYou"),
      v.literal("youPassed"),
      v.literal("power"),
      v.literal("squawk"),
      v.literal("champion"),
    ),
    text: v.string(),
  }).index("by_memberId", ["memberId"]),

  weekResults: defineTable({
    groupId: v.id("groups"),
    week: v.number(),
    standings: v.array(
      v.object({
        memberId: v.id("members"),
        name: v.string(),
        emoji: v.string(),
        points: v.number(),
        hasPass: v.boolean(),
      }),
    ),
  }).index("by_groupId_and_week", ["groupId", "week"]),
});
```

### 6.7 API contract

Phase 0 creates every function below with this exact signature and a placeholder body. Tracks fill in bodies and do not change shapes. `Id` means a Convex document id.

**The `returns` validators in `convex/` are the contract.** Where this table and the code differ, the code wins. As built in Phase 0:

- `today.get`, `rivals.view` and `whoSaidIt.get` return `null` when the caller is not a member, so a cleared browser shows "not in this group" instead of crashing. `today.get` also returns `myMemberId`.
- `blur.start` returns `elapsedMs` (server time since the round began) instead of `startedAt`, plus `finished`, `points` and `answer` (the answer only once finished). The client anchors its animation to `elapsedMs`, so phone clocks never matter.
- Already working, not placeholders: users, groups, today, Blur (exact matching), prompts.answer, weeks.finale, events.mine, clock, demo.advance. Still placeholders: `neighbours()` (all fog), powers.use, Who Said It, the AI rewrite, the Season Pass.

```
— users.ts (A) —
users.me            query     { token }                         → { userId, name, emoji, hasPass } | null
users.saveProfile   mutation  { token, name, emoji }            → null        creates the user on first call; updates copies on memberships

— groups.ts (A) —
groups.preview      query     { code }                          → { name, memberCount, emojis: string[] } | null
groups.create       mutation  { token, name }                   → { groupId, inviteCode }
groups.join         mutation  { token, code }                   → { groupId }  idempotent; adds the welcome kit
groups.mine         query     { token }                         → { groupId, name, dayLabel, phase }[]

— today.ts (A) —
today.get           query     { token, groupId }                → {
    group:  { name, inviteCode, week, day, dayLabel, phase, memberCount, nextTickAt: number | null },
    game:   { gameId, type: "blur" | "whoSaidIt", multiplier } | null,
    myPlay: { status: "none" | "inProgress" | "done", points: number | null },
    played: { count: number, emojis: string[] },               who has played today; no scores
    prompt: { promptId, question, myAnswer: string | null } | null,
  }

— blur.ts (B) —
blur.start          mutation  { token, gameId }                 → { imageKey, startedAt, roundMs, hardStopMs }
blur.guess          mutation  { token, gameId, guess }          → { correct, finished, points: number | null, answer: string | null }
blur.giveUp         mutation  { token, gameId }                 → { answer }
  helper for clock:  createBlurGame(ctx, { groupId, week, day, multiplier }) → Id<"games">

— prompts.ts, whoSaidIt.ts, ai.ts (C) —
prompts.answer      mutation  { token, promptId, text }         → null        1–140 chars; editable until the reveal
whoSaidIt.get       query     { token, gameId }                 → { quotes: { answerId, text, options: { memberId, name, emoji }[] }[] }
whoSaidIt.submit    mutation  { token, gameId, picks: { answerId, memberId }[] }
                                                                → { correct, asked, points, reveal: { answerId, authorId, authorName, authorEmoji }[] }
  helpers for clock: createPrompt(ctx, { groupId, week, day }) → Id<"prompts">
                     createWhoSaidItGame(ctx, { groupId, week, day, multiplier }) → Id<"games"> | null
  internal:          prompts.answersForPrompt (query), prompts.saveRewrites (mutation), ai.rewriteAnswers (action)

— rivals.ts, powers.ts, weeks.ts (D) —
rivals.view         query     { token, groupId }                → {
    me:    { memberId, name, emoji, hasPass, weekPoints, lastDelta, streak, ghost, spy, ghostActive, spyActive },
    above: Slot[],   nearest first; 1 slot, or 3 while my Spy is active
    below: Slot[],   1 slot
  }
  Slot = { kind: "rival", memberId, name, emoji, hasPass, gap: number, moved: "passedYou" | "youPassed" | null }
       | { kind: "fog" }
powers.use          mutation  { token, groupId, type: "ghost" | "spy" }   → null
weeks.finale        query     { token, groupId }                → { week, myMemberId, standings: { memberId, name, emoji, points, hasPass }[] } | null
                                                                  null unless phase is "finale"

— lead —
events.mine         query     { token, groupId }                → { eventId, kind, text, createdAt }[]   latest 5
clock.advance, clock.tick                                         internal mutations
demo.*              mutations { demoKey, … }                      see §9
whop.createCheckout action    { token }                         → { url }      Season Pass checkout for this player
POST /whop/webhook  http.ts                                       verifies the signature, sets hasPass
memory.remember, memory.squawk                                    internal actions (P2)
```

`convex/lib/scoring.ts` exports `finishPlay(ctx, play, { basePoints, detail })`. It multiplies by the game's multiplier, sets `points`, `finishedAt` and `detail`, and returns the points.

### 6.8 Look and feel

Four agents will each invent a design unless the system is fixed first. Phase 0 fixes it.

- **Light mode only** (`userInterfaceStyle: "light"`).
- **Colours:** background `#FFF8ED` (cream), surface `#FFFFFF`, ink `#1F1410`, muted `#7A6A5E`, primary `#C2410C` (the burnt orange from your PDFs), accent `#F5B700` (yolk), good `#1E9E5A`, bad `#D7263D`, fog `#D9D2C7`, border `#EADFCF`.
- **Type:** system font. Display 40/800, title 24/800, body 17/500, caption 13/600.
- **Shape:** cards radius 20, pills fully round, 4-point spacing grid, 16 px screen gutter.
- **People:** emoji in a 44 px circle on the accent colour.
- **Motion and touch:** Reanimated springs for reveals. Haptics on a correct guess, a reveal and a power.
- **Web:** content column capped at 480 px and centred, so it reads as a phone app on a laptop.
- **Primitives:** `Screen`, `Txt`, `Button`, `Card`, `Avatar`, `Pill`. Tracks use these and `src/theme.ts` and add no colours, fonts or UI libraries. Plain `StyleSheet`, as in your stack doc.

### 6.9 iPhone and Android

Expo builds both from the same code, so nothing in the stack changes. What it takes is delivery, a few shared rules, and testing on both.

| | iPhone | Android |
|---|---|---|
| Your phones, while building | Expo Go | Expo Go |
| Other people today | The web link in Safari | An installable app from a link or QR code (§9), or the web link |
| A store install | Needs the paid Apple Developer Program and review | Needs a Play Console account and review |

**Rules every track follows:**

- **Keyboard and safe areas live in `Screen`.** Android draws edge to edge and no longer resizes the window for the keyboard, so an input with no handling sits underneath it. `Screen` wraps its content in safe-area insets and a `KeyboardAvoidingView` with `behavior="padding"` on both platforms. Tracks never hand-roll this. (`react-native-keyboard-controller` is not in Expo Go, so it is not an option today.)
- **No iPhone-only packages.** The template ships `expo-symbols`, `expo-glass-effect` and `@expo/ui`. Do not use them. Icons are emoji; surfaces are plain views.
- **No `shadow*` style props.** They only work on iOS. Use a border, or `boxShadow`.
- **The Android back button** is handled by the Stack. Leaving a round with it does not pause the round; the timer is on the server.
- **Every gate checks both phones.** A screen is not done until it has been seen on Android with the keyboard open.

---

## 7. Phase 0 — walking skeleton (lead, 11:45–12:25)

**Goal:** an app that runs end to end with placeholder bodies, at a public URL and on the iPhone, with every file from §6.5 in place.

**Status at 12:15:** built and verified locally. A 29-check script ran a full week through the backend (join, play, seal, reveal, Wildcard Wednesday, finale, week 2), `npm run check` passes, the web bundle builds, and two browser profiles played and joined through the real UI. Use Node 24 for this project: `export PATH=/opt/homebrew/opt/node@24/bin:$PATH`.

**Status at 12:30:** cloud setup done. Backend: Convex dev deployment `bold-pony-982` (team `yash-sanghvi`), which passed the same 29 checks. Web: https://pecking-order.expo.app, verified with two players, the join link and a full Blur round. Expo project: `@yashy10/Pecking_order`. Phones: Expo Go over a public tunnel; the manifests, the signed manifest and both bundles all return 200. Remaining for Gate 1: you scan the QR on both phones, and Capy starts tracks A to D.

```bash
# A. Already done at 11:35: the app is scaffolded at the repo root as "Pecking Order"
#    (slug Pecking_order, SDK 58, React 19.3, React Native 0.88, Reanimated 4, TypeScript 6).
#    expo-doctor passes and the web bundle builds. What is left of this step is tidying up:
mv "Pecking Order - "*.pdf docs/
npm run reset-project            # answer "n": delete the template's demo screens

# B. Every dependency, now, so no track touches package.json.
npx expo install convex expo-secure-store expo-crypto expo-haptics expo-clipboard \
  react-native-svg react-native-qrcode-svg openai zod
npm install -D vitest
npx expo-doctor

# C. Convex is already running in its own tab (§5 step 2). It wrote .env.local.
#    Copy the EXPO_PUBLIC_CONVEX_URL line into a committed .env — the URL is public, and cloud builds need it.

# D. Run it.
npx expo start --go              # scan with Expo Go on the iPhone and the Android phone; press w for web
```

**`app.json` edits** (the name, the slug `Pecking_order` and the scheme `peckingorder` are already set): `userInterfaceStyle: "light"`, `web.output: "single"`, `experiments.typedRoutes: false` (agents without a running dev server would otherwise fail typecheck on route strings), `ios.bundleIdentifier` and `android.package` set to `com.<owner>.peckingorder`.

**`package.json`:** add the script `"check": "tsc --noEmit && vitest run --passWithNoTests"`. The one typecheck error today is in the template's demo file `src/components/app-tabs.web.tsx`, which `reset-project` removes.

**Node:** this laptop defaults to Node 23, which Metro lists as unsupported. It prints a warning and bundles fine. If anything odd shows up, Node 24.20 is installed at `/opt/homebrew/opt/node@24/bin`.

**Files to write, in this order:**

1. `convex/schema.ts` from §6.6, `convex/lib/constants.ts`, `convex/lib/auth.ts`, `convex/lib/scoring.ts`.
2. `convex/clock.ts` — the real state machine from §6.2. It is the spine; everything else hangs off it.
3. Every module in §6.7 with final signatures, `returns` validators and placeholder bodies. Blur's placeholder is a working minimal version (one image, exact-match answer) so the loop is real from the start.
4. `convex/demo.ts` with just `advance`, so the clock can be driven from the CLI.
5. `src/theme.ts`, `src/components/ui/*` (`Screen` owns safe areas and the keyboard, §6.9), `src/utils/storage.ts` (SecureStore or localStorage by platform), `src/utils/haptics.ts` (no-op on web), `src/hooks/use-identity.tsx`.
6. `src/app/*` routes, the hub with its four slots, and a stub component at every path in §6.5.
7. The project rules appended to the template's `AGENTS.md` (Appendix A) and `.capy/setup.json` (Appendix B).

**Then prove the judge path while it is still cheap to fix:**

```bash
npx eas-cli@latest whoami        # must show the account you chose; init creates the Pecking_order project there
npx eas-cli@latest init
npx expo export -p web && npx eas-cli@latest deploy --prod
# Add the printed https://….expo.app address to .env as EXPO_PUBLIC_WEB_URL, then export and deploy once more.
```

**Gate 1 — done when all of these are true:**

- On the iPhone and the Android phone in Expo Go, and in a desktop browser: create a group, land on the hub, tap Play, guess the placeholder image with the keyboard open and the input still visible, see "sealed" on the hub.
- `npx convex run clock:advance '{"groupId":"…"}'` flips the group to `revealed` and both screens update without a refresh.
- `https://….expo.app/join/<CODE>` opens directly on a phone using cellular data, not Wi-Fi.
- `npm run check` passes. Everything is committed and pushed to `main`.

If Expo Go refuses the project, carry on in the phone's browser and fix it in the background. If the deep link 404s on EAS Hosting, deploy `dist/` to any static host with a rewrite of all paths to `index.html`.

---

## 8. Phase 1 — tracks A–D (Capy, 12:25–1:45)

Each track gets the prompt in Appendix B with its letter filled in. Each opens one PR to `main`. Every track's "Done when" also includes this: its screens work on the Android phone in Expo Go, with the keyboard open wherever there is a text field (§6.9).

### Track A — groups, join, hub

**Done by the lead at 1:25** (join goes straight into today's game). The hub was then redesigned into Today / Board / Crew tabs by the redesign session.

**Owns:** `convex/users.ts`, `convex/groups.ts`, `convex/today.ts`, `src/screens/home.tsx`, `join.tsx`, `invite.tsx`, `group-hub.tsx`, `src/components/today-card.tsx`.

**Build:**

- **Home:** if there is no profile, ask for a name and an emoji (grid of about 24 animals, one preselected at random). Then "Create a group", "Join with a code", and the list of my groups.
- **Join (`/join/[code]`):** show the group preview ("Join Roost — 11 playing"), the profile form if needed, and one Join button. After joining go straight to `/g/[groupId]/play` when today's game is unplayed, otherwise to the hub.
- **Invite (modal):** QR code of `${EXPO_PUBLIC_WEB_URL}/join/${code}` (on web use `window.location.origin`), the code in large type, Copy and Share buttons.
- **TodayCard:** four states. No game today: "Finale tonight". Not played: a large Play button, with a ×2 badge on Wildcard Wednesday. Played and sealed: "🔒 87 points sealed until the reveal" and "9 of 13 have played" with their emojis. Revealed: "+87 today".
- **Invite codes:** five characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, checked for uniqueness through the index.
- **Creating a group** makes the creator a member and calls the clock's `startDay` helper.

**Done when:** two browsers can create and join the same group in under 10 seconds each. A refresh keeps you signed in. Joining twice does nothing. `today.get` contains no other member's points.

### Track B — Blur

**Done by the lead at 1:25.** Typo tolerance per the rules below (9 tests), shake on a wrong guess.

**Owns:** `convex/blur.ts`, `convex/lib/match.ts` and its test, `src/screens/blur-game.tsx`. Photos and the accepted-answer list belong to the lead.

**Build:**

- **`createBlurGame`:** the image is `BLUR_IMAGES[(week * 7 + day) % BLUR_IMAGES.length]`.
- **`start`:** creates the play. On re-entry it returns the existing `startedAt`, so a refresh cannot restart the timer.
- **`guess`:** elapsed is server time minus `startedAt`. Past 30 s, finish with 0. Correct, finish through `finishPlay` using §6.3. Wrong, add one to `wrongGuesses`.
- **`matchAnswer(guess, answers)`:** lowercase; strip punctuation and a leading a/an/the; collapse spaces; drop a trailing "s". Accept an exact match with any answer, with or without spaces, or an edit distance of 1 for words of five letters or more (2 for nine or more).
- **Screen:** a square image with `expo-image`'s `blurRadius` stepping down every 500 ms from about 50 to 0 over 20 s. A points counter ticking down. A text field with autofocus. A shake and a haptic on a wrong guess. On a correct one the image snaps sharp, shows the answer and "🔒 N points sealed".

**First 15 minutes:** prove the stepping blur is smooth on the iPhone in Expo Go and on web. If it stutters, step once a second or shrink the photos to 400 px.

**Done when:** a correct guess at about 5 seconds scores about 75. "tooth brush" and "toothbrsh" both pass for toothbrush. The answer appears in no network response before the round ends (check the WebSocket frames in the browser's dev tools). Reloading mid-round does not reset the timer. `match.test.ts` passes.

### Track C — prompts, Who Said It, AI rewrite

**Done by the lead at 1:20. Do not start a Capy task for Track C.** Checked on the cloud backend, including a real OpenAI rewrite with `gpt-5.4-mini`.

**Owns:** `convex/prompts.ts`, `convex/whoSaidIt.ts`, `convex/ai.ts`, `src/components/prompt-card.tsx`, `src/screens/who-said-it-game.tsx`.

**Build:**

- **`createPrompt`:** `PROMPTS[(week * 7 + day) % PROMPTS.length]`.
- **PromptCard:** today's question, a 140-character field, and a "Saved for tomorrow's game" state.
- **`createWhoSaidItGame`:** uses the answers to the previous game day's prompt. Needs answers from at least three members, otherwise returns `null`. Up to six quotes. Options are the author plus three other members, shuffled, stored as ids.
- **`whoSaidIt.get`:** drops quotes I wrote, caps at four, reads the text as `rewritten ?? text` at query time (so a rewrite that lands late still shows up), and never returns `authorId`.
- **`submit`:** one shot, scored per §6.3 through `finishPlay`, and returns who wrote each quote.
- **Screen:** one quote per card, four name chips, progress dots. After submitting, each card flips to show its author, then "🔒 N points sealed".
- **`ai.rewriteAnswers`:** an internal action in a `"use node"` file. One OpenAI call for the whole batch, returning JSON, saved through `internal.prompts.saveRewrites`. Any failure is logged and `rewritten` stays unset.

```ts
"use node";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const Rewrites = z.object({
  items: z.array(z.object({ answerId: z.string(), rewritten: z.string() })),
});

// inside the action handler:
const client = new OpenAI(); // reads OPENAI_API_KEY from the Convex environment
const res = await client.responses.parse({
  model: process.env.OPENAI_MODEL ?? "gpt-5.5",
  instructions:
    "Rewrite each answer in one plain, neutral voice. Keep the meaning and any funny detail. " +
    "Remove slang, emoji, spelling habits and anything that identifies the writer. 140 characters at most.",
  input: JSON.stringify(answers),
  text: { format: zodTextFormat(Rewrites, "rewrites") },
});
if (!res.output_parsed) return null; // raw text stays in play
```

This runs ahead of time, so its latency never touches a player. A failed or unparseable response falls back to the friend's own words, which is the designed behaviour. `gpt-5.5` is the model the OpenAI SDK's own examples use; set `OPENAI_MODEL` on the Convex deployment to use a smaller, cheaper one.

**Done when:** with three or more seeded answers, the next Who Said It day builds a round. I am never asked about my own answer. `authorId` appears nowhere in the `get` response. With `OPENAI_API_KEY` unset the game still works on raw text.

### Track D — rivals, powers, finale

**Done by the lead at 12:45. Do not start a Capy task for Track D.** 14 unit tests and a cloud check cover every "done when" below.

**Owns:** `convex/rivals.ts`, `convex/powers.ts`, `convex/weeks.ts`, `convex/lib/standings.ts` and its test, `src/components/rivals-panel.tsx`, `powers-tray.tsx`, `src/screens/finale.tsx`.

**Build:**

- **`neighbours()`:** a pure function implementing §6.1. Write its tests first: middle of the pack; first place (fog above); last place (fog below); the rival above is ghosted (the next one shows, and the gap is to that one); everyone above is ghosted (fog); Spy shows three above and pads with fog; ties; I am the ghost (my own view is unchanged).
- **RivalsPanel:** stacked rows. The slot or slots above, then "You" with your own total and today's gain after a reveal, then the slot below. A rival row has an emoji, a name and "12 ahead", "30 behind" or "tied". A fog row is `???` in the fog colour. On a reveal the rows animate to their new places and show a "passed you" or "you passed" tag.
- **PowersTray:** Ghost and Spy buttons with counts. A confirm sheet with one line each: "Vanish from your rivals' boards until tomorrow" and "See two more places above you until tomorrow". An active state for the rest of the day.
- **Ghost on a rival's screen:** the row fades out with a 👻 and the next rival, or fog, slides in. This is driven entirely by the query result changing; no extra signalling.
- **Finale:** rows appear from the bottom up about 600 ms apart, slowing for the top three. The champion gets a crown, an emoji burst built with Reanimated (no library) and a success haptic. "You finished 4th of 13." No label of any kind on last place.

**Done when:** every `standings.test.ts` case passes. No `rivals.view` response contains a rank, a member count or a non-neighbour (inspect one). Using Ghost in one browser changes the neighbour's board in another within a second. `weeks.finale` returns `null` unless the phase is `finale`.

---

## 9. Lead track — demo panel, bots, seed, content (12:25–1:45)

This runs alongside the Capy tracks. It is also your test rig: you cannot check a hidden leaderboard with one account.

**Demo panel (`/demo`, not linked from anywhere, asks for the demo key once).** It must work in a desktop browser, because that is what puts the QR code on the projector.

| Control | Effect |
|---|---|
| New demo group | Runs the seed below and shows a large QR code and join link |
| Bots play today | Every bot without a play gets a random score and a canned prompt answer |
| Next ▶ | `clock.advance`: one step of §6.2 |
| Make it Wednesday | Reveals today if needed, then drops Wednesday with ×2 |
| Rival above me ghosts | The member directly above the chosen player uses Ghost |
| Grant power | Gives Ghost or Spy to one member or to everyone |
| Jump to Sunday | Reveals today if needed, then runs the finale |
| Reset week | Back to a fresh Monday |

**Seed.** One group at `(Wed, open)` with a ×2 Blur game:

- Ten bots with names and emojis, plus two that have never played, so no judge finishes last.
- Bots' banked totals from Monday and Tuesday between 0 and 120, and Wednesday scores between 60 and 190. A judge who scores about 150 on the double-points round then lands mid-pack, which is also Wildcard Wednesday doing its job.
- Canned, funny prompt answers for the bots, already "rewritten", so a Who Said It round can be dropped instantly with no AI call.

**Content.**

- Resize the photos: `sips -s format jpeg -Z 600 <photo> --out assets/blur/img_01.jpg`. Claude Code can look at each photo and write its accepted answers.
- `convex/content/blur.ts`: `{ key: "img_01", answers: ["coffee mug", "mug", "cup"] }`. The key is opaque on purpose.
- `convex/content/prompts.ts`: 30 short questions that produce funny, guessable answers ("Worst purchase you ever made?", "A hill you would die on?").

**Also in this window: the first Android build.** This is the installable Android app. Start it early, because the free plan's queue is low priority and a config error is cheaper to find at 12:45 than at 4:00.

```bash
npx eas-cli@latest build:configure
# add one profile to eas.json:
#   "preview-apk": { "distribution": "internal", "android": { "buildType": "apk" } }
npx eas-cli@latest build -p android --profile preview-apk --no-wait
```

It needs no Android Studio and no Google account. When it finishes, the build page gives an install link and a QR code that work on any Android phone, once the owner accepts the "unknown app" warning. The JavaScript is baked in at build time, so the 12:45 build shows the skeleton and the 3:45 build is the one people install. The free plan allows 15 Android builds a month, so build at those two points, not on every change.

---

## 10. Phase 2 — integrations (2:25–4:15), in priority order

1. **Events and banner (P1).** `clock` writes `events` at each reveal: "Priya just passed you", "You passed Sam", "You earned a Ghost". `banner.tsx` shows the newest unseen one, on every platform.
2. **AI rewrite end to end (P1).** Confirm the reveal schedules `ai.rewriteAnswers` and the next Who Said It round shows rewritten text.
3. **Stage phones without the laptop (P1).** Expo Go normally loads JavaScript from your laptop's dev server, which is a stage risk on venue Wi-Fi. Publish with EAS Update and open that in Expo Go instead:
   ```bash
   npx eas-cli@latest update:configure      # then set "runtimeVersion": { "policy": "sdkVersion" } in app.json
   npx eas-cli@latest update --branch demo --message "freeze"
   ```
   Check this by 2:50, not at the freeze. If it will not open in Expo Go, the fallback is the dev server over your phone's hotspot or a tunnel (your `expo-go-qr` skill does this). The Android phone has a second option: the installed build from §9 needs no dev server at all.
4. **Whop Season Pass (P1 — the sponsor prize you are going for).** The pass is cosmetic and never sells powers: a ✨ ring on your avatar in the rivals view and on the finale board.
   - `src/screens/pass.tsx`: what the pass is, the price, one button.
   - `whop.createCheckout` (action): asks Whop for a checkout for the Season Pass, tagged with the player's user id, and returns its URL. The app opens it in the browser.
   - `convex/http.ts`: a `POST /whop/webhook` route. When Whop reports the payment, verify the signature, find the user from the tag, and set `hasPass` on the user and on their memberships.
   - Every screen is a live query, so the ring appears on all devices the moment the webhook lands. That is the demo beat: pay in the sandbox on one phone and watch the other phone change.
   - Use Whop's sandbox. Its keys and products are separate from production.
   - Minimum version if time is short: the screen plus a fixed checkout link, about 15 minutes.
   - The exact endpoint and event names are **not verified yet**. Confirm them against docs.whop.com, starting at the sandbox guide and the API reference, before writing the action.
5. **Final deploys at 3:45.** `npx expo export -p web && npx eas-cli@latest deploy --prod`, the EAS Update from step 3, and the final Android build from §9.

**Only if all of the above is finished:**

- **Supermemory.** One `"use node"` action file. Remember every prompt answer and reveal line, and recall them to write one "squawk" per member at the reveal. `new Supermemory()` reads `SUPERMEMORY_API_KEY`; `sm.add(namespace, { content, id })` and `sm.search(namespace, { query, limit })`, with one namespace per group. A template line is the fallback.
- **Revyl.** Follow docs.revyl.com/frameworks for Expo and give it the Android build from §9. One flow: join with a code, enter a name, play Blur, see the rivals view.
- **Local notifications.** `scheduleNotificationAsync` with a null trigger, mirroring the banner. Android needs a notification channel first. Real push is out: it needs the paid Apple Developer Program.
- **Cron clock.** `crons.interval("advance due groups", { minutes: 1 }, internal.clock.tick, {})`.
- **Add to Home Screen.** A web manifest and icons, so iPhone users who open the link can pin it like an app.

**One Convex deployment for everything.** Both phones, the web build, the Android build and the judges all use the dev deployment, so the seed data lives in one place and there is no production deploy to forget. Capy agents must never push to it (Appendix A).

---

## 11. Definition of done and testing

**Every PR, before it is opened:**

```bash
npm run check                                        # tsc + vitest
CONVEX_AGENT_MODE=anonymous npx convex dev --once    # throwaway local backend; catches push-time errors
npx expo export -p web                               # the bundle builds
```

**Unit tests** cover the two places where a bug is invisible until the demo: `neighbours()` and `matchAnswer()`.

**The loop, run by hand at Gates 1, 2 and 3** on the iPhone, the Android phone and a desktop browser at the same time:

1. Open the join link on a device that has never seen the app. In, and playing, within 10 seconds.
2. Play Blur. The hub says sealed. Another device's rivals view has not moved.
3. Advance. All three screens change together.
4. Use Ghost on one device. The neighbour's board changes on another.
5. Use Spy. Three slots above.
6. Jump to Sunday. The finale plays on all three.
7. In the browser's dev tools, read one `rivals.view` response and one `blur.start` response. No ranks, no stray points, no answer.

Claude Code can drive steps 1–7 on the web build itself and report what it sees.

---

## 12. Demo runbook (3 minutes)

**Stage layout.** One laptop on the projector with two windows side by side: the iPhone mirrored over a cable in QuickTime, and a browser showing the demo panel's QR code. The iPhone runs the EAS Update, not the dev server. The Android phone, running the installed build, is in your hand as the second player. Everything is on your phone's hotspot, not venue Wi-Fi.

| Time | Beat |
|---|---|
| 0:00 | "A daily game for your friend group, where nobody knows who's winning until Sunday." Nothing more. |
| 0:10 | QR on screen. Judges scan, type a name, pick an emoji. It is Wildcard Wednesday in a group of twelve. |
| 0:40 | Judges play Blur. Their phones say "sealed". The mirrored iPhone shows a rivals view that has not moved. |
| 1:15 | "It's 9 pm." Tap Next. Every phone updates at once: "You're 12 behind Priya, 30 ahead of Sam." A banner drops: "Priya just passed you." |
| 1:45 | "Rival above me ghosts." Priya fades off the mirrored board and someone else appears. Invite a judge to tap their own Ghost. Then tap Spy: three places open above. |
| 2:15 | Jump to Sunday. The board reveals from the bottom up on every phone. A champion is crowned. |
| 2:45 | "Every friend group has a pecking order. Now you find out every Sunday." Hold up both phones: one codebase for iPhone, Android and the web link the judges just used. One line on what is next. |

**Before you walk up:** a new demo group is seeded; both of your phones have joined it and played; the QR is on screen; Expo Go is open on the update; the hotspot is on; the backup video is one click away.

**If something fails:** the web link does not load → hand over your team's phones, already joined. The iPhone will not mirror → run your side in a browser window. Everything fails → play the video and talk over it.

---

## 13. Risks and fallbacks

| Risk | Sign | Fallback |
|---|---|---|
| Expo Go will not run the project | "Incompatible with this version of Expo Go" | Update Expo Go to 58.x. Until fixed, use the web build in the phone's browser |
| Venue Wi-Fi blocks phone-to-laptop | Expo Go spins on the QR | Phone hotspot, or a tunnel through your `expo-go-qr` skill |
| A Capy track is late or wrong | No mergeable PR at 1:30 | Claude Code takes the brief in §8 |
| Merge conflicts | Conflicts outside `_generated` | A track edited a file it does not own. Keep the owner's version |
| Blur stutters | Visible steps on the iPhone | Step once a second, or 400 px photos |
| Android build queue is long | Build still queued after 30 minutes | The Android phone uses Expo Go with the EAS Update instead; Android users get the web link |
| A screen breaks only on Android | Input hidden under the keyboard, or content under the status bar | It is not using `Screen`. Wrap it; do not patch screen by screen |
| Expo account not switched | `eas whoami` still shows the old account | No web URL and no Android build until you sign in. Everything local still works |
| Blur answer rejected on stage | A judge types a fair synonym | Add synonyms generously during seeding; the list is server-side and can be edited live |
| LLM key missing or call fails | `rewritten` never appears | By design: raw text is used. Seeded answers are already rewritten |
| Someone finds the demo functions | Group jumps unexpectedly | They need `DEMO_KEY`. Seed a new group from the panel in one tap |
| Node 23 is rejected by a tool | Engine warning or install failure | `brew install node@22` and use that |

---

## Appendix A — rules to append to `AGENTS.md`

The Expo template generates `AGENTS.md` and `CLAUDE.md`. Append this section.

```md
## Pecking Order rules — read docs/PLAN.md first

- Work only in the files your track owns (docs/PLAN.md §6.5). Never edit convex/schema.ts,
  convex/lib/auth.ts, convex/lib/constants.ts, convex/lib/scoring.ts, src/app/**,
  src/components/ui/**, src/theme.ts, package.json or app.json. If you need a change there,
  describe it in the PR instead.
- Do not add dependencies, routes, or new files under convex/.
- Import only from convex/lib and convex/content, never from another track's module.
- Every public Convex function uses object syntax with `args` and `returns` validators, takes
  `token: v.string()` first, and resolves the caller with requireUser or requireMember from
  convex/lib/auth.ts. Read with `.withIndex`; never `.filter` or an unbounded `.collect()`.
- The hidden-board rules in docs/PLAN.md §6.1 are hard requirements. Never return a rank,
  another member's points, a sealed score, a Blur answer, a quote's author or a token.
- Only convex/lib/auth.ts and convex/users.ts may read the `users` table.
- UI uses src/components/ui and src/theme.ts. No new colours, fonts or UI libraries. Light mode
  only. It must work on iOS and Android in Expo Go and on web: wrap every screen in `Screen`
  (it owns safe areas and the keyboard), and do not use expo-symbols, expo-glass-effect,
  @expo/ui or `shadow*` style props.
- Never deploy to the shared Convex deployment and never set CONVEX_DEPLOY_KEY.
- Before opening a PR, all three must pass:
  `npm run check`
  `CONVEX_AGENT_MODE=anonymous npx convex dev --once`
  `npx expo export -p web`
```

## Appendix B — Capy setup and task prompt

`.capy/setup.json`, committed to `main` before the tracks start (Capy reads it from the setup branch):

```json
{
  "$schema": "https://api.capy.ai/schemas/setup.v1.json",
  "format_version": 1,
  "scripts": { "initialize": "npm ci", "refresh": "npm ci" },
  "timeouts": { "initialize": 900 },
  "commands": [{ "name": "check", "command": "npm run check", "icon": "task" }]
}
```

Task prompt, one per track:

```
Read AGENTS.md, then docs/PLAN.md sections 6 and 8. Implement Track <A|B|C|D> exactly as its
brief specifies. Every file you need already exists with the right signatures and a placeholder
body: replace the bodies, keep the shapes. Edit only the files listed under "Owns" for your
track. Meet every line of "Done when". Run the three checks in AGENTS.md, then open one pull
request to main titled "Track <letter>: <name>". In the PR description list anything you needed
changed in a file you do not own.
```

## References

- Expo Go on the App Store (58.0.5, SDK 58): https://apps.apple.com/us/app/expo-go/id982107779
- Upgrading to SDK 58, including the `web.output` default: https://expo.dev/blog/how-to-upgrade-to-sdk-58
- Expo Go and the App Store, May 2026: https://expo.dev/changelog/expo-go-and-app-store-may-2026
- expo-image `blurRadius` (iOS, Android, web): https://docs.expo.dev/versions/v58.0.0/sdk/image/
- expo-notifications in Expo Go: https://docs.expo.dev/versions/v58.0.0/sdk/notifications/
- Push notifications FAQ: https://docs.expo.dev/push-notifications/faq/
- Personal teams and push: https://developer.apple.com/forums/thread/811929
- Revyl framework setup: https://docs.revyl.com/frameworks
- Capy environment setup: https://docs.capy.ai/environment
- Keyboard handling on Android and iOS: https://docs.expo.dev/guides/keyboard-handling/
- Installable builds without a store: https://docs.expo.dev/build/internal-distribution/
- Expo plans and limits: https://expo.dev/pricing
- Whop developer docs: https://docs.whop.com
