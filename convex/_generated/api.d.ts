/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as blur from "../blur.js";
import type * as clock from "../clock.js";
import type * as content_blur from "../content/blur.js";
import type * as content_bots from "../content/bots.js";
import type * as content_crossword from "../content/crossword.js";
import type * as content_flow from "../content/flow.js";
import type * as content_krillion from "../content/krillion.js";
import type * as content_prompts from "../content/prompts.js";
import type * as content_sudoku from "../content/sudoku.js";
import type * as content_wordle from "../content/wordle.js";
import type * as crons from "../crons.js";
import type * as crossword from "../crossword.js";
import type * as demo from "../demo.js";
import type * as events from "../events.js";
import type * as flow from "../flow.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as krillion from "../krillion.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_crossword from "../lib/crossword.js";
import type * as lib_day from "../lib/day.js";
import type * as lib_flow from "../lib/flow.js";
import type * as lib_friends from "../lib/friends.js";
import type * as lib_games from "../lib/games.js";
import type * as lib_krillion from "../lib/krillion.js";
import type * as lib_match from "../lib/match.js";
import type * as lib_nudges from "../lib/nudges.js";
import type * as lib_schedule from "../lib/schedule.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_standings from "../lib/standings.js";
import type * as lib_sudoku from "../lib/sudoku.js";
import type * as lib_whopSignature from "../lib/whopSignature.js";
import type * as lib_wordle from "../lib/wordle.js";
import type * as matchUp from "../matchUp.js";
import type * as mostLikely from "../mostLikely.js";
import type * as notifications from "../notifications.js";
import type * as powers from "../powers.js";
import type * as prompts from "../prompts.js";
import type * as pushSender from "../pushSender.js";
import type * as readRoom from "../readRoom.js";
import type * as rivals from "../rivals.js";
import type * as sudoku from "../sudoku.js";
import type * as today from "../today.js";
import type * as users from "../users.js";
import type * as weeks from "../weeks.js";
import type * as whoSaidIt from "../whoSaidIt.js";
import type * as whop from "../whop.js";
import type * as wordle from "../wordle.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  blur: typeof blur;
  clock: typeof clock;
  "content/blur": typeof content_blur;
  "content/bots": typeof content_bots;
  "content/crossword": typeof content_crossword;
  "content/flow": typeof content_flow;
  "content/krillion": typeof content_krillion;
  "content/prompts": typeof content_prompts;
  "content/sudoku": typeof content_sudoku;
  "content/wordle": typeof content_wordle;
  crons: typeof crons;
  crossword: typeof crossword;
  demo: typeof demo;
  events: typeof events;
  flow: typeof flow;
  groups: typeof groups;
  http: typeof http;
  krillion: typeof krillion;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/crossword": typeof lib_crossword;
  "lib/day": typeof lib_day;
  "lib/flow": typeof lib_flow;
  "lib/friends": typeof lib_friends;
  "lib/games": typeof lib_games;
  "lib/krillion": typeof lib_krillion;
  "lib/match": typeof lib_match;
  "lib/nudges": typeof lib_nudges;
  "lib/schedule": typeof lib_schedule;
  "lib/scoring": typeof lib_scoring;
  "lib/standings": typeof lib_standings;
  "lib/sudoku": typeof lib_sudoku;
  "lib/whopSignature": typeof lib_whopSignature;
  "lib/wordle": typeof lib_wordle;
  matchUp: typeof matchUp;
  mostLikely: typeof mostLikely;
  notifications: typeof notifications;
  powers: typeof powers;
  prompts: typeof prompts;
  pushSender: typeof pushSender;
  readRoom: typeof readRoom;
  rivals: typeof rivals;
  sudoku: typeof sudoku;
  today: typeof today;
  users: typeof users;
  weeks: typeof weeks;
  whoSaidIt: typeof whoSaidIt;
  whop: typeof whop;
  wordle: typeof wordle;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
