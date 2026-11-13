import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { ExternalLink, Lock } from "lucide-react";
import { db, t } from "@/db";
import { formatDate, formatMinutes, dateIn } from "@/lib/dates";
import { BUCKET_LABEL, PROJECT_STATUS_LABEL, TIER_LABEL, type ProjectStatus } from "@/lib/status";
import { MASTERY_CRITERIA, RATING_LABELS } from "@/lib/mastery";
import { exercisesFor, objectivesFor, rankResources } from "@/lib/topic-content";
import { EmptyState, Section, StatusPill, Tag, cx } from "@/components/ui";
import { TopicActions } from "@/components/client/topic-actions";
import { ConceptChecklist } from "@/components/client/concept-checklist";
import { NotesEditor } from "@/components/client/notes-editor";
import { ProofForm } from "@/components/client/proof-form";
import { ProofList } from "@/components/client/proof-list";
import { MasteryForm } from "@/components/client/mastery-form";
import { LogTimeForm } from "@/components/client/planner-forms";
import { requireOnboardedUser } from "@/server/auth";
import { getPathTree } from "@/server/data";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  const topic = db.select({ title: t.topics.title }).from(t.topics).where(eq(t.topics.id, topicId)).get();
  return { title: topic?.title ?? "Topic" };
}

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const user = await requireOnboardedUser();
  const { topicId } = await params;
  const tree = getPathTree(user.id, user.pathId);
  const domain = tree.find((d) => d.topics.some((x) => x.id === topicId));
  if (!domain) notFound(); // also hides other learners' paths
  const topic = domain.topics.find((x) => x.id === topicId)!;
  const parent = domain.parents.find((p) => p.id === topic.parentId)!;
  const allTopics = tree.flatMap((d) => d.topics);
  const idx = allTopics.findIndex((x) => x.id === topicId);
  const prev = allTopics[idx - 1];
  const next = allTopics[idx + 1];

  const subtopics = db.select().from(t.subtopics).where(eq(t.subtopics.topicId, topicId)).orderBy(t.subtopics.sort).all();
  const subDone = new Set(
    db
      .select({ id: t.subtopicProgress.subtopicId })
      .from(t.subtopicProgress)
      .where(and(eq(t.subtopicProgress.userId, user.id), eq(t.subtopicProgress.done, true), inArray(t.subtopicProgress.subtopicId, subtopics.map((s) => s.id).concat("_"))))
      .all()
      .map((r) => r.id),
  );
  const progress = db.select().from(t.topicProgress).where(and(eq(t.topicProgress.userId, user.id), eq(t.topicProgress.topicId, topicId))).get();
  const resources = db
    .select()
    .from(t.resources)
    .where(and(eq(t.resources.pathId, user.pathId), or(eq(t.resources.domainId, domain.id), isNull(t.resources.domainId))))
    .all();
  const domainResources = resources.filter((r) => r.domainId === domain.id);
  const topicText = `${topic.title} ${parent.title} ${subtopics.map((s) => `${s.title} ${s.concepts}`).join(" ")}`;
  const ranked = rankResources(topicText, domainResources);
  const states = new Map(db.select().from(t.resourceStates).where(eq(t.resourceStates.userId, user.id)).all().map((s) => [s.resourceId, s]));

  const projects = db
    .select()
    .from(t.projects)
    .where(eq(t.projects.userId, user.id))
    .all()
    .filter((p) => (JSON.parse(p.topicIds) as string[]).includes(topicId));
  const myProofs = db.select().from(t.proofs).where(eq(t.proofs.userId, user.id)).orderBy(desc(t.proofs.submittedAt)).all();
  const topicProofs = myProofs.filter((p) => p.topicId === topicId);
  const assessments = db
    .select()
    .from(t.masteryAssessments)
    .where(and(eq(t.masteryAssessments.userId, user.id), eq(t.masteryAssessments.topicId, topicId)))
    .orderBy(desc(t.masteryAssessments.createdAt))
    .all();
  const sessions = db
    .select()
    .from(t.learningSessions)
    .where(and(eq(t.learningSessions.userId, user.id), eq(t.learningSessions.topicId, topicId)))
    .orderBy(desc(t.learningSessions.startedAt))
    .all()
    .filter((s) => s.endedAt);

  const subs = subtopics.map((s) => ({ id: s.id, title: s.title, concepts: JSON.parse(s.concepts) as string[], done: subDone.has(s.id) }));
  const objectives = objectivesFor(user.pathId, topic.title, subs);
  const exercises = exercisesFor(user.pathId, topic.title, subs);
  const criteria = MASTERY_CRITERIA[user.pathId];
  const projectOptions = db.select({ id: t.projects.id, title: t.projects.title }).from(t.projects).where(eq(t.projects.userId, user.id)).all();

  return (
    <article className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/roadmap" className="hover:text-ink">
              Roadmap
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/roadmap#${domain.id}`} className="hover:text-ink">
              Domain {domain.code}: {domain.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink-2">
            {parent.code} {parent.title}
          </li>
        </ol>
      </nav>

      <header className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tnum text-sm text-ink-3">{topic.code}</span>
          <StatusPill status={topic.display} />
          <Tag tone="muted">{TIER_LABEL[topic.tier]}</Tag>
          <Tag tone={topic.bucket === "continued" ? "neutral" : "accent"}>{BUCKET_LABEL[topic.bucket]}</Tag>
        </div>
        <h1 className="mt-3 font-serif text-[2.1rem] leading-[1.15] tracking-[-0.01em] text-ink sm:text-[2.6rem]">{topic.title}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          Part of <strong className="font-medium text-ink">{parent.title}</strong> in Domain {domain.code}, {domain.title}. {domain.whyText.split("\n\n")[0]}
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-ink-3">Estimated effort</dt>
            <dd className="tnum mt-0.5 font-medium">{formatMinutes(topic.estMinutes)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Time spent</dt>
            <dd className="tnum mt-0.5 font-medium">{formatMinutes(progress?.minutesSpent ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Concepts checked</dt>
            <dd className="tnum mt-0.5 font-medium">
              {subs.filter((s) => s.done).length}/{subs.length}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Depth target</dt>
            <dd className="mt-0.5 font-medium">{domain.depthText || "—"}</dd>
          </div>
        </dl>
        {topic.locked ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
            <Lock className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <div>
              <p className="font-medium text-ink">Blocked by prerequisites</p>
              <p className="mt-1">
                Complete at least half of the planned topics in{" "}
                {domain.missingPrereqs.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && " and "}
                    <Link className="underline underline-offset-2" href={`/roadmap#${m.id}`}>
                      Domain {m.code}: {m.title}
                    </Link>{" "}
                    ({Math.round(m.ratio * 100)}% done)
                  </span>
                ))}
                .
              </p>
            </div>
          </div>
        ) : (
          <TopicActions topicId={topic.id} status={topic.status} />
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <Section id="objectives" title="Learning objectives">
            <ul className="space-y-1.5 text-[15px] text-ink-2">
              {objectives.map((o) => (
                <li key={o} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {o}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="concepts" title="Concepts to understand" description="Your completion checklist. Tick each one when you can explain it without notes.">
            {subs.length ? <ConceptChecklist subtopics={subs} disabled={topic.locked} /> : <p className="text-sm text-ink-3">This topic has no listed subtopics.</p>}
          </Section>

          <Section id="exercises" title="Practical exercises">
            <ol className="space-y-4">
              {exercises.map((e, i) => (
                <li key={e.title} className="flex gap-3.5">
                  <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-[12px] text-ink-2">{i + 1}</span>
                  <div>
                    <div className="font-medium text-ink">{e.title}</div>
                    <p className="mt-0.5 text-[14.5px] leading-relaxed text-ink-2">{e.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="resources" title="Recommended resources" description={`From the Domain ${domain.code} reading list, ordered by relevance to this topic.`}>
            {ranked.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {ranked.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
                        {r.name}
                        <ExternalLink className="size-3.5 text-ink-3" />
                      </a>
                      <div className="text-[13px] text-ink-3">
                        {r.creator}
                        {r.creator && r.type ? ", " : ""}
                        {r.type}
                      </div>
                      {r.what && <p className="mt-1 text-[14px] text-ink-2">{r.what}</p>}
                    </div>
                    {states.get(r.id)?.read && <Tag tone="accent">Read</Tag>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No resources listed for this domain" />
            )}
            {ranked.length > 6 && (
              <Link href={`/resources?domain=${domain.id}`} className="mt-3 inline-block text-sm text-ink-2 hover:text-ink">
                All {ranked.length} resources for Domain {domain.code}
              </Link>
            )}
          </Section>

          <Section id="notes" title="Personal notes">
            <NotesEditor topicId={topic.id} initial={progress?.notes ?? ""} />
          </Section>

          <Section id="proof" title="Proof of work" description="Evidence that you can actually do this: repositories, live links, Figma files, screenshots or written explanations.">
            <ProofList proofs={topicProofs.map((p) => ({ ...p, topicTitle: null, projectTitle: projectOptions.find((x) => x.id === p.projectId)?.title ?? null }))} compact />
            <details className="mt-4 rounded-xl border border-line bg-surface">
              <summary className="px-4 py-3 text-sm font-medium">Add proof of work</summary>
              <div className="border-t border-line p-4">
                <ProofForm pathId={user.pathId} fixedTopic={{ id: topic.id, label: topic.title }} projects={projectOptions} />
              </div>
            </details>
          </Section>

          <Section id="mastery" title="Mastery assessment" description="Completion means you studied it. Mastery means you can prove it: every criterion at 'independently' or higher, plus linked proof of work.">
            <MasteryForm
              topicId={topic.id}
              criteria={criteria}
              status={topic.status}
              proofs={myProofs.map((p) => ({ id: p.id, title: p.title, type: p.type, linked: p.topicId === topic.id }))}
            />
            {assessments.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold">Assessment history</h3>
                <ul className="divide-y divide-line border-y border-line">
                  {assessments.map((a) => {
                    const ratings = JSON.parse(a.ratings) as Record<string, number>;
                    return (
                      <li key={a.id} className="py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className={cx("font-medium", a.passed ? "text-st-completed" : "text-st-revision")}>{a.passed ? "Mastered" : "Not yet mastered"}</span>
                          <span className="text-[13px] text-ink-3">{formatDate(dateIn(a.createdAt, user.timezone))}</span>
                        </div>
                        <p className="mt-1 text-[13px] text-ink-3">{criteria.map((c) => `${c.label}: ${RATING_LABELS[ratings[c.key] ?? 0] || "—"}`).join("; ")}</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-ink-2">{a.explanation}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Section>
        </div>

        <aside className="min-w-0 space-y-8 lg:sticky lg:top-8 lg:self-start" aria-label="Topic context">
          <Section title="Prerequisites">
            {domain.prereqIds.length ? (
              <ul className="space-y-2 text-sm">
                {domain.prereqIds.map((id) => {
                  const pd = tree.find((d) => d.id === id);
                  if (!pd) return null;
                  const met = !domain.missingPrereqs.some((m) => m.id === id);
                  return (
                    <li key={id} className="flex items-start gap-2">
                      <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", met ? "bg-st-completed" : "bg-st-blocked/60")} aria-hidden="true" />
                      <Link href={`/roadmap#${id}`} className="text-ink-2 hover:text-ink">
                        Domain {pd.code}: {pd.title}
                        <span className="block text-[12.5px] text-ink-3">{met ? "Met" : "Not yet met"}, {pd.done}/{pd.topics.length} topics done</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">{domain.prereqText || "None."}</p>
            )}
            {domain.prereqText && domain.prereqIds.length > 0 && <p className="mt-2 text-[12.5px] text-ink-3">{domain.prereqText}</p>}
          </Section>

          <Section title="Related projects">
            {projects.length ? (
              <ul className="space-y-2 text-sm">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="text-ink-2 hover:text-ink">
                      {p.title}
                      <span className="block text-[12.5px] text-ink-3">
                        {PROJECT_STATUS_LABEL[p.status as ProjectStatus]}, due {formatDate(p.dueDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">This topic will be part of the weekend project for the week you study it.</p>
            )}
          </Section>

          <Section title="Log time">
            <LogTimeForm fixedTopicId={topic.id} />
          </Section>

          <Section title="Sessions">
            {sessions.length ? (
              <ul className="space-y-2 text-sm">
                {sessions.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 text-ink-2">
                    <span className="truncate">{formatDate(dateIn(s.startedAt, user.timezone))}</span>
                    <span className="tnum shrink-0">{formatMinutes(s.minutes)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No sessions yet.</p>
            )}
          </Section>

          <nav aria-label="Adjacent topics" className="space-y-2 border-t border-line pt-4 text-sm">
            {prev && (
              <Link href={`/roadmap/${prev.id}`} className="block text-ink-2 hover:text-ink">
                <span className="block text-[12.5px] text-ink-3">Previous</span>
                {prev.code} {prev.title}
              </Link>
            )}
            {next && (
              <Link href={`/roadmap/${next.id}`} className="block text-ink-2 hover:text-ink">
                <span className="block text-[12.5px] text-ink-3">Next</span>
                {next.code} {next.title}
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </article>
  );
}
