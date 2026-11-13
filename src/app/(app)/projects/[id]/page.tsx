import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { formatDate, formatMinutes, todayIn, daysBetween } from "@/lib/dates";
import { Section, StatusDot, Tag } from "@/components/ui";
import { ProjectWork } from "@/components/client/project-work";
import { ProofForm } from "@/components/client/proof-form";
import { ProofList } from "@/components/client/proof-list";
import { StartSessionButton } from "@/components/client/start-session";
import { requireOnboardedUser } from "@/server/auth";
import { getPathTree } from "@/server/data";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const project = db.select().from(t.projects).where(and(eq(t.projects.id, id), eq(t.projects.userId, user.id))).get();
  if (!project) notFound();
  const tree = getPathTree(user.id, user.pathId);
  const topicMap = new Map(tree.flatMap((d) => d.topics.map((tp) => [tp.id, { ...tp, domain: d }])));
  const topicIds = JSON.parse(project.topicIds) as string[];
  const related = topicIds.map((tid) => topicMap.get(tid)).filter((x) => !!x);
  const objectives = JSON.parse(project.objectives) as string[];
  const requirements = JSON.parse(project.requirements) as string[];
  const deliverables = JSON.parse(project.deliverables) as string[];
  const criteria = JSON.parse(project.criteria) as string[];
  const proofs = db.select().from(t.proofs).where(and(eq(t.proofs.userId, user.id), eq(t.proofs.projectId, project.id))).orderBy(desc(t.proofs.submittedAt)).all();
  const minutes = db
    .select({ minutes: t.learningSessions.minutes })
    .from(t.learningSessions)
    .where(and(eq(t.learningSessions.userId, user.id), eq(t.learningSessions.projectId, project.id)))
    .all()
    .reduce((n, s) => n + s.minutes, 0);
  const today = todayIn(user.timezone);
  const daysLeft = daysBetween(today, project.dueDate);
  const kindLabel = project.kind === "weekend" ? "Weekend project" : project.kind === "final" ? "Final portfolio" : "Stage capstone";

  return (
    <article className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
        <Link href="/projects" className="hover:text-ink">
          Projects
        </Link>{" "}
        / {kindLabel}
      </nav>
      <header className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
          <Tag tone="accent">{project.level}</Tag>
          <span>
            Due {formatDate(project.dueDate, { weekday: "long", month: "long", day: "numeric" })}
            {project.status !== "completed" && (daysLeft > 0 ? `, in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}` : daysLeft === 0 ? ", today" : `, ${-daysLeft} days overdue`)}
          </span>
          <span className="tnum">{formatMinutes(minutes)} logged</span>
        </div>
        <h1 className="mt-3 font-serif text-[2.1rem] leading-[1.15] tracking-[-0.01em] sm:text-[2.5rem]">{project.title}</h1>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2">{project.problem}</p>
        <div className="mt-5">
          <StartSessionButton projectId={project.id} label="Start working" />
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <Section title="Learning objectives">
            <BulletList items={objectives} />
          </Section>
          <Section title="Requirements">
            <ol className="space-y-2 text-[15px] text-ink-2">
              {requirements.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <span className="tnum w-5 shrink-0 text-right text-ink-3">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </Section>
          <div className="grid gap-10 sm:grid-cols-2">
            <Section title="Deliverables">
              <BulletList items={deliverables} />
            </Section>
            <Section title="Evaluation criteria">
              <BulletList items={criteria} />
            </Section>
          </div>

          <Section title="Proof of work" description="Required before you can submit.">
            <ProofList proofs={proofs.map((p) => ({ ...p, topicTitle: p.topicId ? (topicMap.get(p.topicId)?.title ?? null) : null, projectTitle: null }))} compact />
            <details className="mt-4 rounded-xl border border-line bg-surface" open={proofs.length === 0}>
              <summary className="px-4 py-3 text-sm font-medium">Add proof of work</summary>
              <div className="border-t border-line p-4">
                <ProofForm pathId={user.pathId} fixedProject={{ id: project.id, title: project.title }} topics={related.map((r) => ({ id: r.id, label: `${r.code} ${r.title}` }))} />
              </div>
            </details>
          </Section>

          <Section title="Your submission" description="Deliverable, self-assessment against each criterion, reflection and skills demonstrated.">
            <ProjectWork
              projectId={project.id}
              status={project.status}
              criteria={criteria}
              initial={{
                deliverableText: project.deliverableText,
                reflection: project.reflection,
                skills: project.skills,
                selfAssessment: JSON.parse(project.selfAssessment) as Record<string, number>,
              }}
              proofCount={proofs.length}
            />
          </Section>
        </div>

        <aside className="min-w-0 space-y-8 lg:sticky lg:top-8 lg:self-start" aria-label="Related topics">
          <Section title="Related syllabus topics" description={related.length ? `${related.filter((r) => ["completed", "mastered", "needs_revision"].includes(r.status)).length} of ${related.length} completed` : undefined}>
            {related.length ? (
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/roadmap/${r.id}`} className="flex items-start gap-2.5 text-sm text-ink-2 hover:text-ink">
                      <StatusDot status={r.display} className="mt-1.5" />
                      <span>
                        {r.title}
                        <span className="block text-[12px] text-ink-3">Domain {r.domain.code}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">This project covers your whole plan.</p>
            )}
          </Section>
        </aside>
      </div>
    </article>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-[15px] text-ink-2">
      {items.map((x, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}
