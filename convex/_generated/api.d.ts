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
import type * as content_prompts from "../content/prompts.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as events from "../events.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_day from "../lib/day.js";
import type * as lib_match from "../lib/match.js";
import type * as lib_nudges from "../lib/nudges.js";
import type * as lib_schedule from "../lib/schedule.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_standings from "../lib/standings.js";
import type * as lib_whopSignature from "../lib/whopSignature.js";
import type * as notifications from "../notifications.js";
import type * as powers from "../powers.js";
import type * as prompts from "../prompts.js";
import type * as pushSender from "../pushSender.js";
import type * as rivals from "../rivals.js";
import type * as today from "../today.js";
import type * as users from "../users.js";
import type * as weeks from "../weeks.js";
import type * as whoSaidIt from "../whoSaidIt.js";
import type * as whop from "../whop.js";

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
  "content/prompts": typeof content_prompts;
  crons: typeof crons;
  demo: typeof demo;
  events: typeof events;
  groups: typeof groups;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/day": typeof lib_day;
  "lib/match": typeof lib_match;
  "lib/nudges": typeof lib_nudges;
  "lib/schedule": typeof lib_schedule;
  "lib/scoring": typeof lib_scoring;
  "lib/standings": typeof lib_standings;
  "lib/whopSignature": typeof lib_whopSignature;
  notifications: typeof notifications;
  powers: typeof powers;
  prompts: typeof prompts;
  pushSender: typeof pushSender;
  rivals: typeof rivals;
  today: typeof today;
  users: typeof users;
  weeks: typeof weeks;
  whoSaidIt: typeof whoSaidIt;
  whop: typeof whop;
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
