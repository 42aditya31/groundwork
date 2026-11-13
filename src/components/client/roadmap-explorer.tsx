"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Lock, Search } from "lucide-react";
import { setTopicStatus } from "@/server/actions/learning";
import { ProgressBar, StatusDot, Tag, cx, inputClass } from "@/components/ui";
import { BUCKET_LABEL, STATUS_LABEL, TIER_LABEL, type DisplayStatus } from "@/lib/status";
import { formatMinutes } from "@/lib/dates";
import { useAction } from "./toast";
import { usePersistentState } from "@/lib/persistent";

export interface RoadmapTopic {
  id: string;
  code: string;
  title: string;
  display: DisplayStatus;
  status: string;
  tier: string;
  bucket: string;
  est: number;
  subDone: number;
  subTotal: number;
  search: string;
}
export interface RoadmapDomain {
  id: string;
  code: string;
  title: string;
  stage: string;
  why: string;
  label: string;
  depth: string;
  prereqText: string;
  isSpecialization: boolean;
  missingPrereqs: { code: string; title: string; pct: number }[];
  done: number;
  total: number;
  parents: { id: string; code: string; title: string; tier: string; topics: RoadmapTopic[] }[];
}

const STATUS_FILTERS: { value: string; label: string; match: (t: RoadmapTopic) => boolean }[] = [
  { value: "all", label: "All statuses", match: () => true },
  { value: "not_started", label: "Not started", match: (t) => t.display === "not_started" },
  { value: "active", label: "In progress", match: (t) => t.status === "learning" || t.status === "practiced" },
  { value: "completed", label: "Completed", match: (t) => t.status === "completed" },
  { value: "mastered", label: "Mastered", match: (t) => t.status === "mastered" },
  { value: "needs_revision", label: "Needs revision", match: (t) => t.status === "needs_revision" },
  { value: "blocked", label: "Blocked", match: (t) => t.display === "blocked" },
];
const SCOPE_FILTERS = [
  { value: "all", label: "Whole syllabus" },
  { value: "plan", label: "In this plan" },
  { value: "continued", label: "Continued learning" },
];

export function RoadmapExplorer({ domains, currentDomainId }: { domains: RoadmapDomain[]; currentDomainId: string | null }) {
  const [query, setQuery] = useState("");
  // Filters and expanded domains are remembered on this device.
  const [status, setStatus] = usePersistentState("roadmap.status", "all");
  const [scope, setScope] = usePersistentState("roadmap.scope", "all");
  const [openList, setOpenList] = usePersistentState<string[]>("roadmap.open", currentDomainId ? [currentDomainId] : []);
  const open = useMemo(() => new Set(openList), [openList]);
  const setOpen = (next: Set<string>) => setOpenList([...next]);

  const filtering = query.trim() !== "" || status !== "all" || scope !== "all";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sf = STATUS_FILTERS.find((f) => f.value === status)!;
    return domains
      .map((d) => {
        const domainHit = q && `${d.code} ${d.title}`.toLowerCase().includes(q);
        const parents = d.parents
          .map((p) => ({
            ...p,
            topics: p.topics.filter(
              (t) =>
                sf.match(t) &&
                (scope === "all" || (scope === "plan" ? t.bucket !== "continued" || ["completed", "mastered", "needs_revision"].includes(t.status) : t.bucket === "continued" && !["completed", "mastered", "needs_revision"].includes(t.status))) &&
                (!q || domainHit || t.search.includes(q) || p.title.toLowerCase().includes(q)),
            ),
          }))
          .filter((p) => p.topics.length);
        return { ...d, parents };
      })
      .filter((d) => d.parents.length);
  }, [domains, query, status, scope]);

  const matchCount = filtered.reduce((n, d) => n + d.parents.reduce((m, p) => m + p.topics.length, 0), 0);
  const stages = [...new Set(filtered.map((d) => d.stage))];
  const toggle = (id: string) => setOpenList((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-20 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search topics</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics and concepts" className={cx(inputClass, "h-10 pl-9")} type="search" />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={cx(inputClass, "h-10 sm:w-40")}>
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <select aria-label="Filter by plan scope" value={scope} onChange={(e) => setScope(e.target.value)} className={cx(inputClass, "h-10 sm:w-44")}>
              {SCOPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[13px] text-ink-3">
          <span aria-live="polite">{filtering ? `${matchCount} matching topics` : `${domains.length} domains`}</span>
          <span className="flex gap-3">
            <button type="button" className="hover:text-ink" onClick={() => setOpen(new Set(domains.map((d) => d.id)))}>
              Expand all
            </button>
            <button type="button" className="hover:text-ink" onClick={() => setOpen(new Set())}>
              Collapse all
            </button>
          </span>
        </div>
      </div>

      {stages.length === 0 && <p className="py-10 text-center text-ink-3">No topics match these filters.</p>}

      {stages.map((stage) => (
        <section key={stage} aria-label={stage}>
          <h2 className="mb-2 text-sm font-medium text-ink-3">{stage}</h2>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {filtered
              .filter((d) => d.stage === stage)
              .map((d) => {
                const isOpen = filtering || open.has(d.id);
                const locked = d.missingPrereqs.length > 0;
                return (
                  <div key={d.id} id={d.id} className="scroll-mt-32">
                    <button
                      type="button"
                      onClick={() => toggle(d.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${d.id}-body`}
                      className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left hover:bg-surface-2/50 sm:px-4"
                    >
                      <ChevronRight className={cx("size-4 shrink-0 text-ink-3 transition-transform", isOpen && "rotate-90")} />
                      <span className="tnum w-7 shrink-0 text-sm text-ink-3">{d.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-ink">{d.title}</span>
                        {locked && (
                          <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink-3">
                            <Lock className="size-3" /> Unlocks after Domain {d.missingPrereqs.map((m) => `${m.code} (${m.pct}% done)`).join(", ")}
                          </span>
                        )}
                      </span>
                      <span className="hidden w-32 items-center gap-2 sm:flex">
                        <ProgressBar value={d.done} max={d.total} label={`Domain ${d.code} progress`} />
                      </span>
                      <span className="tnum w-12 shrink-0 text-right text-[13px] text-ink-2">
                        {d.done}/{d.total}
                      </span>
                    </button>
                    {isOpen && (
                      <div id={`${d.id}-body`} className="border-t border-line bg-bg/40 px-3.5 pt-3 pb-4 sm:px-4 sm:pl-14">
                        {!filtering && (
                          <div className="mb-4 space-y-1.5 text-[13.5px] text-ink-2">
                            {d.why && <p className="max-w-3xl leading-relaxed">{d.why.split("\n\n")[0]}</p>}
                            <p className="text-ink-3">
                              {[d.label && `Level: ${d.label.replace(/[[\]]/g, "")}`, d.depth && `Depth: ${d.depth}`, d.prereqText && `Prerequisites: ${d.prereqText}`].filter(Boolean).join(". ")}
                            </p>
                          </div>
                        )}
                        <div className="space-y-4">
                          {d.parents.map((p) => (
                            <div key={p.id}>
                              <h3 className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
                                <span className="tnum text-ink-3">{p.code}</span> {p.title}
                              </h3>
                              <ul className="divide-y divide-line/70">
                                {p.topics.map((t) => (
                                  <TopicRow key={t.id} topic={t} />
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function TopicRow({ topic }: { topic: RoadmapTopic }) {
  const [pending, run] = useAction();
  const editable = topic.display !== "blocked" && topic.status !== "mastered";
  return (
    <li className="flex items-center gap-3 py-2">
      <StatusDot status={topic.display} />
      <Link href={`/roadmap/${topic.id}`} className="group min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="tnum text-[12.5px] text-ink-3">{topic.code}</span>
          <span className="text-[14.5px] text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{topic.title}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-ink-3">
          <span>{STATUS_LABEL[topic.display]}</span>
          <span className="tnum">{formatMinutes(topic.est)}</span>
          {topic.subTotal > 0 && (
            <span className="tnum">
              {topic.subDone}/{topic.subTotal} concepts
            </span>
          )}
        </span>
      </Link>
      <span className="hidden shrink-0 gap-1 md:flex">
        {topic.tier !== "essential" && <Tag tone="muted">{TIER_LABEL[topic.tier]}</Tag>}
        {topic.bucket !== "core" && !["completed", "mastered", "needs_revision"].includes(topic.status) && <Tag tone={topic.bucket === "stretch" ? "accent" : "neutral"}>{BUCKET_LABEL[topic.bucket]}</Tag>}
      </span>
      {editable ? (
        <select
          aria-label={`Status of ${topic.title}`}
          value={topic.status === "mastered" ? "completed" : topic.status}
          disabled={pending}
          onChange={(e) => run(() => setTopicStatus(topic.id, e.target.value))}
          className="hidden h-8 shrink-0 rounded-md border border-line bg-surface px-2 text-[12.5px] text-ink-2 sm:block"
        >
          <option value="not_started">Not started</option>
          <option value="learning">Learning</option>
          <option value="practiced">Practiced</option>
          <option value="completed">Completed</option>
          <option value="needs_revision">Needs revision</option>
        </select>
      ) : (
        <span className="hidden w-[118px] shrink-0 text-right text-[12.5px] text-ink-3 sm:block">{topic.status === "mastered" ? "Mastered" : "Locked"}</span>
      )}
    </li>
  );
}
