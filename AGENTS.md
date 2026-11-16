This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Pecking Order rules — read docs/PLAN.md first

This app is built in parallel by four tracks (A–D) plus a lead. Your track's brief is in
docs/PLAN.md §8; the architecture and hidden-board rules are in §6. The `returns`
validators in convex/ are the API contract: where the code and §6.7 differ, the code wins.

- Work only in the files your track owns (docs/PLAN.md §6.5). Never edit convex/schema.ts,
  convex/lib/auth.ts, convex/lib/constants.ts, convex/lib/day.ts, convex/lib/scoring.ts,
  convex/clock.ts, src/app/**, src/components/ui/**, src/theme.ts, src/utils/**,
  src/hooks/**, package.json or app.json. If you need a change there, describe it in the PR.
- Do not add dependencies, routes, or new files under convex/.
- In convex/, import only from convex/lib, convex/content and convex/_generated, never from
  another track's module.
- Every public Convex function uses object syntax with `args` and `returns` validators, takes
  `token: v.string()` first, and resolves the caller with findUser/requireUser or
  findMember/requireMember from convex/lib/auth.ts. Queries return null for a caller who is
  not a member; mutations throw `ConvexError("message for the player")`. Read with
  `.withIndex`; never `.filter` or an unbounded `.collect()`.
- The hidden-board rules in docs/PLAN.md §6.1 are hard requirements. Never return a rank,
  another member's points, a sealed score, a Blur answer before the player finishes, a
  quote's author before the player submits, or a token.
- Only convex/lib/auth.ts and convex/users.ts may read the `users` table.
- UI uses src/components/ui (Screen, Txt, Button, GameButton, Card, Field, Avatar, Pill,
  Mark, Logo, Icon, Loading, Backdrop) and src/theme.ts. The look is the light "Playground"
  theme in docs/PLAN.md §6.8, chosen by the user: warm paper, near-black ink, black pill
  buttons, one accent colour per place, Bricolage Grotesque and DM Sans. Give each screen its
  `place`. Do not bring back the dark tabletop theme or a mascot, and add no colours, fonts or
  UI libraries outside src/theme.ts. Emoji are for player avatars, game symbols, powers and the finale only.
  Use `fonts.*` for weight, never `fontWeight` with a custom family. QR codes stay #111 on
  #FFF with a white quiet zone. Leave `userInterfaceStyle: "light"` in app.json.
  It must work on iOS and Android in Expo Go and on web: wrap every screen in `Screen` (it owns
  safe areas, the keyboard and the backdrop), and do not use expo-symbols, expo-glass-effect,
  @expo/ui or `shadow*` styles.
- Import Convex code in the app as `@convex/_generated/api`. Typed routes are off, so route
  strings are plain strings.
- Use Node 24 (`.nvmrc`). Convex's local backend refuses "use node" files on Node 23.
- Never deploy to the shared Convex deployment and never set CONVEX_DEPLOY_KEY.
- Before opening a PR, all three must pass:
  `npm run check`
  `CONVEX_AGENT_MODE=anonymous npx convex dev --once`
  `npx expo export -p web`

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
