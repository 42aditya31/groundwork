/** Prints which topics each learner's plan covers, per domain (# = in plan, . = continued learning). Test DB only. */
import { and, eq } from "drizzle-orm";
import { db, t } from "../src/db";
import { rebuildPlan } from "../src/server/planner";

if (!/test/.test(process.env.DATABASE_PATH ?? "")) throw new Error("Run against a test database only.");
for (const u of db.select().from(t.users).all()) {
  if (!u.hoursWeekday) continue;
  rebuildPlan(u.id);
  const rows = db
    .select({ code: t.topics.code, bucket: t.topicProgress.planBucket })
    .from(t.topics)
    .innerJoin(t.topicProgress, and(eq(t.topicProgress.topicId, t.topics.id), eq(t.topicProgress.userId, u.id)))
    .where(eq(t.topics.pathId, u.pathId))
    .orderBy(t.topics.sort)
    .all();
  const byDomain = new Map<string, string>();
  for (const r of rows) {
    const d = r.code.split(".")[0];
    byDomain.set(d, (byDomain.get(d) ?? "") + (r.bucket === "continued" ? "." : "#"));
  }
  console.log(`${u.name} (${u.hoursWeekday} h weekdays)`);
  console.log([...byDomain].map(([d, v]) => `  ${d.padEnd(3)} ${v}`).join("\n"));
}
