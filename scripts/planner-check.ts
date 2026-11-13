/**
 * Planner invariants, run against the TEST database after the e2e suite has onboarded both learners:
 *   DATABASE_PATH=./data/test.db node --conditions=react-server --import tsx scripts/planner-check.ts
 */
import { and, eq } from "drizzle-orm";
import { db, t } from "../src/db";
import { rebuildPlan } from "../src/server/planner";
import { DEADLINE, isWeekend } from "../src/lib/dates";

if (!/test/.test(process.env.DATABASE_PATH ?? "")) throw new Error("Run against the test database only.");
const fails: string[] = [];
const ok = (c: unknown, m: string) => (c ? console.log(`  ✓ ${m}`) : (fails.push(m), console.log(`  ✗ ${m}`)));

for (const u of db.select().from(t.users).all()) {
  if (!u.hoursWeekday) continue;
  console.log(u.name);
  for (const day of ["2026-11-16", "2026-11-20", "2026-12-10"]) {
    process.env.GROUNDWORK_TODAY = day;
    const r = rebuildPlan(u.id)!;
    const items = db.select().from(t.scheduleItems).where(eq(t.scheduleItems.userId, u.id)).all();
    ok(!items.some((i) => i.status === "planned" && i.date < day), `${day}: no unfinished task left in the past`);
    ok(!items.some((i) => i.date > DEADLINE), `${day}: nothing scheduled after the deadline`);
    const byDay = new Map<string, number>();
    for (const i of items.filter((x) => x.date >= day && x.status !== "rescheduled")) byDay.set(i.date, (byDay.get(i.date) ?? 0) + i.minutes);
    const cap = (d: string) => Math.round((isWeekend(d) ? (u.hoursWeekend ?? 0) : u.hoursWeekday!) * 60);
    const over = [...byDay].filter(([d, m]) => m > cap(d) + 30 && d !== day);
    ok(over.length === 0, `${day}: future days stay within capacity (${over.map(([d, m]) => `${d}=${m}`).join(", ") || "ok"})`);
    ok(items.filter((i) => i.kind === "project" && i.date >= day).every((i) => isWeekend(i.date)), `${day}: project work only on weekends`);
    // Learn items appear in syllabus order.
    const order = new Map(db.select().from(t.topics).where(eq(t.topics.pathId, u.pathId)).all().map((x) => [x.id, x.sort]));
    const learn = items.filter((i) => i.kind === "learn" && i.origin === "plan" && i.status === "planned" && i.date >= day).sort((a, b) => (a.date === b.date ? a.sort - b.sort : a.date < b.date ? -1 : 1));
    let monotonic = true;
    for (let k = 1; k < learn.length; k++) if ((order.get(learn[k].topicId!) ?? 0) < (order.get(learn[k - 1].topicId!) ?? 0)) monotonic = false;
    ok(monotonic, `${day}: learning follows syllabus order`);
    ok(r.continued > 0 && r.core > 0, `${day}: honest scope (${r.core} core, ${r.stretch} stretch, ${r.continued} continued)`);
  }
  const caps = db.select().from(t.projects).where(and(eq(t.projects.userId, u.id), eq(t.projects.kind, "capstone"))).all();
  ok(caps.length === 5, `5 stage capstones from the syllabus (${caps.length})`);
  ok(db.select().from(t.projects).where(and(eq(t.projects.userId, u.id), eq(t.projects.kind, "final"))).all().length === 1, "one final portfolio project");
}
console.log(fails.length ? `\n${fails.length} failures` : "\nPlanner invariants hold.");
process.exit(fails.length ? 1 : 0);
