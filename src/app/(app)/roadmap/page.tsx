import type { Metadata } from "next";
import { db, t } from "@/db";
import { PageHeader } from "@/components/ui";
import { RoadmapExplorer, type RoadmapDomain } from "@/components/client/roadmap-explorer";
import { renderSyllabusMarkdown } from "@/lib/markdown";
import { requireOnboardedUser } from "@/server/auth";
import { getPath, getPathTree } from "@/server/data";
import { isDone } from "@/lib/status";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const user = await requireOnboardedUser();
  const path = getPath(user.pathId);
  const tree = getPathTree(user.id, user.pathId);
  const subtopics = db.select({ topicId: t.subtopics.topicId, title: t.subtopics.title }).from(t.subtopics).all();
  const subIndex = new Map<string, string[]>();
  for (const s of subtopics) subIndex.set(s.topicId, [...(subIndex.get(s.topicId) ?? []), s.title]);

  const domains: RoadmapDomain[] = tree.map((d) => ({
    id: d.id,
    code: d.code,
    title: d.title,
    stage: d.stage,
    why: d.whyText,
    label: d.labelText,
    depth: d.depthText,
    prereqText: d.prereqText,
    isSpecialization: d.isSpecialization,
    missingPrereqs: d.missingPrereqs.map((m) => ({ code: m.code, title: m.title, pct: Math.round(m.ratio * 100) })),
    done: d.done,
    total: d.topics.length,
    parents: d.parents.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      tier: p.tier,
      topics: p.topics.map((tp) => ({
        id: tp.id,
        code: tp.code,
        title: tp.title,
        display: tp.display,
        status: tp.status,
        tier: tp.tier,
        bucket: tp.bucket,
        est: tp.estMinutes,
        subDone: tp.subtopicsDone,
        subTotal: tp.subtopicCount,
        search: `${tp.code} ${tp.title} ${(subIndex.get(tp.id) ?? []).join(" ")}`.toLowerCase(),
      })),
    })),
  }));
  const all = tree.flatMap((d) => d.topics);
  const current = all.find((x) => x.bucket !== "continued" && !isDone(x.status))?.domainId ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Complete syllabus"
        title={path.title}
        description={`${tree.filter((d) => !d.isSpecialization).length} domains, ${all.length} topics and ${all.reduce((n, x) => n + x.subtopicCount, 0)} concepts, in the order the syllabus teaches them. Domains unlock when you finish half of the planned topics in their prerequisites.`}
      />
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="flex items-center justify-between px-4 py-3 text-sm font-medium text-ink sm:px-5">
          About this profession and the learning sequence
          <span className="text-ink-3 group-open:rotate-180" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="border-t border-line px-4 py-5 sm:px-6">
          <div className="prose-gw" dangerouslySetInnerHTML={{ __html: renderSyllabusMarkdown(path.introMd) }} />
          <div className="prose-gw" dangerouslySetInnerHTML={{ __html: renderSyllabusMarkdown(path.sequenceMd) }} />
          <h2 className="mt-8 mb-2 text-[1.05rem] font-semibold">Timeless knowledge vs. current tools</h2>
          <div className="prose-gw" dangerouslySetInnerHTML={{ __html: renderSyllabusMarkdown(path.timelessMd) }} />
        </div>
      </details>
      <RoadmapExplorer domains={domains} currentDomainId={current} />
    </div>
  );
}
