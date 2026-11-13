import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Flame, Lock } from "lucide-react";
import { DEADLINE, addDays, dateRange, formatDate, formatMinutes, todayIn } from "@/lib/dates";
import { BUCKET_LABEL, PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/status";
import { ButtonLink, EmptyState, ProgressBar, Section, StatusPill, Tag, cx } from "@/components/ui";
import { Runway, type RunwayDay } from "@/components/client/charts";
import { TaskList } from "@/components/client/task-list";
import { StartSessionButton } from "@/components/client/start-session";
import { requireOnboardedUser } from "@/server/auth";
import { getPath, getRecentActivity } from "@/server/data";
import { enrichItems } from "@/server/items";
import { getDaySummaries, getOverview, planStartDate } from "@/server/stats";

export const metadata: Metadata = { title: "Overview" };

function greeting(tz: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date()));
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function OverviewPage() {
  const user = await requireOnboardedUser();
  const path = getPath(user.pathId);
  const o = getOverview(user);
  const today = todayIn(user.timezone);
  const start = planStartDate(user) < today ? planStartDate(user) : today;
  const summaries = getDaySummaries(user, start, DEADLINE);
  const runway: RunwayDay[] = dateRange(start, DEADLINE).map((d, i, all) => {
    const s = summaries.get(d);
    const monthChanged = i === 0 || d.slice(5, 7) !== all[i - 1].slice(5, 7);
    return {
      date: d,
      label: formatDate(d),
      done: s?.done ?? 0,
      missed: s?.missed ?? 0,
      planned: s?.planned ?? 0,
      isToday: d === today,
      isPast: d < today,
      hasProject: !!s?.hasProject,
      monthLabel: monthChanged ? formatDate(d, { month: "short" }) : undefined,
    };
  });
  const items = enrichItems(o.todayItems, o.tree, user.id);
  const todayMinutes = items.reduce((n, i) => n + i.minutes, 0);
  const todayDone = items.filter((i) => i.status === "done").reduce((n, i) => n + i.minutes, 0);
  const activity = getRecentActivity(user.id, 6);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const nextDomain = o.next ? o.tree.find((d) => d.id === o.next!.domainId) : undefined;

  const paceText =
    o.pace == null
      ? "Your plan starts today. Finishing today's tasks keeps you on track."
      : o.pace >= 0.85
        ? `On track: ${pct(o.pace, 1)}% of the last 7 days' scheduled work is done.`
        : o.pace >= 0.6
          ? `Slightly behind: ${pct(o.pace, 1)}% of the last 7 days' work is done. Unfinished tasks were moved forward.`
          : `Behind: only ${pct(o.pace, 1)}% of the last 7 days' work is done. Consider lowering your daily hours in Settings so the plan stays honest.`;

  return (
    <div className="space-y-10">
      {/* Where am I */}
      <header className="animate-rise">
        <p className="text-sm text-ink-3">
          {greeting(user.timezone)}, {user.name.split(" ")[0]}
        </p>
        <h1 className="mt-1 text-[1.9rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.25rem]">{path.role}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-2">
          {o.currentDomain ? (
            <>
              {o.currentDomain.stage}. You&apos;re working through <span className="font-medium text-ink">Domain {o.currentDomain.code}: {o.currentDomain.title}</span>.
            </>
          ) : (
            "Every topic in your plan is complete. Keep going with stretch goals and continued learning."
          )}
        </p>
      </header>

      {user.planNote && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-ink-3" />
          <span>{user.planNote}</span>
        </div>
      )}

      {/* Am I on track */}
      <section aria-labelledby="runway-title">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 id="runway-title" className="text-xl font-semibold tracking-tight">
            {o.daysLeft} {o.daysLeft === 1 ? "day" : "days"} until December 31
          </h2>
          <p className="text-sm text-ink-2">{paceText}</p>
        </div>
        <Runway days={runway} />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0 space-y-10">
          {/* What should I learn next */}
          {o.next && (
            <section aria-labelledby="next-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                <span id="next-title">Next recommended topic</span>
                {nextDomain && <span>Domain {nextDomain.code}: {nextDomain.title}</span>}
              </div>
              <Link href={`/roadmap/${o.next.id}`} className="mt-2 block font-serif text-[1.65rem] leading-snug text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4">
                {o.next.title}
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill status={o.next.display} />
                <Tag>{formatMinutes(o.next.estMinutes)} estimated</Tag>
                {o.next.subtopicCount > 0 && (
                  <Tag tone="muted">
                    {o.next.subtopicsDone}/{o.next.subtopicCount} concepts checked
                  </Tag>
                )}
                <Tag tone="muted">{BUCKET_LABEL[o.next.bucket]}</Tag>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {o.next.locked ? (
                  <p className="inline-flex items-center gap-1.5 text-sm text-ink-3">
                    <Lock className="size-4" /> Complete prerequisites first
                  </p>
                ) : (
                  <StartSessionButton topicId={o.next.id} />
                )}
                <ButtonLink href={`/roadmap/${o.next.id}`} variant="secondary">
                  Open workspace
                </ButtonLink>
              </div>
            </section>
          )}

          <Section
            id="today"
            title="Today's targets"
            description={todayMinutes ? `${formatMinutes(todayDone)} of ${formatMinutes(todayMinutes)} done` : undefined}
            action={
              <Link href="/today" className="text-ink-2 hover:text-ink">
                Open planner
              </Link>
            }
          >
            <TaskList
              items={items}
              today={today}
              empty={
                <EmptyState title="Nothing scheduled today" action={<ButtonLink href="/roadmap">Browse the roadmap</ButtonLink>}>
                  Use the time to revise, add proof of work, or pick a topic from the roadmap.
                </EmptyState>
              }
            />
          </Section>

          <Section
            id="projects"
            title="Upcoming projects"
            action={
              <Link href="/projects" className="text-ink-2 hover:text-ink">
                All projects
              </Link>
            }
          >
            {o.projects.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {o.projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-surface-2/50">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{p.title}</div>
                        <div className="text-[13px] text-ink-3">
                          {p.level}, due {formatDate(p.dueDate)}
                        </div>
                      </div>
                      <Tag tone={p.status === "planned" ? "muted" : "accent"}>{PROJECT_STATUS_LABEL[p.status as ProjectStatus]}</Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No open projects">Weekend projects appear here as your plan progresses.</EmptyState>
            )}
          </Section>
        </div>

        <aside className="min-w-0 space-y-10" aria-label="Progress summary">
          {/* What have I completed / mastered */}
          <Section id="numbers" title="Your progress">
            <dl className="divide-y divide-line border-y border-line">
              <Row label="Topics completed" value={`${o.counts.done} of ${o.counts.total}`} sub={`${pct(o.counts.done, o.counts.total)}% of the full syllabus`} />
              <Row label="Plan completed" value={`${pct(o.counts.inPlanDone, o.counts.inPlan)}%`} sub={`${o.counts.inPlanDone} of ${o.counts.inPlan} topics planned before Dec 31`} bar={pct(o.counts.inPlanDone, o.counts.inPlan)} />
              <Row label="Mastered" value={String(o.counts.mastered)} sub="Backed by assessment and proof" />
              <Row label="Learning now" value={String(o.counts.learning)} />
              <Row label="Needs revision" value={String(o.counts.revision)} warn={o.counts.revision > 0} />
              <Row label="This week" value={`${pct(o.week.done, o.week.planned)}%`} sub={`${formatMinutes(o.week.done)} of ${formatMinutes(o.week.planned)} scheduled`} bar={pct(o.week.done, o.week.planned)} />
              <Row
                label="Streak"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Flame className={cx("size-4", o.streak.current ? "text-accent" : "text-ink-3")} /> {o.streak.current} {o.streak.current === 1 ? "day" : "days"}
                  </span>
                }
                sub={`Longest ${o.streak.longest} ${o.streak.longest === 1 ? "day" : "days"}`}
              />
              <Row label="Learning time" value={formatMinutes(o.sessions.minutes)} sub={`${o.sessions.count} sessions`} />
              <Row label="Continued learning" value={String(o.counts.continued)} sub="Topics beyond this plan, kept for 2027" />
            </dl>
          </Section>

          {o.currentDomain && (
            <Section id="stage" title="Current domain">
              <Link href={`/roadmap#${o.currentDomain.id}`} className="group block">
                <div className="text-[13px] text-ink-3">{o.currentDomain.stage}</div>
                <div className="mt-0.5 font-medium text-ink group-hover:underline">
                  Domain {o.currentDomain.code}: {o.currentDomain.title}
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <ProgressBar value={o.currentDomain.done} max={o.currentDomain.topics.length} label={`Domain ${o.currentDomain.code} progress`} />
                  <span className="tnum shrink-0 text-[13px] text-ink-2">
                    {o.currentDomain.done}/{o.currentDomain.topics.length}
                  </span>
                </div>
              </Link>
            </Section>
          )}

          <Section
            id="activity"
            title="Recent activity"
            action={
              <Link href="/progress" className="text-ink-2 hover:text-ink">
                Progress
              </Link>
            }
          >
            {activity.length ? (
              <ol className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", a.countsForStreak ? "bg-accent" : "bg-line-strong")} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-ink-2">{a.label}</div>
                      <div className="text-[12.5px] text-ink-3">
                        {a.date === today ? "Today" : a.date === addDays(today, -1) ? "Yesterday" : formatDate(a.date)}
                        {a.minutes ? `, ${formatMinutes(a.minutes)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-3">Your learning sessions, proof of work and assessments will show up here.</p>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, sub, bar, warn }: { label: string; value: React.ReactNode; sub?: string; bar?: number; warn?: boolean }) {
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm text-ink-2">{label}</dt>
        <dd className={cx("text-[15px] font-semibold", warn ? "text-st-revision" : "text-ink")}>{value}</dd>
      </div>
      {sub && <div className="mt-0.5 text-[12.5px] text-ink-3">{sub}</div>}
      {bar != null && <ProgressBar value={bar} className="mt-2" label={label} />}
    </div>
  );
}

