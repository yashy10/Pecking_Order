# Pecking Order

**A daily game for your friend group, where nobody knows who's winning until Sunday.**

Every day your group gets a new game. You never see the leaderboard, only that you're 12 points behind Priya and 30 ahead of Sam. All week you're asking each other "wait, where are you?" Then on Sunday the full standings drop and the group chat explodes.

Built at the Consumer Mobile Hackathon, November 15, 2026.

## Try it

- **Any phone or laptop:** https://pecking-order.expo.app. Make a group, share the QR code, play today's game.
- **Android:** an installable build is on the [EAS project page](https://expo.dev/accounts/yashy10/projects/Pecking_order/builds). It updates itself over the air.
- **iPhone:** use the web link, or Expo Go with a development server.

## How a week works

| | |
|---|---|
| **Daily game** | Blur: a photo sharpens over 20 seconds and the faster you guess, the more you score. Who Said It: yesterday's answers to the daily question, rewritten so nobody's style gives them away. Guess who wrote each one. |
| **Sealed scores** | You see your own score, and nobody else's, until the evening reveal. |
| **Nearest rivals** | No rank and no count. Just the person directly above you, the person directly below, and the gaps. First place sees fog above them too, so even the leader can't be sure. |
| **Powers** | Earned, never bought. Ghost hides you from your rivals' boards for a day; Spy shows two more places above you. |
| **The week** | Wildcard Wednesday counts double. Sunday drops the full board, crowns a champion and resets for Monday. |

## What's interesting under the hood

- **The hidden board is enforced on the server.** The rivals query returns only your neighbours, with Ghost and Spy already applied, and every function declares a strict return validator. Full standings exist in exactly one place, the finale, and only on Sunday. The rule set is in `convex/lib/standings.ts`, with 14 tests.
- **Time is a state machine, not a clock.** Each group moves through Monday open, Monday revealed, Tuesday open and so on to the finale, one step at a time (`convex/clock.ts`). That's what lets the hidden demo panel at `/demo` run a whole week in three minutes.
- **Nothing to trust on the phone.** Blur's timer runs on the server and the answer never leaves it until you've finished. Who Said It never sends an author before you submit.
- **AI only where it can't break the demo.** One OpenAI call per reveal rewrites the day's answers into a neutral voice, ahead of time. If it fails, the game uses the raw answers.
- **Season Pass on Whop.** Free and cosmetic only: a ring on your avatar. Checkout is tagged with the player, and a signature-checked webhook turns the ring on live (`convex/whop.ts`, `convex/http.ts`).

## Stack

Expo SDK 58 (React Native 0.88, Expo Router) for iPhone, Android and web from one codebase · Convex for the database, live queries, scheduling and HTTP actions · EAS Build, Update and Hosting · OpenAI for the rewrite · Whop for the Season Pass.

## Run it locally

Use Node 24 (`.nvmrc`). Convex's local backend refuses `"use node"` files on Node 23.

```bash
npm install
npx convex dev          # first run: log in and create a dev deployment
npx expo start          # press w for web, or scan the QR with Expo Go
```

Optional Convex environment variables:

| Name | What it does |
|---|---|
| `DEMO_KEY` | Unlocks the demo panel at `/demo`. Required for any demo control. |
| `OPENAI_API_KEY` | Turns on the Who Said It rewrite. `OPENAI_MODEL` overrides the model. |
| `WHOP_API_KEY` | Turns on Season Pass checkout. Then run `npx convex run whop:registerWebhook` once. |

Checks: `npm run check` runs the typecheck and the unit tests.

## Map

- `convex/` is the backend: schema, the clock, games, rivals, powers, demo controls and Whop.
- `src/app/` holds the routes; `src/screens/` and `src/components/` hold the UI.
- `docs/PLAN.md` is the build plan: hidden-board rules, schema, API contract and the demo runbook.
