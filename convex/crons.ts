import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Owned by the lead. The automatic daily cycle (PLAN §6.2, real mode): once a minute,
// move every automatic group whose next step is due. Demo groups are manual and are
// never touched here.

const crons = cronJobs();

crons.interval("advance due groups", { minutes: 1 }, internal.clock.tick, {});

export default crons;
