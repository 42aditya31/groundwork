import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, gte, lte } from "drizzle-orm";
import { ArrowRightLeft, Check, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { db, t } from "@/db";
import { DEADLINE, addDays, addMonths, dateRange, formatDate, formatMinutes, monthStart, todayIn, weekStart } from "@/lib/dates";
import { PageHeader, buttonClass, cx } from "@/components/ui";
import { requireOnboardedUser } from "@/server/auth";
import { getItemsBetween } from "@/server/stats";

export const metadata: Metadata = { title: "Calendar" };

const KIND_STYLE: Record<string, { label: string; dot: string }> = {
  learn: { label: "Learning", dot: "bg-st-learning" },
  review: { label: "Revision", dot: "bg-st-practiced" },
  assessment: { label: "Assessment", dot: "bg-accent" },
  project: { label: "Weekend project", dot: "bg-ink" },
  custom: { label: "Your task", dot: "bg-ink-3" },
};

type Item = ReturnType<typeof getItemsBetween>[number];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const today = todayIn(user.timezone);
  const view = sp.view === "month" ? "month" : "week";
  const anchor = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  let from: string;
  let to: string;
  let prevDate: string;
  let nextDate: string;
  let title: string;
  if (view === "month") {
    const ms = monthStart(anchor);
    from = weekStart(ms);
    const me = addDays(addMonths(ms, 1), -1);
    to = addDays(weekStart(me), 6);
    prevDate = addMonths(ms, -1);
    nextDate = addMonths(ms, 1);
    title = formatDate(ms, { month: "long", year: "numeric" });
  } else {
    from = weekStart(anchor);
    to = addDays(from, 6);
    prevDate = addDays(from, -7);
    nextDate = addDays(from, 7);
    title = `${formatDate(from, { month: "short", day: "numeric" })} – ${formatDate(to, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  const items = getItemsBetween(user.id, from, to);
  const projects = db
    .select()
    .from(t.projects)
    .where(and(eq(t.projects.userId, user.id), gte(t.projects.dueDate, from), lte(t.projects.dueDate, to)))
    .all();
  const byDay = new Map<string, Item[]>();
  for (const i of items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  const milestones = new Map<string, string[]>();
  for (const p of projects) milestones.set(p.dueDate, [...(milestones.get(p.dueDate) ?? []), `${p.title} due`]);
  if (DEADLINE >= from && DEADLINE <= to) milestones.set(DEADLINE, [...(milestones.get(DEADLINE) ?? []), "Plan deadline"]);
  const days = dateRange(from, to);
  const q = (v: string, d: string) => `/calendar?view=${v}&date=${d}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Daily targets, weekend projects, revision, assessments and milestones from your live plan."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-line-strong p-0.5" role="group" aria-label="Calendar view">
              {(["week", "month"] as const).map((v) => (
                <Link key={v} href={q(v, anchor)} aria-current={view === v ? "true" : undefined} className={cx("rounded-md px-3 py-1.5 text-sm capitalize", view === v ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")}>
                  {v}
                </Link>
              ))}
            </div>
          </div>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <nav aria-label="Change period" className="flex items-center gap-1">
          <Link href={q(view, prevDate)} className={buttonClass("secondary", "md", "w-10 px-0")} aria-label={`Previous ${view}`}>
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={q(view, today)} className={buttonClass("secondary")}>
            Today
          </Link>
          <Link href={q(view, nextDate)} className={buttonClass("secondary", "md", "w-10 px-0")} aria-label={`Next ${view}`}>
            <ChevronRight className="size-4" />
          </Link>
        </nav>
      </div>

      <Legend />

      {view === "week" ? (
        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-7">
          {days.map((d) => (
            <li key={d} className={cx("min-h-28 bg-surface p-3", d === today && "bg-accent-soft/40")}>
              <DayHeader date={d} today={today} items={byDay.get(d) ?? []} milestones={milestones.get(d)} />
              <ul className="mt-2 space-y-1.5">
                {(byDay.get(d) ?? []).map((i) => (
                  <CalItem key={i.id} item={i} today={today} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-[12px] text-ink-3" aria-hidden="true">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <ol className="grid grid-cols-7 gap-px bg-line">
            {days.map((d) => {
              const list = byDay.get(d) ?? [];
              const outside = d.slice(0, 7) !== monthStart(anchor).slice(0, 7);
              const visible = list.filter((i) => i.status !== "rescheduled");
              return (
                <li key={d} className={cx("min-h-20 bg-surface p-1.5 sm:min-h-28 sm:p-2", outside && "bg-surface-2/60", d === today && "bg-accent-soft/40")}>
                  <Link href={`/today?date=${d}`} className="block h-full rounded-md focus-visible:outline-2" aria-label={`${formatDate(d, { weekday: "long", month: "long", day: "numeric" })}: ${visible.length} tasks`}>
                    <div className="flex items-center justify-between">
                      <span className={cx("tnum text-[13px]", d === today ? "flex size-6 items-center justify-center rounded-full bg-ink font-semibold text-bg" : outside ? "text-ink-3" : "text-ink-2")}>{Number(d.slice(8))}</span>
                      {milestones.get(d) && <Flag className="size-3.5 text-accent" aria-label={milestones.get(d)!.join(", ")} />}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {visible.slice(0, 6).map((i) => (
                        <span key={i.id} className={cx("size-1.5 rounded-full", i.status === "done" ? "bg-st-completed" : KIND_STYLE[i.kind]?.dot)} />
                      ))}
                    </div>
                    <ul className="mt-1 hidden space-y-0.5 sm:block">
                      {visible.slice(0, 3).map((i) => (
                        <li key={i.id} className={cx("flex items-center gap-1 truncate text-[11.5px]", i.status === "done" ? "text-ink-3 line-through" : i.date < today ? "text-st-revision" : "text-ink-2")}>
                          <span className={cx("size-1.5 shrink-0 rounded-full", KIND_STYLE[i.kind]?.dot)} />
                          <span className="truncate">{i.title}</span>
                        </li>
                      ))}
                      {visible.length > 3 && <li className="text-[11px] text-ink-3">+{visible.length - 3} more</li>}
                    </ul>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function DayHeader({ date, today, items, milestones }: { date: string; today: string; items: Item[]; milestones?: string[] }) {
  const active = items.filter((i) => i.status !== "rescheduled");
  const total = active.reduce((n, i) => n + i.minutes, 0);
  const done = active.filter((i) => i.status === "done").reduce((n, i) => n + i.minutes, 0);
  return (
    <div>
      <Link href={`/today?date=${date}`} className="flex items-baseline justify-between gap-2 hover:underline">
        <span className={cx("text-sm font-medium", date === today ? "text-ink" : "text-ink-2")}>
          {formatDate(date, { weekday: "short", day: "numeric", month: "short" })}
          {date === today && <span className="ml-1.5 text-[12px] font-normal text-accent">Today</span>}
        </span>
        {total > 0 && (
          <span className="tnum text-[12px] text-ink-3">
            {formatMinutes(done)}/{formatMinutes(total)}
          </span>
        )}
      </Link>
      {milestones?.map((m) => (
        <div key={m} className="mt-1 flex items-center gap-1 text-[12px] font-medium text-accent">
          <Flag className="size-3" /> {m}
        </div>
      ))}
    </div>
  );
}

function CalItem({ item, today }: { item: Item; today: string }) {
  const overdue = item.status === "planned" && item.date < today;
  const href = item.topicId ? `/roadmap/${item.topicId}` : item.projectId ? `/projects/${item.projectId}` : `/today?date=${item.date}`;
  return (
    <li>
      <Link
        href={href}
        className={cx(
          "flex items-start gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] leading-snug hover:bg-surface-2",
          item.status === "done" && "text-ink-3",
          item.status === "rescheduled" && "text-ink-3 opacity-70",
          overdue && "text-st-revision",
        )}
      >
        {item.status === "done" ? (
          <Check className="mt-0.5 size-3 shrink-0 text-st-completed" aria-label="Done" />
        ) : item.status === "rescheduled" ? (
          <ArrowRightLeft className="mt-0.5 size-3 shrink-0" aria-label="Moved forward" />
        ) : (
          <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", KIND_STYLE[item.kind]?.dot)} aria-hidden="true" />
        )}
        <span className={cx("min-w-0", item.status === "rescheduled" && "line-through")}>
          {item.title}
          <span className="tnum ml-1 text-ink-3">{formatMinutes(item.minutes)}</span>
          {overdue && <span className="sr-only"> (overdue)</span>}
        </span>
      </Link>
    </li>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
      {Object.values(KIND_STYLE).map((k) => (
        <span key={k.label} className="inline-flex items-center gap-1.5">
          <span className={cx("size-2 rounded-full", k.dot)} />
          {k.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <Check className="size-3 text-st-completed" /> Done
      </span>
      <span className="inline-flex items-center gap-1.5 text-st-revision">Overdue</span>
      <span className="inline-flex items-center gap-1.5">
        <ArrowRightLeft className="size-3" /> Moved forward
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Flag className="size-3 text-accent" /> Milestone
      </span>
    </div>
  );
}
