import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DEADLINE, addDays, formatDate, formatMinutes, todayIn } from "@/lib/dates";
import { EmptyState, PageHeader, ProgressBar, Section, buttonClass } from "@/components/ui";
import { TaskList } from "@/components/client/task-list";
import { AddTaskForm, LogTimeForm } from "@/components/client/planner-forms";
import { requireOnboardedUser } from "@/server/auth";
import { getPathTree } from "@/server/data";
import { enrichItems } from "@/server/items";
import { getItemsBetween } from "@/server/stats";
import { isDone } from "@/lib/status";

export const metadata: Metadata = { title: "Today" };

const GROUPS = [
  { kinds: ["learn"], title: "Learning", description: "New topics from your roadmap, in syllabus order." },
  { kinds: ["review"], title: "Revision", description: "Spaced review of what you studied recently." },
  { kinds: ["assessment"], title: "Assessments", description: "Check mastery with evidence, not just ticks." },
  { kinds: ["project"], title: "Project work", description: "The weekend project built from this week's topics." },
  { kinds: ["custom"], title: "Your tasks", description: undefined },
];

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const { date: dateParam } = await searchParams;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const tree = getPathTree(user.id, user.pathId);
  const raw = getItemsBetween(user.id, date, date).filter((i) => i.status !== "rescheduled");
  const items = enrichItems(raw, tree, user.id);
  const total = items.reduce((n, i) => n + i.minutes, 0);
  const done = items.filter((i) => i.status === "done").reduce((n, i) => n + i.minutes, 0);
  const moved = getItemsBetween(user.id, date, date).filter((i) => i.status === "rescheduled");
  const topicOptions = tree
    .filter((d) => !d.isSpecialization)
    .flatMap((d) => d.topics.filter((tp) => !isDone(tp.status) && !tp.locked).map((tp) => ({ id: tp.id, label: `${tp.code} ${tp.title}` })))
    .slice(0, 400);
  const isToday = date === today;
  const title = isToday ? "Today" : formatDate(date, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={isToday ? formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : date < today ? "Past day" : "Upcoming day"}
        title={title}
        description={total ? `${formatMinutes(done)} of ${formatMinutes(total)} done.` : "Nothing is scheduled for this day."}
        actions={
          <nav aria-label="Change day" className="flex items-center gap-1">
            <Link href={`/today?date=${addDays(date, -1)}`} className={buttonClass("secondary", "md", "w-10 px-0")} aria-label="Previous day">
              <ChevronLeft className="size-4" />
            </Link>
            {!isToday && (
              <Link href="/today" className={buttonClass("secondary")}>
                Today
              </Link>
            )}
            <Link href={`/today?date=${addDays(date, 1)}`} className={buttonClass("secondary", "md", "w-10 px-0")} aria-label="Next day" aria-disabled={date >= DEADLINE}>
              <ChevronRight className="size-4" />
            </Link>
          </nav>
        }
      />
      {total > 0 && <ProgressBar value={done} max={total} label="Day progress" />}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          {items.length === 0 && (
            <EmptyState title={isToday ? "A free day" : "Nothing scheduled"}>
              {date > DEADLINE ? "This is after the plan's deadline." : "Add your own task, log time on any topic, or move work here from another day."}
            </EmptyState>
          )}
          {GROUPS.map((g) => {
            const list = items.filter((i) => g.kinds.includes(i.kind));
            if (!list.length) return null;
            return (
              <Section key={g.title} title={g.title} description={g.description} id={`group-${g.kinds[0]}`}>
                <TaskList items={list} today={today} />
              </Section>
            );
          })}
          {moved.length > 0 && (
            <details className="text-sm">
              <summary className="text-ink-3 hover:text-ink">
                {moved.length} {moved.length === 1 ? "task was" : "tasks were"} not finished and moved forward
              </summary>
              <ul className="mt-2 space-y-1 text-ink-3">
                {moved.map((m) => (
                  <li key={m.id}>
                    {m.title} <span className="tnum">({formatMinutes(m.minutes)})</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <aside className="space-y-8" aria-label="Planner tools">
          <Section title="Log learning time" description="Studied something off-plan? Record it here.">
            <LogTimeForm topics={topicOptions} />
          </Section>
          <Section title="Add a task">
            <AddTaskForm date={date < today ? today : date} topics={topicOptions} />
          </Section>
        </aside>
      </div>
    </div>
  );
}
