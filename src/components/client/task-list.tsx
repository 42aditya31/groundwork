"use client";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, Check, ClipboardCheck, FolderKanban, Lock, Play, Repeat, StickyNote, Trash2, ArrowRightLeft, RotateCcw } from "lucide-react";
import { completeItem, deleteTask, reopenItem, rescheduleItem, startSession } from "@/server/actions/learning";
import { Button, cx, inputClass } from "@/components/ui";
import { formatDate, formatMinutes, addDays } from "@/lib/dates";
import type { ItemView } from "@/server/items";
import { useAction } from "./toast";

const KIND: Record<string, { label: string; icon: typeof BookOpen }> = {
  learn: { label: "Learn", icon: BookOpen },
  review: { label: "Revision", icon: Repeat },
  assessment: { label: "Assessment", icon: ClipboardCheck },
  project: { label: "Project", icon: FolderKanban },
  custom: { label: "Your task", icon: StickyNote },
};

export function TaskList({ items, today, empty, showContext = true }: { items: ItemView[]; today: string; empty?: React.ReactNode; showContext?: boolean }) {
  if (!items.length) return <>{empty}</>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {items.map((item) => (
        <TaskRow key={item.id} item={item} today={today} showContext={showContext} />
      ))}
    </ul>
  );
}

function TaskRow({ item, today, showContext }: { item: ItemView; today: string; showContext: boolean }) {
  const [mode, setMode] = useState<"idle" | "log" | "move">("idle");
  const [minutes, setMinutes] = useState(String(item.minutes));
  const [date, setDate] = useState(addDays(today, 1));
  const [pending, run] = useAction();
  const done = item.status === "done";
  const k = KIND[item.kind] ?? KIND.custom;
  const Icon = k.icon;
  const overdue = !done && item.date < today;

  return (
    <li className={cx("px-3.5 py-3 sm:px-4", done && "bg-surface-2/40")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={pending || item.locked}
          onClick={() => (done ? run(() => reopenItem(item.id), { silent: true }) : setMode(mode === "log" ? "idle" : "log"))}
          aria-label={done ? `Mark "${item.title}" as not done` : `Complete "${item.title}"`}
          aria-expanded={!done ? mode === "log" : undefined}
          className={cx(
            "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-md border transition-colors",
            done ? "border-st-completed bg-st-completed text-bg" : "border-line-strong hover:border-ink",
            item.locked && "cursor-not-allowed opacity-50",
          )}
        >
          {done && <Check className="size-3.5" strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            <span className="inline-flex items-center gap-1">
              <Icon className="size-3.5" strokeWidth={1.75} />
              {k.label}
            </span>
            <span className="tnum">{formatMinutes(item.minutes)}</span>
            {item.detail && item.kind === "learn" && <span>{item.detail}</span>}
            {overdue && <span className="font-medium text-st-revision">Overdue since {formatDate(item.date)}</span>}
            {item.rescheduledFrom && !overdue && <span>Moved from {formatDate(item.rescheduledFrom)}</span>}
          </div>
          <div className={cx("mt-0.5 text-[15px] leading-snug font-medium", done ? "text-ink-3 line-through decoration-ink-3/40" : "text-ink")}>
            {item.href ? (
              <Link href={item.href} className="hover:underline hover:decoration-line-strong hover:underline-offset-4">
                {item.title}
              </Link>
            ) : (
              item.title
            )}
          </div>
          {showContext && item.context && !done && <div className="mt-0.5 truncate text-[13px] text-ink-3">{item.context}</div>}
          {item.kind !== "learn" && item.detail && !done && <p className="mt-1 text-[13px] text-ink-2">{item.detail}</p>}
          {item.reviewTopics.length > 1 && !done && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.reviewTopics.map((r) => (
                <Link key={r.id} href={`/roadmap/${r.id}`} className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px] text-ink-2 hover:text-ink">
                  {r.title}
                </Link>
              ))}
            </div>
          )}
          {item.locked && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-3">
              <Lock className="size-3.5" /> {item.lockReason}
            </p>
          )}

          {mode === "log" && !done && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => completeItem(item.id, Number(minutes)), { onSuccess: () => setMode("idle") });
              }}
            >
              <label className="text-[13px] text-ink-2">
                <span className="mb-1 block">Minutes spent</span>
                <input type="number" min={0} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={cx(inputClass, "tnum h-9 w-24 py-1")} autoFocus />
              </label>
              <Button type="submit" variant="primary" size="sm" disabled={pending} className="h-9">
                Mark done
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setMode("idle")}>
                Cancel
              </Button>
              <p className="w-full text-[12.5px] text-ink-3">Time spent is logged as a learning session. Use 0 if you only want to tick it off.</p>
            </form>
          )}
          {mode === "move" && !done && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => rescheduleItem(item.id, date), { onSuccess: () => setMode("idle") });
              }}
            >
              <label className="text-[13px] text-ink-2">
                <span className="mb-1 block">Move to</span>
                <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={cx(inputClass, "h-9 py-1")} />
              </label>
              <Button type="submit" variant="primary" size="sm" disabled={pending} className="h-9">
                Move task
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setMode("idle")}>
                Cancel
              </Button>
            </form>
          )}
        </div>
        {!done && (
          <div className="flex shrink-0 items-center gap-0.5">
            {(item.topicId || item.projectId) && !item.locked && (
              <IconButton
                label="Start a timed session"
                disabled={pending}
                onClick={() => run(() => startSession({ topicId: item.topicId, projectId: item.projectId, scheduleItemId: item.id }))}
              >
                <Play className="size-4" />
              </IconButton>
            )}
            <IconButton label="Move to another day" disabled={pending} onClick={() => setMode(mode === "move" ? "idle" : "move")}>
              <ArrowRightLeft className="size-4" />
            </IconButton>
            {item.kind === "custom" && (
              <IconButton label="Delete task" disabled={pending} onClick={() => run(() => deleteTask(item.id))}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        )}
        {done && (
          <IconButton label="Mark as not done" disabled={pending} onClick={() => run(() => reopenItem(item.id), { silent: true })}>
            <RotateCcw className="size-4" />
          </IconButton>
        )}
      </div>
    </li>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: React.ReactNode } & React.ComponentProps<"button">) {
  return (
    <button type="button" aria-label={label} title={label} {...props} className="flex size-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40">
      {children}
    </button>
  );
}
