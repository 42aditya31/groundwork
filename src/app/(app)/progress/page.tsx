import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { DEADLINE, addDays, dateIn, dateRange, daysBetween, formatDate, formatMinutes, todayIn, weekStart } from "@/lib/dates";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, PROOF_TYPES, isDone } from "@/lib/status";
import { PageHeader, Panel, ProgressBar, Section, Stat } from "@/components/ui";
import { Columns, DataTable, HBarList, Heatmap, LegendItem, TrendLine, type HeatCell } from "@/components/client/charts";
import { requireOnboardedUser } from "@/server/auth";
import { getPathTree, getSessionsTotal, getStreaks } from "@/server/data";
import { planStartDate } from "@/server/stats";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const start = planStartDate(user) < today ? planStartDate(user) : today;
  const tree = getPathTree(user.id, user.pathId);
  const topics = tree.flatMap((d) => d.topics);
  const progress = db.select().from(t.topicProgress).where(eq(t.topicProgress.userId, user.id)).all();
  const streak = getStreaks(user.id, user.timezone);
  const sessions = getSessionsTotal(user.id);
  const sessionRows = db.select().from(t.learningSessions).where(eq(t.learningSessions.userId, user.id)).all().filter((s) => s.endedAt);

  const done = topics.filter((x) => isDone(x.status));
  const mastered = topics.filter((x) => x.status === "mastered");
  const inPlan = topics.filter((x) => x.bucket !== "continued" || isDone(x.status));
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  // Heatmap: from 8 weeks before the plan start to the deadline week.
  const heatStart = weekStart(addDays(start, -56));
  const heatEnd = addDays(weekStart(DEADLINE), 6);
  const weeks: HeatCell[][] = [];
  const monthLabels: { index: number; label: string }[] = [];
  let lastMonth = "";
  for (let ws = heatStart, wi = 0; ws <= heatEnd; ws = addDays(ws, 7), wi++) {
    const week: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      const a = streak.byDate.get(d);
      const minutes = a?.minutes ?? 0;
      const level = !a ? 0 : minutes >= 120 ? 4 : minutes >= 60 ? 3 : minutes >= 30 ? 2 : 1;
      week.push({ date: d, label: formatDate(d, { weekday: "short", month: "short", day: "numeric" }), minutes, events: a?.events ?? 0, level: level as HeatCell["level"], future: d > today });
    }
    const m = ws.slice(0, 7);
    if (m !== lastMonth) {
      monthLabels.push({ index: wi, label: formatDate(ws, { month: "short" }) });
      lastMonth = m;
    }
    weeks.push(week);
  }

  // Weekly consistency over the last four weeks.
  const last28 = dateRange(addDays(today, -27), today);
  const active28 = last28.filter((d) => streak.byDate.has(d)).length;

  // Hours per week since plan start.
  const weekly: { key: string; label: string; short: string; value: number }[] = [];
  for (let ws = weekStart(start); ws <= weekStart(DEADLINE); ws = addDays(ws, 7)) {
    const end = addDays(ws, 6);
    const minutes = sessionRows.filter((s) => {
      const d = dateIn(s.startedAt, user.timezone);
      return d >= ws && d <= end;
    }).reduce((n, s) => n + s.minutes, 0);
    weekly.push({ key: ws, label: `Week of ${formatDate(ws, { month: "short", day: "numeric" })}${ws > today ? " (upcoming)" : ""}`, short: formatDate(ws, { month: "short", day: "numeric" }), value: Math.round((minutes / 60) * 10) / 10 });
  }

  // Monthly activity.
  const months = new Map<string, { minutes: number; days: number }>();
  for (const [d, a] of streak.byDate) {
    const m = d.slice(0, 7);
    const cur = months.get(m) ?? { minutes: 0, days: 0 };
    cur.minutes += a.minutes;
    cur.days += 1;
    months.set(m, cur);
  }

  // Completion trend: cumulative completed topics per day vs. a straight planned pace.
  const completedDates = progress.filter((p) => p.completedAt && isDone(p.status)).map((p) => dateIn(p.completedAt!, user.timezone));
  const before = completedDates.filter((d) => d < start).length;
  const trendDays = dateRange(start, DEADLINE);
  const span = Math.max(1, trendDays.length - 1);
  const points = trendDays.map((d, i) => ({
    date: d,
    label: formatDate(d),
    actual: d <= today ? completedDates.filter((c) => c <= d).length : null,
    plan: Math.round(before + ((inPlan.length - before) * i) / span),
  }));
  const todayIndex = Math.max(0, trendDays.indexOf(today));

  // Revision backlog.
  const pendingReviews = db
    .select()
    .from(t.scheduleItems)
    .where(and(eq(t.scheduleItems.userId, user.id), eq(t.scheduleItems.kind, "review"), eq(t.scheduleItems.status, "planned")))
    .all()
    .filter((i) => i.date <= today).length;

  const projects = db.select().from(t.projects).where(eq(t.projects.userId, user.id)).all();
  const proofs = db.select().from(t.proofs).where(eq(t.proofs.userId, user.id)).all();

  const totalDays = Math.max(1, daysBetween(start, DEADLINE));
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(start, today)));

  const domainRows = tree
    .filter((d) => !d.isSpecialization)
    .map((d) => ({ key: d.id, label: `${d.code}. ${d.title}`, value: d.done, max: d.topics.length, sub: `${d.mastered} mastered, ${d.inPlan} in plan` }));

  return (
    <div className="space-y-12">
      <PageHeader title="Progress" description="Everything here is calculated from your sessions, completed topics, assessments, projects and proof of work." />

      <section aria-labelledby="summary-title">
        <h2 id="summary-title" className="sr-only">
          Summary
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Syllabus completed" value={`${pct(done.length, topics.length)}%`} hint={`${done.length} of ${topics.length} topics`} />
          <Stat label="Plan completed" value={`${pct(inPlan.filter((x) => isDone(x.status)).length, inPlan.length)}%`} hint={`${inPlan.length} topics planned`} />
          <Stat label="Mastered" value={`${pct(mastered.length, Math.max(1, done.length))}%`} hint={`${mastered.length} of ${done.length} completed topics`} />
          <Stat label="Learning time" value={formatMinutes(sessions.minutes)} hint={`${sessions.count} sessions`} />
          <Stat label="Current streak" value={`${streak.current} ${streak.current === 1 ? "day" : "days"}`} hint={`Longest ${streak.longest}`} />
          <Stat label="Revision backlog" value={String(topics.filter((x) => x.status === "needs_revision").length + pendingReviews)} hint={`${pendingReviews} reviews due, ${topics.filter((x) => x.status === "needs_revision").length} topics flagged`} />
        </div>
      </section>

      <Section title="Deadline progress" description={`Day ${elapsed} of ${totalDays} since your plan started.`}>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-[13px] text-ink-2">
              <span>Time elapsed</span>
              <span className="tnum">{pct(elapsed, totalDays)}%</span>
            </div>
            <ProgressBar value={elapsed} max={totalDays} tone="ink" label="Time elapsed" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[13px] text-ink-2">
              <span>Planned topics completed</span>
              <span className="tnum">{pct(inPlan.filter((x) => isDone(x.status)).length, inPlan.length)}%</span>
            </div>
            <ProgressBar value={inPlan.filter((x) => isDone(x.status)).length} max={inPlan.length} label="Planned topics completed" />
          </div>
        </div>
      </Section>

      <Section title="Learning activity" description={`Days with a meaningful learning event: a session of 10+ minutes, a submitted project or proof, or a mastery assessment. ${active28} active days in the last 4 weeks.`}>
        <Panel className="p-4 sm:p-5">
          <Heatmap weeks={weeks} monthLabels={monthLabels} />
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-3">Active days</dt>
              <dd className="tnum mt-0.5 font-semibold">{streak.activeDays}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Weekly consistency</dt>
              <dd className="tnum mt-0.5 font-semibold">{(active28 / 4).toFixed(1)} days/week</dd>
            </div>
            {[...months.entries()]
              .sort()
              .slice(-2)
              .map(([m, v]) => (
                <div key={m}>
                  <dt className="text-ink-3">{formatDate(`${m}-01`, { month: "long" })}</dt>
                  <dd className="tnum mt-0.5 font-semibold">
                    {formatMinutes(v.minutes)}, {v.days} days
                  </dd>
                </div>
              ))}
          </dl>
        </Panel>
      </Section>

      <div className="grid gap-12 lg:grid-cols-2">
        <Section title="Topics completed over time" description="Your cumulative completions against the steady pace needed to finish the plan.">
          <Panel className="p-4">
            <TrendLine points={points} target={inPlan.length} todayIndex={todayIndex} />
            <div className="mt-3 flex flex-wrap gap-4">
              <LegendItem swatch="line">Completed</LegendItem>
              <LegendItem swatch="dashed">Planned pace</LegendItem>
            </div>
            <DataTable caption="Cumulative topics completed by day" head={["Date", "Completed", "Planned pace"]} rows={points.filter((p) => p.actual != null).map((p) => [p.label, p.actual ?? "", p.plan])} />
          </Panel>
        </Section>
        <Section title="Learning hours per week">
          <Panel className="p-4">
            <Columns data={weekly} unit="h" />
            <DataTable caption="Learning hours per week" head={["Week", "Hours"]} rows={weekly.map((w) => [w.label, w.value])} />
          </Panel>
        </Section>
      </div>

      <Section title="Completion by domain" description="Completed topics out of all topics in each domain.">
        <Panel className="p-4 sm:p-5">
          <HBarList rows={domainRows} />
          <DataTable caption="Completion by domain" head={["Domain", "Completed", "Total", "Mastered", "In plan"]} rows={tree.filter((d) => !d.isSpecialization).map((d) => [`${d.code}. ${d.title}`, d.done, d.topics.length, d.mastered, d.inPlan])} />
        </Panel>
      </Section>

      <div className="grid gap-12 lg:grid-cols-2">
        <Section title="Projects">
          <dl className="divide-y divide-line border-y border-line">
            {PROJECT_STATUSES.map((s) => (
              <div key={s} className="flex justify-between py-2.5 text-sm">
                <dt className="text-ink-2">{PROJECT_STATUS_LABEL[s]}</dt>
                <dd className="tnum font-medium">{projects.filter((p) => p.status === s).length}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Proof of work submissions" description={`${proofs.length} total, ${new Set(proofs.map((p) => p.topicId).filter(Boolean)).size} topics with evidence`}>
          <dl className="divide-y divide-line border-y border-line">
            {PROOF_TYPES.filter((p) => proofs.some((x) => x.type === p.value)).map((p) => (
              <div key={p.value} className="flex justify-between py-2.5 text-sm">
                <dt className="text-ink-2">{p.label}</dt>
                <dd className="tnum font-medium">{proofs.filter((x) => x.type === p.value).length}</dd>
              </div>
            ))}
            {!proofs.length && <p className="py-3 text-sm text-ink-3">No submissions yet.</p>}
          </dl>
        </Section>
      </div>
    </div>
  );
}
