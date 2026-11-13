"use client";
import { useMemo, useState } from "react";
import { Bookmark, Check, ExternalLink, NotebookPen, Search } from "lucide-react";
import { updateResourceState } from "@/server/actions/work";
import { Button, cx, inputClass } from "@/components/ui";
import { useAction } from "./toast";
import { usePersistentState } from "@/lib/persistent";

type Resource = {
  id: string;
  name: string;
  url: string;
  extraUrls: string[];
  creator: string;
  type: string;
  what: string;
  category: string;
  section: string;
  domainId: string | null;
  bookmarked: boolean;
  read: boolean;
  note: string;
};

export function ResourceLibrary({
  resources,
  domains,
  categories,
  initialDomain,
}: {
  resources: Resource[];
  domains: { id: string; code: string; title: string }[];
  categories: string[];
  initialDomain: string;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = usePersistentState("resources.category", "");
  const [domain, setDomain] = useState(initialDomain);
  const [show, setShow] = usePersistentState<"all" | "bookmarked" | "unread" | "read">("resources.show", "all");
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resources) m.set(r.category, (m.get(r.category) ?? 0) + 1);
    return m;
  }, [resources]);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return resources.filter(
      (r) =>
        (!cat || r.category === cat) &&
        (!domain || r.domainId === domain) &&
        (show === "all" || (show === "bookmarked" ? r.bookmarked : show === "read" ? r.read : !r.read)) &&
        (!query || `${r.name} ${r.creator} ${r.what} ${r.type} ${r.section}`.toLowerCase().includes(query)),
    );
  }, [resources, q, cat, domain, show]);
  const domainLabel = new Map(domains.map((d) => [d.id, `Domain ${d.code}: ${d.title}`]));

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Resource categories">
        {[["", "All"], ...categories.map((c) => [c, c])].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={cat === value}
            onClick={() => setCat(value)}
            className={cx(
              "h-8 shrink-0 rounded-full border px-3 text-[13px] whitespace-nowrap transition-colors",
              cat === value ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:text-ink",
            )}
          >
            {label}
            <span className="tnum ml-1.5 opacity-60">{value ? (counts.get(value) ?? 0) : resources.length}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search resources</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, creator or topic" className={cx(inputClass, "h-10 pl-9")} />
        </label>
        <select aria-label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} className={cx(inputClass, "h-10 sm:w-64")}>
          <option value="">All domains and directory</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              Domain {d.code}: {d.title}
            </option>
          ))}
        </select>
        <select aria-label="Reading state" value={show} onChange={(e) => setShow(e.target.value as typeof show)} className={cx(inputClass, "h-10 sm:w-36")}>
          <option value="all">Everything</option>
          <option value="bookmarked">Bookmarked</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>
      <p className="text-[13px] text-ink-3" aria-live="polite">
        {list.length} {list.length === 1 ? "resource" : "resources"}
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {list.map((r) => (
          <ResourceRow key={r.id} r={r} context={r.domainId ? domainLabel.get(r.domainId) : r.section} />
        ))}
        {!list.length && <li className="px-4 py-10 text-center text-sm text-ink-3">No resources match these filters.</li>}
      </ul>
    </div>
  );
}

function ResourceRow({ r, context }: { r: Resource; context?: string }) {
  const [pending, run] = useAction();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(r.note);
  return (
    <li className="px-3.5 py-3.5 sm:px-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className={cx("inline-flex items-center gap-1.5 font-medium hover:underline", r.read ? "text-ink-2" : "text-ink")}>
            {r.name}
            <ExternalLink className="size-3.5 shrink-0 text-ink-3" />
          </a>
          <div className="mt-0.5 text-[12.5px] text-ink-3">
            {[r.creator, r.category, context].filter(Boolean).join(", ")}
          </div>
          {r.what && <p className="mt-1 text-[14px] text-ink-2">{r.what}</p>}
          {r.extraUrls.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-3 text-[13px]">
              {r.extraUrls.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-ink-3 hover:text-ink">
                  {new URL(u).hostname.replace(/^www\./, "")}
                </a>
              ))}
            </div>
          )}
          {r.note && !noteOpen && <p className="mt-1.5 border-l-2 border-line-strong pl-2.5 text-[13.5px] whitespace-pre-wrap text-ink-2">{r.note}</p>}
          {noteOpen && (
            <form
              className="mt-2 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => updateResourceState(r.id, { note }), { onSuccess: () => setNoteOpen(false) });
              }}
            >
              <label className="sr-only" htmlFor={`note-${r.id}`}>
                Note for {r.name}
              </label>
              <textarea id={`note-${r.id}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} autoFocus />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="primary" disabled={pending}>
                  Save note
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-pressed={r.bookmarked}
            aria-label={r.bookmarked ? `Remove bookmark from ${r.name}` : `Bookmark ${r.name}`}
            disabled={pending}
            onClick={() => run(() => updateResourceState(r.id, { bookmarked: !r.bookmarked }))}
            className={cx("flex size-9 items-center justify-center rounded-lg hover:bg-surface-2", r.bookmarked ? "text-accent" : "text-ink-3")}
          >
            <Bookmark className={cx("size-4", r.bookmarked && "fill-current")} />
          </button>
          <button
            type="button"
            aria-label={`Add a note to ${r.name}`}
            onClick={() => setNoteOpen((o) => !o)}
            className="flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <NotebookPen className="size-4" />
          </button>
          <button
            type="button"
            aria-pressed={r.read}
            disabled={pending}
            onClick={() => run(() => updateResourceState(r.id, { read: !r.read }))}
            className={cx(
              "ml-1 inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[12.5px] transition-colors",
              r.read ? "border-st-completed/40 bg-st-completed/10 text-st-completed" : "border-line-strong text-ink-2 hover:text-ink",
            )}
          >
            {r.read && <Check className="size-3.5" />}
            {r.read ? "Read" : "Mark read"}
          </button>
        </div>
      </div>
    </li>
  );
}
