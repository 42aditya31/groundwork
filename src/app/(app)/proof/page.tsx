import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { PROOF_TYPES, REVIEW_LABEL, REVIEW_STATUSES } from "@/lib/status";
import { PageHeader, Section, buttonClass, inputClass, cx } from "@/components/ui";
import { ProofForm } from "@/components/client/proof-form";
import { ProofList } from "@/components/client/proof-list";
import { requireOnboardedUser } from "@/server/auth";
import { getPathTree } from "@/server/data";

export const metadata: Metadata = { title: "Proof of work" };

export default async function ProofPage({ searchParams }: { searchParams: Promise<{ type?: string; review?: string; q?: string }> }) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const tree = getPathTree(user.id, user.pathId);
  const topicTitles = new Map(tree.flatMap((d) => d.topics.map((tp) => [tp.id, tp.title])));
  const projects = db.select({ id: t.projects.id, title: t.projects.title }).from(t.projects).where(eq(t.projects.userId, user.id)).all();
  const projectTitles = new Map(projects.map((p) => [p.id, p.title]));
  const all = db.select().from(t.proofs).where(eq(t.proofs.userId, user.id)).orderBy(desc(t.proofs.submittedAt)).all();
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = all.filter(
    (p) =>
      (!sp.type || p.type === sp.type) &&
      (!sp.review || p.reviewStatus === sp.review) &&
      (!q || `${p.title} ${p.description} ${topicTitles.get(p.topicId ?? "") ?? ""} ${projectTitles.get(p.projectId ?? "") ?? ""}`.toLowerCase().includes(q)),
  );
  const topicOptions = tree.flatMap((d) => d.topics.filter((tp) => tp.status !== "not_started" || tp.bucket !== "continued").map((tp) => ({ id: tp.id, label: `${tp.code} ${tp.title}` })));
  const masteredWithProof = new Set(all.map((p) => p.topicId).filter(Boolean)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Proof of work"
        description={`Evidence that turns claims into capabilities. ${all.length} ${all.length === 1 ? "entry" : "entries"} across ${masteredWithProof} ${masteredWithProof === 1 ? "topic" : "topics"}.`}
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <form method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search proof of work</span>
              <input name="q" defaultValue={sp.q} placeholder="Search titles, topics, projects" className={cx(inputClass, "h-10")} type="search" />
            </label>
            <select name="type" defaultValue={sp.type ?? ""} aria-label="Evidence type" className={cx(inputClass, "h-10 sm:w-44")}>
              <option value="">All types</option>
              {PROOF_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select name="review" defaultValue={sp.review ?? ""} aria-label="Review status" className={cx(inputClass, "h-10 sm:w-40")}>
              <option value="">Any review status</option>
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REVIEW_LABEL[s]}
                </option>
              ))}
            </select>
            <button type="submit" className={buttonClass("secondary", "md", "h-10")}>
              Filter
            </button>
          </form>
          <ProofList
            proofs={list.map((p) => ({
              ...p,
              topicTitle: p.topicId ? (topicTitles.get(p.topicId) ?? null) : null,
              projectTitle: p.projectId ? (projectTitles.get(p.projectId) ?? null) : null,
            }))}
          />
        </div>
        <aside className="min-w-0" aria-label="Add proof of work">
          <Section title="Add proof of work" description="Link it to a topic, a project, or both.">
            <div className="rounded-xl border border-line bg-surface p-4">
              <ProofForm pathId={user.pathId} topics={topicOptions} projects={projects} />
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
