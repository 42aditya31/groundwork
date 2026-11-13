import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { formatDate, todayIn, weekStart, addDays } from "@/lib/dates";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/status";
import { EmptyState, PageHeader, Section, Tag } from "@/components/ui";
import { requireOnboardedUser } from "@/server/auth";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const all = db.select().from(t.projects).where(eq(t.projects.userId, user.id)).orderBy(asc(t.projects.dueDate), asc(t.projects.sort)).all();
  const proofCounts = new Map<string, number>();
  for (const p of db.select({ projectId: t.proofs.projectId }).from(t.proofs).where(eq(t.proofs.userId, user.id)).all())
    if (p.projectId) proofCounts.set(p.projectId, (proofCounts.get(p.projectId) ?? 0) + 1);

  const ws = weekStart(today);
  const thisWeek = all.filter((p) => p.kind === "weekend" && p.weekStart === ws && p.status !== "completed");
  const overdue = all.filter((p) => p.dueDate < today && p.status !== "completed" && !thisWeek.includes(p));
  const upcoming = all.filter((p) => p.kind === "weekend" && p.dueDate >= addDays(ws, 7) && p.status !== "completed");
  const capstones = all.filter((p) => (p.kind === "capstone" || p.kind === "final") && p.status !== "completed" && p.dueDate >= today);
  const done = all.filter((p) => p.status === "completed");

  const list = (items: typeof all) => (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/projects/${p.id}`} className="flex flex-col gap-2 px-4 py-4 hover:bg-surface-2/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[12.5px] text-ink-3">
                {p.level}, due {formatDate(p.dueDate)}
              </div>
              <div className="mt-0.5 font-medium text-ink">{p.title}</div>
              <p className="mt-1 line-clamp-2 max-w-2xl text-[14px] text-ink-2">{p.problem}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Tag tone="muted">
                {proofCounts.get(p.id) ?? 0} proof{(proofCounts.get(p.id) ?? 0) === 1 ? "" : "s"}
              </Tag>
              <Tag tone={p.status === "completed" ? "accent" : p.status === "planned" ? "neutral" : "accent"}>{PROJECT_STATUS_LABEL[p.status as ProjectStatus]}</Tag>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-10">
      <PageHeader
        title="Projects"
        description="Every weekend has a project built from the topics you studied that week, getting more ambitious each week. Stage capstones and the final portfolio come from your syllabus."
      />
      {overdue.length > 0 && (
        <Section title="Overdue" description="Past their due date and not completed yet.">
          {list(overdue)}
        </Section>
      )}
      <Section title="This weekend">
        {thisWeek.length ? list(thisWeek) : <EmptyState title="No weekend project this week">Projects are generated from the topics scheduled or completed during the week.</EmptyState>}
      </Section>
      {upcoming.length > 0 && (
        <Section title="Coming weekends" description="These update as your plan changes, until you start them.">
          {list(upcoming)}
        </Section>
      )}
      <Section title="Capstones and portfolio">{capstones.length ? list(capstones) : <EmptyState title="No open capstones" />}</Section>
      {done.length > 0 && <Section title="Completed">{list(done)}</Section>}
    </div>
  );
}
